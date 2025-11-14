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
            # Total Products with fallback
            total_products = Product.objects.count()
            
            # Low Stock Alert (quantity < 5) with fallback
            low_stock_count = Product.objects.filter(quantity__lt=5).count()
            
            # Active Boosts with fallback
            active_boosts_count = Boost.objects.filter(
                product_id__isnull=False
            ).count()
            
            # Average Rating with fallback (handle division by zero)
            rating_agg = Product.objects.aggregate(avg_rating=Avg('rating'))
            avg_rating = rating_agg['avg_rating'] or 0.0
            
            # Top Products by Engagement with fallback
            top_products = Product.objects.annotate(
                total_engagement=Sum('views') + Sum('purchases') + Sum('favorites')
            ).order_by('-total_engagement')[:5]
            
            top_products_data = [
                {
                    'name': product.name,
                    'views': product.views or 0,
                    'purchases': product.purchases or 0,
                    'favorites': product.favorites or 0,
                    'total_engagement': product.total_engagement or 0
                }
                for product in top_products
            ] if top_products else []
            
            # Rating Distribution with fallback
            rating_distribution = Product.objects.values('rating').annotate(
                count=Count('rating')
            ).order_by('-rating')
            
            rating_distribution_data = [
                {
                    'name': f'{rating["rating"] or 0} Stars',
                    'value': rating['count']
                }
                for rating in rating_distribution
                if rating['rating'] is not None
            ] if rating_distribution else []
            
            # If no rating distribution data, provide default structure
            if not rating_distribution_data:
                rating_distribution_data = [
                    {'name': '5 Stars', 'value': 0},
                    {'name': '4 Stars', 'value': 0},
                    {'name': '3 Stars', 'value': 0},
                    {'name': '2 Stars', 'value': 0},
                    {'name': '1 Star', 'value': 0}
                ]
            
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
                'message': 'Metrics retrieved successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Fallback response in case of any errors
            fallback_response = {
                'success': False,
                'metrics': {
                    'total_products': 0,
                    'low_stock_alert': 0,
                    'active_boosts': 0,
                    'avg_rating': 0.0,
                    'top_products': [],
                    'rating_distribution': [
                        {'name': '5 Stars', 'value': 0},
                        {'name': '4 Stars', 'value': 0},
                        {'name': '3 Stars', 'value': 0},
                        {'name': '2 Stars', 'value': 0},
                        {'name': '1 Star', 'value': 0}
                    ],
                    'has_data': False
                },
                'message': f'Error retrieving metrics: {str(e)}',
                'fallback_used': True
            }
            return Response(fallback_response, status=status.HTTP_200_OK)
    
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
            
            # Start with all products
            products = Product.objects.all()
            
            # Apply search filter
            if search:
                products = products.filter(
                    Q(name__icontains=search) | 
                    Q(category__icontains=search)
                )
            
            # Apply category filter
            if category != 'all':
                products = products.filter(category=category)
            
            # Pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            paginated_products = products[start_index:end_index]
            total_count = products.count()
            
            serializer = ProductSerializer(paginated_products, many=True)
            
            response_data = {
                'success': True,
                'products': serializer.data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size
                },
                'message': 'Products retrieved successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
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