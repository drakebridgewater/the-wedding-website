from django.urls import path

from . import api_views, views

app_name = 'ideas'

urlpatterns = [
    path('', views.ideas_page, name='ideas'),
    path('api/ideas/', api_views.idea_list, name='api-idea-list'),
    path('api/ideas/upload/', api_views.idea_upload, name='api-idea-upload'),
    path('api/ideas/fetch-url/', api_views.idea_fetch_url, name='api-idea-fetch-url'),
    path('api/ideas/<int:pk>/', api_views.idea_detail, name='api-idea-detail'),
    path('api/tags/', api_views.tag_list, name='api-tag-list'),
    path('api/tags/<int:pk>/', api_views.tag_detail, name='api-tag-detail'),
    path('api/pinterest/sync/', api_views.pinterest_sync, name='api-pinterest-sync'),
    path('api/pinterest/boards/', api_views.pinterest_boards, name='api-pinterest-boards'),
]
