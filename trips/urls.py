"""
URL configuration for trips app
"""
from django.urls import path
from . import views

app_name = 'trips'

urlpatterns = [
    # Additional trip-specific endpoints (beyond the ViewSet routes)
    # The main CRUD operations are handled by the ViewSet in the main router
]
