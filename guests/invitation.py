from email.mime.image import MIMEImage
import os
from datetime import datetime
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.urls import reverse
from django.http import Http404
from django.template.loader import render_to_string
from guests.models import Party, MealOption

INVITATION_TEMPLATE = 'guests/email_templates/invitation.html'


def render_template(body_html, subject, party, site_url):
    """Resolve {{merge_fields}} in subject and body_html for a given party."""
    from guests.save_the_date import _get_wedding_date, _get_wedding_location
    rsvp_path = reverse('invitation', args=[party.invitation_id])
    rsvp_link = site_url.rstrip('/') + rsvp_path
    first_guest = party.guest_set.first()
    first_name = first_guest.first_name if first_guest else party.name
    replacements = {
        '{{party_name}}': party.name,
        '{{first_name}}': first_name,
        '{{rsvp_link}}': rsvp_link,
        '{{couple}}': getattr(settings, 'BRIDE_AND_GROOM', ''),
        '{{date}}': _get_wedding_date(),
        '{{location}}': _get_wedding_location(),
        '{{site_url}}': site_url,
    }
    for token, value in replacements.items():
        body_html = body_html.replace(token, value)
        subject = subject.replace(token, value)
    return subject, body_html


def render_template_email(template, party, site_url, email_mode=True):
    """Render an EmailTemplate for a party into the full email HTML.

    Returns (rendered_subject, rendered_body, full_html). When email_mode is
    False the image is referenced by URL instead of cid: so the result can be
    displayed in a browser (used by the preview endpoint).
    """
    rendered_subject, rendered_body = render_template(
        template.body_html, template.subject, party, site_url
    )
    _, rendered_footer = render_template(
        template.footer_html or '', '', party, site_url
    )

    context = get_invitation_context(party)
    context['email_mode'] = email_mode
    context['site_url'] = site_url
    context['couple'] = getattr(settings, 'BRIDE_AND_GROOM', '')
    context['custom_body'] = rendered_body
    context['footer_html'] = rendered_footer
    context['show_rsvp_button'] = template.show_rsvp_button
    context['rsvp_button_text'] = template.rsvp_button_text
    context['rsvp_button_color'] = template.rsvp_button_color
    context['main_color'] = template.background_color or context['main_color']
    context['font_color'] = template.font_color or context['font_color']

    if template.main_image:
        context['main_image_filename'] = os.path.basename(template.main_image.name)
        context['main_image_url'] = (
            site_url.rstrip('/') + template.main_image.url if email_mode
            else template.main_image.url
        )

    full_html = render_to_string(INVITATION_TEMPLATE, context=context)
    return rendered_subject, rendered_body, full_html


def _build_template_message(template, subject, html, recipients, cc=None):
    """Assemble the multipart message for a rendered template, image included."""
    site_url = getattr(settings, 'WEDDING_WEBSITE_URL', '')
    text = f"{subject}\n\nPlease visit {site_url} to RSVP online."
    msg = EmailMultiAlternatives(
        subject, text,
        settings.DEFAULT_WEDDING_FROM_EMAIL, recipients,
        cc=cc,
        reply_to=[settings.DEFAULT_WEDDING_REPLY_EMAIL],
    )
    msg.attach_alternative(html, 'text/html')

    if template.main_image:
        msg.mixed_subtype = 'related'
        image_filename = os.path.basename(template.main_image.name)
        with open(template.main_image.path, 'rb') as image_file:
            msg_img = MIMEImage(image_file.read())
            msg_img.add_header('Content-ID', f'<{image_filename}>')
            msg.attach(msg_img)
    return msg


def send_test_email(template, to_email, party=None):
    """Deliver the template to a single address, defaulting to sample data.

    Marked [Test] in the subject; skips the CC list and the SentEmail log so
    tests never touch tracking.
    """
    site_url = getattr(settings, 'WEDDING_WEBSITE_URL', '')
    if party is None:
        party = sample_party()
    rendered_subject, _, template_html = render_template_email(
        template, party, site_url, email_mode=True
    )
    msg = _build_template_message(
        template, f'[Test] {rendered_subject}', template_html, [to_email]
    )
    print(f'sending test of "{template.name}" to {to_email}')
    msg.send()


