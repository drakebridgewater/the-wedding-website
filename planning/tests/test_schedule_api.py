import datetime
import json

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from planning.models import WeddingPartyMember, ScheduleDay, ScheduleEvent


def make_member(**kwargs):
    defaults = {'name': 'Alice', 'role': 'bride', 'order': 0}
    defaults.update(kwargs)
    return WeddingPartyMember.objects.create(**defaults)


def make_day(**kwargs):
    defaults = {'date': datetime.date(2025, 9, 13), 'label': 'Wedding Day', 'order': 0}
    defaults.update(kwargs)
    return ScheduleDay.objects.create(**defaults)


def make_event(day, **kwargs):
    defaults = {
        'start_time': datetime.time(9, 0),
        'duration_minutes': 60,
        'name': 'Test Event',
        'category': 'other',
    }
    defaults.update(kwargs)
    return ScheduleEvent.objects.create(day=day, **defaults)


class ScheduleAPIAuthTest(TestCase):
    """All schedule endpoints require authentication."""

    def test_members_requires_auth(self):
        res = self.client.get('/planning/api/schedule/members/')
        self.assertEqual(res.status_code, 403)

    def test_days_requires_auth(self):
        res = self.client.get('/planning/api/schedule/days/')
        self.assertEqual(res.status_code, 403)

    def test_day_detail_requires_auth(self):
        day = make_day()
        res = self.client.get(f'/planning/api/schedule/days/{day.pk}/')
        self.assertEqual(res.status_code, 403)

    def test_events_requires_auth(self):
        day = make_day()
        res = self.client.get(f'/planning/api/schedule/days/{day.pk}/events/')
        self.assertEqual(res.status_code, 403)

    def test_event_detail_requires_auth(self):
        day = make_day()
        event = make_event(day)
        res = self.client.get(f'/planning/api/schedule/events/{event.pk}/')
        self.assertEqual(res.status_code, 403)


class ScheduleMembersAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)

    def test_list_empty(self):
        res = self.client.get('/planning/api/schedule/members/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_list_returns_all_members(self):
        make_member(name='Alice', role='bride', order=0)
        make_member(name='Bob', role='groom', order=1)
        res = self.client.get('/planning/api/schedule/members/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 2)
        names = [m['name'] for m in data]
        self.assertIn('Alice', names)
        self.assertIn('Bob', names)

    def test_member_fields(self):
        make_member(name='Alice', role='bride', color='#ff69b4', order=0)
        res = self.client.get('/planning/api/schedule/members/')
        m = res.json()[0]
        self.assertIn('id', m)
        self.assertEqual(m['name'], 'Alice')
        self.assertEqual(m['role'], 'bride')
        self.assertEqual(m['role_display'], 'Bride')
        self.assertEqual(m['color'], '#ff69b4')
        self.assertEqual(m['order'], 0)

    def test_members_ordered_by_order_then_name(self):
        make_member(name='Zara', role='bridesmaid', order=2)
        make_member(name='Alice', role='bride', order=0)
        make_member(name='Bob', role='groom', order=1)
        res = self.client.get('/planning/api/schedule/members/')
        names = [m['name'] for m in res.json()]
        self.assertEqual(names, ['Alice', 'Bob', 'Zara'])


class ScheduleDaysAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)

    def test_list_empty(self):
        res = self.client.get('/planning/api/schedule/days/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_list_includes_events(self):
        day = make_day()
        make_event(day, name='Morning Call')
        res = self.client.get('/planning/api/schedule/days/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(len(data[0]['events']), 1)
        self.assertEqual(data[0]['events'][0]['name'], 'Morning Call')

    def test_create_day(self):
        res = self.client.post('/planning/api/schedule/days/', {
            'date': '2025-09-12',
            'label': 'Rehearsal Dinner',
            'order': 0,
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(ScheduleDay.objects.filter(label='Rehearsal Dinner').exists())

    def test_create_day_required_fields(self):
        res = self.client.post('/planning/api/schedule/days/', {}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_retrieve_day(self):
        day = make_day(label='Wedding Day')
        res = self.client.get(f'/planning/api/schedule/days/{day.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['label'], 'Wedding Day')

    def test_retrieve_nonexistent_day(self):
        res = self.client.get('/planning/api/schedule/days/9999/')
        self.assertEqual(res.status_code, 404)

    def test_update_day(self):
        day = make_day(label='Old Label')
        res = self.client.patch(f'/planning/api/schedule/days/{day.pk}/', {
            'label': 'New Label',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        day.refresh_from_db()
        self.assertEqual(day.label, 'New Label')

    def test_delete_day(self):
        day = make_day()
        res = self.client.delete(f'/planning/api/schedule/days/{day.pk}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(ScheduleDay.objects.filter(pk=day.pk).exists())

    def test_delete_day_cascades_events(self):
        day = make_day()
        event = make_event(day)
        self.client.delete(f'/planning/api/schedule/days/{day.pk}/')
        self.assertFalse(ScheduleEvent.objects.filter(pk=event.pk).exists())


class ScheduleEventsAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)
        self.day = make_day()
        self.member = make_member(name='Alice', role='bride')

    def test_list_events(self):
        make_event(self.day, name='Ceremony')
        res = self.client.get(f'/planning/api/schedule/days/{self.day.pk}/events/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

    def test_list_events_nonexistent_day(self):
        res = self.client.get('/planning/api/schedule/days/9999/events/')
        self.assertEqual(res.status_code, 404)

    def test_create_event_minimal(self):
        res = self.client.post(f'/planning/api/schedule/days/{self.day.pk}/events/', {
            'start_time': '10:00',
            'duration_minutes': 30,
            'name': 'Photos',
            'category': 'photos',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(ScheduleEvent.objects.filter(name='Photos').exists())

    def test_create_event_with_attendees(self):
        res = self.client.post(f'/planning/api/schedule/days/{self.day.pk}/events/', {
            'start_time': '09:00',
            'duration_minutes': 60,
            'name': 'Hair & Makeup',
            'category': 'getting_ready',
            'attendee_ids': [self.member.pk],
        }, format='json')
        self.assertEqual(res.status_code, 201)
        event = ScheduleEvent.objects.get(name='Hair & Makeup')
        self.assertIn(self.member, event.attendees.all())

    def test_create_event_includes_all_fields(self):
        res = self.client.post(f'/planning/api/schedule/days/{self.day.pk}/events/', {
            'start_time': '14:00',
            'duration_minutes': 90,
            'name': 'Reception',
            'category': 'reception',
            'location': 'Grand Ballroom',
            'notes': 'Black tie',
            'attendee_ids': [],
        }, format='json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['location'], 'Grand Ballroom')
        self.assertEqual(data['notes'], 'Black tie')
        self.assertEqual(data['duration_minutes'], 90)

    def test_create_event_requires_name(self):
        res = self.client.post(f'/planning/api/schedule/days/{self.day.pk}/events/', {
            'start_time': '10:00',
            'duration_minutes': 30,
            'category': 'other',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_update_event(self):
        event = make_event(self.day, name='Old Name')
        res = self.client.patch(f'/planning/api/schedule/events/{event.pk}/', {
            'name': 'New Name',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        event.refresh_from_db()
        self.assertEqual(event.name, 'New Name')

    def test_update_event_attendees(self):
        event = make_event(self.day)
        event.attendees.add(self.member)
        bob = make_member(name='Bob', role='groom', order=1)

        res = self.client.patch(f'/planning/api/schedule/events/{event.pk}/', {
            'attendee_ids': [bob.pk],
        }, format='json')
        self.assertEqual(res.status_code, 200)
        event.refresh_from_db()
        self.assertNotIn(self.member, event.attendees.all())
        self.assertIn(bob, event.attendees.all())

    def test_delete_event(self):
        event = make_event(self.day)
        res = self.client.delete(f'/planning/api/schedule/events/{event.pk}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(ScheduleEvent.objects.filter(pk=event.pk).exists())

    def test_retrieve_nonexistent_event(self):
        res = self.client.get('/planning/api/schedule/events/9999/')
        self.assertEqual(res.status_code, 404)

    def test_event_response_contains_attendees(self):
        event = make_event(self.day, name='Ceremony')
        event.attendees.add(self.member)
        res = self.client.get(f'/planning/api/schedule/events/{event.pk}/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data['attendees']), 1)
        self.assertEqual(data['attendees'][0]['name'], 'Alice')


class ScheduleConflictDetectionTest(TestCase):
    """Verify that conflict detection correctly identifies double-booked attendees."""

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)
        self.day = make_day()
        self.alice = make_member(name='Alice', role='bride', order=0)
        self.bob = make_member(name='Bob', role='groom', order=1)

    def _get_event(self, event_id):
        res = self.client.get(f'/planning/api/schedule/events/{event_id}/')
        self.assertEqual(res.status_code, 200)
        return res.json()

    def test_overlapping_events_same_attendee_reports_conflict(self):
        # 9:00–10:00
        e1 = make_event(self.day, start_time=datetime.time(9, 0), duration_minutes=60, name='E1')
        e1.attendees.add(self.alice)
        # 9:30–10:30 — overlaps
        e2 = make_event(self.day, start_time=datetime.time(9, 30), duration_minutes=60, name='E2')
        e2.attendees.add(self.alice)

        data1 = self._get_event(e1.pk)
        data2 = self._get_event(e2.pk)

        self.assertIn(self.alice.pk, data1['conflicts'])
        self.assertIn(self.alice.pk, data2['conflicts'])

    def test_non_overlapping_events_same_attendee_no_conflict(self):
        # 9:00–10:00 then 10:00–11:00 — adjacent, no overlap
        e1 = make_event(self.day, start_time=datetime.time(9, 0), duration_minutes=60, name='E1')
        e1.attendees.add(self.alice)
        e2 = make_event(self.day, start_time=datetime.time(10, 0), duration_minutes=60, name='E2')
        e2.attendees.add(self.alice)

        data1 = self._get_event(e1.pk)
        data2 = self._get_event(e2.pk)

        self.assertEqual(data1['conflicts'], [])
        self.assertEqual(data2['conflicts'], [])

    def test_entirely_before_event_no_conflict(self):
        # 8:00–9:00 then 9:00–10:00
        e1 = make_event(self.day, start_time=datetime.time(8, 0), duration_minutes=60, name='E1')
        e1.attendees.add(self.alice)
        e2 = make_event(self.day, start_time=datetime.time(9, 0), duration_minutes=60, name='E2')
        e2.attendees.add(self.alice)

        data1 = self._get_event(e1.pk)
        self.assertEqual(data1['conflicts'], [])

    def test_different_attendees_no_conflict(self):
        # Alice in E1, Bob in E2 — overlapping but different people
        e1 = make_event(self.day, start_time=datetime.time(9, 0), duration_minutes=60, name='E1')
        e1.attendees.add(self.alice)
        e2 = make_event(self.day, start_time=datetime.time(9, 30), duration_minutes=60, name='E2')
        e2.attendees.add(self.bob)

        data1 = self._get_event(e1.pk)
        data2 = self._get_event(e2.pk)

        self.assertEqual(data1['conflicts'], [])
        self.assertEqual(data2['conflicts'], [])

    def test_only_shared_attendee_flagged_not_others(self):
        # Alice and Bob in E1; only Alice in E2 (overlapping) → Alice conflicts, Bob does not
        e1 = make_event(self.day, start_time=datetime.time(9, 0), duration_minutes=60, name='E1')
        e1.attendees.add(self.alice, self.bob)
        e2 = make_event(self.day, start_time=datetime.time(9, 30), duration_minutes=60, name='E2')
        e2.attendees.add(self.alice)

        data1 = self._get_event(e1.pk)
        self.assertIn(self.alice.pk, data1['conflicts'])
        self.assertNotIn(self.bob.pk, data1['conflicts'])

    def test_no_conflict_event_has_no_attendees(self):
        e1 = make_event(self.day, start_time=datetime.time(9, 0), duration_minutes=60)
        e2 = make_event(self.day, start_time=datetime.time(9, 30), duration_minutes=60)
        # No attendees — no conflicts even if times overlap

        data1 = self._get_event(e1.pk)
        self.assertEqual(data1['conflicts'], [])

    def test_conflicts_across_different_days_not_reported(self):
        day2 = make_day(date=datetime.date(2025, 9, 14), label='Day 2', order=1)
        e1 = make_event(self.day, start_time=datetime.time(9, 0), duration_minutes=60)
        e1.attendees.add(self.alice)
        e2 = make_event(day2, start_time=datetime.time(9, 0), duration_minutes=60)
        e2.attendees.add(self.alice)

        data1 = self._get_event(e1.pk)
        self.assertEqual(data1['conflicts'], [])

    def test_days_list_includes_conflicts_on_events(self):
        e1 = make_event(self.day, start_time=datetime.time(9, 0), duration_minutes=60, name='E1')
        e1.attendees.add(self.alice)
        e2 = make_event(self.day, start_time=datetime.time(9, 30), duration_minutes=60, name='E2')
        e2.attendees.add(self.alice)

        res = self.client.get('/planning/api/schedule/days/')
        self.assertEqual(res.status_code, 200)
        events = res.json()[0]['events']
        conflict_counts = [len(e['conflicts']) for e in events]
        self.assertTrue(any(c > 0 for c in conflict_counts))
