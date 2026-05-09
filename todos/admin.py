from django import forms
from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import TickTickSettings, TodoistSettings


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


class TodoistSettingsForm(forms.ModelForm):
    api_token = forms.CharField(
        widget=forms.PasswordInput(render_value=True),
        required=False,
    )

    class Meta:
        model = TodoistSettings
        fields = '__all__'


@admin.register(TodoistSettings)
class TodoistSettingsAdmin(admin.ModelAdmin):
    form = TodoistSettingsForm
    fieldsets = (
        ('API Token', {
            'fields': ('api_token',),
            'description': (
                'Generate at <a href="https://app.todoist.com/app/settings/integrations/developer" '
                'target="_blank">Todoist → Settings → Integrations → Developer → API token</a>. '
                'No OAuth setup required.'
            ),
        }),
        ('Sync Settings', {
            'fields': ('project_name',),
        }),
        ('Assignee Filter', {
            'fields': ('drake_assignee_id', 'shawna_assignee_id'),
            'description': (
                'Run <code>python manage.py todoist_setup</code> after saving the token to list '
                'collaborator IDs for the project.'
            ),
        }),
    )

    def has_add_permission(self, _request):
        return not TodoistSettings.objects.exists()

    def has_delete_permission(self, _request, _obj=None):
        return False

    def changelist_view(self, _request, _extra_context=None):
        obj = TodoistSettings.get()
        return HttpResponseRedirect(
            reverse('admin:todos_todoistsettings_change', args=[obj.pk])
        )
