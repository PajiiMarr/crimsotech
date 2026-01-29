from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_add_final_refund_type'),  # replace with your last migration
    ]

    operations = [
        migrations.AddField(
            model_name='refund',
            name='final_refund_type',
            field=models.CharField(max_length=50, blank=True, null=True),
        ),
    ]
