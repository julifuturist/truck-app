"""
URL configuration for trucklog_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from trips.views import DriverViewSet, TripViewSet
from eld_logs.views import ELDLogViewSet, DutyStatusRecordViewSet, HOSViolationViewSet

# Create router for ViewSets
router = DefaultRouter()
router.register(r'drivers', DriverViewSet)
router.register(r'trips', TripViewSet)
router.register(r'eld-logs', ELDLogViewSet)
router.register(r'duty-records', DutyStatusRecordViewSet)
router.register(r'violations', HOSViolationViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API routes
    path('api/v1/', include(router.urls)),
    path('api/v1/', include('trips.urls')),
    path('api/v1/', include('eld_logs.urls')),
    path('api/v1/', include('routes.urls')),
    
    # API documentation (for development)
    path('api/v1/auth/', include('rest_framework.urls')),
]
