from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from trips.models import Driver, Trip
import uuid
from datetime import datetime, timedelta


class DutyStatus(models.Model):
    """ELD Duty Status definitions according to FMCSA regulations"""
    DUTY_STATUS_CHOICES = [
        ('off_duty', 'Off Duty'),
        ('sleeper_berth', 'Sleeper Berth'),
        ('driving', 'Driving'),
        ('on_duty_not_driving', 'On Duty (Not Driving)'),
    ]
    
    code = models.CharField(max_length=20, choices=DUTY_STATUS_CHOICES, primary_key=True)
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    counts_toward_driving = models.BooleanField(default=False)
    counts_toward_duty = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name


class ELDLog(models.Model):
    """Main ELD Log entry for a specific date"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='eld_logs')
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='eld_logs', null=True, blank=True)
    
    # Log date (24-hour period starting at midnight)
    log_date = models.DateField()
    
    # Vehicle information
    vehicle_id = models.CharField(max_length=50, blank=True)
    odometer_start = models.PositiveIntegerField(null=True, blank=True)
    odometer_end = models.PositiveIntegerField(null=True, blank=True)
    
    # Daily totals (calculated from duty status records)
    total_drive_time = models.DurationField(default=timedelta(0))
    total_duty_time = models.DurationField(default=timedelta(0))
    total_off_duty_time = models.DurationField(default=timedelta(0))
    total_sleeper_time = models.DurationField(default=timedelta(0))
    
    # Violations flags
    has_driving_violation = models.BooleanField(default=False)
    has_duty_violation = models.BooleanField(default=False)
    violation_notes = models.TextField(blank=True)
    
    # Certification
    is_certified = models.BooleanField(default=False)
    certified_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['driver', 'log_date']
        ordering = ['-log_date']
    
    def __str__(self):
        return f"{self.driver.name} - {self.log_date}"


class DutyStatusRecord(models.Model):
    """Individual duty status change records within an ELD log"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eld_log = models.ForeignKey(ELDLog, on_delete=models.CASCADE, related_name='duty_records')
    
    # Status change details
    duty_status = models.CharField(
        max_length=20,
        choices=DutyStatus.DUTY_STATUS_CHOICES
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    
    # Location information
    location = models.CharField(max_length=500, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    # Additional information
    odometer = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    # System tracking
    is_automatic = models.BooleanField(default=False)  # True if system-generated
    is_edited = models.BooleanField(default=False)
    edit_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['eld_log', 'start_time']
    
    def __str__(self):
        return f"{self.eld_log} - {self.get_duty_status_display()} at {self.start_time}"
    
    @property
    def duration(self):
        """Calculate duration of this duty status"""
        if self.end_time:
            return self.end_time - self.start_time
        return timedelta(0)


class HOSViolation(models.Model):
    """Hours of Service violations tracking"""
    VIOLATION_TYPES = [
        ('drive_11h', 'Driving more than 11 hours'),
        ('duty_14h', 'On duty more than 14 hours'),
        ('cycle_70h', 'Cycle limit exceeded (70 hours)'),
        ('cycle_60h', 'Cycle limit exceeded (60 hours)'),
        ('rest_break', 'Required rest break missed'),
        ('daily_rest', '10-hour daily rest period not met'),
    ]
    
    SEVERITY_CHOICES = [
        ('warning', 'Warning'),
        ('violation', 'Violation'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eld_log = models.ForeignKey(ELDLog, on_delete=models.CASCADE, related_name='violations')
    
    violation_type = models.CharField(max_length=20, choices=VIOLATION_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='violation')
    
    # Details
    description = models.TextField()
    actual_value = models.FloatField(help_text="Actual hours/time value")
    limit_value = models.FloatField(help_text="Legal limit value")
    
    # Timing
    violation_time = models.DateTimeField()
    resolved = models.BooleanField(default=False)
    resolution_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.eld_log} - {self.get_violation_type_display()}"


class ELDLogSheet(models.Model):
    """Generated ELD log sheet for visual representation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eld_log = models.OneToOneField(ELDLog, on_delete=models.CASCADE, related_name='log_sheet')
    
    # Generated visual data
    grid_data = models.JSONField(help_text="24-hour grid data for visual representation")
    summary_data = models.JSONField(help_text="Summary information for the log sheet")
    
    # File information (if PDF generated)
    pdf_file = models.FileField(upload_to='eld_sheets/', null=True, blank=True)
    
    generated_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Log Sheet - {self.eld_log}"
