import axios, { AxiosResponse } from 'axios';
import {
  Driver,
  Trip,
  ELDLog,
  HOSStatus,
  TripPlanningRequest,
  TripPlanningResponse,
  ELDLogSheet,
  DutyStatusRecord,
  HOSViolation,
  RouteCalculation,
  PaginatedResponse,
  ApiResponse
} from '../types';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens (when implemented)
api.interceptors.request.use(
  (config) => {
    // Add auth token here when authentication is implemented
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      // Handle unauthorized access
      // Redirect to login page
    }
    return Promise.reject(error);
  }
);

// Driver API
export const driverAPI = {
  getAll: (): Promise<AxiosResponse<PaginatedResponse<Driver>>> => 
    api.get('/drivers/'),
  
  getById: (id: string): Promise<AxiosResponse<Driver>> => 
    api.get(`/drivers/${id}/`),
  
  create: (data: Partial<Driver>): Promise<AxiosResponse<Driver>> => 
    api.post('/drivers/', data),
  
  update: (id: string, data: Partial<Driver>): Promise<AxiosResponse<Driver>> => 
    api.patch(`/drivers/${id}/`, data),
  
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/drivers/${id}/`),
  
  search: (query: string): Promise<AxiosResponse<Driver[]>> => 
    api.get('/drivers/', { params: { search: query } }),
  
  getHOSStatus: (id: string): Promise<AxiosResponse<HOSStatus>> => 
    api.get(`/drivers/${id}/hos-status/`),
  
  getELDLogs: (id: string, days: number = 30): Promise<AxiosResponse<ELDLog[]>> => 
    api.get(`/drivers/${id}/logs/`, { params: { days } }),
};

// Trip API
export const tripAPI = {
  getAll: (params?: {
    driver?: string;
    status?: string;
    page?: number;
  }): Promise<AxiosResponse<PaginatedResponse<Trip>>> => 
    api.get('/trips/', { params }),
  
  getById: (id: string): Promise<AxiosResponse<Trip>> => 
    api.get(`/trips/${id}/`),
  
  create: (data: Partial<Trip>): Promise<AxiosResponse<Trip>> => 
    api.post('/trips/', data),
  
  update: (id: string, data: Partial<Trip>): Promise<AxiosResponse<Trip>> => 
    api.patch(`/trips/${id}/`, data),
  
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/trips/${id}/`),
  
  planTrip: (data: TripPlanningRequest): Promise<AxiosResponse<TripPlanningResponse>> => 
    api.post('/trips/plan_trip/', data),
  
  startTrip: (id: string): Promise<AxiosResponse<Trip>> => 
    api.post(`/trips/${id}/start_trip/`),
  
  completeTrip: (id: string): Promise<AxiosResponse<Trip>> => 
    api.post(`/trips/${id}/complete_trip/`),
  
  getRouteDetails: (id: string): Promise<AxiosResponse<RouteCalculation>> => 
    api.get(`/trips/${id}/route_details/`),
};

// ELD Log API
export const eldLogAPI = {
  getAll: (params?: {
    driver?: string;
    date_from?: string;
    date_to?: string;
    has_violations?: boolean;
    page?: number;
  }): Promise<AxiosResponse<PaginatedResponse<ELDLog>>> => 
    api.get('/eld-logs/', { params }),
  
  getById: (id: string): Promise<AxiosResponse<ELDLog>> => 
    api.get(`/eld-logs/${id}/`),
  
  create: (data: Partial<ELDLog>): Promise<AxiosResponse<ELDLog>> => 
    api.post('/eld-logs/', data),
  
  update: (id: string, data: Partial<ELDLog>): Promise<AxiosResponse<ELDLog>> => 
    api.patch(`/eld-logs/${id}/`, data),
  
  certify: (id: string): Promise<AxiosResponse<ELDLog>> => 
    api.post(`/eld-logs/${id}/certify/`),
  
  generateLogSheet: (id: string): Promise<AxiosResponse<ELDLogSheet>> => 
    api.get(`/eld-logs/${id}/generate_log_sheet/`),
  
  getLogSheet: (id: string): Promise<AxiosResponse<ELDLogSheet>> => 
    api.get(`/logs/${id}/sheet/`),
  
  downloadLogSheet: (id: string): Promise<AxiosResponse<Blob>> => 
    api.get(`/eld-logs/${id}/download/`, { 
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    }),
  
  addDutyRecord: (
    id: string, 
    data: Partial<DutyStatusRecord>
  ): Promise<AxiosResponse<DutyStatusRecord>> => 
    api.post(`/eld-logs/${id}/add_duty_record/`, data),
};

