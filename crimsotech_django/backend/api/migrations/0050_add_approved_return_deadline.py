# Generated migration to add approved_at and return_deadline to Refund
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0049_refundbank_refundremittance_refundwallet_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='refund',
            name='approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='refund',
            name='return_deadline',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
