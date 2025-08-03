import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, CircularProgress, Alert } from '@mui/material';

// This form is used for both creating and editing users.
// It receives initial data (for editing) and an onSubmit handler.
export default function UserForm({ initialData = {}, onSubmit, isLoading, error, availableRoles = [] }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roleName: '', 
    isActive: true,
    password: '', 
    confirmPassword: '',
  });

  // Populate form if initialData is provided (for editing)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
        // Map initialData role object to roleName if present
        const roleName = initialData.Role?.name || initialData.roleName || '';
        setFormData({
            firstName: initialData.firstName || '',
            lastName: initialData.lastName || '',
            email: initialData.email || '',
            phone: initialData.phone || '',
            roleName: roleName,
            isActive: typeof initialData.isActive === 'boolean' ? initialData.isActive : true,
            password: '', // Password fields are usually empty when editing
            confirmPassword: '',
        });
    }
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Basic validation example
    if (!initialData?.id && formData.password !== formData.confirmPassword) {
        alert("Passwords do not match.");
        return;
    }
    // Pass the relevant form data to the parent onSubmit handler
    // Exclude confirmPassword
    const { confirmPassword, ...submitData } = formData;
    // Only include password if it's set (for creation or change)
    if (!submitData.password) {
        delete submitData.password;
    }
    onSubmit(submitData);
  };

  const isEditMode = !!initialData?.id;

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField
        margin="normal"
        required
        fullWidth
        id="firstName"
        label="First Name"
        name="firstName"
        autoComplete="given-name"
        value={formData.firstName}
        onChange={handleChange}
        disabled={isLoading}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        id="lastName"
        label="Last Name"
        name="lastName"
        autoComplete="family-name"
        value={formData.lastName}
        onChange={handleChange}
        disabled={isLoading}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        value={formData.email}
        onChange={handleChange}
        disabled={isLoading}
      />
      <TextField
        margin="normal"
        fullWidth // Optional field
        id="phone"
        label="Phone Number"
        name="phone"
        autoComplete="tel"
        value={formData.phone}
        onChange={handleChange}
        disabled={isLoading}
      />
      <FormControl fullWidth margin="normal" required disabled={isLoading}>
        <InputLabel id="role-select-label">Role</InputLabel>
        <Select
          labelId="role-select-label"
          id="roleName"
          name="roleName"
          value={formData.roleName}
          label="Role"
          onChange={handleChange}
        >
          {/* TODO: Fetch available roles from backend or pass as prop */}
          {/* Example roles - replace with actual data */} 
          {availableRoles.map(role => (
              <MenuItem key={role} value={role}>{role}</MenuItem>
          ))}
          {/* <MenuItem value="Admin">Admin</MenuItem>
          <MenuItem value="Staff">Staff</MenuItem>
          <MenuItem value="Therapist">Therapist</MenuItem>
          <MenuItem value="Client">Client</MenuItem> */} 
        </Select>
      </FormControl>
      
      {/* Password fields - show only for creation or if explicitly changing */}
      {!isEditMode && (
          <>
            <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
            />
            <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
            />
          </>
      )}
      {/* TODO: Add option to change password in edit mode */} 

      <FormControlLabel
        control={<Switch checked={formData.isActive} onChange={handleChange} name="isActive" disabled={isLoading} />}
        label="Active User"
        sx={{ mt: 1, mb: 1 }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} /> : (isEditMode ? 'Save Changes' : 'Create User')}
      </Button>
    </Box>
  );
}
