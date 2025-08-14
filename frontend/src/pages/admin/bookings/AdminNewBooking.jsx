import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Button, Alert, CircularProgress, 
    TextField, MenuItem, Grid, Card, CardContent, FormControl,
    InputLabel, Select, Chip, Dialog, DialogTitle, DialogContent, 
    DialogActions, Stack, Divider, Avatar, Badge, alpha, Fade, Slide
} from '@mui/material';
import {
    ArrowBack, CheckCircle, Person, Spa, CalendarToday, 
    Payment, Save, Phone, Email, Schedule, AttachMoney,
    AccessTime, PersonAdd, CreditCard, AccountBalance,
    LocalAtm, SwapHoriz, ErrorOutline
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { styled, useTheme } from '@mui/material/styles';
import apiClient from '../../../services/apiClient';
import Scheduler from '../../../components/booking/Scheduler'; // Import the working Scheduler

// Custom Styled Components
const StyledCard = styled(Card)(({ theme, selected }) => ({
    borderRadius: 16,
    border: selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${alpha(theme.palette.grey[300], 0.5)}`,
    boxShadow: selected 
        ? `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}` 
        : '0 2px 12px rgba(0,0,0,0.08)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    background: selected 
        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`
        : '#ffffff',
    '&:hover': {
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        transform: 'translateY(-2px)',
    },
    position: 'relative',
    overflow: 'visible'
}));

const SectionHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2, 0),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    position: 'relative',
    '&::after': {
        content: '""',
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 40,
        height: 2,
        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
        borderRadius: 1
    }
}));

const TimeSlotChip = styled(Chip)(({ theme, selected }) => ({
    borderRadius: 12,
    fontWeight: 600,
    fontSize: '0.875rem',
    padding: '8px 16px',
    height: 'auto',
    minHeight: 40,
    transition: 'all 0.2s ease',
    border: selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${alpha(theme.palette.grey[400], 0.5)}`,
    background: selected 
        ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
        : alpha(theme.palette.grey[50], 0.8),
    color: selected ? '#ffffff' : theme.palette.text.primary,
    '&:hover': {
        background: selected 
            ? `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
            : alpha(theme.palette.primary.main, 0.1),
        transform: 'scale(1.05)',
        borderColor: theme.palette.primary.main
    },
    '& .MuiChip-label': {
        padding: 0
    }
}));

