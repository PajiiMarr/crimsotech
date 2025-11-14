from django.shortcuts import render
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
import hashlib
import os



class UserView(APIView):
    def get(self, request):
        user = [{"user_id": user.user_id, "username": user.username, "email": user.email, "registration_stage": user.registration_stage, "is_rider": user.is_rider} for user in User.objects.all()]
        return Response(user)
    def post(self, request):
        serialiazer = UserSeriaLizer(data=request.data)
        if serialiazer.is_valid(raise_exception=True):
            serialiazer.save()
            return Response(serialiazer.data)
        
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
        serializer = UserSeriaLizer(data=request.data)
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
            
        serializer = UserSeriaLizer(user, data=request.data, partial=True)
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
        serializer = UserSeriaLizer(data=request.data)
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
            
        serializer = UserSeriaLizer(user, data=request.data, partial=True)
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
            
            user_serializer = UserSeriaLizer(data=user_data)
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