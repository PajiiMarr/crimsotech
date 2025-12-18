from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import User, Order, Refund, Checkout, DisputeRequest, DisputeEvidence
from .dispute_serializers import (
    DisputeRequestSerializer,
    DisputeRequestCreateSerializer,
    DisputeEvidenceSerializer,
)


class DisputeRequestViewSet(viewsets.ModelViewSet):
    """Dispute endpoints based on DisputeRequest / DisputeEvidence models."""

    queryset = DisputeRequest.objects.all()
    serializer_class = DisputeRequestSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        """Use a specialized serializer when creating disputes."""
        if self.action == 'create':
            return DisputeRequestCreateSerializer
        return self.serializer_class

    def _get_user_from_header(self, request):
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return None
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    def _is_admin_user(self, user):
        """Check if user is admin/staff"""
        return bool(getattr(user, 'is_admin', False) or getattr(user, 'is_moderator', False)) if user else False

    def create(self, request, *args, **kwargs):
        """Create a dispute and set filed_by from X-User-Id header."""
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(
            data=request.data,
            context={**self.get_serializer_context(), 'filed_by': user}
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            dispute = serializer.save()

            # If a refund is linked, move it into dispute status so both buyer/seller UIs show the dispute tab
            refund = getattr(dispute, 'refund', None)
            if refund and hasattr(refund, 'status'):
                refund.status = 'dispute'
                refund.dispute_filed_by = user
                refund.dispute_reason = dispute.description or dispute.reason
                if not refund.dispute_filed_at:
                    refund.dispute_filed_at = timezone.now()
                refund.save(update_fields=['status', 'dispute_filed_by', 'dispute_reason', 'dispute_filed_at'])

        headers = self.get_success_headers(serializer.data)
        return Response(DisputeRequestSerializer(dispute, context=self.get_serializer_context()).data,
                        status=status.HTTP_201_CREATED,
                        headers=headers)

    def update(self, request, *args, **kwargs):
        """
        Update dispute (only allowed in 'filed' status)
        """
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance = self.get_object()

        # Check if user owns the dispute
        if instance.filed_by != user:
            return Response(
                {'error': 'You do not have permission to update this dispute'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if dispute can be updated
        if instance.status != 'filed':
            return Response(
                {'error': 'Dispute can only be updated while in "Filed" status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Delete dispute (only allowed in 'filed' status for users)
        """
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance = self.get_object()

        # Check if user owns the dispute or is admin
        if not self._is_admin_user(user) and instance.filed_by != user:
            return Response(
                {'error': 'You do not have permission to delete this dispute'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Users can only delete if in 'filed' status
        if not self._is_admin_user(user) and instance.status != 'filed':
            return Response(
                {'error': 'You can only delete disputes in "Filed" status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def add_evidence(self, request, pk=None):
        """
        Add evidence to a dispute
        """
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        dispute = self.get_object()

        # Check if user owns the dispute
        if dispute.filed_by != user:
            return Response(
                {'error': 'You do not have permission to add evidence to this dispute'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if evidence can be added (not in final states)
        if dispute.status in ['completed', 'rejected', 'cancelled']:
            return Response(
                {'error': 'Cannot add evidence to a closed dispute'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file uploaded'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = DisputeEvidenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Add dispute and user to the evidence
        evidence = serializer.save(
            dispute=dispute,
            uploaded_by=user
        )

        return Response(
            DisputeEvidenceSerializer(evidence).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel a dispute
        """
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        dispute = self.get_object()

        # Check if user owns the dispute
        if dispute.filed_by != user:
            return Response(
                {'error': 'You do not have permission to cancel this dispute'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if dispute can be cancelled
        if dispute.status not in ['filed', 'under_review']:
            return Response(
                {'error': 'Dispute cannot be cancelled in its current status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        dispute.status = 'cancelled'
        dispute.resolved_at = timezone.now()
        dispute.save()

        return Response(
            DisputeRequestSerializer(dispute, context={'request': request}).data
        )

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Update dispute status (admin only)
        """
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user is admin
        if not self._is_admin_user(user):
            return Response(
                {'error': 'Only admin users can update dispute status'},
                status=status.HTTP_403_FORBIDDEN
            )

        dispute = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return Response(
                {'error': 'Status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update status and admin note
        dispute.status = new_status
        if 'admin_note' in request.data:
            dispute.admin_note = request.data.get('admin_note', '')

        # Set resolved_at if moving to a final state
        if new_status in ['completed', 'rejected', 'cancelled']:
            dispute.resolved_at = timezone.now()

        dispute.save()

        return Response(
            DisputeRequestSerializer(dispute, context={'request': request}).data
        )

    @action(detail=True, methods=['post'])
    def set_outcome(self, request, pk=None):
        """
        Set dispute outcome (admin only)
        """
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user is admin
        if not self._is_admin_user(user):
            return Response(
                {'error': 'Only admin users can set dispute outcomes'},
                status=status.HTTP_403_FORBIDDEN
            )

        dispute = self.get_object()
        outcome = request.data.get('outcome')

        if not outcome:
            return Response(
                {'error': 'Outcome is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Update dispute outcome
            dispute.outcome = outcome
            dispute.awarded_amount = request.data.get('awarded_amount')
            
            if 'admin_note' in request.data:
                if dispute.admin_note:
                    dispute.admin_note += f"\n\n{request.data['admin_note']}"
                else:
                    dispute.admin_note = request.data['admin_note']
            
            # Auto-update status based on outcome
            if outcome in ['buyer_wins', 'partial_refund', 'seller_wins']:
                dispute.status = 'processing'
            elif outcome in ['dismissed', 'withdrawn']:
                dispute.status = 'completed'
                dispute.resolved_at = timezone.now()
            
            dispute.save()

        return Response(
            DisputeRequestSerializer(dispute, context={'request': request}).data
        )

    @action(detail=False, methods=['get'])
    def my_disputes(self, request):
        """
        Get disputes filed by the current user
        """
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        disputes = self.get_queryset().filter(filed_by=user)
        page = self.paginate_queryset(disputes)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(disputes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """
        Get pending disputes (admin only)
        """
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user is admin
        if not self._is_admin_user(user):
            return Response(
                {'error': 'Only admin users can view pending disputes'},
                status=status.HTTP_403_FORBIDDEN
            )

        pending_disputes = self.get_queryset().filter(
            status__in=['filed', 'under_review', 'processing']
        )
        page = self.paginate_queryset(pending_disputes)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(pending_disputes, many=True)
        return Response(serializer.data)
 

class DisputeEvidenceViewSet(viewsets.ModelViewSet):
    """Manage dispute evidence with header-based authentication"""

    queryset = DisputeEvidence.objects.all()
    serializer_class = DisputeEvidenceSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_user_from_header(self, request):
        """Extract user from X-User-Id header"""
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return None

        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    def _is_admin_user(self, user):
        """Check if user is admin/staff"""
        return bool(getattr(user, 'is_admin', False) or getattr(user, 'is_moderator', False)) if user else False

    def list(self, request, *args, **kwargs):
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Users can only see evidence for their own disputes; admins can see all
        if self._is_admin_user(user):
            queryset = self.get_queryset()
        else:
            queryset = self.get_queryset().filter(
                Q(uploaded_by=user) | Q(dispute__filed_by=user)
            )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance = self.get_object()

        # Check if user can view this evidence
        if not self._is_admin_user(user) and instance.uploaded_by != user and instance.dispute.filed_by != user:
            return Response(
                {'error': 'You do not have permission to view this evidence'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        dispute_id = request.data.get('dispute')
        if not dispute_id:
            return Response(
                {'error': 'Dispute ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            dispute = DisputeRequest.objects.get(id=dispute_id)

            # Check if user owns the dispute
            if dispute.filed_by != user:
                return Response(
                    {'error': 'You do not have permission to add evidence to this dispute'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if evidence can be added
            if dispute.status in ['completed', 'rejected', 'cancelled']:
                return Response(
                    {'error': 'Cannot add evidence to a closed dispute'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            serializer.save(dispute=dispute, uploaded_by=user)

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        except DisputeRequest.DoesNotExist:
            return Response(
                {'error': 'Dispute not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def destroy(self, request, *args, **kwargs):
        user = self._get_user_from_header(request)
        if not user:
            return Response(
                {'error': 'User ID required in X-User-Id header'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance = self.get_object()

        # Check if user can delete the evidence
        if not self._is_admin_user(user) and instance.uploaded_by != user:
            return Response(
                {'error': 'You do not have permission to delete this evidence'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if dispute is in a state that allows evidence deletion
        if instance.dispute.status in ['completed', 'rejected', 'cancelled']:
            return Response(
                {'error': 'Cannot delete evidence from a closed dispute'},
                status=status.HTTP_400_BAD_REQUEST
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
