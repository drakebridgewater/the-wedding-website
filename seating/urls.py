from django.urls import path

from . import api_views, views

app_name = 'seating'

urlpatterns = [
    path('', views.seating_page, name='seating'),
    path('api/config/', api_views.seating_config, name='api-config'),
    path('api/tables/', api_views.table_list, name='api-table-list'),
    path('api/tables/<int:pk>/', api_views.table_detail, name='api-table-detail'),
    path('api/guests/', api_views.guest_seating_list, name='api-guests'),
    path('api/guests/<int:pk>/assign/', api_views.guest_assign, name='api-guest-assign'),
    path('api/guests/<int:pk>/color/', api_views.guest_color, name='api-guest-color'),
]
