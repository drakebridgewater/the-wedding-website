from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect


@login_required
def ideas_page(request):
    return redirect('/todos/#ideas')
