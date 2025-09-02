import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const DriversPage: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Drivers Management
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Manage driver profiles and HOS status
        </Typography>
      </Box>
      
      <Typography>
        Drivers management page - Coming soon!
      </Typography>
    </Container>
  );
};

export default DriversPage;
