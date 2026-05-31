from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wedding', '0005_honeymoon_fund'),
    ]

    operations = [
        migrations.CreateModel(
            name='PageSectionItem',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('section', models.CharField(
                    choices=[
                        ('welcome', 'Welcome'),
                        ('event', 'The Event'),
                        ('getting_there', 'Getting There'),
                        ('good_to_know', 'Good to Know'),
                        ('proposal', 'The Proposal'),
                    ],
                    db_index=True,
                    max_length=20,
                )),
                ('title', models.CharField(max_length=200)),
                ('body', models.TextField(blank=True, help_text='Supports basic HTML.')),
                ('order', models.PositiveIntegerField(default=0)),
                ('is_published', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Page Section Item',
                'verbose_name_plural': 'Page Section Items',
                'ordering': ['section', 'order', 'id'],
            },
        ),
    ]
