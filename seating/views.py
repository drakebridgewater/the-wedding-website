from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def seating_page(request):
    return render(request, 'seating/seating.html')
