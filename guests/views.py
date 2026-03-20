import base64
from collections import namedtuple
import random
from datetime import datetime, timezone
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.urls import reverse
from django.http import HttpResponseRedirect, HttpResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.http import require_POST
from django.views.generic import ListView
from guests import csv_import
from guests.invitation import get_invitation_context, INVITATION_TEMPLATE, guess_party_by_invite_id_or_404, \
    send_invitation_email
from guests.models import Guest, MEALS, Party
from guests.save_the_date import get_save_the_date_context, send_save_the_date_email, SAVE_THE_DATE_TEMPLATE, \
    SAVE_THE_DATE_CONTEXT_MAP


class GuestListView(ListView):
    model = Guest


@login_required
def export_guests(request):
    export = csv_import.export_guests()
    response = HttpResponse(export.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=all-guests.csv'
    return response



def invitation(request, invite_id):
    party = guess_party_by_invite_id_or_404(invite_id)
    if party.invitation_opened is None:
        # update if this is the first time the invitation was opened
        party.invitation_opened = datetime.now(timezone.utc)
        party.save()
    if request.method == 'POST':
        for response in _parse_invite_params(request.POST):
            guest = Guest.objects.get(pk=response.guest_pk)
            assert guest.party == party
            guest.is_attending = response.is_attending
            guest.meal = response.meal
            guest.dietary_restrictions = response.dietary_restrictions
            guest.save()
        if request.POST.get('comments'):
            comments = request.POST.get('comments')
            party.comments = comments if not party.comments else '{}; {}'.format(party.comments, comments)
        address = request.POST.get('address', '').strip()
        if address:
            party.address = address
        party.wants_physical_card = request.POST.get('wants_physical_card') == 'on'
        party.is_attending = party.any_guests_attending
        party.rsvp_responded_at = datetime.now(timezone.utc)
        party.save()
        return HttpResponseRedirect(reverse('rsvp-confirm', args=[invite_id]))
    return render(request, template_name='guests/invitation.html', context={
        'party': party,
        'meals': MEALS,
        'couple_name' : settings.BRIDE_AND_GROOM,
        'website_url': settings.WEDDING_WEBSITE_URL,        
    })


InviteResponse = namedtuple('InviteResponse', ['guest_pk', 'is_attending', 'meal', 'dietary_restrictions'])


def _parse_invite_params(params):
    responses = {}
    for param, value in params.items():
        if param.startswith('attending'):
            pk = int(param.split('-')[-1])
            response = responses.get(pk, {})
            response['attending'] = True if value == 'yes' else False
            responses[pk] = response
        elif param.startswith('meal'):
            pk = int(param.split('-')[-1])
            response = responses.get(pk, {})
            response['meal'] = value
            responses[pk] = response
        elif param.startswith('dietary'):
            pk = int(param.split('-')[-1])
            response = responses.get(pk, {})
            response['dietary_restrictions'] = value
            responses[pk] = response

    for pk, response in responses.items():
        yield InviteResponse(pk, response['attending'], response.get('meal', None), response.get('dietary_restrictions', ''))


def rsvp_confirm(request, invite_id=None):
    party = guess_party_by_invite_id_or_404(invite_id)
    return render(request, template_name='guests/rsvp_confirmation.html', context={
        'party': party,
        'support_email': settings.DEFAULT_WEDDING_REPLY_EMAIL,
        'couple_name' : settings.BRIDE_AND_GROOM,
        'website_url': settings.WEDDING_WEBSITE_URL,                
    })


@login_required
def invitation_email_preview(request, invite_id):
    party = guess_party_by_invite_id_or_404(invite_id)
    context = get_invitation_context(party)
    return render(request, INVITATION_TEMPLATE, context=context)


@login_required
def invitation_email_test(request, invite_id):
    party = guess_party_by_invite_id_or_404(invite_id)
    send_invitation_email(party, recipients=[settings.DEFAULT_WEDDING_TEST_EMAIL])
    return HttpResponse('sent!')


def save_the_date_random(request):
    template_id = random.choice(list(SAVE_THE_DATE_CONTEXT_MAP.keys()))
    return save_the_date_preview(request, template_id)


def save_the_date_preview(request, template_id):
    context = get_save_the_date_context(template_id)
    context['email_mode'] = False
    return render(request, SAVE_THE_DATE_TEMPLATE, context=context)


@login_required
def test_email(request, template_id):
    context = get_save_the_date_context(template_id)
    send_save_the_date_email(context, [settings.DEFAULT_WEDDING_TEST_EMAIL])
    return HttpResponse('sent!')


def _base64_encode(filepath):
    with open(filepath, "rb") as image_file:
        return base64.b64encode(image_file.read())


@login_required
def invitations_list(request):
    parties = Party.objects.filter(status='invited').prefetch_related('guest_set').order_by('category', 'name')
    site_base = request.build_absolute_uri('/').rstrip('/')
    return render(request, 'guests/invitations.html', {
        'parties': parties,
        'site_base': site_base,
        'couple_name': settings.BRIDE_AND_GROOM,
    })


@login_required
@require_POST
def send_party_invitation(request, party_pk):
    party = get_object_or_404(Party, pk=party_pk, status='invited')
    send_invitation_email(party)
    party.invitation_sent = datetime.now(timezone.utc)
    party.save()
    messages.success(request, f'Invitation sent to {party.name}.')
    return redirect('invitations')


@login_required
def manage_page(request):
    return render(request, 'guests/manage.html')
