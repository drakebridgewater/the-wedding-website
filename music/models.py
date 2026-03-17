from django.db import models


class Song(models.Model):
    LIST_PLAYLIST = 'playlist'
    LIST_DO_NOT_PLAY = 'do_not_play'
    LIST_CHOICES = [
        (LIST_PLAYLIST, 'Playlist'),
        (LIST_DO_NOT_PLAY, 'Do Not Play'),
    ]

    MOMENT_CEREMONY = 'ceremony'
    MOMENT_COCKTAIL = 'cocktail'
    MOMENT_FIRST_DANCE = 'first_dance'
    MOMENT_RECEPTION = 'reception'
    MOMENT_OTHER = 'other'
    MOMENT_CHOICES = [
        (MOMENT_CEREMONY, 'Ceremony'),
        (MOMENT_COCKTAIL, 'Cocktail Hour'),
        (MOMENT_FIRST_DANCE, 'First Dance'),
        (MOMENT_RECEPTION, 'Reception'),
        (MOMENT_OTHER, 'Other'),
    ]

    list_type = models.CharField(max_length=20, choices=LIST_CHOICES, default=LIST_PLAYLIST)
    moment = models.CharField(max_length=20, choices=MOMENT_CHOICES, default=MOMENT_OTHER)
    title = models.CharField(max_length=200)
    artist = models.CharField(max_length=200, blank=True)
    url = models.URLField(blank=True)
    source = models.CharField(max_length=20, blank=True)  # 'youtube', 'spotify', 'soundcloud', 'other'
    thumbnail_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['list_type', 'moment', 'order', 'created_at']

    def __str__(self):
        return f'{self.title} — {self.artist}' if self.artist else self.title
