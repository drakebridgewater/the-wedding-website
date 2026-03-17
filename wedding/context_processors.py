from django.conf import settings


def wedding_settings(request):
    registry_url = getattr(settings, 'REGISTRY_URL', '')
    try:
        from wedding.models import WeddingSettings
        w = WeddingSettings.get()
        return {
            'wedding': w,
            'couple_name': w.couple_name,
            'support_email': w.support_email or getattr(settings, 'DEFAULT_WEDDING_EMAIL', ''),
            'wedding_date': w.wedding_date_display or getattr(settings, 'WEDDING_DATE', ''),
            'wedding_location': w.wedding_location or getattr(settings, 'WEDDING_LOCATION', ''),
            'registry_url': registry_url,
        }
    except Exception:
        return {
            'couple_name': getattr(settings, 'BRIDE_AND_GROOM', ''),
            'support_email': getattr(settings, 'DEFAULT_WEDDING_EMAIL', ''),
            'wedding_date': getattr(settings, 'WEDDING_DATE', ''),
            'wedding_location': getattr(settings, 'WEDDING_LOCATION', ''),
            'registry_url': registry_url,
        }
