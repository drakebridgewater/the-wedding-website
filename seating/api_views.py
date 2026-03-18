from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from guests.models import Guest
from .models import SeatingConfig, SeatingTable
from .serializers import GuestSeatingSerializer, SeatingConfigSerializer, SeatingTableSerializer


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def seating_config(request):
    config = SeatingConfig.get()
    if request.method == 'GET':
        return Response(SeatingConfigSerializer(config).data)
    serializer = SeatingConfigSerializer(config, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def table_list(request):
    if request.method == 'GET':
        tables = SeatingTable.objects.prefetch_related('guests')
        return Response(SeatingTableSerializer(tables, many=True).data)
    serializer = SeatingTableSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def table_detail(request, pk):
    try:
        table = SeatingTable.objects.prefetch_related('guests').get(pk=pk)
    except SeatingTable.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'DELETE':
        table.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = SeatingTableSerializer(table, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def guest_seating_list(request):
    guests = Guest.objects.filter(is_attending=True).order_by('last_name', 'first_name')
    return Response(GuestSeatingSerializer(guests, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def guest_color(request, pk):
    try:
        guest = Guest.objects.get(pk=pk)
    except Guest.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    guest.seat_color = request.data.get('color', '')
    guest.save(update_fields=['seat_color'])
    return Response(GuestSeatingSerializer(guest).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def guest_assign(request, pk):
    try:
        guest = Guest.objects.get(pk=pk)
    except Guest.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    table_id = request.data.get('table_id')
    if table_id is None:
        guest.seating_table = None
    else:
        try:
            guest.seating_table = SeatingTable.objects.get(pk=table_id)
        except SeatingTable.DoesNotExist:
            return Response({'error': 'Table not found'}, status=status.HTTP_400_BAD_REQUEST)
    guest.save(update_fields=['seating_table'])
    return Response(GuestSeatingSerializer(guest).data)
