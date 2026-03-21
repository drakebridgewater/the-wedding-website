from __future__ import unicode_literals

from django.db import models


class Theme(models.Model):
    name = models.CharField(max_length=50, unique=True, help_text='Display name, e.g. "Rose"')
    accent = models.CharField(max_length=7, help_text='Primary accent color in hex, e.g. #e11d48')
    accent_hover = models.CharField(max_length=7, help_text='Darker shade used on hover, e.g. #9f1239')
    accent_light = models.CharField(max_length=7, help_text='Light tint used for backgrounds, e.g. #fce7f3')

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Question(models.Model):
    name = models.CharField(max_length=100, blank=True, help_text="Guest's name (optional)")
    question_text = models.TextField()
    answer = models.TextField(blank=True)
    is_approved = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.name or 'Anonymous'}: {self.question_text[:60]}"


class FundMessage(models.Model):
    """Guestbook messages left by honeymoon fund contributors."""
    name = models.CharField(max_length=100, blank=True, help_text="Contributor's name (optional)")
    message = models.TextField()
    is_approved = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name or 'Anonymous'}: {self.message[:60]}"


class WeddingSettings(models.Model):
    """Singleton model — only one row (pk=1) should ever exist."""

    couple_name = models.CharField(max_length=100, default='Drake & Shawna')
    bride_name = models.CharField(max_length=100, default='Shawna Beckstead')
    groom_name = models.CharField(max_length=100, default='Drake Bridgewater')
    hero_title = models.CharField(max_length=200, default='The Bridgewaters!!')
    wedding_date_display = models.CharField(
        max_length=100, blank=True,
        help_text='Human-readable date shown on the site, e.g. "June 14, 2026"',
    )
    wedding_location = models.CharField(max_length=200, blank=True)
    support_email = models.EmailField(blank=True)
    website_url = models.URLField(blank=True)
    google_analytics_id = models.CharField(
        max_length=50, blank=True,
        help_text='Google Analytics tracking ID, e.g. UA-XXXXXXXX-1 or G-XXXXXXXXXX',
    )
    rsvp_deadline = models.DateField(
        null=True, blank=True,
        help_text='Deadline for guests to RSVP. Used to flag overdue responses on the dashboard.',
    )
    hero_photo = models.ImageField(
        upload_to='site/', blank=True, null=True,
        help_text='Hero photo shown on the home page. Overrides the default static image.',
    )
    theme = models.ForeignKey(
        'Theme', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='+',
        help_text='Color theme for the public-facing website. Create new themes in the Themes section.',
    )

    # Honeymoon fund payment handles
    venmo_handle = models.CharField(max_length=100, blank=True, help_text='Venmo username, e.g. @YourName')
    zelle_handle = models.CharField(max_length=100, blank=True, help_text='Zelle email or phone number')
    cashapp_handle = models.CharField(max_length=100, blank=True, help_text='Cash App cashtag, e.g. $YourName')
    paypal_handle = models.CharField(max_length=100, blank=True, help_text='PayPal.me link or username, e.g. YourName')

    class Meta:
        verbose_name = 'Wedding Settings'
        verbose_name_plural = 'Wedding Settings'

    def __str__(self):
        return f'{self.couple_name} — Wedding Settings'

    @classmethod
    def get(cls):
        """Return the singleton instance, creating it with defaults if needed."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
