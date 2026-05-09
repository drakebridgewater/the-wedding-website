"""
Todoist integration using the unified API v1
(https://developer.todoist.com/api/v1/), which supersedes REST v2 and Sync v9.

Auth is a long-lived personal API token from Todoist → Settings → Integrations
→ Developer → "API token". No OAuth dance, no refresh.

Public surface mirrors `ticktick_client` so `provider.py` can re-export from
either module without callers having to care which one is active.
"""
from __future__ import annotations

import logging

import requests
from django.conf import settings

from .models import PROVIDER_TODOIST

logger = logging.getLogger(__name__)

# Unified API v1 — the new base for everything (REST v2 + Sync v9 are merged
# under this prefix). List endpoints return {"results": [...], "next_cursor": ...}.
API_BASE = 'https://api.todoist.com/api/v1'

# Page size we ask for on paginated list endpoints. The API caps this at 200.
_PAGE_LIMIT = 200

# Priority maps. Todoist uses 1..4 with 4 = highest. The frontend was built
# around TickTick's 0/1/3/5 scale, so we translate at the edge in both
# directions and let the rest of the stack stay provider-agnostic.
_TODOIST_TO_TICKTICK_PRIORITY = {1: 0, 2: 1, 3: 3, 4: 5}
_TICKTICK_TO_TODOIST_PRIORITY = {0: 1, 1: 2, 3: 3, 5: 4}


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _get_config() -> dict:
    """Return config from DB (admin-editable) with fallback to Django settings."""
    cfg = {
        'api_token': getattr(settings, 'TODOIST_API_TOKEN', ''),
        'project_name': getattr(settings, 'TODOIST_PROJECT_NAME', 'Wedding'),
        'drake_assignee': getattr(settings, 'TODOIST_DRAKE_ASSIGNEE', ''),
        'shawna_assignee': getattr(settings, 'TODOIST_SHAWNA_ASSIGNEE', ''),
    }
    try:
        from todos.models import TodoistSettings
        db = TodoistSettings.get()
        if db.api_token:
            cfg['api_token'] = db.api_token
        if db.project_name:
            cfg['project_name'] = db.project_name
        if db.drake_assignee_id:
            cfg['drake_assignee'] = db.drake_assignee_id
        if db.shawna_assignee_id:
            cfg['shawna_assignee'] = db.shawna_assignee_id
    except Exception as e:
        logger.debug('Could not read TodoistSettings from DB (falling back to settings): %s', e)
    return cfg


def get_config():
    """Public accessor for config values (used by views to pass assignee IDs)."""
    return _get_config()


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _auth_headers() -> dict:
    cfg = _get_config()
    token = cfg['api_token']
    if not token:
        raise RuntimeError(
            'No Todoist API token configured. Set TODOIST_API_TOKEN or fill it '
            'in via Admin → Todoist Settings.'
        )
    return {'Authorization': f'Bearer {token}'}


def _api_get(path: str, params: dict | None = None) -> dict | list:
    """Bare GET — use `_api_get_paginated` for any list endpoint."""
    resp = requests.get(f'{API_BASE}{path}', headers=_auth_headers(), params=params or {})
    resp.raise_for_status()
    return resp.json()


def _api_get_paginated(path: str, params: dict | None = None) -> list:
    """Walk the v1 cursor pagination on a list endpoint and return every result.

    v1 list endpoints respond with `{"results": [...], "next_cursor": "..."}`.
    `next_cursor` is `null`/missing on the final page. We pass `cursor` and
    `limit` as query params on every call.
    """
    out: list = []
    cursor: str | None = None
    base_params = dict(params or {})
    base_params.setdefault('limit', _PAGE_LIMIT)

    while True:
        page_params = dict(base_params)
        if cursor:
            page_params['cursor'] = cursor
        resp = requests.get(
            f'{API_BASE}{path}', headers=_auth_headers(), params=page_params,
        )
        resp.raise_for_status()
        body = resp.json()

        # Be tolerant: some endpoints in older deployments still return a bare
        # list. Treat that as a single-page result.
        if isinstance(body, list):
            out.extend(body)
            return out

        out.extend(body.get('results') or [])
        cursor = body.get('next_cursor')
        if not cursor:
            return out


def _api_post(path: str, data: dict | None = None) -> dict:
    resp = requests.post(f'{API_BASE}{path}', headers=_auth_headers(), json=data or {})
    resp.raise_for_status()
    if resp.status_code == 204 or not resp.content:
        return {}
    return resp.json()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_projects() -> list:
    return _api_get_paginated('/projects')


def get_wedding_project_id() -> str | None:
    cfg = _get_config()
    name = cfg['project_name'].lower()
    for project in get_projects():
        if project.get('name', '').lower() == name:
            return str(project['id'])
    return None


