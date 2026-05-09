"""
Verify the Todoist API token and dump useful IDs.

Run after setting TODOIST_API_TOKEN (in env, settings, or via Admin →
Todoist Settings):

    .venv/bin/python manage.py todoist_setup

It will:
  1. Confirm the token works by fetching projects.
  2. Highlight the project that matches TODOIST_PROJECT_NAME.
  3. List collaborators on the matched project so you can copy their IDs
     into TODOIST_DRAKE_ASSIGNEE / TODOIST_SHAWNA_ASSIGNEE.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Verify the Todoist token and list project / collaborator IDs.'

    def handle(self, *args, **options):
        from todos.todoist_client import (
            _get_config, get_projects, get_collaborators,
        )

        cfg = _get_config()
        if not cfg['api_token']:
            self.stderr.write(self.style.ERROR(
                'TODOIST_API_TOKEN is not set. Add it to settings, the .env file, '
                'or via Admin → Todoist Settings.'
            ))
            return

        self.stdout.write('Fetching projects...')
        try:
            projects = get_projects()
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Could not fetch projects: {e}'))
            return

        target_name = cfg['project_name'].lower()
        match = None

        self.stdout.write('\nAvailable Todoist projects:')
        for project in projects:
            is_match = project.get('name', '').lower() == target_name
            marker = ' <-- match' if is_match else ''
            self.stdout.write(f"  [{project['id']}] {project.get('name', '(unnamed)')}{marker}")
            if is_match:
                match = project

        self.stdout.write(f'\nCurrent TODOIST_PROJECT_NAME = "{cfg["project_name"]}"')

        if match is None:
            self.stderr.write(self.style.WARNING(
                f'\nNo Todoist project matches "{cfg["project_name"]}". '
                'Either rename one in Todoist or update TODOIST_PROJECT_NAME.'
            ))
            return

        self.stdout.write('\nCollaborators on the matched project:')
        try:
            collaborators = get_collaborators(str(match['id']))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Could not fetch collaborators: {e}'))
            return

        if not collaborators:
            self.stdout.write(self.style.WARNING(
                '  (no collaborators — the project is not shared)'
            ))
        else:
            for c in collaborators:
                self.stdout.write(
                    f"  [{c.get('id')}] {c.get('name', '(no name)')} "
                    f"<{c.get('email', '')}>"
                )

        self.stdout.write(self.style.SUCCESS('\nDone! Todoist is ready.'))
