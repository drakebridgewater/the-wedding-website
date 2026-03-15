from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from guests.models import WeddingPartyMember, WeddingPartyGroup
from guests.serializers import WeddingPartyMemberSerializer, WeddingPartyGroupSerializer
from .models import ScheduleDay, ScheduleEvent
from .serializers import ScheduleDaySerializer, ScheduleEventSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def schedule_members(request):
    members = WeddingPartyMember.objects.all()
    return Response(WeddingPartyMemberSerializer(members, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def schedule_groups(_request):
    groups = WeddingPartyGroup.objects.prefetch_related('members').all()
    return Response(WeddingPartyGroupSerializer(groups, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def schedule_days(request):
    if request.method == 'GET':
        days = ScheduleDay.objects.prefetch_related('events__attendees').all()
        return Response(ScheduleDaySerializer(days, many=True).data)

    serializer = ScheduleDaySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def schedule_day_detail(request, pk):
    try:
        day = ScheduleDay.objects.prefetch_related('events__attendees').get(pk=pk)
    except ScheduleDay.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ScheduleDaySerializer(day).data)

    if request.method == 'DELETE':
        day.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == 'PATCH'
    serializer = ScheduleDaySerializer(day, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def schedule_events(request, day_pk):
    try:
        day = ScheduleDay.objects.get(pk=day_pk)
    except ScheduleDay.DoesNotExist:
        return Response({'error': 'Day not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        events = day.events.prefetch_related('attendees').all()
        return Response(ScheduleEventSerializer(events, many=True).data)

    data = request.data.copy()
    data['day'] = day.pk
    serializer = ScheduleEventSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def schedule_event_detail(request, pk):
    try:
        event = ScheduleEvent.objects.prefetch_related('attendees').get(pk=pk)
    except ScheduleEvent.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ScheduleEventSerializer(event).data)

    if request.method == 'DELETE':
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == 'PATCH'
    serializer = ScheduleEventSerializer(event, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
