import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import apiClient from '../../../services/apiClient';
import ServiceForm from '../../../components/admin/services/ServiceForm'; // Import the form component

export default function ServiceEditPage() {
  const { serviceId } = useParams(); // Get service ID from URL
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const fetchService = async () => {
      setLoading(true);
      setError(null);
      try {
        // Endpoint might be public or admin-specific, adjust if needed
        const response = await apiClient.get(`/services/${serviceId}`); 
        setService(response.data);
      } catch (err) {
        console.error("Error fetching service:", err);
        setError(err.response?.data?.message || "Failed to load service data.");
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [serviceId]);

  const handleFormSubmit = async (formData) => {
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      // Call the API to update the service
      await apiClient.put(`/services/${serviceId}`, formData);
      // Navigate back to the service list on success
      navigate('/admin/services'); // Adjust path if necessary
    } catch (err) {
      console.error("Error updating service:", err);
      setSubmitError(err.response?.data?.message || "Failed to update service.");
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
      <Typography variant="h4" gutterBottom>Edit Service</Typography>
      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : service ? (
          <ServiceForm 
            initialData={service} 
            onSubmit={handleFormSubmit} 
            isLoading={submitLoading} 
            error={submitError}
          />
        ) : (
          <Typography>Service data could not be loaded.</Typography>
        )}
      </Paper>
    </Box>
  );
}
