from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from .models import BudgetLineItem


@login_required
def budget_page(request):
    categories = BudgetLineItem.CATEGORIES
    return render(request, 'planning/budget.html', {'categories': categories})


@login_required
def estimator_page(request):
    return render(request, 'planning/estimator.html')


@login_required
def seating_page(request):
    return render(request, 'planning/seating.html')


@login_required
def todos_page(request):
    from .ticktick_client import get_config
    try:
        cfg = get_config()
        drake_assignee = cfg['drake_assignee']
        shawna_assignee = cfg['shawna_assignee']
    except Exception:
        drake_assignee = ''
        shawna_assignee = ''
    return render(request, 'planning/todos.html', {
        'drake_assignee': drake_assignee,
        'shawna_assignee': shawna_assignee,
    })
