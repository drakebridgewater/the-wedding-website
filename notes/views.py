from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def notes_page(request):
    return render(request, 'notes/notes.html')
