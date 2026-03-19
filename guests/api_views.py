from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import EmailTemplate, Guest, Party, SentEmail, WeddingPartyGroup, WeddingPartyMember
from .serializers import (
    EmailTemplateSerializer,
    GuestSerializer,
    PartySerializer,
    SentEmailSerializer,
    WeddingPartyGroupSerializer,
    WeddingPartyMemberSerializer,
)
from .csv_import import import_guests_from_fileobj


def _parse_name(full_name):
    """Split 'First Last Name' into (first, rest)."""
    parts = full_name.strip().split(' ', 1)
    return parts[0], parts[1] if len(parts) > 1 else ''


# ── Wedding party members ──────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def members(request):
    if request.method == 'GET':
        qs = WeddingPartyMember.objects.all()
        return Response(WeddingPartyMemberSerializer(qs, many=True).data)

    serializer = WeddingPartyMemberSerializer(data=request.data)
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
    return Response(WeddingPartyMemberSerializer(member).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def member_detail(request, pk):
    try:
        obj = WeddingPartyMember.objects.get(pk=pk)
    except WeddingPartyMember.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(WeddingPartyMemberSerializer(obj).data)

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

    return Response(WeddingPartyMemberSerializer(member).data)


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
        return Response(EmailTemplateSerializer(qs, many=True).data)

    serializer = EmailTemplateSerializer(data=request.data)
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
        return Response(EmailTemplateSerializer(obj).data)
    if request.method == 'DELETE':
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = EmailTemplateSerializer(obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def email_template_preview(_request, pk):
    """Return subject + body rendered with dummy party data."""
    try:
        obj = EmailTemplate.objects.get(pk=pk)
    except EmailTemplate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    from django.conf import settings

    # Dummy party for preview
    class _DummyParty:
        name = 'The Smith Family'
        invitation_id = 'preview'
        def guest_set(self): pass

    class _DummyGuest:
        first_name = 'Jane'

    class _Qs:
        def first(self): return _DummyGuest()

    dummy = _DummyParty()
    dummy.guest_set = _Qs()

    site_url = getattr(settings, 'WEDDING_WEBSITE_URL', 'https://example.com')
    # Build a fake rsvp_link without reverse (preview only)
    rsvp_link = site_url.rstrip('/') + '/invite/preview/'
    body = obj.body_html
    subject = obj.subject
    for token, value in {
        '{{party_name}}': dummy.name,
        '{{first_name}}': 'Jane',
        '{{rsvp_link}}': rsvp_link,
        '{{couple}}': getattr(settings, 'BRIDE_AND_GROOM', 'Drake & Shawna'),
    }.items():
        body = body.replace(token, value)
        subject = subject.replace(token, value)

    return Response({'subject': subject, 'body_html': body})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def email_template_send(request, pk):
    """Send template to a list of party IDs. Body: { party_ids: [1, 2, ...] }"""
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
