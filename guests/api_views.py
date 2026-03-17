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


# ── Wedding party members ──────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def members(request):
    if request.method == 'GET':
        qs = WeddingPartyMember.objects.all()
        return Response(WeddingPartyMemberSerializer(qs, many=True).data)

    serializer = WeddingPartyMemberSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


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
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = WeddingPartyMemberSerializer(obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


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
