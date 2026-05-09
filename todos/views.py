from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from . import provider


@login_required
def todos_page(request):
    try:
        cfg = provider.get_config()
        drake_assignee = cfg.get('drake_assignee', '') or ''
        shawna_assignee = cfg.get('shawna_assignee', '') or ''
    except Exception:
        drake_assignee = ''
        shawna_assignee = ''
    return render(request, 'todos/todos.html', {
        'drake_assignee': drake_assignee,
        'shawna_assignee': shawna_assignee,
        'todo_provider': provider.get_active_provider(),
    })
