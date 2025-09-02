#!/usr/bin/env python
"""
Create sample data for testing the TruckLog application
"""
import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Add the project directory to the Python path
sys.path.append('/home/andy/Workspace/Jucelio/tests/truck-logs')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trucklog_backend.settings')
django.setup()

from trips.models import Driver, Trip
from eld_logs.models import ELDLog, DutyStatusRecord
from django.contrib.auth.models import User

def create_sample_data():
    print("Creating sample data...")
    
    # Create sample drivers
    drivers_data = [
        {
            'driver_license': 'TX123456789',
            'name': 'John Smith',
            'phone': '555-0123',
            'email': 'john.smith@example.com',
            'cycle_type': '70_8'
        },
        {
            'driver_license': 'CA987654321',
            'name': 'Maria Garcia',
            'phone': '555-0456',
            'email': 'maria.garcia@example.com',
            'cycle_type': '70_8'
        },
        {
            'driver_license': 'FL555666777',
            'name': 'Mike Johnson',
            'phone': '555-0789',
            'email': 'mike.johnson@example.com',
            'cycle_type': '60_7'
        }
    ]
    
    drivers = []
    for driver_data in drivers_data:
        driver, created = Driver.objects.get_or_create(
            driver_license=driver_data['driver_license'],
            defaults=driver_data
        )
        drivers.append(driver)
        if created:
            print(f"Created driver: {driver.name}")
        else:
            print(f"Driver already exists: {driver.name}")
    
    # Create sample trips
    trips_data = [
        {
            'driver': drivers[0],
            'name': 'Dallas to Los Angeles',
            'current_location': 'Dallas, TX, USA',
            'pickup_location': 'Dallas, TX, USA',
            'dropoff_location': 'Los Angeles, CA, USA',
            'current_cycle_used': 15.5,
            'status': 'planned'
        },
        {
            'driver': drivers[1],
            'name': 'Phoenix to Denver',
            'current_location': 'Phoenix, AZ, USA',
            'pickup_location': 'Phoenix, AZ, USA',
            'dropoff_location': 'Denver, CO, USA',
            'current_cycle_used': 8.0,
            'status': 'in_progress'
        },
        {
            'driver': drivers[2],
            'name': 'Miami to Atlanta',
            'current_location': 'Miami, FL, USA',
            'pickup_location': 'Miami, FL, USA',
            'dropoff_location': 'Atlanta, GA, USA',
            'current_cycle_used': 45.5,
            'status': 'completed'
        }
    ]
    
    trips = []
    for trip_data in trips_data:
        trip, created = Trip.objects.get_or_create(
            name=trip_data['name'],
            driver=trip_data['driver'],
            defaults=trip_data
        )
        trips.append(trip)
        if created:
            print(f"Created trip: {trip.name}")
        else:
            print(f"Trip already exists: {trip.name}")
    
    # Create sample ELD logs
    today = timezone.now().date()
    for i, driver in enumerate(drivers):
        for day_offset in range(7):  # Last 7 days
            log_date = today - timedelta(days=day_offset)
            
            eld_log, created = ELDLog.objects.get_or_create(
                driver=driver,
                log_date=log_date,
                defaults={
                    'vehicle_id': f'TRUCK-{driver.id}',
                    'total_drive_time': timedelta(hours=8 + day_offset),
                    'total_duty_time': timedelta(hours=10 + day_offset),
                    'total_off_duty_time': timedelta(hours=14 - day_offset),
                    'is_certified': day_offset > 1,  # Only recent logs uncertified
                }
            )
            
            if created:
                print(f"Created ELD log for {driver.name} on {log_date}")
                
                # Create sample duty status records
                start_time = datetime.combine(log_date, datetime.min.time().replace(hour=6))
                start_time = timezone.make_aware(start_time)
                
                # Pre-trip inspection
                DutyStatusRecord.objects.create(
                    eld_log=eld_log,
                    duty_status='on_duty_not_driving',
                    start_time=start_time,
                    end_time=start_time + timedelta(minutes=15),
                    location=f'{driver.name} Terminal',
                    notes='Pre-trip inspection',
                    is_automatic=True
                )
                
                # Driving
                driving_start = start_time + timedelta(minutes=15)
                DutyStatusRecord.objects.create(
                    eld_log=eld_log,
                    duty_status='driving',
                    start_time=driving_start,
                    end_time=driving_start + timedelta(hours=8),
                    location='En route',
                    notes='Driving to destination',
                    is_automatic=True
                )
                
                # Off duty
                off_duty_start = driving_start + timedelta(hours=8)
                DutyStatusRecord.objects.create(
                    eld_log=eld_log,
                    duty_status='off_duty',
                    start_time=off_duty_start,
                    end_time=off_duty_start + timedelta(hours=10),
                    location='Rest area',
                    notes='Daily rest period',
                    is_automatic=True
                )
    
    print("Sample data created successfully!")
    print(f"Created {len(drivers)} drivers")
    print(f"Created {len(trips)} trips")
    print(f"Created ELD logs for the last 7 days")

if __name__ == '__main__':
    create_sample_data()
