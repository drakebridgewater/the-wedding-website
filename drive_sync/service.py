"""
Google Sheets sync service.

Setup
-----
1. Create a Google Cloud project and enable the Sheets + Drive APIs.
2. Create a Service Account, download its JSON key file.
3. Place the key file at the path in settings.GOOGLE_CREDENTIALS_FILE
   (default: <project-root>/.google-credentials.json).
4. Share the target spreadsheet with the service account email address
   (the email is inside the credentials JSON under "client_email").
5. Run: python manage.py sync_to_drive
"""

import logging
from datetime import date, datetime

import gspread
from django.conf import settings

log = logging.getLogger(__name__)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _money(m):
    """MoneyField → float, or '' if None."""
    if m is None:
        return ''
    return float(m.amount) if hasattr(m, 'amount') else ''


def _bool(v):
    return 'Yes' if v else 'No'


def _yn_null(v):
    """True/False/None → Yes / No / (blank)"""
    if v is True:
        return 'Yes'
    if v is False:
        return 'No'
    return ''


def _dt(v):
    if v is None:
        return ''
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return str(v)


def _cell(v):
    """Convert a value to a gspread-safe type (str / int / float / '')."""
    if v is None:
        return ''
    if isinstance(v, bool):
        return 'Yes' if v else 'No'
    if isinstance(v, (int, float)):
        return v
    return str(v)


# ── Spreadsheet helpers ───────────────────────────────────────────────────────

def _get_spreadsheet(spreadsheet_name=None):
    creds_file = getattr(settings, 'GOOGLE_CREDENTIALS_FILE', None)
    if not creds_file:
        raise RuntimeError(
            'GOOGLE_CREDENTIALS_FILE is not configured in settings. '
            'Point it at your service account JSON key file.'
        )

    title = spreadsheet_name or getattr(settings, 'GOOGLE_SPREADSHEET_TITLE', 'Wedding Planning')
    gc = gspread.service_account(filename=creds_file)

    try:
        sh = gc.open(title)
    except gspread.SpreadsheetNotFound:
        sh = gc.create(title)
        log.info('Created new spreadsheet: %s', title)

    return sh


def _write_sheet(sh, title, headers, rows, *, freeze_rows=1):
    """Upsert a named worksheet: create if missing, clear and rewrite."""
    try:
        ws = sh.worksheet(title)
        ws.clear()
    except gspread.WorksheetNotFound:
        ws = sh.add_worksheet(
            title=title,
            rows=max(len(rows) + 10, 30),
            cols=max(len(headers) + 2, 10),
        )

    data = [headers] + [[_cell(c) for c in row] for row in rows]
    if data:
        ws.update(values=data, range_name='A1')

    # Bold + light-grey header row
    end_col = chr(ord('A') + len(headers) - 1)
    ws.format(f'A1:{end_col}1', {
        'textFormat': {'bold': True},
        'backgroundColor': {'red': 0.93, 'green': 0.93, 'blue': 0.93},
    })

    if freeze_rows:
        ws.freeze(rows=freeze_rows)

    return ws


# ── Top-level entry point ─────────────────────────────────────────────────────

def sync_all(spreadsheet_name=None, progress=None):
    """
    Sync all wedding data to Google Sheets.

    Args:
        spreadsheet_name: Override the spreadsheet title from settings.
        progress: Optional callable(sheet_name, row_count) for status output.

    Returns:
        URL of the spreadsheet.
    """
    sh = _get_spreadsheet(spreadsheet_name)

    sheets = [
        ('Summary',               _rows_summary),
        ('Guests',                _rows_guests),
        ('Parties',               _rows_parties),
        ('Wedding Party',         _rows_wedding_party),
        ('Budget',                _rows_budget),
        ('Expenses',              _rows_expenses),
        ('Schedule',              _rows_schedule),
        ('Seating Tables',        _rows_seating),
        ('Music — Playlist',      _rows_music_playlist),
        ('Music — Do Not Play',   _rows_music_dnp),
        ('Venues',                _rows_venues),
        ('Caterers',              _rows_caterers),
        ('Cakes',                 _rows_cakes),
        ('Florists',              _rows_florists),
        ('Entertainment',         _rows_entertainment),
    ]

    results = []
    for title, fn in sheets:
        try:
            headers, rows = fn()
            _write_sheet(sh, title, headers, rows)
            results.append({'title': title, 'rows': len(rows), 'success': True})
        except Exception as exc:
            log.exception('Failed to sync sheet: %s', title)
            results.append({'title': title, 'rows': 0, 'success': False, 'error': str(exc)})
        if progress:
            progress(title, results[-1])

    # Remove the default blank sheet Google creates on new spreadsheets
    try:
        sh.del_worksheet(sh.worksheet('Sheet1'))
    except gspread.WorksheetNotFound:
        pass

    return sh.url, results


