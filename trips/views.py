"""
Django REST Framework views for trips app
"""
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Driver, Trip, TripWaypoint
from .serializers import (
    DriverSerializer, TripCreateSerializer, TripListSerializer,
    TripDetailSerializer, TripUpdateSerializer, TripWaypointSerializer
)
from routes.services import RouteService
from eld_logs.services import HOSService
from eld_logs.log_generator import ELDLogSheetGenerator
from eld_logs.serializers import TripPlanningRequestSerializer, TripPlanningResponseSerializer


class DriverViewSet(viewsets.ModelViewSet):
    """ViewSet for managing drivers"""
    
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    
    def get_queryset(self):
        """Filter drivers by search parameters"""
        queryset = Driver.objects.all()
        search = self.request.query_params.get('search', None)
        
        if search:
            queryset = queryset.filter(
                name__icontains=search
            ) | queryset.filter(
                driver_license__icontains=search
            )
        
        return queryset.order_by('name')


class TripViewSet(viewsets.ModelViewSet):
    """ViewSet for managing trips"""
    
    queryset = Trip.objects.all()
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'create':
            return TripCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TripUpdateSerializer
        elif self.action == 'list':
            return TripListSerializer
        return TripDetailSerializer
    
    def get_queryset(self):
        """Filter trips by parameters"""
        queryset = Trip.objects.select_related('driver').prefetch_related(
            'waypoints', 'route', 'eld_logs'
        )
        
        driver_id = self.request.query_params.get('driver', None)
        status_filter = self.request.query_params.get('status', None)
        
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def plan_trip(self, request):
        """Plan a new trip with route calculation and HOS compliance"""
        serializer = TripPlanningRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            # Get driver
            driver = get_object_or_404(Driver, id=data['driver_id'])
            
            # Create trip
            trip = Trip.objects.create(
                driver=driver,
                name=data.get('trip_name', f"Trip {timezone.now().strftime('%Y%m%d_%H%M')}"),
                current_location=data['current_location'],
                pickup_location=data['pickup_location'],
                dropoff_location=data['dropoff_location'],
                current_cycle_used=data['current_cycle_used'],
                planned_start_time=data.get('planned_start_time'),
                status='planned'
            )
            
            # Calculate route
            route_service = RouteService()
            route = route_service.calculate_route(trip)
            
            # Generate HOS-compliant schedule
            hos_service = HOSService()
            eld_logs = hos_service.generate_trip_eld_logs(trip)
            
            # Generate ELD log sheets preview
            log_generator = ELDLogSheetGenerator()
            log_sheets = log_generator.generate_multiple_log_sheets(eld_logs)
            
            # Prepare response data
            from routes.serializers import RouteCalculationSummarySerializer, FuelStopSerializer, RestStopSerializer
            
            response_data = {
                'trip_id': trip.id,
                'route_summary': RouteCalculationSummarySerializer(route).data,
                'fuel_stops': FuelStopSerializer(route.fuel_stops.all(), many=True).data,
                'rest_stops': RestStopSerializer(route.rest_stops.all(), many=True).data,
                'eld_logs_preview': [
                    {
                        'date': log.log_date.isoformat(),
                        'summary': log_generator.export_log_sheet_data(sheet)['summary_data']
                    }
                    for log, sheet in zip(eld_logs, log_sheets)
                ],
                'hos_compliance': hos_service.calculate_available_hours(driver),
                'estimated_completion': trip.planned_end_time
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to plan trip: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def start_trip(self, request, pk=None):
        """Start a planned trip"""
        trip = self.get_object()
        
        if trip.status != 'planned':
            return Response(
                {'error': 'Trip must be in planned status to start'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        trip.status = 'in_progress'
        trip.actual_start_time = timezone.now()
        trip.save()
        
        # Create initial duty status record
        if trip.eld_logs.exists():
            first_log = trip.eld_logs.first()
            hos_service = HOSService()
            hos_service.create_duty_status_record(
                eld_log=first_log,
                duty_status='on_duty_not_driving',
                start_time=trip.actual_start_time,
                location=trip.current_location,
                notes="Trip started - Pre-trip inspection"
            )
        
        serializer = self.get_serializer(trip)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete_trip(self, request, pk=None):
        """Complete a trip"""
        trip = self.get_object()
        
        if trip.status != 'in_progress':
            return Response(
                {'error': 'Trip must be in progress to complete'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        trip.status = 'completed'
        trip.actual_end_time = timezone.now()
        trip.save()
        
        # Create final duty status record
        if trip.eld_logs.exists():
            last_log = trip.eld_logs.last()
            hos_service = HOSService()
            hos_service.create_duty_status_record(
                eld_log=last_log,
                duty_status='off_duty',
                start_time=trip.actual_end_time,
                location=trip.dropoff_location,
                notes="Trip completed - Post-trip inspection"
            )
        
        serializer = self.get_serializer(trip)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def route_details(self, request, pk=None):
        """Get detailed route information for a trip"""
        trip = self.get_object()
        
        if not hasattr(trip, 'route') or not trip.route:
            return Response(
                {'error': 'No route calculated for this trip'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        from routes.serializers import RouteCalculationSerializer
        serializer = RouteCalculationSerializer(trip.route)
        return Response(serializer.data)
