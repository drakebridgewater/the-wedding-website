from django.urls import path
from . import views

app_name = 'drive_sync'

urlpatterns = [
    path('sync/', views.trigger_sync, name='sync'),
]