const PaymentMethodCard = styled(Card)(({ theme, selected }) => ({
    borderRadius: 12,
    border: selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${alpha(theme.palette.grey[300], 0.5)}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: selected 
        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.light, 0.04)} 100%)`
        : '#ffffff',
    '&:hover': {
        borderColor: theme.palette.primary.main,
        boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
        transform: 'translateY(-1px)'
    }
}));

// Success Dialog Component
function BookingSuccessDialog({ open, onClose, bookingResult }) {
    const theme = useTheme();
    
    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="sm" 
            fullWidth
            TransitionComponent={Fade}
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, #ffffff 100%)`,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                }
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                <Avatar sx={{ 
                    bgcolor: 'success.main', 
                    width: 60, 
                    height: 60, 
                    mx: 'auto', 
                    mb: 2,
                    boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.3)}`
                }}>
                    <CheckCircle sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                    Booking Created Successfully!
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
                <Typography variant="body1" sx={{ mb: 3, fontSize: '1.1rem' }}>
                    The walk-in booking has been confirmed and is ready for service.
                </Typography>
                {bookingResult && (
                    <Paper sx={{ 
                        p: 3, 
                        bgcolor: alpha(theme.palette.success.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                        borderRadius: 2
                    }}>
                        <Stack spacing={1}>
                            <Typography variant="h6" color="success.main">
                                Booking ID: {bookingResult.id}
                            </Typography>
                            <Chip 
                                label="CONFIRMED" 
                                color="success" 
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                            />
                        </Stack>
                    </Paper>
                )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
                <Button 
                    onClick={onClose} 
                    variant="contained" 
                    size="large"
                    sx={{ 
                        minWidth: 120,
                        borderRadius: 2,
                        fontWeight: 'bold'
                    }}
                >
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default function AdminNewBooking() {
    const navigate = useNavigate();
    const theme = useTheme();
    
    // States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);
    
    // Data states
    const [services, setServices] = useState([]);
    const [therapists, setTherapists] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    
    // Form data - simplified to match backend structure
    const [formData, setFormData] = useState({
        serviceId: '',
        serviceOptionId: '',
        dateTime: { date: format(new Date(), 'yyyy-MM-dd'), time: null },
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        notes: '',
        therapistId: '',
        paymentMethod: 'Cash',
        price: 0,
        duration: 0
    });

    // Load initial data
    useEffect(() => {
        fetchServices();
        fetchTherapists();
    }, []);

    // Date time callback to match customer booking
    const handleDateTimeSelect = useCallback((dateTime) => {
        console.log('DateTime selected:', dateTime);
        setFormData(prev => ({ ...prev, dateTime }));
    }, []);

    const fetchServices = async () => {
        try {
            const response = await apiClient.get('/services?isActive=true&includeOptions=true');
            setServices(response.data || []);
        } catch (err) {
            console.error('Error fetching services:', err);
            setError('Failed to load services');
        }
    };

    const fetchTherapists = async () => {
        try {
            const response = await apiClient.get('/therapists');
            setTherapists(response.data?.therapists || response.data || []);
        } catch (err) {
            console.error('Error fetching therapists:', err);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Auto-update price and duration when service option changes
        if (field === 'serviceOptionId') {
            const selectedService = services.find(s => s.id === formData.serviceId);
            const selectedOption = selectedService?.ServiceOptions?.find(opt => opt.id === value);
            if (selectedOption) {
                setFormData(prev => ({
                    ...prev,
                    price: selectedOption.price,
                    duration: selectedOption.duration
                }));
            }
        }

        // Reset dateTime when service changes
        if (field === 'serviceId' || field === 'serviceOptionId') {
            setFormData(prev => ({ ...prev, dateTime: { date: prev.dateTime.date, time: null } }));
        }
    };

    const validateForm = () => {
        console.group('🔍 FORM VALIDATION DEBUG');
        setError(null);
        
        console.log('Current Form Data:', JSON.stringify(formData, null, 2));
        
        // Check required fields
        const required = [
            { field: 'serviceOptionId', name: 'Service Option' },
            { field: 'firstName', name: 'First Name' },
            { field: 'lastName', name: 'Last Name' },
            { field: 'email', name: 'Email' },
            { field: 'phone', name: 'Phone' },
            { field: 'paymentMethod', name: 'Payment Method' }
        ];
        
        console.log('Checking required fields...');
        for (let { field, name } of required) {
            const value = formData[field];
            const isValid = value && value.toString().trim() !== '';
            console.log(`${name} (${field}):`, value, isValid ? '✅' : '❌');
            
            if (!isValid) {
                console.error(`❌ Validation failed: ${name} is required`);
                console.groupEnd();
                setError(`${name} is required`);
                return false;
            }
        }

        // Check dateTime structure (date and time both required)
        console.log('Checking dateTime...');
        console.log('dateTime.date:', formData.dateTime?.date);
        console.log('dateTime.time:', formData.dateTime?.time);
        
        if (!formData.dateTime?.date || !formData.dateTime?.time) {
            console.error('❌ Validation failed: Date and time are required');
            console.groupEnd();
            setError('Please select both date and time');
            return false;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailValid = emailRegex.test(formData.email);
        console.log('Email validation:', formData.email, emailValid ? '✅' : '❌');
        
        if (!emailValid) {
            console.error('❌ Validation failed: Invalid email');
            console.groupEnd();
            setError('Please enter a valid email address');
            return false;
        }
        
        // Phone validation (basic)
        const phoneValid = formData.phone.length >= 10;
        console.log('Phone validation:', formData.phone, phoneValid ? '✅' : '❌');
        
        if (!phoneValid) {
            console.error('❌ Validation failed: Invalid phone');
            console.groupEnd();
            setError('Please enter a valid phone number (at least 10 digits)');
            return false;
        }
        
        console.log('✅ All validations passed!');
        console.groupEnd();
        return true;
    };

    const handleSubmit = async () => {
        console.group('🚀 SUBMIT BOOKING');
        console.log('Submit function called at:', new Date().toISOString());

        if (!validateForm()) {
            console.error('❌ Form validation failed, stopping submission');
            console.groupEnd();
            return;
        }

        console.log('✅ Form validation passed, proceeding with booking creation...');

        setLoading(true);
        setError(null);

        try {
            // Create the bookingTime in ISO format
            // Parse the time (format: "HH:MM")
            const [hours, minutes] = formData.dateTime.time.split(':').map(num => parseInt(num, 10));
            
            // Create booking date-time
            const bookingDateTime = new Date(formData.dateTime.date);
            bookingDateTime.setHours(hours, minutes, 0, 0);
            const bookingTime = bookingDateTime.toISOString();

            console.log('Constructed booking time:', bookingTime);

            // Create payload that exactly matches your backend expectations
            const payload = {
                serviceOptionId: formData.serviceOptionId,
                bookingTime: bookingTime,
                clientDetails: {
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    email: formData.email.trim().toLowerCase(),
                    phone: formData.phone.trim(),
                    notes: formData.notes.trim()
                },
                clientNotes: formData.notes.trim(),
                paymentMethod: formData.paymentMethod,
                paymentDetails: {},
                therapistId: formData.therapistId && formData.therapistId.trim() !== '' ? formData.therapistId : null
            };

            console.log('Final payload:', JSON.stringify(payload, null, 2));
            
            const response = await apiClient.post('/bookings', payload);
            
            console.log('✅ Booking created successfully:', response.data);
            setBookingResult(response.data);
            setSuccess(true);
            
        } catch (err) {
            console.error('❌ Error creating booking:', err);
            console.error('Error response:', err.response?.data);
            
            // Enhanced error handling
            let errorMessage = 'Failed to create booking';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data?.errors) {
                if (Array.isArray(err.response.data.errors)) {
                    errorMessage = err.response.data.errors.map(e => e.msg || e.message || e).join(', ');
                } else if (typeof err.response.data.errors === 'string') {
                    errorMessage = err.response.data.errors;
                } else {
                    errorMessage = JSON.stringify(err.response.data.errors);
                }
            } else if (err.response?.status === 400) {
                errorMessage = 'Invalid booking data. Please check all fields and try again.';
            } else if (err.response?.status === 409) {
                errorMessage = 'Time slot is no longer available. Please select a different time.';
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
            console.groupEnd();
        }
    };

    const selectedService = services.find(s => s.id === formData.serviceId);
    const serviceOptions = selectedService?.ServiceOptions || [];

    const paymentMethods = [
        { value: 'Cash', icon: <LocalAtm />, description: 'Payment at appointment' },
        { value: 'Credit Card', icon: <CreditCard />, description: 'Process with POS terminal' },
        { value: 'Interac', icon: <SwapHoriz />, description: 'e-Transfer sent before appointment' },
        { value: 'Insurance', icon: <AccountBalance />, description: 'Coverage verification required' }
    ];

    return (
        <Box sx={{ 
            minHeight: '100vh',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
            pb: 4
        }}>
            {/* Header */}
            <Paper sx={{ 
                p: 3, 
                mb: 4, 
                borderRadius: 0,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
                <Box sx={{ maxWidth: 1200, mx: 'auto', display: 'flex', alignItems: 'center' }}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/admin/bookings')}
                        sx={{ 
                            mr: 3,
                            color: 'white',
                            '&:hover': {
                                bgcolor: alpha('#ffffff', 0.1)
                            }
                        }}
                    >
                        Back to Bookings
                    </Button>
                    <Box>
                        <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
                            New Walk-in Booking
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9 }}>
                            Create a confirmed booking for walk-in clients
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
                {error && (
                    <Slide direction="down" in={!!error}>
                        <Alert 
                            severity="error" 
                            sx={{ 
                                mb: 3, 
                                borderRadius: 2,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                            icon={<ErrorOutline />}
                        >
                            {error}
                        </Alert>
                    </Slide>
                )}

                <Grid container spacing={4}>
                    {/* Service Selection - Full Width */}
                    <Grid item xs={12}>
                        <StyledCard selected={formData.serviceId && formData.serviceOptionId}>
                            <CardContent sx={{ p: 4 }}>
                                <SectionHeader>
                                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                        <Spa />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">
                                            Service Selection
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Choose the service and duration
                                        </Typography>
                                    </Box>
                                </SectionHeader>
                                
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={4}>
                                        <FormControl fullWidth variant="outlined">
                                            <InputLabel>Service Type</InputLabel>
                                            <Select
                                                value={formData.serviceId}
                                                onChange={(e) => {
                                                    handleInputChange('serviceId', e.target.value);
                                                    handleInputChange('serviceOptionId', '');
                                                }}
                                                label="Service Type"
                                                sx={{ borderRadius: 2 }}
                                            >
                                                {services.map(service => (
                                                    <MenuItem key={service.id} value={service.id}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Spa sx={{ mr: 2, color: 'primary.main' }} />
                                                            {service.name}
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={12} md={5}>
                                        <FormControl fullWidth variant="outlined">
                                            <InputLabel>Duration & Price</InputLabel>
                                            <Select
                                                value={formData.serviceOptionId}
                                                onChange={(e) => handleInputChange('serviceOptionId', e.target.value)}
                                                label="Duration & Price"
                                                disabled={!formData.serviceId}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                {serviceOptions.map(option => (
                                                    <MenuItem key={option.id} value={option.id}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <AccessTime sx={{ mr: 2, color: 'primary.main' }} />
                                                                <Box>
                                                                    <Typography variant="body1" fontWeight="medium">
                                                                        {option.optionName}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {option.duration} minutes
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                            <Chip 
                                                                label={`$${option.price}`} 
                                                                color="primary" 
                                                                size="small"
                                                                sx={{ fontWeight: 'bold' }}
                                                            />
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        {formData.price > 0 && (
                                            <Paper sx={{ 
                                                p: 3, 
                                                bgcolor: alpha(theme.palette.success.main, 0.05),
                                                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                                borderRadius: 2,
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                                        <AttachMoney sx={{ color: 'success.main', mr: 1 }} />
                                                        <Typography variant="h5" color="success.main" fontWeight="bold">
                                                            ${formData.price}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {formData.duration} minutes
                                                    </Typography>
                                                </Box>
                                            </Paper>
                                        )}
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </StyledCard>
                    </Grid>

                    {/* Date & Time Selection - Full Width */}
                    <Grid item xs={12}>
                        <StyledCard selected={formData.dateTime.date && formData.dateTime.time}>
                            <CardContent sx={{ p: 4 }}>
                                <SectionHeader>
                                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                        <CalendarToday />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">
                                            Schedule Appointment
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Select date, time, and therapist
                                        </Typography>
                                    </Box>
                                </SectionHeader>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <FormControl fullWidth variant="outlined">
                                            <InputLabel>Preferred Therapist (Optional)</InputLabel>
                                            <Select
                                                value={formData.therapistId}
                                                onChange={(e) => handleInputChange('therapistId', e.target.value)}
                                                label="Preferred Therapist (Optional)"
                                                sx={{ borderRadius: 2 }}
                                            >
                                                <MenuItem value="">
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Person sx={{ mr: 2, color: 'text.secondary' }} />
                                                        Any Available Therapist
                                                    </Box>
                                                </MenuItem>
                                                {therapists.map(therapist => (
                                                    <MenuItem key={therapist.id} value={therapist.id}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Person sx={{ mr: 2, color: 'primary.main' }} />
                                                            {therapist.User?.firstName} {therapist.User?.lastName}
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={12}>
                                        {/* Use the working Scheduler component */}
                                        <Scheduler
                                            serviceId={formData.serviceId}
                                            serviceOptionId={formData.serviceOptionId}
                                            selectedDateTime={formData.dateTime}
                                            onDateTimeSelect={handleDateTimeSelect}
                                            therapistId={formData.therapistId}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </StyledCard>
                    </Grid>

                    {/* Client Information */}
                    <Grid item xs={12} lg={6}>
                        <StyledCard selected={formData.firstName && formData.lastName && formData.email && formData.phone}>
                            <CardContent sx={{ p: 4 }}>
                                <SectionHeader>
                                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                        <PersonAdd />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">
                                            Client Information
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Enter client contact details
                                        </Typography>
                                    </Box>
                                </SectionHeader>
                                
                                <Stack spacing={3}>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <TextField
                                            fullWidth
                                            label="First Name"
                                            value={formData.firstName}
                                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                                            required
                                            variant="outlined"
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Last Name"
                                            value={formData.lastName}
                                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                                            required
                                            variant="outlined"
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        />
                                    </Box>

                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        required
                                        variant="outlined"
                                        InputProps={{
                                            startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="Phone Number"
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        required
                                        variant="outlined"
                                        InputProps={{
                                            startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="Special Notes (Optional)"
                                        multiline
                                        rows={3}
                                        value={formData.notes}
                                        onChange={(e) => handleInputChange('notes', e.target.value)}
                                        placeholder="Medical conditions, preferences, special requests..."
                                        variant="outlined"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />
                                </Stack>
                            </CardContent>
                        </StyledCard>
                    </Grid>

                    {/* Payment Method */}
                    <Grid item xs={12} lg={6}>
                        <StyledCard selected={formData.paymentMethod}>
                            <CardContent sx={{ p: 4 }}>
                                <SectionHeader>
                                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                        <Payment />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">
                                            Payment Method
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            How will the client pay?
                                        </Typography>
                                    </Box>
                                </SectionHeader>

                                <Stack spacing={2}>
                                    {paymentMethods.map(method => (
                                        <PaymentMethodCard 
                                            key={method.value}
                                            selected={formData.paymentMethod === method.value}
                                            onClick={() => handleInputChange('paymentMethod', method.value)}
                                        >
                                            <CardContent sx={{ p: 2 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Avatar sx={{ 
                                                        bgcolor: formData.paymentMethod === method.value ? 'primary.main' : 'grey.100',
                                                        color: formData.paymentMethod === method.value ? 'white' : 'text.secondary',
                                                        mr: 2,
                                                        width: 40,
                                                        height: 40
                                                    }}>
                                                        {method.icon}
                                                    </Avatar>
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Typography variant="body1" fontWeight="medium">
                                                            {method.value}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {method.description}
                                                        </Typography>
                                                    </Box>
                                                    {formData.paymentMethod === method.value && (
                                                        <CheckCircle sx={{ color: 'primary.main' }} />
                                                    )}
                                                </Box>
                                            </CardContent>
                                        </PaymentMethodCard>
                                    ))}
                                </Stack>
                            </CardContent>
                        </StyledCard>
                    </Grid>
                </Grid>

                {/* Debug Section - Remove this in production */}
                {process.env.NODE_ENV === 'development' && (
                    <Grid container spacing={4}>
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mt: 4 }}>
                                <Typography variant="h6" gutterBottom>Debug Info (Development Only)</Typography>
                                <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                                    {JSON.stringify({
                                        formData,
                                        selectedService,
                                        serviceOptions: serviceOptions.length
                                    }, null, 2)}
                                </pre>
                            </Paper>
                        </Grid>
                    </Grid>
                )}

                {/* Action Button */}
                <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
                    <Paper 
                        elevation={0}
                        sx={{ 
                            p: 4, 
                            borderRadius: 3,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                            minWidth: 400,
                            textAlign: 'center'
                        }}
                    >
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                            Ready to Create Booking?
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Review all details above and confirm the walk-in appointment
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleSubmit}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                            sx={{ 
                                minWidth: 200, 
                                py: 1.5,
                                px: 4,
                                borderRadius: 2,
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                                '&:hover': {
                                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.4)}`
                                },
                                '&:disabled': {
                                    background: alpha(theme.palette.action.disabled, 0.12),
                                    color: theme.palette.action.disabled
                                }
                            }}
                        >
                            {loading ? 'Creating Booking...' : 'Create Confirmed Booking'}
                        </Button>
                    </Paper>
                </Box>

                {/* Success Dialog */}
                <BookingSuccessDialog
                    open={success}
                    onClose={() => {
                        setSuccess(false);
                        navigate('/admin/bookings');
                    }}
                    bookingResult={bookingResult}
                />
            </Box>
        </Box>
    );
} 