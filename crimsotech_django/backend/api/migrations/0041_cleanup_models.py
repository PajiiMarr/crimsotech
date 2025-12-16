from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0040_add_swapconfig'),
    ]

    operations = [
        # Remove product-level swap fields
        migrations.RemoveField(
            model_name='product',
            name='open_for_swap',
        ),
        migrations.RemoveField(
            model_name='product',
            name='swap_type',
        ),
        migrations.RemoveField(
            model_name='product',
            name='accepted_categories',
        ),
        migrations.RemoveField(
            model_name='product',
            name='minimum_additional_payment',
        ),
        migrations.RemoveField(
            model_name='product',
            name='maximum_additional_payment',
        ),
        migrations.RemoveField(
            model_name='product',
            name='swap_description',
        ),

        # Simplify VariantOptions: remove extra fields
        migrations.RemoveField(
            model_name='variantoptions',
            name='quantity',
        ),
        migrations.RemoveField(
            model_name='variantoptions',
            name='price',
        ),
        migrations.RemoveField(
            model_name='variantoptions',
            name='compare_price',
        ),
        migrations.RemoveField(
            model_name='variantoptions',
            name='length',
        ),
        migrations.RemoveField(
            model_name='variantoptions',
            name='width',
        ),
        migrations.RemoveField(
            model_name='variantoptions',
            name='height',
        ),
        migrations.RemoveField(
            model_name='variantoptions',
            name='weight',
        ),
        migrations.RemoveField(
            model_name='variantoptions',
            name='weight_unit',
        ),
        migrations.AddField(
            model_name='variantoptions',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),

        # Delete SwapConfig model (legacy from previous attempt)
        migrations.DeleteModel(
            name='SwapConfig',
        ),
    ]
