from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST


@login_required
@require_POST
def trigger_sync(request):
    from drive_sync.service import sync_all
    try:
        url = sync_all()
        return JsonResponse({'url': url})
    except Exception as exc:
        return JsonResponse({'error': str(exc)}, status=500)
