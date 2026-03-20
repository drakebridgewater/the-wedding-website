import logging

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

log = logging.getLogger(__name__)


@login_required
@require_POST
def trigger_sync(request):
    from drive_sync.service import sync_all
    try:
        url, results = sync_all()
        return JsonResponse({'url': url, 'results': results})
    except Exception as exc:
        log.exception('Google Sheets sync failed')
        return JsonResponse({'error': str(exc)}, status=500)
