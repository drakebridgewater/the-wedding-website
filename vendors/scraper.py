"""
Background photo scraper for vendor websites.

When a vendor's website URL is saved, this module fetches the page,
extracts og:image / twitter:image meta tags and prominent <img> tags,
downloads each image, and saves them as VendorPhoto objects.

The scrape runs in a daemon thread so it never blocks the API response.
Previously auto-scraped photos (caption='Imported from website') are
replaced whenever the URL changes so the set stays fresh.
"""

import logging
import threading
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

MAX_PHOTOS = 6          # Maximum images to save per vendor
REQUEST_TIMEOUT = 10    # Seconds for each HTTP request
MIN_IMAGE_BYTES = 5_000 # Skip tiny images (icons, tracking pixels, etc.)

SCRAPED_CAPTION = 'Imported from website'

_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/122.0.0.0 Safari/537.36'
    )
}


def launch_scrape(model_class, vendor_id: int, website_url: str) -> None:
    """Start a background daemon thread to scrape photos from *website_url*."""
    if not website_url:
        return
    t = threading.Thread(
        target=_scrape_safe,
        args=(model_class, vendor_id, website_url),
        daemon=True,
    )
    t.start()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _scrape_safe(model_class, vendor_id: int, website_url: str) -> None:
    try:
        _do_scrape(model_class, vendor_id, website_url)
    except Exception:
        logger.exception('Photo scrape failed for %s #%s', model_class.__name__, vendor_id)
    finally:
        # Each thread holds its own DB connection; close it when done.
        from django.db import connection
        connection.close()


def _do_scrape(model_class, vendor_id: int, website_url: str) -> None:
    from django.contrib.contenttypes.models import ContentType
    from .models import VendorPhoto

    # Fetch the vendor page
    try:
        resp = requests.get(website_url, headers=_HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        resp.raise_for_status()
    except requests.RequestException as exc:
        logger.warning('Could not fetch %s: %s', website_url, exc)
        return

    image_urls = _extract_image_urls(resp.text, resp.url)
    if not image_urls:
        logger.info('No images found on %s', website_url)
        return

    ct = ContentType.objects.get_for_model(model_class)

    # Replace previously scraped photos so changing the URL gives fresh results
    VendorPhoto.objects.filter(
        content_type=ct, object_id=vendor_id, caption=SCRAPED_CAPTION,
    ).delete()

    saved = 0
    for img_url in image_urls[:MAX_PHOTOS]:
        try:
            img_resp = requests.get(img_url, headers=_HEADERS, timeout=REQUEST_TIMEOUT)
            img_resp.raise_for_status()

            ct_header = img_resp.headers.get('Content-Type', '')
            if not ct_header.startswith('image/'):
                continue

            data = img_resp.content
            if len(data) < MIN_IMAGE_BYTES:
                continue  # too small; skip icons / tracking pixels

            ext = _ext_for(ct_header)
            filename = f'scraped_{vendor_id}_{saved + 1}{ext}'

            photo = VendorPhoto(
                content_type=ct,
                object_id=vendor_id,
                caption=SCRAPED_CAPTION,
                order=saved,
            )
            photo.image.save(filename, ContentFile(data), save=True)
            saved += 1

        except Exception as exc:
            logger.warning('Could not download %s: %s', img_url, exc)

    logger.info(
        'Scraped %d photo(s) for %s #%s from %s',
        saved, model_class.__name__, vendor_id, website_url,
    )


def _extract_image_urls(html: str, base_url: str) -> list[str]:
    """Return deduplicated, absolute image URLs found in *html*."""
    soup = BeautifulSoup(html, 'html.parser')
    seen: set[str] = set()
    urls: list[str] = []

    def add(raw: str | None) -> None:
        if not raw:
            return
        abs_url = urljoin(base_url, raw.strip())
        parsed = urlparse(abs_url)
        if parsed.scheme not in ('http', 'https'):
            return
        if abs_url not in seen:
            seen.add(abs_url)
            urls.append(abs_url)

    # 1. Open Graph / Twitter Card meta tags (highest quality, intent-chosen)
    for meta in soup.find_all('meta'):
        prop = meta.get('property', '') or meta.get('name', '')
        if prop in ('og:image', 'twitter:image', 'twitter:image:src'):
            add(meta.get('content'))

    # 2. Prominent <img> tags (lazy-load attributes included)
    for img in soup.find_all('img'):
        src = (
            img.get('src')
            or img.get('data-src')
            or img.get('data-lazy-src')
            or img.get('data-original')
        )
        if not src:
            continue
        if src.startswith('data:') or src.endswith('.svg'):
            continue
        add(src)

    return urls


def _ext_for(content_type: str) -> str:
    return {
        'image/jpeg': '.jpg',
        'image/png':  '.png',
        'image/webp': '.webp',
        'image/gif':  '.gif',
        'image/avif': '.avif',
    }.get(content_type.split(';')[0].strip(), '.jpg')
