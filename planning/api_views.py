import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BudgetLineItem, Expense
from .serializers import BudgetLineItemSerializer, ExpenseSerializer

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Per-guest cost rates by tier (USD)
# --------------------------------------------------------------------------- #
TIER_RATE = {'budget': 150, 'standard': 275, 'luxury': 500}

# Category share of the per-guest budget (must sum to 1.0)
CATEGORY_SHARES = {
    'catering': 0.40,
    'venue': 0.25,
    'photography': 0.10,
    'flowers': 0.08,
    'entertainment': 0.07,
    'cake': 0.03,
    'stationery': 0.02,
    'miscellaneous': 0.05,
}

# Fixed costs by tier (not per-guest)
FIXED_COSTS = {
    'budget':   {'attire': 1000, 'beauty': 400,  'transportation': 600},
    'standard': {'attire': 3000, 'beauty': 800,  'transportation': 1000},
    'luxury':   {'attire': 8000, 'beauty': 2500, 'transportation': 2000},
}

GIFTS_PER_GUEST = 8  # favors / gifts per guest


def _qs():
    return BudgetLineItem.objects.prefetch_related('expenses')


# --------------------------------------------------------------------------- #
# Budget line item endpoints
# --------------------------------------------------------------------------- #

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def item_list(request):
    if request.method == 'GET':
        return Response(BudgetLineItemSerializer(_qs(), many=True).data)

    serializer = BudgetLineItemSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def item_detail(request, pk):
    try:
        item = _qs().get(pk=pk)
    except BudgetLineItem.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(BudgetLineItemSerializer(item).data)

    if request.method == 'DELETE':
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == 'PATCH'
    serializer = BudgetLineItemSerializer(item, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(BudgetLineItemSerializer(_qs().get(pk=item.pk)).data)


# --------------------------------------------------------------------------- #
# Expense endpoints
# --------------------------------------------------------------------------- #

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def expense_list(request, item_pk):
    try:
        item = BudgetLineItem.objects.get(pk=item_pk)
    except BudgetLineItem.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ExpenseSerializer(item.expenses.all(), many=True).data)

    serializer = ExpenseSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(budget_item=item)
    # Return the full updated budget item so the frontend can refresh in one call
    return Response(
        BudgetLineItemSerializer(_qs().get(pk=item_pk)).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def expense_detail(request, pk):
    try:
        expense = Expense.objects.select_related('budget_item').get(pk=pk)
    except Expense.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    item_pk = expense.budget_item_id
    expense.delete()
    # Return the full updated budget item
    return Response(BudgetLineItemSerializer(_qs().get(pk=item_pk)).data)


# --------------------------------------------------------------------------- #
# Summary
# --------------------------------------------------------------------------- #

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def budget_summary(request):
    items = list(_qs())
    total_estimated = sum(i.estimated_cost.amount for i in items)

    def actual_for(item):
        exp_total = sum(e.amount.amount for e in item.expenses.all())
        if exp_total:
            return exp_total
        return item.actual_cost.amount if item.actual_cost is not None else 0

    total_actual = sum(actual_for(i) for i in items)

    by_category = {}
    for item in items:
        cat = item.category
        if cat not in by_category:
            by_category[cat] = {
                'category': cat,
                'label': item.get_category_display(),
                'estimated': 0,
                'actual': None,
            }
        by_category[cat]['estimated'] += float(item.estimated_cost.amount)
        act = actual_for(item)
        if act:
            by_category[cat]['actual'] = (by_category[cat]['actual'] or 0) + float(act)

    return Response({
        'total_estimated': str(total_estimated),
        'total_actual': str(total_actual),
        'variance': str(total_estimated - total_actual),
        'by_category': list(by_category.values()),
    })


# --------------------------------------------------------------------------- #
# Budget estimator — shared calculation helper
# --------------------------------------------------------------------------- #

CATEGORY_LABELS = dict(BudgetLineItem.CATEGORIES)


def _calculate_estimate(guest_count: int, tier: str) -> dict:
    per_guest_total = TIER_RATE[tier] * guest_count
    fixed = FIXED_COSTS[tier]

    breakdown = []
    grand_total = 0

    for cat, share in CATEGORY_SHARES.items():
        amount = round(per_guest_total * share)
        breakdown.append({
            'category': cat,
            'label': CATEGORY_LABELS.get(cat, cat.title()),
            'amount': amount,
        })
        grand_total += amount

    for cat, amount in fixed.items():
        breakdown.append({
            'category': cat,
            'label': CATEGORY_LABELS.get(cat, cat.title()),
            'amount': amount,
        })
        grand_total += amount

    gifts_amount = GIFTS_PER_GUEST * guest_count
    breakdown.append({
        'category': 'gifts',
        'label': CATEGORY_LABELS.get('gifts', 'Gifts & Favors'),
        'amount': gifts_amount,
    })
    grand_total += gifts_amount

    return {'guest_count': guest_count, 'tier': tier, 'total': grand_total, 'breakdown': breakdown}


def _parse_estimate_params(request):
    guest_count = request.data.get('guest_count')
    tier = request.data.get('tier', '').lower()
    if not guest_count or tier not in TIER_RATE:
        return None, None, Response(
            {'error': 'Provide guest_count and tier (budget/standard/luxury).'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        guest_count = int(guest_count)
    except (ValueError, TypeError):
        return None, None, Response({'error': 'guest_count must be an integer.'}, status=400)
    return guest_count, tier, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def budget_estimate(request):
    guest_count, tier, err = _parse_estimate_params(request)
    if err:
        return err
    return Response(_calculate_estimate(guest_count, tier))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_estimate(request):
    """
    Runs the estimator then creates BudgetLineItems for each category.
    Categories that already have at least one item are skipped.
    """
    guest_count, tier, err = _parse_estimate_params(request)
    if err:
        return err

    result = _calculate_estimate(guest_count, tier)
    existing_categories = set(BudgetLineItem.objects.values_list('category', flat=True))

    created_items = []
    skipped = []

    for entry in result['breakdown']:
        cat = entry['category']
        if cat in existing_categories:
            skipped.append(cat)
            continue
        item = BudgetLineItem.objects.create(
            category=cat,
            description=f"{entry['label']} (estimated)",
            estimated_cost=entry['amount'],
        )
        created_items.append(BudgetLineItemSerializer(_qs().get(pk=item.pk)).data)

    return Response({
        'created': len(created_items),
        'skipped': len(skipped),
        'skipped_categories': skipped,
        'items': created_items,
    }, status=status.HTTP_201_CREATED)


# --------------------------------------------------------------------------- #
# TickTick todos endpoints
# --------------------------------------------------------------------------- #

def _get_project_id():
    """Return project_id or raise RuntimeError."""
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

    # Status filter
    status_filter = request.query_params.get('status', 'active')
    if status_filter == 'active':
        all_tasks = [t for t in all_tasks if t.get('status', 0) == 0]
    elif status_filter == 'completed':
        all_tasks = [t for t in all_tasks if t.get('status', 0) == 2]

    # Assignee filter
    assignee = request.query_params.get('assignee')
    if assignee:
        all_tasks = [t for t in all_tasks if t.get('assignee') == assignee]

    # Sort
    sort_by = request.query_params.get('sort', 'due')
    if sort_by == 'priority':
        all_tasks.sort(key=lambda t: -(t.get('priority') or 0))
    elif sort_by == 'created':
        all_tasks.sort(key=lambda t: t.get('createdTime') or '')
    else:  # due
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
