from django.contrib import admin

from .models import Idea, IdeaTag


@admin.register(Idea)
class IdeaAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'source', 'is_favorite', 'created_at', 'updated_at']
    list_filter = ['source', 'is_favorite', 'tags']
    search_fields = ['title', 'description']
    filter_horizontal = ['tags']


@admin.register(IdeaTag)
class IdeaTagAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']
