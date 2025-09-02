import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  LocalGasStation,
  Hotel,
  Route,
  Schedule,
  Navigation,
  PlayArrow,
  Stop,
  CheckCircle,
  Warning,
  Info,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import { Trip, RouteCalculation, FuelStop, RestStop, ELDLog, ELDLogSheet } from '../types';
import { tripAPI, eldLogAPI } from '../services/api';
import RouteMap from '../components/maps/RouteMap';
import ELDLogChart from '../components/eld/ELDLogChart';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TripDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [route, setRoute] = useState<RouteCalculation | null>(null);
  const [eldLogs, setEldLogs] = useState<ELDLog[]>([]);
  const [logSheets, setLogSheets] = useState<{[key: string]: ELDLogSheet}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadTripDetails();
    }
  }, [id]);

  const loadTripDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load trip details
      const tripResponse = await tripAPI.getById(id!);
      setTrip(tripResponse.data);

      // Load route details
      try {
        const routeResponse = await tripAPI.getRouteDetails(id!);
        setRoute(routeResponse.data);
      } catch (routeError) {
        console.warn('Route details not available:', routeError);
      }

      // Load ELD logs
      try {
        const eldResponse = await eldLogAPI.getAll({});
        const filteredLogs = eldResponse.data.results?.filter(log => log.trip === id) || [];
        setEldLogs(filteredLogs);
        
        // Try to load log sheets for each ELD log
        const sheets: {[key: string]: ELDLogSheet} = {};
        for (const log of filteredLogs) {
          try {
            const sheetResponse = await eldLogAPI.getLogSheet(log.id);
            sheets[log.id] = sheetResponse.data;
          } catch (sheetError) {
            console.warn(`Log sheet not available for log ${log.id}:`, sheetError);
          }
        }
        setLogSheets(sheets);
      } catch (eldError) {
        console.warn('ELD logs not available:', eldError);
      }

    } catch (err: any) {
      console.error('Failed to load trip details:', err);
      setError(err.response?.data?.error || 'Failed to load trip details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    try {
      setActionLoading(true);
      await tripAPI.startTrip(id!);
      await loadTripDetails(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start trip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    try {
      setActionLoading(true);
      await tripAPI.completeTrip(id!);
      await loadTripDetails(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete trip');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'info';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned': return <Schedule />;
      case 'in_progress': return <Navigation />;
      case 'completed': return <CheckCircle />;
      case 'cancelled': return <Stop />;
      default: return <Info />;
    }
  };

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDistance = (miles: number): string => {
    return `${miles.toFixed(1)} miles`;
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !trip) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || 'Trip not found'}
        </Alert>
        <Button onClick={() => navigate('/trips')} sx={{ mt: 2 }}>
          Back to Trips
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {trip.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                icon={getStatusIcon(trip.status)}
                label={trip.status.replace('_', ' ').toUpperCase()}
                color={getStatusColor(trip.status) as any}
              />
              <Typography variant="body2" color="textSecondary">
                Driver: {trip.driver?.name || 'Unknown'}
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" gap={1}>
            {trip.status === 'planned' && (
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handleStartTrip}
                disabled={actionLoading}
              >
                Start Trip
              </Button>
            )}
            {trip.status === 'in_progress' && (
              <Button
                variant="contained"
                startIcon={<CheckCircle />}
                onClick={handleCompleteTrip}
                disabled={actionLoading}
              >
                Complete Trip
              </Button>
            )}
            <Button 
              variant="outlined" 
              onClick={() => navigate('/trips')}
            >
              Back to Trips
            </Button>
          </Box>
        </Box>

        {/* Trip Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {route ? formatDistance(route.total_distance_miles || 0) : 'N/A'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Distance
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {route ? formatDuration(route.estimated_duration_hours || 0) : 'N/A'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Est. Duration
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {trip.current_cycle_used.toFixed(1)}h
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Cycle Hours Used
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {eldLogs.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  ELD Log Days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="Route & Map" />
          <Tab label="ELD Logs" />
        </Tabs>

        {/* Tab 1: Overview */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Trip Information */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Trip Information
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Current Location</Typography>
                    <Typography variant="body1">{trip.current_location}</Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Pickup Location</Typography>
                    <Typography variant="body1">{trip.pickup_location}</Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Dropoff Location</Typography>
                    <Typography variant="body1">{trip.dropoff_location}</Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Planned Start</Typography>
                    <Typography variant="body1">
                      {trip.planned_start_time 
                        ? format(new Date(trip.planned_start_time), 'PPpp')
                        : 'Not set'
                      }
                    </Typography>
                  </Box>

                  {trip.actual_start_time && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">Actual Start</Typography>
                      <Typography variant="body1">
                        {format(new Date(trip.actual_start_time), 'PPpp')}
                      </Typography>
                    </Box>
                  )}

                  {trip.planned_end_time && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">Planned End</Typography>
                      <Typography variant="body1">
                        {format(new Date(trip.planned_end_time), 'PPpp')}
                      </Typography>
                    </Box>
                  )}

                  {trip.actual_end_time && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">Actual End</Typography>
                      <Typography variant="body1">
                        {format(new Date(trip.actual_end_time), 'PPpp')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Driver Information */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Driver Information
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Name</Typography>
                    <Typography variant="body1">{trip.driver?.name || 'Unknown'}</Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Current Cycle Hours</Typography>
                    <Typography variant="body1">
                      {trip.current_cycle_used.toFixed(1)} / 70 hours
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Created</Typography>
                    <Typography variant="body1">
                      {format(new Date(trip.created_at), 'PPpp')}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Last Updated</Typography>
                    <Typography variant="body1">
                      {format(new Date(trip.updated_at), 'PPpp')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: Route & Map */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {route ? (
              <>
                {/* Route Map */}
                <Grid size={{ xs: 12 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Route Map
                      </Typography>
                      <RouteMap
                        route={route}
                        fuelStops={route.fuel_stops || []}
                        restStops={route.rest_stops || []}
                        trafficAlerts={route.traffic_alerts || []}
                        height={400}
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* Fuel Stops */}
                {route.fuel_stops && route.fuel_stops.length > 0 && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <LocalGasStation sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Fuel Stops ({route.fuel_stops.length})
                        </Typography>
                        
                        <List dense>
                          {route.fuel_stops.map((stop: FuelStop) => (
                            <ListItem key={stop.id} divider>
                              <ListItemIcon>
                                <LocalGasStation fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={stop.name}
                                secondary={`Mile ${stop.distance_from_start.toFixed(0)} • ${stop.address}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Rest Stops */}
                {route.rest_stops && route.rest_stops.length > 0 && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <Hotel sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Required Rest Stops ({route.rest_stops.length})
                        </Typography>
                        
                        <List dense>
                          {route.rest_stops.map((stop: RestStop) => (
                            <ListItem key={stop.id} divider>
                              <ListItemIcon>
                                <Hotel fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={stop.rest_type_display}
                                secondary={
                                  `Mile ${stop.distance_from_start.toFixed(0)} • ` +
                                  `${stop.required_duration_minutes}min • ` +
                                  `After ${stop.hours_driven_before.toFixed(1)}h driving`
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            ) : (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info">
                  Route information is not available for this trip.
                </Alert>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Tab 3: ELD Logs */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {eldLogs.length > 0 ? (
              eldLogs.map((log) => (
                <Grid size={{ xs: 12 }} key={log.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                          ELD Log - {format(new Date(log.log_date), 'PP')}
                        </Typography>
                        <Box display="flex" gap={1}>
                          {log.is_certified ? (
                            <Chip icon={<CheckCircle />} label="Certified" color="success" size="small" />
                          ) : (
                            <Chip icon={<Warning />} label="Not Certified" color="warning" size="small" />
                          )}
                          <Button
                            size="small"
                            onClick={() => navigate(`/eld-logs/${log.id}`)}
                          >
                            View Details
                          </Button>
                        </Box>
                      </Box>
                      
                      {logSheets[log.id] ? (
                        <ELDLogChart logSheet={logSheets[log.id]} showDetails={false} />
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          ELD chart visualization for {format(new Date(log.log_date), 'PP')} - Log sheet not available
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info">
                  No ELD logs available for this trip.
                </Alert>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default TripDetailsPage;