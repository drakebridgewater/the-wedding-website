from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('', include('wedding.urls')),
    path('', include('guests.urls')),
    path('budget/', include('budget.urls', namespace='budget')),
    path('seating/', include('seating.urls', namespace='seating')),
    path('schedule/', include('schedule.urls', namespace='schedule')),
    path('todos/', include('todos.urls', namespace='todos')),
    path('vendors/', include('vendors.urls', namespace='vendors')),
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
