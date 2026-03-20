from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.db import models
from djmoney.models.fields import MoneyField


class VenueChecklistItem(models.Model):
    category = models.CharField(max_length=100)
    text = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.category}: {self.text}"


class VendorPhoto(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    vendor = GenericForeignKey('content_type', 'object_id')
    image = models.ImageField(upload_to='vendors/%Y/%m/')
    caption = models.CharField(max_length=255, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'uploaded_at']

    def __str__(self):
        return f"Photo {self.pk} ({self.content_type} #{self.object_id})"


class BaseVendorOption(models.Model):
    name = models.CharField(max_length=255)
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)

    is_chosen = models.BooleanField(default=False)
    is_favorite = models.BooleanField(default=False)
    has_talked_to = models.BooleanField(default=False)
    has_visited = models.BooleanField(default=False)

    price_estimate = MoneyField(
        max_digits=10, decimal_places=2,
        default_currency='USD', null=True, blank=True,
    )
    rating = models.PositiveSmallIntegerField(
        null=True, blank=True,
        choices=[(i, str(i)) for i in range(1, 6)],
    )

    address = models.CharField(max_length=500, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    positives = models.TextField(blank=True)
    negatives = models.TextField(blank=True)
    comments = models.TextField(blank=True)

    photos = GenericRelation(VendorPhoto)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-is_favorite', '-is_chosen', 'name']

    def __str__(self):
        return self.name


class VenueOption(BaseVendorOption):
    STYLE_CHOICES = [
        ('rustic', 'Rustic'),
        ('modern', 'Modern'),
        ('garden', 'Garden'),
        ('ballroom', 'Ballroom'),
        ('barn', 'Barn'),
        ('industrial', 'Industrial'),
        ('other', 'Other'),
    ]

    capacity = models.PositiveIntegerField(null=True, blank=True)
    style = models.CharField(max_length=20, choices=STYLE_CHOICES, blank=True)
    has_parking = models.BooleanField(default=False)
    catering_included = models.BooleanField(default=False)
    accommodation_nearby = models.BooleanField(default=False)
    is_indoor = models.BooleanField(default=False)
    is_outdoor = models.BooleanField(default=False)
    checklist = models.JSONField(default=list, blank=True)

    class Meta(BaseVendorOption.Meta):
        verbose_name = 'Venue Option'
        verbose_name_plural = 'Venue Options'


class CatererOption(BaseVendorOption):
    CUISINE_CHOICES = [
        ('american', 'American'),
        ('italian', 'Italian'),
        ('mediterranean', 'Mediterranean'),
        ('asian', 'Asian Fusion'),
        ('mexican', 'Mexican'),
        ('bbq', 'BBQ'),
        ('other', 'Other'),
    ]

    price_per_head = MoneyField(
        max_digits=8, decimal_places=2,
        default_currency='USD', null=True, blank=True,
    )
    cuisine_type = models.CharField(max_length=20, choices=CUISINE_CHOICES, blank=True)
    has_vegetarian = models.BooleanField(default=False)
    has_vegan = models.BooleanField(default=False)
    has_gluten_free = models.BooleanField(default=False)
    tasting_scheduled = models.BooleanField(default=False)
    tasting_completed = models.BooleanField(default=False)

    class Meta(BaseVendorOption.Meta):
        verbose_name = 'Caterer Option'
        verbose_name_plural = 'Caterer Options'


class CakeOption(BaseVendorOption):
    price_per_serving = MoneyField(
        max_digits=6, decimal_places=2,
        default_currency='USD', null=True, blank=True,
    )
    flavors = models.CharField(max_length=500, blank=True)
    custom_design_available = models.BooleanField(default=False)
    tasting_scheduled = models.BooleanField(default=False)
    tasting_completed = models.BooleanField(default=False)

    class Meta(BaseVendorOption.Meta):
        verbose_name = 'Cake Option'
        verbose_name_plural = 'Cake Options'


class FloristOption(BaseVendorOption):
    STYLE_CHOICES = [
        ('romantic', 'Romantic'),
        ('modern', 'Modern'),
        ('wildflower', 'Wildflower'),
        ('tropical', 'Tropical'),
        ('minimalist', 'Minimalist'),
        ('classic', 'Classic'),
        ('other', 'Other'),
    ]

    arrangement_types = models.CharField(max_length=500, blank=True)
    style = models.CharField(max_length=20, choices=STYLE_CHOICES, blank=True)
    minimum_order = MoneyField(
        max_digits=8, decimal_places=2,
        default_currency='USD', null=True, blank=True,
    )

    class Meta(BaseVendorOption.Meta):
        verbose_name = 'Florist Option'
        verbose_name_plural = 'Florist Options'


class EntertainmentOption(BaseVendorOption):
    TYPE_CHOICES = [
        ('dj', 'DJ'),
        ('band', 'Band'),
        ('both', 'DJ + Band'),
    ]

    type = models.CharField(max_length=10, choices=TYPE_CHOICES, blank=True)
    num_members = models.PositiveSmallIntegerField(null=True, blank=True)
    genres = models.CharField(max_length=500, blank=True)
    package_details = models.TextField(blank=True)
    sample_link = models.URLField(blank=True)
    performance_duration_hours = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
    )

    class Meta(BaseVendorOption.Meta):
        verbose_name = 'Entertainment Option'
        verbose_name_plural = 'Entertainment Options'
