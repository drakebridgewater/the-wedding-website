import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Task

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def todo_sync(request):
    """Pull all tasks from TickTick and upsert them into the local DB."""
    from .ticktick_client import sync_tasks_to_db
    try:
        project_id = _get_project_id()
        result = sync_tasks_to_db(project_id)
    except RuntimeError as e:
        return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.error('TickTick sync failed: %s', e, exc_info=True)
        return Response({'error': 'Sync failed', 'detail': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def todo_list(request):
    """Return tasks from the local DB (populated by /sync/)."""
    qs = Task.objects.all()

    status_filter = request.query_params.get('status', 'active')
    if status_filter == 'active':
        qs = qs.filter(status=0)
    elif status_filter == 'completed':
        qs = qs.filter(status=2)

    assignee = request.query_params.get('assignee')
    if assignee:
        qs = qs.filter(assignee=assignee)

    sort_by = request.query_params.get('sort', 'due')
    if sort_by == 'priority':
        qs = qs.order_by('-priority')
    elif sort_by == 'created':
        qs = qs.order_by('created_time')
    else:
        # Sort by due_date: empty string sorts last
        qs = qs.extra(
            select={'due_empty': "CASE WHEN due_date = '' THEN 1 ELSE 0 END"}
        ).order_by('due_empty', 'due_date')

    return Response([t.to_dict() for t in qs])


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

    serialized = serialize_task(created)
    Task.objects.update_or_create(
        ticktick_id=serialized['id'],
        defaults={
            'project_id': serialized['project_id'] or '',
            'title': serialized['title'],
            'content': serialized['content'],
            'status': serialized['status'],
            'priority': serialized['priority'],
            'due_date': serialized['due_date'] or '',
            'start_date': serialized['start_date'] or '',
            'assignee': serialized['assignee'] or '',
            'tags': serialized['tags'],
            'created_time': serialized['created_time'] or '',
            'modified_time': serialized['modified_time'] or '',
        },
    )
    return Response(serialized, status=status.HTTP_201_CREATED)


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

    Task.objects.filter(ticktick_id=task_id).update(status=2)
    return Response(serialize_task(result) if isinstance(result, dict) else {'status': 'completed'})
