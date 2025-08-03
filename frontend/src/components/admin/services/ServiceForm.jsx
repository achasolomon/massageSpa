import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Switch, FormControlLabel, CircularProgress, Alert, InputAdornment } from '@mui/material';

// Form for creating and editing services
export default function ServiceForm({ initialData = {}, onSubmit, isLoading, error }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 60, // Default duration in minutes
    price: 0.00,
    isActive: true,
  });

  const isEditMode = !!initialData?.id;

  useEffect(() => {
    if (isEditMode && initialData && Object.keys(initialData).length > 0) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        duration: initialData.duration || 60,
        price: initialData.price || 0.00,
        isActive: typeof initialData.isActive === 'boolean' ? initialData.isActive : true,
      });
    }
  }, [initialData, isEditMode]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    let processedValue = value;
    if (name === 'duration' || name === 'price') {
        processedValue = value === '' ? '' : Number(value);
        if (isNaN(processedValue) || processedValue < 0) {
            processedValue = 0; // Prevent negative numbers or NaN
        }
        if (name === 'price') {
            // Allow decimal input but store as number
            processedValue = value; // Keep as string temporarily for input flexibility
        }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue,
    }));
  };

  const handlePriceBlur = () => {
      // Format price to number on blur
      let priceValue = parseFloat(formData.price);
      if (isNaN(priceValue) || priceValue < 0) {
          priceValue = 0;
      }
      setFormData(prev => ({ ...prev, price: priceValue.toFixed(2) }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Ensure price is a number before submitting
    const submitData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        duration: parseInt(formData.duration) || 0,
    };
    if (submitData.duration <= 0) {
        alert("Duration must be greater than 0.");
        return;
    }
     if (submitData.price < 0) {
        alert("Price cannot be negative.");
        return;
    }
    onSubmit(submitData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField
        margin="normal"
        required
        fullWidth
        id="name"
        label="Service Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        disabled={isLoading}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        id="description"
        label="Description"
        name="description"
        multiline
        rows={3}
        value={formData.description}
        onChange={handleChange}
        disabled={isLoading}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        id="duration"
        label="Duration (minutes)"
        name="duration"
        type="number"
        value={formData.duration}
        onChange={handleChange}
        disabled={isLoading}
        InputProps={{ inputProps: { min: 1 } }}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        id="price"
        label="Price"
        name="price"
        type="number"
        value={formData.price}
        onChange={handleChange}
        onBlur={handlePriceBlur} // Format on blur
        disabled={isLoading}
        InputProps={{
            inputProps: { min: 0, step: "0.01" },
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
        }}
      />
      <FormControlLabel
        control={<Switch checked={formData.isActive} onChange={handleChange} name="isActive" disabled={isLoading} />}
        label="Active Service"
        sx={{ mt: 1, mb: 1 }}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} /> : (isEditMode ? 'Save Changes' : 'Create Service')}
      </Button>
    </Box>
  );
}
