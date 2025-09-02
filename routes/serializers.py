"""
Django REST Framework serializers for routes app
"""
from rest_framework import serializers
from .models import RouteCalculation, RouteSegment, FuelStop, RestStop, TrafficAlert


class RouteSegmentSerializer(serializers.ModelSerializer):
    """Serializer for RouteSegment model"""
    
    class Meta:
        model = RouteSegment
        fields = [
            'id', 'sequence_order', 'start_lat', 'start_lng', 'end_lat', 'end_lng',
            'distance_miles', 'duration_seconds', 'instruction', 'highway_type',
            'road_name', 'speed_limit', 'segment_polyline'
        ]


class FuelStopSerializer(serializers.ModelSerializer):
    """Serializer for FuelStop model"""
    
    class Meta:
        model = FuelStop
        fields = [
            'id', 'name', 'address', 'latitude', 'longitude',
            'distance_from_start', 'sequence_order', 'estimated_fuel_needed',
            'stop_duration_minutes', 'has_truck_parking', 'has_restroom',
            'has_food', 'phone', 'website'
        ]


class RestStopSerializer(serializers.ModelSerializer):
    """Serializer for RestStop model"""
    
    rest_type_display = serializers.CharField(source='get_rest_type_display', read_only=True)
    
    class Meta:
        model = RestStop
        fields = [
            'id', 'rest_type', 'rest_type_display', 'required_duration_minutes',
            'name', 'address', 'latitude', 'longitude', 'distance_from_start',
            'sequence_order', 'hours_driven_before', 'hours_on_duty_before',
            'has_truck_parking', 'has_sleeper_facilities', 'has_restroom',
            'has_food', 'has_shower'
        ]


class TrafficAlertSerializer(serializers.ModelSerializer):
    """Serializer for TrafficAlert model"""
    
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    
    class Meta:
        model = TrafficAlert
        fields = [
            'id', 'alert_type', 'alert_type_display', 'severity', 'severity_display',
            'title', 'description', 'latitude', 'longitude', 'distance_from_start',
            'start_time', 'end_time', 'estimated_delay_minutes', 'is_active', 'is_verified'
        ]


class RouteCalculationSerializer(serializers.ModelSerializer):
    """Serializer for RouteCalculation model"""
    
    segments = RouteSegmentSerializer(many=True, read_only=True)
    fuel_stops = FuelStopSerializer(many=True, read_only=True)
    rest_stops = RestStopSerializer(many=True, read_only=True)
    traffic_alerts = TrafficAlertSerializer(many=True, read_only=True)
    
    class Meta:
        model = RouteCalculation
        fields = [
            'id', 'total_distance_miles', 'total_distance_km',
            'estimated_duration_seconds', 'estimated_duration_hours',
            'route_polyline', 'bbox_north', 'bbox_south', 'bbox_east', 'bbox_west',
            'api_provider', 'segments', 'fuel_stops', 'rest_stops', 'traffic_alerts',
            'created_at', 'updated_at'
        ]


class RouteCalculationSummarySerializer(serializers.ModelSerializer):
    """Summary serializer for RouteCalculation (without detailed segments)"""
    
    fuel_stops_count = serializers.SerializerMethodField()
    rest_stops_count = serializers.SerializerMethodField()
    traffic_alerts_count = serializers.SerializerMethodField()
    
    class Meta:
        model = RouteCalculation
        fields = [
            'id', 'total_distance_miles', 'total_distance_km',
            'estimated_duration_seconds', 'estimated_duration_hours',
            'route_polyline', 'bbox_north', 'bbox_south', 'bbox_east', 'bbox_west',
            'api_provider', 'fuel_stops_count', 'rest_stops_count', 'traffic_alerts_count'
        ]
    
    def get_fuel_stops_count(self, obj):
        return obj.fuel_stops.count()
    
    def get_rest_stops_count(self, obj):
        return obj.rest_stops.count()
    
    def get_traffic_alerts_count(self, obj):
        return obj.traffic_alerts.filter(is_active=True).count()
