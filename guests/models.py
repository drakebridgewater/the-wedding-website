from __future__ import unicode_literals
import datetime
import uuid

from django.db import models
from django.dispatch import receiver

# Party type controls invitation tone and is used for filtering/grouping.
# formal  — Elders, distant relatives, or professional contacts: formal wording.
# fun     — Close friends and young circle: casual, playful wording.
# family  — Family members (general grouping).
# work    — Work colleagues and professional contacts.
ALLOWED_TYPES = [
    ('', 'None'),
    ('formal', 'Formal'),
    ('fun', 'Fun'),
    ('family', 'Family'),
    ('work', 'Work'),
]

SIDE_CHOICES = [
    ('bride', "Bride's side"),
    ('groom', "Groom's side"),
    ('both', 'Both'),
]

INVITE_STATUS_CHOICES = [
    ('planned', 'Planned'),          # On the list, invitation not yet confirmed
    ('invited', 'Invited'),          # Actively invited — will receive/has received invitation
    ('not_invited', 'Not invited'),  # Won't be invited
]


def _random_uuid():
    return uuid.uuid4().hex


class Party(models.Model):
    """
    A party consists of one or more guests.
    """
    name = models.TextField()
    type = models.CharField(max_length=10, choices=ALLOWED_TYPES, blank=True, default='')
    category = models.CharField(max_length=20, null=True, blank=True)
    save_the_date_sent = models.DateTimeField(null=True, blank=True, default=None)
    save_the_date_opened = models.DateTimeField(null=True, blank=True, default=None)
    invitation_id = models.CharField(max_length=32, db_index=True, default=_random_uuid, unique=True)
    invitation_sent = models.DateTimeField(null=True, blank=True, default=None)
    invitation_opened = models.DateTimeField(null=True, blank=True, default=None)
    status = models.CharField(max_length=15, choices=INVITE_STATUS_CHOICES, default='planned')
    rehearsal_dinner = models.BooleanField(default=False)
    is_attending = models.BooleanField(default=None, null=True)
    rsvp_responded_at = models.DateTimeField(null=True, blank=True, default=None)
    comments = models.TextField(null=True, blank=True)
    address = models.TextField(blank=True)
    side = models.CharField(max_length=10, choices=SIDE_CHOICES, blank=True)
    plus_one_allowed = models.BooleanField(default=False)
    plus_one_count = models.PositiveSmallIntegerField(
        default=0,
        help_text='Number of unnamed +1 guests attending with this party.',
    )

    def __str__(self):
        return 'Party: {}'.format(self.name)

    @property
    def is_invited(self):
        return self.status == 'invited'

    @classmethod
    def in_default_order(cls):
        from django.db.models import Case, When, Value, IntegerField
        status_order = Case(
            When(status='invited', then=Value(0)),
            When(status='planned', then=Value(1)),
            When(status='not_invited', then=Value(2)),
            default=Value(3),
            output_field=IntegerField(),
        )
        return cls.objects.annotate(_status_order=status_order).order_by('_status_order', 'category', 'name')

    @property
    def ordered_guests(self):
        return self.guest_set.order_by('is_child', 'pk')

    @property
    def any_guests_attending(self):
        return any(self.guest_set.values_list('is_attending', flat=True))

    @property
    def guest_emails(self):
        return list(filter(None, self.guest_set.values_list('email', flat=True)))


MEALS = [
    ('beef', 'beef'),
    ('fish', 'fish'),
    ('hen', 'chicken'),
    ('vegetarian', 'vegetarian'),
]


class Guest(models.Model):
    """
    A single guest
    """
    party = models.ForeignKey('Party', on_delete=models.SET_NULL, null=True, blank=True)
    first_name = models.TextField()
    last_name = models.TextField(null=True, blank=True)
    email = models.TextField(null=True, blank=True)
    is_attending = models.BooleanField(default=None, null=True)
    meal = models.CharField(max_length=20, choices=MEALS, null=True, blank=True)
    is_child = models.BooleanField(default=False)
    dietary_restrictions = models.TextField(blank=True)
    seating_table = models.ForeignKey(
        'seating.SeatingTable',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='guests',
    )
    seat_color = models.CharField(max_length=20, blank=True, default='')

    @property
    def name(self):
        return u'{} {}'.format(self.first_name, self.last_name)

    @property
    def unique_id(self):
        # convert to string so it can be used in the "add" templatetag
        return str(self.pk)

    def __str__(self):
        return 'Guest: {} {}'.format(self.first_name, self.last_name)


DEFAULT_INVITE_BODY = (
    '<p>Dear {{party_name}},</p>'
    '<p>We would love to have you celebrate our special day with us. '
    'Please click the button above to view your invitation and RSVP.</p>'
    '<p>We look forward to seeing you!</p>'
)


class EmailTemplate(models.Model):
    name = models.CharField(max_length=100)
    subject = models.CharField(max_length=200, default="You're invited!")
    body_html = models.TextField(default=DEFAULT_INVITE_BODY)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class SentEmail(models.Model):
    template = models.ForeignKey(
        EmailTemplate, null=True, on_delete=models.SET_NULL, related_name='sent_emails'
    )
    party = models.ForeignKey(
        Party, null=True, on_delete=models.SET_NULL, related_name='sent_emails'
    )
    subject = models.CharField(max_length=200)
    body_html = models.TextField()
    recipients = models.JSONField(default=list)
    sent_at = models.DateTimeField(auto_now_add=True)
    sent_by = models.ForeignKey(
        'auth.User', null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"SentEmail to {self.party} at {self.sent_at}"


class WeddingPartyMember(models.Model):
    ROLES = [
        ('bride', 'Bride'),
        ('groom', 'Groom'),
        ('maid_of_honor', 'Maid of Honor'),
        ('best_man', 'Best Man'),
        ('bridesmaid', 'Bridesmaid'),
        ('groomsman', 'Groomsman'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=ROLES)
    color = models.CharField(
        max_length=7, default='#6366f1',
        help_text='Hex color used to identify this person in the schedule UI.',
    )
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    order = models.PositiveIntegerField(default=0)
    guest = models.OneToOneField(
        'Guest', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='wedding_party_info',
    )

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_role_display()})"


class WeddingPartyGroup(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#6366f1')
    members = models.ManyToManyField(WeddingPartyMember, blank=True, related_name='groups')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name
