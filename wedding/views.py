from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST

from guests.models import WeddingPartyMember
from guests.save_the_date import SAVE_THE_DATE_CONTEXT_MAP

from .models import Question, WeddingSettings

ROLE_LABELS = {
    'bride': 'Bride', 'groom': 'Groom', 'maid_of_honor': 'Maid of Honor',
    'best_man': 'Best Man', 'bridesmaid': 'Bridesmaid', 'groomsman': 'Groomsman', 'other': 'Other',
}

SIDE_GROUPS = [
    {'label': 'Bridal Party',  'roles': ['maid_of_honor', 'bridesmaid'], 'honor_roles': {'maid_of_honor'}},
    {'label': "Groom's Party", 'roles': ['best_man', 'groomsman'],       'honor_roles': {'best_man'}},
]


def home(request):
    ws = WeddingSettings.get()
    return render(request, 'home.html', context={
        'save_the_dates': SAVE_THE_DATE_CONTEXT_MAP,
        'approved_questions': Question.objects.filter(is_approved=True),
        'weddingshare_url': getattr(settings, 'WEDDINGSHARE_URL', ''),
        'hero_photo_url': ws.hero_photo.url if ws.hero_photo else None,
    })


def wedding_party(request):
    members = WeddingPartyMember.objects.order_by('order', 'name')
    by_role = {}
    for m in members:
        by_role.setdefault(m.role, []).append(m)

    grouped = []

    for role in ['bride', 'groom']:
        group = by_role.get(role, [])
        if group:
            grouped.append({'label': ROLE_LABELS[role], 'members': group, 'honor_roles': set()})

    for side in SIDE_GROUPS:
        side_members = []
        for role in side['roles']:
            side_members.extend(by_role.get(role, []))
        if side_members:
            grouped.append({'label': side['label'], 'members': side_members, 'honor_roles': side['honor_roles']})

    other = by_role.get('other', [])
    if other:
        grouped.append({'label': ROLE_LABELS['other'], 'members': other, 'honor_roles': set()})

    return render(request, 'party.html', {'grouped': grouped})


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
    question_text = request.POST.get('question_text', '').strip()
    if question_text:
        Question.objects.create(
            name=request.POST.get('name', '').strip(),
            question_text=question_text,
        )
    return redirect('/#questions?submitted=1')
