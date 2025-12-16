from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0043_merge_20251216_1520'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='variantoptions',
            name='image',
        ),
    ]
