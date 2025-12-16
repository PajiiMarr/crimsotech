from django.db import migrations, models
import uuid
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0038_product_accepted_categories_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductSKU',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)),
                ('option_ids', models.JSONField(blank=True, null=True)),
                ('option_map', models.JSONField(blank=True, null=True)),
                ('price', models.DecimalField(decimal_places=2, max_digits=9, null=True, blank=True)),
                ('compare_price', models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)),
                ('quantity', models.IntegerField(default=0)),
                ('length', models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)),
                ('width', models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)),
                ('height', models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)),
                ('weight', models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)),
                ('weight_unit', models.CharField(max_length=10, default='g', blank=True)),
                ('sku_code', models.CharField(max_length=100, blank=True, null=True)),
                ('critical_trigger', models.IntegerField(null=True, blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('allow_swap', models.BooleanField(default=False)),
                ('swap_type', models.CharField(max_length=30, default='direct_swap')),
                ('minimum_additional_payment', models.DecimalField(max_digits=9, decimal_places=2, default='0.00')),
                ('maximum_additional_payment', models.DecimalField(max_digits=9, decimal_places=2, default='0.00')),
                ('swap_description', models.TextField(blank=True, null=True)),
                ('image', models.ImageField(upload_to='product/skus/', null=True, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='skus', to='api.product')),
            ],
        ),
        migrations.AddField(
            model_name='productsku',
            name='accepted_categories',
            field=models.ManyToManyField(related_name='accepted_for_sku_swaps', to='api.Category', blank=True),
        ),
    ]
