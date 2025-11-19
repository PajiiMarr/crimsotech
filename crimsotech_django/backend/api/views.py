from django.shortcuts import render
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
        user = [{"user_id": user.user_id, "username": user.username, "email": user.email, "registration_stage": user.registration_stage, "is_rider": user.is_rider} for user in User.objects.all()]
        return Response(user)
    def post(self, request):
        serialiazer = UserSerializer(data=request.data)
        if serialiazer.is_valid(raise_exception=True):
            serialiazer.save()
            return Response(serialiazer.data)

class GetRole(APIView):
    def get(self, request):
        user_id = request.headers.get("X-User-Id")

        if user_id:
            try:
                user = User.objects.get(user_id=user_id)
                data = {
                    "user_id": user.user_id,
                    "isAdmin": getattr(user, "is_admin", False),
                    "isCustomer": getattr(user, "is_customer", False),
                    "isRider": getattr(user, "is_rider", False),
                    "isModerator": getattr(user, "isModerator", False),
                }
                return Response(data)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)

class GetRegistration(APIView):
    def get(self, request):
        user_id = request.headers.get("X-User-Id")

        if user_id:
            try:
                user = User.objects.get(user_id=user_id)
                data = {
                    "user_id": user.user_id,
                    "registration_stage": getattr(user, "registration_stage", 1),
                    "is_rider": getattr(user, "is_rider", False),
                    "is_customer": getattr(user, "is_customer", False),
                }
                return Response(data)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)




