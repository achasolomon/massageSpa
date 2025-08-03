import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import RemindersPanel from '../../../components/admin/reminders/RemindersPanel';

const RemindersPage = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4}}>
        <Typography variant="h3" component="h2" gutterBottom>
          Appointment Reminders
        </Typography>
        <Typography variant="body1" paragraph>
          Manage and send reminders for upcoming appointments. Use this page to check for appointments that need reminders and send notifications to clients.
        </Typography>
        
        <RemindersPanel />
      </Box>
    </Container>
  );
};

export default RemindersPage;
