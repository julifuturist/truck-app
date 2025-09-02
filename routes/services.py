"""
Route calculation services using OpenRouteService API
"""
import requests
import json
from typing import Dict, List, Tuple, Optional
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import polyline
from django.conf import settings
from .models import RouteCalculation, RouteSegment, FuelStop, RestStop
from trips.models import Trip, TripWaypoint


class RouteService:
    """Service for calculating routes and managing route data"""
    
    def __init__(self):
        # Using OpenRouteService free API (2000 requests/day)
        # You can get a free API key at https://openrouteservice.org/
        self.api_key = getattr(settings, 'OPENROUTE_API_KEY', '5b3ce3597851110001cf6248ea3ab4e2cf4148b19b68be21b1bcbf75')
        self.base_url = 'https://api.openrouteservice.org'
        self.geocoder = Nominatim(user_agent="truck-logs-app")
        
        # Truck profile settings for routing
        self.truck_profile = {
            'profile': 'driving-hgv',  # Heavy Goods Vehicle profile
            'vehicle_type': 'hgv',
            'format': 'geojson',
            'instructions': 'true',
            'geometry': 'true'
        }
    
    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """Convert address to latitude, longitude coordinates"""
        try:
            location = self.geocoder.geocode(address)
            if location:
                return (location.latitude, location.longitude)
            return None
        except Exception as e:
            print(f"Geocoding error for {address}: {e}")
            return None
    
    def calculate_route(self, trip: Trip) -> RouteCalculation:
        """Calculate route for a trip with HOS compliance"""
        
        # First, geocode all locations if not already done
        if not trip.current_lat or not trip.current_lng:
            coords = self.geocode_address(trip.current_location)
            if coords:
                trip.current_lat, trip.current_lng = coords
        
        if not trip.pickup_lat or not trip.pickup_lng:
            coords = self.geocode_address(trip.pickup_location)
            if coords:
                trip.pickup_lat, trip.pickup_lng = coords
        
        if not trip.dropoff_lat or not trip.dropoff_lng:
            coords = self.geocode_address(trip.dropoff_location)
            if coords:
                trip.dropoff_lat, trip.dropoff_lng = coords
        
        trip.save()
        
        # Create waypoints for the route
        coordinates = [
            [trip.current_lng, trip.current_lat],  # Start
            [trip.pickup_lng, trip.pickup_lat],    # Pickup
            [trip.dropoff_lng, trip.dropoff_lat]   # Dropoff
        ]
        
        # Call OpenRouteService API
        route_data = self._call_routing_api(coordinates)
        
        if not route_data:
            raise Exception("Failed to calculate route")
        
        # Create RouteCalculation object
        route = self._create_route_calculation(trip, route_data)
        
        # Generate fuel stops (every 1000 miles)
        self._generate_fuel_stops(route, route_data)
        
        # Generate HOS-compliant rest stops
        self._generate_hos_rest_stops(route, trip)
        
        return route
    
    def _call_routing_api(self, coordinates: List[List[float]]) -> Optional[Dict]:
        """Call OpenRouteService routing API"""
        url = f"{self.base_url}/v2/directions/driving-hgv/geojson"
        
        headers = {
            'Authorization': self.api_key,
            'Content-Type': 'application/json',
        }
        
        data = {
            'coordinates': coordinates,
            'instructions': True,
            'geometry': True,
            'format': 'geojson',
            'units': 'mi',  # Miles
            'options': {
                'vehicle_type': 'hgv',
                'profile_params': {
                    'restrictions': {
                        'weight': 40000,  # 40k lbs truck weight
                        'height': 13.6,   # Standard truck height in feet
                        'width': 8.5,     # Standard truck width in feet
                        'length': 53       # Standard trailer length in feet
                    }
                }
            }
        }
        
        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Routing API error: {e}")
            # Fallback to simple calculation if API fails
            return self._calculate_fallback_route(coordinates)
    
    def _calculate_fallback_route(self, coordinates: List[List[float]]) -> Dict:
        """Fallback route calculation using simple distance calculation"""
        total_distance = 0
        
        # Calculate distance between consecutive points
        for i in range(len(coordinates) - 1):
            start = (coordinates[i][1], coordinates[i][0])  # lat, lng
            end = (coordinates[i + 1][1], coordinates[i + 1][0])
            distance = geodesic(start, end).miles
            total_distance += distance
        
        # Estimate duration (average 55 mph for trucks)
        estimated_duration = total_distance / 55 * 3600  # seconds
        
        # Create simple polyline
        simple_polyline = polyline.encode([(coord[1], coord[0]) for coord in coordinates])
        
        return {
            'features': [{
                'geometry': {
                    'coordinates': coordinates,
                    'type': 'LineString'
                },
                'properties': {
                    'summary': {
                        'distance': total_distance * 1609.34,  # convert to meters
                        'duration': estimated_duration
                    },
                    'segments': [{
                        'distance': total_distance * 1609.34,
                        'duration': estimated_duration,
                        'steps': []
                    }]
                }
            }],
            'bbox': [
                min(coord[0] for coord in coordinates),  # min lng
                min(coord[1] for coord in coordinates),  # min lat
                max(coord[0] for coord in coordinates),  # max lng
                max(coord[1] for coord in coordinates)   # max lat
            ]
        }
    
    def _create_route_calculation(self, trip: Trip, route_data: Dict) -> RouteCalculation:
        """Create RouteCalculation object from API response"""
        feature = route_data['features'][0]
        properties = feature['properties']
        summary = properties['summary']
        geometry = feature['geometry']
        bbox = route_data.get('bbox', [0, 0, 0, 0])
        
        # Convert distance from meters to miles
        distance_miles = summary['distance'] / 1609.34
        distance_km = summary['distance'] / 1000
        duration_hours = summary['duration'] / 3600
        
        # Encode polyline for storage
        coordinates = geometry['coordinates']
        route_polyline = polyline.encode([(coord[1], coord[0]) for coord in coordinates])
        
        route = RouteCalculation.objects.create(
            trip=trip,
            total_distance_miles=distance_miles,
            total_distance_km=distance_km,
            estimated_duration_seconds=summary['duration'],
            estimated_duration_hours=duration_hours,
            route_polyline=route_polyline,
            bbox_west=bbox[0],
            bbox_south=bbox[1],
            bbox_east=bbox[2],
            bbox_north=bbox[3],
            api_provider='openrouteservice',
            api_response_data=route_data
        )
        
        # Update trip with calculated values
        trip.total_distance = distance_miles
        trip.estimated_duration = duration_hours
        trip.save()
        
        return route
    
    def _generate_fuel_stops(self, route: RouteCalculation, route_data: Dict):
        """Generate fuel stops every 1000 miles along the route"""
        total_distance = route.total_distance_miles
        
        if total_distance <= 1000:
            return  # No fuel stops needed for short trips
        
        # Calculate number of fuel stops needed
        num_stops = int(total_distance // 1000)
        
        for i in range(1, num_stops + 1):
            distance_for_stop = i * 1000
            
            # Find approximate coordinates for this distance
            coords = self._get_coordinates_at_distance(route_data, distance_for_stop)
            
            if coords:
                # Create a generic fuel stop (in real app, you'd query a fuel stop API)
                FuelStop.objects.create(
                    route=route,
                    name=f"Fuel Stop #{i}",
                    address=f"Mile {distance_for_stop} along route",
                    latitude=coords[1],
                    longitude=coords[0],
                    distance_from_start=distance_for_stop,
                    sequence_order=i,
                    estimated_fuel_needed=150,  # Estimated gallons
                    stop_duration_minutes=30,
                    has_truck_parking=True,
                    has_restroom=True,
                    has_food=True
                )
    
    def _generate_hos_rest_stops(self, route: RouteCalculation, trip: Trip):
        """Generate HOS-compliant rest stops"""
        total_hours = route.estimated_duration_hours
        current_cycle = trip.current_cycle_used
        
        # Calculate driving time (assuming average speed)
        driving_hours = total_hours * 0.85  # 85% of time is actual driving
        
        rest_stops = []
        cumulative_driving = 0
        cumulative_duty = current_cycle
        distance_covered = 0
        
        # 11-hour driving limit rule
        while cumulative_driving + 8 < driving_hours:  # Check if we need more rest
            
            # Determine rest type needed
            if cumulative_duty + 8 >= 14:  # Approaching 14-hour duty limit
                rest_type = 'daily_rest'
                rest_duration = 10 * 60  # 10 hours in minutes
                driving_time_before = cumulative_driving
                duty_time_before = cumulative_duty
                
                # Reset after 10-hour rest
                cumulative_duty = 0
                
            elif cumulative_driving + 8 >= 11:  # Approaching 11-hour driving limit
                rest_type = 'daily_rest'
                rest_duration = 10 * 60
                driving_time_before = cumulative_driving
                duty_time_before = cumulative_duty
                
                # Reset after 10-hour rest
                cumulative_duty = 0
                cumulative_driving = 0
                
            else:
                # 30-minute break after 8 hours
                rest_type = 'meal_break'
                rest_duration = 30
                driving_time_before = cumulative_driving
                duty_time_before = cumulative_duty
                
                cumulative_duty += 0.5  # 30 minutes counts as duty time
                
            # Calculate distance for this rest stop
            distance_covered += (8 * 55)  # 8 hours at 55 mph
            
            if distance_covered < route.total_distance_miles:
                coords = self._get_coordinates_at_distance(route.api_response_data, distance_covered)
                
                if coords:
                    RestStop.objects.create(
                        route=route,
                        rest_type=rest_type,
                        required_duration_minutes=rest_duration,
                        name=f"{rest_type.replace('_', ' ').title()} Stop",
                        address=f"Mile {distance_covered:.0f} along route",
                        latitude=coords[1],
                        longitude=coords[0],
                        distance_from_start=distance_covered,
                        sequence_order=len(rest_stops) + 1,
                        hours_driven_before=driving_time_before,
                        hours_on_duty_before=duty_time_before,
                        has_truck_parking=True,
                        has_sleeper_facilities=(rest_type == 'daily_rest'),
                        has_restroom=True,
                        has_food=True,
                        has_shower=(rest_type == 'daily_rest')
                    )
                    
                    rest_stops.append(rest_type)
            
            # Add the driving time for next segment
            if rest_type != 'meal_break':
                cumulative_driving = 0  # Reset after major rest
            else:
                cumulative_driving += 8  # Continue counting
                cumulative_duty += 8
    
    def _get_coordinates_at_distance(self, route_data: Dict, target_distance_miles: float) -> Optional[List[float]]:
        """Get coordinates at a specific distance along the route"""
        try:
            feature = route_data['features'][0]
            coordinates = feature['geometry']['coordinates']
            
            if len(coordinates) < 2:
                return None
            
            # Convert target distance to meters
            target_distance_m = target_distance_miles * 1609.34
            
            current_distance = 0
            
            for i in range(len(coordinates) - 1):
                start = (coordinates[i][1], coordinates[i][0])  # lat, lng
                end = (coordinates[i + 1][1], coordinates[i + 1][0])
                segment_distance = geodesic(start, end).meters
                
                if current_distance + segment_distance >= target_distance_m:
                    # Interpolate position within this segment
                    remaining = target_distance_m - current_distance
                    ratio = remaining / segment_distance
                    
                    lat = start[0] + (end[0] - start[0]) * ratio
                    lng = start[1] + (end[1] - start[1]) * ratio
                    
                    return [lng, lat]
                
                current_distance += segment_distance
            
            # If we're past the end, return the last coordinate
            return coordinates[-1]
            
        except Exception as e:
            print(f"Error getting coordinates at distance: {e}")
            return None
