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

        def progress(sheet_name, result):
            icon = '✓' if result['success'] else '✗'
            rows = result.get('rows', 0)
            self.stdout.write(f'  {icon}  {sheet_name:<28} {rows} rows')
            if not result['success']:
                self.stderr.write(f'      Error: {result.get("error", "")}')

        try:
            url, results = sync_all(
                spreadsheet_name=options.get('spreadsheet'),
                progress=progress,
            )
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f'\nSync failed: {exc}'))
            raise SystemExit(1)

        failures = [r for r in results if not r['success']]
        if failures:
            self.stdout.write(self.style.WARNING(f'\nDone with {len(failures)} error(s).  {url}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\nDone!  {url}'))
