from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import Question, WeddingSettings


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['name', 'question_text', 'is_approved', 'created_at']
    list_filter = ['is_approved']
    list_editable = ['is_approved']
    search_fields = ['name', 'question_text', 'answer']
    readonly_fields = ['created_at']


@admin.register(WeddingSettings)
class WeddingSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Couple', {
            'fields': ('couple_name', 'bride_name', 'groom_name', 'hero_title'),
        }),
        ('Event Details', {
            'fields': ('wedding_date_display', 'wedding_location'),
        }),
        ('Contact & Links', {
            'fields': ('support_email', 'website_url'),
        }),
        ('Analytics', {
            'fields': ('google_analytics_id',),
            'classes': ('collapse',),
        }),
    )

    def has_add_permission(self, request):
        return not WeddingSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        """Redirect the list view directly to the single instance."""
        obj = WeddingSettings.get()
        return HttpResponseRedirect(
            reverse('admin:wedding_weddingsettings_change', args=[obj.pk])
        )
