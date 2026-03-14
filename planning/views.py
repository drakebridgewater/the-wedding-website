from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .models import BudgetLineItem, WeddingPartyGroup


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
def schedule_page(request):
    return render(request, 'planning/schedule.html')


@login_required
def groups_page(request):
    groups = WeddingPartyGroup.objects.prefetch_related('members').all()
    return render(request, 'planning/groups.html', {'groups': groups})


@login_required
@require_POST
def send_group_email(request, pk):
    group = get_object_or_404(WeddingPartyGroup, pk=pk)
    subject = request.POST.get('subject', '').strip()
    body = request.POST.get('body', '').strip()
    recipients = [m.email for m in group.members.all() if m.email]
    if subject and body and recipients:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, recipients)
        messages.success(request, f'Email sent to {len(recipients)} member(s) in "{group.name}".')
    elif not recipients:
        messages.error(request, f'No members in "{group.name}" have an email address.')
    else:
        messages.error(request, 'Subject and message body are required.')
    return redirect('planning:groups')


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
