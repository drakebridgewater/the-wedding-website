"""Add provider abstraction so the todos app can sync from either TickTick or
Todoist based on the TODO_PROVIDER setting.

The local Task table is a pure cache (the source of truth lives in the remote
provider), so we wipe existing rows before renaming the id column. After the
migration runs you should hit the sync endpoint to repopulate.
"""
from django.db import migrations, models


def wipe_tasks(apps, _schema_editor):
    Task = apps.get_model('todos', 'Task')
    Task.objects.all().delete()


def noop_reverse(apps, _schema_editor):
    # Reverse is fine — we'd just have to re-sync after rolling back.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('todos', '0001_initial'),
    ]

    operations = [
        # 1) Drop existing rows — this is a cache, the remote system is canonical.
        migrations.RunPython(wipe_tasks, reverse_code=noop_reverse),

        # 2) Drop the old unique=True before renaming so the constraint name
        #    doesn't survive the column rename.
        migrations.AlterField(
            model_name='task',
            name='ticktick_id',
            field=models.CharField(max_length=200),
        ),

        # 3) Rename ticktick_id -> external_id.
        migrations.RenameField(
            model_name='task',
            old_name='ticktick_id',
            new_name='external_id',
        ),

        # 4) Add provider column (default 'todoist' since you've moved off TickTick).
        migrations.AddField(
            model_name='task',
            name='provider',
            field=models.CharField(
                choices=[('ticktick', 'TickTick'), ('todoist', 'Todoist')],
                default='todoist',
                max_length=20,
            ),
        ),

        # 5) Compound uniqueness on (provider, external_id).
        migrations.AddConstraint(
            model_name='task',
            constraint=models.UniqueConstraint(
                fields=('provider', 'external_id'),
                name='todos_task_unique_provider_external_id',
            ),
        ),

        # 6) New TodoistSettings singleton.
        migrations.CreateModel(
            name='TodoistSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('api_token', models.CharField(
                    blank=True, max_length=200,
                    help_text=(
                        'Todoist API token. Get one at Todoist → Settings → Integrations → '
                        'Developer → "API token". Stored in the database — ensure your '
                        'admin is accessed over HTTPS in production.'
                    ),
                )),
                ('project_name', models.CharField(
                    default='Wedding', max_length=100,
                    help_text='Name of the Todoist project to sync (case-insensitive).',
                )),
                ('drake_assignee_id', models.CharField(
                    blank=True, max_length=200,
                    help_text='Todoist user (collaborator) ID for Drake. Run `manage.py todoist_setup` to find this value.',
                )),
                ('shawna_assignee_id', models.CharField(
                    blank=True, max_length=200,
                    help_text='Todoist user (collaborator) ID for Shawna. Run `manage.py todoist_setup` to find this value.',
                )),
            ],
            options={
                'verbose_name': 'Todoist Settings',
                'verbose_name_plural': 'Todoist Settings',
            },
        ),
    ]
