from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0065_refund_shop'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordershopstatus',
            name='pickup_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='ordershopstatus',
            name='pickup_expire_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='ordershopstatus',
            name='refund_expire_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]