import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert, TextField,
  Card, CardContent, Grid, Tabs, Tab, Stack, Switch, FormControlLabel,
  Divider, InputAdornment
} from '@mui/material';
import {
  Business, Email, Phone, Language, Palette, Settings as SettingsIcon,
  Notifications, Schedule, Policy, Save
} from '@mui/icons-material';
import apiClient from '../../../services/apiClient';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsConfigurationPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [settings, setSettings] = useState({
    // Company Information
    companyName: '',
    companyAddress: '',
    phoneNumber1: '',
    phoneNumber2: '',
    supportEmail: '',
    businessEmail: '',
    website: '',
    
    // Appearance
    themeColor: '#1976d2',
    secondaryColor: '#4caf50',
    logo: '',
    favicon: '',
    
    // Regional Settings
    timezone: 'America/Toronto',
    currency: 'CAD',
    currencySymbol: '$', // Fixed: was ',' should be '$'
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    
    // Application Settings
    bookingConfirmationRequired: true,
    autoAssignTherapist: false,
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: false,
    
    // Policies
    cancellationPolicy: '',
    termsAndConditions: '',
    privacyPolicy: '',
    
    // Social Media & Business Hours
    socialMediaLinks: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: ''
    },
    businessHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '10:00', close: '15:00', closed: false },
      sunday: { open: '10:00', close: '15:00', closed: true }
    }
  });

  // Load existing settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/settings');
      
      if (response.data.success && response.data.data) {
        // Deep merge the loaded data with defaults to ensure no data loss
        setSettings(prevSettings => ({
          ...prevSettings,
          ...response.data.data,
          // Ensure nested objects are properly merged
          socialMediaLinks: {
            ...prevSettings.socialMediaLinks,
            ...(response.data.data.socialMediaLinks || {})
          },
          businessHours: {
            ...prevSettings.businessHours,
            ...(response.data.data.businessHours || {})
          }
        }));
        setMessage({ type: 'success', text: 'Settings loaded successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      if (error.response?.status === 404) {
        setMessage({ type: 'info', text: 'No existing settings found. Using default values.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to load settings. Using default values.' });
      }
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
    setLoading(false);
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (parent, field, value) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleBusinessHoursChange = (day, field, value) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Only send non-empty values to avoid overwriting existing data
      const settingsToSave = {};
      
      Object.keys(settings).forEach(key => {
        const value = settings[key];
        
        if (typeof value === 'object' && value !== null) {
          // Handle nested objects (socialMediaLinks, businessHours)
          const nestedData = {};
          Object.keys(value).forEach(nestedKey => {
            if (value[nestedKey] !== '' && value[nestedKey] !== null && value[nestedKey] !== undefined) {
              nestedData[nestedKey] = value[nestedKey];
            }
          });
          if (Object.keys(nestedData).length > 0) {
            settingsToSave[key] = nestedData;
          }
        } else if (typeof value === 'boolean') {
          // Always include boolean values
          settingsToSave[key] = value;
        } else if (value !== '' && value !== null && value !== undefined) {
          // Include non-empty primitive values
          settingsToSave[key] = value;
        }
      });

      const response = await apiClient.put('/settings', settingsToSave);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        // Reload settings to ensure we have the latest data
        setTimeout(() => {
          loadSettings();
        }, 1000);
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save settings' });
    }
    setSaving(false);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading settings...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1f2937' }}>
          Application Settings
        </Typography>
        <Typography variant="body1" sx={{ color: '#6b7280' }}>
          Configure your application settings and preferences
        </Typography>
      </Box>

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ width: '100%', borderRadius: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="settings tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Business />} label="Company Info" />
          <Tab icon={<Palette />} label="Appearance" />
          <Tab icon={<SettingsIcon />} label="General" />
        </Tabs>

        {/* Company Information Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={settings.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Business /></InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Website"
                value={settings.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Language /></InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company Address"
                multiline
                rows={3}
                value={settings.companyAddress}
                onChange={(e) => handleInputChange('companyAddress', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Primary Phone Number"
                value={settings.phoneNumber1}
                onChange={(e) => handleInputChange('phoneNumber1', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Phone /></InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Secondary Phone Number"
                value={settings.phoneNumber2}
                onChange={(e) => handleInputChange('phoneNumber2', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Phone /></InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Business Email"
                type="email"
                value={settings.businessEmail}
                onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Email /></InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Support Email"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Email /></InputAdornment>
                }}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Appearance Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Primary Theme Color"
                type="color"
                value={settings.themeColor}
                onChange={(e) => handleInputChange('themeColor', e.target.value)}
                sx={{ '& input': { height: 56 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Secondary Color"
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                sx={{ '& input': { height: 56 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Logo URL"
                value={settings.logo}
                onChange={(e) => handleInputChange('logo', e.target.value)}
                helperText="URL to your company logo"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Favicon URL"
                value={settings.favicon}
                onChange={(e) => handleInputChange('favicon', e.target.value)}
                helperText="URL to your favicon"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* General Settings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Timezone"
                value={settings.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                helperText="e.g., America/Toronto"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Currency"
                value={settings.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                helperText="3-letter currency code"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Currency Symbol"
                value={settings.currencySymbol}
                onChange={(e) => handleInputChange('currencySymbol', e.target.value)}
                helperText="e.g., $, €, £"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date Format"
                value={settings.dateFormat}
                onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                helperText="e.g., YYYY-MM-DD, DD/MM/YYYY"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Time Format"
                value={settings.timeFormat}
                onChange={(e) => handleInputChange('timeFormat', e.target.value)}
                helperText="12h or 24h"
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Booking Settings</Typography>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.bookingConfirmationRequired || false}
                      onChange={(e) => handleInputChange('bookingConfirmationRequired', e.target.checked)}
                    />
                  }
                  label="Require booking confirmation"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoAssignTherapist || false}
                      onChange={(e) => handleInputChange('autoAssignTherapist', e.target.checked)}
                    />
                  }
                  label="Auto-assign therapist"
                />
              </Stack>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notifications Tab - Hidden for now */}
        {/* <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Notification Settings</Typography>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotificationsEnabled || false}
                      onChange={(e) => handleInputChange('emailNotificationsEnabled', e.target.checked)}
                    />
                  }
                  label="Enable email notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.smsNotificationsEnabled || false}
                      onChange={(e) => handleInputChange('smsNotificationsEnabled', e.target.checked)}
                    />
                  }
                  label="Enable SMS notifications"
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Social Media Links</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Facebook"
                value={settings.socialMediaLinks.facebook}
                onChange={(e) => handleNestedChange('socialMediaLinks', 'facebook', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Instagram"
                value={settings.socialMediaLinks.instagram}
                onChange={(e) => handleNestedChange('socialMediaLinks', 'instagram', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Twitter"
                value={settings.socialMediaLinks.twitter}
                onChange={(e) => handleNestedChange('socialMediaLinks', 'twitter', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="LinkedIn"
                value={settings.socialMediaLinks.linkedin}
                onChange={(e) => handleNestedChange('socialMediaLinks', 'linkedin', e.target.value)}
              />
            </Grid>
          </Grid>
        </TabPanel> */}

        {/* Business Hours Tab - Hidden for now */}
        {/* <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>Business Hours</Typography>
          <Grid container spacing={2}>
            {Object.entries(settings.businessHours).map(([day, hours]) => (
              <Grid item xs={12} key={day}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                        {day}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={!hours.closed}
                            onChange={(e) => handleBusinessHoursChange(day, 'closed', !e.target.checked)}
                          />
                        }
                        label="Open"
                      />
                    </Grid>
                    {!hours.closed && (
                      <>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            fullWidth
                            label="Open Time"
                            type="time"
                            value={hours.open}
                            onChange={(e) => handleBusinessHoursChange(day, 'open', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            fullWidth
                            label="Close Time"
                            type="time"
                            value={hours.close}
                            onChange={(e) => handleBusinessHoursChange(day, 'close', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel> */}

        {/* Policies Tab - Hidden for now */}
        {/* <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cancellation Policy"
                multiline
                rows={4}
                value={settings.cancellationPolicy}
                onChange={(e) => handleInputChange('cancellationPolicy', e.target.value)}
                helperText="Describe your cancellation and refund policy"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Terms and Conditions"
                multiline
                rows={6}
                value={settings.termsAndConditions}
                onChange={(e) => handleInputChange('termsAndConditions', e.target.value)}
                helperText="Your terms and conditions for service"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Privacy Policy"
                multiline
                rows={6}
                value={settings.privacyPolicy}
                onChange={(e) => handleInputChange('privacyPolicy', e.target.value)}
                helperText="Your privacy policy and data handling practices"
              />
            </Grid>
          </Grid>
        </TabPanel> */}
      </Paper>

      {/* Save Button */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{ minWidth: 200, py: 1.5 }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
}