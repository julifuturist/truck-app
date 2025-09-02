"""
Hours of Service (HOS) compliance service
Implements FMCSA regulations for commercial drivers
"""
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Tuple
from django.utils import timezone
from django.db.models import Sum, Q
from .models import ELDLog, DutyStatusRecord, HOSViolation, ELDLogSheet, DutyStatus
from trips.models import Driver, Trip


class HOSService:
    """Service for Hours of Service regulations and compliance"""
    
    # Federal HOS limits
    DAILY_DRIVING_LIMIT = 11  # hours
    DAILY_DUTY_LIMIT = 14     # hours
    CYCLE_70_8_LIMIT = 70     # 70 hours in 8 days
    CYCLE_60_7_LIMIT = 60     # 60 hours in 7 days
    DAILY_OFF_DUTY_MINIMUM = 10  # hours
    BREAK_REQUIREMENT_HOURS = 8   # Must take 30min break after 8 hours
    BREAK_MINIMUM_MINUTES = 30    # Minimum break duration
    
    def __init__(self):
        self.duty_statuses = {
            'off_duty': DutyStatus.objects.get_or_create(
                code='off_duty',
                defaults={
                    'name': 'Off Duty',
                    'description': 'Not on duty',
                    'counts_toward_driving': False,
                    'counts_toward_duty': False
                }
            )[0],
            'sleeper_berth': DutyStatus.objects.get_or_create(
                code='sleeper_berth',
                defaults={
                    'name': 'Sleeper Berth',
                    'description': 'Resting in sleeper berth',
                    'counts_toward_driving': False,
                    'counts_toward_duty': False
                }
            )[0],
            'driving': DutyStatus.objects.get_or_create(
                code='driving',
                defaults={
                    'name': 'Driving',
                    'description': 'Actively driving',
                    'counts_toward_driving': True,
                    'counts_toward_duty': True
                }
            )[0],
            'on_duty_not_driving': DutyStatus.objects.get_or_create(
                code='on_duty_not_driving',
                defaults={
                    'name': 'On Duty (Not Driving)',
                    'description': 'On duty but not driving',
                    'counts_toward_driving': False,
                    'counts_toward_duty': True
                }
            )[0]
        }
    
    def get_current_cycle_hours(self, driver: Driver, date: datetime = None) -> float:
        """Calculate current cycle hours for driver"""
        if date is None:
            date = timezone.now().date()
        
        # Determine cycle type
        if driver.cycle_type == '70_8':
            days_back = 8
            limit = self.CYCLE_70_8_LIMIT
        else:
            days_back = 7
            limit = self.CYCLE_60_7_LIMIT
        
        # Calculate start date for cycle
        start_date = date - timedelta(days=days_back - 1)
        
        # Get all ELD logs in the cycle period
        logs = ELDLog.objects.filter(
            driver=driver,
            log_date__gte=start_date,
            log_date__lte=date
        )
        
        total_hours = 0
        for log in logs:
            # Sum duty time from duty status records
            duty_records = log.duty_records.filter(
                duty_status__in=['driving', 'on_duty_not_driving']
            )
            
            for record in duty_records:
                if record.end_time:
                    duration = record.end_time - record.start_time
                    total_hours += duration.total_seconds() / 3600
        
        return total_hours
    
    def check_hos_violations(self, eld_log: ELDLog) -> List[HOSViolation]:
        """Check for HOS violations in an ELD log"""
        violations = []
        
        # Check daily driving limit (11 hours)
        driving_violation = self._check_daily_driving_limit(eld_log)
        if driving_violation:
            violations.append(driving_violation)
        
        # Check daily duty limit (14 hours)
        duty_violation = self._check_daily_duty_limit(eld_log)
        if duty_violation:
            violations.append(duty_violation)
        
        # Check cycle limit
        cycle_violation = self._check_cycle_limit(eld_log)
        if cycle_violation:
            violations.append(cycle_violation)
        
        # Check 30-minute break requirement
        break_violation = self._check_break_requirement(eld_log)
        if break_violation:
            violations.append(break_violation)
        
        # Check 10-hour rest requirement
        rest_violation = self._check_daily_rest_requirement(eld_log)
        if rest_violation:
            violations.append(rest_violation)
        
        return violations
    
    def _check_daily_driving_limit(self, eld_log: ELDLog) -> Optional[HOSViolation]:
        """Check 11-hour daily driving limit"""
        driving_records = eld_log.duty_records.filter(duty_status='driving')
        total_driving_seconds = sum(
            (record.end_time - record.start_time).total_seconds()
            for record in driving_records
            if record.end_time
        )
        total_driving_hours = total_driving_seconds / 3600
        
        if total_driving_hours > self.DAILY_DRIVING_LIMIT:
            return HOSViolation.objects.create(
                eld_log=eld_log,
                violation_type='drive_11h',
                severity='violation',
                description=f"Drove {total_driving_hours:.2f} hours, exceeding 11-hour limit",
                actual_value=total_driving_hours,
                limit_value=self.DAILY_DRIVING_LIMIT,
                violation_time=driving_records.last().end_time or timezone.now()
            )
        return None
    
    def _check_daily_duty_limit(self, eld_log: ELDLog) -> Optional[HOSViolation]:
        """Check 14-hour daily duty limit"""
        duty_records = eld_log.duty_records.filter(
            duty_status__in=['driving', 'on_duty_not_driving']
        ).order_by('start_time')
        
        if not duty_records.exists():
            return None
        
        # Calculate total on-duty time from first to last duty period
        first_duty = duty_records.first()
        last_duty = duty_records.last()
        
        if first_duty and last_duty and last_duty.end_time:
            total_duty_window = last_duty.end_time - first_duty.start_time
            total_duty_hours = total_duty_window.total_seconds() / 3600
            
            if total_duty_hours > self.DAILY_DUTY_LIMIT:
                return HOSViolation.objects.create(
                    eld_log=eld_log,
                    violation_type='duty_14h',
                    severity='violation',
                    description=f"On duty for {total_duty_hours:.2f} hours, exceeding 14-hour limit",
                    actual_value=total_duty_hours,
                    limit_value=self.DAILY_DUTY_LIMIT,
                    violation_time=last_duty.end_time
                )
        return None
    
    def _check_cycle_limit(self, eld_log: ELDLog) -> Optional[HOSViolation]:
        """Check 70/8 or 60/7 cycle limit"""
        current_cycle_hours = self.get_current_cycle_hours(eld_log.driver, eld_log.log_date)
        
        if eld_log.driver.cycle_type == '70_8':
            limit = self.CYCLE_70_8_LIMIT
            violation_type = 'cycle_70h'
        else:
            limit = self.CYCLE_60_7_LIMIT
            violation_type = 'cycle_60h'
        
        if current_cycle_hours > limit:
            return HOSViolation.objects.create(
                eld_log=eld_log,
                violation_type=violation_type,
                severity='critical',
                description=f"Cycle hours {current_cycle_hours:.2f} exceed {limit}-hour limit",
                actual_value=current_cycle_hours,
                limit_value=limit,
                violation_time=timezone.now()
            )
        return None
    
    def _check_break_requirement(self, eld_log: ELDLog) -> Optional[HOSViolation]:
        """Check 30-minute break requirement after 8 hours of driving"""
        driving_records = eld_log.duty_records.filter(
            duty_status='driving'
        ).order_by('start_time')
        
        continuous_driving = 0
        last_break_time = None
        
        for record in driving_records:
            if record.end_time:
                # Check if there was a sufficient break before this driving period
                if last_break_time and record.start_time - last_break_time >= timedelta(minutes=30):
                    continuous_driving = 0  # Reset counter after adequate break
                
                # Add driving time
                driving_duration = (record.end_time - record.start_time).total_seconds() / 3600
                continuous_driving += driving_duration
                
                # Check if 8 hours exceeded without break
                if continuous_driving > self.BREAK_REQUIREMENT_HOURS:
                    return HOSViolation.objects.create(
                        eld_log=eld_log,
                        violation_type='rest_break',
                        severity='violation',
                        description=f"Drove {continuous_driving:.2f} hours without required 30-minute break",
                        actual_value=continuous_driving,
                        limit_value=self.BREAK_REQUIREMENT_HOURS,
                        violation_time=record.end_time
                    )
                
                # Update last activity time
                last_break_time = record.end_time
        
        return None
    
    def _check_daily_rest_requirement(self, eld_log: ELDLog) -> Optional[HOSViolation]:
        """Check 10-hour daily rest requirement"""
        # Get previous day's log
        previous_date = eld_log.log_date - timedelta(days=1)
        try:
            previous_log = ELDLog.objects.get(driver=eld_log.driver, log_date=previous_date)
        except ELDLog.DoesNotExist:
            return None  # No previous day to check
        
        # Get last duty record from previous day
        last_duty_previous = previous_log.duty_records.filter(
            duty_status__in=['driving', 'on_duty_not_driving']
        ).order_by('-end_time').first()
        
        # Get first duty record from current day
        first_duty_current = eld_log.duty_records.filter(
            duty_status__in=['driving', 'on_duty_not_driving']
        ).order_by('start_time').first()
        
        if last_duty_previous and first_duty_current and last_duty_previous.end_time:
            rest_duration = first_duty_current.start_time - last_duty_previous.end_time
            rest_hours = rest_duration.total_seconds() / 3600
            
            if rest_hours < self.DAILY_OFF_DUTY_MINIMUM:
                return HOSViolation.objects.create(
                    eld_log=eld_log,
                    violation_type='daily_rest',
                    severity='violation',
                    description=f"Only {rest_hours:.2f} hours of rest, minimum 10 hours required",
                    actual_value=rest_hours,
                    limit_value=self.DAILY_OFF_DUTY_MINIMUM,
                    violation_time=first_duty_current.start_time
                )
        
        return None
    
    def calculate_available_hours(self, driver: Driver, current_time: datetime = None) -> Dict:
        """Calculate available driving and duty hours for driver"""
        if current_time is None:
            current_time = timezone.now()
        
        current_date = current_time.date()
        
        # Get current day's log
        try:
            current_log = ELDLog.objects.get(driver=driver, log_date=current_date)
        except ELDLog.DoesNotExist:
            current_log = None
        
        # Calculate current cycle hours
        current_cycle = self.get_current_cycle_hours(driver, current_date)
        
        # Calculate daily hours used
        daily_driving = 0
        daily_duty = 0
        
        if current_log:
            driving_records = current_log.duty_records.filter(duty_status='driving')
            duty_records = current_log.duty_records.filter(
                duty_status__in=['driving', 'on_duty_not_driving']
            )
            
            daily_driving = sum(
                (record.end_time - record.start_time).total_seconds() / 3600
                for record in driving_records
                if record.end_time
            )
            
            # Calculate duty window (first to last duty activity)
            if duty_records.exists():
                first_duty = duty_records.order_by('start_time').first()
                last_duty = duty_records.order_by('-end_time').first()
                
                if first_duty and last_duty and last_duty.end_time:
                    duty_window = last_duty.end_time - first_duty.start_time
                    daily_duty = duty_window.total_seconds() / 3600
        
        # Determine cycle limit
        cycle_limit = self.CYCLE_70_8_LIMIT if driver.cycle_type == '70_8' else self.CYCLE_60_7_LIMIT
        
        return {
            'daily_driving_used': daily_driving,
            'daily_driving_available': max(0, self.DAILY_DRIVING_LIMIT - daily_driving),
            'daily_duty_used': daily_duty,
            'daily_duty_available': max(0, self.DAILY_DUTY_LIMIT - daily_duty),
            'cycle_used': current_cycle,
            'cycle_available': max(0, cycle_limit - current_cycle),
            'cycle_limit': cycle_limit,
            'needs_break_soon': daily_driving >= self.BREAK_REQUIREMENT_HOURS - 1,  # Warning at 7 hours
            'needs_daily_rest': daily_duty >= self.DAILY_DUTY_LIMIT - 1  # Warning at 13 hours
        }
    
    def create_duty_status_record(
        self,
        eld_log: ELDLog,
        duty_status: str,
        start_time: datetime,
        location: str = "",
        latitude: float = None,
        longitude: float = None,
        notes: str = "",
        odometer: int = None
    ) -> DutyStatusRecord:
        """Create a new duty status record"""
        
        # End the previous record if it exists
        previous_record = eld_log.duty_records.filter(end_time__isnull=True).last()
        if previous_record:
            previous_record.end_time = start_time
            previous_record.save()
        
        # Create new record
        record = DutyStatusRecord.objects.create(
            eld_log=eld_log,
            duty_status=duty_status,
            start_time=start_time,
            location=location,
            latitude=latitude,
            longitude=longitude,
            notes=notes,
            odometer=odometer,
            is_automatic=False
        )
        
        # Update ELD log totals
        self._update_eld_log_totals(eld_log)
        
        # Check for violations
        violations = self.check_hos_violations(eld_log)
        if violations:
            eld_log.has_driving_violation = any(v.violation_type == 'drive_11h' for v in violations)
            eld_log.has_duty_violation = any(v.violation_type == 'duty_14h' for v in violations)
            eld_log.save()
        
        return record
    
    def _update_eld_log_totals(self, eld_log: ELDLog):
        """Update ELD log daily totals"""
        records = eld_log.duty_records.all()
        
        total_drive = timedelta(0)
        total_duty = timedelta(0)
        total_off_duty = timedelta(0)
        total_sleeper = timedelta(0)
        
        for record in records:
            if record.end_time:
                duration = record.end_time - record.start_time
                
                if record.duty_status == 'driving':
                    total_drive += duration
                    total_duty += duration
                elif record.duty_status == 'on_duty_not_driving':
                    total_duty += duration
                elif record.duty_status == 'off_duty':
                    total_off_duty += duration
                elif record.duty_status == 'sleeper_berth':
                    total_sleeper += duration
        
        eld_log.total_drive_time = total_drive
        eld_log.total_duty_time = total_duty
        eld_log.total_off_duty_time = total_off_duty
        eld_log.total_sleeper_time = total_sleeper
        eld_log.save()
    
    def generate_trip_eld_logs(self, trip: Trip) -> List[ELDLog]:
        """Generate ELD logs for a planned trip"""
        if not trip.route:
            raise ValueError("Trip must have a calculated route")
        
        route = trip.route
        total_hours = route.estimated_duration_hours
        
        # Calculate how many days the trip will take
        driving_hours_per_day = 11  # Maximum allowed
        days_needed = max(1, int(total_hours / driving_hours_per_day) + 1)
        
        logs = []
        start_date = trip.planned_start_time.date() if trip.planned_start_time else timezone.now().date()
        
        for day in range(days_needed):
            log_date = start_date + timedelta(days=day)
            
            # Get or create ELD log for this day (avoid unique constraint violation)
            eld_log, created = ELDLog.objects.get_or_create(
                driver=trip.driver,
                log_date=log_date,
                defaults={
                    'trip': trip,
                    'vehicle_id': f"TRUCK-{trip.driver.id}",
                    'is_certified': False
                }
            )
            
            # If we got an existing log, update the trip reference
            if not created and eld_log.trip != trip:
                eld_log.trip = trip
                eld_log.save()
            
            # Only generate duty status records for newly created logs
            if created:
                self._generate_daily_duty_records(eld_log, trip, day, total_hours)
            
            logs.append(eld_log)
        
        return logs
    
    def _generate_daily_duty_records(self, eld_log: ELDLog, trip: Trip, day_number: int, total_trip_hours: float):
        """Generate duty status records for a single day"""
        start_time = datetime.combine(eld_log.log_date, time(6, 0))  # Start at 6 AM
        start_time = timezone.make_aware(start_time)
        
        current_time = start_time
        
        # Pre-trip inspection (15 minutes)
        current_time = self._add_duty_record(
            eld_log, 'on_duty_not_driving', current_time, 15,
            "Pre-trip inspection", trip.current_location
        )
        
        # Driving periods with breaks
        remaining_hours = min(11, total_trip_hours - (day_number * 11))
        
        if remaining_hours > 0:
            # Pickup time allocation (1 hour on first day)
            if day_number == 0:
                current_time = self._add_duty_record(
                    eld_log, 'on_duty_not_driving', current_time, 60,
                    "Pickup operations", trip.pickup_location
                )
                remaining_hours -= 1
            
            # Drive for up to 8 hours (or 7 if pickup was done)
            max_driving = 8 if day_number > 0 else 7
            driving_time = min(max_driving, remaining_hours)
            current_time = self._add_duty_record(
                eld_log, 'driving', current_time, driving_time * 60,
                "Driving", "En route"
            )
            
            remaining_hours -= driving_time
            
            # 30-minute break if more driving needed
            if remaining_hours > 0:
                current_time = self._add_duty_record(
                    eld_log, 'off_duty', current_time, 30,
                    "Meal break", "Rest area"
                )
                
                # Drive remaining hours (up to 3 more, but save time for dropoff)
                is_final_day = day_number == int(total_trip_hours / 11)
                max_additional_driving = min(3, remaining_hours - (1 if is_final_day else 0))
                
                if max_additional_driving > 0:
                    current_time = self._add_duty_record(
                        eld_log, 'driving', current_time, max_additional_driving * 60,
                        "Driving", "En route"
                    )
                
                # Dropoff time allocation (1 hour on final day)
                if is_final_day:
                    current_time = self._add_duty_record(
                        eld_log, 'on_duty_not_driving', current_time, 60,
                        "Dropoff operations", trip.dropoff_location
                    )
        
        # Post-trip inspection (15 minutes)
        current_time = self._add_duty_record(
            eld_log, 'on_duty_not_driving', current_time, 15,
            "Post-trip inspection", trip.dropoff_location
        )
        
        # Off duty for rest of day
        end_of_day = datetime.combine(eld_log.log_date + timedelta(days=1), time(0, 0))
        end_of_day = timezone.make_aware(end_of_day)
        
        if current_time < end_of_day:
            self._add_duty_record(
                eld_log, 'off_duty', current_time,
                (end_of_day - current_time).total_seconds() / 60,
                "Off duty rest", "Truck stop"
            )
    
    def _add_duty_record(
        self,
        eld_log: ELDLog,
        duty_status: str,
        start_time: datetime,
        duration_minutes: float,
        notes: str,
        location: str
    ) -> datetime:
        """Add a duty status record and return the end time"""
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        DutyStatusRecord.objects.create(
            eld_log=eld_log,
            duty_status=duty_status,
            start_time=start_time,
            end_time=end_time,
            location=location,
            notes=notes,
            is_automatic=True
        )
        
        return end_time
