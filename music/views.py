from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def music_page(request):
    return render(request, 'music/music.html')
