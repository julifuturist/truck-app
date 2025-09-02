import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import {
  FilterList,
  Refresh,
  Download,
  Visibility,
  Warning,
  CheckCircle,
  Schedule,
  Person,
  DirectionsCar,
  ExpandMore,
  Add,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";

import { eldLogAPI, driverAPI, handleApiError } from "../services/api";
import { ELDLog, Driver, PaginatedResponse } from "../types";

interface ELDLogFilters {
  driver?: string;
  date_from?: string;
  date_to?: string;
  has_violations?: boolean;
  is_certified?: boolean;
}

const ELDLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ELDLog[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ELDLogFilters>({});
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [violationsOnly, setViolationsOnly] = useState<boolean | undefined>(
    undefined
  );

  const fetchDrivers = useCallback(async () => {
    try {
      const response = await driverAPI.getAll();
      setDrivers(response.data.results);
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page + 1, // API uses 1-based pagination
        ...filters,
      };

      const response = await eldLogAPI.getAll(params);
      const data = response.data as PaginatedResponse<ELDLog>;

      setLogs(data.results);
      setTotalCount(data.count);
    } catch (error: any) {
      console.error("Error fetching ELD logs:", error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchDrivers();
    fetchLogs();
  }, [fetchDrivers, fetchLogs]);

  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, filters, fetchLogs]);

  const applyFilters = () => {
    const newFilters: ELDLogFilters = {};

    if (selectedDriver) {
      newFilters.driver = selectedDriver.id;
    }

    if (dateFrom) {
      newFilters.date_from = format(startOfDay(dateFrom), "yyyy-MM-dd");
    }

    if (dateTo) {
      newFilters.date_to = format(endOfDay(dateTo), "yyyy-MM-dd");
    }

    if (violationsOnly !== undefined) {
      newFilters.has_violations = violationsOnly;
    }

    setFilters(newFilters);
    setPage(0); // Reset to first page when filters change
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setSelectedDriver(null);
    setDateFrom(null);
    setDateTo(null);
    setViolationsOnly(undefined);
    setFilters({});
    setPage(0);
    setFiltersOpen(false);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getViolationChip = (log: ELDLog) => {
    if (log.has_driving_violation || log.has_duty_violation) {
      return (
        <Chip
          icon={<Warning />}
          label={`${log.violations_count} violations`}
          color="error"
          size="small"
        />
      );
    }
    return (
      <Chip
        icon={<CheckCircle />}
        label="Compliant"
        color="success"
        size="small"
        variant="outlined"
      />
    );
  };

  const getCertificationChip = (log: ELDLog) => {
    if (log.is_certified) {
      return (
        <Chip
          icon={<CheckCircle />}
          label="Certified"
          color="success"
          size="small"
          variant="outlined"
        />
      );
    }
    return (
      <Chip icon={<Schedule />} label="Pending" color="warning" size="small" />
    );
  };

  const activeFiltersCount = Object.keys(filters).length;

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>
              ELD Logs
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Electronic Logging Device compliance logs
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setFiltersOpen(!filtersOpen)}
              color={activeFiltersCount > 0 ? "primary" : "inherit"}
            >
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchLogs}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate("/eld-logs/new")}
            >
              New Log
            </Button>
          </Box>
        </Box>

        {/* Summary Stats */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Schedule sx={{ mr: 2, color: "primary.main" }} />
                  <Box>
                    <Typography variant="h6">{totalCount}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Logs
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Warning sx={{ mr: 2, color: "warning.main" }} />
                  <Box>
                    <Typography variant="h6">
                      {
                        logs.filter(
                          (log) =>
                            log.has_driving_violation || log.has_duty_violation
                        ).length
                      }
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      With Violations
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CheckCircle sx={{ mr: 2, color: "success.main" }} />
                  <Box>
                    <Typography variant="h6">
                      {logs.filter((log) => log.is_certified).length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Certified
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Person sx={{ mr: 2, color: "info.main" }} />
                  <Box>
                    <Typography variant="h6">{drivers.length}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Drivers
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Filters */}
      <Accordion
        expanded={filtersOpen}
        onChange={() => setFiltersOpen(!filtersOpen)}
        sx={{ mb: 3 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Filter Logs</Typography>
          {activeFiltersCount > 0 && (
            <Chip
              label={`${activeFiltersCount} active`}
              size="small"
              color="primary"
              sx={{ ml: 2 }}
            />
          )}
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Autocomplete
                options={drivers}
                getOptionLabel={(option) => option.name}
                value={selectedDriver}
                onChange={(event, newValue) => setSelectedDriver(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Driver" variant="outlined" />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <DatePicker
                label="From Date"
                value={dateFrom}
                onChange={(newValue) => setDateFrom(newValue)}
                slotProps={{
                  textField: {
                    variant: "outlined",
                    fullWidth: true,
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <DatePicker
                label="To Date"
                value={dateTo}
                onChange={(newValue) => setDateTo(newValue)}
                slotProps={{
                  textField: {
                    variant: "outlined",
                    fullWidth: true,
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Violations</InputLabel>
                <Select
                  value={violationsOnly || ""}
                  onChange={(e) =>
                    setViolationsOnly(
                      e.target.value === "true"
                        ? true
                        : e.target.value === "false"
                        ? false
                        : undefined
                    )
                  }
                  label="Violations"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">With Violations</MenuItem>
                  <MenuItem value="false">No Violations</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={applyFilters} fullWidth>
                  Apply
                </Button>
                <Button variant="outlined" onClick={clearFilters} fullWidth>
                  Clear
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Logs Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Driver</TableCell>
                <TableCell>Trip</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Drive Hours</TableCell>
                <TableCell>Duty Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Certification</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography
                      variant="body1"
                      color="textSecondary"
                      sx={{ my: 4 }}
                    >
                      No ELD logs found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {format(parseISO(log.log_date), "PPP")}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {format(parseISO(log.log_date), "EEEE")}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Person
                          sx={{ mr: 1, color: "text.secondary", fontSize: 16 }}
                        />
                        <Typography variant="body2">
                          {log.driver_name}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      {log.trip_name ? (
                        <Typography variant="body2">{log.trip_name}</Typography>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No trip
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <DirectionsCar
                          sx={{ mr: 1, color: "text.secondary", fontSize: 16 }}
                        />
                        <Typography variant="body2">
                          {log.vehicle_id}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {log.total_drive_hours.toFixed(1)}h
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {log.total_duty_hours.toFixed(1)}h
                      </Typography>
                    </TableCell>

                    <TableCell>{getViolationChip(log)}</TableCell>

                    <TableCell>{getCertificationChip(log)}</TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/eld-logs/${log.id}`)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download Log Sheet">
                          <IconButton
                            size="small"
                            onClick={async () => {
                              try {
                                const response =
                                  await eldLogAPI.downloadLogSheet(log.id);

                                // Create a blob URL and trigger download
                                const blob = new Blob([response.data], {
                                  type: "application/pdf",
                                });
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = `eld-log-${
                                  log.driver_name
                                }-${format(
                                  parseISO(log.log_date),
                                  "yyyy-MM-dd"
                                )}.pdf`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              } catch (error: any) {
                                console.error(
                                  "Failed to download log sheet:",
                                  error
                                );
                                setError("Failed to download log sheet");
                              }
                            }}
                          >
                            <Download fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Container>
  );
};

export default ELDLogsPage;
