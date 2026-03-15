from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import SeatingConfig, SeatingTable


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
            reverse('admin:seating_seatingconfig_change', args=[obj.pk])
        )
