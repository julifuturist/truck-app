import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { format } from 'date-fns';

import { Driver, TripPlanningRequest, TripPlanningResponse } from '../../types';
import { driverAPI, tripAPI, geocodingAPI } from '../../services/api';

// Validation schema
const schema = yup.object({
  driver_id: yup.string().required('Driver is required'),
  current_location: yup.string().required('Current location is required'),
  pickup_location: yup.string().required('Pickup location is required'),
  dropoff_location: yup.string().required('Dropoff location is required'),
  current_cycle_used: yup
    .number()
    .required('Current cycle hours is required')
    .min(0, 'Cannot be negative')
    .max(70, 'Cannot exceed 70 hours'),
  trip_name: yup.string().optional().nullable(),
  planned_start_time: yup.date().optional().nullable(),
});

interface TripPlanningFormProps {
  onTripPlanned: (response: TripPlanningResponse) => void;
}

interface LocationOption {
  label: string;
  value: string;
  lat: number;
  lng: number;
}

// Debounce function moved outside component to prevent recreation
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

const TripPlanningForm: React.FC<TripPlanningFormProps> = ({ onTripPlanned }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Location autocomplete states
  const [currentLocationOptions, setCurrentLocationOptions] = useState<LocationOption[]>([]);
  const [pickupLocationOptions, setPickupLocationOptions] = useState<LocationOption[]>([]);
  const [dropoffLocationOptions, setDropoffLocationOptions] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      current_cycle_used: 0,
      planned_start_time: new Date(),
    },
  });

  const selectedDriverId = watch('driver_id');
  const selectedDriver = drivers?.find(d => d?.id === selectedDriverId);

  // Load drivers on component mount
  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const response = await driverAPI.getAll();
      setDrivers(response.data?.results || []);
    } catch (err) {
      console.error('Failed to load drivers:', err);
      setError('Failed to load drivers');
    }
  };

  // Location search function
  const searchAddresses = useCallback(async (query: string, setter: React.Dispatch<React.SetStateAction<LocationOption[]>>) => {
    if (!query || query.trim().length < 3) {
      setter([]);
      return;
    }
    
    setLocationLoading(true);
    try {
      console.log('Searching for locations:', query);
      const results = await geocodingAPI.searchAddresses(query);
      console.log('Location results:', results);
      setter(results);
      
      if (results.length === 0) {
        console.warn('No location results found for:', query);
      }
    } catch (err) {
      console.error('Location search error:', err);
      setter([]);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Create debounced version using useMemo
  const searchLocationsDebounced = useMemo(
    () => debounce(searchAddresses, 500),
    [searchAddresses]
  );

  const searchLocations = (query: string, setter: React.Dispatch<React.SetStateAction<LocationOption[]>>) => {
    searchLocationsDebounced(query, setter);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await tripAPI.planTrip(data as TripPlanningRequest);
      setSuccess('Trip planned successfully!');
      onTripPlanned(response.data);
      reset();
    } catch (err: any) {
      console.error('Trip planning error:', err);
      setError(err.response?.data?.error || 'Failed to plan trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Plan New Trip
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Driver Selection */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="driver_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.driver_id}>
                    <InputLabel>Driver</InputLabel>
                    <Select {...field} label="Driver">
                      {drivers?.map((driver: Driver) => (
                        <MenuItem key={driver.id} value={driver.id}>
                          <Box>
                            <Typography variant="body1">{driver.name}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              License: {driver.driver_license} | Cycle: {driver.cycle_type}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.driver_id && (
                      <Typography variant="caption" color="error">
                        {errors.driver_id.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Trip Name */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="trip_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Trip Name (Optional)"
                    error={!!errors.trip_name}
                    helperText={errors.trip_name?.message}
                  />
                )}
              />
            </Grid>

            {/* Current Cycle Used */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="current_cycle_used"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Current Cycle Hours Used"
                    inputProps={{ min: 0, max: 70, step: 0.1 }}
                    error={!!errors.current_cycle_used}
                    helperText={errors.current_cycle_used?.message || 'Hours used in current 7/8-day cycle'}
                  />
                )}
              />
            </Grid>

            {/* Planned Start Time */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="planned_start_time"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Planned Start Time"
                    value={field.value ? new Date(field.value) : null}
                    onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd'T'HH:mm") : null)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.planned_start_time,
                        helperText: errors.planned_start_time?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Current Location */}
            <Grid size={{ xs: 12 }}>
                              <Controller
                name="current_location"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    value={field.value || ''}
                    onChange={(_, value) => field.onChange(typeof value === 'string' ? value : value?.label || '')}
                    inputValue={field.value || ''}
                    onInputChange={(_, value, reason) => {
                      field.onChange(value);
                      if (reason === 'input') {
                        searchLocations(value, setCurrentLocationOptions);
                      }
                    }}
                    options={currentLocationOptions}
                    getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                    freeSolo
                    loading={locationLoading}
                    noOptionsText="Type at least 3 characters to search locations..."
                    loadingText="Searching locations..."
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Current Location"
                        error={!!errors.current_location}
                        helperText={errors.current_location?.message}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {locationLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            {/* Pickup Location */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="pickup_location"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    value={field.value || ''}
                    onChange={(_, value) => field.onChange(typeof value === 'string' ? value : value?.label || '')}
                    inputValue={field.value || ''}
                    onInputChange={(_, value, reason) => {
                      field.onChange(value);
                      if (reason === 'input') {
                        searchLocations(value, setPickupLocationOptions);
                      }
                    }}
                    options={pickupLocationOptions}
                    getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                    freeSolo
                    loading={locationLoading}
                    noOptionsText="Type at least 3 characters to search locations..."
                    loadingText="Searching locations..."
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Pickup Location"
                        error={!!errors.pickup_location}
                        helperText={errors.pickup_location?.message}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {locationLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            {/* Dropoff Location */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="dropoff_location"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    value={field.value || ''}
                    onChange={(_, value) => field.onChange(typeof value === 'string' ? value : value?.label || '')}
                    inputValue={field.value || ''}
                    onInputChange={(_, value, reason) => {
                      field.onChange(value);
                      if (reason === 'input') {
                        searchLocations(value, setDropoffLocationOptions);
                      }
                    }}
                    options={dropoffLocationOptions}
                    getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                    freeSolo
                    loading={locationLoading}
                    noOptionsText="Type at least 3 characters to search locations..."
                    loadingText="Searching locations..."
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Dropoff Location"
                        error={!!errors.dropoff_location}
                        helperText={errors.dropoff_location?.message}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {locationLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            {/* Driver Info Display */}
            {selectedDriver && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Driver Information
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`Name: ${selectedDriver.name}`} size="small" />
                    <Chip label={`License: ${selectedDriver.driver_license}`} size="small" />
                    <Chip 
                      label={`Cycle: ${selectedDriver.cycle_type === '70_8' ? '70 hrs/8 days' : '60 hrs/7 days'}`} 
                      size="small" 
                      color="primary"
                    />
                  </Box>
                </Box>
              </Grid>
            )}

            {/* Submit Button */}
            <Grid size={{ xs: 12 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ minWidth: 200 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Plan Trip'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TripPlanningForm;