# ── Summary ───────────────────────────────────────────────────────────────────

def _rows_summary():
    from guests.models import Guest, Party
    from budget.models import BudgetLineItem

    total_guests = Guest.objects.count()
    attending = Guest.objects.filter(is_attending=True).count()
    not_attending = Guest.objects.filter(is_attending=False).count()
    no_response = Guest.objects.filter(is_attending__isnull=True).count()

    total_parties = Party.objects.count()
    invited_parties = Party.objects.filter(status='invited').count()

    budget_items = list(BudgetLineItem.objects.all())
    est_total = sum(_money(i.estimated_cost) for i in budget_items if i.estimated_cost)
    actual_total = sum(_money(i.actual_cost) for i in budget_items if i.actual_cost)
    paid_total = sum(
        _money(i.actual_cost)
        for i in budget_items
        if i.is_paid and i.actual_cost
    )

    headers = ['Metric', 'Value']
    rows = [
        ['Last synced', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
        ['', ''],
        ['── Guests ──', ''],
        ['Total guests', total_guests],
        ['Attending', attending],
        ['Not attending', not_attending],
        ['No response', no_response],
        ['Total parties', total_parties],
        ['Invited parties', invited_parties],
        ['', ''],
        ['── Budget ──', ''],
        ['Total estimated ($)', est_total],
        ['Total actual ($)', actual_total],
        ['Total paid ($)', paid_total],
    ]
    return headers, rows


# ── Guests ────────────────────────────────────────────────────────────────────

def _rows_guests():
    from guests.models import Guest

    headers = [
        'ID', 'First Name', 'Last Name', 'Email',
        'Party', 'Party Type', 'Party Category',
        'Attending', 'Meal', 'Is Child',
        'Seating Table', 'Seat Color', 'Wedding Party Role',
    ]
    rows = []
    qs = Guest.objects.select_related(
        'party', 'seating_table', 'wedding_party_info',
    ).order_by('party__name', 'last_name', 'first_name')

    for g in qs:
        wp = getattr(g, 'wedding_party_info', None)
        rows.append([
            g.id,
            g.first_name,
            g.last_name or '',
            g.email or '',
            g.party.name,
            g.party.get_type_display() if g.party.type else '',
            g.party.category or '',
            _yn_null(g.is_attending),
            g.get_meal_display() if g.meal else '',
            _bool(g.is_child),
            g.seating_table.name if g.seating_table else '',
            g.seat_color or '',
            wp.get_role_display() if wp else '',
        ])
    return headers, rows


# ── Parties ───────────────────────────────────────────────────────────────────

def _rows_parties():
    from guests.models import Party

    headers = [
        'ID', 'Name', 'Type', 'Category',
        'Invited', 'Attending', 'Rehearsal Dinner',
        'Guest Count', 'Attending Count',
        'Save-the-Date Sent', 'Save-the-Date Opened',
        'Invitation Sent', 'Invitation Opened',
        'Comments',
    ]
    rows = []
    for p in Party.in_default_order().prefetch_related('guest_set'):
        guests = list(p.guest_set.all())
        attending_count = sum(1 for g in guests if g.is_attending is True)
        rows.append([
            p.id,
            p.name,
            p.get_type_display() if p.type else '',
            p.category or '',
            _bool(p.is_invited),
            _yn_null(p.is_attending),
            _bool(p.rehearsal_dinner),
            len(guests),
            attending_count,
            _dt(p.save_the_date_sent),
            _dt(p.save_the_date_opened),
            _dt(p.invitation_sent),
            _dt(p.invitation_opened),
            p.comments or '',
        ])
    return headers, rows


# ── Wedding Party ─────────────────────────────────────────────────────────────

def _rows_wedding_party():
    from guests.models import WeddingPartyMember

    headers = [
        'ID', 'Name', 'Role', 'Email', 'Phone', 'Order',
        'Color', 'Linked Guest ID', 'Linked Guest Email', 'Groups',
    ]
    rows = []
    qs = WeddingPartyMember.objects.select_related('guest').prefetch_related('groups').order_by('order', 'name')

    for m in qs:
        groups = ', '.join(g.name for g in m.groups.all())
        rows.append([
            m.id,
            m.name,
            m.get_role_display(),
            m.email or '',
            m.phone or '',
            m.order,
            m.color,
            m.guest_id or '',
            m.guest.email if m.guest else '',
            groups,
        ])
    return headers, rows


# ── Budget ────────────────────────────────────────────────────────────────────

def _rows_budget():
    from budget.models import BudgetCategory, BudgetLineItem

    cat_labels = dict(BudgetCategory.objects.values_list('slug', 'label'))

    headers = [
        'ID', 'Category', 'Description',
        'Estimated ($)', 'Actual ($)',
        'Vendor', 'Paid', 'Notes',
    ]
    rows = []
    for item in BudgetLineItem.objects.all():
        rows.append([
            item.id,
            cat_labels.get(item.category, item.category),
            item.description,
            _money(item.estimated_cost),
            _money(item.actual_cost),
            item.vendor_name or '',
            _bool(item.is_paid),
            item.notes or '',
        ])
    return headers, rows


def _rows_expenses():
    from budget.models import BudgetCategory, Expense

    cat_labels = dict(BudgetCategory.objects.values_list('slug', 'label'))

    headers = [
        'ID', 'Budget Category', 'Budget Item',
        'Amount ($)', 'Description', 'Paid On', 'Notes',
    ]
    rows = []
    qs = Expense.objects.select_related('budget_item').order_by(
        'budget_item__category', '-paid_on',
    )
    for e in qs:
        rows.append([
            e.id,
            cat_labels.get(e.budget_item.category, e.budget_item.category),
            e.budget_item.description,
            _money(e.amount),
            e.description,
            _dt(e.paid_on),
            e.notes or '',
        ])
    return headers, rows


# ── Schedule ──────────────────────────────────────────────────────────────────

def _rows_schedule():
    from schedule.models import ScheduleEvent

    headers = [
        'ID', 'Day', 'Date',
        'Start Time', 'Duration (min)',
        'Name', 'Location', 'Category',
        'Public', 'Attendees', 'Notes',
    ]
    rows = []
    qs = ScheduleEvent.objects.select_related('day').prefetch_related('attendees').order_by(
        'day__order', 'day__date', 'start_time',
    )
    for e in qs:
        attendees = ', '.join(a.name for a in e.attendees.all())
        rows.append([
            e.id,
            e.day.label,
            _dt(e.day.date),
            e.start_time.strftime('%H:%M'),
            e.duration_minutes,
            e.name,
            e.location or '',
            e.get_category_display(),
            _bool(e.is_public),
            attendees,
            e.notes or '',
        ])
    return headers, rows


# ── Seating ───────────────────────────────────────────────────────────────────

def _rows_seating():
    from seating.models import SeatingTable

    headers = [
        'ID', 'Table Name', 'Shape', 'Capacity',
        'Grid X', 'Grid Y', 'Width (cells)', 'Height (cells)',
        'Assigned', 'Guests', 'Notes',
    ]
    rows = []
    for t in SeatingTable.objects.prefetch_related('guests').order_by('name'):
        guests = list(t.guests.all())
        guest_names = ', '.join(
            f'{g.first_name} {g.last_name or ""}'.strip() for g in guests
        )
        rows.append([
            t.id,
            t.name,
            t.shape.capitalize(),
            t.capacity,
            t.grid_x,
            t.grid_y,
            t.grid_width,
            t.grid_height,
            len(guests),
            guest_names,
            t.notes or '',
        ])
    return headers, rows


# ── Music ─────────────────────────────────────────────────────────────────────

def _rows_music_playlist():
    from music.models import Song
    return _rows_songs(Song.LIST_PLAYLIST)


def _rows_music_dnp():
    from music.models import Song
    return _rows_songs(Song.LIST_DO_NOT_PLAY)


def _rows_songs(list_type):
    from music.models import Song

    headers = ['ID', 'Moment', 'Title', 'Artist', 'Source', 'URL', 'Notes']
    rows = []
    qs = Song.objects.filter(list_type=list_type).order_by('moment', 'order', 'created_at')
    for s in qs:
        rows.append([
            s.id,
            s.get_moment_display(),
            s.title,
            s.artist or '',
            s.source or '',
            s.url or '',
            s.notes or '',
        ])
    return headers, rows


# ── Vendors (shared base) ─────────────────────────────────────────────────────

_VENDOR_BASE_HEADERS = [
    'ID', 'Name', 'Website', 'Phone', 'Email',
    'Chosen', 'Favorite', 'Talked To', 'Visited',
    'Price Estimate ($)', 'Rating', 'Address',
    'Positives', 'Negatives', 'Comments',
]


def _base_vendor_row(v):
    return [
        v.id,
        v.name,
        v.website or '',
        v.phone or '',
        v.email or '',
        _bool(v.is_chosen),
        _bool(v.is_favorite),
        _bool(v.has_talked_to),
        _bool(v.has_visited),
        _money(v.price_estimate),
        v.rating or '',
        v.address or '',
        v.positives or '',
        v.negatives or '',
        v.comments or '',
    ]


def _rows_venues():
    from vendors.models import VenueOption

    headers = _VENDOR_BASE_HEADERS + [
        'Capacity', 'Style',
        'Parking', 'Catering Included', 'Accommodation Nearby',
        'Indoor', 'Outdoor',
    ]
    rows = [
        _base_vendor_row(v) + [
            v.capacity or '',
            v.get_style_display() if v.style else '',
            _bool(v.has_parking),
            _bool(v.catering_included),
            _bool(v.accommodation_nearby),
            _bool(v.is_indoor),
            _bool(v.is_outdoor),
        ]
        for v in VenueOption.objects.all()
    ]
    return headers, rows


def _rows_caterers():
    from vendors.models import CatererOption

    headers = _VENDOR_BASE_HEADERS + [
        'Price/Head ($)', 'Cuisine',
        'Vegetarian', 'Vegan', 'Gluten-Free',
        'Tasting Scheduled', 'Tasting Done',
    ]
    rows = [
        _base_vendor_row(v) + [
            _money(v.price_per_head),
            v.get_cuisine_type_display() if v.cuisine_type else '',
            _bool(v.has_vegetarian),
            _bool(v.has_vegan),
            _bool(v.has_gluten_free),
            _bool(v.tasting_scheduled),
            _bool(v.tasting_completed),
        ]
        for v in CatererOption.objects.all()
    ]
    return headers, rows


def _rows_cakes():
    from vendors.models import CakeOption

    headers = _VENDOR_BASE_HEADERS + [
        'Price/Serving ($)', 'Flavors',
        'Custom Design', 'Tasting Scheduled', 'Tasting Done',
    ]
    rows = [
        _base_vendor_row(v) + [
            _money(v.price_per_serving),
            v.flavors or '',
            _bool(v.custom_design_available),
            _bool(v.tasting_scheduled),
            _bool(v.tasting_completed),
        ]
        for v in CakeOption.objects.all()
    ]
    return headers, rows


def _rows_florists():
    from vendors.models import FloristOption

    headers = _VENDOR_BASE_HEADERS + [
        'Arrangement Types', 'Style', 'Minimum Order ($)',
    ]
    rows = [
        _base_vendor_row(v) + [
            v.arrangement_types or '',
            v.get_style_display() if v.style else '',
            _money(v.minimum_order),
        ]
        for v in FloristOption.objects.all()
    ]
    return headers, rows


def _rows_entertainment():
    from vendors.models import EntertainmentOption

    headers = _VENDOR_BASE_HEADERS + [
        'Type', 'Members', 'Genres',
        'Package Details', 'Sample Link', 'Duration (hrs)',
    ]
    rows = [
        _base_vendor_row(v) + [
            v.get_type_display() if v.type else '',
            v.num_members or '',
            v.genres or '',
            v.package_details or '',
            v.sample_link or '',
            float(v.performance_duration_hours) if v.performance_duration_hours else '',
        ]
        for v in EntertainmentOption.objects.all()
    ]
    return headers, rows
