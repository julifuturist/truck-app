"""
URL configuration for routes app
"""
from django.urls import path
from . import views

app_name = 'routes'

urlpatterns = [
    # Route-specific endpoints will be accessed through trip routes
    # For example: /api/v1/trips/{id}/route-details/
]
