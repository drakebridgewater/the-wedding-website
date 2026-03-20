from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from .models import (
    CakeOption,
    CatererOption,
    EntertainmentOption,
    FloristOption,
    VendorChecklistItem,
    VendorPhoto,
    VenueOption,
)


class PhotoInline(GenericTabularInline):
    model = VendorPhoto
    extra = 0
    fields = ['image', 'caption', 'order']
    readonly_fields = ['uploaded_at']


@admin.register(VenueOption)
class VenueAdmin(admin.ModelAdmin):
    inlines = [PhotoInline]
    list_display = ['name', 'style', 'capacity', 'price_estimate', 'rating', 'is_chosen', 'is_favorite']
    list_filter = ['is_chosen', 'is_favorite', 'has_talked_to', 'has_visited', 'style']
    search_fields = ['name', 'address', 'comments']
    list_editable = ['is_chosen', 'is_favorite']


@admin.register(CatererOption)
class CatererAdmin(admin.ModelAdmin):
    inlines = [PhotoInline]
    list_display = ['name', 'cuisine_type', 'price_per_head', 'price_estimate', 'rating', 'is_chosen', 'is_favorite']
    list_filter = ['is_chosen', 'is_favorite', 'has_talked_to', 'tasting_scheduled', 'tasting_completed']
    search_fields = ['name', 'comments']
    list_editable = ['is_chosen', 'is_favorite']


@admin.register(CakeOption)
class CakeAdmin(admin.ModelAdmin):
    inlines = [PhotoInline]
    list_display = ['name', 'price_per_serving', 'price_estimate', 'rating', 'is_chosen', 'is_favorite']
    list_filter = ['is_chosen', 'is_favorite', 'tasting_scheduled', 'tasting_completed', 'custom_design_available']
    search_fields = ['name', 'flavors', 'comments']
    list_editable = ['is_chosen', 'is_favorite']


@admin.register(FloristOption)
class FloristAdmin(admin.ModelAdmin):
    inlines = [PhotoInline]
    list_display = ['name', 'style', 'minimum_order', 'price_estimate', 'rating', 'is_chosen', 'is_favorite']
    list_filter = ['is_chosen', 'is_favorite', 'has_talked_to', 'has_visited', 'style']
    search_fields = ['name', 'arrangement_types', 'comments']
    list_editable = ['is_chosen', 'is_favorite']


@admin.register(EntertainmentOption)
class EntertainmentAdmin(admin.ModelAdmin):
    inlines = [PhotoInline]
    list_display = ['name', 'type', 'num_members', 'price_estimate', 'rating', 'is_chosen', 'is_favorite']
    list_filter = ['is_chosen', 'is_favorite', 'has_talked_to', 'has_visited', 'type']
    search_fields = ['name', 'genres', 'package_details', 'comments']
    list_editable = ['is_chosen', 'is_favorite']


@admin.register(VendorChecklistItem)
class VendorChecklistItemAdmin(admin.ModelAdmin):
    list_display = ['vendor_type', 'category', 'text', 'order', 'is_active']
    list_editable = ['order', 'is_active']
    list_filter = ['vendor_type', 'category', 'is_active']
    search_fields = ['text', 'question', 'category']
    list_per_page = 100
