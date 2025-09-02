"""
Django REST Framework serializers for eld_logs app
"""
from rest_framework import serializers
from .models import ELDLog, DutyStatusRecord, HOSViolation, ELDLogSheet, DutyStatus


class DutyStatusSerializer(serializers.ModelSerializer):
    """Serializer for DutyStatus model"""
    
    class Meta:
        model = DutyStatus
        fields = ['code', 'name', 'description', 'counts_toward_driving', 'counts_toward_duty']


class DutyStatusRecordSerializer(serializers.ModelSerializer):
    """Serializer for DutyStatusRecord model"""
    
    duty_status_display = serializers.CharField(source='get_duty_status_display', read_only=True)
    duration_hours = serializers.SerializerMethodField()
    
    class Meta:
        model = DutyStatusRecord
        fields = [
            'id', 'duty_status', 'duty_status_display', 'start_time', 'end_time',
            'location', 'latitude', 'longitude', 'odometer', 'notes',
            'is_automatic', 'is_edited', 'edit_reason', 'duration_hours'
        ]
    
    def get_duration_hours(self, obj):
        """Calculate duration in hours"""
        if obj.end_time:
            duration = obj.end_time - obj.start_time
            return round(duration.total_seconds() / 3600, 2)
        return None


class DutyStatusRecordCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating duty status records"""
    
    class Meta:
        model = DutyStatusRecord
        fields = [
            'duty_status', 'start_time', 'location', 'latitude', 'longitude',
            'odometer', 'notes'
        ]


class HOSViolationSerializer(serializers.ModelSerializer):
    """Serializer for HOSViolation model"""
    
    violation_type_display = serializers.CharField(source='get_violation_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    
    class Meta:
        model = HOSViolation
        fields = [
            'id', 'violation_type', 'violation_type_display', 'severity', 'severity_display',
            'description', 'actual_value', 'limit_value', 'violation_time',
            'resolved', 'resolution_notes', 'created_at'
        ]


class ELDLogCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating ELD logs"""
    
    class Meta:
        model = ELDLog
        fields = [
            'driver', 'trip', 'log_date', 'vehicle_id',
            'odometer_start', 'odometer_end'
        ]


class ELDLogListSerializer(serializers.ModelSerializer):
    """Serializer for ELD log list view"""
    
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    trip_name = serializers.CharField(source='trip.name', read_only=True)
    violations_count = serializers.SerializerMethodField()
    
    # Daily totals in hours
    total_drive_hours = serializers.SerializerMethodField()
    total_duty_hours = serializers.SerializerMethodField()
    total_off_duty_hours = serializers.SerializerMethodField()
    
    class Meta:
        model = ELDLog
        fields = [
            'id', 'driver', 'driver_name', 'trip', 'trip_name', 'log_date',
            'vehicle_id', 'total_drive_hours', 'total_duty_hours', 'total_off_duty_hours',
            'has_driving_violation', 'has_duty_violation', 'violations_count',
            'is_certified', 'certified_at'
        ]
    
    def get_violations_count(self, obj):
        return obj.violations.count()
    
    def get_total_drive_hours(self, obj):
        return round(obj.total_drive_time.total_seconds() / 3600, 2)
    
    def get_total_duty_hours(self, obj):
        return round(obj.total_duty_time.total_seconds() / 3600, 2)
    
    def get_total_off_duty_hours(self, obj):
        return round(obj.total_off_duty_time.total_seconds() / 3600, 2)


class ELDLogDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for ELD log detail view"""
    
    driver = serializers.StringRelatedField()
    trip = serializers.StringRelatedField()
    duty_records = DutyStatusRecordSerializer(many=True, read_only=True)
    violations = HOSViolationSerializer(many=True, read_only=True)
    
    # Daily totals in hours
    total_drive_hours = serializers.SerializerMethodField()
    total_duty_hours = serializers.SerializerMethodField()
    total_off_duty_hours = serializers.SerializerMethodField()
    total_sleeper_hours = serializers.SerializerMethodField()
    
    class Meta:
        model = ELDLog
        fields = [
            'id', 'driver', 'trip', 'log_date', 'vehicle_id',
            'odometer_start', 'odometer_end', 'total_drive_hours',
            'total_duty_hours', 'total_off_duty_hours', 'total_sleeper_hours',
            'has_driving_violation', 'has_duty_violation', 'violation_notes',
            'is_certified', 'certified_at', 'duty_records', 'violations',
            'created_at', 'updated_at'
        ]
    
    def get_total_drive_hours(self, obj):
        return round(obj.total_drive_time.total_seconds() / 3600, 2)
    
    def get_total_duty_hours(self, obj):
        return round(obj.total_duty_time.total_seconds() / 3600, 2)
    
    def get_total_off_duty_hours(self, obj):
        return round(obj.total_off_duty_time.total_seconds() / 3600, 2)
    
    def get_total_sleeper_hours(self, obj):
        return round(obj.total_sleeper_time.total_seconds() / 3600, 2)


class ELDLogSheetSerializer(serializers.ModelSerializer):
    """Serializer for ELD log sheet"""
    
    eld_log = ELDLogListSerializer(read_only=True)
    
    class Meta:
        model = ELDLogSheet
        fields = [
            'id', 'eld_log', 'grid_data', 'summary_data', 'generated_at'
        ]


class HOSStatusSerializer(serializers.Serializer):
    """Serializer for HOS status information"""
    
    daily_driving_used = serializers.FloatField()
    daily_driving_available = serializers.FloatField()
    daily_duty_used = serializers.FloatField()
    daily_duty_available = serializers.FloatField()
    cycle_used = serializers.FloatField()
    cycle_available = serializers.FloatField()
    cycle_limit = serializers.IntegerField()
    needs_break_soon = serializers.BooleanField()
    needs_daily_rest = serializers.BooleanField()


class TripPlanningRequestSerializer(serializers.Serializer):
    """Serializer for trip planning request"""
    
    driver_id = serializers.UUIDField()
    current_location = serializers.CharField(max_length=500)
    pickup_location = serializers.CharField(max_length=500)
    dropoff_location = serializers.CharField(max_length=500)
    current_cycle_used = serializers.FloatField(min_value=0, max_value=70)
    planned_start_time = serializers.DateTimeField(required=False, allow_null=True)
    trip_name = serializers.CharField(max_length=200, required=False, allow_blank=True)


class TripPlanningResponseSerializer(serializers.Serializer):
    """Serializer for trip planning response"""
    
    trip_id = serializers.UUIDField()
    route_summary = serializers.DictField()
    fuel_stops = serializers.ListField()  # Will be populated with FuelStopSerializer data
    rest_stops = serializers.ListField()  # Will be populated with RestStopSerializer data
    eld_logs_preview = serializers.ListField()
    hos_compliance = serializers.DictField()
    estimated_completion = serializers.DateTimeField()
