from django.contrib import admin

from .models import ScheduleDay, ScheduleEvent


class ScheduleEventInline(admin.StackedInline):
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
