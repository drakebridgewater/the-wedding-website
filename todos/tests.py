"""Tests for the multi-provider todos plumbing.

These cover the bits most likely to silently regress when wiring the dispatcher:
priority translation in both directions, sync upserting under the new
(provider, external_id) unique constraint, and the dispatcher honouring
TODO_PROVIDER.
"""
from unittest.mock import patch

from django.test import TestCase, override_settings

from todos import provider
from todos.models import (
    PROVIDER_TICKTICK,
    PROVIDER_TODOIST,
    Task,
    TodoistSettings,
)
from todos import todoist_client


class TodoistPriorityTranslationTests(TestCase):
    def test_serialize_maps_todoist_priority_to_ticktick_scale(self):
        # Todoist 1..4 (4=highest) → TickTick 0/1/3/5
        cases = [(1, 0), (2, 1), (3, 3), (4, 5)]
        for todoist_pri, expected in cases:
            with self.subTest(todoist=todoist_pri):
                out = todoist_client.serialize_task({
                    'id': '123',
                    'content': 'Test',
                    'priority': todoist_pri,
                    'is_completed': False,
                    'project_id': '999',
                })
                self.assertEqual(out['priority'], expected)

    def test_create_payload_translates_ticktick_priority_to_todoist(self):
        captured = {}

        def fake_post(path, data):
            captured['path'] = path
            captured['data'] = data
            return {'id': 'new', 'content': data['content'], 'priority': data.get('priority', 1)}

        with patch.object(todoist_client, '_api_post', side_effect=fake_post):
            todoist_client.create_task('Hello', 'project-1', priority=5)

        # TickTick "high" (5) -> Todoist "p1" (4)
        self.assertEqual(captured['data']['priority'], 4)

    def test_serialize_handles_completed_and_due_shapes(self):
        out = todoist_client.serialize_task({
            'id': 7,
            'content': 'Done thing',
            'priority': 3,
            'is_completed': True,
            'project_id': 42,
            'due': {'date': '2026-06-12'},
            'assignee_id': 'user-9',
            'labels': ['vendor'],
        })
        self.assertEqual(out['id'], '7')
        self.assertEqual(out['status'], 2)
        self.assertEqual(out['due_date'], '2026-06-12')
        self.assertEqual(out['assignee'], 'user-9')
        self.assertEqual(out['tags'], ['vendor'])
        self.assertEqual(out['project_id'], '42')


class TodoistSyncUpsertTests(TestCase):
    def setUp(self):
        TodoistSettings.objects.update_or_create(
            pk=1, defaults={'api_token': 'fake', 'project_name': 'Wedding'},
        )

    def test_sync_creates_then_updates_then_marks_missing_as_completed(self):
        # First sync: two active tasks
        first_payload = [
            {'id': '101', 'content': 'A', 'priority': 1, 'is_completed': False, 'project_id': 'P'},
            {'id': '102', 'content': 'B', 'priority': 4, 'is_completed': False, 'project_id': 'P'},
        ]
        with patch.object(todoist_client, 'get_tasks', return_value=first_payload):
            r1 = todoist_client.sync_tasks_to_db('P')
        self.assertEqual(r1['created'], 2)
        self.assertEqual(r1['updated'], 0)
        self.assertEqual(Task.objects.count(), 2)

        # Second sync: A renamed, B disappeared (closed in Todoist)
        second_payload = [
            {'id': '101', 'content': 'A renamed', 'priority': 1, 'is_completed': False, 'project_id': 'P'},
        ]
        with patch.object(todoist_client, 'get_tasks', return_value=second_payload):
            r2 = todoist_client.sync_tasks_to_db('P')
        self.assertEqual(r2['updated'], 1)
        self.assertEqual(r2['created'], 0)
        self.assertEqual(r2['closed_locally'], 1)

        a = Task.objects.get(provider=PROVIDER_TODOIST, external_id='101')
        b = Task.objects.get(provider=PROVIDER_TODOIST, external_id='102')
        self.assertEqual(a.title, 'A renamed')
        self.assertEqual(a.status, 0)
        self.assertEqual(b.status, 2)  # marked completed locally

    def test_unique_constraint_allows_same_external_id_across_providers(self):
        # Same id space isn't expected in practice, but the constraint must permit it.
        Task.objects.create(provider=PROVIDER_TICKTICK, external_id='abc', title='T1')
        Task.objects.create(provider=PROVIDER_TODOIST, external_id='abc', title='T2')
        self.assertEqual(Task.objects.count(), 2)


class TodoistPaginationTests(TestCase):
    """Sanity-check the cursor walk on v1 list endpoints."""

    def setUp(self):
        TodoistSettings.objects.update_or_create(
            pk=1, defaults={'api_token': 'fake', 'project_name': 'Wedding'},
        )

    def test_paginated_helper_walks_next_cursor_until_exhausted(self):
        # Fake response sequence: two pages then a terminal page.
        pages = [
            {'results': [{'id': '1'}, {'id': '2'}], 'next_cursor': 'cur-2'},
            {'results': [{'id': '3'}], 'next_cursor': 'cur-3'},
            {'results': [{'id': '4'}], 'next_cursor': None},
        ]
        calls = []

        class FakeResp:
            def __init__(self, body):
                self._body = body
                self.status_code = 200
                self.content = b'{}'

            def raise_for_status(self):
                return None

            def json(self):
                return self._body

        def fake_get(url, headers=None, params=None):
            calls.append(params or {})
            return FakeResp(pages[len(calls) - 1])

        with patch.object(todoist_client.requests, 'get', side_effect=fake_get):
            result = todoist_client._api_get_paginated('/tasks', params={'project_id': 'P'})

        self.assertEqual([r['id'] for r in result], ['1', '2', '3', '4'])
        self.assertEqual(calls[0].get('cursor'), None)
        self.assertEqual(calls[1].get('cursor'), 'cur-2')
        self.assertEqual(calls[2].get('cursor'), 'cur-3')
        # project_id should ride along on every request.
        self.assertTrue(all(c.get('project_id') == 'P' for c in calls))


class ProviderDispatcherTests(TestCase):
    def test_default_is_todoist(self):
        # base.py sets TODO_PROVIDER='todoist'
        self.assertEqual(provider.get_active_provider(), 'todoist')

    @override_settings(TODO_PROVIDER='ticktick')
    def test_explicit_ticktick(self):
        self.assertEqual(provider.get_active_provider(), 'ticktick')
        # Module dispatch lines up too.
        from todos import ticktick_client
        self.assertIs(provider.get_provider_module(), ticktick_client)

    @override_settings(TODO_PROVIDER='nonsense')
    def test_unknown_value_falls_back_to_todoist(self):
        self.assertEqual(provider.get_active_provider(), 'todoist')
