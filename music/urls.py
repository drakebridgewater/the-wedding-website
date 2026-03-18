from django.urls import path
from . import views, api_views

app_name = 'music'

urlpatterns = [
    path('', views.music_page, name='music'),
    path('api/songs/', api_views.song_list, name='api-song-list'),
    path('api/songs/fetch-url/', api_views.fetch_url, name='api-fetch-url'),
    path('api/songs/<int:pk>/', api_views.song_detail, name='api-song-detail'),
    path('api/search/', api_views.musicbrainz_search, name='api-mb-search'),
]
