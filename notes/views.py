from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect


@login_required
def notes_page(request):
    return redirect('/todos/#notes')
