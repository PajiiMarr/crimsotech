from rest_framework import serializers
from .models import DisputeRequest, DisputeEvidence


class DisputeEvidenceSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DisputeEvidence
        fields = [
            'id', 'dispute', 'uploaded_by', 'uploaded_by_name',
            'file', 'file_url', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'uploaded_by']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and getattr(obj, 'file', None):
            try:
                return request.build_absolute_uri(obj.file.url)
            except Exception:
                return obj.file.url
        return None

    def get_uploaded_by_name(self, obj):
        user = getattr(obj, 'uploaded_by', None)
        if not user:
            return None
        name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
        return name or getattr(user, 'username', None) or str(getattr(user, 'id', ''))


class DisputeRequestSerializer(serializers.ModelSerializer):
    evidence = DisputeEvidenceSerializer(many=True, read_only=True)
    filed_by_name = serializers.SerializerMethodField()
    order_number = serializers.CharField(source='order.order', read_only=True)
    refund_request_number = serializers.SerializerMethodField()

    class Meta:
        model = DisputeRequest
        fields = [
            'id',
            'order', 'order_number',
            'refund', 'refund_request_number',
            'filed_by', 'filed_by_name',
            'reason', 'description',
            'status',
            'outcome', 'awarded_amount',
            'admin_note',
            'created_at', 'resolved_at',
            'evidence',
        ]
        read_only_fields = [
            'id',
            'filed_by',
            'status',
            'outcome',
            'awarded_amount',
            'admin_note',
            'created_at',
            'resolved_at',
            'evidence',
        ]

    def get_filed_by_name(self, obj):
        user = getattr(obj, 'filed_by', None)
        if not user:
            return None
        name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
        return name or getattr(user, 'username', None) or str(getattr(user, 'id', ''))

    def get_refund_request_number(self, obj):
        refund = getattr(obj, 'refund', None)
        return getattr(refund, 'request_number', None) if refund else None


class DisputeRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DisputeRequest
        fields = ['order', 'refund', 'reason', 'description']

    def create(self, validated_data):
        filed_by = self.context.get('filed_by')
        if not filed_by:
            raise serializers.ValidationError({'filed_by': 'X-User-Id header is required'})
        validated_data['filed_by'] = filed_by
        return super().create(validated_data)
