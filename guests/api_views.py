from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import EmailTemplate, Guest, MealOption, Party, SaveTheDateSettings, SentEmail, WeddingPartyGroup, WeddingPartyMember
from .serializers import (
    EmailTemplateSerializer,
    GuestSerializer,
    PartySerializer,
    SaveTheDateSettingsSerializer,
    SentEmailSerializer,
    WeddingPartyGroupSerializer,
    WeddingPartyMemberSerializer,
)
from .csv_import import import_guests_from_fileobj


def _parse_name(full_name):
    """Split 'First Last Name' into (first, rest)."""
    parts = full_name.strip().split(' ', 1)
    return parts[0], parts[1] if len(parts) > 1 else ''


# ── Meal options ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def meal_options(request):
    return Response([
        {'key': key, 'label': label}
        for key, label in MealOption.choices()
    ])


# ── Wedding party members ──────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def members(request):
    if request.method == 'GET':
        qs = WeddingPartyMember.objects.all()
        return Response(WeddingPartyMemberSerializer(qs, many=True, context={'request': request}).data)

    serializer = WeddingPartyMemberSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)

    # Auto-create a Party + Guest so the WP member appears in the full guest list
    name = serializer.validated_data['name']
    email = serializer.validated_data.get('email', '')
    first_name, last_name = _parse_name(name)
    party = Party.objects.create(name=name, type='formal', status='invited')
    guest = Guest.objects.create(
        party=party,
        first_name=first_name,
        last_name=last_name,
        email=email,
        is_attending=True,
    )
    member = serializer.save(guest=guest)
    return Response(WeddingPartyMemberSerializer(member, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def member_detail(request, pk):
    try:
        obj = WeddingPartyMember.objects.get(pk=pk)
    except WeddingPartyMember.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(WeddingPartyMemberSerializer(obj, context={'request': request}).data)

    if request.method == 'DELETE':
        linked_guest = obj.guest
        obj.delete()
        if linked_guest:
            party = linked_guest.party
            linked_guest.delete()
            if not party.guest_set.exists():
                party.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = WeddingPartyMemberSerializer(obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    member = serializer.save()

    # Keep linked Guest in sync when name or email changes
    if member.guest:
        g = member.guest
        guest_fields = []
        if 'name' in request.data:
            g.first_name, g.last_name = _parse_name(member.name)
            guest_fields += ['first_name', 'last_name']
            g.party.name = member.name
            g.party.save(update_fields=['name'])
        if 'email' in request.data:
            g.email = member.email
            guest_fields.append('email')
        if guest_fields:
            g.save(update_fields=guest_fields)

    return Response(WeddingPartyMemberSerializer(member, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def member_photo(request, pk):
    try:
        obj = WeddingPartyMember.objects.get(pk=pk)
    except WeddingPartyMember.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    image = request.FILES.get('image')
    if not image:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
    if obj.photo:
        obj.photo.delete(save=False)
    obj.photo = image
    obj.save(update_fields=['photo'])
    serializer = WeddingPartyMemberSerializer(obj, context={'request': request})
    return Response({'photo_url': serializer.data['photo_url']})


# ── Wedding party groups ───────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def groups(request):
    if request.method == 'GET':
        qs = WeddingPartyGroup.objects.prefetch_related('members').all()
        return Response(WeddingPartyGroupSerializer(qs, many=True).data)

    member_ids = request.data.pop('member_ids', [])
    serializer = WeddingPartyGroupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    group = serializer.save()
    if member_ids:
        group.members.set(member_ids)
    return Response(WeddingPartyGroupSerializer(group).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def group_detail(request, pk):
    try:
        obj = WeddingPartyGroup.objects.prefetch_related('members').get(pk=pk)
    except WeddingPartyGroup.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(WeddingPartyGroupSerializer(obj).data)
    if request.method == 'DELETE':
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    data = request.data.copy()
    member_ids = data.pop('member_ids', None)
    serializer = WeddingPartyGroupSerializer(obj, data=data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    if member_ids is not None:
        obj.members.set(member_ids)
    return Response(WeddingPartyGroupSerializer(obj).data)


# ── Guest list parties ─────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def parties(request):
    if request.method == 'GET':
        qs = Party.objects.prefetch_related('guest_set').order_by('name')
        return Response(PartySerializer(qs, many=True).data)

    serializer = PartySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def party_detail(request, pk):
    # DELETE is idempotent — 204 whether or not the party still exists
    if request.method == 'DELETE':
        Party.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    try:
        obj = Party.objects.prefetch_related('guest_set').get(pk=pk)
    except Party.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(PartySerializer(obj).data)

    serializer = PartySerializer(obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(PartySerializer(obj).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def party_guests(request, party_pk):
    try:
        party = Party.objects.get(pk=party_pk)
    except Party.DoesNotExist:
        return Response({'error': 'Party not found'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data.copy()
    data['party'] = party.pk
    serializer = GuestSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save(party=party)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def guest_detail(request, pk):
    # DELETE is idempotent — 204 whether or not the guest still exists
    if request.method == 'DELETE':
        Guest.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    try:
        obj = Guest.objects.get(pk=pk)
    except Guest.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = GuestSerializer(obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ── Role assignment on existing guests ────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def guest_assign_role(request, pk):
    """Create or update a WeddingPartyMember linked to an existing guest."""
    try:
        guest = Guest.objects.get(pk=pk)
    except Guest.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    role = request.data.get('role')
    color = request.data.get('color', '#94a3b8')
    order = request.data.get('order', 0)
    name = f"{guest.first_name} {guest.last_name}".strip() or guest.email or 'Guest'

    member, _ = WeddingPartyMember.objects.update_or_create(
        guest=guest,
        defaults={'role': role, 'name': name, 'color': color, 'order': order},
    )
    return Response(WeddingPartyMemberSerializer(member).data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def guest_remove_role(request, pk):
    """Remove the WeddingPartyMember role from a guest without deleting the guest."""
    WeddingPartyMember.objects.filter(guest_id=pk).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Unassigned guests ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unassigned_guests(request):
    """Return guests that have no party assigned."""
    qs = Guest.objects.filter(party__isnull=True).order_by('last_name', 'first_name')
    return Response(GuestSerializer(qs, many=True).data)


# ── Email templates ────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def email_templates(request):
    if request.method == 'GET':
        qs = EmailTemplate.objects.order_by('name')
        return Response(EmailTemplateSerializer(qs, many=True, context={'request': request}).data)

    serializer = EmailTemplateSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def email_template_detail(request, pk):
    try:
        obj = EmailTemplate.objects.get(pk=pk)
    except EmailTemplate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(EmailTemplateSerializer(obj, context={'request': request}).data)
    if request.method == 'DELETE':
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = EmailTemplateSerializer(obj, data=request.data, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(EmailTemplateSerializer(obj, context={'request': request}).data)


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def email_template_upload_image(request, pk):
    """POST: upload an image for the template. DELETE: remove the image."""
    try:
        obj = EmailTemplate.objects.get(pk=pk)
    except EmailTemplate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        if obj.main_image:
            obj.main_image.delete(save=False)
            obj.main_image = None
            obj.save(update_fields=['main_image'])
        return Response(EmailTemplateSerializer(obj, context={'request': request}).data)

    image = request.FILES.get('image')
    if not image:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
    if obj.main_image:
        obj.main_image.delete(save=False)
    obj.main_image = image
    obj.save(update_fields=['main_image'])
    return Response(EmailTemplateSerializer(obj, context={'request': request}).data)


# Draft fields the preview/test-send endpoints may substitute without saving,
# so both always reflect what's currently in the editor.
_TEMPLATE_DRAFT_FIELDS = [
    'subject', 'body_html', 'footer_html',
    'show_rsvp_button', 'rsvp_button_text', 'rsvp_button_color',
    'background_color', 'font_color',
]


def _template_with_draft(pk, data):
    """Load a template and apply in-memory (unsaved) draft overrides.

    Returns (template, party, error_response); party is a real Party when
    party_id is given, otherwise sample data.
    """
    from .invitation import sample_party
    try:
        obj = EmailTemplate.objects.get(pk=pk)
    except EmailTemplate.DoesNotExist:
        return None, None, Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    for field in _TEMPLATE_DRAFT_FIELDS:
        if field in data:
            setattr(obj, field, data[field])

    party_id = data.get('party_id')
    if party_id:
        try:
            party = Party.objects.prefetch_related('guest_set').get(pk=party_id)
        except Party.DoesNotExist:
            return None, None, Response({'error': 'Party not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        party = sample_party()
    return obj, party, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def email_template_preview(request, pk):
    """Render the template through the real email pipeline.

    Body (all optional): { party_id: <int>, <draft field overrides> }.
    Draft overrides let the UI preview unsaved edits. Returns the merged
    subject/body plus `html`, the complete email document exactly as it
    will be sent.
    """
    from django.conf import settings
    from .invitation import render_template_email

    obj, party, error = _template_with_draft(pk, request.data)
    if error:
        return error

    site_url = getattr(settings, 'WEDDING_WEBSITE_URL', 'https://example.com')
    subject, body, html = render_template_email(obj, party, site_url, email_mode=False)
    return Response({'subject': subject, 'body_html': body, 'html': html})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def email_template_test_send(request, pk):
    """Deliver a real test email to one address; never logged or CC'd.

    Body: { email: <str>, party_id?: <int>, <draft field overrides> }.
    """
    from .invitation import send_test_email

    to_email = (request.data.get('email') or '').strip()
    if not to_email:
        return Response({'error': 'email required'}, status=status.HTTP_400_BAD_REQUEST)

    obj, party, error = _template_with_draft(pk, request.data)
    if error:
        return error

    try:
        send_test_email(obj, to_email, party=party)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
    return Response({'sent_to': to_email})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def email_template_send(request, pk):
    """Send template to a list of party IDs.
    Body: { party_ids: [1, 2, ...] }
    Save-the-date / invitation sent dates are stamped automatically from the
    template's purpose.
    """
    from datetime import datetime
    try:
        template = EmailTemplate.objects.get(pk=pk)
    except EmailTemplate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    party_ids = request.data.get('party_ids', [])
    if not party_ids:
        return Response({'error': 'party_ids required'}, status=status.HTTP_400_BAD_REQUEST)

    from .invitation import send_template_email
    parties_qs = Party.objects.prefetch_related('guest_set').filter(pk__in=party_ids)
    sent_count = 0
    errors = []
    for party in parties_qs:
        try:
            result = send_template_email(template, party, user=request.user)
            if result:
                sent_count += 1
                if template.purpose == 'save_the_date':
                    party.save_the_date_sent = datetime.now()
                    party.save(update_fields=['save_the_date_sent'])
                elif template.purpose == 'invitation':
                    party.invitation_sent = datetime.now()
                    party.save(update_fields=['invitation_sent'])
            else:
                errors.append(f'{party.name}: no valid email addresses')
        except Exception as e:
            errors.append(f'{party.name}: {e}')

    return Response({'sent': sent_count, 'errors': errors})


# ── Sent emails log ────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sent_emails(request):
    qs = SentEmail.objects.select_related('template', 'party').order_by('-sent_at')
    party_id = request.query_params.get('party')
    if party_id:
        qs = qs.filter(party_id=party_id)
    return Response(SentEmailSerializer(qs, many=True).data)


# ── Save the date ──────────────────────────────────────────────────────────────

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def save_the_date_settings(request):
    obj = SaveTheDateSettings.get()
    if request.method == 'PATCH':
        serializer = SaveTheDateSettingsSerializer(obj, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(SaveTheDateSettingsSerializer(obj, context={'request': request}).data)


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def save_the_date_upload_image(request):
    obj = SaveTheDateSettings.get()
    if request.method == 'DELETE':
        if obj.main_image:
            obj.main_image.delete(save=False)
            obj.main_image = None
            obj.save(update_fields=['main_image'])
        return Response(SaveTheDateSettingsSerializer(obj, context={'request': request}).data)

    image = request.FILES.get('image')
    if not image:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
    if obj.main_image:
        obj.main_image.delete(save=False)
    obj.main_image = image
    obj.save(update_fields=['main_image'])
    return Response(SaveTheDateSettingsSerializer(obj, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_the_date_send(request):
    """Send save-the-date to a list of party IDs. Body: { party_ids: [...] }"""
    from datetime import datetime
    from .save_the_date import send_save_the_date_email, get_save_the_date_context_from_settings

    party_ids = request.data.get('party_ids', [])
    if not party_ids:
        return Response({'error': 'party_ids required'}, status=status.HTTP_400_BAD_REQUEST)

    context = get_save_the_date_context_from_settings()
    parties_qs = Party.objects.prefetch_related('guest_set').filter(pk__in=party_ids)
    sent_count = 0
    errors = []
    for party in parties_qs:
        recipients = party.guest_emails
        if not recipients:
            errors.append(f'{party.name}: no valid email addresses')
            continue
        try:
            send_save_the_date_email(context, recipients)
            party.save_the_date_sent = datetime.now()
            party.save(update_fields=['save_the_date_sent'])
            sent_count += 1
        except Exception as e:
            errors.append(f'{party.name}: {e}')

    return Response({'sent': sent_count, 'errors': errors})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def save_the_date_sent_list(request):
    """Return parties that have been sent a save-the-date."""
    qs = Party.objects.exclude(save_the_date_sent=None).order_by('-save_the_date_sent')
    data = [
        {
            'id': p.id,
            'name': p.name,
            'save_the_date_sent': p.save_the_date_sent,
        }
        for p in qs
    ]
    return Response(data)


# ── CSV import ─────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_csv(request):
    csv_file = request.FILES.get('file')
    if not csv_file:
        return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
    if not csv_file.name.endswith('.csv'):
        return Response({'error': 'File must be a .csv'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        stats = import_guests_from_fileobj(csv_file)
    except Exception as e:
        return Response({'error': f'Import failed: {e}'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(stats, status=status.HTTP_200_OK)
