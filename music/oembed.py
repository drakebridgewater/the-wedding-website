import requests


def fetch_metadata(url: str) -> dict:
    """Fetch song metadata from a share URL via oEmbed. Returns dict with
    title, artist, thumbnail_url, source. Gracefully returns empty dict on error."""
    url = url.strip()

    if 'youtube.com' in url or 'youtu.be' in url:
        return _fetch_youtube(url)
    elif 'spotify.com' in url:
        return _fetch_spotify(url)
    elif 'soundcloud.com' in url:
        return _fetch_soundcloud(url)
    else:
        return {'title': '', 'artist': '', 'thumbnail_url': '', 'source': 'other'}


def _fetch_youtube(url: str) -> dict:
    try:
        r = requests.get(
            'https://www.youtube.com/oembed',
            params={'url': url, 'format': 'json'},
            timeout=5,
        )
        r.raise_for_status()
        data = r.json()
        return {
            'title': data.get('title', ''),
            'artist': data.get('author_name', ''),
            'thumbnail_url': data.get('thumbnail_url', ''),
            'source': 'youtube',
        }
    except Exception:
        return {'title': '', 'artist': '', 'thumbnail_url': '', 'source': 'youtube'}


def _fetch_spotify(url: str) -> dict:
    try:
        r = requests.get(
            'https://open.spotify.com/oembed',
            params={'url': url},
            timeout=5,
        )
        r.raise_for_status()
        data = r.json()
        # Spotify title format is usually "Song Title" or "Song Title · Artist"
        title = data.get('title', '')
        artist = ''
        if ' · ' in title:
            parts = title.split(' · ', 1)
            title, artist = parts[0], parts[1]
        return {
            'title': title,
            'artist': artist,
            'thumbnail_url': data.get('thumbnail_url', ''),
            'source': 'spotify',
        }
    except Exception:
        return {'title': '', 'artist': '', 'thumbnail_url': '', 'source': 'spotify'}


def _fetch_soundcloud(url: str) -> dict:
    try:
        r = requests.get(
            'https://soundcloud.com/oembed',
            params={'url': url, 'format': 'json'},
            timeout=5,
        )
        r.raise_for_status()
        data = r.json()
        return {
            'title': data.get('title', ''),
            'artist': data.get('author_name', ''),
            'thumbnail_url': data.get('thumbnail_url', ''),
            'source': 'soundcloud',
        }
    except Exception:
        return {'title': '', 'artist': '', 'thumbnail_url': '', 'source': 'soundcloud'}
