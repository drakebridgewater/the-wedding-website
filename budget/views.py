from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from .models import BudgetCategory


@login_required
def budget_page(request):
    categories = list(BudgetCategory.objects.values_list('slug', 'label'))
    return render(request, 'budget/budget.html', {'categories': categories})


@login_required
def estimator_page(request):
    return render(request, 'budget/estimator.html')
