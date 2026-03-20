from django.contrib.auth.decorators import login_required
from django.urls import path, re_path
from django.views.generic import RedirectView

from guests import api_views
from guests.views import test_email, save_the_date_preview, save_the_date_random, export_guests, \
    invitation, invitation_email_preview, invitation_email_test, rsvp_confirm, \
    invitations_list, send_party_invitation, manage_page


urlpatterns = [
    # Guest management React app
    path('guests/manage/', manage_page, name='manage'),

    # REST API
    path('guests/api/members/', api_views.members, name='api-members'),
    path('guests/api/members/<int:pk>/', api_views.member_detail, name='api-member-detail'),
    path('guests/api/members/<int:pk>/photo/', api_views.member_photo, name='api-member-photo'),
    path('guests/api/groups/', api_views.groups, name='api-groups'),
    path('guests/api/groups/<int:pk>/', api_views.group_detail, name='api-group-detail'),
    path('guests/api/parties/', api_views.parties, name='api-parties'),
    path('guests/api/parties/<int:pk>/', api_views.party_detail, name='api-party-detail'),
    path('guests/api/parties/<int:party_pk>/guests/', api_views.party_guests, name='api-party-guests'),
    path('guests/api/guests/unassigned/', api_views.unassigned_guests, name='api-unassigned-guests'),
    path('guests/api/guests/<int:pk>/', api_views.guest_detail, name='api-guest-detail'),
    path('guests/api/guests/<int:pk>/assign_role/', api_views.guest_assign_role, name='api-guest-assign-role'),
    path('guests/api/guests/<int:pk>/remove_role/', api_views.guest_remove_role, name='api-guest-remove-role'),
    path('guests/api/import-csv/', api_views.import_csv, name='api-import-csv'),
    path('guests/api/email-templates/', api_views.email_templates, name='api-email-templates'),
    path('guests/api/email-templates/<int:pk>/', api_views.email_template_detail, name='api-email-template-detail'),
    path('guests/api/email-templates/<int:pk>/preview/', api_views.email_template_preview, name='api-email-template-preview'),
    path('guests/api/email-templates/<int:pk>/send/', api_views.email_template_send, name='api-email-template-send'),
    path('guests/api/sent-emails/', api_views.sent_emails, name='api-sent-emails'),

    re_path(r'^guests/$', login_required(RedirectView.as_view(url='/guests/manage/', permanent=True)), name='guest-list'),
    re_path(r'^guests/export$', export_guests, name='export-guest-list'),
    re_path(r'^invite/(?P<invite_id>[\w-]+)/$', invitation, name='invitation'),
    re_path(r'^invite-email/(?P<invite_id>[\w-]+)/$', invitation_email_preview, name='invitation-email'),
    re_path(r'^invite-email-test/(?P<invite_id>[\w-]+)/$', invitation_email_test, name='invitation-email-test'),
    re_path(r'^save-the-date/$', save_the_date_random, name='save-the-date-random'),
    re_path(r'^save-the-date/(?P<template_id>[\w-]+)/$', save_the_date_preview, name='save-the-date'),
    re_path(r'^email-test/(?P<template_id>[\w-]+)/$', test_email, name='test-email'),
    re_path(r'^rsvp/confirm/(?P<invite_id>[\w-]+)/$', rsvp_confirm, name='rsvp-confirm'),
    re_path(r'^invitations/$', invitations_list, name='invitations'),
    re_path(r'^invitations/send/(?P<party_pk>\d+)/$', send_party_invitation, name='send-invitation'),
]
