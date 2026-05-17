from django.urls import path

from . import api_views, views

app_name = 'notes'

urlpatterns = [
    path('', views.notes_page, name='notes'),
    path('api/', api_views.note_list, name='api-note-list'),
    path('api/<int:pk>/', api_views.note_detail, name='api-note-detail'),
]
