import base64
from collections import namedtuple
import os
import random
from datetime import datetime, timezone
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Q, TextField, Value
from django.db.models.functions import Concat
from django.urls import reverse
from django.http import HttpResponseRedirect, HttpResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.templatetags.static import static
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST
from django.views.generic import ListView
from guests import csv_import
from guests.access import grant_generic_access, grant_party_access
from guests.invitation import get_invitation_context, INVITATION_TEMPLATE, guess_party_by_invite_id_or_404, \
    send_invitation_email
from guests.models import ContactUpdate, Guest, MealOption, Party
from guests.save_the_date import get_save_the_date_context_from_settings, send_save_the_date_email, SAVE_THE_DATE_TEMPLATE


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
    grant_party_access(request, party)
    if party.invitation_opened is None:
        # update if this is the first time the invitation was opened
        party.invitation_opened = datetime.now(timezone.utc)
        party.save()
    if request.method == 'POST':
        for response in _parse_invite_params(request.POST):
            guest = Guest.objects.filter(pk=response.guest_pk, party=party).first()
            if guest is None:
                # Malformed or foreign guest_pk — ignore rather than 500.
                continue
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
            party.address_street = request.POST.get('address_street', '').strip()
            party.address_city = request.POST.get('address_city', '').strip()
            party.address_state = request.POST.get('address_state', '').strip()
            party.address_zip = request.POST.get('address_zip', '').strip()
            party.address_country = request.POST.get('address_country', '').strip()
            party.address_verified = request.POST.get('address_verified') == '1'
        party.wants_physical_card = request.POST.get('wants_physical_card') == 'on'
        party.is_attending = party.any_guests_attending
        party.rsvp_responded_at = datetime.now(timezone.utc)
        party.save()
        return HttpResponseRedirect(reverse('rsvp-confirm', args=[invite_id]))
    return render(request, template_name='guests/invitation.html', context={
        'party': party,
        'meals': MealOption.choices(),
        'couple_name' : settings.BRIDE_AND_GROOM,
        'website_url': settings.WEDDING_WEBSITE_URL,        
    })


def contact_details(request, invite_id):
    """Public form (linked from the save-the-date email) where a party can
    confirm or correct their names, emails, phone numbers, and mailing address.
    Changes apply directly to the Party/Guest records and are logged as a
    ContactUpdate for review in the admin."""
    party = guess_party_by_invite_id_or_404(invite_id)
    grant_party_access(request, party)
    if party.save_the_date_sent and party.save_the_date_opened is None:
        # The details link travels in the save-the-date email, so a first
        # visit doubles as an open receipt.
        party.save_the_date_opened = datetime.now(timezone.utc)
        party.save(update_fields=['save_the_date_opened'])
    if request.method == 'POST':
        changes = _apply_contact_details(party, request.POST)
        if changes:
            ContactUpdate.objects.create(party=party, changes=changes)
        return HttpResponseRedirect(reverse('guest-details', args=[invite_id]) + '?saved=1')
    return render(request, template_name='guests/contact_details.html', context={
        'party': party,
        'saved': request.GET.get('saved') == '1',
        'couple_name': settings.BRIDE_AND_GROOM,
        'website_url': settings.WEDDING_WEBSITE_URL,
    })


# Photo strips shown on the served Save-the-Date card, one inner list per
# printed strip (filenames of camera originals in photo_masters/). This is
# the single place to curate what guests see. The card never loads these
# originals — it serves the thumb/full derivatives under
# static/bigday/images/std/, so run `manage.py build_std_photos` after
# changing this list.
SAVE_THE_DATE_CARD_STRIPS = [
      [
        "bw_ds_bench.JPG",
        "cake_pond.JPG",
        "bw_ds_bench_01.JPG",
        "des_bench.JPG"
      ],
      [
        "des_bench_01.JPG",
        "ds_kiss.JPG",
        "des_bench_champagne_01.JPG",
        "ds_bench_bridge.JPG"
      ],
      [
        "ethan_glasses.JPG",
        "bw_cake.JPG",
        "the_stare.JPG",
        "ds_walk.JPG",
      ],
]


def _std_card_strips():
    """Map each curated photo to its resized derivatives (built by
    `manage.py build_std_photos`): a small thumb shown in the strips and a
    mid-size full for the lightbox."""
    def variants(filename):
        base = os.path.splitext(filename)[0]
        return {
            'thumb': static(f'bigday/images/std/thumb/{base}.jpg'),
            'full': static(f'bigday/images/std/full/{base}.jpg'),
        }
    return [[variants(p) for p in strip] for strip in SAVE_THE_DATE_CARD_STRIPS]


def save_the_date_card(request, invite_id):
    """The animated Save-the-Date card, served per guest so its 'update contact
    details' button links to this party's form. A first visit doubles as an open
    receipt, mirroring contact_details()."""
    party = guess_party_by_invite_id_or_404(invite_id)
    grant_party_access(request, party)
    if party.save_the_date_sent and party.save_the_date_opened is None:
        party.save_the_date_opened = datetime.now(timezone.utc)
        party.save(update_fields=['save_the_date_opened'])
    return render(request, template_name='guests/save_the_date_card.html', context={
        'party': party,
        'details_url': reverse('guest-details', args=[invite_id]),
        'couple_name': settings.BRIDE_AND_GROOM,
        'photo_strips': _std_card_strips(),
    })


def _track(changes, target, label, field, old, new):
    old, new = (old or '').strip(), (new or '').strip()
    if old != new:
        changes.append({'target': target, 'label': label, 'field': field, 'old': old, 'new': new})
    return new


