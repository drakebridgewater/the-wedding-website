from django.urls import path, re_path

from . import views

urlpatterns = [
    re_path(r'^$', views.home, name='home'),
    path('party/', views.wedding_party, name='wedding-party'),
    path('upload/hero/', views.upload_hero_photo, name='upload-hero-photo'),
    path('questions/submit/', views.submit_question, name='submit-question'),
    path('honeymoon/', views.honeymoon_fund, name='honeymoon-fund'),
    path('honeymoon/message/', views.submit_fund_message, name='submit-fund-message'),
]
