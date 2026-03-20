from datetime import date
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q, Sum
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
    save_the_dates_sent = Party.objects.filter(save_the_date_sent__isnull=False).exists()
    invitations_sent = Party.objects.filter(invitation_sent__isnull=False).exists()

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
    budget_items = BudgetLineItem.objects.all()
    _est = budget_items.aggregate(total=Sum('estimated_cost'))['total']
    _act = budget_items.exclude(actual_cost__isnull=True).aggregate(total=Sum('actual_cost'))['total']
    # djmoney may return Money objects or Decimals; normalise to Decimal
    total_estimated = (_est.amount if hasattr(_est, 'amount') else _est) or Decimal('0')
    total_actual = (_act.amount if hasattr(_act, 'amount') else _act) or Decimal('0')
    budget_remaining = total_estimated - total_actual
    budget_pct_used = int(total_actual / total_estimated * 100) if total_estimated > 0 else 0

    budget_by_category = (
        budget_items
        .values('category')
        .annotate(estimated=Sum('estimated_cost'), actual=Sum('actual_cost'))
        .order_by('category')
    )

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
