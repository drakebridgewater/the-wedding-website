from django.db import models


class SeatingConfig(models.Model):
    """Singleton model — stores venue grid dimensions."""
    grid_cols = models.PositiveIntegerField(default=12)
    grid_rows = models.PositiveIntegerField(default=10)
    cell_size_ft = models.DecimalField(
        max_digits=5, decimal_places=1, default=2.0,
        help_text='Real-world size of one grid cell in feet.',
    )

    class Meta:
        verbose_name = 'Seating Config'
        verbose_name_plural = 'Seating Config'

    def __str__(self):
        return f'Seating Config ({self.grid_cols}×{self.grid_rows})'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class SeatingTable(models.Model):
    SHAPE_CHOICES = [
        ('round', 'Round'),
        ('square', 'Square'),
    ]

    name = models.CharField(max_length=100)
    capacity = models.PositiveIntegerField(default=8)
    shape = models.CharField(max_length=10, choices=SHAPE_CHOICES, default='round')
    grid_x = models.IntegerField(default=0, help_text='Left column (0-indexed)')
    grid_y = models.IntegerField(default=0, help_text='Top row (0-indexed)')
    grid_width = models.PositiveIntegerField(default=2, help_text='Width in grid cells')
    grid_height = models.PositiveIntegerField(default=2, help_text='Height in grid cells')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def assigned_count(self):
        return self.guests.count()
