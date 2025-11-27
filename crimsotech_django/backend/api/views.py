from django.shortcuts import render
from django.db.models import Prefetch

from django.db.models.functions import TruncMonth
from django.db import transaction
from decimal import Decimal
from rest_framework import status
from rest_framework.views import APIView
from rest_framework import viewsets
from . models import *
from . serializer import *
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings
import random
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from django.contrib.auth.hashers import check_password
import hashlib
import os
from django.db.models import Count, Avg, Q, Sum


class UserView(APIView):
    def get(self, request):
        user = [{"user_id": user.id, "username": user.username, "email": user.email, "registration_stage": user.registration_stage, "is_rider": user.is_rider} for user in User.objects.all()]
        return Response(user)
    
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)

class GetRole(APIView):
    def get(self, request):
        user_id = request.headers.get("X-User-Id")

        if user_id:
            try:
                user = User.objects.get(id=user_id)
                data = {
                    "user_id": user.id,  # Keep key as "user_id" but value from user.id
                    "isAdmin": user.is_admin,
                    "isCustomer": user.is_customer,
                    "isRider": user.is_rider,
                    "isModerator": user.is_moderator,
                }
                return Response(data)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)

class GetRegistration(APIView):
    def get(self, request):
        user_id = request.headers.get("X-User-Id")

        if user_id:
            try:
                user = User.objects.get(id=user_id)
                data = {
                    "user_id": user.id,  # Keep key as "user_id" but value from user.id
                    "registration_stage": user.registration_stage,
                    "is_rider": user.is_rider,
                    "is_customer": user.is_customer,
                }
                return Response(data)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)

class Login(APIView):
    def get(self, request):
        user_id = request.headers.get("X-User-Id")  # get from headers

        if user_id:
            try:
                user = User.objects.get(id=user_id)
                data = {
                    "user_id": str(user.id),  # Keep key as "user_id" but value from user.id
                    "username": user.username,
                    "email": user.email,
                    "is_admin": user.is_admin,
                    "is_customer": user.is_customer,
                    "is_rider": user.is_rider,
                    "is_moderator": user.is_moderator,
                    "registration_stage": user.registration_stage
                }
                return Response(data)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)
    
    def post(self, request):
        """
        Logs in a user using email/username and password
        """
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {"error": "Username and password are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Find user by username
            user = User.objects.get(username=username)
            
            # Check password using Django's check_password
            if not check_password(password, user.password):
                return Response(
                    {"error": "Invalid credentials"}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid credentials"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Login successful
        return Response({
            "message": "Login successful",
            "user_id": str(user.id),  # Keep key as "user_id" but value from user.id
            "username": user.username,
            "email": user.email,
            "is_admin": user.is_admin,
            "is_customer": user.is_customer,
            "is_rider": user.is_rider,
            "is_moderator": user.is_moderator,
            "registration_stage": user.registration_stage
        })
    
class Register(APIView):
    def get(self, request):
        user_id = request.headers.get("X-User-Id")  # get from headers

        if user_id:
            try:
                user = User.objects.get(id=user_id)
                data = {
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_rider": getattr(user, "is_rider", False),
                    "registration_stage": getattr(user, "registration_stage", 1)
                }
                return Response(data)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)

        # fallback: if no user_id header provided, return all users
        users = [
            {
                "user_id": u.id,
                "username": u.username,
                "email": u.email,
            }
            for u in User.objects.all()
        ]
        return Response(users)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.save()
            
            # Create customer for new user - use 'customer' field instead of 'user'
            customer_data = {"customer": user.id}  # Changed from "user" to "customer"
            customer_serializer = CustomerSerializer(data=customer_data)
            if customer_serializer.is_valid(raise_exception=True):
                customer_serializer.save()
                
                return Response({
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "registration_stage": user.registration_stage,
                    "message": "User registered successfully"
                })
            
    def put(self, request):
        user_id = request.headers.get("X-User-Id")  # get from headers
        
        if not user_id:
            return Response({"error": "User ID is required"}, status=400)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)


class Profiling(APIView):
    def get(self, request):
        user_id = request.headers.get('X-User-Id')
        
        if not user_id:
            return Response({"error": "User ID not provided"}, status=400)
        
        try:
            user = User.objects.get(id=user_id)  # Changed from user_id to id
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        
        data = {
            "user_id": user.id,  # Changed from user.user_id to user.id
            "registration_stage": user.registration_stage,
            "username": user.username,
        }
        return Response(data)
    
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            saved_user = serializer.save()
            
            # Transform response to maintain frontend compatibility
            response_data = serializer.data.copy()
            if 'id' in response_data:
                response_data['user_id'] = response_data.pop('id')
            
            return Response(response_data)
        
    def put(self, request):
        user_id = request.headers.get("X-User-Id")  # get from headers
        
        if not user_id:
            return Response({"error": "User ID is required"}, status=400)
        
        try:
            user = User.objects.get(id=user_id)  # Changed from user_id to id
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            saved_user = serializer.save()
            
            # Transform response to maintain frontend compatibility
            response_data = serializer.data.copy()
            if 'id' in response_data:
                response_data['user_id'] = response_data.pop('id')
            
            return Response(response_data)

