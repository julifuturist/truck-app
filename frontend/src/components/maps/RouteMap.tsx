import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Paper, Typography } from '@mui/material';
import polyline from '@mapbox/polyline';

import { RouteCalculation, FuelStop, RestStop, TrafficAlert, MapMarker } from '../../types';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for different marker types
const createCustomIcon = (color: string, type: string) => {
  const iconSvg = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.594 0 0 5.594 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.594 19.406 0 12.5 0z" 
            fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="12.5" cy="12.5" r="6" fill="#fff"/>
      <text x="12.5" y="16" text-anchor="middle" font-size="8" font-weight="bold" fill="${color}">
        ${type.charAt(0).toUpperCase()}
      </text>
    </svg>
  `;
  
  return L.divIcon({
    html: iconSvg,
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
    popupAnchor: [0, -41],
    className: 'custom-marker'
  });
};

const markerIcons = {
  start: createCustomIcon('#4CAF50', 'S'),
  pickup: createCustomIcon('#2196F3', 'P'),
  dropoff: createCustomIcon('#FF5722', 'D'),
  fuel: createCustomIcon('#FF9800', 'F'),
  rest: createCustomIcon('#9C27B0', 'R'),
  alert: createCustomIcon('#F44336', '!'),
};

interface RouteMapProps {
  route?: RouteCalculation;
  fuelStops?: FuelStop[];
  restStops?: RestStop[];
  trafficAlerts?: TrafficAlert[];
  markers?: MapMarker[];
  height?: string | number;
  className?: string;
}

// Component to fit map bounds to route
const MapBoundsHandler: React.FC<{ bounds?: L.LatLngBounds }> = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, bounds]);
  
  return null;
};

const RouteMap: React.FC<RouteMapProps> = ({ 
  route, 
  fuelStops = [], 
  restStops = [], 
  trafficAlerts = [], 
  markers = [],
  height = 400,
  className 
}) => {
  const mapRef = useRef<L.Map>(null);
  
  // Decode polyline and prepare route data
  const routeCoordinates = route?.route_polyline 
    ? polyline.decode(route.route_polyline).map(([lat, lng]: [number, number]) => [lat, lng] as [number, number])
    : [];
  
  // Calculate map bounds
  const bounds = React.useMemo(() => {
    if (route) {
      return L.latLngBounds([
        [route.bbox_south, route.bbox_west],
        [route.bbox_north, route.bbox_east]
      ]);
    }
    
    if (markers.length > 0) {
      const lats = markers.map(m => m.position[0]);
      const lngs = markers.map(m => m.position[1]);
      return L.latLngBounds([
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      ]);
    }
    
    return undefined;
  }, [route, markers]);

  // Default center (US center)
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const defaultZoom = 4;

  return (
    <Paper className={className} sx={{ overflow: 'hidden' }}>
      <MapContainer
        ref={mapRef}
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Fit bounds to route/markers */}
        <MapBoundsHandler bounds={bounds} />
        
        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            color="#2196F3"
            weight={4}
            opacity={0.8}
          />
        )}
        
        {/* Custom markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={markerIcons[marker.type] || markerIcons.start}
          >
            <Popup>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {marker.title}
                </Typography>
                {marker.description && (
                  <Typography variant="body2" color="textSecondary">
                    {marker.description}
                  </Typography>
                )}
              </Box>
            </Popup>
          </Marker>
        ))}
        
        {/* Fuel stops */}
        {fuelStops.map((stop) => (
          <Marker
            key={`fuel-${stop.id}`}
            position={[stop.latitude, stop.longitude]}
            icon={markerIcons.fuel}
          >
            <Popup>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  ⛽ {stop.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stop.address}
                </Typography>
                <Typography variant="body2">
                  Mile {stop.distance_from_start.toFixed(0)} • {stop.stop_duration_minutes}min stop
                </Typography>
                {stop.estimated_fuel_needed && (
                  <Typography variant="body2">
                    Est. fuel: {stop.estimated_fuel_needed} gallons
                  </Typography>
                )}
                <Box sx={{ mt: 1 }}>
                  {stop.has_truck_parking && <Typography variant="caption">🚛 Truck Parking • </Typography>}
                  {stop.has_restroom && <Typography variant="caption">🚻 Restroom • </Typography>}
                  {stop.has_food && <Typography variant="caption">🍔 Food</Typography>}
                </Box>
              </Box>
            </Popup>
          </Marker>
        ))}
        
        {/* Rest stops */}
        {restStops.map((stop) => (
          <Marker
            key={`rest-${stop.id}`}
            position={[stop.latitude, stop.longitude]}
            icon={markerIcons.rest}
          >
            <Popup>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  🛏️ {stop.rest_type_display}
                </Typography>
                {stop.name && (
                  <Typography variant="body2" color="textSecondary">
                    {stop.name}
                  </Typography>
                )}
                <Typography variant="body2">
                  Mile {stop.distance_from_start.toFixed(0)} • {stop.required_duration_minutes}min required
                </Typography>
                <Typography variant="body2">
                  After {stop.hours_driven_before.toFixed(1)}h driving, {stop.hours_on_duty_before.toFixed(1)}h on duty
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {stop.has_truck_parking && <Typography variant="caption">🚛 Truck Parking • </Typography>}
                  {stop.has_sleeper_facilities && <Typography variant="caption">🛏️ Sleeper • </Typography>}
                  {stop.has_restroom && <Typography variant="caption">🚻 Restroom • </Typography>}
                  {stop.has_food && <Typography variant="caption">🍔 Food • </Typography>}
                  {stop.has_shower && <Typography variant="caption">🚿 Shower</Typography>}
                </Box>
              </Box>
            </Popup>
          </Marker>
        ))}
        
        {/* Traffic alerts */}
        {trafficAlerts.filter(alert => alert.is_active).map((alert) => (
          <Marker
            key={`alert-${alert.id}`}
            position={[alert.latitude, alert.longitude]}
            icon={markerIcons.alert}
          >
            <Popup>
              <Box>
                <Typography variant="subtitle2" gutterBottom color="error">
                  ⚠️ {alert.title}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {alert.description}
                </Typography>
                <Typography variant="body2">
                  Type: {alert.alert_type_display} • Severity: {alert.severity_display}
                </Typography>
                {alert.estimated_delay_minutes > 0 && (
                  <Typography variant="body2" color="warning.main">
                    Estimated delay: {alert.estimated_delay_minutes} minutes
                  </Typography>
                )}
              </Box>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Paper>
  );
};

export default RouteMap;
