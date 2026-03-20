from __future__ import unicode_literals

from django.db import models


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
