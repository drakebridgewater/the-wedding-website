"""
One-time TickTick OAuth2 setup.

Run this once to authenticate and save the OAuth token:

    .venv/bin/python manage.py ticktick_auth

A browser will open asking you to approve access. After approving, copy the
full redirect URL from the browser address bar and paste it into the console.

The token is saved to TICKTICK_TOKEN_PATH (default: .token-oauth in project root).
Re-run this command when the token expires.

IMPORTANT: Add .token-oauth to your .gitignore — it contains sensitive credentials.
"""
import webbrowser
from urllib.parse import urlparse, parse_qs

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Complete the one-time TickTick OAuth2 authentication flow'

    def handle(self, *args, **options):
        from planning.ticktick_client import (
            get_authorization_url, exchange_code_for_token, get_projects, _get_config,
        )

        cfg = _get_config()
        if not cfg['client_id']:
            self.stderr.write(self.style.ERROR(
                'TICKTICK_CLIENT_ID is not set. '
                'Add it to settings or via Admin → TickTick Settings.'
            ))
            return

        auth_url = get_authorization_url()
        self.stdout.write('Opening browser for TickTick authorization...')
        self.stdout.write(f'\nIf the browser does not open, visit:\n  {auth_url}\n')
        webbrowser.open(auth_url)

        redirect_url = input(
            'After approving, paste the full redirect URL from your browser address bar:\n> '
        ).strip()

        # Extract the authorization code from the redirect URL
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

        token_path = cfg['token_path']
        self.stdout.write(self.style.SUCCESS(f'\nToken saved to: {token_path}'))
        self.stdout.write(self.style.WARNING(f'Add to .gitignore: {token_path}'))

        self.stdout.write('\nFetching projects to verify connection...')
        try:
            projects = get_projects()
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Could not fetch projects: {e}'))
            return

        self.stdout.write('\nAvailable TickTick projects:')
        project_name = cfg['project_name'].lower()
        for project in projects:
            marker = ' <-- match' if project.get('name', '').lower() == project_name else ''
            self.stdout.write(f"  [{project['id']}] {project.get('name', '(unnamed)')}{marker}")

        self.stdout.write(
            f'\nCurrent TICKTICK_PROJECT_NAME = "{cfg["project_name"]}"'
        )
        self.stdout.write(self.style.SUCCESS('Done! TickTick is ready.'))
