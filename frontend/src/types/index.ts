// API Response Types
export interface Driver {
  id: string;
  driver_license: string;
  name: string;
  phone: string;
  email: string;
  cycle_type: '70_8' | '60_7';
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  name: string;
  driver: Driver;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  status_display: string;
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_lat?: number;
  current_lng?: number;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  current_cycle_used: number;
  total_distance?: number;
  estimated_duration?: number;
  planned_start_time?: string;
  actual_start_time?: string;
  planned_end_time?: string;
  actual_end_time?: string;
  waypoints?: TripWaypoint[];
  route_distance?: number;
  route_duration?: number;
  route_polyline?: string;
  fuel_stops_count: number;
  rest_stops_count: number;
  created_at: string;
  updated_at: string;
}

export interface TripWaypoint {
  id: string;
  waypoint_type: 'start' | 'pickup' | 'fuel' | 'rest' | 'meal' | 'daily_rest' | 'dropoff' | 'end';
  waypoint_type_display: string;
  address: string;
  latitude: number;
  longitude: number;
  sequence_order: number;
  estimated_arrival: string;
  estimated_departure?: string;
  actual_arrival?: string;
  actual_departure?: string;
  duration_minutes: number;
  notes: string;
}

export interface RouteCalculation {
  id: string;
  total_distance_miles: number;
  total_distance_km: number;
  estimated_duration_seconds: number;
  estimated_duration_hours: number;
  route_polyline: string;
  bbox_north: number;
  bbox_south: number;
  bbox_east: number;
  bbox_west: number;
  api_provider: string;
  segments: RouteSegment[];
  fuel_stops: FuelStop[];
  rest_stops: RestStop[];
  traffic_alerts: TrafficAlert[];
  created_at: string;
  updated_at: string;
}

export interface RouteSegment {
  id: string;
  sequence_order: number;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  distance_miles: number;
  duration_seconds: number;
  instruction: string;
  highway_type: string;
  road_name: string;
  speed_limit?: number;
  segment_polyline: string;
}

export interface FuelStop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_from_start: number;
  sequence_order: number;
  estimated_fuel_needed?: number;
  stop_duration_minutes: number;
  has_truck_parking: boolean;
  has_restroom: boolean;
  has_food: boolean;
  phone: string;
  website: string;
}

export interface RestStop {
  id: string;
  rest_type: 'meal_break' | 'short_rest' | 'daily_rest' | 'weekly_restart';
  rest_type_display: string;
  required_duration_minutes: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_from_start: number;
  sequence_order: number;
  hours_driven_before: number;
  hours_on_duty_before: number;
  has_truck_parking: boolean;
  has_sleeper_facilities: boolean;
  has_restroom: boolean;
  has_food: boolean;
  has_shower: boolean;
}

export interface TrafficAlert {
  id: string;
  alert_type: 'traffic_jam' | 'accident' | 'construction' | 'weather' | 'road_closure' | 'weight_restriction' | 'height_restriction';
  alert_type_display: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  severity_display: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  distance_from_start: number;
  start_time?: string;
  end_time?: string;
  estimated_delay_minutes: number;
  is_active: boolean;
  is_verified: boolean;
}

export interface ELDLog {
  id: string;
  driver: string;
  driver_name: string;
  trip?: string;
  trip_name?: string;
  log_date: string;
  vehicle_id: string;
  total_drive_hours: number;
  total_duty_hours: number;
  total_off_duty_hours: number;
  total_sleeper_hours?: number;
  has_driving_violation: boolean;
  has_duty_violation: boolean;
  violations_count: number;
  is_certified: boolean;
  certified_at?: string;
  duty_records?: DutyStatusRecord[];
  violations?: HOSViolation[];
  created_at: string;
  updated_at: string;
}

export interface DutyStatusRecord {
  id: string;
  duty_status: 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving';
  duty_status_display: string;
  start_time: string;
  end_time?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  odometer?: number;
  notes: string;
  is_automatic: boolean;
  is_edited: boolean;
  edit_reason: string;
  duration_hours?: number;
}

export interface HOSViolation {
  id: string;
  violation_type: 'drive_11h' | 'duty_14h' | 'cycle_70h' | 'cycle_60h' | 'rest_break' | 'daily_rest';
  violation_type_display: string;
  severity: 'warning' | 'violation' | 'critical';
  severity_display: string;
  description: string;
  actual_value: number;
  limit_value: number;
  violation_time: string;
  resolved: boolean;
  resolution_notes: string;
  created_at: string;
}

export interface ELDLogSheet {
  id: string;
  eld_log: ELDLog;
  grid_data: ELDGridData;
  summary_data: ELDSummaryData;
  generated_at: string;
}

export interface ELDGridData {
  intervals: ELDInterval[];
  hours: number[];
  date: string;
  time_markers: TimeMarker[];
  legend: DutyStatusLegend[];
}

export interface ELDInterval {
  index: number;
  start_time: string;
  end_time: string;
  duty_status: string;
  style: DutyStatusStyle;
  hour: number;
  quarter: number;
}

export interface TimeMarker {
  hour: number;
  time_12h: string;
  time_24h: string;
  interval_index: number;
}

export interface DutyStatusLegend {
  status: string;
  style: DutyStatusStyle;
  line_number: number;
}

export interface DutyStatusStyle {
  color: string;
  pattern: string;
  label: string;
  line: number;
}

export interface ELDSummaryData {
  driver: {
    name: string;
    license: string;
    cycle_type: string;
  };
  date: string;
  day_of_week: string;
  vehicle_id: string;
  trip?: {
    name: string;
    pickup_location: string;
    dropoff_location: string;
    total_distance?: number;
    status: string;
  };
  odometer: {
    start?: number;
    end?: number;
    miles_driven?: number;
  };
  daily_totals: {
    driving: number;
    on_duty_not_driving: number;
    total_duty: number;
    off_duty: number;
    sleeper_berth: number;
  };
  violations: HOSViolation[];
  compliance: {
    has_violations: boolean;
    is_certified: boolean;
    certified_at?: string;
  };
  remarks: string[];
  shipping_info?: {
    bill_of_lading: string;
    shipper_name: string;
    consignee_name: string;
    pickup_location: string;
    dropoff_location: string;
    pickup_time?: string;
    dropoff_time?: string;
    commodity: string;
    weight: string;
  };
}

export interface HOSStatus {
  daily_driving_used: number;
  daily_driving_available: number;
  daily_duty_used: number;
  daily_duty_available: number;
  cycle_used: number;
  cycle_available: number;
  cycle_limit: number;
  needs_break_soon: boolean;
  needs_daily_rest: boolean;
}

// Form Types
export interface TripPlanningRequest {
  driver_id: string;
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
  planned_start_time?: Date | null;
  trip_name?: string | null;
}

export interface TripPlanningResponse {
  trip_id: string;
  route_summary: any;
  fuel_stops: FuelStop[];
  rest_stops: RestStop[];
  eld_logs_preview: any[];
  hos_compliance: HOSStatus;
  estimated_completion?: string;
}

// Utility Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Map related types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapMarker {
  id: string;
  position: [number, number]; // [lat, lng]
  type: 'start' | 'pickup' | 'dropoff' | 'fuel' | 'rest' | 'alert';
  title: string;
  description?: string;
  icon?: string;
  color?: string;
}
