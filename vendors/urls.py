from django.urls import path

from . import api_views, views

app_name = 'vendors'

urlpatterns = [
    # Page views
    path('venue/', views.venue_page, name='venue'),
    path('caterer/', views.caterer_page, name='caterer'),
    path('cake/', views.cake_page, name='cake'),
    path('florist/', views.florist_page, name='florist'),
    path('entertainment/', views.entertainment_page, name='entertainment'),

    # Vendor checklist items (filter by ?vendor_type=venue|caterer|cake|florist|entertainment)
    path('api/checklist-items/', api_views.vendor_checklist_items, name='api-checklist-items'),

    # Photo delete (literal path first to avoid ambiguity)
    path('api/photos/<int:photo_pk>/', api_views.vendor_photo_delete, name='api-photo-delete'),

    # Generic vendor API
    path('api/<str:vendor_type>/', api_views.vendor_list, name='api-list'),
    path('api/<str:vendor_type>/<int:pk>/', api_views.vendor_detail, name='api-detail'),
    path('api/<str:vendor_type>/<int:pk>/photos/', api_views.vendor_photo_upload, name='api-photo-upload'),
]
