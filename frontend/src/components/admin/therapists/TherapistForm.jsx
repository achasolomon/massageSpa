import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, CircularProgress, Alert, FormGroup, Checkbox, Typography, Chip } from '@mui/material';
import apiClient from '../../../services/apiClient';

// This form is used for creating and editing therapist profiles.
export default function TherapistForm({ initialData = {}, onSubmit, isLoading, error }) {
  const [formData, setFormData] = useState({
    userId: '', // Required for creating a new therapist profile
    bio: '',
    specialties: [], // Array of strings
    yearsOfExperience: 0,
    profilePictureUrl: '',
    isActive: true,
    serviceIds: [], // Array of service IDs the therapist offers
  });
  const [allUsers, setAllUsers] = useState([]); // To select user for new profile
  const [allServices, setAllServices] = useState([]);
  const [loadingUsersServices, setLoadingUsersServices] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [specialtyInput, setSpecialtyInput] = useState('');

  const isEditMode = !!initialData?.id;

  // Fetch users (potential therapists) and services on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingUsersServices(true);
      setFetchError(null);
      try {
        // Fetch users (filter for potential therapists if possible, e.g., by role)
        // For simplicity, fetching all users and letting admin choose.
        // Ideally, fetch only users with 'Therapist' role who don't have a profile yet.
        const usersResponse = await apiClient.get('/users/all'); 
        setAllUsers(usersResponse.data.filter(u => u.Role?.name === 'Therapist') || []); // Filter for Therapist role

        // Fetch all active services
        const servicesResponse = await apiClient.get('/services'); // Fetch active services for selection
        setAllServices(servicesResponse.data || []);

      } catch (err) {
        console.error("Error fetching users/services:", err);
        setFetchError(err.response?.data?.message || "Failed to load required data (users/services).");
      } finally {
        setLoadingUsersServices(false);
      }
    };

    fetchData();
  }, []);

  // Populate form if initialData is provided (for editing)
  useEffect(() => {
    if (isEditMode && initialData && Object.keys(initialData).length > 0) {
      setFormData({
        userId: initialData.userId || '', // Should already exist in edit mode
        bio: initialData.bio || '',
        specialties: initialData.specialties || [],
        yearsOfExperience: initialData.yearsOfExperience || 0,
        profilePictureUrl: initialData.profilePictureUrl || '',
        isActive: typeof initialData.isActive === 'boolean' ? initialData.isActive : true,
        serviceIds: initialData.Services?.map(s => s.id) || [], // Extract service IDs
      });
    }
  }, [initialData, isEditMode]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleServiceChange = (event) => {
    const { value, checked } = event.target;
    setFormData(prev => ({
      ...prev,
      serviceIds: checked
        ? [...prev.serviceIds, value] // Add service ID
        : prev.serviceIds.filter(id => id !== value), // Remove service ID
    }));
  };

  const handleAddSpecialty = () => {
      if (specialtyInput && !formData.specialties.includes(specialtyInput)) {
          setFormData(prev => ({ ...prev, specialties: [...prev.specialties, specialtyInput] }));
          setSpecialtyInput('');
      }
  };

  const handleDeleteSpecialty = (specialtyToDelete) => () => {
      setFormData(prev => ({ ...prev, specialties: prev.specialties.filter(spec => spec !== specialtyToDelete) }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Basic validation
    if (!isEditMode && !formData.userId) {
        alert("Please select a user to create the therapist profile for.");
        return;
    }
    onSubmit(formData);
  };

  if (loadingUsersServices) {
      return <CircularProgress />;
  }

  if (fetchError) {
      return <Alert severity="error">{fetchError}</Alert>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* User Selection (only for creating new profile) */} 
      {!isEditMode && (
        <FormControl fullWidth margin="normal" required disabled={isLoading || loadingUsersServices}>
          <InputLabel id="user-select-label">Select User (Therapist Role)</InputLabel>
          <Select
            labelId="user-select-label"
            id="userId"
            name="userId"
            value={formData.userId}
            label="Select User (Therapist Role)"
            onChange={handleChange}
          >
            <MenuItem value=""><em>Select a User</em></MenuItem>
            {allUsers.map(user => (
              <MenuItem key={user.id} value={user.id}>
                {user.firstName} {user.lastName} ({user.email})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField
        margin="normal"
        fullWidth
        id="bio"
        label="Biography"
        name="bio"
        multiline
        rows={4}
        value={formData.bio}
        onChange={handleChange}
        disabled={isLoading}
      />

      <Box sx={{ my: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Specialties</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TextField
                size="small"
                label="Add Specialty"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSpecialty(); } }}
                disabled={isLoading}
            />
            <Button onClick={handleAddSpecialty} variant="outlined" size="small" disabled={isLoading}>Add</Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {formData.specialties.map((spec) => (
              <Chip
                key={spec}
                label={spec}
                onDelete={handleDeleteSpecialty(spec)}
                disabled={isLoading}
              />
            ))}
          </Box>
      </Box>

      <TextField
        margin="normal"
        fullWidth
        id="yearsOfExperience"
        label="Years of Experience"
        name="yearsOfExperience"
        type="number"
        value={formData.yearsOfExperience}
        onChange={handleChange}
        disabled={isLoading}
        InputProps={{ inputProps: { min: 0 } }}
      />

      <TextField
        margin="normal"
        fullWidth
        id="profilePictureUrl"
        label="Profile Picture URL" // Consider implementing file upload later
        name="profilePictureUrl"
        value={formData.profilePictureUrl}
        onChange={handleChange}
        disabled={isLoading}
      />

      <Box sx={{ my: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Services Offered</Typography>
          <FormGroup>
              {allServices.map(service => (
                  <FormControlLabel
                      key={service.id}
                      control={
                          <Checkbox
                              checked={formData.serviceIds.includes(service.id)}
                              onChange={handleServiceChange}
                              value={service.id}
                              disabled={isLoading}
                          />
                      }
                      label={`${service.name} (${service.duration} min)`}
                  />
              ))}
          </FormGroup>
      </Box>

      <FormControlLabel
        control={<Switch checked={formData.isActive} onChange={handleChange} name="isActive" disabled={isLoading} />}
        label="Active Therapist Profile"
        sx={{ mt: 1, mb: 1 }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isLoading || loadingUsersServices}
      >
        {isLoading ? <CircularProgress size={24} /> : (isEditMode ? 'Save Changes' : 'Create Therapist Profile')}
      </Button>
    </Box>
  );
}
