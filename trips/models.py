from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class Driver(models.Model):
    """Driver model for ELD compliance"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    driver_license = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    
    # HOS Settings
    cycle_type = models.CharField(
        max_length=20,
        choices=[
            ('70_8', '70 hours in 8 days'),
            ('60_7', '60 hours in 7 days')
        ],
        default='70_8'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.driver_license})"


class Trip(models.Model):
    """Main trip model"""
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='trips')
    
    # Trip Details
    name = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    
    # Locations (stored as "lat,lng" or address strings)
    current_location = models.CharField(max_length=500)
    pickup_location = models.CharField(max_length=500)
    dropoff_location = models.CharField(max_length=500)
    
    # Coordinates (calculated from addresses)
    current_lat = models.FloatField(null=True, blank=True)
    current_lng = models.FloatField(null=True, blank=True)
    pickup_lat = models.FloatField(null=True, blank=True)
    pickup_lng = models.FloatField(null=True, blank=True)
    dropoff_lat = models.FloatField(null=True, blank=True)
    dropoff_lng = models.FloatField(null=True, blank=True)
    
    # HOS Data
    current_cycle_used = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(70)],
        help_text="Current hours used in the cycle (0-70)"
    )
    
    # Trip calculations (filled after route calculation)
    total_distance = models.FloatField(null=True, blank=True, help_text="Total distance in miles")
    estimated_duration = models.FloatField(null=True, blank=True, help_text="Estimated duration in hours")
    
    # Timestamps
    planned_start_time = models.DateTimeField(null=True, blank=True)
    actual_start_time = models.DateTimeField(null=True, blank=True)
    planned_end_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Trip {self.name or self.id} - {self.driver.name}"


class TripWaypoint(models.Model):
    """Waypoints for the trip route"""
    WAYPOINT_TYPES = [
        ('start', 'Start'),
        ('pickup', 'Pickup'),
        ('fuel', 'Fuel Stop'),
        ('rest', 'Rest Break'),
        ('meal', 'Meal Break'),
        ('daily_rest', 'Daily Rest'),
        ('dropoff', 'Dropoff'),
        ('end', 'End'),
    ]
    
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='waypoints')
    waypoint_type = models.CharField(max_length=20, choices=WAYPOINT_TYPES)
    
    # Location
    address = models.CharField(max_length=500)
    latitude = models.FloatField()
    longitude = models.FloatField()
    
    # Timing
    sequence_order = models.PositiveIntegerField()
    estimated_arrival = models.DateTimeField()
    estimated_departure = models.DateTimeField(null=True, blank=True)
    actual_arrival = models.DateTimeField(null=True, blank=True)
    actual_departure = models.DateTimeField(null=True, blank=True)
    
    # Additional data
    duration_minutes = models.PositiveIntegerField(default=0, help_text="Duration of stop in minutes")
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['trip', 'sequence_order']
    
    def __str__(self):
        return f"{self.trip} - {self.waypoint_type} #{self.sequence_order}"