def get_tasks(project_id: str) -> list:
    """Return active tasks for the given project.

    `/api/v1/tasks` returns only active (non-completed) tasks. Completed-task
    history is reachable via the v1 Sync endpoint; we don't need it here
    because completions are driven through this UI.
    """
    return _api_get_paginated('/tasks', params={'project_id': project_id})


def get_collaborators(project_id: str) -> list:
    """Return collaborators on a shared project (used by the setup command)."""
    return _api_get_paginated(f'/projects/{project_id}/collaborators')


def create_task(title: str, project_id: str, **kwargs) -> dict:
    """Create a task. Accepts kwargs in the **TickTick-style shape** so the
    api_views layer can stay generic; we translate field names + priority here.

    Recognised kwargs (all optional):
      content      -> Todoist `description`
      dueDate      -> Todoist `due_date` (ISO 'YYYY-MM-DD')
      priority     -> TickTick scale (0/1/3/5), translated to Todoist 1..4
      assignee     -> Todoist `assignee_id`
    """
    payload: dict = {'content': title, 'project_id': project_id}

    if 'content' in kwargs and kwargs['content']:
        payload['description'] = kwargs['content']
    due = kwargs.get('dueDate')
    if due:
        # Accept ISO date or full ISO datetime; Todoist takes both via separate keys.
        if 'T' in str(due):
            payload['due_datetime'] = due
        else:
            payload['due_date'] = due
    if 'priority' in kwargs and kwargs['priority'] is not None:
        tt_priority = int(kwargs['priority'])
        payload['priority'] = _TICKTICK_TO_TODOIST_PRIORITY.get(tt_priority, 1)
    if kwargs.get('assignee'):
        payload['assignee_id'] = kwargs['assignee']

    return _api_post('/tasks', payload)


def complete_task(project_id: str, task_id: str) -> dict:
    """Mark a task complete. project_id is unused but kept for signature parity."""
    _api_post(f'/tasks/{task_id}/close')
    # Todoist /close returns 204 No Content, so synthesise a result so callers
    # can treat the dict shape as authoritative.
    return {'id': task_id, 'is_completed': True}


def serialize_task(task: dict) -> dict:
    """Translate a Todoist task into the common (TickTick-style) shape used by
    the frontend and the local Task model."""
    todoist_priority = task.get('priority', 1)
    tt_priority = _TODOIST_TO_TICKTICK_PRIORITY.get(todoist_priority, 0)

    is_completed = bool(task.get('is_completed', False))
    status = 2 if is_completed else 0

    due = task.get('due') or {}
    # Todoist returns either {date: 'YYYY-MM-DD'} or {datetime: '...Z'}.
    due_date = due.get('datetime') or due.get('date') or None

    assignee = task.get('assignee_id')

    return {
        'id': str(task.get('id') or ''),
        'title': task.get('content', ''),
        'content': task.get('description', '') or '',
        'priority': tt_priority,
        'status': status,
        'due_date': due_date,
        'start_date': None,  # Todoist has no separate start date field
        'assignee': str(assignee) if assignee else None,
        'tags': task.get('labels') or [],
        'created_time': task.get('created_at'),
        'modified_time': task.get('updated_at'),  # v1 exposes this; falls back to None on older payloads
        'project_id': str(task.get('project_id') or ''),
    }


def sync_tasks_to_db(project_id: str) -> dict:
    """Pull active tasks from Todoist and upsert into the local Task table.

    Tasks that exist locally for this provider but are no longer returned by
    Todoist (because they got completed or deleted in the source) are marked
    completed locally so the UI reflects reality.

    Returns: {'created': N, 'updated': N, 'total': N, 'closed_locally': N}
    """
    from todos.models import Task

    tasks = get_tasks(project_id)
    seen_ids: set[str] = set()
    created_count = 0
    updated_count = 0

    for task in tasks:
        s = serialize_task(task)
        seen_ids.add(s['id'])
        defaults = {
            'project_id': s['project_id'],
            'title': s['title'],
            'content': s['content'],
            'status': s['status'],
            'priority': s['priority'],
            'due_date': s['due_date'] or '',
            'start_date': s['start_date'] or '',
            'assignee': s['assignee'] or '',
            'tags': s['tags'],
            'created_time': s['created_time'] or '',
            'modified_time': s['modified_time'] or '',
        }
        _, created = Task.objects.update_or_create(
            provider=PROVIDER_TODOIST,
            external_id=s['id'],
            defaults=defaults,
        )
        if created:
            created_count += 1
        else:
            updated_count += 1

    # Mark anything we've stored before but didn't see in this pull as completed.
    closed = 0
    if seen_ids:
        closed = Task.objects.filter(
            provider=PROVIDER_TODOIST, status=0,
        ).exclude(external_id__in=seen_ids).update(status=2)

    logger.info(
        'Todoist sync: %d created, %d updated, %d closed locally',
        created_count, updated_count, closed,
    )
    return {
        'created': created_count,
        'updated': updated_count,
        'total': len(tasks),
        'closed_locally': closed,
    }
