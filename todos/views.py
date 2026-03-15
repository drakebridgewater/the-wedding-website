from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def todos_page(request):
    from .ticktick_client import get_config
    try:
        cfg = get_config()
        drake_assignee = cfg['drake_assignee']
        shawna_assignee = cfg['shawna_assignee']
    except Exception:
        drake_assignee = ''
        shawna_assignee = ''
    return render(request, 'todos/todos.html', {
        'drake_assignee': drake_assignee,
        'shawna_assignee': shawna_assignee,
    })