def sample_party():
    """Stand-in party used for previews and test sends."""
    class _Guest:
        first_name = 'Jane'

    class _GuestSet:
        def first(self):
            return _Guest()

    class _Party:
        name = 'The Smith Family'
        invitation_id = 'preview'
        guest_set = _GuestSet()

    return _Party()


def send_template_email(template, party, user=None, test_only=False, recipients=None):
    """Send an EmailTemplate to a Party, logging the result as a SentEmail."""
    from guests.models import SentEmail
    if recipients is None:
        recipients = party.guest_emails
    if not recipients:
        return None

    site_url = getattr(settings, 'WEDDING_WEBSITE_URL', '')
    rendered_subject, rendered_body, template_html = render_template_email(
        template, party, site_url, email_mode=True
    )
    msg = _build_template_message(
        template, rendered_subject, template_html, recipients,
        cc=settings.WEDDING_CC_LIST,
    )

    print(f'sending template "{template.name}" to {party.name} ({", ".join(recipients)})')
    if not test_only:
        msg.send()

    sent = SentEmail.objects.create(
        template=template,
        party=party,
        subject=rendered_subject,
        body_html=rendered_body,
        recipients=recipients,
        sent_by=user,
    )
    return sent


def guess_party_by_invite_id_or_404(invite_id):
    try:
        return Party.objects.get(invitation_id=invite_id)
    except Party.DoesNotExist:
        if settings.DEBUG:
            # in debug mode allow access by ID
            return Party.objects.get(id=int(invite_id))
        else:
            raise Http404()


def get_invitation_context(party):
    couple = getattr(settings, 'BRIDE_AND_GROOM', 'Drake & Shawna')
    return {
        'main_color': '#fff3e8',
        'font_color': '#666666',
        'page_title': f"{couple} - You're Invited!",
        'preheader_text': "You are invited!",
        'main_image_filename': None,
        'main_image_url': None,
        'show_rsvp_button': True,
        'rsvp_button_text': 'View Invitation',
        'rsvp_button_color': '#337ab7',
        'invitation_id': party.invitation_id,
        'party': party,
        'meals': MealOption.choices(),
    }


def send_invitation_email(party, test_only=False, recipients=None, unique_addresses_only=False):
    if recipients is None:
        recipients = party.guest_emails
    if not recipients:
        print ('===== WARNING: no valid email addresses found for {} ====='.format(party))
        return
    if unique_addresses_only:
        # Remove duplicate emails within this party party
        recipients = list(dict.fromkeys(recipients))

    context = get_invitation_context(party)
    context['email_mode'] = True
    context['site_url'] = settings.WEDDING_WEBSITE_URL
    context['couple'] = settings.BRIDE_AND_GROOM
    template_html = render_to_string(INVITATION_TEMPLATE, context=context)
    template_text = "You're invited to {}'s wedding. To view this invitation, visit {} in any browser.".format(
        settings.BRIDE_AND_GROOM,
        settings.WEDDING_WEBSITE_URL + reverse('invitation', args=[context['invitation_id']])
    )
    subject = "You're invited"
    # https://www.vlent.nl/weblog/2014/01/15/sending-emails-with-embedded-images-in-django/
    msg = EmailMultiAlternatives(subject, template_text, settings.DEFAULT_WEDDING_FROM_EMAIL, recipients,
                                 cc=settings.WEDDING_CC_LIST,
                                 reply_to=[settings.DEFAULT_WEDDING_REPLY_EMAIL])
    msg.attach_alternative(template_html, "text/html")
    msg.mixed_subtype = 'related'
    for filename in (context['main_image'], ):
        attachment_path = os.path.join(os.path.dirname(__file__), 'static', 'invitation', 'images', filename)
        with open(attachment_path, "rb") as image_file:
            msg_img = MIMEImage(image_file.read())
            msg_img.add_header('Content-ID', '<{}>'.format(filename))
            msg.attach(msg_img)

    print ('sending invitation to {} ({})'.format(party.name, ', '.join(recipients)))
    if not test_only:
        msg.send()


def send_all_invitations(test_only, mark_as_sent):
    to_send_to = Party.in_default_order().filter(status='invited', invitation_sent=None).exclude(is_attending=False)
    for party in to_send_to:
        send_invitation_email(party, test_only=test_only)
        if mark_as_sent:
            party.invitation_sent = datetime.now()
            party.save()
