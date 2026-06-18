"""
Create an Idea from a pasted web/Pinterest-pin URL.

Fetches the page, reads its Open Graph / Twitter Card meta tags
(og:image / og:title / og:description), downloads the chosen image, and
returns a saved Idea. Pinterest *pin* pages expose og:image, so a pasted
pin link works here without any API access.

Mirrors the download-to-ContentFile approach in vendors/scraper.py.
"""

import logging
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 10
MIN_IMAGE_BYTES = 2_000

_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/122.0.0.0 Safari/537.36'
    )
}

_EXT_BY_CT = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
}


def _ext_for(content_type: str) -> str:
    return _EXT_BY_CT.get(content_type.split(';')[0].strip(), '.jpg')


def _is_image_url(url: str) -> bool:
    path = urlparse(url).path.lower()
    return path.endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'))


def fetch_idea_from_url(url: str, created_by=None):
    """
    Build (but do not yet save tags for) an Idea from *url*.

    Returns a saved Idea instance, or None if no usable image was found.
    """
    from .models import Idea

    title = ''
    description = ''
    image_url = url if _is_image_url(url) else ''

    if not image_url:
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            resp.raise_for_status()
        except requests.RequestException as exc:
            logger.warning('Could not fetch %s: %s', url, exc)
            return None

        soup = BeautifulSoup(resp.text, 'html.parser')
        image_url = _meta(soup, ('og:image', 'twitter:image', 'twitter:image:src'))
        if image_url:
            image_url = urljoin(resp.url, image_url)
        title = _meta(soup, ('og:title', 'twitter:title')) or (soup.title.string.strip() if soup.title and soup.title.string else '')
        description = _meta(soup, ('og:description', 'twitter:description', 'description'))

    if not image_url:
        logger.info('No og:image found on %s', url)
        return None

    try:
        img_resp = requests.get(image_url, headers=_HEADERS, timeout=REQUEST_TIMEOUT)
        img_resp.raise_for_status()
    except requests.RequestException as exc:
        logger.warning('Could not download image %s: %s', image_url, exc)
        return None

    ct_header = img_resp.headers.get('Content-Type', '')
    if not ct_header.startswith('image/'):
        logger.info('URL %s did not return an image (%s)', image_url, ct_header)
        return None

    data = img_resp.content
    if len(data) < MIN_IMAGE_BYTES:
        return None

    idea = Idea(
        title=title[:200],
        description=description,
        source=Idea.SOURCE_URL,
        source_url=url,
        created_by=created_by,
    )
    filename = f'idea_url{_ext_for(ct_header)}'
    idea.image.save(filename, ContentFile(data), save=False)
    idea.save()
    return idea


def _meta(soup, keys) -> str:
    for meta in soup.find_all('meta'):
        prop = meta.get('property', '') or meta.get('name', '')
        if prop in keys:
            content = meta.get('content')
            if content:
                return content.strip()
    return ''
