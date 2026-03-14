from django import forms
from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import BudgetLineItem, SeatingConfig, SeatingTable, TickTickSettings, WeddingPartyMember, ScheduleDay, ScheduleEvent


@admin.register(BudgetLineItem)
class BudgetLineItemAdmin(admin.ModelAdmin):
    list_display = ('category', 'description', 'vendor_name', 'estimated_cost', 'actual_cost', 'is_paid')
    list_filter = ('category', 'is_paid')
    search_fields = ('description', 'vendor_name', 'notes')
    list_editable = ('is_paid',)


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
            reverse('admin:planning_tickticksettings_change', args=[obj.pk])
        )


class GuestSeatingInline(admin.TabularInline):
    from guests.models import Guest
    model = Guest
    fields = ('first_name', 'last_name', 'meal', 'is_child')
    readonly_fields = ('first_name', 'last_name', 'meal', 'is_child')
    extra = 0
    can_delete = False
    verbose_name = 'Assigned Guest'
    verbose_name_plural = 'Assigned Guests'

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(SeatingTable)
class SeatingTableAdmin(admin.ModelAdmin):
    list_display = ('name', 'shape', 'capacity', 'assigned_count', 'grid_x', 'grid_y')
    list_filter = ('shape',)
    search_fields = ('name', 'notes')
    inlines = [GuestSeatingInline]
    fieldsets = (
        (None, {'fields': ('name', 'shape', 'capacity', 'notes')}),
        ('Grid Position', {'fields': ('grid_x', 'grid_y', 'grid_width', 'grid_height')}),
    )

    def assigned_count(self, obj):
        return obj.assigned_count
    assigned_count.short_description = 'Seated'


@admin.register(SeatingConfig)
class SeatingConfigAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Venue Grid Size', {'fields': ('grid_cols', 'grid_rows')}),
    )

    def has_add_permission(self, request):
        return not SeatingConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        obj = SeatingConfig.get()
        return HttpResponseRedirect(
            reverse('admin:planning_seatingconfig_change', args=[obj.pk])
        )


@admin.register(WeddingPartyMember)
class WeddingPartyMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'color', 'order')
    list_editable = ('order',)
    list_filter = ('role',)
    search_fields = ('name',)
    ordering = ('order', 'name')


class ScheduleEventInline(admin.TabularInline):
    model = ScheduleEvent
    extra = 1
    fields = ('start_time', 'duration_minutes', 'name', 'location', 'category', 'attendees')
    filter_horizontal = ('attendees',)


@admin.register(ScheduleDay)
class ScheduleDayAdmin(admin.ModelAdmin):
    list_display = ('label', 'date', 'order')
    list_editable = ('order',)
    ordering = ('order', 'date')
    inlines = [ScheduleEventInline]


@admin.register(ScheduleEvent)
class ScheduleEventAdmin(admin.ModelAdmin):
    list_display = ('name', 'day', 'start_time', 'duration_minutes', 'category', 'location')
    list_filter = ('day', 'category')
    search_fields = ('name', 'location', 'notes')
    filter_horizontal = ('attendees',)
    ordering = ('day', 'start_time')
