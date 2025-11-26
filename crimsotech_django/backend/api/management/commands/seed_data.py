from django.apps import apps
from django.db.models import Count, Q, Sum
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import *
from django.contrib.auth.hashers import make_password
from decimal import Decimal
import uuid
from datetime import datetime, timedelta
from django.utils import timezone
import random

class Command(BaseCommand):
    help = "Seed the database with comprehensive shop and product data"

    def handle(self, *args, **kwargs):
            """Updated handle method with refund data creation"""
            self.cleanup_existing_data()
            
            self.stdout.write("🌱 Starting comprehensive shop data seeding...")
            
            try:
                with transaction.atomic():
                    # Create admin user first
                    admin_user = self.create_admin_user()
                    
                    # Create customers and shops matching frontend data
                    customers, shops = self.create_customers_and_shops()
                    
                    # Create categories
                    categories = self.create_categories(shops, admin_user)
                    
                    # Create products matching frontend data
                    products = self.create_products(customers, shops, categories, admin_user)

                    self.create_engagement_data()
                    
                    # Create boosts and boost plans
                    self.create_boosts_and_plans(products, shops, customers, admin_user)
                    
                    # Create shop follows (followers)
                    self.create_shop_follows(shops, customers)
                    
                    # Create reviews for shops and products
                    self.create_reviews(products, shops, customers)
                    
                    # Create additional data
                    self.create_additional_data(products, customers, shops)
                    
                    # Create customer activities
                    self.create_customer_activities(products, customers)
                    
                    # Create comprehensive boost analytics data
                    self.create_boost_analytics_data(products, shops, customers, admin_user)

                    # Create order data
                    self.create_order_data(products, customers, shops, admin_user)

                    # Create checkout data
                    self.create_checkout_data(products, customers, shops, admin_user)
                    
                    # Create checkout analytics data
                    self.create_order_analytics_data()

                    # Create rider data
                    self.create_rider_data(products, customers, shops, admin_user)
                    
                    # CREATE REFUND DATA - ADD THIS LINE
                    self.create_refund_data(products, customers, shops, admin_user)
                    
                    # CREATE REFUND ANALYTICS DATA - ADD THIS LINE
                    self.create_refund_analytics_data()
                    
                    self.stdout.write(self.style.SUCCESS("✅ Comprehensive shop data seeded successfully!"))
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Error seeding data: {str(e)}"))
                raise


    def create_admin_user(self):
        """Create admin user if not exists"""
        user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "password": make_password("crimsotech_admin"),
                "email": "admin@crimsotech.com",
                "first_name": "System",
                "last_name": "Admin",
                "is_admin": True,
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS("✅ Admin user created successfully!"))
        else:
            self.stdout.write(self.style.WARNING("⚠️ Admin user already exists."))

        admin, admin_created = Admin.objects.get_or_create(
            admin=user,
        )

        if admin_created:
            self.stdout.write(self.style.SUCCESS(f"✅ Admin record created for user_id={user.id}!"))
        else:
            self.stdout.write(self.style.WARNING("⚠️ Admin record already exists."))
        
        return user

    def create_customers_and_shops(self):
        """Create customers and shops with real customer references"""
        print("Creating customers and shops...")
        customers = []
        shops = []
        
        # Customer data matching frontend shops
        customer_data = [
            {
                'username': 'tech_haven_owner',
                'email': 'john@techhaven.com',
                'first_name': 'John',
                'last_name': 'Doe',
                'shop_name': 'Tech Haven',
                'location': 'Manila',
                'verified': True,
                'joined_date': '2023-01-15'
            },
            {
                'username': 'gadget_world_owner',
                'email': 'jane@gadgetworld.com',
                'first_name': 'Jane',
                'last_name': 'Smith',
                'shop_name': 'Gadget World',
                'location': 'Quezon City',
                'verified': True,
                'joined_date': '2023-03-22'
            },
            {
                'username': 'keyclack_owner',
                'email': 'mike@keyclack.com',
                'first_name': 'Mike',
                'last_name': 'Johnson',
                'shop_name': 'KeyClack',
                'location': 'Cebu',
                'verified': True,
                'joined_date': '2022-11-08'
            },
            {
                'username': 'display_masters_owner',
                'email': 'sarah@displaymasters.com',
                'first_name': 'Sarah',
                'last_name': 'Lee',
                'shop_name': 'Display Masters',
                'location': 'Manila',
                'verified': False,
                'joined_date': '2023-06-12'
            },
            {
                'username': 'connect_tech_owner',
                'email': 'david@connecttech.com',
                'first_name': 'David',
                'last_name': 'Wong',
                'shop_name': 'Connect Tech',
                'location': 'Davao',
                'verified': True,
                'joined_date': '2023-08-05'
            },
            {
                'username': 'fashion_hub_owner',
                'email': 'maria@fashionhub.com',
                'first_name': 'Maria',
                'last_name': 'Garcia',
                'shop_name': 'Fashion Hub',
                'location': 'Manila',
                'verified': True,
                'joined_date': '2023-02-20'
            },
        ]
        
        for data in customer_data:
            # Create or get user
            user, user_created = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'email': data['email'],
                    'password': make_password('password123'),
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'is_customer': True,
                }
            )
            
            # Create or get customer - this ensures we have a real Customer object
            customer, cust_created = Customer.objects.get_or_create(
                customer=user
            )
            
            if cust_created or user_created:
                customers.append(customer)
                self.stdout.write(self.style.SUCCESS(f"✅ Created customer: {data['first_name']} {data['last_name']}"))
            
            # Check if shop already exists for this customer
            existing_shop = Shop.objects.filter(customer=customer, name=data['shop_name']).first()
            
            if not existing_shop:
                # Create shop with the real customer reference
                shop = Shop.objects.create(
                    customer=customer,  # This is the real Customer object
                    name=data['shop_name'],
                    description=f"Official {data['shop_name']} store - {data['location']}",
                    province="Metro Manila",
                    city=data['location'],
                    barangay="Barangay Test",
                    street="Test Street",
                    contact_number="+639123456789",
                    verified=data['verified']
                )
                
                # Set custom created_at to match frontend joinedDate
                if data['joined_date']:
                    shop.created_at = datetime.strptime(data['joined_date'], '%Y-%m-%d')
                    shop.save()
                
                shops.append(shop)
                self.stdout.write(self.style.SUCCESS(f"✅ Created shop: {data['shop_name']} for customer {user.first_name}"))
            else:
                shops.append(existing_shop)
                self.stdout.write(self.style.WARNING(f"⚠️ Shop already exists: {data['shop_name']}"))
        
        return customers, shops

    def create_categories(self, shops, admin_user):
        """Create product categories"""
        categories_data = [
            'Electronics',
            'Accessories', 
            'Fashion',
            'Home & Living',
            'Sports'
        ]
        
        categories = []
        for name in categories_data:
            # Check if category already exists
            existing_category = Category.objects.filter(name=name).first()
            
            if not existing_category:
                category = Category.objects.create(
                    name=name,
                    shop=shops[0] if shops else None,
                    user=admin_user
                )
                categories.append(category)
                self.stdout.write(self.style.SUCCESS(f"✅ Created category: {name}"))
            else:
                categories.append(existing_category)
                self.stdout.write(self.style.WARNING(f"⚠️ Category already exists: {name}"))
        
        return categories

    def create_products(self, customers, shops, categories, admin_user):
        """Create products with real customer and shop references"""
        # First, get or create admin categories dynamically
        try:
            admin_user_obj = User.objects.get(id=admin_user.id)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Admin user with ID {admin_user.user_id} not found"))
            return []
        
        # Define products data first to extract unique categories
        products_data = [
            # Tech Haven products
            {
                'name': 'iPhone 15 Pro Max 1TB',
                'category': 'Electronics',
                'shop': 'Tech Haven',
                'price': Decimal('1599.99'),
                'quantity': 8,
                'condition': 'New',
                'status': 'Active',
                'description': 'Latest iPhone with 1TB storage',
                'used_for': 'Personal and professional use',
            },
            {
                'name': 'MacBook Pro 16" M3 Max',
                'category': 'Electronics',
                'shop': 'Tech Haven',
                'price': Decimal('3499.99'),
                'quantity': 5,
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional laptop for creatives',
                'used_for': 'Professional work and creative projects',
            },
            # Gadget World products
            {
                'name': 'Samsung Galaxy S24 Ultra',
                'category': 'Electronics',
                'shop': 'Gadget World',
                'price': Decimal('1299.99'),
                'quantity': 15,
                'condition': 'New',
                'status': 'Active',
                'description': 'Flagship Samsung smartphone',
                'used_for': 'Mobile communication and productivity',
            },
            {
                'name': 'iPhone 15 Leather Case',
                'category': 'Accessories',
                'shop': 'Gadget World',
                'price': Decimal('59.99'),
                'quantity': 45,
                'condition': 'New',
                'status': 'Active',
                'description': 'Premium leather case for iPhone 15',
                'used_for': 'Phone protection and style',
            },
            # KeyClack products
            {
                'name': 'Mechanical Keyboard Pro',
                'category': 'Electronics',
                'shop': 'KeyClack',
                'price': Decimal('199.99'),
                'quantity': 12,
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional mechanical keyboard',
                'used_for': 'Gaming and typing',
            },
            # Display Masters products
            {
                'name': '4K Gaming Monitor',
                'category': 'Electronics',
                'shop': 'Display Masters',
                'price': Decimal('499.99'),
                'quantity': 8,
                'condition': 'New',
                'status': 'Active',
                'description': '27-inch 4K gaming monitor',
                'used_for': 'Gaming and professional work',
            },
            # Connect Tech products
            {
                'name': 'Wireless Earbuds',
                'category': 'Accessories',
                'shop': 'Connect Tech',
                'price': Decimal('129.99'),
                'quantity': 25,
                'condition': 'New',
                'status': 'Active',
                'description': 'Noise cancelling wireless earbuds',
                'used_for': 'Music and calls',
            },
            # Fashion Hub products
            {
                'name': 'Designer Handbag',
                'category': 'Fashion',
                'shop': 'Fashion Hub',
                'price': Decimal('299.99'),
                'quantity': 15,
                'condition': 'New',
                'status': 'Active',
                'description': 'Luxury designer handbag',
                'used_for': 'Fashion and style',
            },
            {
                'name': 'Running Shoes',
                'category': 'Sports',
                'shop': 'Fashion Hub',
                'price': Decimal('89.99'),
                'quantity': 30,
                'condition': 'New',
                'status': 'Active',
                'description': 'Comfortable running shoes',
                'used_for': 'Sports and casual wear',
            },
        ]
        
        # Extract unique categories from products data dynamically
        unique_categories = set(product['category'] for product in products_data)
        
        # Create admin categories dynamically based on the unique categories found
        admin_categories = {}
        for category_name in unique_categories:
            admin_category, created = Category.objects.get_or_create(
                name=category_name,
                user=admin_user_obj,
                defaults={'name': category_name}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"✅ Created admin category: {category_name}"))
            else:
                self.stdout.write(self.style.WARNING(f"⚠️ Admin category already exists: {category_name}"))
            admin_categories[category_name] = admin_category
        
        self.stdout.write(self.style.SUCCESS(f"📊 Created {len(admin_categories)} admin categories: {', '.join(admin_categories.keys())}"))
        
        products = []
        category_map = {cat.name: cat for cat in categories}
        shop_map = {shop.name: shop for shop in shops}
        
        for product_data in products_data:
            category = category_map.get(product_data['category'])
            shop = shop_map.get(product_data['shop'])
            admin_category = admin_categories.get(product_data['category'])
            
            if category and shop and admin_category:
                # Get the real customer from the shop
                customer = shop.customer
                
                # Check if product already exists
                existing_product = Product.objects.filter(
                    name=product_data['name'],
                    shop=shop,
                    customer=customer
                ).first()
                
                if not existing_product:
                    product = Product.objects.create(
                        customer=customer,           # Real customer from shop
                        shop=shop,                  # Real shop
                        category=category,          # Real category (customer category)
                        category_admin=admin_category,  # Admin category
                        name=product_data['name'],
                        description=product_data['description'],
                        quantity=product_data['quantity'],
                        used_for=product_data['used_for'],
                        price=product_data['price'],
                        status=product_data['status'],
                        condition=product_data['condition'],
                    )
                    
                    products.append(product)
                    self.stdout.write(self.style.SUCCESS(
                        f"✅ Created product: {product_data['name']} for shop {shop.name} "
                        f"(Customer Category: {category.name}, Admin Category: {admin_category.name})"
                    ))
                else:
                    # Update existing product with admin category
                    existing_product.category_admin = admin_category
                    existing_product.save()
                    products.append(existing_product)
                    self.stdout.write(self.style.WARNING(
                        f"⚠️ Updated existing product: {product_data['name']} with admin category {admin_category.name}"
                    ))
            else:
                missing = []
                if not category: missing.append('category')
                if not shop: missing.append('shop')
                if not admin_category: missing.append('admin_category')
                self.stdout.write(self.style.ERROR(
                    f"❌ Skipping product {product_data['name']}: Missing {', '.join(missing)}"
                ))
        
        self.stdout.write(self.style.SUCCESS(f"🎉 Successfully created/updated {len(products)} products"))
        return products

    def create_boosts_and_plans(self, products, shops, customers, admin_user):
        """Create boost plans and active boosts with real references"""
        # First, let's clean up duplicate BoostPlans if they exist
        self.cleanup_duplicate_boost_plans()
        
        # Create boost plans - use first() to handle any remaining duplicates
        boost_plans_data = [
            {'name': 'Basic', 'price': Decimal('9.99'), 'duration': 7, 'time_unit': 'days', 'status': 'active'},
            {'name': 'Premium', 'price': Decimal('19.99'), 'duration': 14, 'time_unit': 'days', 'status': 'active'},
            {'name': 'Ultimate', 'price': Decimal('29.99'), 'duration': 30, 'time_unit': 'days', 'status': 'active'},
        ]
        
        boost_plans = []
        for plan_data in boost_plans_data:
            # Use filter().first() instead of get() to handle duplicates
            existing_plan = BoostPlan.objects.filter(name=plan_data['name']).first()
            
            if existing_plan:
                boost_plans.append(existing_plan)
                self.stdout.write(self.style.WARNING(f"⚠️ Boost plan already exists: {plan_data['name']}"))
            else:
                plan = BoostPlan.objects.create(
                    name=plan_data['name'],
                    price=plan_data['price'],
                    duration=plan_data['duration'],
                    time_unit=plan_data['time_unit'],
                    status=plan_data['status'],
                    user=admin_user
                )
                boost_plans.append(plan)
                self.stdout.write(self.style.SUCCESS(f"✅ Created boost plan: {plan_data['name']}"))
        
        # Create active boosts with real references
        boost_assignments = [
            ('Tech Haven', 3, 'Premium'),
            ('Gadget World', 1, 'Basic'),
            ('KeyClack', 5, 'Premium'),
            ('Connect Tech', 2, 'Premium'),
            ('Fashion Hub', 4, 'Premium'),
        ]
        
        for shop_name, boost_count, plan_name in boost_assignments:
            shop = Shop.objects.filter(name=shop_name).first()
            if shop:
                shop_products = Product.objects.filter(shop=shop)
                plan = BoostPlan.objects.filter(name=plan_name).first()
                
                if shop_products.exists() and plan:
                    created_count = 0
                    for i in range(min(boost_count, len(shop_products))):
                        # Check if boost already exists
                        existing_boost = Boost.objects.filter(
                            product=shop_products[i],
                            shop=shop,
                            customer=shop.customer
                        ).first()
                        
                        if not existing_boost:
                            Boost.objects.create(
                                product=shop_products[i],
                                boost_plan=plan,
                                shop=shop,
                                customer=shop.customer,  # Real customer from shop
                            )
                            created_count += 1
                    
                    if created_count > 0:
                        self.stdout.write(self.style.SUCCESS(f"✅ Created {created_count} boosts for {shop_name}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"⚠️ All boosts already exist for {shop_name}"))

    def cleanup_duplicate_boost_plans(self):
        """Clean up duplicate BoostPlan records"""
        plan_names = ['Basic', 'Premium', 'Ultimate']
        
        for plan_name in plan_names:
            duplicates = BoostPlan.objects.filter(name=plan_name)
            if duplicates.count() > 1:
                self.stdout.write(self.style.WARNING(f"⚠️ Found {duplicates.count()} duplicate BoostPlans for {plan_name}"))
                
                # Keep the first one and delete the rest
                first_plan = duplicates.first()
                duplicates.exclude(id=first_plan.id).delete()
                
                self.stdout.write(self.style.SUCCESS(f"✅ Cleaned up duplicate BoostPlans for {plan_name}"))

    def create_shop_follows(self, shops, customers):
        """Create shop follows with real customer references"""
        follower_data = [
            ('Tech Haven', 1250),
            ('Gadget World', 890),
            ('KeyClack', 2100),
            ('Display Masters', 670),
            ('Connect Tech', 450),
            ('Fashion Hub', 1580),
        ]
        
        for shop_name, follower_count in follower_data:
            shop = Shop.objects.filter(name=shop_name).first()
            if shop:
                created_count = 0
                # Create followers for this shop (limited to available customers)
                for i in range(min(follower_count, len(customers))):
                    customer = customers[i % len(customers)]
                    
                    # Check if follow already exists
                    existing_follow = ShopFollow.objects.filter(
                        customer=customer,
                        shop=shop
                    ).first()
                    
                    if not existing_follow:
                        ShopFollow.objects.create(
                            customer=customer,  # Real customer
                            shop=shop,         # Real shop
                        )
                        created_count += 1
                
                if created_count > 0:
                    self.stdout.write(self.style.SUCCESS(f"✅ Created {created_count} followers for {shop_name}"))
                else:
                    self.stdout.write(self.style.WARNING(f"⚠️ All followers already exist for {shop_name}"))

    def create_reviews(self, products, shops, customers):
        """Create reviews with real customer and shop references"""
        shop_rating_data = [
            ('Tech Haven', 4.8, 234),
            ('Gadget World', 4.5, 178),
            ('KeyClack', 4.9, 456),
            ('Display Masters', 4.7, 145),
            ('Connect Tech', 4.2, 89),
            ('Fashion Hub', 4.6, 312),
        ]
        
        for shop_name, avg_rating, total_ratings in shop_rating_data:
            shop = Shop.objects.filter(name=shop_name).first()
            if shop and customers:  # Add check for empty customers list
                # Create reviews to achieve the target average and count
                ratings_to_create = self._calculate_ratings_for_average(avg_rating, total_ratings)
                created_count = 0
                
                for rating in ratings_to_create:
                    # Use different customers for reviews - handle empty customers list
                    customer_index = created_count % len(customers) if customers else 0
                    customer = customers[customer_index] if customers else None
                    
                    if customer:  # Only proceed if we have a customer
                        # Check if review already exists
                        existing_review = Review.objects.filter(
                            customer=customer,
                            shop=shop
                        ).first()
                        
                        if not existing_review:
                            Review.objects.create(
                                customer=customer,  # Real customer
                                shop=shop,         # Real shop
                                rating=rating,
                                comment=f"Great shop! Rating: {rating} stars for {shop_name}",
                            )
                            created_count += 1
                
                if created_count > 0:
                    self.stdout.write(self.style.SUCCESS(f"✅ Created {created_count} reviews for {shop_name} (avg: {avg_rating})"))
                else:
                    self.stdout.write(self.style.WARNING(f"⚠️ All reviews already exist for {shop_name}"))
            else:
                if not customers:
                    self.stdout.write(self.style.WARNING(f"⚠️ No customers available to create reviews for {shop_name}"))
                else:
                    self.stdout.write(self.style.WARNING(f"⚠️ Shop not found: {shop_name}"))

    def _calculate_ratings_for_average(self, target_avg, total_ratings):
        """Calculate ratings distribution to achieve target average"""
        import math
        
        ratings = []
        base_rating = math.floor(target_avg)
        decimal_part = target_avg - base_rating
        
        # Calculate how many of each rating we need
        higher_count = int(total_ratings * decimal_part)
        base_count = total_ratings - higher_count
        
        # Add ratings
        for i in range(higher_count):
            ratings.append(base_rating + 1)
        for i in range(base_count):
            ratings.append(base_rating)
        
        # Shuffle to mix ratings
        random.shuffle(ratings)
        return ratings
    
    def create_additional_data(self, products, customers, shops):
        """Create additional related data with real references"""
        # Create variants
        variant_count = 0
        for product in products:
            for i in range(min(3, 2)):
                variant, created = Variants.objects.get_or_create(
                    product=product,
                    shop=product.shop,
                    title=f"{product.name} - Variant {i+1}"
                )
                
                if created:
                    variant_count += 1
                    # Create variant options
                    for j in range(2):
                        VariantOptions.objects.get_or_create(
                            variant=variant,
                            title=f"Option {j+1}",
                            defaults={
                                'quantity': 10,
                                'price': product.price * Decimal('1.1')
                            }
                        )
        
        if variant_count > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {variant_count} variants"))
        
        # Create some issues
        issue_count = 0
        for product in products[:8]:
            for i in range(min(2, 1)):
                issue, created = Issues.objects.get_or_create(
                    product=product,
                    description=f"Reported issue with {product.name}"
                )
                if created:
                    issue_count += 1
        
        if issue_count > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {issue_count} issues"))
        
        # Create favorites
        favorite_count = 0
        for i, customer in enumerate(customers[:5]):
            for j in range(3):
                if products:
                    favorite, created = Favorites.objects.get_or_create(
                        customer=customer,
                        product=products[(i + j) % len(products)],
                    )
                    if created:
                        favorite_count += 1
        
        if favorite_count > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {favorite_count} favorites"))

    def create_customer_activities(self, products, customers):
        """Create customer activities for engagement"""
        activity_count = 0
        
        # First, delete any existing duplicate CustomerActivity records
        self.stdout.write("🧹 Cleaning up duplicate customer activities...")
        
        # Find and delete duplicates (same customer, product, and activity_type)
        duplicates = CustomerActivity.objects.values(
            'customer', 'product', 'activity_type'
        ).annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        for dup in duplicates:
            # Keep the first one, delete the rest
            activities = CustomerActivity.objects.filter(
                customer=dup['customer'],
                product=dup['product'], 
                activity_type=dup['activity_type']
            ).order_by('created_at')
            
            if activities.count() > 1:
                # Delete all but the first one
                activities.exclude(id=activities.first().id).delete()
                self.stdout.write(f"   🗑️  Cleaned {activities.count() - 1} duplicates for customer {dup['customer']}")
        
        # Now create new activities safely
        for product in products:
            view_count = 100
            for i in range(min(view_count, len(customers))):
                customer = customers[i % len(customers)]
                
                # Use filter().first() instead of get_or_create() to avoid the unique constraint issue
                existing_activity = CustomerActivity.objects.filter(
                    customer=customer,
                    product=product,
                    activity_type='view'
                ).first()
                
                if not existing_activity:
                    activity_date = timezone.now() - timedelta(days=random.randint(1, 30))
                    
                    CustomerActivity.objects.create(
                        customer=customer,
                        product=product,
                        activity_type='view',
                        created_at=activity_date
                    )
                    activity_count += 1
        
        if activity_count > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {activity_count} customer activities"))

    def create_boost_analytics_data(self, products, shops, customers, admin_user):
        """Create comprehensive boost analytics data for AdminBoosting ViewSet"""
        self.stdout.write("📊 Creating comprehensive boost analytics data...")
        
        # First, clean up any existing boost plans to avoid duplicates
        self.cleanup_duplicate_boost_plans()
        
        # Create comprehensive boost plans with different statuses
        boost_plans_data = [
            {'name': 'Basic Boost', 'price': Decimal('9.99'), 'duration': 7, 'time_unit': 'days', 'status': 'active'},
            {'name': 'Premium Boost', 'price': Decimal('19.99'), 'duration': 14, 'time_unit': 'days', 'status': 'active'},
            {'name': 'Ultimate Boost', 'price': Decimal('29.99'), 'duration': 30, 'time_unit': 'days', 'status': 'active'},
            {'name': 'Starter Boost', 'price': Decimal('4.99'), 'duration': 3, 'time_unit': 'days', 'status': 'archived'},
            {'name': 'Pro Boost', 'price': Decimal('49.99'), 'duration': 60, 'time_unit': 'days', 'status': 'active'},
        ]
        
        boost_plans = []
        for plan_data in boost_plans_data:
            existing_plan = BoostPlan.objects.filter(name=plan_data['name']).first()
            
            if not existing_plan:
                plan = BoostPlan.objects.create(
                    name=plan_data['name'],
                    price=plan_data['price'],
                    duration=plan_data['duration'],
                    time_unit=plan_data['time_unit'],
                    status=plan_data['status'],
                    user=admin_user
                )
                boost_plans.append(plan)
                self.stdout.write(self.style.SUCCESS(f"✅ Created boost plan: {plan_data['name']}"))
            else:
                boost_plans.append(existing_plan)
                self.stdout.write(self.style.WARNING(f"⚠️ Boost plan already exists: {plan_data['name']}"))
        
        # Create comprehensive boost records with different statuses and dates
        self.create_comprehensive_boosts(products, shops, customers, boost_plans)
        
        # Create boost usage patterns for analytics
        self.create_boost_usage_patterns(boost_plans, products, shops, customers)
        
        self.stdout.write(self.style.SUCCESS("✅ Comprehensive boost analytics data created!"))

    def create_comprehensive_boosts(self, products, shops, customers, boost_plans):
        """Create comprehensive boost records with various statuses and dates"""
        boost_statuses = ['active', 'expired', 'cancelled', 'pending']
        
        # Map shops to their products
        shop_products = {}
        for shop in shops:
            shop_products[shop.name] = Product.objects.filter(shop=shop)
        
        # Create boosts for different scenarios
        boost_assignments = [
            # Active boosts (current)
            ('Tech Haven', 3, 'Premium Boost', 'active', 0),
            ('Gadget World', 2, 'Basic Boost', 'active', 1),
            ('KeyClack', 4, 'Ultimate Boost', 'active', 2),
            ('Connect Tech', 2, 'Premium Boost', 'active', 3),
            ('Fashion Hub', 3, 'Pro Boost', 'active', 4),
            
            # Expired boosts (past end date)
            ('Tech Haven', 2, 'Basic Boost', 'expired', -10),
            ('Gadget World', 1, 'Premium Boost', 'expired', -15),
            ('Display Masters', 2, 'Basic Boost', 'expired', -20),
            
            # Expiring soon (within 7 days)
            ('KeyClack', 1, 'Premium Boost', 'active', 3),
            ('Connect Tech', 1, 'Basic Boost', 'active', 5),
            ('Fashion Hub', 2, 'Ultimate Boost', 'active', 6),
            
            # Cancelled boosts
            ('Display Masters', 1, 'Basic Boost', 'cancelled', -5),
            ('Gadget World', 1, 'Premium Boost', 'cancelled', -8),
        ]
        
        total_boosts_created = 0
        
        for shop_name, boost_count, plan_name, status, days_offset in boost_assignments:
            shop = Shop.objects.filter(name=shop_name).first()
            plan = BoostPlan.objects.filter(name=plan_name).first()
            
            if shop and plan and shop_products.get(shop_name):
                products_for_shop = shop_products[shop_name]
                
                created_count = 0
                for i in range(min(boost_count, len(products_for_shop))):
                    product = products_for_shop[i]
                    
                    # Check if boost already exists
                    existing_boost = Boost.objects.filter(
                        product=product,
                        shop=shop,
                        customer=shop.customer,
                        boost_plan=plan
                    ).first()
                    
                    if not existing_boost:
                        # Calculate dates based on status and offset using timezone-aware datetime
                        start_date = timezone.now() + timedelta(days=days_offset)
                        
                        if status == 'expired':
                            end_date = timezone.now() - timedelta(days=1)
                        elif status == 'cancelled':
                            end_date = timezone.now() + timedelta(days=days_offset + plan.duration)
                        else:  # active or pending
                            end_date = start_date + timedelta(days=plan.duration)
                        
                        boost = Boost.objects.create(
                            product=product,
                            boost_plan=plan,
                            shop=shop,
                            customer=shop.customer,
                            status=status,
                            start_date=start_date,
                            end_date=end_date
                        )
                        
                        # Set custom created_at for trend analysis using timezone-aware datetime
                        if days_offset < 0:
                            boost.created_at = timezone.now() + timedelta(days=days_offset)
                            boost.save()
                        
                        created_count += 1
                        total_boosts_created += 1
                
                if created_count > 0:
                    self.stdout.write(self.style.SUCCESS(f"✅ Created {created_count} {status} boosts for {shop_name}"))
        
        if total_boosts_created > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created total of {total_boosts_created} comprehensive boosts"))

    def create_boost_usage_patterns(self, boost_plans, products, shops, customers):
        """Create historical boost usage patterns for analytics"""
        self.stdout.write("📈 Creating boost usage patterns for analytics...")
        
        # Create historical boosts for trend analysis (last 6 months)
        months_data = [
            (-150, 8, 2),   # 5 months ago: 8 new, 2 expired
            (-120, 12, 4),  # 4 months ago: 12 new, 4 expired
            (-90, 15, 6),   # 3 months ago: 15 new, 6 expired
            (-60, 18, 8),   # 2 months ago: 18 new, 8 expired
            (-30, 22, 10),  # 1 month ago: 22 new, 10 expired
            (0, 25, 12),    # Current month: 25 new, 12 expired
        ]
        
        historical_boosts_created = 0
        
        for days_offset, new_boosts_count, expired_boosts_count in months_data:
            # Create new boosts for this period
            for i in range(new_boosts_count):
                shop = shops[i % len(shops)]
                plan = boost_plans[i % len(boost_plans)]
                shop_products = Product.objects.filter(shop=shop)
                
                if shop_products.exists():
                    product = shop_products[i % len(shop_products)]
                    
                    # Calculate dates for historical data using timezone-aware datetime
                    created_date = timezone.now() + timedelta(days=days_offset)
                    start_date = created_date
                    
                    if i < expired_boosts_count:
                        # Create expired boosts
                        end_date = created_date + timedelta(days=plan.duration - 15)  # Make them expired
                        status = 'expired'
                    else:
                        # Create active boosts (some might still be active)
                        end_date = created_date + timedelta(days=plan.duration)
                        status = 'active' if end_date > timezone.now() else 'expired'
                    
                    # Check if historical boost already exists
                    existing_boost = Boost.objects.filter(
                        product=product,
                        shop=shop,
                        customer=shop.customer,
                        boost_plan=plan,
                        created_at__date=created_date.date()
                    ).first()
                    
                    if not existing_boost:
                        boost = Boost.objects.create(
                            product=product,
                            boost_plan=plan,
                            shop=shop,
                            customer=shop.customer,
                            status=status,
                            start_date=start_date,
                            end_date=end_date
                        )
                        
                        # Set historical created_at using timezone-aware datetime
                        boost.created_at = created_date
                        boost.save()
                        
                        historical_boosts_created += 1
        
        if historical_boosts_created > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {historical_boosts_created} historical boosts for trend analysis"))
        
        # Create boost plan usage patterns
        self.create_boost_plan_usage(boost_plans, products, shops, customers)
        
        # Verify analytics data matches expected API response structure
        self.verify_analytics_data()

    def create_boost_plan_usage(self, boost_plans, products, shops, customers):
        """Create realistic boost plan usage patterns"""
        self.stdout.write("📊 Creating boost plan usage patterns...")
        
        # Define usage patterns for each plan
        usage_patterns = [
            ('Premium Boost', 15),  # Premium: 15 uses
            ('Basic Boost', 12),    # Basic: 12 uses
            ('Ultimate Boost', 8),  # Ultimate: 8 uses
            ('Pro Boost', 5),       # Pro: 5 uses
            ('Starter Boost', 3),   # Starter: 3 uses (archived)
        ]
        
        additional_boosts_created = 0
        
        for plan_name, usage_count in usage_patterns:
            plan = BoostPlan.objects.filter(name=plan_name).first()
            
            if plan:
                # Check current usage
                current_usage = Boost.objects.filter(boost_plan=plan).count()
                needed_usage = max(0, usage_count - current_usage)
                
                if needed_usage > 0:
                    # Create additional boosts to reach target usage
                    for i in range(needed_usage):
                        shop_index = i % len(shops)
                        shop = shops[shop_index]
                        shop_products = Product.objects.filter(shop=shop)
                        
                        if shop_products.exists():
                            product = shop_products[i % len(shop_products)]
                            
                            # Create boost with realistic dates using timezone-aware datetime
                            days_ago = (i % 30) + 1  # Spread over last 30 days
                            start_date = timezone.now() - timedelta(days=days_ago)
                            end_date = start_date + timedelta(days=plan.duration)
                            
                            status = 'active' if end_date > timezone.now() else 'expired'
                            
                            boost = Boost.objects.create(
                                product=product,
                                boost_plan=plan,
                                shop=shop,
                                customer=shop.customer,
                                status=status,
                                start_date=start_date,
                                end_date=end_date
                            )
                            
                            # Set historical created_at using timezone-aware datetime
                            boost.created_at = start_date
                            boost.save()
                            
                            additional_boosts_created += 1
        
        if additional_boosts_created > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {additional_boosts_created} additional boosts for usage patterns"))

    def verify_analytics_data(self):
        """Verify that the seeded data matches the expected API response structure"""
        self.stdout.write("🔍 Verifying analytics data structure...")
        
        # Check total metrics
        total_boosts = Boost.objects.count()
        active_boosts = Boost.objects.filter(status='active').count()
        total_boost_plans = BoostPlan.objects.count()
        active_boost_plans = BoostPlan.objects.filter(status='active').count()
        
        # Calculate revenue (sum of all boost plan prices)
        total_revenue_result = BoostPlan.objects.aggregate(
            total_revenue=Sum('price')
        )
        total_revenue = total_revenue_result['total_revenue'] or Decimal('0')
        
        # Calculate expiring soon (within 7 days)
        seven_days_later = timezone.now() + timedelta(days=7)
        expiring_soon = Boost.objects.filter(
            status='active',
            end_date__lte=seven_days_later,
            end_date__gte=timezone.now()
        ).count()
        
        self.stdout.write(self.style.SUCCESS("📊 Boost Analytics Summary:"))
        self.stdout.write(f"   • Total Boosts: {total_boosts}")
        self.stdout.write(f"   • Active Boosts: {active_boosts}")
        self.stdout.write(f"   • Total Boost Plans: {total_boost_plans}")
        self.stdout.write(f"   • Active Boost Plans: {active_boost_plans}")
        self.stdout.write(f"   • Total Revenue: ${float(total_revenue):.2f}")
        self.stdout.write(f"   • Expiring Soon: {expiring_soon}")
        
        # Check top plans by usage
        top_plans = BoostPlan.objects.annotate(
            usage_count=Count('boost')
        ).filter(usage_count__gt=0).order_by('-usage_count')[:5]
        
        self.stdout.write("🏆 Top Plans by Usage:")
        for plan in top_plans:
            self.stdout.write(f"   • {plan.name}: {plan.usage_count} uses")
        
        # Verify trend data
        try:
            # Get boosts created in the last 6 months
            six_months_ago = timezone.now() - timedelta(days=180)
            recent_boosts = Boost.objects.filter(created_at__gte=six_months_ago)
            
            # Group by month for trend analysis
            from django.db.models.functions import TruncMonth
            monthly_data = recent_boosts.annotate(
                month=TruncMonth('created_at')
            ).values('month').annotate(
                new_boosts=Count('id'),
                expired_boosts=Count('id', filter=Q(status='expired'))
            ).order_by('month')
            
            self.stdout.write("📈 Trend Data Available:")
            for data in monthly_data:
                month_name = data['month'].strftime('%B %Y')
                self.stdout.write(f"   • {month_name}: {data['new_boosts']} new, {data['expired_boosts']} expired")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ Could not generate trend data: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS("✅ Analytics data verification complete!"))

    def create_engagement_data(self):
        """Create only the engagement data that's missing"""
        self.stdout.write("🎯 Creating missing engagement data...")
        
        # Get existing products and customers
        products = Product.objects.all()
        customers = Customer.objects.all()
        
        if not products.exists():
            self.stdout.write(self.style.ERROR("❌ No products found. Please run full seeder first."))
            return
            
        if not customers.exists():
            self.stdout.write(self.style.ERROR("❌ No customers found. Please run full seeder first."))
            return
        
        # 1. Create Customer Activities (views)
        self.stdout.write("👀 Creating customer view activities...")
        activity_count = 0
        
        # Define view counts for each product to make it realistic
        view_counts = {
            'Running Shoes': 150,
            'Designer Handbag': 120,
            'Wireless Earbuds': 200,
            '4K Gaming Monitor': 80,
            'Mechanical Keyboard Pro': 95,
            'iPhone 15 Leather Case': 180,
            'Samsung Galaxy S24 Ultra': 220,
            'MacBook Pro 16" M3 Max': 75,
            'iPhone 15 Pro Max 1TB': 160,
        }
        
        for product in products:
            view_count = view_counts.get(product.name, 100)
            existing_views = CustomerActivity.objects.filter(product=product, activity_type='view').count()
            
            # Only create additional views if we don't have enough
            if existing_views < view_count:
                views_to_create = view_count - existing_views
                
                for i in range(min(views_to_create, len(customers) * 3)):
                    customer = customers[i % len(customers)]
                    
                    # Create view activity with random date in the past 30 days
                    activity_date = timezone.now() - timedelta(days=random.randint(1, 30))
                    
                    activity, created = CustomerActivity.objects.get_or_create(
                        customer=customer,
                        product=product,
                        activity_type='view',
                        created_at=activity_date,
                        defaults={}
                    )
                    if created:
                        activity_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {activity_count} customer view activities"))
        
        # 2. Create Favorites
        self.stdout.write("❤️ Creating favorites...")
        favorite_count = 0
        
        favorite_counts = {
            'Running Shoes': 25,
            'Designer Handbag': 18,
            'Wireless Earbuds': 30,
            '4K Gaming Monitor': 12,
            'Mechanical Keyboard Pro': 15,
            'iPhone 15 Leather Case': 22,
            'Samsung Galaxy S24 Ultra': 28,
            'MacBook Pro 16" M3 Max': 10,
            'iPhone 15 Pro Max 1TB': 20,
        }
        
        for product in products:
            target_favorites = favorite_counts.get(product.name, 15)
            existing_favorites = Favorites.objects.filter(product=product).count()
            
            if existing_favorites < target_favorites:
                favorites_to_create = target_favorites - existing_favorites
                
                for i in range(min(favorites_to_create, len(customers))):
                    customer = customers[i]
                    
                    favorite, created = Favorites.objects.get_or_create(
                        customer=customer,
                        product=product,
                    )
                    if created:
                        favorite_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {favorite_count} favorites"))
        
        # 3. Create Cart Items and Checkouts (simulating purchases)
        self.stdout.write("🛒 Creating cart items and checkouts...")
        cart_item_count = 0
        checkout_count = 0
        
        purchase_counts = {
            'Running Shoes': 45,
            'Designer Handbag': 28,
            'Wireless Earbuds': 35,
            '4K Gaming Monitor': 12,
            'Mechanical Keyboard Pro': 18,
            'iPhone 15 Leather Case': 40,
            'Samsung Galaxy S24 Ultra': 25,
            'MacBook Pro 16" M3 Max': 8,
            'iPhone 15 Pro Max 1TB': 15,
        }
        
        for product in products:
            target_purchases = purchase_counts.get(product.name, 10)
            existing_cart_items = CartItem.objects.filter(product=product).count()
            
            if existing_cart_items < target_purchases:
                cart_items_to_create = target_purchases - existing_cart_items
                
                for i in range(min(cart_items_to_create, len(customers))):
                    customer = customers[i]
                    
                    # Get the user from customer
                    user = customer.customer
                    
                    # Create cart item
                    cart_item, created = CartItem.objects.get_or_create(
                        product=product,
                        user=user,
                        defaults={
                            'quantity': 1,
                        }
                    )
                    if created:
                        cart_item_count += 1
                        
                        # Create checkout for this cart item (simulating completed purchase)
                        checkout_date = timezone.now() - timedelta(days=random.randint(1, 60))
                        
                        checkout, checkout_created = Checkout.objects.get_or_create(
                            cart_item=cart_item,
                            defaults={
                                'quantity': cart_item.quantity,
                                'total_amount': product.price * cart_item.quantity,
                                'status': 'completed',
                                'created_at': checkout_date,
                            }
                        )
                        if checkout_created:
                            checkout_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {cart_item_count} cart items and {checkout_count} checkouts"))
        
        # 4. Create Reviews with proper distribution
        self.stdout.write("⭐ Creating reviews with proper rating distribution...")
        review_count = 0
        
        shop_rating_data = [
            ('Tech Haven', 4.8, 23),
            ('Gadget World', 4.5, 17),
            ('KeyClack', 4.9, 21),
            ('Display Masters', 4.7, 14),
            ('Connect Tech', 4.2, 8),
            ('Fashion Hub', 4.6, 31),
        ]
        
        for shop_name, avg_rating, total_ratings in shop_rating_data:
            shop = Shop.objects.filter(name=shop_name).first()
            if shop and customers:
                existing_reviews = Review.objects.filter(shop=shop).count()
                
                if existing_reviews < total_ratings:
                    reviews_to_create = total_ratings - existing_reviews
                    ratings_to_create = self._calculate_ratings_for_average(avg_rating, reviews_to_create)
                    
                    for rating in ratings_to_create:
                        customer_index = review_count % len(customers)
                        customer = customers[customer_index]
                        
                        review, created = Review.objects.get_or_create(
                            customer=customer,
                            shop=shop,
                            rating=rating,
                            defaults={
                                'comment': f"Great shop! Rating: {rating} stars for {shop_name}",
                            }
                        )
                        if created:
                            review_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {review_count} reviews"))
        
        # 5. Verify the data was created
        self.verify_engagement_data()

    def verify_engagement_data(self):
        """Verify that engagement data was created properly"""
        self.stdout.write("🔍 Verifying engagement data...")
        
        # Check product engagement data
        products_with_engagement = Product.objects.annotate(
            view_count=Count('customeractivity'),
            favorite_count=Count('favorites'),
            cart_item_count=Count('cartitem')
        ).order_by('-view_count')
        
        self.stdout.write("📊 Product Engagement Summary:")
        for product in products_with_engagement:
            # Get checkout count for this product
            checkout_count = Checkout.objects.filter(
                cart_item__product=product,
                status='completed'
            ).count()
            
            total_engagement = product.view_count + product.favorite_count + product.cart_item_count
            self.stdout.write(f"   • {product.name}:")
            self.stdout.write(f"     - Views: {product.view_count}")
            self.stdout.write(f"     - Favorites: {product.favorite_count}")
            self.stdout.write(f"     - Cart Items: {product.cart_item_count}")
            self.stdout.write(f"     - Completed Checkouts: {checkout_count}")
            self.stdout.write(f"     - Total Engagement: {total_engagement}")
        
        # Check rating distribution
        rating_distribution = Review.objects.values('rating').annotate(
            count=Count('id')
        ).order_by('-rating')
        
        self.stdout.write("⭐ Rating Distribution:")
        for rating_data in rating_distribution:
            self.stdout.write(f"   • {rating_data['rating']} Stars: {rating_data['count']} reviews")
        
        self.stdout.write(self.style.SUCCESS("✅ Engagement data verification complete!"))
  
    def create_order_analytics_data(self):
        """Create analytics data for orders dashboard matching AdminOrders API"""
        self.stdout.write("📊 Creating order analytics data...")
        
        # Get actual data from the database to match the API response
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        # Create daily orders for the past 7 days (matching _get_analytics_data)
        daily_orders = []
        for i in range(6, -1, -1):  # Last 7 days including today
            date = today - timedelta(days=i)
            day_data = Order.objects.filter(created_at__date=date).aggregate(
                count=Count('order'),
                revenue=Sum('total_amount')
            )
            
            daily_orders.append({
                'date': date.strftime('%b %d'),
                'count': day_data['count'] or 0,
                'revenue': float(day_data['revenue'] or 0)
            })
        
        # Status distribution (matching _get_analytics_data)
        status_distribution = []
        status_counts = Order.objects.values('status').annotate(count=Count('order'))
        
        for status_data in status_counts:
            status_distribution.append({
                'name': status_data['status'].capitalize(),
                'value': status_data['count']
            })
        
        # Payment method distribution (matching _get_analytics_data)
        payment_method_distribution = []
        payment_counts = Order.objects.values('payment_method').annotate(count=Count('order'))
        
        for payment_data in payment_counts:
            payment_method_distribution.append({
                'name': payment_data['payment_method'],
                'value': payment_data['count']
            })
        
        self.stdout.write("📈 Order Analytics Summary:")
        self.stdout.write(f"   • Daily Orders: {len(daily_orders)} days of data")
        self.stdout.write(f"   • Status Distribution: {len(status_distribution)} statuses")
        self.stdout.write(f"   • Payment Methods: {len(payment_method_distribution)} methods")
        
        # Show sample data
        if daily_orders:
            self.stdout.write(f"   • Recent Daily Data: {daily_orders[-1]['count']} orders on {daily_orders[-1]['date']}")
        
        self.stdout.write(self.style.SUCCESS("✅ Order analytics data prepared matching AdminOrders API structure"))
        
    def create_order_data(self, products, customers, shops, admin_user):
        """Create order data first"""
        self.stdout.write("📦 Creating order data...")
        
        # Use existing customers or create test users if none exist
        if customers:
            order_users = [customer.customer for customer in customers[:10]]
        else:
            self.stdout.write("   ⚠️ No customers found, creating test users for orders...")
            order_users = []
            for i in range(5):
                user = User.objects.create(
                    username=f'ice_order_{i}',
                    email=f'order_user_{i}@example.com',
                    first_name=f'OrderUser{i}',
                    last_name='Test',
                    password=make_password('password123'),
                    is_customer=True
                )
                customer = Customer.objects.create(customer=user)
                order_users.append(user)
                self.stdout.write(f"   ✅ Created order user: {user.username}")
        
        # Payment methods for orders
        payment_methods = ['GCash', 'Credit Card', 'Bank Transfer', 'Cash']
        
        # Create Orders with different statuses
        all_orders = []
        
        # Create 20 orders with different statuses
        for i in range(20):
            user = random.choice(order_users)
            status = random.choice(['completed', 'pending', 'cancelled'])
            
            order = Order.objects.create(
                user=user,
                status=status,
                total_amount=Decimal('0'),  # Will be updated with checkouts
                payment_method=random.choice(payment_methods),
                delivery_address=f"{random.randint(100, 999)} Main Street, City {random.randint(1, 10)}",
                created_at=timezone.now() - timedelta(days=random.randint(1, 30))
            )
            all_orders.append(order)
            self.stdout.write(f"   ✅ Created order {order.order} for {user.username}")
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {len(all_orders)} orders"))
        return all_orders

    def create_checkout_data(self, products, customers, shops, admin_user):
        """Create checkout data with order associations"""
        self.stdout.write("🛒 Creating checkout data...")
        
        # Create orders first
        orders = self.create_order_data(products, customers, shops, admin_user)
        
        # Create vouchers
        vouchers = [
            Voucher.objects.create(
                name="Winter Sale",
                code="WINTER50",
                discount_type="fixed",
                value=50.00,
                valid_until=timezone.now().date() + timedelta(days=30),
                created_by=admin_user,
                is_active=True
            ),
            Voucher.objects.create(
                name="Summer Discount", 
                code="SUMMER25",
                discount_type="fixed",
                value=25.00,
                valid_until=timezone.now().date() + timedelta(days=30),
                created_by=admin_user,
                is_active=True
            )
        ]
        
        # Get existing cart items instead of creating new ones
        cart_items = list(CartItem.objects.all())
        
        self.stdout.write(f"   🛍️ Found {len(cart_items)} existing cart items")
        
        # If no cart items exist, create some
        if not cart_items:
            self.stdout.write("   ⚠️ No cart items found, creating new ones...")
            # Use the same users that were created for orders
            order_users = User.objects.filter(username__startswith='order_user_')
            
            if not order_users.exists():
                # If no order users, get any available users
                order_users = User.objects.filter(is_customer=True)[:5]
                if not order_users.exists():
                    order_users = User.objects.all()[:5]
            
            for i, user in enumerate(order_users):
                if products:  # Check if products exist
                    product = products[i % len(products)]
                    # Use get_or_create to avoid duplicates
                    cart_item, created = CartItem.objects.get_or_create(
                        product=product,
                        user=user,
                        defaults={
                            'quantity': random.randint(1, 3),
                            'added_at': timezone.now() - timedelta(days=random.randint(1, 30))
                        }
                    )
                    if created:
                        cart_items.append(cart_item)
                        self.stdout.write(f"   ✅ Created cart item for {user.username}")
                    else:
                        cart_items.append(cart_item)
                        self.stdout.write(f"   ℹ️  Using existing cart item for {user.username}")
        
        # Check if we have cart items before proceeding
        if not cart_items:
            self.stdout.write("   ❌ No cart items could be created, skipping checkout creation")
            return
        
        self.stdout.write(f"   🛍️ Using {len(cart_items)} cart items")
        
        # Create checkouts and associate with orders
        checkout_count = 0
        
        for order in orders:
            # Each order gets 1-3 checkouts
            num_checkouts = random.randint(1, 3)
            order_total = Decimal('0')
            
            for i in range(num_checkouts):
                cart_item = random.choice(cart_items)
                use_voucher = random.choice([True, False])
                
                base_amount = cart_item.product.price * cart_item.quantity
                voucher_value = Decimal(str(vouchers[0].value)) if use_voucher else Decimal('0')
                total_amount = max(base_amount - voucher_value, Decimal('0'))
                order_total += total_amount
                
                # Create checkout with order foreign key
                Checkout.objects.create(
                    order=order,  # Foreign key to Order
                    cart_item=cart_item,
                    quantity=cart_item.quantity,
                    total_amount=total_amount,
                    status=order.status,  # Same status as order
                    voucher=vouchers[0] if use_voucher else None,
                    remarks=random.choice(['', 'Fast shipping', 'Gift wrapping']) if random.random() < 0.3 else '',
                    created_at=order.created_at
                )
                checkout_count += 1
            
            # Update order total amount
            order.total_amount = order_total
            order.save()
            self.stdout.write(f"   ✅ Created {num_checkouts} checkouts for order {order.order}")
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {checkout_count} checkouts with order associations"))

    def create_rider_data(self, products, customers, shops, admin_user):
        """Create comprehensive rider data with all related entities"""
        self.stdout.write("🏍️ Creating rider data...")
        
        # Create simple placeholder images (text-based)
        self.stdout.write("   🖼️ Creating placeholder images...")
        
        # Create rider users
        rider_users = []
        rider_data = [
            {
                'username': 'rider_john',
                'email': 'john.rider@example.com',
                'first_name': 'John',
                'last_name': 'Dela Cruz',
                'contact_number': '+639171234567',
                'vehicle_type': 'Motorcycle',
                'plate_number': 'ABC123',
                'vehicle_brand': 'Honda',
                'vehicle_model': 'Click 125',
                'license_number': 'L123456789',
                'verified': True,
            },
            {
                'username': 'rider_maria',
                'email': 'maria.santos@example.com',
                'first_name': 'Maria',
                'last_name': 'Santos',
                'contact_number': '+639271234568',
                'vehicle_type': 'Motorcycle',
                'plate_number': 'XYZ789',
                'vehicle_brand': 'Yamaha',
                'vehicle_model': 'NMAX',
                'license_number': 'L987654321',
                'verified': True,
            },
            {
                'username': 'rider_carlos',
                'email': 'carlos.gomez@example.com',
                'first_name': 'Carlos',
                'last_name': 'Gomez',
                'contact_number': '+639371234569',
                'vehicle_type': 'Motorcycle',
                'plate_number': 'DEF456',
                'vehicle_brand': 'Suzuki',
                'vehicle_model': 'Skydrive',
                'license_number': 'L456789123',
                'verified': False,
            },
            {
                'username': 'rider_anna',
                'email': 'anna.reyes@example.com',
                'first_name': 'Anna',
                'last_name': 'Reyes',
                'contact_number': '+639471234570',
                'vehicle_type': 'Bicycle',
                'plate_number': 'GHI789',
                'vehicle_brand': 'Trinx',
                'vehicle_model': 'M136',
                'license_number': 'L789123456',
                'verified': True,
            },
            {
                'username': 'rider_miguel',
                'email': 'miguel.tan@example.com',
                'first_name': 'Miguel',
                'last_name': 'Tan',
                'contact_number': '+639571234571',
                'vehicle_type': 'Motorcycle',
                'plate_number': 'JKL012',
                'vehicle_brand': 'Kawasaki',
                'vehicle_model': 'Rouser',
                'license_number': 'L321654987',
                'verified': False,
            }
        ]
        
        riders = []
        for data in rider_data:
            # Create user
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'email': data['email'],
                    'password': make_password('rider123'),
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'contact_number': data['contact_number'],
                    'is_rider': True,
                }
            )
            
            if created:
                rider_users.append(user)
                self.stdout.write(f"   ✅ Created rider user: {user.username}")
            
            # Create placeholder image file names
            vehicle_image_name = f"vehicle_{data['plate_number']}.jpg"
            license_image_name = f"license_{data['license_number']}.jpg"
            
            # Create rider profile
            rider, rider_created = Rider.objects.get_or_create(
                rider=user,
                defaults={
                    'vehicle_type': data['vehicle_type'],
                    'plate_number': data['plate_number'],
                    'vehicle_brand': data['vehicle_brand'],
                    'vehicle_model': data['vehicle_model'],
                    'vehicle_image': f"riders/vehicles/{vehicle_image_name}",
                    'license_number': data['license_number'],
                    'license_image': f"riders/licenses/{license_image_name}",
                    'verified': data['verified'],
                    'approved_by': admin_user if data['verified'] else None,
                    'approval_date': timezone.now() if data['verified'] else None,
                }
            )
            
            if rider_created:
                riders.append(rider)
                status = "approved" if data['verified'] else "pending"
                self.stdout.write(f"   ✅ Created {status} rider: {user.first_name} {user.last_name}")
                self.stdout.write(f"      Vehicle: {data['vehicle_brand']} {data['vehicle_model']} ({data['plate_number']})")
                self.stdout.write(f"      License: {data['license_number']}")
        
        # Create actual placeholder image files
        self.create_placeholder_images(riders)
        
        # Rest of the method remains the same...
        self.stdout.write("   📦 Creating deliveries...")
        # ... (keep all the existing delivery, log, notification, review creation code)
        
        return riders

    def create_placeholder_images(self, riders):
        """Create simple placeholder image files for riders"""
        import os
        from django.conf import settings
        from PIL import Image, ImageDraw, ImageFont
        import random
        
        # Create directories if they don't exist
        vehicle_dir = os.path.join(settings.MEDIA_ROOT, 'riders/vehicles')
        license_dir = os.path.join(settings.MEDIA_ROOT, 'riders/licenses')
        
        os.makedirs(vehicle_dir, exist_ok=True)
        os.makedirs(license_dir, exist_ok=True)
        
        # Colors for different vehicle types
        vehicle_colors = {
            'Motorcycle': ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
            'Bicycle': ['#A29BFE', '#FD79A8', '#FDCB6E', '#00B894', '#74B9FF']
        }
        
        created_count = 0
        
        for rider in riders:
            # Vehicle Image
            vehicle_color = random.choice(vehicle_colors.get(rider.vehicle_type, ['#3498db']))
            vehicle_image = Image.new('RGB', (400, 300), color=vehicle_color)
            draw = ImageDraw.Draw(vehicle_image)
            
            # Add some simple graphics
            draw.rectangle([50, 100, 350, 180], fill='#2c3e50')  # Vehicle body
            draw.ellipse([80, 200, 150, 270], fill='#34495e')    # Wheel
            draw.ellipse([250, 200, 320, 270], fill='#34495e')   # Wheel
            
            # Add text
            try:
                # Try to use a default font
                font = ImageFont.load_default()
                draw.text((200, 50), f"{rider.vehicle_brand}", fill='white', font=font, anchor='mm')
                draw.text((200, 250), rider.plate_number, fill='white', font=font, anchor='mm')
            except:
                # Fallback if font loading fails
                draw.text((200, 50), f"{rider.vehicle_brand}", fill='white', anchor='mm')
                draw.text((200, 250), rider.plate_number, fill='white', anchor='mm')
            
            vehicle_filename = f"vehicle_{rider.plate_number}.jpg"
            vehicle_path = os.path.join(vehicle_dir, vehicle_filename)
            vehicle_image.save(vehicle_path, 'JPEG', quality=85)
            
            # License Image
            license_image = Image.new('RGB', (400, 250), color='#f8f9fa')
            draw = ImageDraw.Draw(license_image)
            
            # License card design
            draw.rectangle([10, 10, 390, 240], outline='#dee2e6', width=2)
            draw.rectangle([15, 15, 385, 60], fill='#007bff')
            
            try:
                font = ImageFont.load_default()
                draw.text((200, 35), "DRIVER'S LICENSE", fill='white', font=font, anchor='mm')
                draw.text((50, 90), f"Name: {rider.rider.first_name} {rider.rider.last_name}", fill='black', font=font)
                draw.text((50, 120), f"License No: {rider.license_number}", fill='black', font=font)
                draw.text((50, 150), f"Vehicle: {rider.vehicle_type}", fill='black', font=font)
                draw.text((50, 180), f"Expires: 12/2026", fill='black', font=font)
            except:
                draw.text((200, 35), "DRIVER'S LICENSE", fill='white', anchor='mm')
                draw.text((50, 90), f"Name: {rider.rider.first_name} {rider.rider.last_name}", fill='black')
                draw.text((50, 120), f"License No: {rider.license_number}", fill='black')
                draw.text((50, 150), f"Vehicle: {rider.vehicle_type}", fill='black')
                draw.text((50, 180), f"Expires: 12/2026", fill='black')
            
            license_filename = f"license_{rider.license_number}.jpg"
            license_path = os.path.join(license_dir, license_filename)
            license_image.save(license_path, 'JPEG', quality=85)
            
            created_count += 1
        
        self.stdout.write(f"   🖼️ Created {created_count * 2} placeholder images (vehicles & licenses)")

    def cleanup_existing_data(self):
        """Delete existing data to prevent duplicates"""
        self.stdout.write("🧹 Cleaning up existing data...")
        
        # Define deletion order (respect foreign key constraints)
        models_to_clean = [
            'Checkout', 'Order', 'CartItem', 'CustomerActivity', 'Favorite', 'Review',
            'ShopReview', 'ShopFollower', 'Boost', 'BoostPlan', 'Product', 'Category', 
            'Shop', 'Customer', 'Rider', 'Voucher'
        ]
        
        for model_name in models_to_clean:
            try:
                model = apps.get_model('api', model_name)
                count, _ = model.objects.all().delete()
                if count:
                    self.stdout.write(f"   🗑️  Deleted {count} {model_name} records")
            except Exception as e:
                self.stdout.write(f"   ⚠️  Could not delete {model_name}: {e}")
        
        # Keep admin user but delete other users (except superusers)
        try:
            user_count = User.objects.filter(is_superuser=False).delete()[0]
            if user_count:
                self.stdout.write(f"   🗑️  Deleted {user_count} non-admin users")
        except Exception as e:
            self.stdout.write(f"   ⚠️  Could not delete users: {e}")

    def create_refund_data(self, products, customers, shops, admin_user):
        """Create comprehensive refund data for testing"""
        self.stdout.write("💰 Creating refund data...")
        
        try:
            # Get some orders to create refunds for
            orders = Order.objects.all()[:20]  # Get first 20 orders
            
            if not orders.exists():
                self.stdout.write(self.style.WARNING("⚠️ No orders found. Creating sample orders first..."))
                orders = self.create_sample_orders(products, customers, shops)
            
            refund_reasons = [
                "Product damaged during shipping",
                "Wrong item received", 
                "Product not as described",
                "Changed my mind",
                "Found better price elsewhere",
                "Product defective",
                "Size doesn't fit",
                "Color different from pictures",
                "Missing parts/accessories",
                "Delivery took too long",
                "Item no longer needed",
                "Bought by mistake",
                "Duplicate order",
                "Cancelled order after shipping",
                "Package never arrived"
            ]
            
            refund_methods = [
                "Bank Transfer",
                "Credit Card Refund", 
                "E-wallet",
                "Store Credit",
                "Cash on Pickup",
                "Payment Gateway Refund"
            ]
            
            logistic_services = [
                "LBC Express",
                "J&T Express",
                "Ninja Van",
                "Flash Express",
                "2Go",
                "Lalamove",
                "Grab Express",
                "Mr. Speedy"
            ]
            
            status_distribution = {
                'pending': 8,      # 40%
                'approved': 4,     # 20% 
                'rejected': 2,     # 10%
                'waiting': 3,      # 15%
                'to process': 2,   # 10%
                'completed': 1     # 5%
            }
            
            refunds_created = []
            
            for i, order in enumerate(orders):
                # Distribute statuses according to our distribution
                status_index = i % sum(status_distribution.values())
                cumulative = 0
                status = 'pending'  # default
                
                for stat, count in status_distribution.items():
                    cumulative += count
                    if status_index < cumulative:
                        status = stat
                        break
                
                # Create refund with realistic data
                refund = Refund.objects.create(
                    order=order,
                    requested_by=order.user,
                    reason=random.choice(refund_reasons),
                    status=status,
                    requested_at=timezone.now() - timedelta(days=random.randint(1, 90)),
                    logistic_service=random.choice(logistic_services) if status in ['approved', 'completed', 'waiting'] else None,
                    tracking_number=f"TRK{random.randint(1000000000, 9999999999)}" if status in ['approved', 'completed', 'waiting'] else None,
                    preferred_refund_method=random.choice(refund_methods),
                    final_refund_method=random.choice(refund_methods) if status in ['approved', 'completed'] else None,
                    processed_at=timezone.now() - timedelta(days=random.randint(1, 30)) if status in ['approved', 'completed'] else None,
                    processed_by=admin_user if status in ['approved', 'completed', 'rejected'] else None,
                    preferred_refund_method_details=f"Account details for {random.choice(refund_methods)}",
                    final_refund_method_details=f"Processed via {random.choice(refund_methods)}" if status in ['approved', 'completed'] else None
                )
                
                refunds_created.append(refund)
                
                # Create refund media for some refunds
                if random.random() < 0.6:  # 60% of refunds have media
                    self.create_refund_media(refund)
                
                self.stdout.write(f"   Created refund {refund.refund} with status: {status}")
            
            self.stdout.write(self.style.SUCCESS(f"✅ Created {len(refunds_created)} refund records"))
            return refunds_created
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error creating refund data: {str(e)}"))
            return []

    def create_refund_media(self, refund):
        """Create sample refund media attachments"""
        media_types = [
            {'file_type': 'image', 'description': 'Damaged product photo'},
            {'file_type': 'image', 'description': 'Wrong item received'},
            {'file_type': 'image', 'description': 'Defective product'},
            {'file_type': 'video', 'description': 'Product unboxing video'},
            {'file_type': 'document', 'description': 'Return shipping label'},
            {'file_type': 'document', 'description': 'Proof of payment'}
        ]
        
        # Create 1-3 media files per refund
        for _ in range(random.randint(1, 3)):
            media_type = random.choice(media_types)
            RefundMedias.objects.create(
                refund=refund,
                file_data=f"refunds/sample_{media_type['file_type']}_{random.randint(1, 10)}.jpg",
                file_type=media_type['file_type']
            )

    def create_sample_orders(self, products, customers, shops):
        """Create sample orders if none exist"""
        self.stdout.write("   Creating sample orders for refunds...")
        
        orders = []
        for i in range(20):
            customer = random.choice(customers)
            order = Order.objects.create(
                order=uuid.uuid4(),
                user=customer.customer,
                status=random.choice(['completed', 'pending', 'cancelled']),
                total_amount=Decimal(random.uniform(100, 5000)),
                payment_method=random.choice(['Credit Card', 'GCash', 'PayMaya', 'Bank Transfer']),
                delivery_address=f"{random.randint(1, 999)} Sample Street, Barangay {random.randint(1, 99)}, Sample City",
                created_at=timezone.now() - timedelta(days=random.randint(1, 90))
            )
            orders.append(order)
        
        return orders

    def create_refund_data(self, products, customers, shops, admin_user):
        """Create comprehensive refund data for testing"""
        self.stdout.write("💰 Creating refund data...")
        
        try:
            # Get some orders to create refunds for
            orders = Order.objects.all()[:20]  # Get first 20 orders
            
            if not orders.exists():
                self.stdout.write(self.style.WARNING("⚠️ No orders found. Creating sample orders first..."))
                orders = self.create_sample_orders(products, customers, shops)
            
            refund_reasons = [
                "Product damaged during shipping",
                "Wrong item received", 
                "Product not as described",
                "Changed my mind",
                "Found better price elsewhere",
                "Product defective",
                "Size doesn't fit",
                "Color different from pictures",
                "Missing parts/accessories",
                "Delivery took too long",
                "Item no longer needed",
                "Bought by mistake",
                "Duplicate order",
                "Cancelled order after shipping",
                "Package never arrived"
            ]
            
            refund_methods = [
                "Bank Transfer",
                "Credit Card Refund", 
                "E-wallet",
                "Store Credit",
                "Cash on Pickup",
                "Payment Gateway Refund"
            ]
            
            logistic_services = [
                "LBC Express",
                "J&T Express",
                "Ninja Van",
                "Flash Express",
                "2Go",
                "Lalamove",
                "Grab Express",
                "Mr. Speedy"
            ]
            
            status_distribution = {
                'pending': 8,      # 40%
                'approved': 4,     # 20% 
                'rejected': 2,     # 10%
                'waiting': 3,      # 15%
                'to process': 2,   # 10%
                'completed': 1     # 5%
            }
            
            refunds_created = []
            
            for i, order in enumerate(orders):
                # Distribute statuses according to our distribution
                status_index = i % sum(status_distribution.values())
                cumulative = 0
                status = 'pending'  # default
                
                for stat, count in status_distribution.items():
                    cumulative += count
                    if status_index < cumulative:
                        status = stat
                        break
                
                # Create refund with realistic data - REMOVED the extra fields
                refund = Refund.objects.create(
                    order=order,
                    requested_by=order.user,
                    reason=random.choice(refund_reasons),
                    status=status,
                    requested_at=timezone.now() - timedelta(days=random.randint(1, 90)),
                    logistic_service=random.choice(logistic_services) if status in ['approved', 'completed', 'waiting'] else None,
                    tracking_number=f"TRK{random.randint(1000000000, 9999999999)}" if status in ['approved', 'completed', 'waiting'] else None,
                    preferred_refund_method=random.choice(refund_methods),
                    final_refund_method=random.choice(refund_methods) if status in ['approved', 'completed'] else None,
                    processed_at=timezone.now() - timedelta(days=random.randint(1, 30)) if status in ['approved', 'completed'] else None,
                    processed_by=admin_user if status in ['approved', 'completed', 'rejected'] else None
                    # REMOVED: preferred_refund_method_details and final_refund_method_details
                )
                
                refunds_created.append(refund)
                
                # Create refund media for some refunds
                if random.random() < 0.6:  # 60% of refunds have media
                    self.create_refund_media(refund)
                
                self.stdout.write(f"   Created refund {refund.refund} with status: {status}")
            
            self.stdout.write(self.style.SUCCESS(f"✅ Created {len(refunds_created)} refund records"))
            return refunds_created
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error creating refund data: {str(e)}"))
            return []

    def create_refund_analytics_data(self):
        """Create refund analytics data spanning multiple months"""
        self.stdout.write("📊 Creating refund analytics data...")
        
        # Create refunds spread across last 12 months for trend analysis
        current_date = timezone.now()
        
        for month_offset in range(12):
            month_date = current_date - timedelta(days=30 * month_offset)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Create 5-15 refunds per month
            num_refunds = random.randint(5, 15)
            
            for i in range(num_refunds):
                # Get random order
                order = Order.objects.order_by('?').first()
                if not order:
                    continue
                    
                # Random date within the month
                refund_date = month_start + timedelta(days=random.randint(0, 27))
                
                # Status distribution changes over time (more recent = more pending)
                if month_offset == 0:  # Current month
                    status_weights = {'pending': 6, 'waiting': 3, 'to process': 1}
                elif month_offset < 3:  # Last 3 months
                    status_weights = {'completed': 3, 'approved': 2, 'rejected': 1, 'pending': 2}
                else:  # Older months
                    status_weights = {'completed': 5, 'approved': 3, 'rejected': 2}
                
                status = random.choices(
                    list(status_weights.keys()), 
                    weights=list(status_weights.values())
                )[0]
                
                Refund.objects.create(
                    order=order,
                    requested_by=order.user,
                    reason=random.choice([
                        "Product damaged during shipping",
                        "Wrong item received",
                        "Product not as described",
                        "Changed my mind"
                    ]),
                    status=status,
                    requested_at=refund_date,
                    processed_at=refund_date + timedelta(days=random.randint(1, 14)) if status in ['completed', 'approved', 'rejected'] else None,
                    preferred_refund_method=random.choice(['Bank Transfer', 'Credit Card Refund', 'E-wallet']),
                    final_refund_method=random.choice(['Bank Transfer', 'Credit Card Refund', 'E-wallet']) if status in ['completed', 'approved'] else None
                    # REMOVED: preferred_refund_method_details and final_refund_method_details
                )


