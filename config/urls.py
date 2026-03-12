from django.contrib import admin
from django.urls import path, include


urlpatterns = [
    path('', include('wedding.urls')),
    path('', include('guests.urls')),
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),
]
