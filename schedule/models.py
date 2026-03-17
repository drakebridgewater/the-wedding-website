from django.db import models


class ScheduleDay(models.Model):
    date = models.DateField()
    label = models.CharField(max_length=100, help_text='e.g. "Wedding Day", "Rehearsal Dinner"')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'date']

    def __str__(self):
        return self.label


class ScheduleEvent(models.Model):
    CATEGORIES = [
        ('getting_ready', 'Getting Ready'),
        ('ceremony', 'Ceremony'),
        ('photos', 'Photos'),
        ('reception', 'Reception'),
        ('travel', 'Travel'),
        ('meal', 'Meal'),
        ('other', 'Other'),
    ]

    day = models.ForeignKey(ScheduleDay, on_delete=models.CASCADE, related_name='events')
    start_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(
        default=60,
        help_text='Duration in minutes. Must be a multiple of 15.',
    )
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORIES, default='other')
    notes = models.TextField(blank=True)
    is_public = models.BooleanField(
        default=False,
        help_text='Show this event on the public wedding program page',
    )
    attendees = models.ManyToManyField(
        'guests.WeddingPartyMember', blank=True, related_name='events'
    )

    class Meta:
        ordering = ['start_time']

    def __str__(self):
        return f"{self.day} – {self.start_time:%H:%M} {self.name}"
