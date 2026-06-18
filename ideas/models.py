from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class IdeaTag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Idea(models.Model):
    SOURCE_MANUAL = 'manual'
    SOURCE_URL = 'url'
    SOURCE_PINTEREST = 'pinterest'
    SOURCE_CHOICES = [
        (SOURCE_MANUAL, 'Manual upload'),
        (SOURCE_URL, 'Web link'),
        (SOURCE_PINTEREST, 'Pinterest'),
    ]

    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='ideas/%Y/%m/', blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_MANUAL)
    source_url = models.URLField(blank=True)
    pinterest_pin_id = models.CharField(max_length=64, blank=True, db_index=True)
    tags = models.ManyToManyField(IdeaTag, blank=True, related_name='ideas')
    is_favorite = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='ideas',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title or f'Idea #{self.pk}'
