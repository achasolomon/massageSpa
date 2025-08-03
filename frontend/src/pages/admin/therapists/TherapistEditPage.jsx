import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import apiClient from '../../../services/apiClient';
import TherapistForm from '../../../components/admin/therapists/TherapistForm'; // Import the form component

export default function TherapistEditPage() {
  const { therapistId } = useParams(); // Get therapist ID from URL
  const navigate = useNavigate();
  const [therapist, setTherapist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const fetchTherapist = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch full therapist details including associated User and Services
        const response = await apiClient.get(`/therapists/${therapistId}`);
        setTherapist(response.data);
      } catch (err) {
        console.error("Error fetching therapist:", err);
        setError(err.response?.data?.message || "Failed to load therapist data.");
      } finally {
        setLoading(false);
      }
    };

    fetchTherapist();
  }, [therapistId]);

  const handleFormSubmit = async (formData) => {
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      // Separate serviceIds from other therapist data
      const { serviceIds, ...therapistData } = formData;
      
      // 1. Update therapist profile details
      await apiClient.put(`/therapists/${therapistId}`, therapistData);
      
      // 2. Update therapist services (using the dedicated endpoint)
      await apiClient.put(`/therapists/${therapistId}/services`, { serviceIds });

      // Navigate back to the therapist list on success
      navigate('/admin/therapists'); // Adjust path if necessary
    } catch (err) {
      console.error("Error updating therapist:", err);
      setSubmitError(err.response?.data?.message || "Failed to update therapist.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Box>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/admin/therapists')} // Adjust path if necessary
        sx={{ mb: 2 }}
      >
        Back to Therapist List
      </Button>
      <Typography variant="h4" gutterBottom>Edit Therapist Profile</Typography>
      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : therapist ? (
          <TherapistForm 
            initialData={therapist} 
            onSubmit={handleFormSubmit} 
            isLoading={submitLoading} 
            error={submitError}
          />
        ) : (
          <Typography>Therapist data could not be loaded.</Typography>
        )}
      </Paper>
    </Box>
  );
}
