import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import {
  LocalGasStation,
  Hotel,
  Schedule,
  Route,
  Warning,
  CheckCircle,
  Navigation,
} from '@mui/icons-material';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import { styled } from '@mui/material/styles';

import { useNavigate } from 'react-router-dom';

import TripPlanningForm from '../components/forms/TripPlanningForm';
import { TripPlanningResponse, FuelStop, RestStop } from '../types';

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));


const TripPlanningPage: React.FC = () => {
  const navigate = useNavigate();
  const [tripResponse, setTripResponse] = useState<TripPlanningResponse | null>(null);

  const handleTripPlanned = (response: TripPlanningResponse) => {
    setTripResponse(response);
  };

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDistance = (miles: number): string => {
    return `${miles.toFixed(1)} miles`;
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Trip Planning
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Plan compliant routes with automatic HOS scheduling and ELD log generation
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Trip Planning Form */}
        <Grid size={{ xs: 12, lg: tripResponse ? 6 : 12}}>
          <Item>
          <TripPlanningForm onTripPlanned={handleTripPlanned} />
          </Item>
        </Grid>

        {/* Trip Planning Results */}
        {tripResponse && (
          <Grid size={{ xs: 12, lg: 6}}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Trip Plan Results
                </Typography>

                {/* Route Summary */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    <Route sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Route Summary
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h6" color="primary">
                            {formatDistance(tripResponse.route_summary.total_distance_miles || 0)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Total Distance
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h6" color="primary">
                            {formatDuration(tripResponse.route_summary.estimated_duration_hours || 0)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Estimated Duration
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* HOS Compliance Status */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                    HOS Compliance
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          Daily Driving Available:
                        </Typography>
                        <Chip 
                          label={`${tripResponse.hos_compliance.daily_driving_available.toFixed(1)}h`}
                          size="small"
                          color={tripResponse.hos_compliance.daily_driving_available > 5 ? 'success' : 'warning'}
                        />
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          Cycle Available:
                        </Typography>
                        <Chip 
                          label={`${tripResponse.hos_compliance.cycle_available.toFixed(1)}h`}
                          size="small"
                          color={tripResponse.hos_compliance.cycle_available > 20 ? 'success' : 'warning'}
                        />
                      </Box>
                    </Grid>
                  </Grid>

                  {tripResponse.hos_compliance.needs_break_soon && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        Driver will need a 30-minute break soon (after 8 hours of driving)
                      </Typography>
                    </Alert>
                  )}

                  {tripResponse.hos_compliance.needs_daily_rest && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        Driver needs 10-hour daily rest period before continuing
                      </Typography>
                    </Alert>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Fuel Stops */}
                {tripResponse.fuel_stops && tripResponse.fuel_stops.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      <LocalGasStation sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Fuel Stops ({tripResponse.fuel_stops.length})
                    </Typography>
                    
                    <List dense>
                      {tripResponse.fuel_stops.slice(0, 3).map((stop: FuelStop) => (
                        <ListItem key={stop.id}>
                          <ListItemIcon>
                            <LocalGasStation fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={stop.name}
                            secondary={`Mile ${stop.distance_from_start.toFixed(0)} • ${stop.address}`}
                          />
                        </ListItem>
                      ))}
                      {tripResponse.fuel_stops.length > 3 && (
                        <ListItem>
                          <ListItemText
                            primary={`... and ${tripResponse.fuel_stops.length - 3} more stops`}
                            sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                )}

                {/* Rest Stops */}
                {tripResponse.rest_stops && tripResponse.rest_stops.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      <Hotel sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Required Rest Stops ({tripResponse.rest_stops.length})
                    </Typography>
                    
                    <List dense>
                      {tripResponse.rest_stops.slice(0, 3).map((stop: RestStop) => (
                        <ListItem key={stop.id}>
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
                      {tripResponse.rest_stops.length > 3 && (
                        <ListItem>
                          <ListItemText
                            primary={`... and ${tripResponse.rest_stops.length - 3} more stops`}
                            sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* ELD Logs Preview */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    ELD Logs Preview
                  </Typography>
                  
                  {tripResponse.eld_logs_preview && tripResponse.eld_logs_preview.length > 0 ? (
                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {tripResponse.eld_logs_preview.length} log sheets will be generated for this trip
                      </Typography>
                      
                      {tripResponse.eld_logs_preview.slice(0, 2).map((log: any, index: number) => (
                        <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                          <CardContent sx={{ py: 1 }}>
                            <Typography variant="body2">
                              <strong>Day {index + 1}:</strong> {log.date}
                            </Typography>
                            {log.summary && (
                              <Typography variant="caption" color="textSecondary">
                                Estimated driving: {log.summary.daily_totals?.driving || 0}h
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No ELD logs preview available
                    </Typography>
                  )}
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<Navigation />}
                    onClick={() => navigate(`/trips/${tripResponse.trip_id}`)}
                  >
                    View Trip Details
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setTripResponse(null)}
                  >
                    Plan Another Trip
                  </Button>
                </Box>

                {/* Success Message */}
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Trip planned successfully! The route includes all required fuel stops and 
                    HOS-compliant rest periods. ELD logs have been pre-generated for driver compliance.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default TripPlanningPage;