class Login(APIView):
    def get(self, request):
        user_id = request.headers.get("X-User-Id")  # get from headers

        if user_id:
            try:
                user = User.objects.get(user_id=user_id)
                data = {
                    "user_id": str(user.user_id),
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
            "user_id": str(user.user_id),
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
                user = User.objects.get(user_id=user_id)
                data = {
                    "user_id": user.user_id,
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
                "user_id": u.user_id,
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
        customer_serializer = CustomerSerializer(data={"customer_id": user.user_id})
        if customer_serializer.is_valid(raise_exception=True):
            customer_serializer.save()
            
            return Response({
                "user_id": user.user_id,
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
            user = User.objects.get(user_id=user_id)
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
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        
        data = {
            "user_id": user.user_id, 
            "registration_stage": user.registration_stage,
            "username": user.username,
        }
        return Response(data)
    
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)
        
    def put(self, request):
        user_id = request.headers.get("X-User-Id")  # get from headers
        
        if not user_id:
            return Response({"error": "User ID is required"}, status=400)
        
        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)

class VerifyNumber(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def user(self, request):
        user_id = request.headers.get('X-User-Id')

        if not user_id:
            return Response({"error": "User ID not provided"}, status=400)

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        return Response({
            "user_id": user.user_id,
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
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found!"}, status=404)

        if action_type == 'send_otp':
            # Handle contact number submission and OTP sending
            if not contact_number:
                return Response({"error": "Contact number is required!"}, status=400)

            if User.objects.filter(contact_number=contact_number).exclude(user_id=user_id).exists():
                return Response({"error": "Contact number already exists!"}, status=400)

            # Save user's contact number
            user.contact_number = contact_number
            user.save()

            # Send OTP using Twilio Verify
            otp_status = self.send_otp(contact_number)
            if not otp_status:
                return Response({"error": "Failed to send OTP. Please try again later."}, status=500)

            OTP.objects.update_or_create(
                user_otp_id=user,
                defaults={
                    'otp': 'pending',
                    'sent_at': timezone.now(),
                    'expired_at': timezone.now() + timedelta(minutes=5)
                }
            )

            return Response({
                "message": f"OTP sent successfully to +63{contact_number}",
                "user_id": str(user.user_id),
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
                    
                    OTP.objects.filter(user_otp_id=user).update(
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
                'rider_id': user.user_id,
                'vehicle_type': vehicle_type,
                'plate_number': plate_number,
                'vehicle_brand': vehicle_brand,
                'vehicle_model': vehicle_model,
                'license_number': license_number,
                'verified': False,  # Fixed: your field is 'verified' not 'is_verified'
                'vehicle_image': vehicle_image,
                'license_image': license_image
            }
            
            rider_serializer = RiderSerializer(data=rider_data)
            if rider_serializer.is_valid():
                rider = rider_serializer.save()
                
                return Response({
                    "message": "Rider registration completed successfully",
                    "user_id": str(user.user_id),
                    "rider_id": str(rider.rider_id),
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
            # Check if we have real data in database
            has_real_data = Product.objects.exists()
            
            if not has_real_data:
                # Return sample data for testing
                sample_data = self._get_sample_metrics_data()
                return Response(sample_data, status=status.HTTP_200_OK)
            
            # Total Products with fallback
            total_products = Product.objects.count()
            
            # Low Stock Alert (quantity < 5) with fallback
            low_stock_count = Product.objects.filter(quantity__lt=5).count()
            
            # Active Boosts with fallback
            active_boosts_count = Boost.objects.filter(
                product_id__isnull=False
            ).count()
            
            # Compute average rating from Reviews (using shop-based reviews as fallback)
            rating_agg = Review.objects.aggregate(
                avg_rating=Avg('rating'),
                total_reviews=Count('review_id')
            )
            avg_rating = rating_agg['avg_rating'] or 0.0
            
            # Compute engagement metrics from CustomerActivity
            engagement_data = CustomerActivity.objects.values('product_id', 'activity_type').annotate(
                count=Count('activity_type')
            )
            
            # Create a dictionary to store engagement metrics per product
            product_engagement = {}
            for engagement in engagement_data:
                product_id = engagement['product_id']
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
                
                top_products = Product.objects.filter(product_id__in=top_product_ids)
                product_map = {product.product_id: product for product in top_products}
                
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
            
            # Rating Distribution from Reviews (shop-based as fallback)
            rating_distribution = Review.objects.values('rating').annotate(
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
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            sample_data = self._get_sample_metrics_data()
            sample_data['message'] = f'Error retrieving metrics, showing sample data: {str(e)}'
            sample_data['fallback_used'] = True
            return Response(sample_data, status=status.HTTP_200_OK)
    
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
            
            # Check if we have real data
            has_real_data = Product.objects.exists()
            
            if not has_real_data:
                sample_products = self._get_sample_products_data(search, category, page, page_size)
                return Response(sample_products, status=status.HTTP_200_OK)
            
            # Start with all products
            products = Product.objects.all().order_by('name').select_related('shop_id', 'category_id')
            
            # Apply search filter
            if search:
                products = products.filter(
                    Q(name__icontains=search) | 
                    Q(description__icontains=search)
                )
            
            # Apply category filter
            if category != 'all':
                products = products.filter(category_id__name=category)
            
            # Get product IDs for related data queries
            product_ids = list(products.values_list('product_id', flat=True))
            
            # Compute engagement data from CustomerActivity
            engagement_data = CustomerActivity.objects.filter(
                product_id__in=product_ids
            ).values('product_id', 'activity_type').annotate(
                count=Count('activity_type')
            )
            
            engagement_map = {}
            for engagement in engagement_data:
                product_id = engagement['product_id']
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
                product_id__in=product_ids
            ).values('product_id').annotate(
                variants_count=Count('variant_id')
            )
            
            variants_map = {vd['product_id']: vd['variants_count'] for vd in variants_data}
            
            # Compute issues count
            issues_data = Issues.objects.filter(
                product_id__in=product_ids
            ).values('product_id').annotate(
                issues_count=Count('issue_id')
            )
            
            issues_map = {id['product_id']: id['issues_count'] for id in issues_data}
            
            # Compute boost plan - FIXED: Use the exact field name 'boostPlan'
            boost_data = Boost.objects.filter(
                product_id__in=product_ids
            ).select_related('boost_plan_id')
            
            boost_map = {}
            for boost in boost_data:
                if boost.boost_plan_id:
                    boost_map[boost.product_id.product_id] = boost.boost_plan_id.name
            
            # Pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            paginated_products = products[start_index:end_index]
            total_count = products.count()
            
            # Serialize with computed fields - MATCHING REACT EXPECTATIONS EXACTLY
            products_data = []
            for product in paginated_products:
                product_id = product.product_id
                
                # Get computed engagement data
                engagement = engagement_map.get(product_id, {'views': 0, 'purchases': 0, 'favorites': 0})
                
                # Use default rating for now (since Review doesn't link to Product)
                rating = 4.0
                
                # Get computed counts
                variants_count = variants_map.get(product_id, 0)
                issues_count = issues_map.get(product_id, 0)
                
                # Get boost plan - FIXED: Use exact field name 'boostPlan'
                boost_plan = boost_map.get(product_id, 'None')
                
                # Determine low stock
                low_stock = product.quantity < 5
                
                # Build product data EXACTLY matching React expectations
                product_data = {
                    'id': product_id,
                    'name': product.name,
                    'category': product.category_id.name if product.category_id else 'Uncategorized',
                    'shop': product.shop_id.name if product.shop_id else 'No Shop',
                    'price': str(product.price),  # Keep as string for React
                    'quantity': product.quantity,
                    'condition': product.condition,
                    'status': product.status,
                    'views': engagement['views'],
                    'purchases': engagement['purchases'],
                    'favorites': engagement['favorites'],
                    'rating': rating,
                    'boostPlan': boost_plan,  # FIXED: Exact field name React expects
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
            try:
                sample_products = self._get_sample_products_data(
                    request.query_params.get('search', ''),
                    request.query_params.get('category', 'all'),
                    int(request.query_params.get('page', 1)),
                    int(request.query_params.get('page_size', 10))
                )
                if sample_products:
                    sample_products['message'] = f'Error retrieving products, showing sample data: {str(e)}'
                    sample_products['fallback_used'] = True
                return Response(sample_products, status=status.HTTP_200_OK)
            except Exception:
                return Response({
                    'success': False,
                    'products': [],
                    'pagination': {
                        'page': 1,
                        'page_size': 10,
                        'total_count': 0,
                        'total_pages': 0
                    },
                    'message': f'Error retrieving products: {str(e)}',
                    'fallback_used': True
                }, status=status.HTTP_200_OK)
    
    def _get_sample_metrics_data(self):
        """Generate sample metrics data for testing"""
        return {
            'success': True,
            'metrics': {
                'total_products': 156,
                'low_stock_alert': 23,
                'active_boosts': 34,
                'avg_rating': 4.2,
                'top_products': [
                    {
                        'name': 'iPhone 15 Pro Max',
                        'views': 12500,
                        'purchases': 450,
                        'favorites': 890,
                        'total_engagement': 13840
                    },
                    {
                        'name': 'Samsung Galaxy S24 Ultra',
                        'views': 9800,
                        'purchases': 320,
                        'favorites': 670,
                        'total_engagement': 10790
                    },
                    {
                        'name': 'MacBook Pro 16"',
                        'views': 7600,
                        'purchases': 210,
                        'favorites': 450,
                        'total_engagement': 8260
                    },
                    {
                        'name': 'Sony WH-1000XM5',
                        'views': 11200,
                        'purchases': 680,
                        'favorites': 920,
                        'total_engagement': 12800
                    },
                    {
                        'name': 'Nintendo Switch OLED',
                        'views': 8900,
                        'purchases': 540,
                        'favorites': 780,
                        'total_engagement': 10220
                    }
                ],
                'rating_distribution': [
                    {'name': '5 Stars', 'value': 67},
                    {'name': '4 Stars', 'value': 45},
                    {'name': '3 Stars', 'value': 28},
                    {'name': '2 Stars', 'value': 12},
                    {'name': '1 Star', 'value': 4}
                ],
                'has_data': True
            },
            'message': 'Sample metrics data loaded successfully',
            'data_source': 'sample_data'
        }
    
    def _get_sample_products_data(self, search='', category='all', page=1, page_size=10):
        """Generate comprehensive sample products data for testing"""
        # Make sure this includes ALL the fields your React columns expect
        all_sample_products = [
            {
                'id': 1,
                'name': 'iPhone 15 Pro Max 1TB',
                'category': 'Electronics',
                'shop': 'Apple Premium Reseller',
                'price': '1599.99',
                'quantity': 8,
                'condition': 'New',
                'status': 'Active',
                'views': 12500,
                'purchases': 450,
                'favorites': 890,
                'rating': 4.8,
                'boostPlan': 'Premium',  # FIXED: Exact field name
                'variants': 3,
                'issues': 2,
                'lowStock': False,
                'created_at': '2024-01-15T10:30:00Z',
                'updated_at': '2024-11-10T14:20:00Z'
            },
            # ... include all your other sample products with 'boostPlan' field
        ]
        
        # Apply filters
        filtered_products = all_sample_products
        
        if search:
            filtered_products = [
                p for p in filtered_products 
                if search.lower() in p['name'].lower() or search.lower() in p['category'].lower()
            ]
        
        if category != 'all':
            filtered_products = [
                p for p in filtered_products 
                if p['category'] == category
            ]
        
        # Apply pagination
        total_count = len(filtered_products)
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_products = filtered_products[start_index:end_index]
        
        return {
            'success': True,
            'products': paginated_products,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            },
            'message': 'Sample products data loaded successfully',
            'data_source': 'sample_data'
        }

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
                total_reviews=Count('review_id')
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
            shops = Shop.objects.all().select_related('customer_id__customer_id')
            
            # Get shop IDs for related data queries
            shop_ids = list(shops.values_list('shop_id', flat=True))
            
            # Compute followers count for each shop
            followers_data = ShopFollow.objects.filter(
                shop_id__in=shop_ids
            ).values('shop_id').annotate(
                followers_count=Count('shop_follow_id')
            )
            followers_map = {fd['shop_id']: fd['followers_count'] for fd in followers_data}
            
            # Compute products count for each shop
            products_data = Product.objects.filter(
                shop_id__in=shop_ids
            ).values('shop_id').annotate(
                products_count=Count('product_id')
            )
            products_map = {pd['shop_id']: pd['products_count'] for pd in products_data}
            
            # Compute ratings for each shop
            ratings_data = Review.objects.filter(
                shop_id__in=shop_ids
            ).values('shop_id').annotate(
                avg_rating=Avg('rating'),
                total_ratings=Count('review_id')
            )
            ratings_map = {rd['shop_id']: rd for rd in ratings_data}
            
            # Compute active boosts for each shop
            boosts_data = Boost.objects.filter(
                shop_id__in=shop_ids
            ).values('shop_id').annotate(
                active_boosts=Count('boost_id')
            )
            boosts_map = {bd['shop_id']: bd['active_boosts'] for bd in boosts_data}
            
            # Build shops data matching React structure exactly
            shops_data = []
            for shop in shops:
                shop_id = shop.shop_id
                
                # Get owner name - FIXED: Access through User model
                customer = shop.customer_id
                if customer and customer.customer_id:
                    user = customer.customer_id
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
                    'status': getattr(shop, 'status', 'Active'),  # Use actual status if field exists
                    'joinedDate': shop.created_at.isoformat() if shop.created_at else None,
                    'totalSales': float(getattr(shop, 'total_sales', 0)),  # Use actual sales if field exists
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
            count=Count('shop_id')
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
            plan_usage = Boost.objects.values('boost_plan_id').annotate(
                usage_count=Count('boost_id')
            )
            usage_map = {item['boost_plan_id']: item['usage_count'] for item in plan_usage}
            
            plans_data = []
            for plan in boost_plans:
                plan_data = {
                    'boost_plan_id': str(plan.boost_plan_id),
                    'name': plan.name,
                    'price': float(plan.price),
                    'duration': plan.duration,
                    'time_unit': plan.time_unit,
                    'status': plan.status,
                    'user_id': str(plan.user.user_id) if plan.user else None,
                    'user_name': plan.user.username if plan.user else 'System',
                    'usage_count': usage_map.get(plan.boost_plan_id, 0),
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
                'product_id',
                'boost_plan_id',
                'shop_id',
                'customer_id',
                'customer_id__customer_id'
            )
            
            boosts_data = []
            for boost in boosts:
                customer_name = "Unknown"
                customer_email = "No email"
                if boost.customer_id and boost.customer_id.customer_id:
                    user = boost.customer_id.customer_id
                    customer_name = f"{user.first_name} {user.last_name}".strip()
                    if not customer_name:
                        customer_name = user.username
                    customer_email = user.email or "No email"
                
                # Get shop info
                shop_name = boost.shop_id.name if boost.shop_id else None
                
                # Get product info
                product_name = boost.product_id.name if boost.product_id else None
                
                # Get boost plan info
                boost_plan_name = boost.boost_plan_id.name if boost.boost_plan_id else None
                boost_plan_price = float(boost.boost_plan_id.price) if boost.boost_plan_id else 0.0
                
                boost_data = {
                    'boost_id': str(boost.boost_id),
                    'product_id': str(boost.product_id.product_id) if boost.product_id else None,
                    'product_name': product_name,
                    'boost_plan_id': str(boost.boost_plan_id.boost_plan_id) if boost.boost_plan_id else None,
                    'boost_plan_name': boost_plan_name,
                    'shop_id': str(boost.shop_id.shop_id) if boost.shop_id else None,
                    'shop_name': shop_name,
                    'customer_id': str(boost.customer_id.customer_id) if boost.customer_id else None,
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
                    'boost_plan_id': str(boost_plan.boost_plan_id),
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
                boost_plan = BoostPlan.objects.get(boost_plan_id=boost_plan_id)
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
                    'boost_plan_id': str(boost_plan.boost_plan_id),
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
                boost_plan = BoostPlan.objects.get(boost_plan_id=boost_plan_id)
            except BoostPlan.DoesNotExist:
                return Response(
                    {'success': False, 'error': 'Boost plan not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if plan is being used
            active_boosts = Boost.objects.filter(boost_plan_id=boost_plan, status='active').count()
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