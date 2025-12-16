from django.db import migrations, models
import uuid
from decimal import Decimal


def forwards(apps, schema_editor):
    Product = apps.get_model('api', 'Product')
    ProductSKU = apps.get_model('api', 'ProductSKU')
    Category = apps.get_model('api', 'Category')
    SwapConfig = apps.get_model('api', 'SwapConfig')

    # Migrate product-level swap fields into SwapConfig
    for p in Product.objects.all():
        # Create SwapConfig even if defaults to preserve backwards compatibility
        sc = SwapConfig.objects.create(
            product_id=p.id,
            swap_type=getattr(p, 'swap_type', 'direct_swap') or 'direct_swap',
            minimum_additional_payment=getattr(p, 'minimum_additional_payment', Decimal('0.00')),
            maximum_additional_payment=getattr(p, 'maximum_additional_payment', Decimal('0.00')),
            swap_description=getattr(p, 'swap_description', '') or ''
        )
        # Copy accepted_categories if any
        try:
            cats = getattr(p, 'accepted_categories').all()
            for c in cats:
                sc.accepted_categories.add(c)
        except Exception:
            pass

    # Migrate per-SKU swap fields into SwapConfig
    for sku in ProductSKU.objects.all():
        sc = SwapConfig.objects.create(
            sku_id=sku.id,
            swap_type=getattr(sku, 'swap_type', 'direct_swap') or 'direct_swap',
            minimum_additional_payment=getattr(sku, 'minimum_additional_payment', Decimal('0.00')),
            maximum_additional_payment=getattr(sku, 'maximum_additional_payment', Decimal('0.00')),
            swap_description=getattr(sku, 'swap_description', '') or ''
        )
        try:
            cats = getattr(sku, 'accepted_categories').all()
            for c in cats:
                sc.accepted_categories.add(c)
        except Exception:
            pass


def reverse(apps, schema_editor):
    # No-op reverse: keep data
    return


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0039_add_productsku'),
    ]

    operations = [
        migrations.CreateModel(
            name='SwapConfig',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)),
                ('swap_type', models.CharField(max_length=30, default='direct_swap')),
                ('minimum_additional_payment', models.DecimalField(max_digits=9, decimal_places=2, default='0.00')),
                ('maximum_additional_payment', models.DecimalField(max_digits=9, decimal_places=2, default='0.00')),
                ('swap_description', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.OneToOneField(blank=True, null=True, on_delete=models.CASCADE, related_name='swap_config', to='api.product')),
                ('sku', models.OneToOneField(blank=True, null=True, on_delete=models.CASCADE, related_name='swap_config', to='api.productsku')),
            ],
        ),
        migrations.AddField(
            model_name='swapconfig',
            name='accepted_categories',
            field=models.ManyToManyField(related_name='swap_configs', to='api.Category', blank=True),
        ),
        migrations.RunPython(forwards, reverse_code=reverse),
    ]
