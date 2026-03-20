from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST

from guests.models import WeddingPartyMember
from guests.save_the_date import SAVE_THE_DATE_CONTEXT_MAP

from .models import Question, WeddingSettings

ROLE_ORDER = ['bride', 'groom', 'maid_of_honor', 'best_man', 'bridesmaid', 'groomsman', 'other']
ROLE_LABELS = {
    'bride': 'Bride', 'groom': 'Groom', 'maid_of_honor': 'Maid of Honor',
    'best_man': 'Best Man', 'bridesmaid': 'Bridesmaid', 'groomsman': 'Groomsman', 'other': 'Other',
}


def home(request):
    ws = WeddingSettings.get()
    return render(request, 'home.html', context={
        'save_the_dates': SAVE_THE_DATE_CONTEXT_MAP,
        'approved_questions': Question.objects.filter(is_approved=True),
        'weddingshare_url': getattr(settings, 'WEDDINGSHARE_URL', ''),
        'hero_photo_url': ws.hero_photo.url if ws.hero_photo else None,
    })


def wedding_party(request):
    members = WeddingPartyMember.objects.all()
    grouped = []
    for role in ROLE_ORDER:
        group = [m for m in members if m.role == role]
        if group:
            grouped.append({'role': role, 'label': ROLE_LABELS[role], 'members': group})
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
