"""
Pinterest integration using the official OAuth2 API (v5).

One-time setup: run `python manage.py pinterest_auth` to complete the browser
OAuth2 flow and save the token to PINTEREST_TOKEN_PATH (default: .pinterest-token).

The access token is refreshed automatically when it expires. This mirrors the
TickTick integration in todos/ticktick_client.py.

Note: a trial-mode Pinterest app can only read the *authenticated user's own*
boards — which is all we need for the couple's own wedding board.
"""
import json
import logging
import time
from urllib.parse import urlencode

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

AUTHORIZE_URL = 'https://www.pinterest.com/oauth/'
TOKEN_URL = 'https://api.pinterest.com/v5/oauth/token'
API_BASE = 'https://api.pinterest.com/v5'
SCOPE = 'boards:read,pins:read'

_token_data = None


class PinterestAuthError(RuntimeError):
    """Raised when there is no usable Pinterest token."""


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _get_config() -> dict:
    return {
        'client_id': getattr(settings, 'PINTEREST_CLIENT_ID', ''),
        'client_secret': getattr(settings, 'PINTEREST_CLIENT_SECRET', ''),
        'redirect_uri': getattr(settings, 'PINTEREST_REDIRECT_URI', 'http://localhost'),
        'token_path': getattr(settings, 'PINTEREST_TOKEN_PATH', '.pinterest-token'),
        'board_id': getattr(settings, 'PINTEREST_BOARD_ID', ''),
    }


def get_config():
    return _get_config()


# ---------------------------------------------------------------------------
# Token management
# ---------------------------------------------------------------------------

def _load_token() -> dict | None:
    cfg = _get_config()
    try:
        with open(cfg['token_path']) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _save_token(token: dict):
    cfg = _get_config()
    with open(cfg['token_path'], 'w') as f:
        json.dump(token, f)


def _token_expired(token: dict) -> bool:
    return time.time() >= token.get('expires_at', 0) - 60


def _refresh_token(token: dict) -> dict:
    cfg = _get_config()
    resp = requests.post(
        TOKEN_URL,
        auth=(cfg['client_id'], cfg['client_secret']),
        data={
            'grant_type': 'refresh_token',
            'refresh_token': token['refresh_token'],
            'scope': SCOPE,
        },
    )
    resp.raise_for_status()
    new_token = resp.json()
    # Pinterest may not return a fresh refresh_token; keep the old one.
    new_token.setdefault('refresh_token', token.get('refresh_token'))
    new_token['expires_at'] = time.time() + new_token.get('expires_in', 3600)
    _save_token(new_token)
    logger.info('Pinterest token refreshed')
    return new_token


def get_access_token() -> str:
    global _token_data
    if _token_data is None:
        _token_data = _load_token()
    if _token_data is None:
        raise PinterestAuthError(
            'No Pinterest token found. Run `python manage.py pinterest_auth` first.'
        )
    if _token_expired(_token_data):
        logger.info('Pinterest token expired, refreshing...')
        _token_data = _refresh_token(_token_data)
    return _token_data['access_token']


def reset_token():
    global _token_data
    _token_data = None


# ---------------------------------------------------------------------------
# OAuth2 authorization flow (used by management command)
# ---------------------------------------------------------------------------

def get_authorization_url() -> str:
    cfg = _get_config()
    params = {
        'client_id': cfg['client_id'],
        'redirect_uri': cfg['redirect_uri'],
        'response_type': 'code',
        'scope': SCOPE,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code_for_token(code: str) -> dict:
    cfg = _get_config()
    resp = requests.post(
        TOKEN_URL,
        auth=(cfg['client_id'], cfg['client_secret']),
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': cfg['redirect_uri'],
        },
    )
    resp.raise_for_status()
    token = resp.json()
    token['expires_at'] = time.time() + token.get('expires_in', 3600)
    _save_token(token)
    reset_token()
    return token


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------

def _api_get(path: str, params: dict | None = None) -> dict:
    token = get_access_token()
    resp = requests.get(
        f'{API_BASE}{path}',
        headers={'Authorization': f'Bearer {token}'},
        params=params or {},
    )
    resp.raise_for_status()
    return resp.json()


def _paginate(path: str) -> list:
    """Walk Pinterest's `bookmark` pagination and return all items."""
    items: list = []
    bookmark = None
    while True:
        params = {'page_size': 100}
        if bookmark:
            params['bookmark'] = bookmark
        data = _api_get(path, params)
        items.extend(data.get('items', []))
        bookmark = data.get('bookmark')
        if not bookmark:
            break
    return items


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_boards() -> list:
    """Return [{id, name}, ...] for the authenticated user's boards."""
    return [
        {'id': b.get('id'), 'name': b.get('name', '')}
        for b in _paginate('/boards')
    ]


def get_board_pins(board_id: str) -> list:
    return _paginate(f'/boards/{board_id}/pins')


def _best_image_url(pin: dict) -> str | None:
    images = (pin.get('media') or {}).get('images') or {}
    if not images:
        return None
    # Pick the size with the largest width.
    best = max(
        images.values(),
        key=lambda img: img.get('width', 0) or 0,
        default=None,
    )
    return best.get('url') if best else None


def sync_board_to_db(board_id: str, created_by=None) -> int:
    """Import pins from *board_id* into Idea rows. Deduped by pinterest_pin_id."""
    from django.core.files.base import ContentFile

    from .importer import _ext_for
    from .models import Idea

    pins = get_board_pins(board_id)
    imported = 0

    for pin in pins:
        pin_id = str(pin.get('id', ''))
        if not pin_id or Idea.objects.filter(pinterest_pin_id=pin_id).exists():
            continue

        image_url = _best_image_url(pin)
        if not image_url:
            continue

        try:
            img_resp = requests.get(image_url, timeout=15)
            img_resp.raise_for_status()
        except requests.RequestException as exc:
            logger.warning('Could not download pin image %s: %s', image_url, exc)
            continue

        ct_header = img_resp.headers.get('Content-Type', 'image/jpeg')
        idea = Idea(
            title=(pin.get('title') or '')[:200],
            description=pin.get('description') or '',
            source=Idea.SOURCE_PINTEREST,
            source_url=pin.get('link') or '',
            pinterest_pin_id=pin_id,
            created_by=created_by,
        )
        idea.image.save(f'pin_{pin_id}{_ext_for(ct_header)}', ContentFile(img_resp.content), save=False)
        idea.save()
        imported += 1

    logger.info('Pinterest sync: imported %d pin(s) from board %s', imported, board_id)
    return imported
