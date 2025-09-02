"""
Django REST Framework views for eld_logs app
"""
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta

from .models import ELDLog, DutyStatusRecord, HOSViolation, ELDLogSheet
from .serializers import (
    ELDLogCreateSerializer, ELDLogListSerializer, ELDLogDetailSerializer,
    DutyStatusRecordSerializer, DutyStatusRecordCreateSerializer,
    HOSViolationSerializer, ELDLogSheetSerializer, HOSStatusSerializer
)
from .services import HOSService
from .log_generator import ELDLogSheetGenerator
from trips.models import Driver


class ELDLogViewSet(viewsets.ModelViewSet):
    """ViewSet for managing ELD logs"""
    
    queryset = ELDLog.objects.all()
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'create':
            return ELDLogCreateSerializer
        elif self.action == 'list':
            return ELDLogListSerializer
        return ELDLogDetailSerializer
    
    def get_queryset(self):
        """Filter ELD logs by parameters"""
        queryset = ELDLog.objects.select_related('driver', 'trip').prefetch_related(
            'duty_records', 'violations'
        )
        
        driver_id = self.request.query_params.get('driver', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        has_violations = self.request.query_params.get('has_violations', None)
        
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        
        if date_from:
            queryset = queryset.filter(log_date__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(log_date__lte=date_to)
        
        if has_violations:
            if has_violations.lower() == 'true':
                queryset = queryset.filter(has_driving_violation=True) | queryset.filter(has_duty_violation=True)
            elif has_violations.lower() == 'false':
                queryset = queryset.filter(has_driving_violation=False, has_duty_violation=False)
        
        return queryset.order_by('-log_date')
    
    @action(detail=True, methods=['post'])
    def certify(self, request, pk=None):
        """Certify an ELD log"""
        eld_log = self.get_object()
        
        if eld_log.is_certified:
            return Response(
                {'error': 'Log is already certified'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        eld_log.is_certified = True
        eld_log.certified_at = timezone.now()
        eld_log.save()
        
        serializer = self.get_serializer(eld_log)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def generate_log_sheet(self, request, pk=None):
        """Generate visual log sheet for an ELD log"""
        eld_log = self.get_object()
        
        log_generator = ELDLogSheetGenerator()
        log_sheet = log_generator.generate_log_sheet(eld_log)
        
        serializer = ELDLogSheetSerializer(log_sheet)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_duty_record(self, request, pk=None):
        """Add a duty status record to an ELD log"""
        eld_log = self.get_object()
        
        serializer = DutyStatusRecordCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Use HOS service to create the record (handles business logic)
        hos_service = HOSService()
        duty_record = hos_service.create_duty_status_record(
            eld_log=eld_log,
            duty_status=data['duty_status'],
            start_time=data['start_time'],
            location=data.get('location', ''),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            notes=data.get('notes', ''),
            odometer=data.get('odometer')
        )
        
        response_serializer = DutyStatusRecordSerializer(duty_record)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class DutyStatusRecordViewSet(viewsets.ModelViewSet):
    """ViewSet for managing duty status records"""
    
    queryset = DutyStatusRecord.objects.all()
    serializer_class = DutyStatusRecordSerializer
    
    def get_queryset(self):
        """Filter duty status records by ELD log"""
        queryset = DutyStatusRecord.objects.select_related('eld_log')
        
        eld_log_id = self.request.query_params.get('eld_log', None)
        duty_status = self.request.query_params.get('duty_status', None)
        
        if eld_log_id:
            queryset = queryset.filter(eld_log_id=eld_log_id)
        
        if duty_status:
            queryset = queryset.filter(duty_status=duty_status)
        
        return queryset.order_by('start_time')


class HOSViolationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing HOS violations"""
    
    queryset = HOSViolation.objects.all()
    serializer_class = HOSViolationSerializer
    
    def get_queryset(self):
        """Filter violations by parameters"""
        queryset = HOSViolation.objects.select_related('eld_log', 'eld_log__driver')
        
        driver_id = self.request.query_params.get('driver', None)
        violation_type = self.request.query_params.get('type', None)
        severity = self.request.query_params.get('severity', None)
        resolved = self.request.query_params.get('resolved', None)
        
        if driver_id:
            queryset = queryset.filter(eld_log__driver_id=driver_id)
        
        if violation_type:
            queryset = queryset.filter(violation_type=violation_type)
        
        if severity:
            queryset = queryset.filter(severity=severity)
        
        if resolved is not None:
            resolved_bool = resolved.lower() == 'true'
            queryset = queryset.filter(resolved=resolved_bool)
        
        return queryset.order_by('-violation_time')
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark a violation as resolved"""
        violation = self.get_object()
        
        resolution_notes = request.data.get('resolution_notes', '')
        
        violation.resolved = True
        violation.resolution_notes = resolution_notes
        violation.save()
        
        serializer = self.get_serializer(violation)
        return Response(serializer.data)


class HOSStatusView(generics.RetrieveAPIView):
    """View for getting HOS status for a driver"""
    
    serializer_class = HOSStatusSerializer
    
    def get_object(self):
        """Calculate HOS status for driver"""
        driver_id = self.kwargs.get('driver_id')
        driver = get_object_or_404(Driver, id=driver_id)
        
        hos_service = HOSService()
        return hos_service.calculate_available_hours(driver)


class DriverELDLogsView(generics.ListAPIView):
    """View for getting ELD logs for a specific driver"""
    
    serializer_class = ELDLogListSerializer
    
    def get_queryset(self):
        """Get ELD logs for a specific driver"""
        driver_id = self.kwargs.get('driver_id')
        
        # Date range parameters
        days_back = int(self.request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days_back)
        
        return ELDLog.objects.filter(
            driver_id=driver_id,
            log_date__gte=start_date,
            log_date__lte=end_date
        ).select_related('driver', 'trip').prefetch_related(
            'duty_records', 'violations'
        ).order_by('-log_date')


class ELDLogSheetView(generics.RetrieveAPIView):
    """View for getting ELD log sheet"""
    
    serializer_class = ELDLogSheetSerializer
    
    def get_object(self):
        """Get or generate ELD log sheet"""
        eld_log_id = self.kwargs.get('eld_log_id')
        eld_log = get_object_or_404(ELDLog, id=eld_log_id)
        
        # Check if log sheet already exists
        try:
            return eld_log.log_sheet
        except ELDLogSheet.DoesNotExist:
            # Generate new log sheet
            log_generator = ELDLogSheetGenerator()
            return log_generator.generate_log_sheet(eld_log)
