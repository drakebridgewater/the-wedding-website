from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Sync all wedding data to Google Sheets'

    def add_arguments(self, parser):
        parser.add_argument(
            '--spreadsheet',
            default=None,
            metavar='TITLE',
            help='Spreadsheet title to sync to (overrides settings.GOOGLE_SPREADSHEET_TITLE)',
        )

    def handle(self, *args, **options):
        from drive_sync.service import sync_all

        self.stdout.write('Syncing to Google Sheets…\n')

        def progress(sheet_name, row_count):
            self.stdout.write(f'  ✓  {sheet_name:<28} {row_count} rows')

        try:
            url = sync_all(
                spreadsheet_name=options.get('spreadsheet'),
                progress=progress,
            )
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f'\nSync failed: {exc}'))
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS(f'\nDone!  {url}'))
