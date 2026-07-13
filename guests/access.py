"""Session-based guest access.

Guest-only site content (registry, honeymoon fund, travel info, Q&A, photos)
is unlocked either by opening a personal invite link (exact party known) or by
typing a guest/party name into the unlock prompt (may be ambiguous, in which
case the visitor can view content but party-specific links stay hidden).
"""
from guests.models import Party

SESSION_VERIFIED_KEY = 'guest_verified'
SESSION_PARTY_KEY = 'guest_party_id'
GUEST_SESSION_AGE = 60 * 60 * 24 * 90  # invite links stay live for months


def grant_party_access(request, party):
    """Exact party known (personal link or unambiguous name match)."""
    request.session[SESSION_VERIFIED_KEY] = True
    request.session[SESSION_PARTY_KEY] = party.pk
    request.session.set_expiry(GUEST_SESSION_AGE)


def grant_generic_access(request):
    """Ambiguous name match: content unlocks, but no party-specific links.

    Deliberately leaves SESSION_PARTY_KEY alone so a party remembered from a
    personal link isn't downgraded.
    """
    request.session[SESSION_VERIFIED_KEY] = True
    request.session.set_expiry(GUEST_SESSION_AGE)


def is_guest_verified(request):
    return request.user.is_authenticated or bool(request.session.get(SESSION_VERIFIED_KEY))


def get_guest_party(request):
    party_id = request.session.get(SESSION_PARTY_KEY)
    if not party_id:
        return None
    return Party.objects.filter(pk=party_id).first()
