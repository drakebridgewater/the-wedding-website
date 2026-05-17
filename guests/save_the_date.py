from __future__ import unicode_literals, print_function
from email.mime.image import MIMEImage
import os
from datetime import datetime

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from guests.models import Party


SAVE_THE_DATE_TEMPLATE = 'guests/email_templates/save_the_date.html'


def get_save_the_date_context_from_settings():
    from guests.models import SaveTheDateSettings
    std = SaveTheDateSettings.get()
    site_url = getattr(settings, 'WEDDING_WEBSITE_URL', '')

    if std.main_image:
        image_filename = os.path.basename(std.main_image.name)
        image_url = site_url.rstrip('/') + std.main_image.url
        image_path = std.main_image.path
    else:
        image_filename = None
        image_url = None
        image_path = None

    return {
        'main_image_filename': image_filename,
        'main_image_url': image_url,
        'main_image_path': image_path,
        'main_color': std.background_color,
        'font_color': std.font_color,
        'couple': getattr(settings, 'BRIDE_AND_GROOM', ''),
        'location': getattr(settings, 'WEDDING_LOCATION', ''),
        'date': getattr(settings, 'WEDDING_DATE', ''),
        'rsvp_address': getattr(settings, 'DEFAULT_WEDDING_REPLY_EMAIL', ''),
        'site_url': site_url,
        'page_title': getattr(settings, 'BRIDE_AND_GROOM', '') + ' - Save the Date!',
        'preheader_text': (
            "The date that you've eagerly been waiting for is finally here. "
            + getattr(settings, 'BRIDE_AND_GROOM', '') + " are getting married! Save the date!"
        ),
    }


def send_all_save_the_dates(test_only=False, mark_as_sent=False):
    context = get_save_the_date_context_from_settings()
    to_send_to = Party.in_default_order().filter(status='invited', save_the_date_sent=None)
    for party in to_send_to:
        recipients = party.guest_emails
        if not recipients:
            print('===== WARNING: no valid email addresses found for {} ====='.format(party))
            continue
        send_save_the_date_email(context, recipients, test_only=test_only)
        if mark_as_sent:
            party.save_the_date_sent = datetime.now()
            party.save()


def send_save_the_date_email(context, recipients, test_only=False):
    ctx = dict(context)
    ctx['email_mode'] = True

    template_html = render_to_string(SAVE_THE_DATE_TEMPLATE, ctx)
    couple = ctx.get('couple', '')
    date = ctx.get('date', '')
    location = ctx.get('location', '')
    template_text = f"Save the date for {couple}'s wedding! {date}. {location}"
    subject = 'Save the Date!'

    msg = EmailMultiAlternatives(
        subject, template_text,
        settings.DEFAULT_WEDDING_FROM_EMAIL, recipients,
        reply_to=[settings.DEFAULT_WEDDING_REPLY_EMAIL],
    )
    msg.attach_alternative(template_html, 'text/html')

    if ctx.get('main_image_path'):
        msg.mixed_subtype = 'related'
        with open(ctx['main_image_path'], 'rb') as image_file:
            msg_img = MIMEImage(image_file.read())
            msg_img.add_header('Content-ID', f'<{ctx["main_image_filename"]}>')
            msg.attach(msg_img)

    print('sending save-the-date to {}'.format(', '.join(recipients)))
    if not test_only:
        msg.send()


def clear_all_save_the_dates():
    print('clear')
    for party in Party.objects.exclude(save_the_date_sent=None):
        party.save_the_date_sent = None
        print("resetting {}".format(party))
        party.save()
