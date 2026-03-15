from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from guests.models import WeddingPartyGroup


@login_required
def schedule_page(request):
    return render(request, 'schedule/schedule.html')


@login_required
def groups_page(request):
    groups = WeddingPartyGroup.objects.prefetch_related('members').all()
    return render(request, 'schedule/groups.html', {'groups': groups})


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
    return redirect('schedule:groups')
