from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Song
from .serializers import SongSerializer
from .oembed import fetch_metadata


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def song_list(request):
    if request.method == 'GET':
        qs = Song.objects.all()
        list_type = request.query_params.get('list_type')
        if list_type:
            qs = qs.filter(list_type=list_type)
        return Response(SongSerializer(qs, many=True).data)

    serializer = SongSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def song_detail(request, pk):
    try:
        song = Song.objects.get(pk=pk)
    except Song.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        song.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = SongSerializer(song, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def fetch_url(request):
    url = request.data.get('url', '')
    if not url:
        return Response({'error': 'url is required'}, status=status.HTTP_400_BAD_REQUEST)
    metadata = fetch_metadata(url)
    return Response(metadata)