// Duty Status Record API
export const dutyRecordAPI = {
  getAll: (params?: {
    eld_log?: string;
    duty_status?: string;
  }): Promise<AxiosResponse<DutyStatusRecord[]>> => 
    api.get('/duty-records/', { params }),
  
  getById: (id: string): Promise<AxiosResponse<DutyStatusRecord>> => 
    api.get(`/duty-records/${id}/`),
  
  create: (data: Partial<DutyStatusRecord>): Promise<AxiosResponse<DutyStatusRecord>> => 
    api.post('/duty-records/', data),
  
  update: (id: string, data: Partial<DutyStatusRecord>): Promise<AxiosResponse<DutyStatusRecord>> => 
    api.patch(`/duty-records/${id}/`, data),
  
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/duty-records/${id}/`),
};

// HOS Violation API
export const violationAPI = {
  getAll: (params?: {
    driver?: string;
    type?: string;
    severity?: string;
    resolved?: boolean;
  }): Promise<AxiosResponse<HOSViolation[]>> => 
    api.get('/violations/', { params }),
  
  getById: (id: string): Promise<AxiosResponse<HOSViolation>> => 
    api.get(`/violations/${id}/`),
  
  resolve: (id: string, resolution_notes: string): Promise<AxiosResponse<HOSViolation>> => 
    api.post(`/violations/${id}/resolve/`, { resolution_notes }),
};

// Geocoding API (for address search)
export const geocodingAPI = {
  searchAddresses: async (query: string): Promise<any[]> => {
    try {
      if (!query || query.trim().length < 3) {
        return [];
      }

      console.log('Searching for:', query); // Debug log
      
      // Using Nominatim (OpenStreetMap) for free geocoding
      // Adding US bias and proper headers
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search`, {
          params: {
            format: 'json',
            q: query.trim(),
            limit: 8,
            countrycodes: 'us,ca', // Focus on US and Canada for trucking
            addressdetails: 1,
            extratags: 1,
          },
          headers: {
            'User-Agent': 'TruckLogApp/1.0',
          },
          timeout: 5000,
        }
      );
      
      console.log('Nominatim response:', response.data); // Debug log
      
      const results = response.data.map((result: any) => ({
        label: result.display_name,
        value: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        type: result.type || 'location',
        address: result.address || {},
      }));

      // If no results, try a simpler search
      if (results.length === 0 && query.includes(',')) {
        const simpleQuery = query.split(',')[0].trim();
        console.log('Trying simpler query:', simpleQuery);
        
        const fallbackResponse = await axios.get(
          `https://nominatim.openstreetmap.org/search`, {
            params: {
              format: 'json',
              q: simpleQuery,
              limit: 5,
              countrycodes: 'us,ca',
            },
            headers: {
              'User-Agent': 'TruckLogApp/1.0',
            },
            timeout: 5000,
          }
        );

        return fallbackResponse.data.map((result: any) => ({
          label: result.display_name,
          value: result.display_name,
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          type: result.type || 'location',
        }));
      }

      return results;
    } catch (error) {
      console.error('Geocoding error:', error);
      
      // Provide some common fallback locations for testing
      if (query.toLowerCase().includes('chicago')) {
        return [{
          label: 'Chicago, IL, United States',
          value: 'Chicago, IL, United States',
          lat: 41.8781,
          lng: -87.6298,
          type: 'city'
        }];
      }
      
      if (query.toLowerCase().includes('denver')) {
        return [{
          label: 'Denver, CO, United States',
          value: 'Denver, CO, United States',
          lat: 39.7392,
          lng: -104.9903,
          type: 'city'
        }];
      }

      return [];
    }
  },
};

// Utility functions for error handling
export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const formatApiError = (error: any): ApiResponse<null> => {
  return {
    data: null,
    error: handleApiError(error),
  };
};

// Export the main API instance for custom requests
export default api;
