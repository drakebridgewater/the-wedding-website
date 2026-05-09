from django.db import models


PROVIDER_TICKTICK = 'ticktick'
PROVIDER_TODOIST = 'todoist'
PROVIDER_CHOICES = [
    (PROVIDER_TICKTICK, 'TickTick'),
    (PROVIDER_TODOIST, 'Todoist'),
]


class Task(models.Model):
    """Local mirror of a remote task. Populated by the sync endpoint.

    `provider` identifies the source system; `external_id` is that system's
    task id. The pair is unique. Priority is normalised to TickTick's scale
    (0/1/3/5) at serialize time so the frontend can stay provider-agnostic.
    """

    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        default=PROVIDER_TODOIST,
    )
    external_id = models.CharField(max_length=200)
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
        constraints = [
            models.UniqueConstraint(
                fields=['provider', 'external_id'],
                name='todos_task_unique_provider_external_id',
            ),
        ]

    def __str__(self):
        return self.title

    def to_dict(self) -> dict:
        return {
            'id': self.external_id,
            'provider': self.provider,
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


class TodoistSettings(models.Model):
    """Singleton model — only one row (pk=1) should ever exist.

    Todoist uses a long-lived personal API token (Settings → Integrations →
    Developer in the Todoist app), so there's no client_id/secret/refresh
    flow to worry about.
    """

    api_token = models.CharField(
        max_length=200, blank=True,
        help_text=(
            'Todoist API token. Get one at Todoist → Settings → Integrations → '
            'Developer → "API token". Stored in the database — ensure your '
            'admin is accessed over HTTPS in production.'
        ),
    )
    project_name = models.CharField(
        max_length=100, default='Wedding',
        help_text='Name of the Todoist project to sync (case-insensitive).',
    )
    drake_assignee_id = models.CharField(
        max_length=200, blank=True,
        help_text='Todoist user (collaborator) ID for Drake. Run `manage.py todoist_setup` to find this value.',
    )
    shawna_assignee_id = models.CharField(
        max_length=200, blank=True,
        help_text='Todoist user (collaborator) ID for Shawna. Run `manage.py todoist_setup` to find this value.',
    )

    class Meta:
        verbose_name = 'Todoist Settings'
        verbose_name_plural = 'Todoist Settings'

    def __str__(self):
        return 'Todoist Settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
