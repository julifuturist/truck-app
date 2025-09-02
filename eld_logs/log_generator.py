"""
ELD Log Sheet Generator
Creates visual representation of daily logs similar to paper ELD forms
"""
from datetime import datetime, timedelta, time
from typing import Dict, List, Tuple, Optional
import json
from django.utils import timezone
from .models import ELDLog, DutyStatusRecord, ELDLogSheet


class ELDLogSheetGenerator:
    """Generates visual ELD log sheets from duty status data"""
    
    def __init__(self):
        # 24-hour grid - 15-minute intervals (96 total intervals)
        self.intervals_per_hour = 4
        self.total_intervals = 24 * self.intervals_per_hour  # 96 intervals
        self.minutes_per_interval = 15
        
        # Duty status colors/patterns for visual representation
        self.duty_status_styles = {
            'off_duty': {'color': '#e0e0e0', 'pattern': 'solid', 'label': 'Off Duty', 'line': 1},
            'sleeper_berth': {'color': '#b0b0b0', 'pattern': 'diagonal', 'label': 'Sleeper Berth', 'line': 2},
            'driving': {'color': '#ff6b6b', 'pattern': 'solid', 'label': 'Driving', 'line': 3},
            'on_duty_not_driving': {'color': '#4ecdc4', 'pattern': 'solid', 'label': 'On Duty (Not Driving)', 'line': 4}
        }
    
    def generate_log_sheet(self, eld_log: ELDLog) -> ELDLogSheet:
        """Generate complete ELD log sheet for a given ELD log"""
        
        # Create 24-hour grid data
        grid_data = self._create_24_hour_grid(eld_log)
        
        # Create summary information
        summary_data = self._create_summary_data(eld_log)
        
        # Create or update ELD log sheet
        log_sheet, created = ELDLogSheet.objects.get_or_create(
            eld_log=eld_log,
            defaults={
                'grid_data': grid_data,
                'summary_data': summary_data
            }
        )
        
        if not created:
            # Update existing sheet
            log_sheet.grid_data = grid_data
            log_sheet.summary_data = summary_data
            log_sheet.save()
        
        return log_sheet
    
    def _create_24_hour_grid(self, eld_log: ELDLog) -> Dict:
        """Create 24-hour grid representation of duty status"""
        
        # Initialize grid with 96 intervals (15-minute each)
        grid = {
            'intervals': [],
            'hours': list(range(24)),
            'date': eld_log.log_date.isoformat(),
            'time_markers': self._get_time_markers()
        }
        
        # Get all duty status records for the day
        duty_records = eld_log.duty_records.all().order_by('start_time')
        
        # Create intervals for the entire day
        start_of_day = datetime.combine(eld_log.log_date, time(0, 0))
        start_of_day = timezone.make_aware(start_of_day)
        
        for interval_idx in range(self.total_intervals):
            interval_start = start_of_day + timedelta(minutes=interval_idx * self.minutes_per_interval)
            interval_end = interval_start + timedelta(minutes=self.minutes_per_interval)
            
            # Find which duty status applies to this interval
            duty_status = self._get_duty_status_for_interval(duty_records, interval_start, interval_end)
            
            interval_data = {
                'index': interval_idx,
                'start_time': interval_start.strftime('%H:%M'),
                'end_time': interval_end.strftime('%H:%M'),
                'duty_status': duty_status,
                'style': self.duty_status_styles.get(duty_status, self.duty_status_styles['off_duty']),
                'hour': interval_start.hour,
                'quarter': (interval_start.minute // 15) + 1  # 1-4 for each quarter hour
            }
            
            grid['intervals'].append(interval_data)
        
        # Add duty status legend
        grid['legend'] = [
            {
                'status': status,
                'style': style,
                'line_number': style['line']
            }
            for status, style in self.duty_status_styles.items()
        ]
        
        return grid
    
    def _get_duty_status_for_interval(
        self,
        duty_records: List[DutyStatusRecord],
        interval_start: datetime,
        interval_end: datetime
    ) -> str:
        """Determine duty status for a specific time interval"""
        
        # Find the duty record that covers this interval
        for record in duty_records:
            record_start = record.start_time
            record_end = record.end_time or (interval_start + timedelta(days=1))  # If no end time, assume it continues
            
            # Check if this interval overlaps with the duty record
            if (record_start <= interval_start < record_end) or \
               (record_start < interval_end <= record_end) or \
               (interval_start <= record_start < interval_end):
                return record.duty_status
        
        # Default to off duty if no record found
        return 'off_duty'
    
    def _get_time_markers(self) -> List[Dict]:
        """Create time markers for the grid (every hour)"""
        markers = []
        for hour in range(24):
            markers.append({
                'hour': hour,
                'time_12h': self._format_12_hour(hour),
                'time_24h': f"{hour:02d}:00",
                'interval_index': hour * self.intervals_per_hour
            })
        return markers
    
    def _format_12_hour(self, hour: int) -> str:
        """Convert 24-hour to 12-hour format"""
        if hour == 0:
            return "12 AM"
        elif hour < 12:
            return f"{hour} AM"
        elif hour == 12:
            return "12 PM"
        else:
            return f"{hour - 12} PM"
    
    def _create_summary_data(self, eld_log: ELDLog) -> Dict:
        """Create summary information for the log sheet"""
        
        # Calculate daily totals
        daily_totals = self._calculate_daily_totals(eld_log)
        
        # Get driver information
        driver = eld_log.driver
        
        # Get trip information if available
        trip_info = None
        if eld_log.trip:
            trip = eld_log.trip
            trip_info = {
                'name': trip.name or f"Trip {trip.id}",
                'pickup_location': trip.pickup_location,
                'dropoff_location': trip.dropoff_location,
                'total_distance': trip.total_distance,
                'status': trip.status
            }
        
        # Get violation information
        violations = list(eld_log.violations.all().values(
            'violation_type', 'severity', 'description', 'actual_value', 'limit_value'
        ))
        
        # Get odometer readings
        first_record = eld_log.duty_records.filter(odometer__isnull=False).first()
        last_record = eld_log.duty_records.filter(odometer__isnull=False).last()
        
        odometer_start = first_record.odometer if first_record else None
        odometer_end = last_record.odometer if last_record else None
        miles_driven = (odometer_end - odometer_start) if (odometer_start and odometer_end) else None
        
        summary = {
            'driver': {
                'name': driver.name,
                'license': driver.driver_license,
                'cycle_type': driver.get_cycle_type_display()
            },
            'date': eld_log.log_date.strftime('%Y-%m-%d'),
            'day_of_week': eld_log.log_date.strftime('%A'),
            'vehicle_id': eld_log.vehicle_id,
            'trip': trip_info,
            'odometer': {
                'start': odometer_start,
                'end': odometer_end,
                'miles_driven': miles_driven
            },
            'daily_totals': daily_totals,
            'violations': violations,
            'compliance': {
                'has_violations': len(violations) > 0,
                'is_certified': eld_log.is_certified,
                'certified_at': eld_log.certified_at.isoformat() if eld_log.certified_at else None
            },
            'remarks': self._get_daily_remarks(eld_log),
            'shipping_info': self._get_shipping_info(eld_log)
        }
        
        return summary
    
    def _calculate_daily_totals(self, eld_log: ELDLog) -> Dict:
        """Calculate daily totals for each duty status"""
        totals = {
            'driving': 0.0,
            'on_duty_not_driving': 0.0,
            'total_duty': 0.0,
            'off_duty': 0.0,
            'sleeper_berth': 0.0
        }
        
        duty_records = eld_log.duty_records.all()
        
        for record in duty_records:
            if record.end_time:
                duration_hours = (record.end_time - record.start_time).total_seconds() / 3600
                
                if record.duty_status == 'driving':
                    totals['driving'] += duration_hours
                    totals['total_duty'] += duration_hours
                elif record.duty_status == 'on_duty_not_driving':
                    totals['on_duty_not_driving'] += duration_hours
                    totals['total_duty'] += duration_hours
                elif record.duty_status == 'off_duty':
                    totals['off_duty'] += duration_hours
                elif record.duty_status == 'sleeper_berth':
                    totals['sleeper_berth'] += duration_hours
        
        # Format to reasonable precision
        for key in totals:
            totals[key] = round(totals[key], 2)
        
        return totals
    
    def _get_daily_remarks(self, eld_log: ELDLog) -> List[str]:
        """Get daily remarks and notes"""
        remarks = []
        
        # Add notes from duty status records
        for record in eld_log.duty_records.filter(notes__isnull=False).exclude(notes=''):
            remarks.append(f"{record.start_time.strftime('%H:%M')} - {record.notes}")
        
        # Add violation notes
        if eld_log.violation_notes:
            remarks.append(f"Violations: {eld_log.violation_notes}")
        
        # Add trip-specific remarks
        if eld_log.trip:
            trip = eld_log.trip
            if trip.status == 'completed':
                remarks.append(f"Trip completed: {trip.pickup_location} to {trip.dropoff_location}")
            elif trip.status == 'in_progress':
                remarks.append(f"Trip in progress: {trip.pickup_location} to {trip.dropoff_location}")
        
        return remarks
    
    def _get_shipping_info(self, eld_log: ELDLog) -> Optional[Dict]:
        """Get shipping document information from trip"""
        if not eld_log.trip:
            return None
        
        trip = eld_log.trip
        
        # Get waypoints for pickup and dropoff times
        pickup_waypoint = trip.waypoints.filter(waypoint_type='pickup').first()
        dropoff_waypoint = trip.waypoints.filter(waypoint_type='dropoff').first()
        
        shipping_info = {
            'bill_of_lading': f"BOL-{trip.id}",
            'shipper_name': "Shipper Name",  # Would come from trip data in real app
            'consignee_name': "Consignee Name",
            'pickup_location': trip.pickup_location,
            'dropoff_location': trip.dropoff_location,
            'pickup_time': pickup_waypoint.actual_arrival.isoformat() if pickup_waypoint and pickup_waypoint.actual_arrival else None,
            'dropoff_time': dropoff_waypoint.actual_arrival.isoformat() if dropoff_waypoint and dropoff_waypoint.actual_arrival else None,
            'commodity': "General Freight",
            'weight': "40,000 lbs"  # Standard assumption
        }
        
        return shipping_info
    
    def generate_multiple_log_sheets(self, eld_logs: List[ELDLog]) -> List[ELDLogSheet]:
        """Generate log sheets for multiple ELD logs"""
        sheets = []
        for eld_log in eld_logs:
            sheet = self.generate_log_sheet(eld_log)
            sheets.append(sheet)
        return sheets
    
    def get_chart_coordinates(self, grid_data: Dict) -> List[Tuple[int, int]]:
        """Get coordinates for drawing the duty status chart"""
        coordinates = []
        
        for interval in grid_data['intervals']:
            x = interval['index']  # 0-95 for 96 intervals
            
            # Map duty status to line number (1-4)
            duty_status = interval['duty_status']
            y = self.duty_status_styles[duty_status]['line']
            
            coordinates.append((x, y))
        
        return coordinates
    
    def export_log_sheet_data(self, log_sheet: ELDLogSheet) -> Dict:
        """Export log sheet data for frontend consumption"""
        return {
            'id': str(log_sheet.id),
            'eld_log_id': str(log_sheet.eld_log.id),
            'grid_data': log_sheet.grid_data,
            'summary_data': log_sheet.summary_data,
            'generated_at': log_sheet.generated_at.isoformat(),
            'chart_coordinates': self.get_chart_coordinates(log_sheet.grid_data)
        }
