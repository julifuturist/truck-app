import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Schedule,
  Person,
  DirectionsCar,
  Download,
  Verified,
  Assignment,
  Route as RouteIcon,
  Speed,
  AccessTime,
  Restaurant,
  Hotel,
  ArrowBack,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

import { eldLogAPI, handleApiError } from '../services/api';
import { ELDLog, ELDLogSheet } from '../types';
import ELDLogChart from '../components/eld/ELDLogChart';

const ELDLogDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<ELDLog | null>(null);
  const [logSheet, setLogSheet] = useState<ELDLogSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certifyLoading, setCertifyLoading] = useState(false);
  const [certifyDialog, setCertifyDialog] = useState(false);
  const [logSheetLoading, setLogSheetLoading] = useState(false);

  const fetchLogDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch ELD log details
      const logResponse = await eldLogAPI.getById(id!);
      setLog(logResponse.data);
      
      // Try to fetch log sheet
      try {
        const sheetResponse = await eldLogAPI.getLogSheet(id!);
        setLogSheet(sheetResponse.data);
      } catch (sheetError) {
        console.warn('Could not fetch log sheet:', sheetError);
      }
    } catch (error: any) {
      console.error('Error fetching ELD log details:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchLogDetails();
    }
  }, [id, fetchLogDetails]);

  const handleCertifyLog = async () => {
    if (!log) return;
    
    setCertifyLoading(true);
    try {
      const response = await eldLogAPI.certify(log.id);
      setLog(response.data);
      setCertifyDialog(false);
    } catch (error: any) {
      setError(handleApiError(error));
    } finally {
      setCertifyLoading(false);
    }
  };

  const generateLogSheet = async () => {
    if (!log) return;
    
    setLogSheetLoading(true);
    try {
      const response = await eldLogAPI.generateLogSheet(log.id);
      setLogSheet(response.data);
    } catch (error: any) {
      setError(handleApiError(error));
    } finally {
      setLogSheetLoading(false);
    }
  };

  const getViolationSeverityColor = (severity: string): 'error' | 'warning' | 'info' => {
    switch (severity) {
      case 'critical': return 'error';
      case 'violation': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const getDutyStatusIcon = (status: string) => {
    switch (status) {
      case 'driving': return <Speed color="primary" />;
      case 'on_duty_not_driving': return <AccessTime color="warning" />;
      case 'off_duty': return <Restaurant color="success" />;
      case 'sleeper_berth': return <Hotel color="info" />;
      default: return <Schedule />;
    }
  };

  const getDutyStatusColor = (status: string): 'primary' | 'warning' | 'success' | 'info' | 'default' => {
    switch (status) {
      case 'driving': return 'primary';
      case 'on_duty_not_driving': return 'warning';
      case 'off_duty': return 'success';
      case 'sleeper_berth': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/eld-logs')} sx={{ mt: 2 }}>
          Back to ELD Logs
        </Button>
      </Container>
    );
  }

  if (!log) {
    return (
      <Container maxWidth="xl">
        <Alert severity="warning" sx={{ mt: 2 }}>
          ELD log not found
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/eld-logs')} sx={{ mt: 2 }}>
          Back to ELD Logs
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <IconButton onClick={() => navigate('/eld-logs')}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h4">
                ELD Log Details
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="h6" color="primary">
                {format(parseISO(log.log_date), 'PPPP')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Driver: {log.driver_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Vehicle: {log.vehicle_id}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!log.is_certified && (
              <Button
                variant="contained"
                startIcon={<Verified />}
                onClick={() => setCertifyDialog(true)}
                color="success"
              >
                Certify Log
              </Button>
            )}
            {!logSheet && (
              <Button
                variant="outlined"
                startIcon={logSheetLoading ? <CircularProgress size={16} /> : <Assignment />}
                onClick={generateLogSheet}
                disabled={logSheetLoading}
              >
                Generate Log Sheet
              </Button>
            )}
            {logSheet && (
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={async () => {
                  try {
                    const response = await eldLogAPI.downloadLogSheet(log.id);
                    
                    // Create a blob URL and trigger download
                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `eld-log-${log.driver_name}-${format(parseISO(log.log_date), 'yyyy-MM-dd')}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (error: any) {
                    setError('Failed to download log sheet');
                  }
                }}
              >
                Download PDF
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Log Summary */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Summary
              </Typography>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary.main">
                      {log.total_drive_hours.toFixed(1)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Drive Hours
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {log.total_duty_hours.toFixed(1)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Duty Hours
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {log.total_off_duty_hours.toFixed(1)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Off Duty Hours
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {log.total_sleeper_hours?.toFixed(1) || '0.0'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Sleeper Hours
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Person sx={{ mr: 2, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Driver
                      </Typography>
                      <Typography variant="body1">
                        {log.driver_name}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DirectionsCar sx={{ mr: 2, color: 'info.main' }} />
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Vehicle ID
                      </Typography>
                      <Typography variant="body1">
                        {log.vehicle_id}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                {log.trip_name && (
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <RouteIcon sx={{ mr: 2, color: 'success.main' }} />
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Trip
                        </Typography>
                        <Typography variant="body1">
                          {log.trip_name}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Status & Compliance */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status & Compliance
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Compliance Status
                </Typography>
                {(log.has_driving_violation || log.has_duty_violation) ? (
                  <Chip
                    icon={<Warning />}
                    label={`${log.violations_count} Violations`}
                    color="error"
                    sx={{ mb: 2 }}
                  />
                ) : (
                  <Chip
                    icon={<CheckCircle />}
                    label="Compliant"
                    color="success"
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                )}
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Certification Status
                </Typography>
                {log.is_certified ? (
                  <Box>
                    <Chip
                      icon={<CheckCircle />}
                      label="Certified"
                      color="success"
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                    {log.certified_at && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        Certified: {format(parseISO(log.certified_at), 'PPpp')}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Chip
                    icon={<Schedule />}
                    label="Pending Certification"
                    color="warning"
                  />
                )}
              </Box>
              
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Log Created
                </Typography>
                <Typography variant="body2">
                  {formatDistanceToNow(parseISO(log.created_at))} ago
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {format(parseISO(log.created_at), 'PPpp')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ELD Log Sheet Chart */}
        {logSheet && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ELD Log Sheet
                </Typography>
                <ELDLogChart logSheet={logSheet} showDetails={true} />
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Duty Status Records */}
        {log.duty_records && log.duty_records.length > 0 && (
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Duty Status Records
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>End Time</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {log.duty_records
                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                        .map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getDutyStatusIcon(record.duty_status)}
                                <Chip
                                  label={record.duty_status_display}
                                  color={getDutyStatusColor(record.duty_status)}
                                  size="small"
                                  variant="outlined"
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {format(parseISO(record.start_time), 'HH:mm')}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {format(parseISO(record.start_time), 'MMM dd')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {record.end_time ? (
                                <Box>
                                  <Typography variant="body2">
                                    {format(parseISO(record.end_time), 'HH:mm')}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {format(parseISO(record.end_time), 'MMM dd')}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="textSecondary">
                                  Ongoing
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {record.duration_hours?.toFixed(1) || '-'} hours
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {record.location}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {record.notes || '-'}
                              </Typography>
                              {record.is_edited && (
                                <Chip
                                  label="Edited"
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Violations */}
        {log.violations && log.violations.length > 0 && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  HOS Violations
                </Typography>
                <List>
                  {log.violations.map((violation) => (
                    <ListItem key={violation.id} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: getViolationSeverityColor(violation.severity) + '.main' }}>
                          <Warning />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={violation.violation_type_display}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {violation.description}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {format(parseISO(violation.violation_time), 'PPpp')}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Chip
                                label={violation.severity_display}
                                size="small"
                                color={getViolationSeverityColor(violation.severity)}
                                variant="outlined"
                              />
                              {violation.resolved && (
                                <Chip
                                  label="Resolved"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Certification Dialog */}
      <Dialog open={certifyDialog} onClose={() => setCertifyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Certify ELD Log</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to certify this ELD log? This action will mark the log as certified and cannot be undone.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            By certifying this log, you confirm that all duty status records are accurate and complete.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertifyDialog(false)} disabled={certifyLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleCertifyLog}
            variant="contained"
            color="success"
            disabled={certifyLoading}
            startIcon={certifyLoading ? <CircularProgress size={16} /> : <Verified />}
          >
            Certify Log
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ELDLogDetailsPage;
