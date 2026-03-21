from django.conf import settings

_FALLBACK_THEME = {'accent': '#e11d48', 'accent_hover': '#9f1239', 'accent_light': '#fce7f3'}


def wedding_settings(request):
    registry_url = getattr(settings, 'REGISTRY_URL', '')
    weddingshare_url = getattr(settings, 'WEDDINGSHARE_URL', '')
    try:
        from wedding.models import WeddingSettings
        w = WeddingSettings.get()
        theme = w.theme or _FALLBACK_THEME
        return {
            'wedding': w,
            'couple_name': w.couple_name,
            'support_email': w.support_email or getattr(settings, 'DEFAULT_WEDDING_EMAIL', ''),
            'wedding_date': w.wedding_date_display or getattr(settings, 'WEDDING_DATE', ''),
            'wedding_location': w.wedding_location or getattr(settings, 'WEDDING_LOCATION', ''),
            'registry_url': registry_url,
            'weddingshare_url': weddingshare_url,
            'theme': theme,
        }
    except Exception:
        return {
            'couple_name': getattr(settings, 'BRIDE_AND_GROOM', ''),
            'support_email': getattr(settings, 'DEFAULT_WEDDING_EMAIL', ''),
            'wedding_date': getattr(settings, 'WEDDING_DATE', ''),
            'wedding_location': getattr(settings, 'WEDDING_LOCATION', ''),
            'registry_url': registry_url,
            'weddingshare_url': weddingshare_url,
            'theme': _FALLBACK_THEME,
        }
