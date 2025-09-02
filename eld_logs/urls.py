"""
URL configuration for eld_logs app
"""
from django.urls import path
from . import views

app_name = 'eld_logs'

urlpatterns = [
    # HOS status for a driver
    path('drivers/<uuid:driver_id>/hos-status/', views.HOSStatusView.as_view(), name='hos-status'),
    
    # ELD logs for a specific driver
    path('drivers/<uuid:driver_id>/logs/', views.DriverELDLogsView.as_view(), name='driver-logs'),
    
    # ELD log sheet
    path('logs/<uuid:eld_log_id>/sheet/', views.ELDLogSheetView.as_view(), name='log-sheet'),
]
