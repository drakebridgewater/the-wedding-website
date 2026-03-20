from django.conf import settings


def google_places_key(request):
    return {'GOOGLE_PLACES_API_KEY': getattr(settings, 'GOOGLE_PLACES_API_KEY', '')}
