from django.db import models


class TickTickSettings(models.Model):
    """Singleton model — only one row (pk=1) should ever exist."""

    client_id = models.CharField(max_length=200, blank=True)
    client_secret = models.CharField(max_length=200, blank=True)
    username = models.EmailField(blank=True, help_text='TickTick account email')
    password = models.CharField(
        max_length=200, blank=True,
        help_text='TickTick account password. Stored in the database — ensure your admin is accessed over HTTPS in production.',
    )
    project_name = models.CharField(
        max_length=100, default='Wedding',
        help_text='Name of the TickTick project to sync (case-insensitive).',
    )
    drake_assignee_id = models.CharField(
        max_length=200, blank=True,
        help_text='TickTick assignee ID for Drake. Run `manage.py ticktick_auth` to find this value.',
    )
    shawna_assignee_id = models.CharField(
        max_length=200, blank=True,
        help_text='TickTick assignee ID for Shawna. Run `manage.py ticktick_auth` to find this value.',
    )

    class Meta:
        verbose_name = 'TickTick Settings'
        verbose_name_plural = 'TickTick Settings'

    def __str__(self):
        return 'TickTick Settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
