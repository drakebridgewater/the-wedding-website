import logging

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST

from guests.access import is_guest_verified
from guests.models import WeddingPartyMember
from .models import FundMessage, PageSectionItem, Question, WeddingSettings

log = logging.getLogger(__name__)


def _notify_support(subject, body):
    """Email the couple's support address about a new guest submission.

    Failures are logged but never surfaced to the guest — the submission
    itself has already been saved.
    """
    try:
        send_mail(
            subject,
            body,
            settings.DEFAULT_WEDDING_FROM_EMAIL,
            [settings.DEFAULT_WEDDING_REPLY_EMAIL],
        )
    except Exception:
        log.exception('Failed to send support notification: %s', subject)

ROLE_LABELS = {
    'bride': 'Bride', 'groom': 'Groom', 'maid_of_honor': 'Maid of Honor',
    'best_man': 'Best Man', 'bridesmaid': 'Bridesmaid', 'groomsman': 'Groomsman', 'other': 'Other',
}

# Honor attendants get their role spelled out under their name.
HONOR_ROLES = {'maid_of_honor', 'best_man'}

# Which roles fall on each side of the aisle. Order matters: honor attendant first.
BRIDES_SIDE_ROLES = ['bride', 'maid_of_honor', 'bridesmaid']
GROOMS_SIDE_ROLES = ['groom', 'best_man', 'groomsman']


def home(request):
    ws = WeddingSettings.get()
    verified = is_guest_verified(request)
    sections = {}
    for item in PageSectionItem.objects.filter(is_published=True).order_by('order', 'id'):
        sections.setdefault(item.section, []).append(item)
    if not verified:
        # Guest-only content must not reach the HTML at all.
        sections.pop('getting_there', None)
    return render(request, 'home.html', context={
        'approved_questions': Question.objects.filter(is_approved=True) if verified else Question.objects.none(),
        'weddingshare_url': getattr(settings, 'WEDDINGSHARE_URL', '') if verified else '',
        'hero_photo_url': ws.hero_photo.url if ws.hero_photo else None,
        'page_sections': sections,
    })


def wedding_party(request):
    members = WeddingPartyMember.objects.filter(is_public=True).order_by('order', 'name')
    by_role = {}
    for m in members:
        m.is_honor = m.role in HONOR_ROLES
        by_role.setdefault(m.role, []).append(m)

    def collect(roles):
        out = []
        for role in roles:
            out.extend(by_role.get(role, []))
        return out

    # Bride's side (girls) on the left, groom's side (boys) on the right.
    brides_side = collect(BRIDES_SIDE_ROLES)
    grooms_side = collect(GROOMS_SIDE_ROLES)
    # The couple anchor the top of each column.
    bride = (by_role.get('bride') or [None])[0]
    groom = (by_role.get('groom') or [None])[0]
    # Officiant / other don't sit on a side — shown centered below.
    extras = collect(['officiant', 'other'])

    return render(request, 'party.html', {
        'bride': bride,
        'groom': groom,
        'brides_attendants': [m for m in brides_side if m.role != 'bride'],
        'grooms_attendants': [m for m in grooms_side if m.role != 'groom'],
        'extras': extras,
        'has_any': bool(brides_side or grooms_side or extras),
    })


def privacy(request):
    """Public privacy policy — linked from the Pinterest OAuth app registration."""
    return render(request, 'privacy.html', {
        'couple': getattr(settings, 'BRIDE_AND_GROOM', ''),
        'contact_email': getattr(settings, 'DEFAULT_WEDDING_EMAIL', ''),
        'website_url': getattr(settings, 'WEDDING_WEBSITE_URL', ''),
        'updated': '2026-06-18',
    })


@login_required
@require_POST
def upload_hero_photo(request):
    image = request.FILES.get('image')
    if not image:
        return JsonResponse({'error': 'No image provided'}, status=400)
    ws = WeddingSettings.get()
    if ws.hero_photo:
        ws.hero_photo.delete(save=False)
    ws.hero_photo = image
    ws.save(update_fields=['hero_photo'])
    return JsonResponse({'url': ws.hero_photo.url})


@require_POST
def submit_question(request):
    if not is_guest_verified(request):
        return redirect('/#questions')
    question_text = request.POST.get('question_text', '').strip()
    if question_text:
        name = request.POST.get('name', '').strip()
        Question.objects.create(name=name, question_text=question_text)
        _notify_support(
            'New question on the wedding website',
            f'From: {name or "Anonymous"}\n\n'
            f'{question_text}\n\n'
            f'Approve it to show it on the site: '
            f'{settings.WEDDING_WEBSITE_URL}/admin/wedding/question/',
        )
    return redirect('/#questions?submitted=1')


def honeymoon_fund(request):
    if not is_guest_verified(request):
        # Payment handles and guestbook stay out of the context entirely;
        # the template renders the unlock teaser instead.
        return render(request, 'honeymoon.html', {})
    ws = WeddingSettings.get()
    messages = FundMessage.objects.filter(is_approved=True)
    submitted = request.GET.get('submitted') == '1'
    return render(request, 'honeymoon.html', {
        'ws': ws,
        'fund_messages': messages,
        'submitted': submitted,
    })


@require_POST
def submit_fund_message(request):
    if not is_guest_verified(request):
        return redirect('/honeymoon/')
    message = request.POST.get('message', '').strip()
    if message:
        name = request.POST.get('name', '').strip()
        FundMessage.objects.create(name=name, message=message)
        _notify_support(
            'New honeymoon fund message',
            f'From: {name or "Anonymous"}\n\n'
            f'{message}\n\n'
            f'Approve it to show it on the honeymoon page: '
            f'{settings.WEDDING_WEBSITE_URL}/admin/wedding/fundmessage/',
        )
    return redirect('/honeymoon/?submitted=1')
