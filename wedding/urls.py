from django.urls import path, re_path

from . import views

urlpatterns = [
    re_path(r'^$', views.home, name='home'),
    path('questions/submit/', views.submit_question, name='submit-question'),
]
