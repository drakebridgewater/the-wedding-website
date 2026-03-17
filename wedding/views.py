from django.conf import settings
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST

from guests.save_the_date import SAVE_THE_DATE_CONTEXT_MAP

from .models import Question


def home(request):
    return render(request, 'home.html', context={
        'save_the_dates': SAVE_THE_DATE_CONTEXT_MAP,
        'approved_questions': Question.objects.filter(is_approved=True),
        'weddingshare_url': getattr(settings, 'WEDDINGSHARE_URL', ''),
    })


@require_POST
def submit_question(request):
    question_text = request.POST.get('question_text', '').strip()
    if question_text:
        Question.objects.create(
            name=request.POST.get('name', '').strip(),
            question_text=question_text,
        )
    return redirect('/#questions?submitted=1')
