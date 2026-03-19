from django.db import models


class Song(models.Model):
    LIST_PLAYLIST = 'playlist'
    LIST_DO_NOT_PLAY = 'do_not_play'
    LIST_CHOICES = [
        (LIST_PLAYLIST, 'Playlist'),
        (LIST_DO_NOT_PLAY, 'Do Not Play'),
    ]

    MOMENT_START = 'start'
    MOMENT_PRELUDE = 'prelude'
    MOMENT_PARTY = 'party'
    MOMENT_BRIDE = 'bride'
    MOMENT_CEREMONY = 'ceremony'
    MOMENT_EXIT = 'exit'
    MOMENT_POSTLUDE = 'postlude'
    MOMENT_COCKTAIL = 'cocktail'
    MOMENT_ENTRANCE = 'entrance'
    MOMENT_DANCE = 'dance'
    MOMENT_DINNER = 'dinner'
    MOMENT_REVIEW = 'review'
    MOMENT_CHOICES = [
        (MOMENT_START, 'Start'),
        (MOMENT_PRELUDE, 'Prelude'),
        (MOMENT_PARTY, 'Party'),
        (MOMENT_BRIDE, 'Bride'),
        (MOMENT_CEREMONY, 'Ceremony'),
        (MOMENT_EXIT, 'Exit'),
        (MOMENT_POSTLUDE, 'Postlude'),
        (MOMENT_COCKTAIL, 'Cocktail'),
        (MOMENT_ENTRANCE, 'Entrance'),
        (MOMENT_DANCE, 'Dance'),
        (MOMENT_DINNER, 'Dinner'),
        (MOMENT_REVIEW, 'Review'),
    ]

    list_type = models.CharField(max_length=20, choices=LIST_CHOICES, default=LIST_PLAYLIST)
    moment = models.CharField(max_length=20, choices=MOMENT_CHOICES, default=MOMENT_REVIEW)
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
