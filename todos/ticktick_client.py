"""
TickTick integration using the official OAuth2 API.

One-time setup: run `python manage.py ticktick_auth` to complete the browser
OAuth2 flow and save the token to TICKTICK_TOKEN_PATH (~/.token-oauth by default).

The token is refreshed automatically when it expires.
"""
import json
import logging
import time
from urllib.parse import urlencode

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

AUTHORIZE_URL = 'https://ticktick.com/oauth/authorize'
TOKEN_URL = 'https://ticktick.com/oauth/token'
API_BASE = 'https://api.ticktick.com/open/v1'
SCOPE = 'tasks:read tasks:write'
REDIRECT_URI = 'http://localhost'

_token_data = None


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _get_config() -> dict:
    """Return config from DB (admin-editable) with fallback to Django settings."""
    cfg = {
        'client_id': settings.TICKTICK_CLIENT_ID,
        'client_secret': settings.TICKTICK_CLIENT_SECRET,
        'project_name': settings.TICKTICK_PROJECT_NAME,
        'token_path': settings.TICKTICK_TOKEN_PATH,
        'drake_assignee': getattr(settings, 'TICKTICK_DRAKE_ASSIGNEE', ''),
        'shawna_assignee': getattr(settings, 'TICKTICK_SHAWNA_ASSIGNEE', ''),
    }
    try:
        from todos.models import TickTickSettings
        db = TickTickSettings.get()
        if db.client_id:
            cfg['client_id'] = db.client_id
        if db.client_secret:
            cfg['client_secret'] = db.client_secret
        if db.project_name:
            cfg['project_name'] = db.project_name
        if db.drake_assignee_id:
            cfg['drake_assignee'] = db.drake_assignee_id
        if db.shawna_assignee_id:
            cfg['shawna_assignee'] = db.shawna_assignee_id
    except Exception as e:
        logger.debug('Could not read TickTickSettings from DB (falling back to settings): %s', e)
    return cfg


def get_config():
    """Public accessor for config values (used by views to pass assignee IDs)."""
    return _get_config()


# ---------------------------------------------------------------------------
# Token management
# ---------------------------------------------------------------------------

def _load_token() -> dict | None:
    cfg = _get_config()
    try:
        with open(cfg['token_path']) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _save_token(token: dict):
    cfg = _get_config()
    with open(cfg['token_path'], 'w') as f:
        json.dump(token, f)


def _token_expired(token: dict) -> bool:
    return time.time() >= token.get('expires_at', 0) - 60


def _refresh_token(token: dict) -> dict:
    cfg = _get_config()
    resp = requests.post(
        TOKEN_URL,
        auth=(cfg['client_id'], cfg['client_secret']),
        data={
            'grant_type': 'refresh_token',
            'refresh_token': token['refresh_token'],
        },
    )
    resp.raise_for_status()
    new_token = resp.json()
    new_token['expires_at'] = time.time() + new_token.get('expires_in', 3600)
    _save_token(new_token)
    logger.info('TickTick token refreshed')
    return new_token


def get_access_token() -> str:
    global _token_data
    if _token_data is None:
        _token_data = _load_token()
    if _token_data is None:
        raise RuntimeError(
            'No TickTick token found. Run `python manage.py ticktick_auth` first.'
        )
    if _token_expired(_token_data):
        logger.info('TickTick token expired, refreshing...')
        _token_data = _refresh_token(_token_data)
    return _token_data['access_token']


def reset_token():
    """Force reload of the token on next call (e.g. after running ticktick_auth)."""
    global _token_data
    _token_data = None


# ---------------------------------------------------------------------------
# OAuth2 authorization flow (used by management command)
# ---------------------------------------------------------------------------

def get_authorization_url() -> str:
    cfg = _get_config()
    params = {
        'client_id': cfg['client_id'],
        'response_type': 'code',
        'scope': SCOPE,
        'redirect_uri': REDIRECT_URI,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code_for_token(code: str) -> dict:
    """Exchange an authorization code for an access+refresh token and save it."""
    cfg = _get_config()
    resp = requests.post(
        TOKEN_URL,
        auth=(cfg['client_id'], cfg['client_secret']),
        data={
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': REDIRECT_URI,
        },
    )
    resp.raise_for_status()
    token = resp.json()
    token['expires_at'] = time.time() + token.get('expires_in', 3600)
    _save_token(token)
    reset_token()
    return token


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------

def _api_get(path: str) -> dict | list:
    token = get_access_token()
    resp = requests.get(
        f'{API_BASE}{path}',
        headers={'Authorization': f'Bearer {token}'},
    )
    resp.raise_for_status()
    return resp.json()


def _api_post(path: str, data: dict) -> dict:
    token = get_access_token()
    resp = requests.post(
        f'{API_BASE}{path}',
        headers={'Authorization': f'Bearer {token}'},
        json=data,
    )
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_projects() -> list:
    return _api_get('/project')


def get_wedding_project_id() -> str | None:
    cfg = _get_config()
    name = cfg['project_name'].lower()
    for project in get_projects():
        if project.get('name', '').lower() == name:
            return project['id']
    return None


def get_tasks(project_id: str) -> list:
    data = _api_get(f'/project/{project_id}/data')
    return data.get('tasks', [])


def create_task(title: str, project_id: str, **kwargs) -> dict:
    payload = {'title': title, 'projectId': project_id}
    payload.update(kwargs)
    return _api_post('/task', payload)


def complete_task(project_id: str, task_id: str) -> dict:
    return _api_post(f'/project/{project_id}/task/{task_id}/complete', {})


def serialize_task(task: dict) -> dict:
    return {
        'id': task.get('id'),
        'title': task.get('title', ''),
        'content': task.get('content', ''),
        'priority': task.get('priority', 0),   # 0=none 1=low 3=medium 5=high
        'status': task.get('status', 0),        # 0=active 2=completed
        'due_date': task.get('dueDate'),
        'start_date': task.get('startDate'),
        'assignee': task.get('assignee'),
        'tags': task.get('tags') or [],
        'created_time': task.get('createdTime'),
        'modified_time': task.get('modifiedTime'),
        'project_id': task.get('projectId'),
    }


def sync_tasks_to_db(project_id: str) -> dict:
    """Pull all tasks from TickTick and upsert them into the local Task table.

    Returns a dict with counts: {'updated': N, 'created': N, 'total': N}.
    """
    from todos.models import Task

    tasks = get_tasks(project_id)
    created_count = 0
    updated_count = 0

    for task in tasks:
        defaults = {
            'project_id': task.get('projectId', ''),
            'title': task.get('title', ''),
            'content': task.get('content', ''),
            'status': task.get('status', 0),
            'priority': task.get('priority', 0),
            'due_date': task.get('dueDate') or '',
            'start_date': task.get('startDate') or '',
            'assignee': task.get('assignee') or '',
            'tags': task.get('tags') or [],
            'created_time': task.get('createdTime') or '',
            'modified_time': task.get('modifiedTime') or '',
        }
        _, created = Task.objects.update_or_create(
            ticktick_id=task['id'],
            defaults=defaults,
        )
        if created:
            created_count += 1
        else:
            updated_count += 1

    logger.info('TickTick sync: %d created, %d updated', created_count, updated_count)
    return {'created': created_count, 'updated': updated_count, 'total': len(tasks)}
