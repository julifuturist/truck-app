import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  Grid,
  CardContent,
  Button,
  Chip,
  Avatar,
  Alert,
} from '@mui/material';
import {
  LocalShipping,
  Assignment,
  Warning,
  CheckCircle,
  Add,
  TrendingUp,
  Schedule,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { Trip, ELDLog, HOSViolation } from '../types';
import { tripAPI, eldLogAPI, violationAPI } from '../services/api';

interface DashboardStats {
  activeTrips: number;
  completedTripsToday: number;
  pendingLogs: number;
  activeViolations: number;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [recentLogs, setRecentLogs] = useState<ELDLog[]>([]);
  const [recentViolations, setRecentViolations] = useState<HOSViolation[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeTrips: 0,
    completedTripsToday: 0,
    pendingLogs: 0,
    activeViolations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load recent data in parallel
      const [tripsResponse, logsResponse, violationsResponse] = await Promise.all([
        tripAPI.getAll({ page: 1 }),
        eldLogAPI.getAll({ page: 1 }),
        violationAPI.getAll({ page: 1 }),
      ]);

      const trips = tripsResponse.data.results || [];
      const logs = logsResponse.data.results || [];
      const violations = violationsResponse.data.results || [];

      setRecentTrips(trips.slice(0, 5));
      setRecentLogs(logs.slice(0, 5));
      setRecentViolations(violations.slice(0, 5));

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      setStats({
        activeTrips: trips.filter(t => t.status === 'in_progress').length,
        completedTripsToday: trips.filter(t => 
          t.status === 'completed' && 
          t.actual_end_time?.startsWith(today)
        ).length,
        pendingLogs: logs.filter(l => !l.is_certified).length,
        activeViolations: violations.filter(v => !v.resolved).length,
      });

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
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

  const getViolationSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning': return 'warning';
      case 'violation': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Typography>Loading dashboard...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          TruckLog Pro Dashboard
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Manage your fleet's Hours of Service compliance and trip planning
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }} 
                onClick={() => navigate('/plan-trip')}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
                <Add />
              </Avatar>
              <Typography variant="h6">Plan New Trip</Typography>
              <Typography variant="body2" color="textSecondary">
                Create route with HOS compliance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }} 
                onClick={() => navigate('/eld-logs')}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 2 }}>
                <Assignment />
              </Avatar>
              <Typography variant="h6">View ELD Logs</Typography>
              <Typography variant="body2" color="textSecondary">
                Review daily driving logs
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }} 
                onClick={() => navigate('/drivers')}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 2 }}>
                <LocalShipping />
              </Avatar>
              <Typography variant="h6">Manage Drivers</Typography>
              <Typography variant="body2" color="textSecondary">
                Driver profiles and status
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 2 }}>
                <TrendingUp />
              </Avatar>
              <Typography variant="h6">Analytics</Typography>
              <Typography variant="body2" color="textSecondary">
                Coming soon
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <LocalShipping />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.activeTrips}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Trips
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.completedTripsToday}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Completed Today
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <Schedule />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.pendingLogs}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pending Logs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                  <Warning />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.activeViolations}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    HOS Violations
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Data Sections */}
      <Grid container spacing={3}>
        {/* Recent Trips */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Recent Trips</Typography>
                <Button size="small" onClick={() => navigate('/trips')}>
                  View All
                </Button>
              </Box>
              
              {recentTrips.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No recent trips
                </Typography>
              ) : (
                recentTrips.map((trip) => (
                  <Box key={trip.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body1">
                          {trip.name || `Trip ${trip.id.slice(0, 8)}`}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {trip.driver.name} • {trip.pickup_location} → {trip.dropoff_location}
                        </Typography>
                      </Box>
                      <Chip 
                        label={trip.status_display} 
                        size="small" 
                        color={getStatusColor(trip.status) as any}
                      />
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent ELD Logs */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Recent ELD Logs</Typography>
                <Button size="small" onClick={() => navigate('/eld-logs')}>
                  View All
                </Button>
              </Box>
              
              {recentLogs.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No recent logs
                </Typography>
              ) : (
                recentLogs.map((log) => (
                  <Box key={log.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body1">
                          {log.driver_name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {log.log_date} • {log.total_drive_hours}h driving • {log.total_duty_hours}h duty
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {log.has_driving_violation && (
                          <Chip label="Violation" size="small" color="error" />
                        )}
                        {log.is_certified ? (
                          <Chip label="Certified" size="small" color="success" />
                        ) : (
                          <Chip label="Pending" size="small" color="warning" />
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Violations */}
        {recentViolations.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Recent HOS Violations</Typography>
                  <Button size="small" onClick={() => navigate('/violations')}>
                    View All
                  </Button>
                </Box>
                
                {recentViolations.map((violation) => (
                  <Alert 
                    key={violation.id} 
                    severity={getViolationSeverityColor(violation.severity) as any}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="body2">
                      <strong>{violation.violation_type_display}</strong> - {violation.description}
                    </Typography>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default HomePage;
