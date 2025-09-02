import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { format } from 'date-fns';

import { ELDLogSheet, ELDInterval, DutyStatusStyle } from '../../types';

interface ELDLogChartProps {
  logSheet: ELDLogSheet;
  showDetails?: boolean;
}

const ELDLogChart: React.FC<ELDLogChartProps> = ({ logSheet, showDetails = true }) => {
  const { grid_data, summary_data } = logSheet;

  // Grid dimensions
  const HOUR_WIDTH = 40; // Width per hour in pixels
  const CHART_HEIGHT = 160; // Height of the chart area
  const LINE_HEIGHT = 30; // Height per duty status line

  // Render the 24-hour grid chart
  const renderChart = () => {
    const chartWidth = 24 * HOUR_WIDTH;
    
    return (
      <Box sx={{ position: 'relative', width: chartWidth, height: CHART_HEIGHT, border: 1, borderColor: 'divider' }}>
        {/* Hour markers at top */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20, borderBottom: 1, borderColor: 'divider' }}>
          {Array.from({ length: 24 }, (_, hour) => (
            <Box
              key={hour}
              sx={{
                position: 'absolute',
                left: hour * HOUR_WIDTH,
                width: HOUR_WIDTH,
                height: '100%',
                borderRight: hour < 23 ? 1 : 0,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" sx={{ fontSize: '10px' }}>
                {hour === 0 ? '12a' : hour <= 12 ? `${hour}${hour === 12 ? 'p' : 'a'}` : `${hour - 12}p`}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Duty status lines */}
        <Box sx={{ position: 'absolute', top: 20, left: 0, right: 0, bottom: 0 }}>
          {/* Grid lines for each duty status */}
          {[1, 2, 3, 4].map((line) => (
            <Box
              key={line}
              sx={{
                position: 'absolute',
                top: (line - 1) * LINE_HEIGHT,
                left: 0,
                right: 0,
                height: LINE_HEIGHT,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            />
          ))}

          {/* Vertical hour lines */}
          {Array.from({ length: 25 }, (_, hour) => (
            <Box
              key={hour}
              sx={{
                position: 'absolute',
                left: hour * HOUR_WIDTH,
                top: 0,
                bottom: 0,
                width: 1,
                bgcolor: 'divider',
              }}
            />
          ))}

          {/* Duty status intervals */}
          {grid_data.intervals.map((interval) => {
            const x = (interval.hour + (interval.quarter - 1) * 0.25) * HOUR_WIDTH;
            const width = HOUR_WIDTH * 0.25; // 15-minute interval
            const y = (interval.style.line - 1) * LINE_HEIGHT + 2;
            const height = LINE_HEIGHT - 4;

            return (
              <Box
                key={interval.index}
                sx={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: width - 1,
                  height: height,
                  bgcolor: interval.style.color,
                  border: interval.style.pattern === 'diagonal' ? '1px solid #666' : 'none',
                  backgroundImage: interval.style.pattern === 'diagonal' 
                    ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' 
                    : 'none',
                }}
                title={`${interval.start_time} - ${interval.end_time}: ${interval.style.label}`}
              />
            );
          })}
        </Box>

        {/* Duty status labels on the left */}
        <Box sx={{ position: 'absolute', left: -120, top: 20, width: 110 }}>
          {grid_data.legend.map((legend) => (
            <Box
              key={legend.status}
              sx={{
                position: 'absolute',
                top: (legend.line_number - 1) * LINE_HEIGHT,
                right: 5,
                height: LINE_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <Typography variant="caption" sx={{ fontSize: '10px', textAlign: 'right' }}>
                {legend.style.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 2 }}>
      {/* Header Information */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom>
            Driver's Daily Log
          </Typography>
          <Typography variant="body2">
            <strong>Driver:</strong> {summary_data.driver.name}
          </Typography>
          <Typography variant="body2">
            <strong>License:</strong> {summary_data.driver.license}
          </Typography>
          <Typography variant="body2">
            <strong>Date:</strong> {summary_data.date} ({summary_data.day_of_week})
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="body2">
            <strong>Vehicle ID:</strong> {summary_data.vehicle_id}
          </Typography>
          <Typography variant="body2">
            <strong>Cycle Type:</strong> {summary_data.driver.cycle_type}
          </Typography>
          {summary_data.odometer.start && (
            <Typography variant="body2">
              <strong>Odometer:</strong> {summary_data.odometer.start} - {summary_data.odometer.end} 
              {summary_data.odometer.miles_driven && ` (${summary_data.odometer.miles_driven} miles)`}
            </Typography>
          )}
        </Grid>
      </Grid>

      {/* Chart Area */}
      <Box sx={{ mb: 3, overflowX: 'auto', py: 2 }}>
        <Box sx={{ minWidth: 24 * HOUR_WIDTH + 140, pl: 15 }}>
          {renderChart()}
        </Box>
      </Box>

      {/* Daily Totals */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom>
            Daily Totals
          </Typography>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="primary">
                {summary_data.daily_totals.driving.toFixed(1)}h
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Driving
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="warning.main">
                {summary_data.daily_totals.on_duty_not_driving.toFixed(1)}h
              </Typography>
              <Typography variant="body2" color="textSecondary">
                On Duty (Not Driving)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="info.main">
                {summary_data.daily_totals.total_duty.toFixed(1)}h
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Duty
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="success.main">
                {summary_data.daily_totals.off_duty.toFixed(1)}h
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Off Duty
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {showDetails && (
        <>
          {/* Trip Information */}
          {summary_data.trip && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Trip Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">
                    <strong>Trip:</strong> {summary_data.trip.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>From:</strong> {summary_data.trip.pickup_location}
                  </Typography>
                  <Typography variant="body2">
                    <strong>To:</strong> {summary_data.trip.dropoff_location}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">
                    <strong>Status:</strong> {summary_data.trip.status}
                  </Typography>
                  {summary_data.trip.total_distance && (
                    <Typography variant="body2">
                      <strong>Distance:</strong> {summary_data.trip.total_distance.toFixed(1)} miles
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Violations */}
          {summary_data.violations && summary_data.violations.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom color="error">
                HOS Violations
              </Typography>
              {summary_data.violations.map((violation, index) => (
                <Chip
                  key={index}
                  label={`${violation.violation_type_display}: ${violation.description}`}
                  color="error"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          )}

          {/* Remarks */}
          {summary_data.remarks && summary_data.remarks.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Remarks
              </Typography>
              <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                {summary_data.remarks.map((remark, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                    • {remark}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          {/* Certification Status */}
          <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2">
                  <strong>Certification Status:</strong>
                </Typography>
                {summary_data.compliance.is_certified ? (
                  <Chip label="Certified" color="success" size="small" />
                ) : (
                  <Chip label="Pending Certification" color="warning" size="small" />
                )}
              </Box>
              {summary_data.compliance.certified_at && (
                <Typography variant="caption" color="textSecondary">
                  Certified: {format(new Date(summary_data.compliance.certified_at), 'MMM dd, yyyy HH:mm')}
                </Typography>
              )}
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default ELDLogChart;
