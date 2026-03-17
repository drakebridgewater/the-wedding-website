from django.db import models


class Task(models.Model):
    """Local mirror of a TickTick task. Populated by the sync endpoint."""

    ticktick_id = models.CharField(max_length=200, unique=True)
    project_id = models.CharField(max_length=200, blank=True)
    title = models.CharField(max_length=500)
    content = models.TextField(blank=True)
    status = models.IntegerField(default=0)       # 0=active, 2=completed
    priority = models.IntegerField(default=0)     # 0=none, 1=low, 3=medium, 5=high
    due_date = models.CharField(max_length=50, blank=True)
    start_date = models.CharField(max_length=50, blank=True)
    assignee = models.CharField(max_length=200, blank=True)
    tags = models.JSONField(default=list)
    created_time = models.CharField(max_length=50, blank=True)
    modified_time = models.CharField(max_length=50, blank=True)
    last_synced = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', 'title']

    def __str__(self):
        return self.title

    def to_dict(self) -> dict:
        return {
            'id': self.ticktick_id,
            'title': self.title,
            'content': self.content,
            'priority': self.priority,
            'status': self.status,
            'due_date': self.due_date or None,
            'start_date': self.start_date or None,
            'assignee': self.assignee or None,
            'tags': self.tags,
            'created_time': self.created_time or None,
            'modified_time': self.modified_time or None,
            'project_id': self.project_id,
        }


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
