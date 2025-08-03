import React from 'react';
import { Box, Typography, Grid, Paper, Chip, Divider } from '@mui/material';
import { format, parseISO } from 'date-fns';

// Helper function (can be moved to a utils file)
const getStatusChipColor = (status) => {
    switch (status) {
        case 'Confirmed':
        case 'Completed':
            return 'success';
        case 'Pending Confirmation':
        case 'Pending Payment':
            return 'warning';
        case 'Cancelled By Client':
        case 'Cancelled By Staff':
        case 'No Show':
            return 'error';
        default:
            return 'default';
    }
};

// Component to display detailed booking information
export default function BookingDetailView({ booking }) {
    if (!booking) {
        return <Typography>No booking data provided.</Typography>;
    }

    // Format data for display
    const formattedData = {
        id: booking.id,
        status: booking.status || 'N/A',
        bookingDate: booking.bookingStartTime ? format(parseISO(booking.bookingStartTime), 'EEEE, MMMM do, yyyy') : 'N/A',
        bookingTime: booking.bookingStartTime ? format(parseISO(booking.bookingStartTime), 'p') : 'N/A',
        duration: booking.Service?.duration ? `${booking.Service.duration} min` : 'N/A',
        clientName: `${booking.Client?.firstName || ''} ${booking.Client?.lastName || ''}`.trim() || 'N/A',
        clientEmail: booking.Client?.email || 'N/A',
        clientPhone: booking.Client?.phone || 'N/A',
        serviceName: booking.Service?.name || 'N/A',
        therapistName: `${booking.Therapist?.User?.firstName || ''} ${booking.Therapist?.User?.lastName || ''}`.trim() || 'N/A',
        price: booking.priceAtBooking !== undefined ? `$${parseFloat(booking.priceAtBooking).toFixed(2)}` : 'N/A',
        paymentMethod: booking.paymentMethod || 'N/A',
        paymentStatus: booking.paymentStatus || 'N/A',
        clientNotes: booking.clientNotes || 'None',
        createdAt: booking.createdAt ? format(parseISO(booking.createdAt), 'yyyy-MM-dd HH:mm') : 'N/A',
        updatedAt: booking.updatedAt ? format(parseISO(booking.updatedAt), 'yyyy-MM-dd HH:mm') : 'N/A',
        // Add clinical note info if available and needed
        // clinicalNoteExists: !!booking.ClinicalNote,
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Booking Details</Typography>
            <Grid container spacing={2}>
                {/* Booking Info */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="h6">Booking Information</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography><strong>ID:</strong> {formattedData.id}</Typography>
                    <Typography><strong>Status:</strong> <Chip label={formattedData.status} color={getStatusChipColor(formattedData.status)} size="small" /></Typography>
                    <Typography><strong>Date:</strong> {formattedData.bookingDate}</Typography>
                    <Typography><strong>Time:</strong> {formattedData.bookingTime}</Typography>
                    <Typography><strong>Booked On:</strong> {formattedData.createdAt}</Typography>
                    <Typography><strong>Last Updated:</strong> {formattedData.updatedAt}</Typography>
                </Grid>

                {/* Service & Therapist Info */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="h6">Service & Therapist</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography><strong>Service:</strong> {formattedData.serviceName}</Typography>
                    <Typography><strong>Duration:</strong> {formattedData.duration}</Typography>
                    <Typography><strong>Therapist:</strong> {formattedData.therapistName}</Typography>
                </Grid>

                {/* Client Info */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="h6">Client Information</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography><strong>Name:</strong> {formattedData.clientName}</Typography>
                    <Typography><strong>Email:</strong> {formattedData.clientEmail}</Typography>
                    <Typography><strong>Phone:</strong> {formattedData.clientPhone}</Typography>
                    <Typography><strong>Notes:</strong> {formattedData.clientNotes}</Typography>
                </Grid>

                {/* Payment Info */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="h6">Payment Information</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography><strong>Price:</strong> {formattedData.price}</Typography>
                    <Typography><strong>Method:</strong> {formattedData.paymentMethod}</Typography>
                    <Typography><strong>Status:</strong> <Chip label={formattedData.paymentStatus} color={formattedData.paymentStatus === 'Paid' ? 'success' : (formattedData.paymentStatus === 'Pending' ? 'warning' : 'default')} size="small" /></Typography>
                    {/* TODO: Add insurance details if method is Insurance */}
                </Grid>

                {/* TODO: Add section for Clinical Note summary/link if applicable */}

            </Grid>
        </Paper>
    );
}
