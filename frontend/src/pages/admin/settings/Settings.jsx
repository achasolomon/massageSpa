import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert, TextField,
  Card, CardContent, Grid, Tabs, Tab, Stack, Switch, FormControlLabel,
  Divider, InputAdornment, Chip, Avatar, IconButton, Tooltip
} from '@mui/material';
import {
  Business, Email, Phone, Language, Palette, Settings as SettingsIcon,
  Notifications, Schedule, Policy, Save, ColorLens, Refresh, 
  PhotoCamera, Link, Preview
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

// Enhanced Color Picker Component
const ColorPickerField = ({ label, value, onChange, helperText, presetColors = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const defaultPresets = [
    '#1976d2', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#795548',
    '#607d8b', '#9e9e9e'
  ];
  
  const colorsToShow = presetColors.length > 0 ? presetColors : defaultPresets;
  
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
        {label}
      </Typography>
      
      {/* Current Color Display */}
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 2, 
          mb: 2,
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: 2,
            borderColor: value
          }
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: value,
              border: '2px solid',
              borderColor: 'divider',
              boxShadow: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ColorLens sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Selected Color
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {value.toUpperCase()}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Chip 
              label={isOpen ? "Hide Colors" : "Choose Color"} 
              variant="outlined"
              size="small"
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Color Preset Grid */}
      {isOpen && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
            Choose from presets:
          </Typography>
          <Grid container spacing={1}>
            {colorsToShow.map((color, index) => (
              <Grid item key={index}>
                <Tooltip title={color.toUpperCase()}>
                  <Box
                    onClick={() => {
                      onChange(color);
                      setIsOpen(false);
                    }}
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: value === color ? '3px solid #000' : '2px solid transparent',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        boxShadow: 2
                      }
                    }}
                  />
                </Tooltip>
              </Grid>
            ))}
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Custom Color Input */}
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Or enter a custom color:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              sx={{ 
                width: 60,
                '& input': { 
                  height: 36,
                  padding: 0,
                  border: 'none',
                  borderRadius: 1
                }
              }}
            />
            <TextField
              size="small"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#1976d2"
              InputProps={{
                startAdornment: <InputAdornment position="start">#</InputAdornment>
              }}
              sx={{ flex: 1 }}
            />
          </Box>
        </Paper>
      )}
      
      {helperText && (
        <Typography variant="caption" color="text.secondary">
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

// Enhanced Image Upload Field
const ImageUploadField = ({ label, value, onChange, helperText, preview = false }) => {
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
        {label}
      </Typography>
      
      <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
        {preview && value && (
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <Avatar
              src={value}
              sx={{ 
                width: 80, 
                height: 80, 
                mx: 'auto', 
                mb: 1,
                border: '2px solid',
                borderColor: 'divider'
              }}
            >
              <PhotoCamera />
            </Avatar>
            <Typography variant="caption" color="text.secondary">
              Current {label.toLowerCase()}
            </Typography>
          </Box>
        )}
        
        <TextField
          fullWidth
          size="small"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()} URL`}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Link sx={{ fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: value && (
              <InputAdornment position="end">
                <Tooltip title="Preview">
                  <IconButton size="small" href={value} target="_blank">
                    <Preview fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            )
          }}
        />
      </Paper>
      
      {helperText && (
        <Typography variant="caption" color="text.secondary">
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

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
    currencySymbol: '$',
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
        setSettings(prevSettings => ({
          ...prevSettings,
          ...response.data.data,
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
      const settingsToSave = {};
      
      Object.keys(settings).forEach(key => {
        const value = settings[key];
        
        if (typeof value === 'object' && value !== null) {
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
          settingsToSave[key] = value;
        } else if (value !== '' && value !== null && value !== undefined) {
          settingsToSave[key] = value;
        }
      });

      const response = await apiClient.put('/settings', settingsToSave);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
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

  // Reset colors to defaults
  const resetToDefaultColors = () => {
    setSettings(prev => ({
      ...prev,
      themeColor: '#1976d2',
      secondaryColor: '#4caf50'
    }));
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

      <Paper sx={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="settings tabs"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontWeight: 500
            }
          }}
        >
          <Tab icon={<Business />} label="Company Info" iconPosition="start" />
          <Tab icon={<Palette />} label="Appearance" iconPosition="start" />
          <Tab icon={<SettingsIcon />} label="General" iconPosition="start" />
        </Tabs>

        {/* Company Information Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Company Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Basic information about your company that will be displayed to customers
            </Typography>
          </Box>
          
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
                helperText="Full business address including city, state/province, and postal code"
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
                helperText="Optional secondary contact number"
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
                helperText="Main business email address"
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
                helperText="Customer support email address"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Appearance Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Visual Appearance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customize the look and feel of your application
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={resetToDefaultColors}
                size="small"
              >
                Reset to Default
              </Button>
            </Box>
          </Box>

          <Grid container spacing={4}>
            {/* Color Theme Section */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Color Theme
                </Typography>
                
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <ColorPickerField
                      label="Primary Theme Color"
                      value={settings.themeColor}
                      onChange={(color) => handleInputChange('themeColor', color)}
                      helperText="Main color used throughout the application for buttons, headers, and accents"
                      presetColors={[
                        '#1976d2', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
                        '#8bc34a', '#cddc39', '#ffc107', '#ff9800', '#ff5722', '#f44336',
                        '#e91e63', '#9c27b0', '#673ab7', '#3f51b5'
                      ]}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <ColorPickerField
                      label="Secondary Accent Color"
                      value={settings.secondaryColor}
                      onChange={(color) => handleInputChange('secondaryColor', color)}
                      helperText="Secondary color for highlights, success states, and complementary elements"
                      presetColors={[
                        '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
                        '#ff5722', '#795548', '#607d8b', '#9e9e9e', '#1976d2', '#9c27b0'
                      ]}
                    />
                  </Grid>
                </Grid>
                
                {/* Color Preview */}
                <Box sx={{ mt: 3, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Preview
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button 
                      variant="contained" 
                      sx={{ bgcolor: settings.themeColor, '&:hover': { bgcolor: settings.themeColor } }}
                      size="small"
                    >
                      Primary Button
                    </Button>
                    <Button 
                      variant="contained" 
                      sx={{ bgcolor: settings.secondaryColor, '&:hover': { bgcolor: settings.secondaryColor } }}
                      size="small"
                    >
                      Secondary Button
                    </Button>
                    <Chip label="Primary Chip" sx={{ bgcolor: settings.themeColor, color: 'white' }} />
                    <Chip label="Secondary Chip" sx={{ bgcolor: settings.secondaryColor, color: 'white' }} />
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Branding Section */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Branding Assets
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <ImageUploadField
                      label="Company Logo"
                      value={settings.logo}
                      onChange={(value) => handleInputChange('logo', value)}
                      helperText="Logo displayed in the header and throughout the application. Recommended size: 200x60px"
                      preview={true}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <ImageUploadField
                      label="Favicon"
                      value={settings.favicon}
                      onChange={(value) => handleInputChange('favicon', value)}
                      helperText="Small icon displayed in browser tabs. Recommended size: 32x32px (.ico or .png)"
                      preview={true}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* General Settings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              General Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Regional settings and application behavior preferences
            </Typography>
          </Box>
          
          <Grid container spacing={3}>
            {/* Regional Settings */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Regional Settings
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Timezone"
                      value={settings.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      helperText="e.g., America/Toronto, Europe/London"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Currency"
                      value={settings.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      helperText="3-letter currency code (USD, CAD, EUR)"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Currency Symbol"
                      value={settings.currencySymbol}
                      onChange={(e) => handleInputChange('currencySymbol', e.target.value)}
                      helperText="Symbol displayed with prices ($, €, £)"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Date Format"
                      value={settings.dateFormat}
                      onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                      helperText="Format for displaying dates (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY)"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Time Format"
                      value={settings.timeFormat}
                      onChange={(e) => handleInputChange('timeFormat', e.target.value)}
                      helperText="12-hour (12h) or 24-hour (24h) format"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            
            {/* Booking Settings */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Booking Behavior
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure how the booking system behaves
                </Typography>
                
                <Stack spacing={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.bookingConfirmationRequired || false}
                        onChange={(e) => handleInputChange('bookingConfirmationRequired', e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Require booking confirmation
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Admin must approve bookings before they are confirmed
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoAssignTherapist || false}
                        onChange={(e) => handleInputChange('autoAssignTherapist', e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Auto-assign therapist
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Automatically assign available therapists to bookings
                        </Typography>
                      </Box>
                    }
                  />
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Save Button */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{ 
            minWidth: 200, 
            py: 1.5,
            fontWeight: 600,
            fontSize: '1rem'
          }}
        >
          {saving ? 'Saving Changes...' : 'Save All Settings'}
        </Button>
      </Box>
    </Box>
  );
}