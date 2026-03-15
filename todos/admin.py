from django import forms
from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import TickTickSettings


class TickTickSettingsForm(forms.ModelForm):
    client_secret = forms.CharField(
        widget=forms.PasswordInput(render_value=True),
        required=False,
    )
    password = forms.CharField(
        widget=forms.PasswordInput(render_value=True),
        required=False,
    )

    class Meta:
        model = TickTickSettings
        fields = '__all__'


@admin.register(TickTickSettings)
class TickTickSettingsAdmin(admin.ModelAdmin):
    form = TickTickSettingsForm
    fieldsets = (
        ('OAuth App Credentials', {
            'fields': ('client_id', 'client_secret'),
            'description': (
                'Register your app at <a href="https://developer.ticktick.com" target="_blank">developer.ticktick.com</a> '
                'to get these values.'
            ),
        }),
        ('Account Login', {
            'fields': ('username', 'password'),
        }),
        ('Sync Settings', {
            'fields': ('project_name',),
        }),
        ('Assignee Filter', {
            'fields': ('drake_assignee_id', 'shawna_assignee_id'),
            'description': (
                'Run <code>python manage.py ticktick_auth</code> after saving credentials to find these IDs.'
            ),
        }),
    )

    def has_add_permission(self, _request):
        return not TickTickSettings.objects.exists()

    def has_delete_permission(self, _request, _obj=None):
        return False

    def changelist_view(self, _request, _extra_context=None):
        obj = TickTickSettings.get()
        return HttpResponseRedirect(
            reverse('admin:todos_tickticksettings_change', args=[obj.pk])
        )
