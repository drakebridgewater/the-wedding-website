from django.db import models


class Note(models.Model):
    COLOR_YELLOW = 'yellow'
    COLOR_PINK = 'pink'
    COLOR_BLUE = 'blue'
    COLOR_GREEN = 'green'
    COLOR_PURPLE = 'purple'
    COLOR_ORANGE = 'orange'
    COLOR_CHOICES = [
        (COLOR_YELLOW, 'Yellow'),
        (COLOR_PINK, 'Pink'),
        (COLOR_BLUE, 'Blue'),
        (COLOR_GREEN, 'Green'),
        (COLOR_PURPLE, 'Purple'),
        (COLOR_ORANGE, 'Orange'),
    ]

    title = models.CharField(max_length=200, blank=True)
    content = models.TextField(blank=True)
    color = models.CharField(max_length=20, choices=COLOR_CHOICES, default=COLOR_YELLOW)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title or f'Note #{self.pk}'
