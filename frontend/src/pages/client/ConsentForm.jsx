import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  FormHelperText,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import {
  CalendarToday,
  Person,
  Phone,
  LocationOn,
  Lock,
  Description,
  CheckCircle,
  Error,
  Cached,
  Close,
  ExpandMore,
  Security,
  Shield,
  Info,
  Email,
  Warning,
  Delete,
  Download,
  Edit,
  Gavel,
  People,
  Storage,
  Visibility,
  Update
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import apiClient from '../../services/apiClient';

// Styled components
const FormContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}));

const FormCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const AppointmentInfoCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  marginBottom: theme.spacing(3),
  borderLeft: `4px solid ${theme.palette.primary.main}`,
}));

const SuccessScreen = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
}));

const LoadingScreen = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
}));

const PrivacyModal = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    maxWidth: '900px',
    maxHeight: '90vh',
    margin: theme.spacing(2),
  },
}));

const PrivacyHeader = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: 'white',
  padding: theme.spacing(3),
  textAlign: 'center',
  margin: theme.spacing(-3, -3, 3, -3),
}));

// Privacy Policy Modal Component
const PrivacyPolicyModal = ({ open, onAccept, onDecline, businessInfo }) => {
  const [expanded, setExpanded] = useState('panel1');
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasScrolledToEnd(true);
    }
  };

  const privacySections = [
    {
      id: 'panel1',
      title: 'Information We Collect',
      icon: <Storage />,
      content: (
        <Box>
          <Typography variant="subtitle1" gutterBottom>Personal & Medical Information</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckCircle color="primary" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Contact Information" 
                secondary="Name, email, phone, address"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="primary" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Medical Information" 
                secondary="Health conditions, allergies, medications, physical limitations"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="primary" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Appointment Data" 
                secondary="Booking details, treatment history, preferences"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="primary" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Emergency Contact" 
                secondary="Emergency contact details and relationship"
              />
            </ListItem>
          </List>
        </Box>
      )
    },
    {
      id: 'panel2',
      title: 'How We Use Your Information',
      icon: <Visibility />,
      content: (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            We only use your data for legitimate business purposes and with your consent.
          </Alert>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Service Delivery" 
                secondary="Providing treatments, booking appointments, maintaining health records"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Communication" 
                secondary="Appointment confirmations, reminders, health-related communications"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Safety & Care" 
                secondary="Medical history tracking, allergy alerts, emergency purposes"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Legal Compliance" 
                secondary="Meeting healthcare regulations and maintaining required records"
              />
            </ListItem>
          </List>
        </Box>
      )
    },
    {
      id: 'panel3',
      title: 'Your Rights Under GDPR',
      icon: <Shield />,
      content: (
        <Box>
          <Typography variant="subtitle1" gutterBottom color="success.main">
            You Have the Right To:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><Visibility color="primary" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Access Your Data" 
                secondary="Request a copy of all personal data we hold"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Edit color="primary" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Correct Your Data" 
                secondary="Update any inaccurate or incomplete information"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Delete color="error" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Delete Your Data" 
                secondary="Request deletion (subject to legal requirements)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Security color="secondary" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Withdraw Consent" 
                secondary="Withdraw consent at any time for marketing communications"
              />
            </ListItem>
          </List>
        </Box>
      )
    },
    {
      id: 'panel4',
      title: 'Data Security & Sharing',
      icon: <Lock />,
      content: (
        <Box>
          <Alert severity="warning" sx={{ mb: 2 }}>
            We never sell your personal information to third parties.
          </Alert>
          <Typography variant="subtitle1" gutterBottom>Security Measures:</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><Lock color="success" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Encryption" 
                secondary="All data encrypted in transit and at rest"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Security color="success" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Access Controls" 
                secondary="Role-based access and multi-factor authentication"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><People color="info" fontSize="small" /></ListItemIcon>
              <ListItemText 
                primary="Limited Sharing" 
                secondary="Only with healthcare providers (with consent) or legal requirements"
              />
            </ListItem>
          </List>
        </Box>
      )
    }
  ];

  return (
    <PrivacyModal open={open} maxWidth="md" fullWidth>
      <DialogTitle sx={{ p: 0 }}>
        <PrivacyHeader>
          <Shield sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4" gutterBottom>
            Privacy Policy
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Please review our privacy policy before proceeding
          </Typography>
        </PrivacyHeader>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }} onScroll={handleScroll}>
        {/* Introduction */}
        <Box mb={3}>
          <Typography variant="body1" paragraph>
            <strong>{businessInfo.name}</strong> is committed to protecting your privacy and personal data. 
            This policy explains how we collect, use, and safeguard your information in compliance with GDPR.
          </Typography>
          <Typography variant="body1" paragraph>
            By proceeding with our consent form, you acknowledge that you have read and understood this privacy policy.
          </Typography>
        </Box>

        {/* Privacy Sections */}
        {privacySections.map((section) => (
          <Accordion
            key={section.id}
            expanded={expanded === section.id}
            onChange={handleChange(section.id)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              sx={{ 
                '& .MuiAccordionSummary-content': { 
                  alignItems: 'center',
                  gap: 1
                }
              }}
            >
              {section.icon}
              <Typography variant="h6" fontSize="1rem">{section.title}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {section.content}
            </AccordionDetails>
          </Accordion>
        ))}

        {/* Contact Information */}
        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="h6" gutterBottom>
            Contact Us About Privacy
          </Typography>
          <Typography variant="body2" paragraph>
            Questions about this policy or want to exercise your rights?
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center">
              <Email color="primary" sx={{ mr: 1, fontSize: 'small' }} />
              <Typography variant="body2">{businessInfo.email}</Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <Phone color="primary" sx={{ mr: 1, fontSize: 'small' }} />
              <Typography variant="body2">{businessInfo.phone}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Scroll indicator */}
        {!hasScrolledToEnd && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Please scroll down to review all sections before proceeding.
            </Typography>
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={onDecline} 
          variant="outlined" 
          color="error"
          startIcon={<Close />}
        >
          Decline & Exit
        </Button>
        <Button 
          onClick={onAccept} 
          variant="contained" 
          color="success"
          disabled={!hasScrolledToEnd}
          startIcon={<CheckCircle />}
        >
          Accept & Continue
        </Button>
      </DialogActions>
    </PrivacyModal>
  );
};

