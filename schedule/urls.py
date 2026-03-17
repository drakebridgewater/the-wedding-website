from django.urls import path

from . import api_views, views

app_name = 'schedule'

urlpatterns = [
    path('', views.schedule_page, name='schedule'),
    path('program/', views.public_schedule, name='program'),
    path('groups/', views.groups_page, name='groups'),
    path('groups/<int:pk>/email/', views.send_group_email, name='send-group-email'),
    path('api/members/', api_views.schedule_members, name='api-members'),
    path('api/groups/', api_views.schedule_groups, name='api-groups'),
    path('api/days/', api_views.schedule_days, name='api-days'),
    path('api/days/<int:pk>/', api_views.schedule_day_detail, name='api-day-detail'),
    path('api/days/<int:day_pk>/events/', api_views.schedule_events, name='api-events'),
    path('api/events/<int:pk>/', api_views.schedule_event_detail, name='api-event-detail'),
]
