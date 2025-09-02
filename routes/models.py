from django.db import models
from trips.models import Trip
import uuid


class RouteCalculation(models.Model):
    """Calculated route information for a trip"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.OneToOneField(Trip, on_delete=models.CASCADE, related_name='route')
    
    # Route summary
    total_distance_miles = models.FloatField(help_text="Total route distance in miles")
    total_distance_km = models.FloatField(help_text="Total route distance in kilometers")
    estimated_duration_seconds = models.PositiveIntegerField(help_text="Estimated duration in seconds")
    estimated_duration_hours = models.FloatField(help_text="Estimated duration in hours")
    
    # Route geometry (encoded polyline)
    route_polyline = models.TextField(help_text="Encoded polyline for the route")
    
    # Bounding box for map display
    bbox_north = models.FloatField()
    bbox_south = models.FloatField()
    bbox_east = models.FloatField()
    bbox_west = models.FloatField()
    
    # API information
    api_provider = models.CharField(max_length=50, default='openrouteservice')
    api_response_data = models.JSONField(null=True, blank=True, help_text="Full API response for debugging")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Route for {self.trip} - {self.total_distance_miles:.1f} miles"


class RouteSegment(models.Model):
    """Individual segments of the calculated route"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route = models.ForeignKey(RouteCalculation, on_delete=models.CASCADE, related_name='segments')
    
    # Segment order and location
    sequence_order = models.PositiveIntegerField()
    start_lat = models.FloatField()
    start_lng = models.FloatField()
    end_lat = models.FloatField()
    end_lng = models.FloatField()
    
    # Segment details
    distance_miles = models.FloatField()
    duration_seconds = models.PositiveIntegerField()
    instruction = models.TextField(blank=True, help_text="Turn-by-turn instruction")
    
    # Road information
    highway_type = models.CharField(max_length=50, blank=True)
    road_name = models.CharField(max_length=200, blank=True)
    speed_limit = models.PositiveIntegerField(null=True, blank=True, help_text="Speed limit in mph")
    
    # Geometry for this segment
    segment_polyline = models.TextField(blank=True, help_text="Encoded polyline for this segment")
    
    class Meta:
        ordering = ['route', 'sequence_order']
    
    def __str__(self):
        return f"{self.route} - Segment {self.sequence_order}"


class FuelStop(models.Model):
    """Fuel stops along the route (every 1000 miles)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route = models.ForeignKey(RouteCalculation, on_delete=models.CASCADE, related_name='fuel_stops')
    
    # Location
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=500)
    latitude = models.FloatField()
    longitude = models.FloatField()
    
    # Route position
    distance_from_start = models.FloatField(help_text="Distance from route start in miles")
    sequence_order = models.PositiveIntegerField()
    
    # Fuel stop details
    estimated_fuel_needed = models.FloatField(null=True, blank=True, help_text="Estimated fuel needed in gallons")
    stop_duration_minutes = models.PositiveIntegerField(default=30, help_text="Estimated stop duration")
    
    # Additional services
    has_truck_parking = models.BooleanField(default=True)
    has_restroom = models.BooleanField(default=True)
    has_food = models.BooleanField(default=False)
    
    # Contact information
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    
    class Meta:
        ordering = ['route', 'sequence_order']
    
    def __str__(self):
        return f"{self.name} - {self.route}"


class RestStop(models.Model):
    """Required rest stops for HOS compliance"""
    REST_TYPES = [
        ('meal_break', '30-minute meal break'),
        ('short_rest', 'Short rest break'),
        ('daily_rest', '10-hour daily rest'),
        ('weekly_restart', '34-hour restart'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route = models.ForeignKey(RouteCalculation, on_delete=models.CASCADE, related_name='rest_stops')
    
    # Rest stop type and timing
    rest_type = models.CharField(max_length=20, choices=REST_TYPES)
    required_duration_minutes = models.PositiveIntegerField()
    
    # Location
    name = models.CharField(max_length=200, blank=True)
    address = models.CharField(max_length=500, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    
    # Route position
    distance_from_start = models.FloatField(help_text="Distance from route start in miles")
    sequence_order = models.PositiveIntegerField()
    
    # HOS compliance
    hours_driven_before = models.FloatField(help_text="Hours driven before this rest")
    hours_on_duty_before = models.FloatField(help_text="Hours on duty before this rest")
    
    # Facility information
    has_truck_parking = models.BooleanField(default=True)
    has_sleeper_facilities = models.BooleanField(default=False)
    has_restroom = models.BooleanField(default=True)
    has_food = models.BooleanField(default=False)
    has_shower = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['route', 'sequence_order']
    
    def __str__(self):
        return f"{self.get_rest_type_display()} - {self.route}"


class TrafficAlert(models.Model):
    """Traffic alerts and road conditions along the route"""
    ALERT_TYPES = [
        ('traffic_jam', 'Traffic Jam'),
        ('accident', 'Accident'),
        ('construction', 'Construction'),
        ('weather', 'Weather'),
        ('road_closure', 'Road Closure'),
        ('weight_restriction', 'Weight Restriction'),
        ('height_restriction', 'Height Restriction'),
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route = models.ForeignKey(RouteCalculation, on_delete=models.CASCADE, related_name='traffic_alerts')
    
    # Alert details
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS)
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Location
    latitude = models.FloatField()
    longitude = models.FloatField()
    distance_from_start = models.FloatField(help_text="Distance from route start in miles")
    
    # Timing
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    estimated_delay_minutes = models.PositiveIntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['route', 'distance_from_start']
    
    def __str__(self):
        return f"{self.get_alert_type_display()} - {self.route}"
