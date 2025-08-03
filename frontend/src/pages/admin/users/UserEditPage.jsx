import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert, 
  Button, 
  TextField,
  Avatar,
  Divider,
  Chip,
  Tabs,
  Tab,
  Grid,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Save,
  Cancel,
  Email,
  Phone,
  Person,
  Badge,
  Lock,
  CalendarToday,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import apiClient from '../../../services/apiClient';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[2],
}));

const ProfileHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export default function UserEditPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({});

  const availableRoles = ["Admin", "Staff", "Therapist", "Client"];

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/users/${userId}`);
        setUser(response.data);
        setFormData(response.data);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError(err.response?.data?.message || "Failed to load user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      await apiClient.put(`/users/${userId}`, formData);
      setUser(formData);
      setEditMode(false);
    } catch (err) {
      console.error("Error updating user:", err);
      setSubmitError(err.response?.data?.message || "Failed to update user.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/admin/users')}
          variant="outlined"
        >
          Back to User List
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => navigate('/admin/users')}
        sx={{ mb: 3 }}
        variant="outlined"
      >
        Back to User List
      </Button>

      <ProfileHeader>
        <Avatar sx={{ width: 80, height: 80, fontSize: 32 }}>
          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="h4" component="h1">
            {user.firstName} {user.lastName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip 
              label={user.roleName || 'N/A'} 
              color={
                user.roleName === 'Admin' ? 'primary' : 
                user.roleName === 'Staff' ? 'secondary' : 
                'default'
              }
              size="small"
            />
            {user.isActive ? (
              <Chip 
                icon={<CheckCircle fontSize="small" />} 
                label="Active" 
                color="success" 
                size="small" 
              />
            ) : (
              <Chip 
                icon={<Warning fontSize="small" />} 
                label="Inactive" 
                color="error" 
                size="small" 
              />
            )}
          </Box>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          {editMode ? (
            <>
              <Button
                startIcon={<Save />}
                onClick={handleSubmit}
                variant="contained"
                sx={{ mr: 2 }}
                disabled={submitLoading}
              >
                {submitLoading ? <CircularProgress size={24} /> : 'Save'}
              </Button>
              <Button
                startIcon={<Cancel />}
                onClick={() => {
                  setEditMode(false);
                  setFormData(user);
                }}
                variant="outlined"
                color="error"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              startIcon={<Edit />}
              onClick={() => setEditMode(true)}
              variant="contained"
            >
              Edit Profile
            </Button>
          )}
        </Box>
      </ProfileHeader>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Profile" />
        <Tab label="Activity" />
        <Tab label="Settings" />
      </Tabs>

      <StyledPaper>
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName || ''}
                onChange={handleFormChange}
                disabled={!editMode}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName || ''}
                onChange={handleFormChange}
                disabled={!editMode}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Badge />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formData.email || ''}
                onChange={handleFormChange}
                disabled={!editMode}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleFormChange}
                disabled={!editMode}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Role"
                name="roleName"
                value={formData.roleName || ''}
                onChange={handleFormChange}
                disabled={!editMode}
                SelectProps={{
                  native: true,
                }}
                sx={{ mb: 2 }}
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Typography variant="body1">User activity will be displayed here.</Typography>
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Typography variant="body1">User settings will be displayed here.</Typography>
        </TabPanel>
      </StyledPaper>

      {submitError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {submitError}
        </Alert>
      )}
    </Box>
  );
}