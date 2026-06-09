from datetime import date
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from django.shortcuts import render
from django.urls import reverse


@login_required
def dashboard(request):
    from guests.models import Guest, Party
    from vendors.models import VenueOption, CatererOption, CakeOption, FloristOption, EntertainmentOption
    from budget.models import BudgetLineItem
    from seating.models import SeatingTable
    from music.models import Song
    from todos.models import Task
    from wedding.models import WeddingSettings

    wedding = WeddingSettings.get()
    today = date.today()

    rsvp_deadline = wedding.rsvp_deadline
    rsvp_days_remaining = (rsvp_deadline - today).days if rsvp_deadline else None
    rsvp_overdue = bool(rsvp_deadline and today > rsvp_deadline)

    # --- Pipeline / milestone checks ---
    from django.db.models import Exists, OuterRef
    from guests.models import Guest as _Guest
    _has_email = _Guest.objects.filter(party=OuterRef('pk'), email__isnull=False).exclude(email='')
    # "done" only when no invited party with an email address is still unsent
    save_the_dates_sent = not Party.objects.filter(
        status='invited', save_the_date_sent__isnull=True
    ).filter(Exists(_has_email)).exists()
    invitations_sent = not Party.objects.filter(
        status='invited', invitation_sent__isnull=True
    ).filter(Exists(_has_email)).exists()

    checks = [
        {
            'label': 'Venue',
            'done': VenueOption.objects.filter(is_chosen=True).exists(),
            'url': reverse('vendors:venue'),
        },
        {
            'label': 'Caterer',
            'done': CatererOption.objects.filter(is_chosen=True).exists(),
            'url': reverse('vendors:caterer'),
        },
        {
            'label': 'Cake',
            'done': CakeOption.objects.filter(is_chosen=True).exists(),
            'url': reverse('vendors:cake'),
        },
        {
            'label': 'Florist',
            'done': FloristOption.objects.filter(is_chosen=True).exists(),
            'url': reverse('vendors:florist'),
        },
        {
            'label': 'Entertainment',
            'done': EntertainmentOption.objects.filter(is_chosen=True).exists(),
            'url': reverse('vendors:entertainment'),
        },
        {
            'label': 'RSVP Deadline',
            'done': bool(rsvp_deadline),
            'url': '/admin/wedding/weddingsettings/1/change/',
        },
        {
            'label': 'Save-the-Dates',
            'done': save_the_dates_sent,
            'url': reverse('invitations'),
        },
        {
            'label': 'Invitations',
            'done': invitations_sent,
            'url': reverse('invitations'),
        },
    ]

    # --- Guest stats ---
    guests_attending = Guest.objects.filter(is_attending=True).count()
    guests_not_coming = Guest.objects.filter(is_attending=False).count()
    guests_possible = Guest.objects.filter(party__status='invited').exclude(is_attending=False).count()
    pending_invites = Party.objects.filter(status='invited', is_attending=None).count()
    total_invited_parties = Party.objects.filter(status='invited').count()
    planned_parties = Party.objects.filter(status='planned').count()
    not_invited_parties = Party.objects.filter(status='not_invited').count()

    rsvp_responded = guests_attending + guests_not_coming
    rsvp_response_pct = int(rsvp_responded / guests_possible * 100) if guests_possible > 0 else 0

    parties_with_pending_invites = Party.objects.filter(
        status='invited', is_attending=None
    ).order_by('category', 'name')
    parties_unopened = parties_with_pending_invites.filter(invitation_opened=None)
    parties_opened_no_response = parties_with_pending_invites.exclude(invitation_opened=None)

    guests_without_meals = Guest.objects.filter(
        is_attending=True, is_child=False
    ).filter(
        Q(meal__isnull=True) | Q(meal='')
    ).count()

    meal_breakdown = (
        Guest.objects.filter(is_attending=True)
        .exclude(meal=None).exclude(meal='')
        .values('meal').annotate(count=Count('*'))
    )

    # --- Budget stats ---
    # Mirror the budget page API: sum Expense records first; fall back to actual_cost.
    def _actual_for(item):
        exp_total = sum(e.amount.amount for e in item.expenses.all())
        if exp_total:
            return exp_total
        return item.actual_cost.amount if item.actual_cost is not None else Decimal('0')

    _budget_items = list(BudgetLineItem.objects.prefetch_related('expenses').all())
    total_estimated = sum(i.estimated_cost.amount for i in _budget_items) or Decimal('0')
    total_actual = sum(_actual_for(i) for i in _budget_items) or Decimal('0')
    budget_remaining = total_estimated - total_actual
    budget_pct_used = int(total_actual / total_estimated * 100) if total_estimated > 0 else 0

    _by_cat: dict = {}
    for _item in _budget_items:
        cat = _item.category
        if cat not in _by_cat:
            _by_cat[cat] = {'category': cat, 'estimated': Decimal('0'), 'actual': None}
        _by_cat[cat]['estimated'] += _item.estimated_cost.amount
        act = _actual_for(_item)
        if act:
            _by_cat[cat]['actual'] = (_by_cat[cat]['actual'] or Decimal('0')) + act
    budget_by_category = sorted(_by_cat.values(), key=lambda x: x['category'])

    # --- Seating stats ---
    tables = SeatingTable.objects.all()
    total_tables = tables.count()
    total_capacity = sum(t.capacity for t in tables)
    guests_seated = Guest.objects.filter(is_attending=True, seating_table__isnull=False).count()
    guests_unseated = guests_attending - guests_seated
    seating_pct = int(guests_seated / guests_attending * 100) if guests_attending > 0 else 0

    # --- Music stats ---
    playlist_count = Song.objects.filter(list_type='playlist').count()
    do_not_play_count = Song.objects.filter(list_type='do_not_play').count()
    moments_covered = Song.objects.filter(list_type='playlist').values('moment').distinct().count()

    # --- Todos stats ---
    total_tasks = Task.objects.count()
    completed_tasks = Task.objects.filter(status=2).count()
    pending_tasks = total_tasks - completed_tasks

    return render(request, 'dashboard/dashboard.html', {
        'couple_name': settings.BRIDE_AND_GROOM,
        'wedding_date': wedding.wedding_date_display,
        'wedding_location': wedding.wedding_location,

        # RSVP deadline
        'rsvp_deadline': rsvp_deadline,
        'rsvp_days_remaining': rsvp_days_remaining,
        'rsvp_overdue': rsvp_overdue,

        # Pipeline
        'checks': checks,
        'checks_done': sum(1 for c in checks if c['done']),
        'checks_total': len(checks),

        # Guests
        'guests_attending': guests_attending,
        'guests_not_coming': guests_not_coming,
        'guests_possible': guests_possible,
        'pending_invites': pending_invites,
        'total_invited_parties': total_invited_parties,
        'planned_parties': planned_parties,
        'not_invited_parties': not_invited_parties,
        'rsvp_responded': rsvp_responded,
        'rsvp_response_pct': rsvp_response_pct,
        'parties_unopened': parties_unopened,
        'parties_opened_no_response': parties_opened_no_response,
        'guests_without_meals': guests_without_meals,
        'meal_breakdown': meal_breakdown,

        # Budget
        'total_estimated': total_estimated,
        'total_actual': total_actual,
        'budget_remaining': budget_remaining,
        'budget_pct_used': budget_pct_used,
        'budget_by_category': budget_by_category,

        # Seating
        'total_tables': total_tables,
        'total_capacity': total_capacity,
        'guests_seated': guests_seated,
        'guests_unseated': guests_unseated,
        'seating_pct': seating_pct,

        # Music
        'playlist_count': playlist_count,
        'do_not_play_count': do_not_play_count,
        'moments_covered': moments_covered,

        # Todos
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'pending_tasks': pending_tasks,

        # Drive sync
        'sync_sheet_names': [
            'Summary', 'Guests', 'Parties', 'Wedding Party',
            'Budget', 'Expenses', 'Schedule', 'Seating Tables',
            'Music \u2014 Playlist', 'Music \u2014 Do Not Play',
            'Venues', 'Caterers', 'Cakes', 'Florists', 'Entertainment',
        ],
    })
