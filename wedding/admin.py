from django import forms
from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils.html import format_html

from .models import Question, Theme, WeddingSettings


class ColorInput(forms.TextInput):
    input_type = 'color'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.attrs.setdefault('style', 'width:60px;height:36px;padding:2px;cursor:pointer;border:1px solid #ccc;border-radius:4px;')


class ThemeForm(forms.ModelForm):
    class Meta:
        model = Theme
        fields = '__all__'
        widgets = {
            'accent':       ColorInput(),
            'accent_hover': ColorInput(),
            'accent_light': ColorInput(),
        }


@admin.register(Theme)
class ThemeAdmin(admin.ModelAdmin):
    form = ThemeForm
    list_display = ['name', 'swatch', 'accent', 'accent_hover', 'accent_light']
    ordering = ['name']

    @admin.display(description='Preview')
    def swatch(self, obj):
        return format_html(
            '<span style="display:inline-flex;gap:4px;">'
            '<span style="width:20px;height:20px;border-radius:50%;background:{};border:1px solid #ddd;" title="accent"></span>'
            '<span style="width:20px;height:20px;border-radius:50%;background:{};border:1px solid #ddd;" title="hover"></span>'
            '<span style="width:20px;height:20px;border-radius:50%;background:{};border:1px solid #ddd;" title="light"></span>'
            '</span>',
            obj.accent, obj.accent_hover, obj.accent_light,
        )


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
        ('Appearance', {
            'fields': ('theme', 'hero_photo'),
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
