import csv
import io
import uuid
from guests.models import Party, Guest
try:
    from StringIO import StringIO
except ImportError:
    from io import StringIO


def import_guests(path):
    with open(path, 'r') as csvfile:
        _import_from_file(csvfile)


def import_guests_from_fileobj(fileobj):
    """Import guests from a file-like object (e.g. an uploaded InMemoryUploadedFile)."""
    text = io.TextIOWrapper(fileobj, encoding='utf-8-sig')
    return _import_from_file(text)


def _import_from_file(fileobj):
    """Read CSV rows and upsert Party/Guest records. Returns a stats dict."""
    reader = csv.reader(fileobj, delimiter=',')
    parties_created = 0
    parties_updated = 0
    guests_created = 0
    guests_updated = 0
    skipped = 0

    first_row = True
    for row in reader:
        if first_row:
            first_row = False
            continue
        if len(row) < 8:
            skipped += 1
            continue
        party_name, first_name, last_name, party_type, is_child, category, is_invited, email = row[:8]
        if not party_name:
            skipped += 1
            continue
        party, p_created = Party.objects.get_or_create(name=party_name)
        party.type = party_type
        party.category = category
        party.status = 'invited' if _is_true(is_invited) else 'planned'
        if not party.invitation_id:
            party.invitation_id = uuid.uuid4().hex
        party.save()
        if p_created:
            parties_created += 1
        else:
            parties_updated += 1

        if email:
            guest, g_created = Guest.objects.get_or_create(party=party, email=email)
            guest.first_name = first_name
            guest.last_name = last_name
        else:
            guest, g_created = Guest.objects.get_or_create(
                party=party, first_name=first_name, last_name=last_name,
            )
        guest.is_child = _is_true(is_child)
        guest.save()
        if g_created:
            guests_created += 1
        else:
            guests_updated += 1

    return {
        'parties_created': parties_created,
        'parties_updated': parties_updated,
        'guests_created': guests_created,
        'guests_updated': guests_updated,
        'skipped': skipped,
    }


def export_guests():
    headers = [
        'party_name', 'first_name', 'last_name', 'party_type',
        'is_child', 'category', 'status', 'is_attending',
        'rehearsal_dinner', 'meal', 'email', 'comments'
    ]
    file = io.StringIO()
    writer = csv.writer(file)
    writer.writerow(headers)
    for party in Party.in_default_order():
        for guest in party.guest_set.all():
            if guest.is_attending:
                writer.writerow([
                    party.name,
                    guest.first_name,
                    guest.last_name,
                    party.type,
                    guest.is_child,
                    party.category,
                    party.status,
                    guest.is_attending,
                    party.rehearsal_dinner,
                    guest.meal,
                    guest.email,
                    party.comments,
                ])
    return file


def _is_true(value):
    value = value or ''
    return value.lower() in ('y', 'yes', 't', 'true', '1')
