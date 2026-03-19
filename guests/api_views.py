from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Guest, Party, WeddingPartyGroup, WeddingPartyMember
from .serializers import (
    GuestSerializer,
    PartySerializer,
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
    try:
        obj = Party.objects.prefetch_related('guest_set').get(pk=pk)
    except Party.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(PartySerializer(obj).data)
    if request.method == 'DELETE':
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

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
    try:
        obj = Guest.objects.get(pk=pk)
    except Guest.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = GuestSerializer(obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


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
