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
    """Import guests from a file-like object. Auto-detects native vs Google Contacts format."""
    text = io.TextIOWrapper(fileobj, encoding='utf-8-sig')
    return _import_from_file(text)


def _detect_format(headers):
    """Return 'google_contacts' or 'native' based on the header row."""
    header_set = {h.strip() for h in headers}
    google_indicators = {'Given Name', 'Family Name', 'First Name', 'Last Name', 'E-mail 1 - Value'}
    if header_set & google_indicators:
        return 'google_contacts'
    return 'native'


def _import_from_file(fileobj):
    """Read CSV rows, auto-detect format, and upsert Party/Guest records."""
    reader = csv.reader(fileobj, delimiter=',')
    headers = next(reader, None)
    if headers is None:
        return {'parties_created': 0, 'parties_updated': 0,
                'guests_created': 0, 'guests_updated': 0, 'skipped': 0}

    fmt = _detect_format(headers)
    if fmt == 'google_contacts':
        return _import_google_contacts(reader, headers)
    return _import_native(reader, headers)


def _import_native(reader, headers):
    """Import from native format. Required: first_name, last_name.
    Optional: party_name, party_type, is_child, category, is_invited, email.
    party_name and party_type are not expected to come from Google exports — rows
    without a party_name are imported as unassigned guests.
    """
    col = {h.strip(): i for i, h in enumerate(headers)}

    def get(row, name, default=''):
        idx = col.get(name)
        if idx is None or idx >= len(row):
            return default
        return row[idx].strip()

    parties_created = 0
    parties_updated = 0
    guests_created = 0
    guests_updated = 0
    skipped = 0

    for row in reader:
        first_name = get(row, 'first_name')
        last_name = get(row, 'last_name')
        if not first_name and not last_name:
            skipped += 1
            continue

        party_name = get(row, 'party_name')
        party_type = get(row, 'party_type') or 'formal'
        is_child = get(row, 'is_child')
        category = get(row, 'category')
        is_invited = get(row, 'is_invited')
        email = get(row, 'email')

        party = None
        if party_name:
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
        # else: party is None → unassigned guest

        if email:
            if party:
                guest, g_created = Guest.objects.get_or_create(party=party, email=email)
            else:
                existing = Guest.objects.filter(email=email).first()
                if existing:
                    guest, g_created = existing, False
                else:
                    guest = Guest(email=email, party=None)
                    g_created = True
            guest.first_name = first_name
            guest.last_name = last_name
        else:
            if party:
                guest, g_created = Guest.objects.get_or_create(
                    party=party, first_name=first_name, last_name=last_name,
                )
            else:
                existing = Guest.objects.filter(
                    first_name=first_name, last_name=last_name, party__isnull=True
                ).first()
                if existing:
                    guest, g_created = existing, False
                else:
                    guest = Guest(first_name=first_name, last_name=last_name, party=None)
                    g_created = True

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


def _import_google_contacts(reader, headers):
    """
    Import from Google Contacts CSV export.
    Guests are created without a party — assign them to parties from the UI.
    """
    guests_created = 0
    guests_updated = 0
    skipped = 0

    col = {h.strip(): i for i, h in enumerate(headers)}

    def get(row, col_name):
        idx = col.get(col_name)
        if idx is None or idx >= len(row):
            return ''
        return row[idx].strip()

    for row in reader:
        if not row or all(c == '' for c in row):
            continue

        first_name = get(row, 'Given Name') or get(row, 'First Name')
        last_name = get(row, 'Family Name') or get(row, 'Last Name')

        # Fall back to splitting the full Name field
        if not first_name and not last_name:
            full = get(row, 'Name')
            if not full:
                skipped += 1
                continue
            parts = full.split(' ', 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ''

        # Find primary email (try columns E-mail 1 through E-mail 3)
        email = ''
        for n in range(1, 4):
            email = get(row, f'E-mail {n} - Value')
            if email:
                break

        # Upsert: match by email first, then by name among unassigned guests
        if email:
            existing = Guest.objects.filter(email=email).first()
            if existing:
                existing.first_name = first_name
                existing.last_name = last_name
                existing.save(update_fields=['first_name', 'last_name'])
                guests_updated += 1
            else:
                Guest.objects.create(first_name=first_name, last_name=last_name, email=email, party=None)
                guests_created += 1
        else:
            existing = Guest.objects.filter(
                first_name=first_name, last_name=last_name, party__isnull=True
            ).first()
            if existing:
                guests_updated += 1
            else:
                Guest.objects.create(first_name=first_name, last_name=last_name, party=None)
                guests_created += 1

    return {
        'parties_created': 0,
        'parties_updated': 0,
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
