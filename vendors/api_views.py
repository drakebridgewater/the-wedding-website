from django.contrib.contenttypes.models import ContentType
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    CakeOption,
    CatererOption,
    EntertainmentOption,
    FloristOption,
    VendorChecklistItem,
    VendorPhoto,
    VenueOption,
)
from .serializers import (
    CakeSerializer,
    CatererSerializer,
    EntertainmentSerializer,
    FloristSerializer,
    VendorChecklistItemSerializer,
    VendorPhotoSerializer,
    VenueSerializer,
)

VENDOR_REGISTRY = {
    'venue':         (VenueOption,         VenueSerializer),
    'caterer':       (CatererOption,       CatererSerializer),
    'cake':          (CakeOption,          CakeSerializer),
    'florist':       (FloristOption,       FloristSerializer),
    'entertainment': (EntertainmentOption, EntertainmentSerializer),
}


def _resolve(vendor_type):
    entry = VENDOR_REGISTRY.get(vendor_type)
    if entry is None:
        return None, None, Response(
            {'error': f'Unknown vendor type: {vendor_type}'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return entry[0], entry[1], None


def _qs(model):
    return model.objects.prefetch_related('photos')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def vendor_list(request, vendor_type):
    Model, Serializer, err = _resolve(vendor_type)
    if err:
        return err

    if request.method == 'GET':
        qs = _qs(Model)
        return Response(Serializer(qs, many=True, context={'request': request}).data)

    serializer = Serializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def vendor_detail(request, vendor_type, pk):
    Model, Serializer, err = _resolve(vendor_type)
    if err:
        return err

    instance = get_object_or_404(_qs(Model), pk=pk)

    if request.method == 'GET':
        return Response(Serializer(instance, context={'request': request}).data)

    if request.method == 'DELETE':
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == 'PATCH'
    serializer = Serializer(instance, data=request.data, partial=partial, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    # Re-fetch to get fresh prefetched photos
    refreshed = _qs(Model).get(pk=instance.pk)
    return Response(Serializer(refreshed, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_photo_upload(request, vendor_type, pk):
    Model, _, err = _resolve(vendor_type)
    if err:
        return err

    instance = get_object_or_404(Model, pk=pk)
    ct = ContentType.objects.get_for_model(Model)

    files = request.FILES.getlist('images')
    if not files:
        return Response({'error': 'No images provided.'}, status=status.HTTP_400_BAD_REQUEST)

    created = []
    for f in files:
        photo = VendorPhoto.objects.create(
            content_type=ct,
            object_id=instance.pk,
            image=f,
            caption=request.data.get('caption', ''),
        )
        created.append(VendorPhotoSerializer(photo, context={'request': request}).data)

    return Response(created, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def vendor_checklist_items(request):
    vendor_type = request.GET.get('vendor_type', 'venue')
    items = VendorChecklistItem.objects.filter(vendor_type=vendor_type, is_active=True)
    return Response(VendorChecklistItemSerializer(items, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def vendor_photo_delete(request, photo_pk):
    photo = get_object_or_404(VendorPhoto, pk=photo_pk)
    photo.image.delete(save=False)
    photo.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
