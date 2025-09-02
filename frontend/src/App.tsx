import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Components
import Navbar from './components/common/Navbar';
import HomePage from './pages/HomePage';
import TripPlanningPage from './pages/TripPlanningPage';
import TripDetailsPage from './pages/TripDetailsPage';
import ELDLogsPage from './pages/ELDLogsPage';
import ELDLogDetailsPage from './pages/ELDLogDetailsPage';
import DriversPage from './pages/DriversPage';

// Theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Blue
      dark: '#1565c0',
      light: '#42a5f5',
    },
    secondary: {
      main: '#dc004e', // Red for alerts/violations
      dark: '#9a0036',
      light: '#e33371',
    },
    success: {
      main: '#2e7d32', // Green for compliance
    },
    warning: {
      main: '#ed6c02', // Orange for warnings
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <Box component="main" sx={{ flex: 1, bgcolor: 'background.default', p: 2 }}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/plan-trip" element={<TripPlanningPage />} />
                <Route path="/trips/:id" element={<TripDetailsPage />} />
                <Route path="/eld-logs" element={<ELDLogsPage />} />
                <Route path="/eld-logs/:id" element={<ELDLogDetailsPage />} />
                <Route path="/drivers" element={<DriversPage />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
