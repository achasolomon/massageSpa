import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Box, Container, Typography, TextField, Button, 
  Alert, CircularProgress, Paper, Stack, Divider
} from '@mui/material';
import { Lock, Person, Email, Phone } from '@mui/icons-material';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../../hooks/useAuth';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile Form
  const { register: profileRegister, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors } } = useForm();
  // Password Form
  const { register: pwdRegister, handleSubmit: handlePwdSubmit, formState: { errors: pwdErrors }, reset: resetPwdForm } = useForm();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/users/profile/me');
        setProfile(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load profile');
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleProfileUpdate = async (data) => {
    try {
      const response = await apiClient.put('/users/profile/me', data);
      setProfile(response.data);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const handlePasswordChange = async (data) => {
    try {
      await apiClient.put('/users/profile/change-password', data);
      resetPwdForm();
      setSuccess('Password changed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Password change failed');
    }
  };

  if (loading) return <CircularProgress />;
  if (!profile) return <Alert severity="error">Profile not found</Alert>;

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Profile
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {/* Personal Information Form */}
        <form onSubmit={handleProfileSubmit(handleProfileUpdate)}>
          <Stack spacing={3}>
            <TextField
              label="First Name"
              defaultValue={profile.firstName}
              {...profileRegister('firstName', { required: 'First name is required' })}
              error={!!profileErrors.firstName}
              helperText={profileErrors.firstName?.message}
              InputProps={{ startAdornment: <Person /> }}
            />

            <TextField
              label="Last Name"
              defaultValue={profile.lastName}
              {...profileRegister('lastName', { required: 'Last name is required' })}
              error={!!profileErrors.lastName}
              helperText={profileErrors.lastName?.message}
              InputProps={{ startAdornment: <Person /> }}
            />

            <TextField
              label="Email"
              type="email"
              defaultValue={profile.email}
              {...profileRegister('email', { 
                required: 'Email is required',
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: 'Enter a valid email address'
                }
              })}
              error={!!profileErrors.email}
              helperText={profileErrors.email?.message}
              InputProps={{ startAdornment: <Email /> }}
            />

            <TextField
              label="Phone"
              defaultValue={profile.phone}
              {...profileRegister('phone')}
              InputProps={{ startAdornment: <Phone /> }}
            />

            <Button type="submit" variant="contained" size="large">
              Update Profile
            </Button>
          </Stack>
        </form>

        <Divider sx={{ my: 4 }} />

        {/* Change Password Form */}
        <form onSubmit={handlePwdSubmit(handlePasswordChange)}>
          <Stack spacing={3}>
            <TextField
              label="Current Password"
              type="password"
              {...pwdRegister('currentPassword', { required: 'Current password is required' })}
              error={!!pwdErrors.currentPassword}
              helperText={pwdErrors.currentPassword?.message}
              InputProps={{ startAdornment: <Lock /> }}
            />

            <TextField
              label="New Password"
              type="password"
              {...pwdRegister('newPassword', { 
                required: 'New password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
              error={!!pwdErrors.newPassword}
              helperText={pwdErrors.newPassword?.message}
              InputProps={{ startAdornment: <Lock /> }}
            />

            <Button 
              type="submit" 
              variant="contained" 
              color="secondary" 
              size="large"
            >
              Change Password
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default ProfilePage;
