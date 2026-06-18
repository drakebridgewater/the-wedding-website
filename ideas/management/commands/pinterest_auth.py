"""
One-time Pinterest OAuth2 setup.

Run this once to authenticate and save the OAuth token:

    .venv/bin/python manage.py pinterest_auth

A browser will open asking you to approve access. After approving, copy the
full redirect URL from the browser address bar and paste it into the console.

The token is saved to PINTEREST_TOKEN_PATH (default: .pinterest-token).
Re-run this command if the refresh token ever expires.

IMPORTANT: .pinterest-token contains sensitive credentials — keep it gitignored.
"""
import webbrowser
from urllib.parse import urlparse, parse_qs

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Complete the one-time Pinterest OAuth2 authentication flow'

    def handle(self, *args, **options):
        from ideas.pinterest_client import (
            get_authorization_url, exchange_code_for_token, get_boards, _get_config,
        )

        cfg = _get_config()
        if not cfg['client_id']:
            self.stderr.write(self.style.ERROR(
                'PINTEREST_CLIENT_ID is not set. Add it to your settings/.env first.'
            ))
            return

        auth_url = get_authorization_url()
        self.stdout.write('Opening browser for Pinterest authorization...')
        self.stdout.write(f'\nIf the browser does not open, visit:\n  {auth_url}\n')
        webbrowser.open(auth_url)

        redirect_url = input(
            'After approving, paste the full redirect URL from your browser address bar:\n> '
        ).strip()

        parsed = urlparse(redirect_url)
        code = parse_qs(parsed.query).get('code', [''])[0]
        if not code:
            self.stderr.write(self.style.ERROR(
                f'Could not find "code" in the URL: {redirect_url}'
            ))
            return

        try:
            exchange_code_for_token(code)
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Token exchange failed: {e}'))
            return

        self.stdout.write(self.style.SUCCESS(f'\nToken saved to: {cfg["token_path"]}'))

        self.stdout.write('\nFetching boards to verify connection...')
        try:
            boards = get_boards()
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Could not fetch boards: {e}'))
            return

        self.stdout.write('\nAvailable Pinterest boards (set PINTEREST_BOARD_ID to one of these):')
        for board in boards:
            self.stdout.write(f"  [{board['id']}] {board['name']}")

        self.stdout.write(self.style.SUCCESS('\nDone! Pinterest is ready.'))
