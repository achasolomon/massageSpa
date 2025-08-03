import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import apiClient from '../../../services/apiClient';
import ServiceForm from '../../../components/admin/services/ServiceForm'; // Import the form component

export default function ServiceCreatePage() {
  const navigate = useNavigate();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleFormSubmit = async (formData) => {
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      // Call the API to create the service
      // TODO: Ensure the backend endpoint for creating service exists (e.g., POST /services)
      await apiClient.post('/services', formData); 
      // Navigate back to the service list on success
      navigate('/admin/services'); // Adjust path if necessary
    } catch (err) {
      console.error("Error creating service:", err);
      setSubmitError(err.response?.data?.message || "Failed to create service.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Box>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/admin/services')} // Adjust path if necessary
        sx={{ mb: 2 }}
      >
        Back to Service List
      </Button>
      <Typography variant="h4" gutterBottom>Create New Service</Typography>
      <Paper sx={{ p: 3 }}>
        <ServiceForm 
          onSubmit={handleFormSubmit} 
          isLoading={submitLoading} 
          error={submitError}
        />
      </Paper>
    </Box>
  );
}
