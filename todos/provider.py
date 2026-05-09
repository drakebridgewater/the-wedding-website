"""
Provider dispatcher for the todos app.

Reads `TODO_PROVIDER` from Django settings (driven by the `TODO_PROVIDER` env
var in production) and routes to either the TickTick or Todoist client. Both
client modules expose the same surface, so callers in `api_views.py` /
`views.py` can stay provider-agnostic.

Default is `'todoist'` since TickTick has been retired in this deployment.
"""
from __future__ import annotations

import importlib
import logging
from types import ModuleType

from django.conf import settings

from .models import PROVIDER_TICKTICK, PROVIDER_TODOIST

logger = logging.getLogger(__name__)

_VALID_PROVIDERS = {PROVIDER_TICKTICK, PROVIDER_TODOIST}
_MODULES = {
    PROVIDER_TICKTICK: 'todos.ticktick_client',
    PROVIDER_TODOIST: 'todos.todoist_client',
}


def get_active_provider() -> str:
    name = getattr(settings, 'TODO_PROVIDER', PROVIDER_TODOIST)
    name = (name or '').lower().strip()
    if name not in _VALID_PROVIDERS:
        logger.warning(
            'Unknown TODO_PROVIDER=%r, falling back to %r', name, PROVIDER_TODOIST,
        )
        return PROVIDER_TODOIST
    return name


def get_provider_module() -> ModuleType:
    return importlib.import_module(_MODULES[get_active_provider()])


# ---------------------------------------------------------------------------
# Re-exports — every function here just delegates to the active provider's
# implementation so callers don't need to import provider-specific modules.
# ---------------------------------------------------------------------------

def get_config() -> dict:
    return get_provider_module().get_config()


def get_wedding_project_id() -> str | None:
    return get_provider_module().get_wedding_project_id()


def get_projects() -> list:
    return get_provider_module().get_projects()


def sync_tasks_to_db(project_id: str) -> dict:
    return get_provider_module().sync_tasks_to_db(project_id)


def create_task(title: str, project_id: str, **kwargs) -> dict:
    return get_provider_module().create_task(title, project_id, **kwargs)


def complete_task(project_id: str, task_id: str) -> dict:
    return get_provider_module().complete_task(project_id, task_id)


def serialize_task(task: dict) -> dict:
    return get_provider_module().serialize_task(task)
