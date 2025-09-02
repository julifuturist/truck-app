"""
Django REST Framework serializers for trips app
"""
from rest_framework import serializers
from .models import Driver, Trip, TripWaypoint


class DriverSerializer(serializers.ModelSerializer):
    """Serializer for Driver model"""
    
    class Meta:
        model = Driver
        fields = [
            'id', 'driver_license', 'name', 'phone', 'email',
            'cycle_type', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TripWaypointSerializer(serializers.ModelSerializer):
    """Serializer for TripWaypoint model"""
    
    waypoint_type_display = serializers.CharField(source='get_waypoint_type_display', read_only=True)
    
    class Meta:
        model = TripWaypoint
        fields = [
            'id', 'waypoint_type', 'waypoint_type_display', 'address',
            'latitude', 'longitude', 'sequence_order', 'estimated_arrival',
            'estimated_departure', 'actual_arrival', 'actual_departure',
            'duration_minutes', 'notes'
        ]
        read_only_fields = ['id']


class TripCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new trips"""
    
    class Meta:
        model = Trip
        fields = [
            'driver', 'name', 'current_location', 'pickup_location',
            'dropoff_location', 'current_cycle_used', 'planned_start_time'
        ]
    
    def validate_current_cycle_used(self, value):
        """Validate cycle hours are within limits"""
        if value < 0 or value > 70:
            raise serializers.ValidationError("Current cycle used must be between 0 and 70 hours")
        return value


class TripListSerializer(serializers.ModelSerializer):
    """Serializer for trip list view"""
    
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Trip
        fields = [
            'id', 'name', 'driver', 'driver_name', 'status', 'status_display',
            'current_location', 'pickup_location', 'dropoff_location',
            'current_cycle_used', 'total_distance', 'estimated_duration',
            'planned_start_time', 'actual_start_time', 'created_at'
        ]


class TripDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for trip detail view"""
    
    driver = DriverSerializer(read_only=True)
    waypoints = TripWaypointSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Route information (will be populated if route exists)
    route_distance = serializers.SerializerMethodField()
    route_duration = serializers.SerializerMethodField()
    route_polyline = serializers.SerializerMethodField()
    fuel_stops_count = serializers.SerializerMethodField()
    rest_stops_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Trip
        fields = [
            'id', 'name', 'driver', 'status', 'status_display',
            'current_location', 'pickup_location', 'dropoff_location',
            'current_lat', 'current_lng', 'pickup_lat', 'pickup_lng',
            'dropoff_lat', 'dropoff_lng', 'current_cycle_used',
            'total_distance', 'estimated_duration', 'planned_start_time',
            'actual_start_time', 'planned_end_time', 'actual_end_time',
            'waypoints', 'route_distance', 'route_duration', 'route_polyline',
            'fuel_stops_count', 'rest_stops_count', 'created_at', 'updated_at'
        ]
    
    def get_route_distance(self, obj):
        """Get route distance if route exists"""
        return obj.route.total_distance_miles if hasattr(obj, 'route') and obj.route else None
    
    def get_route_duration(self, obj):
        """Get route duration if route exists"""
        return obj.route.estimated_duration_hours if hasattr(obj, 'route') and obj.route else None
    
    def get_route_polyline(self, obj):
        """Get route polyline if route exists"""
        return obj.route.route_polyline if hasattr(obj, 'route') and obj.route else None
    
    def get_fuel_stops_count(self, obj):
        """Get number of fuel stops"""
        return obj.route.fuel_stops.count() if hasattr(obj, 'route') and obj.route else 0
    
    def get_rest_stops_count(self, obj):
        """Get number of rest stops"""
        return obj.route.rest_stops.count() if hasattr(obj, 'route') and obj.route else 0


class TripUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating trips"""
    
    class Meta:
        model = Trip
        fields = [
            'name', 'status', 'actual_start_time', 'actual_end_time'
        ]
