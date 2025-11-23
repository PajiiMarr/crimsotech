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
        self.stdout.write("🌱 Starting comprehensive shop data seeding...")
        
        try:
            with transaction.atomic():
                # Create admin user first
                admin_user = self.create_admin_user()

                self.create_engagement_data()
                
                
                # Create customers and shops matching frontend data
                customers, shops = self.create_customers_and_shops()
                
                # Create categories
                categories = self.create_categories(shops, admin_user)
                
                # Create products matching frontend data
                products = self.create_products(customers, shops, categories)
                
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
            user=user,
        )

        if admin_created:
            self.stdout.write(self.style.SUCCESS(f"✅ Admin record created for user_id={user.id}!"))
        else:
            self.stdout.write(self.style.WARNING("⚠️ Admin record already exists."))
        
        return user

    def create_customers_and_shops(self):
        """Create customers and shops with real customer references"""
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
                user=user
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
                self.stdout.write(self.style.SUCCESS(f"✅ Created shop: {data['shop_name']} for customer {customer.user.username}"))
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

    def create_products(self, customers, shops, categories):
        """Create products with real customer and shop references"""
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
        
        products = []
        category_map = {cat.name: cat for cat in categories}
        shop_map = {shop.name: shop for shop in shops}
        
        for product_data in products_data:
            category = category_map.get(product_data['category'])
            shop = shop_map.get(product_data['shop'])
            
            if category and shop:
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
                        customer=customer,  # Real customer from shop
                        shop=shop,         # Real shop
                        category=category,  # Real category
                        name=product_data['name'],
                        description=product_data['description'],
                        quantity=product_data['quantity'],
                        used_for=product_data['used_for'],
                        price=product_data['price'],
                        status=product_data['status'],
                        condition=product_data['condition'],
                    )
                    
                    products.append(product)
                    self.stdout.write(self.style.SUCCESS(f"✅ Created product: {product_data['name']} for shop {shop.name}"))
                else:
                    products.append(existing_product)
                    self.stdout.write(self.style.WARNING(f"⚠️ Product already exists: {product_data['name']}"))
        
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
        for product in products:
            view_count = 100
            for i in range(min(view_count, len(customers))):
                activity, created = CustomerActivity.objects.get_or_create(
                    customer=customers[i % len(customers)],
                    product=product,
                    activity_type='view'
                )
                if created:
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
                    user = customer.user
                    
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
