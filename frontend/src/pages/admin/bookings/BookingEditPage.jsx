import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, MenuItem, FormControl, InputLabel, Select, Grid,
    Typography, Divider, Alert, CircularProgress, Box, InputAdornment
} from '@mui/material';
import {
    Person as PersonIcon, Spa as SpaIcon, AccessTime as TimeIcon,
    CalendarToday as DateIcon, AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import apiClient from '../../../services/apiClient';
import useAuth from '../../../hooks/useAuth';
import Scheduler from '../../../components/booking/Scheduler';

const statusOptions = [
    { value: 'Pending Confirmation', label: 'Pending Confirmation' },
    { value: 'Confirmed', label: 'Confirmed' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled By Client', label: 'Cancelled By Client' },
    { value: 'Cancelled By Staff', label: 'Cancelled By Staff' },
    { value: 'No Show', label: 'No Show' }
];

const paymentStatusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Paid', label: 'Paid' },
    { value: 'Refunded', label: 'Refunded' },
    { value: 'Cancelled', label: 'Cancelled' }
];

const paymentMethodOptions = [
    { value: 'Credit Card', label: 'Credit Card' },
    { value: 'Insurance', label: 'Insurance' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Interac', label: 'Interac' }
];

export default function BookingEditModal({
    open,
    onClose,
    booking,
    onSave,
    therapists = []
}) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showScheduler, setShowScheduler] = useState(false);
    const [formData, setFormData] = useState({
        status: '',
        paymentStatus: '',
        paymentMethod: '',
        therapistId: '',
        internalNotes: '',
        price: 0,
        bookingTime: null,
        cancellationReason: '',
        initiatedBy: ''
    });

    useEffect(() => {
        if (booking) {
            setFormData({
                status: booking.status || 'Pending Confirmation',
                paymentStatus: booking.paymentStatus || 'Pending',
                paymentMethod: booking.paymentMethod || '',
                therapistId: booking.therapistId || '',
                internalNotes: booking.internalNotes || '',
                price: booking.price || booking.priceAtBooking || 0,
                bookingTime: booking.bookingStartTime ? new Date(booking.bookingStartTime) : null,
                cancellationReason: booking.cancellationReason || '',
                initiatedBy: booking.initiatedBy || user?.name || user?.email || ''
            });
        }
    }, [booking, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleTimeChange = (newValue) => {
        setFormData(prev => ({
            ...prev,
            bookingTime: newValue
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const updatedBooking = {
                ...formData,
                bookingTime: formData.bookingTime ? formData.bookingTime.toISOString() : undefined,
            };
            // console.log("Booking update payload:", updatedBooking);
            const response = await apiClient.put(`/bookings/${booking.id}`, updatedBooking);
            onSave(response.data);
            onClose();
        } catch (err) {
            console.error('Error updating booking:', err);
            setError(err.response?.data?.message || 'Failed to update booking');
        } finally {
            setLoading(false);
        }
    };

    const safeTherapists = Array.isArray(therapists.therapists)
        ? therapists.therapists
        : Array.isArray(therapists)
            ? therapists
            : [];

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Typography variant="h6">
                        {booking ? 'Edit Booking' : 'Add New Booking'}
                    </Typography>
                    {booking && (
                        <Typography variant="subtitle2" color="text.secondary">
                            ID: {booking.id}
                        </Typography>
                    )}
                </DialogTitle>

                <DialogContent dividers>
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {booking && (
                        <Box sx={{ mb: 3 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <PersonIcon sx={{ mr: 1 }} /> Client Information
                                    </Typography>
                                    <Typography><strong>Name:</strong> {booking.clientName}</Typography>
                                    <Typography><strong>Email:</strong> {booking.clientEmail}</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <SpaIcon sx={{ mr: 1 }} /> Service Information
                                    </Typography>
                                    <Typography><strong>Service:</strong> {booking.serviceName}</Typography>
                                    <Typography><strong>Option:</strong> {booking.optionName}</Typography>
                                    <Typography><strong>Duration:</strong> {booking.duration} min</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <DateIcon sx={{ mr: 1 }} /> Booking Time
                                    </Typography>
                                    <Typography>
                                        {booking.bookingDate} at {booking.bookingTime}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <MoneyIcon sx={{ mr: 1 }} /> Pricing
                                    </Typography>
                                    <Typography><strong>Original Price:</strong> ${parseFloat(booking.priceAtBooking || 0).toFixed(2)}</Typography>
                                </Grid>
                            </Grid>
                            <Divider sx={{ my: 3 }} />
                        </Box>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Booking Status</InputLabel>
                                    <Select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        label="Booking Status"
                                        required
                                    >
                                        {statusOptions.map(option => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Payment Status</InputLabel>
                                    <Select
                                        name="paymentStatus"
                                        value={formData.paymentStatus}
                                        onChange={handleChange}
                                        label="Payment Status"
                                        required
                                    >
                                        {paymentStatusOptions.map(option => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Payment Method</InputLabel>
                                    <Select
                                        name="paymentMethod"
                                        value={formData.paymentMethod}
                                        onChange={handleChange}
                                        label="Payment Method"
                                    >
                                        <MenuItem value="">
                                            <em>Select Payment Method</em>
                                        </MenuItem>
                                        {paymentMethodOptions.map(option => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Assign Therapist</InputLabel>
                                    <Select
                                        name="therapistId"
                                        value={formData.therapistId}
                                        onChange={handleChange}
                                        label="Assign Therapist"
                                    >
                                        <MenuItem value="">
                                            <em>Not Assigned</em>
                                        </MenuItem>
                                        {safeTherapists.map(therapist => (
                                            <MenuItem key={therapist.id} value={therapist.id}>
                                                {therapist.User
                                                    ? `${therapist.User.firstName} ${therapist.User.lastName}`
                                                    : therapist.bio || therapist.id}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <DateIcon sx={{ mr: 1 }} /> Booking Time
                                    </Typography>
                                    <Typography>
                                        {formData.bookingTime
                                            ? format(formData.bookingTime, 'yyyy-MM-dd HH:mm')
                                            : 'No booking time selected'}
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        sx={{ mt: 1 }}
                                        onClick={() => setShowScheduler(true)}
                                    >
                                        Change Booking Time
                                    </Button>
                                </Box>

                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Price"
                                    name="price"
                                    type="number"
                                    value={formData.price}
                                    onChange={handleChange}
                                    inputProps={{ step: "0.01", min: "0" }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">$</InputAdornment>
                                        ),
                                    }}
                                />

                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Internal Notes"
                                    name="internalNotes"
                                    value={formData.internalNotes}
                                    onChange={handleChange}
                                    multiline
                                    rows={4}
                                />

                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Cancellation Reason"
                                    name="cancellationReason"
                                    value={formData.cancellationReason}
                                    onChange={handleChange}
                                    multiline
                                    rows={2}
                                    placeholder="If cancelling, provide a reason"
                                />

                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Initiated By"
                                    name="initiatedBy"
                                    value={formData.initiatedBy}
                                    onChange={handleChange}
                                    placeholder="Who made this change?"
                                />
                            </Grid>
                        </Grid>
                    </form>

                    {/* Scheduler Modal */}
                    {showScheduler && booking && (
                        <Dialog open={showScheduler} onClose={() => setShowScheduler(false)} maxWidth="lg" fullWidth>
                            <DialogTitle>Select New Booking Time</DialogTitle>
                            <DialogContent>
                                <Scheduler
                                    serviceId={booking.serviceId}
                                    serviceOptionId={booking.serviceOptionId}
                                    selectedDateTime={{
                                        date: formData.bookingTime,
                                        time: formData.bookingTime ? format(formData.bookingTime, 'HH:mm') : null
                                    }}
                                    therapistId={formData.therapistId}
                                    onDateTimeSelect={({ date, time }) => {
                                        if (date && time) {
                                            const newDateTime = new Date(`${date}T${time}`);
                                            setFormData(prev => ({
                                                ...prev,
                                                bookingTime: newDateTime
                                            }));
                                            setShowScheduler(false);
                                        }
                                    }}
                                />
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setShowScheduler(false)}>Cancel</Button>
                            </DialogActions>
                        </Dialog>
                    )}
                </DialogContent>
                
                <DialogActions>
                    <Button onClick={onClose} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        color="primary"
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
}