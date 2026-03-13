from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('', include('wedding.urls')),
    path('', include('guests.urls')),
    path('planning/', include('planning.urls', namespace='planning')),
    path('vendors/', include('vendors.urls', namespace='vendors')),
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
