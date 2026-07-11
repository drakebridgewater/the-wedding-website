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


@login_required
def drive_info(request):
    """Drive about.get storageQuota for the sync service account (diagnostics)."""
    from drive_sync.service import get_drive_info
    try:
        return JsonResponse(get_drive_info())
    except Exception as exc:
        log.exception('Drive about.get failed')
        return JsonResponse({'error': str(exc)}, status=500)