// Main Consent Form Component
const ConsentForm = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    medicalConditions: '',
    currentMedications: '',
    allergies: '',
    previousInjuries: '',
    physicalLimitations: '',
    treatmentConsent: false,
    privacyPolicyConsent: false,
    communicationConsent: false,
    howDidYouHear: '',
    additionalNotes: ''
  });
  const [validationErrors, setValidationErrors] = useState({});

  const businessInfo = {
    name: 'Algo Software Labs Spa',
    address: '123 Main St, City, Country Side California',
    phone: '+12347019606522',
    email: 'spa@algosoftwarelabs.com'
  };

  const getTokenFromUrl = () => {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  };

  const token = getTokenFromUrl();

  useEffect(() => {
    if (token) {
      fetchBookingData();
    } else {
      setError('Invalid consent form link');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Show privacy modal after booking data is loaded
    if (bookingData && !privacyAccepted) {
      setShowPrivacyModal(true);
    }
  }, [bookingData, privacyAccepted]);

  const fetchBookingData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/consent-form/${token}`);

      if (response.data.success) {
        const booking = response.data.booking;
        setBookingData(booking);
        
        // Prefill form data with booking information
        setFormData(prevData => ({
          ...prevData,
          fullName: `${booking.client.firstName} ${booking.client.lastName}`,
          email: booking.client.email || '',
          phone: booking.client.phone || '',
          address: booking.client.address || '',
          dateOfBirth: booking.client.dateOfBirth || '',
          emergencyContactName: booking.client.emergencyContactName || '',
          emergencyContactPhone: booking.client.emergencyContactPhone || '',
          emergencyContactRelationship: booking.client.emergencyContactRelationship || '',
          medicalConditions: booking.client.medicalConditions || '',
          currentMedications: booking.client.currentMedications || '',
          allergies: booking.client.allergies || '',
          previousInjuries: booking.client.previousInjuries || '',
          physicalLimitations: booking.client.physicalLimitations || '',
          howDidYouHear: booking.client.howDidYouHear || '',
          additionalNotes: booking.client.additionalNotes || ''
        }));
        
        setError('');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load booking information. Please check your link and try again.';
      setError(errorMessage);
      console.error('Error fetching booking data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyAccept = () => {
    setPrivacyAccepted(true);
    setShowPrivacyModal(false);
    setFormData(prev => ({ ...prev, privacyPolicyConsent: true }));
  };

  const handlePrivacyDecline = () => {
    setShowPrivacyModal(false);
    // Redirect user away or show a message
    setError('You must accept the privacy policy to continue with the consent form.');
    // Optionally redirect back or close the window
    setTimeout(() => {
      window.history.back();
    }, 3000);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.fullName.trim() || formData.fullName.length < 2 || formData.fullName.length > 100) {
      errors.fullName = 'Full name must be between 2 and 100 characters';
    }
    
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    }
    
    if (!formData.address.trim() || formData.address.length < 10 || formData.address.length > 500) {
      errors.address = 'Address must be between 10 and 500 characters';
    }
    
    if (!formData.emergencyContactName.trim() || formData.emergencyContactName.length < 2 || formData.emergencyContactName.length > 100) {
      errors.emergencyContactName = 'Emergency contact name must be between 2 and 100 characters';
    }
    
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!formData.emergencyContactPhone.match(phoneRegex)) {
      errors.emergencyContactPhone = 'Valid emergency contact phone is required';
    }
    
    if (!formData.emergencyContactRelationship.trim() || formData.emergencyContactRelationship.length < 2 || formData.emergencyContactRelationship.length > 50) {
      errors.emergencyContactRelationship = 'Emergency contact relationship must be between 2 and 50 characters';
    }

    if (formData.medicalConditions && formData.medicalConditions.length > 1000) {
      errors.medicalConditions = 'Medical conditions must not exceed 1000 characters';
    }
    
    if (formData.currentMedications && formData.currentMedications.length > 1000) {
      errors.currentMedications = 'Current medications must not exceed 1000 characters';
    }
    
    if (formData.allergies && formData.allergies.length > 1000) {
      errors.allergies = 'Allergies must not exceed 1000 characters';
    }
    
    if (formData.previousInjuries && formData.previousInjuries.length > 1000) {
      errors.previousInjuries = 'Previous injuries must not exceed 1000 characters';
    }
    
    if (formData.physicalLimitations && formData.physicalLimitations.length > 1000) {
      errors.physicalLimitations = 'Physical limitations must not exceed 1000 characters';
    }
    
    if (formData.howDidYouHear && formData.howDidYouHear.length > 100) {
      errors.howDidYouHear = 'How did you hear about us must not exceed 100 characters';
    }
    
    if (formData.additionalNotes && formData.additionalNotes.length > 1000) {
      errors.additionalNotes = 'Additional notes must not exceed 1000 characters';
    }
    
    if (!formData.treatmentConsent) {
      errors.treatmentConsent = 'Treatment consent must be accepted';
    }
    
    if (!formData.privacyPolicyConsent) {
      errors.privacyPolicyConsent = 'Privacy policy consent must be accepted';
    }
    
    if (!formData.communicationConsent) {
      errors.communicationConsent = 'Communication consent must be accepted';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      const response = await apiClient.post(`/consent-form/${token}`, {
        ...formData,
        treatmentConsent: formData.treatmentConsent.toString(),
        privacyPolicyConsent: formData.privacyPolicyConsent.toString(),
        communicationConsent: formData.communicationConsent.toString()
      });
      
      if (response.data.success) {
        setSuccess(response.data.message || 'Consent form submitted successfully. Your appointment is now confirmed!');
      }
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit consent form. Please try again.';
      
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        setError(err.response.data.errors.join(', '));
      } else {
        setError(errorMessage);
      }
      
      console.error('Error submitting form:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <LoadingScreen>
        <Box textAlign="center">
          <CircularProgress size={48} />
          <Typography variant="h6" mt={2}>
            Loading consent form...
          </Typography>
        </Box>
      </LoadingScreen>
    );
  }

  if (success) {
    return (
      <SuccessScreen>
        <FormCard elevation={3}>
          <Box textAlign="center" p={4}>
            <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Thank You
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
              {success}
            </Typography>
            <Alert severity="success">
              You will receive a confirmation email with your appointment details.
            </Alert>
          </Box>
        </FormCard>
      </SuccessScreen>
    );
  }

  // Show privacy modal or main form based on privacy acceptance
  return (
    <>
      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        open={showPrivacyModal}
        onAccept={handlePrivacyAccept}
        onDecline={handlePrivacyDecline}
        businessInfo={businessInfo}
      />

      {/* Main Form Content */}
      {!showPrivacyModal && (
        <FormContainer maxWidth="md">
          {/* Header */}
          <FormCard elevation={0}>
            <Box display="flex" alignItems="center" justifyContent="between" mb={3}>
              <Typography variant="h4">
                Medical Consent Form
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                {privacyAccepted && (
                  <Chip 
                    label="Privacy Policy Accepted" 
                    color="success" 
                    size="small" 
                    icon={<CheckCircle />}
                  />
                )}
                <Lock color="primary" fontSize="large" />
              </Box>
            </Box>
            
            {bookingData && (
              <AppointmentInfoCard variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Appointment Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Person fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          {bookingData.client.firstName} {bookingData.client.lastName}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Description fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          {bookingData.service.name} - {bookingData.serviceOption.optionName}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <CalendarToday fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          {formatDateTime(bookingData.bookingStartTime)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Phone fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          {bookingData.client.phone}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </AppointmentInfoCard>
            )}
          </FormCard>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} icon={<Error />}>
              {error}
            </Alert>
          )}

          {/* Form - Only show if privacy is accepted */}
          {bookingData && privacyAccepted && (
            <FormCard>
              <Box component="form" onSubmit={handleSubmit}>
                {/* Personal Information */}
                <Box mb={4}>
                  <SectionTitle variant="h5">
                    <Person />
                    Personal Information
                  </SectionTitle>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        error={!!validationErrors.fullName}
                        helperText={validationErrors.fullName}
                        margin="normal"
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        error={!!validationErrors.email}
                        helperText={validationErrors.email}
                        margin="normal"
                        InputProps={{
                          readOnly: true
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        error={!!validationErrors.phone}
                        helperText={validationErrors.phone}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Date of Birth"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        error={!!validationErrors.dateOfBirth}
                        helperText={validationErrors.dateOfBirth}
                        margin="normal"
                        required
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        error={!!validationErrors.address}
                        helperText={validationErrors.address}
                        margin="normal"
                        required
                        multiline
                        rows={3}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Emergency Contact */}
                <Box mb={4}>
                  <SectionTitle variant="h5">
                    <Phone />
                    Emergency Contact
                  </SectionTitle>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Emergency Contact Name"
                        name="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={handleInputChange}
                        error={!!validationErrors.emergencyContactName}
                        helperText={validationErrors.emergencyContactName}
                        margin="normal"
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Emergency Contact Phone"
                        name="emergencyContactPhone"
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={handleInputChange}
                        error={!!validationErrors.emergencyContactPhone}
                        helperText={validationErrors.emergencyContactPhone}
                        margin="normal"
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Relationship to Emergency Contact"
                        name="emergencyContactRelationship"
                        value={formData.emergencyContactRelationship}
                        onChange={handleInputChange}
                        error={!!validationErrors.emergencyContactRelationship}
                        helperText={validationErrors.emergencyContactRelationship}
                        margin="normal"
                        required
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Medical Information */}
                <Box mb={4}>
                  <SectionTitle variant="h5">
                    <Description />
                    Medical Information
                  </SectionTitle>
                  
                  <Grid container spacing={2}>
                    {[
                      { name: 'medicalConditions', label: 'Medical Conditions', placeholder: 'List any medical conditions or write "None"' },
                      { name: 'currentMedications', label: 'Current Medications', placeholder: 'List any medications you are currently taking or write "None"' },
                      { name: 'allergies', label: 'Allergies', placeholder: 'List any allergies or write "None"' },
                      { name: 'previousInjuries', label: 'Previous Injuries', placeholder: 'List any previous injuries or write "None"' },
                      { name: 'physicalLimitations', label: 'Physical Limitations', placeholder: 'List any physical limitations or write "None"' }
                    ].map((field) => (
                      <Grid item xs={12} key={field.name}>
                        <TextField
                          fullWidth
                          label={field.label}
                          name={field.name}
                          value={formData[field.name]}
                          onChange={handleInputChange}
                          error={!!validationErrors[field.name]}
                          helperText={validationErrors[field.name]}
                          margin="normal"
                          multiline
                          rows={3}
                          placeholder={field.placeholder}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Additional Information */}
                <Box mb={4}>
                  <SectionTitle variant="h5">
                    Additional Information
                  </SectionTitle>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="How did you hear about us?"
                        name="howDidYouHear"
                        value={formData.howDidYouHear}
                        onChange={handleInputChange}
                        error={!!validationErrors.howDidYouHear}
                        helperText={validationErrors.howDidYouHear}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Additional Notes"
                        name="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={handleInputChange}
                        error={!!validationErrors.additionalNotes}
                        helperText={validationErrors.additionalNotes}
                        margin="normal"
                        multiline
                        rows={4}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Consent Agreements */}
                <Box mb={4}>
                  <SectionTitle variant="h5">
                    <Lock />
                    Consent Agreements
                  </SectionTitle>
                  
                  <Box display="flex" flexDirection="column" gap={2}>
                    {[
                      {
                        name: 'treatmentConsent',
                        label: 'Treatment Consent',
                        description: 'I consent to receive treatment and understand that results may vary.'
                      },
                      {
                        name: 'privacyPolicyConsent',
                        label: 'Privacy Policy Consent',
                        description: 'I have read and accepted the privacy policy (already confirmed above).',
                        disabled: true
                      },
                      {
                        name: 'communicationConsent',
                        label: 'Communication Consent',
                        description: 'I consent to receive appointment reminders and relevant health information.'
                      }
                    ].map((consent) => (
                      <Box key={consent.name}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              name={consent.name}
                              checked={formData[consent.name]}
                              onChange={handleInputChange}
                              color="primary"
                              disabled={consent.disabled}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="subtitle1">
                                {consent.label} *
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {consent.description}
                              </Typography>
                            </Box>
                          }
                        />
                        {validationErrors[consent.name] && (
                          <FormHelperText error>
                            {validationErrors[consent.name]}
                          </FormHelperText>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Submit Button */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={4}>
                  <Button
                    variant="outlined"
                    onClick={() => setShowPrivacyModal(true)}
                    startIcon={<Shield />}
                    size="small"
                  >
                    Review Privacy Policy
                  </Button>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={submitting}
                    startIcon={submitting ? <Cached /> : null}
                  >
                    {submitting ? 'Submitting...' : 'Submit Consent Form'}
                  </Button>
                </Box>
              </Box>
            </FormCard>
          )}

          {/* Loading Backdrop */}
          <Backdrop open={submitting} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Box textAlign="center">
              <CircularProgress color="inherit" />
              <Typography variant="h6" mt={2}>
                Submitting your consent form...
              </Typography>
            </Box>
          </Backdrop>
        </FormContainer>
      )}
    </>
  );
};

export default ConsentForm;