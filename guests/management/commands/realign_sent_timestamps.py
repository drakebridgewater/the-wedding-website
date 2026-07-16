from django.core.management.base import BaseCommand

from guests.models import Party, SentEmail


class Command(BaseCommand):
    """Repair Party.save_the_date_sent / invitation_sent from the SentEmail log.

    Sends used to stamp these fields with naive server wall-clock time, which
    Django stored as if it were UTC — skewing every stamp by the server's UTC
    offset (and making 'sent' appear after 'opened'). SentEmail.sent_at was
    always recorded correctly, milliseconds after the stamp, so the latest log
    row per purpose is the true send time. Dry run by default; --apply writes.
    """

    help = 'Realign party sent timestamps from the SentEmail log (dry run without --apply).'

    PURPOSE_FIELDS = {
        'save_the_date': 'save_the_date_sent',
        'invitation': 'invitation_sent',
    }

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='Write the corrected timestamps.')

    def handle(self, *args, **options):
        apply_changes = options['apply']
        fixed = 0

        log = (
            SentEmail.objects
            .filter(party__isnull=False, template__purpose__in=self.PURPOSE_FIELDS)
            .select_related('party', 'template')
            .order_by('sent_at')  # later rows win, so each party ends on its latest send
        )

        # (party, field) -> correct time from the latest matching log row
        true_times = {
            (email.party, self.PURPOSE_FIELDS[email.template.purpose]): email.sent_at
            for email in log
        }

        for (party, field), sent_at in sorted(true_times.items(), key=lambda item: item[0][0].name):
            current = getattr(party, field)
            if current == sent_at:
                continue
            if current is None:
                offset = 'was unset'
            else:
                seconds = (current - sent_at).total_seconds()
                offset = 'stamp was {:+.1f}h off'.format(seconds / 3600)
            self.stdout.write(f'{party.name}: {field} {current} -> {sent_at} ({offset})')
            if apply_changes:
                setattr(party, field, sent_at)
                party.save(update_fields=[field])
            fixed += 1

        if fixed == 0:
            self.stdout.write(self.style.SUCCESS('All sent timestamps already match the send log.'))
        elif apply_changes:
            self.stdout.write(self.style.SUCCESS(f'Fixed {fixed} timestamp(s).'))
        else:
            self.stdout.write(f'{fixed} timestamp(s) would change. Re-run with --apply to fix them.')