class VerifyNumber(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def user(self, request):
        user_id = request.headers.get('X-User-Id')

        if not user_id:
            return Response({"error": "User ID not provided"}, status=400)

        try:
            user = User.objects.get(id=user_id)  # Changed from user_id to id
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        return Response({
            "user_id": user.id,  # Changed from user.user_id to user.id
            "registration_stage": user.registration_stage,
        })

    def send_otp(self, contact_number):
        """
        Sends OTP using Twilio Verify API
        """
        try:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

            verification = client.verify.v2.services(
                settings.TWILIO_SERVICE_ID
            ).verifications.create(
                to='+63' + contact_number,
                channel='sms'
            )
            return verification.status  # returns "pending" if sent successfully

        except TwilioRestException as e:
            print(f"Twilio error: {e}")
            return None

    @action(detail=False, methods=['post'], url_path='verify_number')
    def verify_number(self, request):
        """
        Single action to handle both contact number submission and OTP verification
        """
        user_id = request.headers.get('X-User-Id')
        action_type = request.data.get('action_type')  # 'send_otp' or 'verify_otp'
        contact_number = request.data.get('contact_number')
        otp_code = request.data.get('otp_code')

        if not user_id:
            return Response({"error": "User ID header is required!"}, status=400)

        try:
            user = User.objects.get(id=user_id)  # Changed from user_id to id
        except User.DoesNotExist:
            return Response({"error": "User not found!"}, status=404)

        if action_type == 'send_otp':
            # Handle contact number submission and OTP sending
            if not contact_number:
                return Response({"error": "Contact number is required!"}, status=400)

            if User.objects.filter(contact_number=contact_number).exclude(id=user_id).exists():  # Changed from user_id to id
                return Response({"error": "Contact number already exists!"}, status=400)

            # Save user's contact number
            user.contact_number = contact_number
            user.save()

            # Send OTP using Twilio Verify
            otp_status = self.send_otp(contact_number)
            if not otp_status:
                return Response({"error": "Failed to send OTP. Please try again later."}, status=500)

            OTP.objects.update_or_create(
                user=user,  # Changed from user_otp_id to user
                defaults={
                    'otp': 'pending',
                    'sent_at': timezone.now(),
                    'expired_at': timezone.now() + timedelta(minutes=5)
                }
            )

            return Response({
                "message": f"OTP sent successfully to +63{contact_number}",
                "user_id": str(user.id),  # Changed from user.user_id to user.id
                "contact_number": contact_number
            })

        elif action_type == 'verify_otp':
            # Handle OTP verification
            if not contact_number or not otp_code:
                return Response({"error": "Contact number and OTP code are required!"}, status=400)

            try:
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                verification_check = client.verify.v2.services(
                    settings.TWILIO_SERVICE_ID
                ).verification_checks.create(
                    to='+63' + contact_number,
                    code=otp_code
                )

                if verification_check.status == 'approved':
                    # Update user registration stage and OTP record
                    user.registration_stage = 3  # Mark as verified
                    user.save()
                    
                    OTP.objects.filter(user=user).update(  # Changed from user_otp_id to user
                        otp=otp_code, 
                        expired_at=timezone.now()
                    )
                    
                    return Response({
                        "message": "Phone number verified successfully!",
                        "registration_stage": user.registration_stage
                    })

                else:
                    return Response({"error": "Invalid or expired OTP!"}, status=400)

            except TwilioRestException as e:
                print(f"Twilio error: {e}")
                return Response({"error": "Verification failed. Please try again later."}, status=500)

        else:
            return Response({"error": "Invalid action type"}, status=400)
        
class RiderRegistration(viewsets.ViewSet):
    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        """
        Complete rider registration in one step - creates user and rider records
        """
        try:
            # Step 1: Create user account
            user_data = {
                'is_customer': False,
                'is_rider': True,
                'registration_stage': 1,
                'password': ''
            }
            
            user_serializer = UserSerializer(data=user_data)
            if not user_serializer.is_valid():
                return Response(user_serializer.errors, status=400)
                
            user = user_serializer.save()
            
            # Step 2: Create rider record with comprehensive validation
            vehicle_type = request.data.get('vehicle_type', '').strip()
            plate_number = request.data.get('plate_number', '').strip()
            vehicle_brand = request.data.get('vehicle_brand', '').strip()
            vehicle_model = request.data.get('vehicle_model', '').strip()
            license_number = request.data.get('license_number', '').strip()
            vehicle_image = request.FILES.get('vehicle_image')
            license_image = request.FILES.get('license_image')
            
            errors = {}
            
            # Vehicle Type validation
            if not vehicle_type:
                errors['vehicle_type'] = "Vehicle type is required"
            elif vehicle_type not in ["car", "motorcycle", "bicycle", "scooter", "van", "truck"]:
                errors['vehicle_type'] = "Please select a valid vehicle type"
            
            # Plate Number validation
            if not plate_number:
                errors['plate_number'] = "Plate number is required"
            elif len(plate_number) > 20:
                errors['plate_number'] = "Plate number should be at most 20 characters"
            
            # Vehicle Brand validation
            if not vehicle_brand:
                errors['vehicle_brand'] = "Vehicle brand is required"
            elif len(vehicle_brand) > 50:
                errors['vehicle_brand'] = "Vehicle brand should be at most 50 characters"
            
            # Vehicle Model validation
            if not vehicle_model:
                errors['vehicle_model'] = "Vehicle model is required"
            elif len(vehicle_model) > 50:
                errors['vehicle_model'] = "Vehicle model should be at most 50 characters"
            
            # License Number validation
            if not license_number:
                errors['license_number'] = "License number is required"
            elif len(license_number) > 20:
                errors['license_number'] = "License number should be at most 20 characters"
            
            # Vehicle Image validation
            if not vehicle_image:
                errors['vehicle_image'] = "Vehicle image is required"
            elif vehicle_image.size > 5 * 1024 * 1024:  # 5MB limit
                errors['vehicle_image'] = "Vehicle image should be less than 5MB"
            elif not vehicle_image.content_type.startswith('image/'):
                errors['vehicle_image'] = "Please upload a valid image file"
            
            # License Image validation
            if not license_image:
                errors['license_image'] = "License image is required"
            elif license_image.size > 5 * 1024 * 1024:  # 5MB limit
                errors['license_image'] = "License image should be less than 5MB"
            elif not license_image.content_type.startswith('image/'):
                errors['license_image'] = "License image should be a valid image file"
            
            # Return validation errors if any
            if errors:
                user.delete()
                return Response({"errors": errors}, status=400)
            
            # Create rider data
            rider_data = {
                'rider': user.id,  # Changed from rider_id to user
                'vehicle_type': vehicle_type,
                'plate_number': plate_number,
                'vehicle_brand': vehicle_brand,
                'vehicle_model': vehicle_model,
                'license_number': license_number,
                'verified': False,
                'vehicle_image': vehicle_image,
                'license_image': license_image
            }
            
            rider_serializer = RiderSerializer(data=rider_data)
            if rider_serializer.is_valid():
                rider = rider_serializer.save()
                
                return Response({
                    "message": "Rider registration completed successfully",
                    "user_id": str(user.id),  # Changed from user.user_id to user.id
                    "rider_id": str(rider.rider),  # Changed from rider.rider_id to rider.user.id
                    "registration_stage": user.registration_stage,
                    "status": "pending_verification"
                })
            else:
                # Delete the created user if rider creation fails
                user.delete()
                return Response({"errors": rider_serializer.errors}, status=400)
                
        except Exception as e:
            # Clean up: delete user if any error occurs
            if 'user' in locals():
                user.delete()
            return Response({"error": f"Registration failed: {str(e)}"}, status=500)

    def hash_image_file(self, image_file):
        """Helper method to hash image files for verification"""
        if not image_file:
            return None
        return hashlib.sha256(image_file.read()).hexdigest()
    
# for admin
class AdminProduct(viewsets.ViewSet):
    """
    ViewSet for admin product metrics and analytics
    """
    
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """
        Get comprehensive product metrics for admin dashboard
        """
        try:
            total_products = Product.objects.count()
            
            # Low Stock Alert (quantity < 5) with fallback
            low_stock_count = Product.objects.filter(quantity__lt=5).count()
            
            # Active Boosts with fallback
            active_boosts_count = Boost.objects.filter(
                product__isnull=False,
                status='active'
            ).count()
            
            # Compute average rating from Reviews (using product-based reviews)
            rating_agg = Review.objects.filter(product__isnull=False).aggregate(
                avg_rating=Avg('rating'),
                total_reviews=Count('id')
            )
            avg_rating = rating_agg['avg_rating'] or 0.0
            
            # Compute engagement metrics from CustomerActivity
            engagement_data = CustomerActivity.objects.filter(
                product__isnull=False
            ).values('product', 'activity_type').annotate(
                count=Count('activity_type')
            )
            
            # Create a dictionary to store engagement metrics per product
            product_engagement = {}
            for engagement in engagement_data:
                product_id = engagement['product']  # Changed from 'product_id' to 'product'
                activity_type = engagement['activity_type']
                count = engagement['count']
                
                if product_id not in product_engagement:
                    product_engagement[product_id] = {
                        'views': 0,
                        'purchases': 0,
                        'favorites': 0,
                        'total_engagement': 0
                    }
                
                if activity_type == 'view':
                    product_engagement[product_id]['views'] = count
                elif activity_type == 'purchase':
                    product_engagement[product_id]['purchases'] = count
                elif activity_type == 'favorite':
                    product_engagement[product_id]['favorites'] = count
                
                # Calculate total engagement
                product_engagement[product_id]['total_engagement'] = (
                    product_engagement[product_id]['views'] +
                    product_engagement[product_id]['purchases'] +
                    product_engagement[product_id]['favorites']
                )
            
            # Get top products by engagement
            top_products_data = []
            if product_engagement:
                # Get product details for top engaged products
                top_product_ids = sorted(
                    product_engagement.keys(),
                    key=lambda x: product_engagement[x]['total_engagement'],
                    reverse=True
                )[:5]
                
                top_products = Product.objects.filter(id__in=top_product_ids)  # Changed from product_id to id
                product_map = {product.id: product for product in top_products}  # Changed from product_id to id
                
                for product_id in top_product_ids:
                    if product_id in product_map:
                        product = product_map[product_id]
                        engagement = product_engagement[product_id]
                        top_products_data.append({
                            'name': product.name,
                            'views': engagement['views'],
                            'purchases': engagement['purchases'],
                            'favorites': engagement['favorites'],
                            'total_engagement': engagement['total_engagement']
                        })
            
            # If no engagement data, get top products by creation date as fallback
            if not top_products_data:
                top_products = Product.objects.all().order_by('-created_at')[:5]
                top_products_data = [
                    {
                        'name': product.name,
                        'views': 0,
                        'purchases': 0,
                        'favorites': 0,
                        'total_engagement': 0
                    }
                    for product in top_products
                ]
            
            # Rating Distribution from Reviews (product-based)
            rating_distribution = Review.objects.filter(
            ).values('rating').annotate(
                count=Count('rating')
            ).order_by('-rating')
            
            rating_distribution_data = [
                {
                    'name': f'{rating["rating"]} Stars',
                    'value': rating['count']
                }
                for rating in rating_distribution
                if rating['rating'] is not None
            ]
            
            # Fill in missing ratings
            existing_ratings = {rd['name'][0] for rd in rating_distribution_data}
            for rating_val in [5, 4, 3, 2, 1]:
                if str(rating_val) not in existing_ratings:
                    rating_distribution_data.append({
                        'name': f'{rating_val} Stars',
                        'value': 0
                    })
            
            # Sort rating distribution
            rating_distribution_data.sort(key=lambda x: x['name'], reverse=True)
            
            response_data = {
                'success': True,
                'metrics': {
                    'total_products': total_products,
                    'low_stock_alert': low_stock_count,
                    'active_boosts': active_boosts_count,
                    'avg_rating': round(avg_rating, 1),
                    'top_products': top_products_data,
                    'rating_distribution': rating_distribution_data,
                    'has_data': any([
                        total_products > 0,
                        low_stock_count > 0,
                        active_boosts_count > 0,
                        avg_rating > 0,
                        len(top_products_data) > 0
                    ])
                },
                'message': 'Metrics retrieved successfully',
                'data_source': 'database'
            }

            print(rating_distribution_data)
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving metrics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_products_list(self, request):
        """
        Get paginated list of products for admin with search and filter
        """
        try:
            # Get query parameters
            search = request.query_params.get('search', '')
            category = request.query_params.get('category', 'all')
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
            
            products = Product.objects.all().order_by('name').select_related('shop', 'category')
            
            # Apply search filter
            if search:
                products = products.filter(
                    Q(name__icontains=search) | 
                    Q(description__icontains=search)
                )
            
            # Apply category filter
            if category != 'all':
                products = products.filter(category__name=category)
            
            # Get product IDs for related data queries
            product_ids = list(products.values_list('id', flat=True))  # Changed from product_id to id
            
            # Compute engagement data from CustomerActivity
            engagement_data = CustomerActivity.objects.filter(
                product__in=product_ids
            ).values('product', 'activity_type').annotate(
                count=Count('activity_type')
            )
            
            engagement_map = {}
            for engagement in engagement_data:
                product_id = engagement['product']  # Changed from product_id to product
                activity_type = engagement['activity_type']
                count = engagement['count']
                
                if product_id not in engagement_map:
                    engagement_map[product_id] = {'views': 0, 'purchases': 0, 'favorites': 0}
                
                if activity_type == 'view':
                    engagement_map[product_id]['views'] = count
                elif activity_type == 'purchase':
                    engagement_map[product_id]['purchases'] = count
                elif activity_type == 'favorite':
                    engagement_map[product_id]['favorites'] = count
            
            # Compute variants count
            variants_data = Variants.objects.filter(
                product__in=product_ids
            ).values('product').annotate(
                variants_count=Count('id')
            )
            
            variants_map = {vd['product']: vd['variants_count'] for vd in variants_data}
            
            # Compute issues count
            issues_data = Issues.objects.filter(
                product__in=product_ids
            ).values('product').annotate(
                issues_count=Count('id')
            )
            
            issues_map = {id['product']: id['issues_count'] for id in issues_data}
            
            # Compute boost plan
            boost_data = Boost.objects.filter(
                product__in=product_ids
            ).select_related('boost_plan')
            
            boost_map = {}
            for boost in boost_data:
                if boost.boost_plan:
                    boost_map[boost.product.id] = boost.boost_plan.name  # Changed from product_id to id
            
            # Pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            paginated_products = products[start_index:end_index]
            total_count = products.count()
            
            # Serialize with computed fields - MATCHING REACT EXPECTATIONS EXACTLY
            products_data = []
            for product in paginated_products:
                product_id = product.id  # Changed from product_id to id
                
                # Get computed engagement data
                engagement = engagement_map.get(product_id, {'views': 0, 'purchases': 0, 'favorites': 0})
                
                # Get product rating from reviews
                product_rating = Review.objects.filter(product=product).aggregate(
                    avg_rating=Avg('rating')
                )['avg_rating'] or 0.0
                
                # Get computed counts
                variants_count = variants_map.get(product_id, 0)
                issues_count = issues_map.get(product_id, 0)
                
                # Get boost plan
                boost_plan = boost_map.get(product_id, 'None')
                
                # Determine low stock
                low_stock = product.quantity < 5
                
                # Build product data EXACTLY matching React expectations
                product_data = {
                    'id': str(product_id),  # Convert to string for consistency
                    'name': product.name,
                    'category': product.category.name if product.category else 'Uncategorized',
                    'shop': product.shop.name if product.shop else 'No Shop',
                    'price': str(product.price),  # Keep as string for React
                    'quantity': product.quantity,
                    'condition': product.condition,
                    'status': product.status,
                    'views': engagement['views'],
                    'purchases': engagement['purchases'],
                    'favorites': engagement['favorites'],
                    'rating': round(product_rating, 1),
                    'boostPlan': boost_plan,  # Exact field name React expects
                    'variants': variants_count,
                    'issues': issues_count,
                    'lowStock': low_stock,
                    'created_at': product.created_at.isoformat() if product.created_at else None,
                    'updated_at': product.updated_at.isoformat() if product.updated_at else None
                }
                products_data.append(product_data)
            
            response_data = {
                'success': True,
                'products': products_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size
                },
                'message': 'Products retrieved successfully',
                'data_source': 'database'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving products: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class AdminShops(viewsets.ViewSet):
    """
    ViewSet for admin shop management and analytics
    """
    
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """
        Get comprehensive shop metrics for admin dashboard
        """
        try:
            # Calculate total metrics
            total_shops = Shop.objects.count()
            
            # Calculate total followers from ShopFollow
            total_followers = ShopFollow.objects.count()
            
            # Calculate average rating from Reviews
            rating_agg = Review.objects.aggregate(
                avg_rating=Avg('rating'),
                total_reviews=Count('id')
            )
            avg_rating = rating_agg['avg_rating'] or 0.0
            
            # Get verified shops count
            verified_shops = Shop.objects.filter(verified=True).count()
            
            # Get top shop by rating
            top_shop = Shop.objects.annotate(
                avg_rating=Avg('reviews__rating'),
                followers_count=Count('followers')
            ).filter(avg_rating__isnull=False).order_by('-avg_rating').first()
            
            top_shop_name = top_shop.name if top_shop else "No shops"
            
            response_data = {
                'success': True,
                'metrics': {
                    'total_shops': total_shops,
                    'total_followers': total_followers,
                    'avg_rating': round(float(avg_rating), 1),
                    'verified_shops': verified_shops,
                    'top_shop_name': top_shop_name,
                },
                'message': 'Metrics retrieved successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving metrics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_shops_list(self, request):
        """
        Get list of all shops with computed metrics
        """
        try:
            # Get all shops with customer data AND user data
            shops = Shop.objects.all().select_related('customer__customer')
            
            # Get shop IDs for related data queries
            shop_ids = list(shops.values_list('id', flat=True))
            
            # Compute followers count for each shop
            followers_data = ShopFollow.objects.filter(
                shop__in=shop_ids
            ).values('shop').annotate(
                followers_count=Count('id')
            )
            followers_map = {fd['shop']: fd['followers_count'] for fd in followers_data}
            
            # Compute products count for each shop
            products_data = Product.objects.filter(
                shop__in=shop_ids
            ).values('shop').annotate(
                products_count=Count('id')
            )
            products_map = {pd['shop']: pd['products_count'] for pd in products_data}
            
            # Compute ratings for each shop
            ratings_data = Review.objects.filter(
                shop__in=shop_ids
            ).values('shop').annotate(
                avg_rating=Avg('rating'),
                total_ratings=Count('id')
            )
            ratings_map = {rd['shop']: rd for rd in ratings_data}
            
            # Compute active boosts for each shop
            boosts_data = Boost.objects.filter(
                shop__in=shop_ids
            ).values('shop').annotate(
                active_boosts=Count('id')
            )
            boosts_map = {bd['shop']: bd['active_boosts'] for bd in boosts_data}
            
            # Build shops data matching React structure exactly
            shops_data = []
            for shop in shops:
                shop_id = shop.id
                
                # Get owner name - Access through Customer -> User model
                customer = shop.customer
                if customer and customer.customer:
                    user = customer.customer
                    owner_name = f"{user.first_name} {user.last_name}".strip()
                    if not owner_name:
                        owner_name = user.username or "Unknown"
                else:
                    owner_name = "Unknown Owner"
                
                # Get computed metrics
                followers = followers_map.get(shop_id, 0)
                products_count = products_map.get(shop_id, 0)
                rating_info = ratings_map.get(shop_id, {'avg_rating': 0.0, 'total_ratings': 0})
                active_boosts = boosts_map.get(shop_id, 0)
                
                shop_data = {
                    'id': str(shop_id),  # Convert UUID to string for React
                    'name': shop.name,
                    'owner': owner_name,
                    'location': shop.city or shop.province or 'Unknown',
                    'followers': followers,
                    'products': products_count,
                    'rating': float(rating_info['avg_rating']),
                    'totalRatings': rating_info['total_ratings'],
                    'status': shop.status,
                    'joinedDate': shop.created_at.isoformat() if shop.created_at else None,
                    'totalSales': float(shop.total_sales),
                    'activeBoosts': active_boosts,
                    'verified': shop.verified
                }
                shops_data.append(shop_data)
            
            response_data = {
                'success': True,
                'shops': shops_data,
                'message': 'Shops retrieved successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving shops: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_analytics_data(self, request):
        """
        Get analytics data for charts
        """
        try:
            # Top shops by rating
            top_shops_by_rating = self._get_top_shops_by_rating()
            
            # Top shops by followers
            top_shops_by_followers = self._get_top_shops_by_followers()
            
            # Shops by location
            shops_by_location = self._get_shops_by_location()
            
            response_data = {
                'success': True,
                'analytics': {
                    'top_shops_by_rating': top_shops_by_rating,
                    'top_shops_by_followers': top_shops_by_followers,
                    'shops_by_location': shops_by_location,
                },
                'message': 'Analytics data retrieved successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving analytics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_top_shops_by_rating(self, limit=5):
        """Get top shops by average rating"""
        shops_with_ratings = Shop.objects.annotate(
            avg_rating=Avg('reviews__rating'),
            followers_count=Count('followers')
        ).filter(avg_rating__isnull=False).order_by('-avg_rating')[:limit]
        
        return [
            {
                'name': shop.name,
                'rating': float(shop.avg_rating),
                'followers': shop.followers_count
            }
            for shop in shops_with_ratings
        ]
    
    def _get_top_shops_by_followers(self, limit=5):
        """Get top shops by number of followers"""
        shops_with_followers = Shop.objects.annotate(
            followers_count=Count('followers'),
            avg_rating=Avg('reviews__rating')
        ).filter(followers_count__gt=0).order_by('-followers_count')[:limit]
        
        return [
            {
                'name': shop.name,
                'followers': shop.followers_count,
                'rating': float(shop.avg_rating or 0)
            }
            for shop in shops_with_followers
        ]
    
    def _get_shops_by_location(self):
        """Get shop count by location"""
        locations = Shop.objects.values('city').annotate(
            count=Count('id')
        ).exclude(city__isnull=True).exclude(city='')
        
        return [
            {
                'name': loc['city'],
                'value': loc['count']
            }
            for loc in locations
        ]    

class AdminBoosting(viewsets.ViewSet):
    """
    ViewSet for admin boost management and analytics
    """
    
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """
        Get comprehensive boost metrics for admin dashboard
        """
        try:
            # Calculate total metrics
            total_boosts = Boost.objects.count()
            active_boosts = Boost.objects.filter(status='active').count()
            total_boost_plans = BoostPlan.objects.count()
            active_boost_plans = BoostPlan.objects.filter(status='active').count()
            
            # Calculate total revenue from boost plans
            total_revenue = BoostPlan.objects.aggregate(
                total_revenue=Sum('price')
            )['total_revenue'] or 0
            
            # Calculate expiring soon (within 7 days)
            seven_days_later = timezone.now() + timedelta(days=7)
            expiring_soon = Boost.objects.filter(
                status='active',
                end_date__lte=seven_days_later,
                end_date__gte=timezone.now()
            ).count()
            
            response_data = {
                'success': True,
                'metrics': {
                    'total_boosts': total_boosts,
                    'active_boosts': active_boosts,
                    'total_boost_plans': total_boost_plans,
                    'active_boost_plans': active_boost_plans,
                    'total_revenue': float(total_revenue),
                    'expiring_soon': expiring_soon,
                },
                'message': 'Metrics retrieved successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving metrics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_boost_plans(self, request):
        """
        Get all boost plans with additional data
        """
        try:
            boost_plans = BoostPlan.objects.all().select_related('user')
            
            # Calculate usage count for each plan
            plan_usage = Boost.objects.values('boost_plan').annotate(
                usage_count=Count('id')
            )
            usage_map = {item['boost_plan']: item['usage_count'] for item in plan_usage}
            
            plans_data = []
            for plan in boost_plans:
                plan_data = {
                    'boost_plan_id': str(plan.id),
                    'name': plan.name,
                    'price': float(plan.price),
                    'duration': plan.duration,
                    'time_unit': plan.time_unit,
                    'status': plan.status,
                    'user_id': str(plan.user.id) if plan.user else None,
                    'user_name': plan.user.username if plan.user else 'System',
                    'usage_count': usage_map.get(plan.id, 0),
                    'created_at': plan.created_at.isoformat(),
                    'updated_at': plan.updated_at.isoformat(),
                }
                plans_data.append(plan_data)
            
            response_data = {
                'success': True,
                'boost_plans': plans_data,
                'message': 'Boost plans retrieved successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving boost plans: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_active_boosts(self, request):
        """
        Get all active boosts with related data
        """
        try:
            boosts = Boost.objects.all().order_by('created_at').select_related(
                'product',
                'boost_plan',
                'shop',
                'customer',
                'customer__customer'
            )
            
            boosts_data = []
            for boost in boosts:
                customer_name = "Unknown"
                customer_email = "No email"
                if boost.customer and boost.customer.customer:
                    user = boost.customer.customer
                    customer_name = f"{user.first_name} {user.last_name}".strip()
                    if not customer_name:
                        customer_name = user.username
                    customer_email = user.email or "No email"
                
                # Get shop info
                shop_name = boost.shop.name if boost.shop else None
                
                # Get product info
                product_name = boost.product.name if boost.product else None
                
                # Get boost plan info
                boost_plan_name = boost.boost_plan.name if boost.boost_plan else None
                boost_plan_price = float(boost.boost_plan.price) if boost.boost_plan else 0.0
                
                boost_data = {
                    'boost_id': str(boost.id),
                    'product_id': str(boost.product.id) if boost.product else None,
                    'product_name': product_name,
                    'boost_plan_id': str(boost.boost_plan.id) if boost.boost_plan else None,
                    'boost_plan_name': boost_plan_name,
                    'shop_id': str(boost.shop.id) if boost.shop else None,
                    'shop_name': shop_name,
                    'customer_id': str(boost.customer.customer) if boost.customer and boost.customer.customer else None,
                    'customer_name': customer_name,
                    'customer_email': customer_email,
                    'status': boost.status,
                    'amount': boost_plan_price,  # Get price from boost plan
                    'start_date': boost.start_date.isoformat(),
                    'end_date': boost.end_date.isoformat(),
                    'created_at': boost.created_at.isoformat(),
                    'updated_at': boost.updated_at.isoformat(),
                }
                boosts_data.append(boost_data)
            
            response_data = {
                'success': True,
                'boosts': boosts_data,
                'message': 'Boosts retrieved successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving boosts: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    @action(detail=False, methods=['get'])
    def get_analytics_data(self, request):
        """
        Get analytics data for charts
        """
        try:
            # Top plans by usage
            top_plans_by_usage = self._get_top_plans_by_usage()
            
            # Plan revenue contribution
            plan_revenue_data = self._get_plan_revenue_data()
            
            # Boost trends
            boost_trend_data = self._get_boost_trend_data()
            
            response_data = {
                'success': True,
                'analytics': {
                    'top_plans_by_usage': top_plans_by_usage,
                    'plan_revenue_data': plan_revenue_data,
                    'boost_trend_data': boost_trend_data,
                },
                'message': 'Analytics data retrieved successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving analytics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_top_plans_by_usage(self, limit=5):
        """Get top boost plans by usage count"""
        plans_with_usage = BoostPlan.objects.annotate(
            usage_count=Count('boost')
        ).filter(usage_count__gt=0).order_by('-usage_count')[:limit]
        
        return [
            {
                'name': plan.name,
                'usage': plan.usage_count,
                'duration': f"{plan.duration} {plan.time_unit}",
                'price': float(plan.price)
            }
            for plan in plans_with_usage
        ]
    
    def _get_plan_revenue_data(self):
        """Get revenue distribution across boost plans"""
        plans = BoostPlan.objects.all()
        
        total_revenue = sum(float(plan.price) for plan in plans)
        
        plan_revenue_data = []
        for plan in plans:
            plan_price = float(plan.price)
            percentage = (plan_price / total_revenue * 100) if total_revenue > 0 else 0
            
            plan_revenue_data.append({
                'name': plan.name,
                'value': plan_price,
                'percentage': round(percentage, 1)
            })
        
        return plan_revenue_data
    
    def _get_boost_trend_data(self, months=6):
        """Get boost trends for the last N months"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30 * months)
        
        # Generate monthly data
        trend_data = []
        current_date = start_date
        
        while current_date <= end_date:
            month_start = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = month_start + timedelta(days=32)
            month_end = next_month.replace(day=1) - timedelta(days=1)
            
            # Count new boosts in this month
            new_boosts = Boost.objects.filter(
                created_at__gte=month_start,
                created_at__lte=month_end
            ).count()
            
            # Count expired boosts in this month
            expired_boosts = Boost.objects.filter(
                end_date__gte=month_start,
                end_date__lte=month_end,
                status='expired'
            ).count()
            
            trend_data.append({
                'month': month_start.strftime('%b'),
                'newBoosts': new_boosts,
                'expired': expired_boosts,
                'full_month': month_start.strftime('%B %Y')
            })
            
            # Move to next month
            current_date = next_month
        
        return trend_data[-months:]  # Return only the last N months
    
    @action(detail=False, methods=['post'])
    def create_boost_plan(self, request):
        """
        Create a new boost plan
        """
        try:
            required_fields = ['name', 'price', 'duration', 'time_unit']
            for field in required_fields:
                if field not in request.data:
                    return Response(
                        {'success': False, 'error': f'Missing required field: {field}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Validate time_unit
            valid_time_units = ['hours', 'days', 'weeks', 'months']
            if request.data['time_unit'] not in valid_time_units:
                return Response(
                    {'success': False, 'error': f'Invalid time_unit. Must be one of: {valid_time_units}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            boost_plan = BoostPlan.objects.create(
                name=request.data['name'],
                price=request.data['price'],
                duration=request.data['duration'],
                time_unit=request.data['time_unit'],
                status=request.data.get('status', 'active'),
                user=request.user if request.user.is_authenticated else None
            )
            
            response_data = {
                'success': True,
                'boost_plan': {
                    'boost_plan_id': str(boost_plan.id),
                    'name': boost_plan.name,
                    'price': float(boost_plan.price),
                    'duration': boost_plan.duration,
                    'time_unit': boost_plan.time_unit,
                    'status': boost_plan.status,
                    'created_at': boost_plan.created_at.isoformat(),
                },
                'message': 'Boost plan created successfully'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error creating boost plan: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['put'])
    def update_boost_plan(self, request):
        """
        Update an existing boost plan
        """
        try:
            boost_plan_id = request.data.get('boost_plan_id')
            if not boost_plan_id:
                return Response(
                    {'success': False, 'error': 'boost_plan_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                boost_plan = BoostPlan.objects.get(id=boost_plan_id)
            except BoostPlan.DoesNotExist:
                return Response(
                    {'success': False, 'error': 'Boost plan not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update fields
            updatable_fields = ['name', 'price', 'duration', 'time_unit', 'status']
            for field in updatable_fields:
                if field in request.data:
                    setattr(boost_plan, field, request.data[field])
            
            boost_plan.save()
            
            response_data = {
                'success': True,
                'boost_plan': {
                    'boost_plan_id': str(boost_plan.id),
                    'name': boost_plan.name,
                    'price': float(boost_plan.price),
                    'duration': boost_plan.duration,
                    'time_unit': boost_plan.time_unit,
                    'status': boost_plan.status,
                    'updated_at': boost_plan.updated_at.isoformat(),
                },
                'message': 'Boost plan updated successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error updating boost plan: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['delete'])
    def delete_boost_plan(self, request):
        """
        Delete a boost plan (soft delete by setting status to archived)
        """
        try:
            boost_plan_id = request.data.get('boost_plan_id')
            if not boost_plan_id:
                return Response(
                    {'success': False, 'error': 'boost_plan_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                boost_plan = BoostPlan.objects.get(id=boost_plan_id)
            except BoostPlan.DoesNotExist:
                return Response(
                    {'success': False, 'error': 'Boost plan not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if plan is being used
            active_boosts = Boost.objects.filter(boost_plan=boost_plan, status='active').count()
            if active_boosts > 0:
                return Response(
                    {'success': False, 'error': f'Cannot delete plan with {active_boosts} active boosts'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Soft delete by archiving
            boost_plan.status = 'archived'
            boost_plan.save()
            
            response_data = {
                'success': True,
                'message': 'Boost plan archived successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error deleting boost plan: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
             

class AdminOrders(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """Get order metrics and analytics data for admin dashboard"""
        try:
            # Calculate date ranges
            today = timezone.now().date()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            # Calculate metrics based on Orders
            total_orders = Order.objects.count()
            completed_orders = Order.objects.filter(status='completed').count()
            pending_orders = Order.objects.filter(status='pending').count()
            cancelled_orders = Order.objects.filter(status='cancelled').count()
            
            # Calculate revenue from Orders
            revenue_data = Order.objects.filter(status='completed').aggregate(
                total_revenue=Sum('total_amount')
            )
            total_revenue = revenue_data['total_revenue'] or Decimal('0')
            
            # Today's orders
            today_orders = Order.objects.filter(
                created_at__date=today
            ).count()
            
            # Monthly orders
            monthly_orders = Order.objects.filter(
                created_at__date__gte=month_ago
            ).count()
            
            # Average order value
            avg_order_value = Decimal('0')
            if completed_orders > 0:
                avg_order_value = total_revenue / completed_orders
            
            # Success rate
            success_rate = Decimal('0')
            if total_orders > 0:
                success_rate = (completed_orders / total_orders) * 100
            
            # Compile metrics
            order_metrics = {
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'completed_orders': completed_orders,
                'cancelled_orders': cancelled_orders,
                'total_revenue': float(total_revenue),
                'today_orders': today_orders,
                'monthly_orders': monthly_orders,
                'avg_order_value': float(avg_order_value),
                'success_rate': float(success_rate),
            }
            
            # Get analytics data
            analytics_data = self._get_analytics_data()
            
            # Get recent orders with related data
            recent_orders = self._get_recent_orders()
            
            return Response({
                'success': True,
                'metrics': order_metrics,
                'analytics': analytics_data,
                'orders': recent_orders
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_analytics_data(self):
        """Generate analytics data for charts"""
        # Daily orders for the past 7 days
        daily_orders = []
        today = timezone.now().date()
        
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
        
        # Status distribution
        status_distribution = []
        status_counts = Order.objects.values('status').annotate(count=Count('order'))
        
        for status_data in status_counts:
            status_distribution.append({
                'name': status_data['status'].capitalize(),
                'value': status_data['count']
            })
        
        # Payment method distribution (from Order model)
        payment_method_distribution = []
        payment_counts = Order.objects.values('payment_method').annotate(count=Count('order'))
        
        for payment_data in payment_counts:
            payment_method_distribution.append({
                'name': payment_data['payment_method'],
                'value': payment_data['count']
            })
        
        return {
            'daily_orders': daily_orders,
            'status_distribution': status_distribution,
            'payment_method_distribution': payment_method_distribution
        }
    
    def _get_recent_orders(self, limit=50):
        """Get recent orders with all related data"""
        orders = Order.objects.select_related(
            'user'
        ).prefetch_related(
            'checkout_set',
            'checkout_set__cart_item',
            'checkout_set__cart_item__product',
            'checkout_set__cart_item__product__shop',
            'checkout_set__voucher'
        ).order_by('-created_at')[:limit]
        
        order_list = []
        
        for order in orders:
            # Get all checkouts for this order
            order_checkouts = order.checkout_set.select_related(
                'cart_item',
                'cart_item__product',
                'cart_item__product__shop',
                'cart_item__user',
                'voucher'
            ).all()
            
            # Process items in the order
            items = []
            for checkout in order_checkouts:
                cart_item = checkout.cart_item
                product = cart_item.product if cart_item else None
                shop = product.shop if product else None
                user = cart_item.user if cart_item else None
                
                item_data = {
                    'id': str(checkout.id),
                    'cart_item': {
                        'id': str(cart_item.id) if cart_item else None,
                        'product': {
                            'id': str(product.id) if product else None,
                            'name': product.name if product else 'Unknown Product',
                            'price': float(product.price) if product else 0,
                            'shop': {
                                'id': str(shop.id) if shop else None,
                                'name': shop.name if shop else 'Unknown Shop'
                            }
                        },
                        'quantity': cart_item.quantity if cart_item else 0,
                        'user': {
                            'id': str(user.id) if user else None,
                            'username': user.username if user else 'Unknown User',
                            'email': user.email if user else '',
                            'first_name': user.first_name if user else '',
                            'last_name': user.last_name if user else ''
                        }
                    },
                    'quantity': checkout.quantity,
                    'total_amount': float(checkout.total_amount),
                    'status': checkout.status,
                    'remarks': checkout.remarks or '',
                }
                
                # Add voucher data if exists
                if checkout.voucher:
                    item_data['voucher'] = {
                        'id': str(checkout.voucher.id),
                        'name': checkout.voucher.name,
                        'code': checkout.voucher.code,
                        'value': float(checkout.voucher.value)
                    }
                
                items.append(item_data)
            
            order_data = {
                'order_id': str(order.order),
                'user': {
                    'id': str(order.user.id),
                    'username': order.user.username,
                    'email': order.user.email,
                    'first_name': order.user.first_name,
                    'last_name': order.user.last_name
                },
                'status': order.status,
                'total_amount': float(order.total_amount),
                'payment_method': order.payment_method,
                'delivery_address': order.delivery_address,
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'updated_at': order.updated_at.isoformat() if order.updated_at else None,
                'items': items
            }
            
            order_list.append(order_data)
        
        return order_list
    
    @action(detail=False, methods=['get'])
    def get_order_details(self, request):
        """Get detailed order information"""
        order_id = request.query_params.get('order_id')
        
        if not order_id:
            return Response({
                'success': False,
                'error': 'Order ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            order = Order.objects.select_related(
                'user'
            ).prefetch_related(
                'checkout_set',
                'checkout_set__cart_item',
                'checkout_set__cart_item__product',
                'checkout_set__cart_item__product__shop',
                'checkout_set__voucher'
            ).get(order=order_id)
            
            # Process order items
            items = []
            for checkout in order.checkout_set.all():
                cart_item = checkout.cart_item
                product = cart_item.product if cart_item else None
                shop = product.shop if product else None
                user = cart_item.user if cart_item else None
                
                item_data = {
                    'id': str(checkout.id),
                    'cart_item': {
                        'id': str(cart_item.id) if cart_item else None,
                        'product': {
                            'id': str(product.id) if product else None,
                            'name': product.name if product else 'Unknown Product',
                            'description': product.description if product else '',
                            'price': float(product.price) if product else 0,
                            'quantity': product.quantity if product else 0,
                            'condition': product.condition if product else '',
                            'shop': {
                                'id': str(shop.id) if shop else None,
                                'name': shop.name if shop else 'Unknown Shop',
                                'contact_number': shop.contact_number if shop else ''
                            }
                        },
                        'quantity': cart_item.quantity if cart_item else 0,
                        'user': {
                            'id': str(user.id) if user else None,
                            'username': user.username if user else 'Unknown User',
                            'email': user.email if user else '',
                            'first_name': user.first_name if user else '',
                            'last_name': user.last_name if user else '',
                            'contact_number': user.contact_number if user else ''
                        }
                    },
                    'quantity': checkout.quantity,
                    'total_amount': float(checkout.total_amount),
                    'status': checkout.status,
                    'remarks': checkout.remarks or '',
                }
                
                if checkout.voucher:
                    item_data['voucher'] = {
                        'id': str(checkout.voucher.id),
                        'name': checkout.voucher.name,
                        'code': checkout.voucher.code,
                        'value': float(checkout.voucher.value),
                        'discount_type': checkout.voucher.discount_type
                    }
                
                items.append(item_data)
            
            order_data = {
                'order_id': str(order.order),
                'user': {
                    'id': str(order.user.id),
                    'username': order.user.username,
                    'email': order.user.email,
                    'first_name': order.user.first_name,
                    'last_name': order.user.last_name,
                    'contact_number': order.user.contact_number
                },
                'status': order.status,
                'total_amount': float(order.total_amount),
                'payment_method': order.payment_method,
                'delivery_address': order.delivery_address,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'items': items
            }
            
            return Response({
                'success': True,
                'order': order_data
            })
            
        except Order.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def update_order_status(self, request):
        """Update order status"""
        order_id = request.data.get('order_id')
        new_status = request.data.get('status')
        
        if not order_id or not new_status:
            return Response({
                'success': False,
                'error': 'Order ID and status are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            order = Order.objects.get(order=order_id)
            order.status = new_status
            order.save()
            
            return Response({
                'success': True,
                'message': f'Order status updated to {new_status}'
            })
            
        except Order.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def get_order_stats(self, request):
        """Get additional order statistics"""
        try:
            # Time-based statistics
            today = timezone.now().date()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            # Revenue statistics
            daily_revenue = Order.objects.filter(
                status='completed',
                created_at__date=today
            ).aggregate(revenue=Sum('total_amount'))['revenue'] or Decimal('0')
            
            weekly_revenue = Order.objects.filter(
                status='completed',
                created_at__date__gte=week_ago
            ).aggregate(revenue=Sum('total_amount'))['revenue'] or Decimal('0')
            
            monthly_revenue = Order.objects.filter(
                status='completed',
                created_at__date__gte=month_ago
            ).aggregate(revenue=Sum('total_amount'))['revenue'] or Decimal('0')
            
            # Top customers by order count
            top_customers = Order.objects.values(
                'user__username',
                'user__first_name',
                'user__last_name'
            ).annotate(
                order_count=Count('order'),
                total_spent=Sum('total_amount')
            ).order_by('-total_spent')[:10]
            
            # Top products by order count (through checkouts)
            top_products = Checkout.objects.filter(
                order__isnull=False,
                cart_item__product__isnull=False
            ).values(
                'cart_item__product__name'
            ).annotate(
                order_count=Count('order', distinct=True)
            ).order_by('-order_count')[:10]
            
            stats = {
                'revenue_today': float(daily_revenue),
                'revenue_week': float(weekly_revenue),
                'revenue_month': float(monthly_revenue),
                'top_customers': list(top_customers),
                'top_products': list(top_products)
            }
            
            return Response({
                'success': True,
                'stats': stats
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminRiders(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """Get rider metrics and analytics data for admin dashboard"""
        try:
            # Calculate date ranges
            today = timezone.now().date()
            month_ago = today - timedelta(days=30)
            
            # Get all riders
            all_riders = Rider.objects.all()
            total_riders = all_riders.count()
            
            # Calculate rider status counts based on verification and approval
            pending_riders = all_riders.filter(verified=False, approval_date__isnull=True).count()
            approved_riders = all_riders.filter(verified=True, approval_date__isnull=False).count()
            
            # Get active riders (those with deliveries in the last 30 days)
            active_rider_ids = Delivery.objects.filter(
                created_at__date__gte=month_ago
            ).values_list('rider_id', flat=True).distinct()
            active_riders = all_riders.filter(rider_id__in=active_rider_ids).count()
            
            # Delivery statistics
            total_deliveries = Delivery.objects.count()
            completed_deliveries = Delivery.objects.filter(status='delivered').count()
            
            # Success rate
            success_rate = Decimal('0')
            if total_deliveries > 0:
                success_rate = (completed_deliveries / total_deliveries) * 100
            
            # Average rating from reviews (assuming reviews can be for riders via deliveries)
            # This would need a proper relationship between reviews and riders
            average_rating = Decimal('4.5')  # Placeholder - you'd need to implement this
            
            # Total earnings (from completed deliveries)
            # This would need a proper earnings model or calculation
            total_earnings = Decimal('0')  # Placeholder
            
            # Compile metrics
            rider_metrics = {
                'total_riders': total_riders,
                'pending_riders': pending_riders,
                'approved_riders': approved_riders,
                'active_riders': active_riders,
                'total_deliveries': total_deliveries,
                'completed_deliveries': completed_deliveries,
                'success_rate': float(success_rate),
                'average_rating': float(average_rating),
                'total_earnings': float(total_earnings),
            }
            
            # Get analytics data
            analytics_data = self._get_analytics_data()
            
            # Get riders with related data
            riders_data = self._get_riders_data()
            
            return Response({
                'success': True,
                'metrics': rider_metrics,
                'analytics': analytics_data,
                'riders': riders_data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_analytics_data(self):
        """Generate analytics data for charts"""
        today = timezone.now().date()
        
        # Rider registrations for the past 30 days
        rider_registrations = []
        for i in range(29, -1, -1):  # Last 30 days including today
            date = today - timedelta(days=i)
            count = Rider.objects.filter(
                rider__created_at__date=date
            ).count()
            
            rider_registrations.append({
                'date': date.strftime('%b %d'),
                'count': count
            })
        
        # Status distribution
        status_distribution = [
            {
                'name': 'Approved',
                'value': Rider.objects.filter(verified=True, approval_date__isnull=False).count()
            },
            {
                'name': 'Pending',
                'value': Rider.objects.filter(verified=False, approval_date__isnull=True).count()
            },
            {
                'name': 'Rejected',
                'value': Rider.objects.filter(verified=False, approval_date__isnull=False).count()
            }
        ]
        
        # Vehicle type distribution
        vehicle_type_distribution = []
        vehicle_counts = Rider.objects.exclude(vehicle_type='').values('vehicle_type').annotate(count=Count('rider'))
        
        for vehicle_data in vehicle_counts:
            vehicle_type_distribution.append({
                'name': vehicle_data['vehicle_type'],
                'value': vehicle_data['count']
            })
        
        # Performance trends (last 6 months)
        performance_trends = []
        for i in range(5, -1, -1):
            month_start = today.replace(day=1) - timedelta(days=30*i)
            month_name = month_start.strftime('%b %Y')
            
            # This would need proper implementation based on your business logic
            performance_trends.append({
                'month': month_name,
                'deliveries': Delivery.objects.filter(
                    created_at__year=month_start.year,
                    created_at__month=month_start.month
                ).count(),
                'earnings': 0,  # Placeholder - implement based on your earnings model
                'rating': 4.5   # Placeholder - implement based on your rating system
            })
        
        return {
            'rider_registrations': rider_registrations,
            'status_distribution': status_distribution,
            'vehicle_type_distribution': vehicle_type_distribution,
            'performance_trends': performance_trends
        }
    
    def _get_riders_data(self, limit=50):
        """Get riders with all related data"""
        riders = Rider.objects.select_related(
            'rider',
            'approved_by'
        ).prefetch_related(
            'delivery_set'
        ).order_by('-rider__created_at')[:limit]
        
        rider_list = []
        
        for rider in riders:
            # Calculate performance metrics for this rider
            rider_deliveries = rider.delivery_set.all()
            total_deliveries = rider_deliveries.count()
            completed_deliveries = rider_deliveries.filter(status='delivered').count()
            
            # Compute rider status based on verification and approval
            if rider.verified and rider.approval_date:
                rider_status = 'approved'
            elif not rider.verified and not rider.approval_date:
                rider_status = 'pending'
            elif not rider.verified and rider.approval_date:
                rider_status = 'rejected'
            else:
                rider_status = 'pending'
            
            rider_data = {
                'rider': {
                    'id': str(rider.rider.id),
                    'username': rider.rider.username,
                    'email': rider.rider.email,
                    'first_name': rider.rider.first_name,
                    'last_name': rider.rider.last_name,
                    'contact_number': rider.rider.contact_number,
                    'created_at': rider.rider.created_at.isoformat() if rider.rider.created_at else None,
                    'is_rider': rider.rider.is_rider,
                },
                'vehicle_type': rider.vehicle_type,
                'plate_number': rider.plate_number,
                'vehicle_brand': rider.vehicle_brand,
                'vehicle_model': rider.vehicle_model,
                'vehicle_image': rider.vehicle_image.url if rider.vehicle_image else None,
                'license_number': rider.license_number,
                'license_image': rider.license_image.url if rider.license_image else None,
                'verified': rider.verified,
                'approved_by': {
                    'id': str(rider.approved_by.id),
                    'username': rider.approved_by.username,
                } if rider.approved_by else None,
                'approval_date': rider.approval_date.isoformat() if rider.approval_date else None,
                # Computed fields for frontend
                'total_deliveries': total_deliveries,
                'completed_deliveries': completed_deliveries,
                'average_rating': 4.5,  # Placeholder - implement proper rating calculation
                'total_earnings': 0,    # Placeholder - implement proper earnings calculation
                'rider_status': rider_status,
            }
            
            rider_list.append(rider_data)
        
        return rider_list
    
    @action(detail=False, methods=['get'])
    def get_rider_details(self, request):
        """Get detailed rider information"""
        rider_id = request.query_params.get('rider_id')
        
        if not rider_id:
            return Response({
                'success': False,
                'error': 'Rider ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            rider = Rider.objects.select_related(
                'rider',
                'approved_by'
            ).prefetch_related(
                'delivery_set',
                'delivery_set__order'
            ).get(rider_id=rider_id)
            
            # Get rider's delivery history
            deliveries = rider.delivery_set.select_related('order').all()
            delivery_history = []
            
            for delivery in deliveries:
                delivery_data = {
                    'id': str(delivery.id),
                    'order_id': str(delivery.order.order),
                    'status': delivery.status,
                    'picked_at': delivery.picked_at.isoformat() if delivery.picked_at else None,
                    'delivered_at': delivery.delivered_at.isoformat() if delivery.delivered_at else None,
                    'created_at': delivery.created_at.isoformat(),
                }
                delivery_history.append(delivery_data)
            
            # Calculate performance metrics
            total_deliveries = deliveries.count()
            completed_deliveries = deliveries.filter(status='delivered').count()
            success_rate = (completed_deliveries / total_deliveries * 100) if total_deliveries > 0 else 0
            
            rider_details = {
                'rider': {
                    'id': str(rider.rider.id),
                    'username': rider.rider.username,
                    'email': rider.rider.email,
                    'first_name': rider.rider.first_name,
                    'last_name': rider.rider.last_name,
                    'contact_number': rider.rider.contact_number,
                    'created_at': rider.rider.created_at.isoformat(),
                    'is_rider': rider.rider.is_rider,
                },
                'vehicle_info': {
                    'type': rider.vehicle_type,
                    'plate_number': rider.plate_number,
                    'brand': rider.vehicle_brand,
                    'model': rider.vehicle_model,
                    'vehicle_image': rider.vehicle_image.url if rider.vehicle_image else None,
                },
                'license_info': {
                    'number': rider.license_number,
                    'image': rider.license_image.url if rider.license_image else None,
                },
                'verification_info': {
                    'verified': rider.verified,
                    'approved_by': rider.approved_by.username if rider.approved_by else None,
                    'approval_date': rider.approval_date.isoformat() if rider.approval_date else None,
                },
                'performance': {
                    'total_deliveries': total_deliveries,
                    'completed_deliveries': completed_deliveries,
                    'success_rate': float(success_rate),
                    'average_rating': 4.5,  # Placeholder
                    'total_earnings': 0,    # Placeholder
                },
                'delivery_history': delivery_history,
            }
            
            return Response({
                'success': True,
                'rider': rider_details
            })
            
        except Rider.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Rider not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def update_rider_status(self, request):
        """Approve or reject rider"""
        rider_id = request.data.get('rider_id')
        action_type = request.data.get('action')  # 'approve' or 'reject'
        
        if not rider_id or not action_type:
            return Response({
                'success': False,
                'error': 'Rider ID and action are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            rider = Rider.objects.get(rider_id=rider_id)
            
            if action_type == 'approve':
                rider.verified = True
                rider.approval_date = timezone.now()
                rider.approved_by = request.user
                message = 'Rider approved successfully'
            elif action_type == 'reject':
                rider.verified = False
                rider.approval_date = timezone.now()
                rider.approved_by = request.user
                message = 'Rider rejected successfully'
            else:
                return Response({
                    'success': False,
                    'error': 'Invalid action. Use "approve" or "reject"'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            rider.save()
            
            return Response({
                'success': True,
                'message': message
            })
            
        except Rider.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Rider not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def get_rider_stats(self, request):
        """Get additional rider statistics"""
        try:
            # Time-based statistics
            today = timezone.now().date()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            # Delivery statistics
            weekly_deliveries = Delivery.objects.filter(
                created_at__date__gte=week_ago
            ).count()
            
            monthly_deliveries = Delivery.objects.filter(
                created_at__date__gte=month_ago
            ).count()
            
            # Top riders by delivery count
            top_riders = Rider.objects.annotate(
                delivery_count=Count('delivery'),
                completed_deliveries=Count('delivery', filter=Q(delivery__status='delivered'))
            ).filter(delivery_count__gt=0).order_by('-delivery_count')[:10]
            
            top_riders_data = []
            for rider in top_riders:
                top_riders_data.append({
                    'username': rider.rider.username,
                    'first_name': rider.rider.first_name,
                    'last_name': rider.rider.last_name,
                    'delivery_count': rider.delivery_count,
                    'completed_deliveries': rider.completed_deliveries,
                    'success_rate': (rider.completed_deliveries / rider.delivery_count * 100) if rider.delivery_count > 0 else 0
                })
            
            # Vehicle type statistics
            vehicle_stats = Rider.objects.exclude(vehicle_type='').values('vehicle_type').annotate(
                count=Count('rider'),
                active_count=Count('rider', filter=Q(delivery__created_at__date__gte=month_ago))
            )
            
            stats = {
                'weekly_deliveries': weekly_deliveries,
                'monthly_deliveries': monthly_deliveries,
                'top_riders': top_riders_data,
                'vehicle_stats': list(vehicle_stats)
            }
            
            return Response({
                'success': True,
                'stats': stats
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminVouchers(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """
        Get voucher metrics for admin dashboard
        """
        try:
            # Calculate total vouchers
            total_vouchers = Voucher.objects.count()
            
            # Calculate active vouchers (is_active=True and not expired)
            now = timezone.now().date()
            active_vouchers = Voucher.objects.filter(
                is_active=True,
                valid_until__gte=now
            ).count()
            
            # Calculate expired vouchers
            expired_vouchers = Voucher.objects.filter(
                valid_until__lt=now
            ).count()
            
            # Calculate total usage from Checkout model
            total_usage = Checkout.objects.filter(
                voucher__isnull=False
            ).count()
            
            # Calculate total discount amount
            # This would need to be calculated based on actual usage
            # For now, we'll use a placeholder calculation
            total_discount = Checkout.objects.filter(
                voucher__isnull=False
            ).aggregate(
                total_discount=Sum('voucher__value')
            )['total_discount'] or 0
            
            metrics = {
                'total_vouchers': total_vouchers,
                'active_vouchers': active_vouchers,
                'expired_vouchers': expired_vouchers,
                'total_usage': total_usage,
                'total_discount': float(total_discount),
            }
            
            return Response({
                'success': True,
                'metrics': metrics
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def vouchers_list(self, request):
        """
        Get paginated list of vouchers with all required fields
        """
        try:
            # Get query parameters
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 10))
            search = request.GET.get('search', '')
            status_filter = request.GET.get('status', '')
            discount_type = request.GET.get('discount_type', '')
            shop_filter = request.GET.get('shop', '')
            
            # Start with all vouchers
            vouchers_qs = Voucher.objects.select_related(
                'shop', 'created_by'
            ).prefetch_related(
                'checkout_set'
            ).all()
            
            # Apply search filter
            if search:
                vouchers_qs = vouchers_qs.filter(
                    Q(name__icontains=search) |
                    Q(code__icontains=search)
                )
            
            # Apply status filter
            now = timezone.now().date()
            if status_filter:
                if status_filter == 'active':
                    vouchers_qs = vouchers_qs.filter(
                        is_active=True,
                        valid_until__gte=now
                    )
                elif status_filter == 'expired':
                    vouchers_qs = vouchers_qs.filter(
                        valid_until__lt=now
                    )
                elif status_filter == 'scheduled':
                    vouchers_qs = vouchers_qs.filter(
                        is_active=False,
                        valid_until__gte=now
                    )
            
            # Apply discount type filter
            if discount_type:
                vouchers_qs = vouchers_qs.filter(discount_type=discount_type)
            
            # Apply shop filter
            if shop_filter:
                if shop_filter == 'Global':
                    vouchers_qs = vouchers_qs.filter(shop__isnull=True)
                else:
                    vouchers_qs = vouchers_qs.filter(shop__name=shop_filter)
            
            # Calculate total count before pagination
            total_count = vouchers_qs.count()
            
            # Apply pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            vouchers_page = vouchers_qs[start_index:end_index]
            
            # Serialize voucher data
            vouchers_data = []
            for voucher in vouchers_page:
                # Calculate usage count for this voucher
                usage_count = voucher.checkout_set.count()
                
                # Get shop data if exists
                shop_data = None
                if voucher.shop:
                    shop_data = {
                        'id': str(voucher.shop.id),
                        'name': voucher.shop.name
                    }
                
                # Get created_by data if exists
                created_by_data = None
                if voucher.created_by:
                    created_by_data = {
                        'id': str(voucher.created_by.id),
                        'username': voucher.created_by.username,
                        'first_name': voucher.created_by.first_name,
                        'last_name': voucher.created_by.last_name
                    }
                
                # Determine status
                status_value = 'active'
                if not voucher.is_active:
                    if voucher.valid_until >= now:
                        status_value = 'scheduled'
                    else:
                        status_value = 'expired'
                elif voucher.valid_until < now:
                    status_value = 'expired'
                
                voucher_data = {
                    'id': str(voucher.id),
                    'name': voucher.name,
                    'code': voucher.code,
                    'shop': shop_data,
                    'discount_type': voucher.discount_type,
                    'value': float(voucher.value),
                    'minimum_spend': float(voucher.minimum_spend),
                    'maximum_usage': voucher.maximum_usage,
                    'valid_until': voucher.valid_until.isoformat(),
                    'added_at': voucher.added_at.isoformat(),
                    'created_by': created_by_data,
                    'is_active': voucher.is_active,
                    'usage_count': usage_count,
                    'status': status_value,
                    'shopName': shop_data['name'] if shop_data else 'Global'
                }
                vouchers_data.append(voucher_data)
            
            # Get filter options for frontend
            filter_options = {
                'discount_types': list(Voucher.objects.values_list('discount_type', flat=True).distinct()),
                'shops': list(Shop.objects.values_list('name', flat=True).distinct()),
                'statuses': ['active', 'expired', 'scheduled']
            }
            
            return Response({
                'success': True,
                'vouchers': vouchers_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size
                },
                'filter_options': filter_options
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Toggle voucher active status
        """
        try:
            voucher = Voucher.objects.get(id=pk)
            voucher.is_active = not voucher.is_active
            voucher.save()
            
            return Response({
                'success': True,
                'is_active': voucher.is_active,
                'message': f'Voucher {"activated" if voucher.is_active else "deactivated"} successfully'
            })
            
        except Voucher.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Voucher not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['delete'])
    def delete_voucher(self, request, pk=None):
        """
        Delete a voucher
        """
        try:
            voucher = Voucher.objects.get(id=pk)
            voucher_name = voucher.name
            voucher.delete()
            
            return Response({
                'success': True,
                'message': f'Voucher "{voucher_name}" deleted successfully'
            })
            
        except Voucher.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Voucher not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """
        Perform bulk actions on vouchers
        """
        try:
            voucher_ids = request.data.get('voucher_ids', [])
            action_type = request.data.get('action', '')
            
            if not voucher_ids:
                return Response({
                    'success': False,
                    'error': 'No vouchers selected'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            vouchers = Voucher.objects.filter(id__in=voucher_ids)
            
            if action_type == 'activate':
                vouchers.update(is_active=True)
                message = f'{vouchers.count()} vouchers activated successfully'
            elif action_type == 'deactivate':
                vouchers.update(is_active=False)
                message = f'{vouchers.count()} vouchers deactivated successfully'
            elif action_type == 'delete':
                count = vouchers.count()
                vouchers.delete()
                message = f'{count} vouchers deleted successfully'
            else:
                return Response({
                    'success': False,
                    'error': 'Invalid action'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': True,
                'message': message
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
  
class AdminRefunds(viewsets.ViewSet):    
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """Get refund metrics for admin dashboard"""
        try:
            # Calculate all metrics with proper model relationships
            refunds_queryset = Refund.objects.select_related(
                'order', 
                'requested_by', 
                'processed_by'
            )
            
            # Total counts by status
            status_counts = refunds_queryset.values('status').annotate(
                count=Count('refund')
            )
            
            status_count_map = {item['status']: item['count'] for item in status_counts}
            
            # Total refund amount (only approved/completed refunds)
            total_refund_amount = refunds_queryset.filter(
                status__in=['approved', 'completed']
            ).aggregate(
                total_amount=Sum('order__total_amount')
            )['total_amount'] or Decimal('0.00')
            
            # Average processing time in hours (for completed refunds)
            completed_refunds = refunds_queryset.filter(
                status='completed',
                processed_at__isnull=False,
                requested_at__isnull=False
            )
            
            if completed_refunds.exists():
                total_seconds = sum(
                    (refund.processed_at - refund.requested_at).total_seconds()
                    for refund in completed_refunds
                )
                avg_processing_hours = total_seconds / (len(completed_refunds) * 3600)
            else:
                avg_processing_hours = Decimal('0.00')
            
            # Most common reason (excluding empty reasons)
            common_reason = refunds_queryset.exclude(
                Q(reason__isnull=True) | Q(reason__exact='')
            ).values('reason').annotate(
                count=Count('refund')
            ).order_by('-count').first()
            
            # This month's refunds
            current_month = timezone.now().month
            current_year = timezone.now().year
            
            refunds_this_month = refunds_queryset.filter(
                requested_at__month=current_month,
                requested_at__year=current_year
            ).count()
            
            # Average refund amount
            avg_refund_amount = refunds_queryset.filter(
                status__in=['approved', 'completed']
            ).aggregate(
                avg_amount=Avg('order__total_amount')
            )['avg_amount'] or Decimal('0.00')
            
            metrics = {
                'total_refunds': refunds_queryset.count(),
                'pending_refunds': status_count_map.get('pending', 0),
                'approved_refunds': status_count_map.get('approved', 0),
                'rejected_refunds': status_count_map.get('rejected', 0),
                'waiting_refunds': status_count_map.get('waiting', 0),
                'to_process_refunds': status_count_map.get('to process', 0),
                'completed_refunds': status_count_map.get('completed', 0),
                'total_refund_amount': float(total_refund_amount),
                'avg_processing_time_hours': round(float(avg_processing_hours), 1),
                'most_common_reason': common_reason['reason'] if common_reason else "No refunds available",
                'refunds_this_month': refunds_this_month,
                'avg_refund_amount': round(float(avg_refund_amount), 2),
            }
            
            return Response(metrics, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Metrics error: {str(e)}")  # Debug print
            return Response(
                {
                    'error': f'Model access error: {str(e)}',
                    'model_check': 'Refund model may not be properly defined or imported',
                    'fallback_metrics': {
                        'total_refunds': 0,
                        'pending_refunds': 0,
                        'approved_refunds': 0,
                        'rejected_refunds': 0,
                        'waiting_refunds': 0,
                        'to_process_refunds': 0,
                        'completed_refunds': 0,
                        'total_refund_amount': 0.0,
                        'avg_processing_time_hours': 0.0,
                        'most_common_reason': "System configuration issue",
                        'refunds_this_month': 0,
                        'avg_refund_amount': 0.0,
                    }
                }, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    @action(detail=False, methods=['get'])
    def get_analytics(self, request):
        """Get analytics data for charts"""
        try:
            # Use the correct model reference (based on which solution you chose)
            # If you used Solution 1 (explicit imports), use Refund
            # If you used Solution 2 (alias), use RefundModel
            
            # Status distribution - ACTUALLY QUERY THE DATABASE
            status_distribution = Refund.objects.values('status').annotate(
                count=Count('refund')
            ).order_by('status')
            
            total_refunds = sum(item['count'] for item in status_distribution)
            
            status_data = []
            for item in status_distribution:
                percentage = (item['count'] / total_refunds * 100) if total_refunds > 0 else 0
                status_data.append({
                    'status': item['status'],
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            # Monthly trend data (last 12 months)
            from django.db.models.functions import TruncMonth
            from datetime import timedelta
            
            twelve_months_ago = timezone.now() - timedelta(days=365)
            
            monthly_data = Refund.objects.filter(
                requested_at__gte=twelve_months_ago
            ).annotate(
                month=TruncMonth('requested_at')
            ).values('month').annotate(
                requested=Count('refund'),
                processed=Count('refund', filter=Q(status__in=['completed', 'approved']))
            ).order_by('month')
            
            monthly_trend = []
            for item in monthly_data:
                monthly_trend.append({
                    'month': item['month'].strftime('%b %Y'),
                    'requested': item['requested'],
                    'processed': item['processed'],
                    'full_month': item['month'].strftime('%B %Y')
                })
            
            # Refund reasons (top 10)
            refund_reasons = Refund.objects.exclude(
                Q(reason__isnull=True) | Q(reason__exact='')
            ).values('reason').annotate(
                count=Count('refund')
            ).order_by('-count')[:10]
            
            total_with_reasons = sum(item['count'] for item in refund_reasons)
            
            reasons_data = []
            for item in refund_reasons:
                percentage = (item['count'] / total_with_reasons * 100) if total_with_reasons > 0 else 0
                reasons_data.append({
                    'reason': item['reason'],
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            # Refund methods distribution
            refund_methods = Refund.objects.exclude(
                Q(preferred_refund_method__isnull=True) | 
                Q(preferred_refund_method__exact='')
            ).values('preferred_refund_method').annotate(
                count=Count('refund')
            ).order_by('-count')
            
            total_with_methods = sum(item['count'] for item in refund_methods)
            
            methods_data = []
            for item in refund_methods:
                percentage = (item['count'] / total_with_methods * 100) if total_with_methods > 0 else 0
                methods_data.append({
                    'method': item['preferred_refund_method'],
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            analytics_data = {
                'status_distribution': status_data,
                'monthly_trend_data': monthly_trend,
                'refund_reasons': reasons_data,
                'refund_methods': methods_data
            }
            
            return Response(analytics_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Analytics error: {str(e)}")  # Debug print
            # Return fallback data with error info
            return Response(
                {
                    'error': f'Analytics error: {str(e)}',
                    'fallback_data': {
                        'status_distribution': [
                            {'status': 'pending', 'count': 0, 'percentage': 0},
                            {'status': 'approved', 'count': 0, 'percentage': 0},
                            {'status': 'rejected', 'count': 0, 'percentage': 0},
                            {'status': 'waiting', 'count': 0, 'percentage': 0},
                            {'status': 'to process', 'count': 0, 'percentage': 0},
                            {'status': 'completed', 'count': 0, 'percentage': 0}
                        ],
                        'monthly_trend_data': [],
                        'refund_reasons': [],
                        'refund_methods': []
                    }
                }, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def refund_list(self, request):
        """Simple refund list endpoint"""
        try:
            # Return empty array if models work but no data
            refunds_data = []
            
            # Try to get actual data if models are accessible
            if hasattr(Refund, 'objects'):
                refunds = Refund.objects.all()
                for refund in refunds:
                    refunds_data.append({
                        'refund': str(refund.refund),
                        'order_id': str(refund.order.order) if refund.order else 'N/A',
                        'order_total_amount': float(refund.order.total_amount) if refund.order else 0.0,
                        'requested_by_username': refund.requested_by.username if refund.requested_by else 'Unknown',
                        'status': refund.status or 'pending',
                        'requested_at': refund.requested_at.isoformat() if refund.requested_at else None,
                        'reason': refund.reason or 'No reason provided',
                    })
            
            return Response(refunds_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Refund list error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class AdminUsers(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """Get user metrics for admin dashboard"""
        try:
            # Calculate today's date for new users calculation
            today = timezone.now().date()
            today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
            
            # Get base queryset
            users_queryset = User.objects.all()
            
            # Calculate metrics using actual model fields
            total_users = users_queryset.count()
            
            # Count users by role using the actual boolean fields
            total_customers = users_queryset.filter(is_customer=True).count()
            total_riders = users_queryset.filter(is_rider=True).count()
            total_moderators = users_queryset.filter(is_moderator=True).count()
            total_admins = users_queryset.filter(is_admin=True).count()
            
            # New users today
            new_users_today = users_queryset.filter(created_at__gte=today_start).count()
            
            # Profile completion metrics
            users_with_complete_profile = users_queryset.filter(
                Q(username__isnull=False) & ~Q(username=''),
                Q(email__isnull=False) & ~Q(email=''),
                Q(contact_number__isnull=False) & ~Q(contact_number=''),
                registration_stage=5
            ).count()
            
            users_with_incomplete_profile = total_users - users_with_complete_profile
            
            # Average registration stage
            avg_registration_stage = users_queryset.aggregate(
                avg_stage=Avg('registration_stage')
            )['avg_stage'] or 0
            
            # Most common city
            most_common_city_data = users_queryset.exclude(
                Q(city__isnull=True) | Q(city='')
            ).values('city').annotate(
                count=Count('id')
            ).order_by('-count').first()
            
            most_common_city = most_common_city_data['city'] if most_common_city_data else "No data"
            
            metrics = {
                'total_users': total_users,
                'total_customers': total_customers,
                'total_riders': total_riders,
                'total_moderators': total_moderators,
                'total_admins': total_admins,
                'new_users_today': new_users_today,
                'users_with_complete_profile': users_with_complete_profile,
                'users_with_incomplete_profile': users_with_incomplete_profile,
                'avg_registration_stage': round(float(avg_registration_stage), 1),
                'most_common_city': most_common_city,
            }
            
            return Response(metrics, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error calculating user metrics: {str(e)}")
            return Response(
                {'error': f'Error calculating metrics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_analytics(self, request):
        """Get analytics data for charts"""
        try:
            # Role distribution based on actual boolean fields
            role_distribution = []
            total_users = User.objects.count()
            
            if total_users > 0:
                # Count users for each role (users can have multiple roles)
                customer_count = User.objects.filter(is_customer=True).count()
                rider_count = User.objects.filter(is_rider=True).count()
                moderator_count = User.objects.filter(is_moderator=True).count()
                admin_count = User.objects.filter(is_admin=True).count()
                
                # Count incomplete profiles (no roles assigned and low registration stage)
                incomplete_count = User.objects.filter(
                    is_customer=False,
                    is_rider=False, 
                    is_moderator=False,
                    is_admin=False,
                    registration_stage__lt=3
                ).count()
                
                role_distribution = [
                    {
                        'role': 'Customers',
                        'count': customer_count,
                        'percentage': round((customer_count / total_users) * 100, 1)
                    },
                    {
                        'role': 'Riders', 
                        'count': rider_count,
                        'percentage': round((rider_count / total_users) * 100, 1)
                    },
                    {
                        'role': 'Moderators',
                        'count': moderator_count, 
                        'percentage': round((moderator_count / total_users) * 100, 1)
                    },
                    {
                        'role': 'Admins',
                        'count': admin_count,
                        'percentage': round((admin_count / total_users) * 100, 1)
                    },
                    {
                        'role': 'Incomplete',
                        'count': incomplete_count,
                        'percentage': round((incomplete_count / total_users) * 100, 1)
                    }
                ]
            
            # Registration trend (last 12 months)
            twelve_months_ago = timezone.now() - timedelta(days=365)
            
            registration_trend = User.objects.filter(
                created_at__gte=twelve_months_ago
            ).annotate(
                month=TruncMonth('created_at')
            ).values('month').annotate(
                new_users=Count('id')
            ).order_by('month')
            
            monthly_trend = []
            for item in registration_trend:
                monthly_trend.append({
                    'month': item['month'].strftime('%b %Y'),
                    'new_users': item['new_users'],
                    'full_month': item['month'].strftime('%B %Y')
                })
            
            # Location distribution
            location_distribution = User.objects.exclude(
                Q(city__isnull=True) | Q(city='')
            ).values('city').annotate(
                count=Count('id')
            ).order_by('-count')[:6]  # Top 6 cities
            
            total_with_location = sum(item['count'] for item in location_distribution)
            
            location_data = []
            for item in location_distribution:
                percentage = (item['count'] / total_with_location * 100) if total_with_location > 0 else 0
                location_data.append({
                    'city': item['city'],
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            # Registration stage distribution
            stage_distribution = User.objects.values('registration_stage').annotate(
                count=Count('id')
            ).order_by('registration_stage')
            
            stage_data = []
            for item in stage_distribution:
                stage = item['registration_stage'] or 0
                stage_label = self._get_stage_label(stage)
                percentage = (item['count'] / total_users * 100) if total_users > 0 else 0
                stage_data.append({
                    'stage': stage_label,
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            analytics_data = {
                'role_distribution': role_distribution,
                'registration_trend': monthly_trend,
                'location_distribution': location_data,
                'registration_stage_distribution': stage_data
            }
            
            return Response(analytics_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error generating user analytics: {str(e)}")
            return Response(
                {'error': f'Error generating analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def users_list(self, request):
        """Get paginated list of users with related data"""
        try:
            
            # Get query parameters
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            user_type = request.query_params.get('user_type')
            status_filter = request.query_params.get('status')
            search = request.query_params.get('search')
            
            # Build queryset with all necessary relationships
            users_queryset = User.objects.select_related().prefetch_related(
                Prefetch('customer', queryset=Customer.objects.all()),
                Prefetch('rider', queryset=Rider.objects.all()),
                Prefetch('moderator', queryset=Moderator.objects.all()),
                Prefetch('admin', queryset=Admin.objects.all())
            ).order_by('-created_at')
            
            # Apply filters
            if user_type:
                if user_type.lower() == 'customer':
                    users_queryset = users_queryset.filter(is_customer=True)
                elif user_type.lower() == 'rider':
                    users_queryset = users_queryset.filter(is_rider=True)
                elif user_type.lower() == 'moderator':
                    users_queryset = users_queryset.filter(is_moderator=True)
                elif user_type.lower() == 'admin':
                    users_queryset = users_queryset.filter(is_admin=True)
            
            if status_filter:
                if status_filter.lower() == 'active':
                    users_queryset = users_queryset.filter(
                        registration_stage__gte=3,
                        updated_at__gte=timezone.now() - timedelta(days=30)
                    )
                elif status_filter.lower() == 'inactive':
                    users_queryset = users_queryset.filter(
                        Q(registration_stage__lt=3) | 
                        Q(updated_at__lt=timezone.now() - timedelta(days=30))
                    )
            
            if search:
                users_queryset = users_queryset.filter(
                    Q(username__icontains=search) |
                    Q(email__icontains=search) |
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search)
                )
            
            # Pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            total_count = users_queryset.count()
            users_page = users_queryset[start_index:end_index]
            
            # Serialize data with all model fields
            users_data = []
            for user in users_page:
                user_data = {
                    # Core User model fields
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'password': user.password,  # Included but should be handled securely in production
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'middle_name': user.middle_name,
                    'contact_number': user.contact_number,
                    'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
                    'age': user.age,
                    'sex': user.sex,
                    'street': user.street,
                    'barangay': user.barangay,
                    'city': user.city,
                    'province': user.province,
                    'state': user.state,
                    'zip_code': user.zip_code,
                    'country': user.country,
                    'is_admin': user.is_admin,
                    'is_customer': user.is_customer,
                    'is_moderator': user.is_moderator,
                    'is_rider': user.is_rider,
                    'registration_stage': user.registration_stage,
                    'created_at': user.created_at.isoformat(),
                    'updated_at': user.updated_at.isoformat(),
                    
                    # Related model data
                    'customer_data': None,
                    'rider_data': None,
                    'moderator_data': None,
                    'admin_data': None,
                }
                
                # Add customer data if exists
                if hasattr(user, 'customer'):
                    user_data['customer_data'] = {
                        'product_limit': user.customer.product_limit,
                        'current_product_count': user.customer.current_product_count
                    }
                
                # Add rider data if exists
                if hasattr(user, 'rider'):
                    user_data['rider_data'] = {
                        'vehicle_type': user.rider.vehicle_type,
                        'plate_number': user.rider.plate_number,
                        'vehicle_brand': user.rider.vehicle_brand,
                        'vehicle_model': user.rider.vehicle_model,
                        'license_number': user.rider.license_number,
                        'verified': user.rider.verified
                    }
                
                # Add moderator data if exists
                if hasattr(user, 'moderator'):
                    user_data['moderator_data'] = {
                        # Add moderator specific fields if needed
                    }
                
                # Add admin data if exists
                if hasattr(user, 'admin'):
                    user_data['admin_data'] = {
                        # Add admin specific fields if needed
                    }
                
                users_data.append(user_data)
            
            response_data = {
                'results': users_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size,
                    'has_next': end_index < total_count,
                    'has_previous': page > 1
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error fetching user list: {str(e)}")
            return Response(
                {'error': f'Error fetching user list: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_stage_label(self, stage):
        """Helper method to get registration stage label"""
        if not stage:
            return 'Not Started'
        stages = {
            1: 'Started',
            2: 'Basic Info', 
            3: 'Address',
            4: 'Verification',
            5: 'Complete'
        }
        return stages.get(stage, f'Stage {stage}')

class AdminTeam(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_team_metrics(self, request):
        """Get team metrics for admin dashboard"""
        try:
            # Calculate today's date for new team members
            today = timezone.now().date()
            today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
            
            # Get team members (admins and moderators only)
            team_queryset = User.objects.filter(Q(is_admin=True) | Q(is_moderator=True))
            
            # Calculate metrics
            total_team_members = team_queryset.count()
            total_admins = team_queryset.filter(is_admin=True).count()
            total_moderators = team_queryset.filter(is_moderator=True).count()
            
            # New team members today
            new_team_members_today = team_queryset.filter(created_at__gte=today_start).count()
            
            # Active team members (based on recent activity and registration stage)
            active_team_members = team_queryset.filter(
                registration_stage__gte=3,
                updated_at__gte=timezone.now() - timedelta(days=30)
            ).count()
            
            inactive_team_members = total_team_members - active_team_members
            
            # Average registration stage
            avg_registration_stage = team_queryset.aggregate(
                avg_stage=Avg('registration_stage')
            )['avg_stage'] or 0
            
            # Pending moderator approvals
            pending_moderator_approvals = Moderator.objects.filter(
                approval_status='pending'
            ).count()
            
            metrics = {
                'total_team_members': total_team_members,
                'total_admins': total_admins,
                'total_moderators': total_moderators,
                'new_team_members_today': new_team_members_today,
                'active_team_members': active_team_members,
                'inactive_team_members': inactive_team_members,
                'avg_registration_stage': round(float(avg_registration_stage), 1),
                'pending_moderator_approvals': pending_moderator_approvals,
            }
            
            return Response(metrics, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error calculating team metrics: {str(e)}")
            return Response(
                {'error': f'Error calculating team metrics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_team_analytics(self, request):
        """Get analytics data for team charts"""
        try:
            # Team role distribution
            total_team_members = User.objects.filter(Q(is_admin=True) | Q(is_moderator=True)).count()
            
            role_distribution = []
            if total_team_members > 0:
                admin_count = User.objects.filter(is_admin=True).count()
                moderator_count = User.objects.filter(is_moderator=True).count()
                
                role_distribution = [
                    {
                        'role': 'Admins',
                        'count': admin_count,
                        'percentage': round((admin_count / total_team_members) * 100, 1)
                    },
                    {
                        'role': 'Moderators',
                        'count': moderator_count,
                        'percentage': round((moderator_count / total_team_members) * 100, 1)
                    }
                ]
            
            # Registration trend (last 12 months for team members)
            twelve_months_ago = timezone.now() - timedelta(days=365)
            
            registration_trend = User.objects.filter(
                Q(is_admin=True) | Q(is_moderator=True),
                created_at__gte=twelve_months_ago
            ).annotate(
                month=TruncMonth('created_at')
            ).values('month').annotate(
                new_members=Count('id')
            ).order_by('month')
            
            monthly_trend = []
            for item in registration_trend:
                monthly_trend.append({
                    'month': item['month'].strftime('%b %Y'),
                    'new_members': item['new_members'],
                    'full_month': item['month'].strftime('%B %Y')
                })
            
            # Approval status distribution for moderators
            approval_status_distribution = Moderator.objects.values('approval_status').annotate(
                count=Count('moderator')
            ).order_by('approval_status')
            
            approval_data = []
            for item in approval_status_distribution:
                # Safely get the approval_status with a default value
                approval_status = item.get('approval_status', 'unknown')
                status_label = approval_status.capitalize() if approval_status != 'unknown' else 'Unknown'
                
                # Calculate percentage safely
                total_moderators = Moderator.objects.count()
                percentage = (item['count'] / total_moderators * 100) if total_moderators > 0 else 0
                
                approval_data.append({
                    'status': status_label,
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            # If no moderator records exist, provide default approval data
            if not approval_data:
                approval_data = [
                    {
                        'status': 'Pending',
                        'count': 0,
                        'percentage': 0.0
                    },
                    {
                        'status': 'Approved', 
                        'count': 0,
                        'percentage': 0.0
                    },
                    {
                        'status': 'Rejected',
                        'count': 0,
                        'percentage': 0.0
                    }
                ]
            
            # Activity distribution
            active_members = User.objects.filter(
                Q(is_admin=True) | Q(is_moderator=True),
                registration_stage__gte=3,
                updated_at__gte=timezone.now() - timedelta(days=30)
            ).count()
            
            inactive_members = total_team_members - active_members
            
            activity_data = [
                {
                    'status': 'Active',
                    'count': active_members,
                    'percentage': round((active_members / total_team_members * 100), 1) if total_team_members > 0 else 0
                },
                {
                    'status': 'Inactive',
                    'count': inactive_members,
                    'percentage': round((inactive_members / total_team_members * 100), 1) if total_team_members > 0 else 0
                }
            ]
            
            analytics_data = {
                'role_distribution': role_distribution,
                'registration_trend': monthly_trend,
                'approval_status_distribution': approval_data,
                'activity_distribution': activity_data
            }
            
            return Response(analytics_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error generating team analytics: {str(e)}")
            return Response(
                {'error': f'Error generating team analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def team_list(self, request):
        """Get paginated list of team members (admins and moderators)"""
        try:
            # Get query parameters
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            role_filter = request.query_params.get('role')
            status_filter = request.query_params.get('status')
            approval_filter = request.query_params.get('approval_status')
            search = request.query_params.get('search')
            
            # Build queryset for team members only (admins and moderators)
            team_queryset = User.objects.filter(
                Q(is_admin=True) | Q(is_moderator=True)
            ).select_related().prefetch_related(
                Prefetch('moderator', queryset=Moderator.objects.all()),
                Prefetch('admin', queryset=Admin.objects.all())
            ).order_by('-created_at')
            
            # Apply filters
            if role_filter:
                if role_filter.lower() == 'admin':
                    team_queryset = team_queryset.filter(is_admin=True)
                elif role_filter.lower() == 'moderator':
                    team_queryset = team_queryset.filter(is_moderator=True)
            
            if status_filter:
                if status_filter.lower() == 'active':
                    team_queryset = team_queryset.filter(
                        registration_stage__gte=3,
                        updated_at__gte=timezone.now() - timedelta(days=30)
                    )
                elif status_filter.lower() == 'inactive':
                    team_queryset = team_queryset.filter(
                        Q(registration_stage__lt=3) | 
                        Q(updated_at__lt=timezone.now() - timedelta(days=30))
                    )
            
            if approval_filter:
                if approval_filter.lower() in ['pending', 'approved', 'rejected']:
                    team_queryset = team_queryset.filter(
                        moderator__approval_status=approval_filter.lower()
                    )
            
            if search:
                team_queryset = team_queryset.filter(
                    Q(username__icontains=search) |
                    Q(email__icontains=search) |
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search)
                )
            
            # Pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            total_count = team_queryset.count()
            team_page = team_queryset[start_index:end_index]
            
            # Serialize data
            team_data = []
            for user in team_page:
                user_data = {
                    # Core User model fields
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'password': user.password,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'middle_name': user.middle_name,
                    'contact_number': user.contact_number,
                    'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
                    'age': user.age,
                    'sex': user.sex,
                    'street': user.street,
                    'barangay': user.barangay,
                    'city': user.city,
                    'province': user.province,
                    'state': user.state,
                    'zip_code': user.zip_code,
                    'country': user.country,
                    'is_admin': user.is_admin,
                    'is_customer': user.is_customer,
                    'is_moderator': user.is_moderator,
                    'is_rider': user.is_rider,
                    'registration_stage': user.registration_stage,
                    'created_at': user.created_at.isoformat(),
                    'updated_at': user.updated_at.isoformat(),
                    
                    # Related model data
                    'moderator_data': None,
                    'admin_data': None,
                }
                
                # Add moderator data if exists
                if hasattr(user, 'moderator'):
                    user_data['moderator_data'] = {
                        'approval_status': user.moderator.approval_status
                    }
                
                # Add admin data if exists
                if hasattr(user, 'admin'):
                    user_data['admin_data'] = {
                        # Add admin specific fields if needed
                    }
                
                team_data.append(user_data)
            
            response_data = {
                'results': team_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size,
                    'has_next': end_index < total_count,
                    'has_previous': page > 1
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error fetching team list: {str(e)}")
            return Response(
                {'error': f'Error fetching team list: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomerProducts(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_products(self, request):
        shop_id = request.query_params.get('shop_id')

        products = (
            Product.objects
            .filter(shop=shop_id)            # WHERE shop_id = ?
            .order_by('name')
            .select_related('shop', 'category')
        )

        serializer = ProductSerializer(products, many=True)

        return Response({
            'success': True,
            'products': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def create_product(self, request):
        """
        Create a new product without authentication
        POST /api/your-endpoint/create_product/
        """
        try:
            # Validate required fields
            required_fields = ['shop', 'category', 'category_admin', 'name', 'price', 'quantity', 'customer']
            missing_fields = [field for field in required_fields if field not in request.data]
            
            if missing_fields:
                return Response(
                    {
                        "error": "Missing required fields",
                        "missing_fields": missing_fields
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get customer
            customer_id = request.data.get('customer')
            try:
                customer = Customer.objects.get(customer_id=customer_id)
            except Customer.DoesNotExist:
                return Response(
                    {"error": "Customer not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check product limit
            if not customer.can_add_product():
                return Response(
                    {
                        "error": "Product limit reached",
                        "detail": f"Customer has reached the limit of {customer.product_limit} products",
                        "current_count": customer.current_product_count,
                        "limit": customer.product_limit
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate shop ownership
            shop_id = request.data.get('shop')
            try:
                shop = Shop.objects.get(id=shop_id)
                if shop.customer != customer:
                    return Response(
                        {
                            "error": "Shop ownership validation failed",
                            "detail": "Customer can only add products to their own shops"
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Shop.DoesNotExist:
                return Response(
                    {"error": "Shop not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate category exists
            category_id = request.data.get('category')
            category_admin_id = request.data.get('category_admin')
            
            try:
                category = Category.objects.get(id=category_id)
                category_admin = Category.objects.get(id=category_admin_id)
            except Category.DoesNotExist:
                return Response(
                    {"error": "Category not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate category user types
            # For category (customer category) - should be created by the same customer
            if category.user:
                if category.user.is_customer and category.user.customer != customer:
                    return Response(
                        {
                            "error": "Category ownership validation failed",
                            "detail": "You can only use your own customer categories"
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # For category_admin - should be created by an admin
            if category_admin.user:
                if not category_admin.user.is_admin:
                    return Response(
                        {
                            "error": "Admin category validation failed",
                            "detail": "category_admin must be created by an admin"
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                # category_admin has no user - might be system category
                # You can decide whether to allow this or not
                pass
            
            # Use serializer for creation
            serializer = ProductCreateSerializer(data=request.data)
            
            if serializer.is_valid():
                try:
                    with transaction.atomic():
                        product = serializer.save()
                        
                        # Success response
                        return Response(
                            {
                                "success": True,
                                "message": "Product created successfully",
                                "product": {
                                    "id": str(product.id),
                                    "name": product.name,
                                    "shop": shop.name,
                                    "category": category.name,
                                    "category_type": "Customer" if category.user and category.user.is_customer else "System",
                                    "category_admin": category_admin.name,
                                    "category_admin_type": "Admin" if category_admin.user and category_admin.user.is_admin else "System",
                                    "price": str(product.price),
                                    "quantity": product.quantity,
                                    "status": product.status,
                                    "condition": product.condition,
                                    "created_at": product.created_at
                                },
                                "customer_stats": {
                                    "customer_id": str(customer.customer_id),
                                    "current_product_count": customer.current_product_count,
                                    "product_limit": customer.product_limit,
                                    "remaining_slots": customer.product_limit - customer.current_product_count
                                }
                            },
                            status=status.HTTP_201_CREATED
                        )
                        
                except Exception as e:
                    return Response(
                        {
                            "error": "Failed to create product",
                            "detail": str(e)
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            return Response(
                {
                    "error": "Validation failed",
                    "details": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            return Response(
                {
                    "error": "Internal server error",
                    "detail": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        