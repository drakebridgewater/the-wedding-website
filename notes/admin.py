from django.contrib import admin

from .models import Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'color', 'created_at', 'updated_at']
    list_filter = ['color']
