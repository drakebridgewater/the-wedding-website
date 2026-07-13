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
    # Structured components, filled when the guest picks a Google Places
    # suggestion on the RSVP form. address_verified means the address came
    # from a Places suggestion rather than being free-typed.
    address_street = models.CharField(max_length=200, blank=True)
    address_city = models.CharField(max_length=100, blank=True)
    address_state = models.CharField(max_length=100, blank=True)
    address_zip = models.CharField(max_length=20, blank=True)
    address_country = models.CharField(max_length=100, blank=True)
    address_verified = models.BooleanField(default=False)
    wants_physical_card = models.BooleanField(default=False)
    side = models.CharField(max_length=10, choices=SIDE_CHOICES, blank=True)
    plus_one_allowed = models.BooleanField(default=False)
    plus_one_count = models.PositiveSmallIntegerField(
        default=0,
        help_text='Number of unnamed +1 guests attending with this party.',
    )

    def save(self, *args, **kwargs):
        # A plus one can only attend if the party itself is attending.
        if self.is_attending is False:
            self.plus_one_count = 0
        super().save(*args, **kwargs)

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


class MealOption(models.Model):
    """
    A food choice offered on the RSVP form. Managed in the Django admin;
    Guest.meal stores the key.
    """
    key = models.SlugField(max_length=20, unique=True)
    label = models.CharField(max_length=100)
    ordering = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, help_text='Inactive options are hidden from the RSVP form but stay valid on existing guests.')

    class Meta:
        ordering = ['ordering', 'label']

    def __str__(self):
        return self.label

    @classmethod
    def choices(cls):
        return list(cls.objects.filter(is_active=True).values_list('key', 'label'))

    @classmethod
    def label_map(cls):
        return dict(cls.objects.values_list('key', 'label'))


class Guest(models.Model):
    """
    A single guest
    """
    party = models.ForeignKey('Party', on_delete=models.SET_NULL, null=True, blank=True)
    first_name = models.TextField()
    last_name = models.TextField(null=True, blank=True)
    email = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=30, blank=True, default='')
    is_attending = models.BooleanField(default=None, null=True)
    meal = models.CharField(max_length=20, null=True, blank=True)
    is_child = models.BooleanField(default=False)
    dietary_restrictions = models.TextField(blank=True)
    label = models.CharField(max_length=100, blank=True)
    is_plus_one = models.BooleanField(default=False)
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

    @property
    def meal_display(self):
        if not self.meal:
            return ''
        return MealOption.label_map().get(self.meal, self.meal)

    def __str__(self):
        return 'Guest: {} {}'.format(self.first_name, self.last_name)


class ContactUpdate(models.Model):
    """
    One submission from the public contact-details form (linked from the
    save-the-date email via {{details_link}}). The changes are applied to the
    Party/Guest records immediately; this row keeps the before/after values so
    guest edits are reviewable (and recoverable) in the admin.
    """
    party = models.ForeignKey(Party, on_delete=models.CASCADE, related_name='contact_updates')
    submitted_at = models.DateTimeField(auto_now_add=True)
    # List of {"target": "party"|"guest", "label": ..., "field": ..., "old": ..., "new": ...}
    changes = models.JSONField(default=list)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return 'Contact update for {} at {:%Y-%m-%d %H:%M}'.format(self.party.name, self.submitted_at)


DEFAULT_INVITE_BODY = (
    '<p>Dear {{party_name}},</p>'
    '<p>We would love to have you celebrate our special day with us. '
    'Please click the button above to view your invitation and RSVP.</p>'
    '<p>We look forward to seeing you!</p>'
)


EMAIL_LINK_TARGETS = [
    ('', '— no link —'),
    ('save_the_date', 'Save the Date page'),
    ('rsvp', 'RSVP / invitation'),
    ('details', 'Contact details form'),
    ('site', 'Wedding website'),
]


class EmailTemplate(models.Model):
    PURPOSES = [
        ('save_the_date', 'Save the Date'),
        ('invitation', 'Invitation'),
        ('other', 'Other'),
    ]

    LINK_TARGETS = EMAIL_LINK_TARGETS

    name = models.CharField(max_length=100)
    purpose = models.CharField(
        max_length=20, choices=PURPOSES, default='other',
        help_text='Sending a Save the Date or Invitation template stamps the '
                  'matching sent-date on each party automatically.',
    )
    subject = models.CharField(max_length=200, default="You're invited!")
    body_html = models.TextField(default=DEFAULT_INVITE_BODY)
    footer_html = models.TextField(blank=True, default='')
    main_image = models.ImageField(upload_to='email-images/', blank=True, null=True)
    show_rsvp_button = models.BooleanField(default=True)
    rsvp_button_text = models.CharField(max_length=100, default='View Invitation')
    rsvp_button_color = models.CharField(max_length=7, default='#337ab7')
    # Optional link wrapped around the main image (blank = image isn't a link).
    main_image_link = models.CharField(
        max_length=20, choices=EMAIL_LINK_TARGETS, blank=True, default='',
    )
    # Secondary "See more" button below the image. Blank text hides it.
    secondary_button_text = models.CharField(max_length=100, blank=True, default='')
    secondary_button_link = models.CharField(
        max_length=20, choices=EMAIL_LINK_TARGETS, blank=True, default='save_the_date',
    )
    secondary_button_color = models.CharField(max_length=7, default='#b08d57')
    background_color = models.CharField(max_length=7, default='#fff3e8')
    font_color = models.CharField(max_length=7, default='#666666')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class SaveTheDateSettings(models.Model):
    main_image = models.ImageField(upload_to='email-images/save-the-date/', blank=True, null=True)
    background_color = models.CharField(max_length=7, default='#fff3e8')
    font_color = models.CharField(max_length=7, default='#666666')

    class Meta:
        verbose_name_plural = 'Save the date settings'

    def __str__(self):
        return 'Save the Date Settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


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
        ('officiant', 'Officiant'),
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
    bio = models.TextField(blank=True)
    photo = models.ImageField(upload_to='wedding_party/', blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    guest = models.OneToOneField(
        'Guest', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='wedding_party_info',
    )
    is_informed = models.BooleanField(
        default=False,
        help_text='Has this person been informed that they are in the wedding party?',
    )
    is_public = models.BooleanField(
        default=False,
        help_text='Show this member on the public wedding party page.',
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
