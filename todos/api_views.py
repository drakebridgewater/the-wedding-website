import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def _get_project_id():
    from .ticktick_client import get_wedding_project_id, _get_config
    project_id = get_wedding_project_id()
    if project_id is None:
        cfg = _get_config()
        raise RuntimeError(
            f'TickTick project "{cfg["project_name"]}" not found. '
            'Check TICKTICK_PROJECT_NAME in settings.'
        )
    return project_id


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def todo_list(request):
    from .ticktick_client import get_tasks, serialize_task
    try:
        project_id = _get_project_id()
        all_tasks = get_tasks(project_id)
    except RuntimeError as e:
        return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.error('TickTick task list failed: %s', e, exc_info=True)
        return Response({'error': 'Failed to fetch tasks from TickTick'}, status=status.HTTP_502_BAD_GATEWAY)

    status_filter = request.query_params.get('status', 'active')
    if status_filter == 'active':
        all_tasks = [t for t in all_tasks if t.get('status', 0) == 0]
    elif status_filter == 'completed':
        all_tasks = [t for t in all_tasks if t.get('status', 0) == 2]

    assignee = request.query_params.get('assignee')
    if assignee:
        all_tasks = [t for t in all_tasks if t.get('assignee') == assignee]

    sort_by = request.query_params.get('sort', 'due')
    if sort_by == 'priority':
        all_tasks.sort(key=lambda t: -(t.get('priority') or 0))
    elif sort_by == 'created':
        all_tasks.sort(key=lambda t: t.get('createdTime') or '')
    else:
        all_tasks.sort(key=lambda t: t.get('dueDate') or '9999')

    return Response([serialize_task(t) for t in all_tasks])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def todo_create(request):
    from .ticktick_client import create_task, serialize_task
    try:
        project_id = _get_project_id()
    except RuntimeError as e:
        return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    title = (request.data.get('title') or '').strip()
    if not title:
        return Response({'error': 'title is required'}, status=status.HTTP_400_BAD_REQUEST)

    kwargs = {}
    if request.data.get('content'):
        kwargs['content'] = request.data['content']
    if request.data.get('due_date'):
        kwargs['dueDate'] = request.data['due_date']
    if request.data.get('priority') is not None:
        kwargs['priority'] = int(request.data['priority'])
    if request.data.get('assignee'):
        kwargs['assignee'] = request.data['assignee']

    try:
        created = create_task(title, project_id, **kwargs)
    except Exception as e:
        logger.error('TickTick task create failed: %s', e, exc_info=True)
        return Response({'error': 'Failed to create task in TickTick'}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(serialize_task(created), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def todo_complete(request, task_id):
    from .ticktick_client import complete_task, serialize_task
    try:
        project_id = _get_project_id()
        result = complete_task(project_id, task_id)
    except RuntimeError as e:
        return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.error('TickTick task complete failed: %s', e, exc_info=True)
        return Response({'error': 'Failed to complete task in TickTick'}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(serialize_task(result) if isinstance(result, dict) else {'status': 'completed'})