def _apply_contact_details(party, params):
    """Apply the contact-details form to the party and its guests.
    Returns the list of change dicts (empty if nothing changed)."""
    changes = []

    party_name = params.get('party_name', '').strip()[:200]
    if party_name and party_name != party.name:
        _track(changes, 'party', party.name, 'name', party.name, party_name)
        party.name = party_name

    address = params.get('address', '').strip()
    if address and address != (party.address or '').strip():
        _track(changes, 'party', party.name, 'address', party.address, address)
        party.address = address
        party.address_street = params.get('address_street', '').strip()
        party.address_city = params.get('address_city', '').strip()
        party.address_state = params.get('address_state', '').strip()
        party.address_zip = params.get('address_zip', '').strip()
        party.address_country = params.get('address_country', '').strip()
        party.address_verified = params.get('address_verified') == '1'

    party.save()

    for guest in party.guest_set.all():
        dirty = False
        first_name = params.get('first_name-{}'.format(guest.pk), '').strip()[:100]
        if first_name and first_name != guest.first_name:
            _track(changes, 'guest', guest.name, 'first_name', guest.first_name, first_name)
            guest.first_name = first_name
            dirty = True
        last_name = params.get('last_name-{}'.format(guest.pk), '').strip()[:100]
        if last_name != (guest.last_name or '').strip():
            _track(changes, 'guest', guest.name, 'last_name', guest.last_name, last_name)
            guest.last_name = last_name
            dirty = True
        email = params.get('email-{}'.format(guest.pk), '').strip()[:254]
        if email != (guest.email or '').strip():
            _track(changes, 'guest', guest.name, 'email', guest.email, email)
            guest.email = email
            dirty = True
        phone = params.get('phone-{}'.format(guest.pk), '').strip()[:30]
        if phone != guest.phone.strip():
            _track(changes, 'guest', guest.name, 'phone', guest.phone, phone)
            guest.phone = phone
            dirty = True
        if dirty:
            guest.save()

    return changes


InviteResponse = namedtuple('InviteResponse', ['guest_pk', 'is_attending', 'meal', 'dietary_restrictions'])


def _parse_guest_pk(param):
    try:
        return int(param.split('-')[-1])
    except (ValueError, IndexError):
        return None


def _parse_invite_params(params):
    responses = {}
    for param, value in params.items():
        if param.startswith('attending'):
            pk = _parse_guest_pk(param)
            if pk is None:
                continue
            response = responses.get(pk, {})
            response['attending'] = True if value == 'yes' else False
            responses[pk] = response
        elif param.startswith('meal'):
            pk = _parse_guest_pk(param)
            if pk is None:
                continue
            response = responses.get(pk, {})
            response['meal'] = value
            responses[pk] = response
        elif param.startswith('dietary'):
            pk = _parse_guest_pk(param)
            if pk is None:
                continue
            response = responses.get(pk, {})
            response['dietary_restrictions'] = value
            responses[pk] = response

    for pk, response in responses.items():
        if 'attending' not in response:
            # No radio button submitted for this guest — nothing to apply.
            continue
        yield InviteResponse(pk, response['attending'], response.get('meal', None), response.get('dietary_restrictions', ''))


def rsvp_confirm(request, invite_id=None):
    party = guess_party_by_invite_id_or_404(invite_id)
    grant_party_access(request, party)
    return render(request, template_name='guests/rsvp_confirmation.html', context={
        'party': party,
        'support_email': settings.DEFAULT_WEDDING_REPLY_EMAIL,
        'couple_name' : settings.BRIDE_AND_GROOM,
        'website_url': settings.WEDDING_WEBSITE_URL,
    })


@require_POST
def unlock_access(request):
    """Unlock guest-only content by name (guest 'First Last' or party name).

    Exactly one matching party grants full access (party-specific links);
    several matches grant view-only access; none redirects back with an error
    flag. This only gates cosmetic wedding info, so name matching is an
    acceptable bar.
    """
    name = ' '.join(request.POST.get('name', '').split())
    matched = set()
    if name:
        matched.update(Party.objects.filter(name__iexact=name))
        full_name_guests = Guest.objects.annotate(
            full_name=Concat('first_name', Value(' '), 'last_name', output_field=TextField()),
        ).filter(full_name__iexact=name, last_name__isnull=False, party__isnull=False).select_related('party')
        matched.update(g.party for g in full_name_guests)
        if ' ' not in name:
            # Single-word entry: match guests recorded without a last name.
            first_only = Guest.objects.filter(
                first_name__iexact=name, party__isnull=False,
            ).filter(Q(last_name__isnull=True) | Q(last_name='')).select_related('party')
            matched.update(g.party for g in first_only)

    next_url = request.POST.get('next', '')
    if not url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}):
        next_url = '/'
    anchor = request.POST.get('anchor', '').strip()

    if len(matched) == 1:
        grant_party_access(request, matched.pop())
    elif matched:
        grant_generic_access(request)
    else:
        sep = '&' if '?' in next_url else '?'
        next_url = '{}{}unlock_error=1'.format(next_url, sep)
    if anchor:
        next_url = '{}#{}'.format(next_url, anchor)
    return HttpResponseRedirect(next_url)


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
    return save_the_date_preview(request, template_id=None)


def save_the_date_preview(request, template_id=None):
    context = get_save_the_date_context_from_settings()
    context['email_mode'] = False
    return render(request, SAVE_THE_DATE_TEMPLATE, context=context)


@login_required
def test_email(request, template_id=None):
    context = get_save_the_date_context_from_settings()
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
