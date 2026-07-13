from guests.access import get_guest_party, is_guest_verified


def guest_access(request):
    verified = is_guest_verified(request)
    return {
        'guest_verified': verified,
        'guest_party': get_guest_party(request) if verified else None,
    }
