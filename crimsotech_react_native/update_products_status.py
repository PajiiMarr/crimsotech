# Update existing draft products to published status
import os
import sys
import django

# Add the backend directory to the system path
sys.path.append(r'C:\Users\mashu\Desktop\crimsotech-main\crimsotech_django\backend')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Product

# Count total products
total_products = Product.objects.count()
print(f"Total products in database: {total_products}")

# Count draft products
draft_products = Product.objects.filter(upload_status='draft')
draft_count = draft_products.count()
print(f"Draft products to update: {draft_count}")

if draft_count > 0:
    # Update all draft products to published status
    updated_count = draft_products.update(upload_status='published')
    print(f"Updated {updated_count} products to 'published' status")
else:
    print("No draft products to update")

# Count published products
published_count = Product.objects.filter(upload_status='published').count()
print(f"Published products after update: {published_count}")

print("Products status update completed!")