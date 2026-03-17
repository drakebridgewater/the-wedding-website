from django.contrib import admin
from .models import Song


@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    list_display = ['title', 'artist', 'list_type', 'moment', 'source', 'order', 'created_at']
    list_filter = ['list_type', 'moment', 'source']
    search_fields = ['title', 'artist']
    ordering = ['list_type', 'moment', 'order']
