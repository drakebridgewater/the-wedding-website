from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .importer import fetch_idea_from_url
from .models import Idea, IdeaTag
from .serializers import IdeaSerializer, IdeaTagSerializer


def _ctx(request):
    return {'request': request}


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def idea_list(request):
    if request.method == 'GET':
        qs = Idea.objects.all().prefetch_related('tags')

        tag = request.query_params.get('tag')
        if tag:
            qs = qs.filter(tags__id=tag)

        source = request.query_params.get('source')
        if source:
            qs = qs.filter(source=source)

        favorite = request.query_params.get('favorite')
        if favorite in ('1', 'true', 'True'):
            qs = qs.filter(is_favorite=True)

        q = request.query_params.get('q')
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

        return Response(IdeaSerializer(qs.distinct(), many=True, context=_ctx(request)).data)

    serializer = IdeaSerializer(data=request.data, context=_ctx(request))
    serializer.is_valid(raise_exception=True)
    serializer.save(created_by=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def idea_detail(request, pk):
    try:
        idea = Idea.objects.get(pk=pk)
    except Idea.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(IdeaSerializer(idea, context=_ctx(request)).data)

    if request.method == 'DELETE':
        idea.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = IdeaSerializer(idea, data=request.data, partial=True, context=_ctx(request))
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def idea_upload(request):
    """Multipart upload: one Idea per file in `images`."""
    files = request.FILES.getlist('images')
    if not files:
        return Response({'error': 'No images provided.'}, status=status.HTTP_400_BAD_REQUEST)

    title = request.data.get('title', '')
    created = []
    for f in files:
        idea = Idea.objects.create(
            title=title,
            image=f,
            source=Idea.SOURCE_MANUAL,
            created_by=request.user,
        )
        created.append(IdeaSerializer(idea, context=_ctx(request)).data)

    return Response(created, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def idea_fetch_url(request):
    """Create an Idea from a pasted page / pin / image URL."""
    url = request.data.get('url', '').strip()
    if not url:
        return Response({'error': 'url is required'}, status=status.HTTP_400_BAD_REQUEST)

    idea = fetch_idea_from_url(url, created_by=request.user)
    if idea is None:
        return Response(
            {'error': 'Could not find an image at that URL.'},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    return Response(IdeaSerializer(idea, context=_ctx(request)).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tag_list(request):
    if request.method == 'GET':
        return Response(IdeaTagSerializer(IdeaTag.objects.all(), many=True).data)

    serializer = IdeaTagSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def tag_detail(request, pk):
    try:
        tag = IdeaTag.objects.get(pk=pk)
    except IdeaTag.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    tag.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pinterest_sync(request):
    """Pull pins from the configured Pinterest board into Ideas."""
    from django.conf import settings

    board_id = request.data.get('board_id') or getattr(settings, 'PINTEREST_BOARD_ID', '')
    if not board_id:
        return Response(
            {'error': 'No Pinterest board configured. Set PINTEREST_BOARD_ID or pass board_id.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        from . import pinterest_client
        count = pinterest_client.sync_board_to_db(board_id, created_by=request.user)
    except pinterest_client.PinterestAuthError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:  # noqa: BLE001 - surface a readable message to the UI
        return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    return Response({'imported': count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pinterest_boards(request):
    """List the authenticated user's Pinterest boards (for a picker)."""
    try:
        from . import pinterest_client
        boards = pinterest_client.get_boards()
    except pinterest_client.PinterestAuthError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:  # noqa: BLE001
        return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
    return Response(boards)
