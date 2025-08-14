import React, { useState } from 'react';
import {
  Paper, Typography, Grid, Box, Chip, Button, CircularProgress, Alert, Container, Divider, Card, CardContent
} from '@mui/material';
import {
  CalendarToday, Person, CreditCard, MonetizationOn, Spa, Security, AccountBalance, AttachMoney, SwapHoriz
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useTheme } from '@mui/material/styles';
import apiClient from '../../services/apiClient';

// Helper function to construct payment details
const constructPaymentDetails = (paymentDetails, paymentIntentId, paymentMethodId) => {
  switch (paymentDetails.method) {
    case 'credit_card':
      return {
        token: paymentIntentId,
        stripePaymentIntentId: paymentIntentId,
        stripePaymentMethodId: paymentMethodId
      };
    case 'insurance':
      return {
        provider: paymentDetails.details.provider,
        policyId: paymentDetails.details.policyId
      };
    case 'cash':
    case 'interac':
    default:
      return {};
  }
};

// Payment method display component
function PaymentMethodDisplay({ paymentDetails, theme }) {
  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'credit_card':
        return <CreditCard sx={{ color: 'primary.main', mr: 1 }} />;
      case 'insurance':
        return <AccountBalance sx={{ color: 'primary.main', mr: 1 }} />;
      case 'interac':
        return <SwapHoriz sx={{ color: 'primary.main', mr: 1 }} />;
      case 'cash':
        return <AttachMoney sx={{ color: 'primary.main', mr: 1 }} />;
      default:
        return <CreditCard sx={{ color: 'primary.main', mr: 1 }} />;
    }
  };

  const getPaymentMethodText = (paymentDetails) => {
    switch (paymentDetails.method) {
      case 'credit_card':
        if (paymentDetails.cardBrand && paymentDetails.last4) {
          return `${paymentDetails.cardBrand.toUpperCase()} ending in ****${paymentDetails.last4}`;
        }
        return 'Credit/Debit Card';
      case 'insurance':
        if (paymentDetails.details?.provider && paymentDetails.details?.last4) {
          return `${paymentDetails.details.provider} - Policy ****${paymentDetails.details.last4}`;
        }
        return 'Insurance Coverage';
      case 'interac':
        return 'Interac e-Transfer';
      case 'cash':
        return 'Cash Payment at Appointment';
      default:
        return 'Unknown Payment Method';
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {getPaymentMethodIcon(paymentDetails.method)}
      <Typography variant="body1">
        {getPaymentMethodText(paymentDetails)}
      </Typography>
    </Box>
  );
}

export default function BookingSummary({ bookingData, onBookingComplete }) {
  const theme = useTheme();
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [paymentStep, setPaymentStep] = useState('ready'); // ready, processing, complete

  const { service, serviceOption, dateTime, clientInfo, paymentDetails } = bookingData;

  const formattedDate = dateTime.date ? format(dateTime.date, 'EEEE, MMMM do, yyyy') : 'N/A';
  const formattedTime = dateTime.time || 'N/A';

  const processCardPayment = async () => {
    if (!stripe || !elements) {
      throw new Error('Stripe not loaded');
    }

    setPaymentStep('processing');

    try {
      // Create payment intent
      console.log('Creating payment intent...');
      const paymentIntentResponse = await apiClient.post('/payments/create-intent', {
        amount: Math.round(parseFloat(bookingData.serviceOption.price) * 100),
        currency: 'CAD',
        bookingData: {
          serviceOptionId: bookingData.serviceOption.id,
          clientInfo: bookingData.clientInfo,
          dateTime: bookingData.dateTime,
          therapistId: bookingData.therapistId,
          clientNotes: bookingData.clientInfo.notes
        },
        metadata: {
          service_name: bookingData.service.name,
          service_option: bookingData.serviceOption.optionName,
          client_email: bookingData.clientInfo.email,
          booking_date: bookingData.dateTime.date,
          booking_time: bookingData.dateTime.time
        }
      });

      const { client_secret } = paymentIntentResponse.data;
      console.log('Payment intent created successfully');

      // Use the payment method ID that was created during card validation
      if (paymentDetails.paymentMethodId) {
        // Confirm payment with existing payment method
        const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
          payment_method: paymentDetails.paymentMethodId
        });

        if (error) {
          console.error('Payment confirmation error:', error);
          throw new Error(error.message);
        }

        if (paymentIntent.status !== 'succeeded') {
          throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
        }

        console.log('Payment confirmed successfully:', paymentIntent.id);
        setPaymentStep('complete');

        return {
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentIntent.payment_method,
        };
      } else {
        throw new Error('No payment method available');
      }
    } catch (error) {
      setPaymentStep('ready');
      throw error;
    }
  };

  const handleBookNow = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      let dateStr = bookingData.dateTime.date;
      if (dateStr instanceof Date) {
        const year = dateStr.getFullYear();
        const month = String(dateStr.getMonth() + 1).padStart(2, '0');
        const day = String(dateStr.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }

      const timeStr = bookingData.dateTime.time;
      let hour, minute;

      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const [timePart, ampm] = timeStr.split(/\s+(AM|PM)/i);
        const [h, m] = timePart.split(':').map(Number);
        if (ampm.toUpperCase() === 'PM' && h !== 12) {
          hour = h + 12;
        } else if (ampm.toUpperCase() === 'AM' && h === 12) {
          hour = 0;
        } else {
          hour = h;
        }
        minute = m;
      } else {
        const timeParts = timeStr.split(':');
        hour = Number(timeParts[0]);
        minute = Number(timeParts[1]);
      }

      const bookingTime = new Date(Date.UTC(
        Number(dateStr.substring(0, 4)),
        Number(dateStr.substring(5, 7)) - 1,
        Number(dateStr.substring(8, 10)),
        hour,
        minute,
        0
      )).toISOString();

      let constructedPaymentDetails = {};
      let paymentResult = null;

      // Process payment if it's a credit card
      if (paymentDetails.method === 'credit_card') {
        paymentResult = await processCardPayment();
        constructedPaymentDetails = constructPaymentDetails(
          paymentDetails,
          paymentResult.paymentIntentId,
          paymentResult.paymentMethodId
        );
      } else {
        constructedPaymentDetails = constructPaymentDetails(paymentDetails);
      }

      const payload = {
        serviceOptionId: bookingData.serviceOption.id,
        bookingTime,
        clientDetails: bookingData.clientInfo,
        paymentMethod:
          paymentDetails.method === 'credit_card'
            ? 'Credit Card'
            : paymentDetails.method === 'insurance'
            ? 'Insurance'
            : paymentDetails.method === 'interac'
            ? 'interac'
            : 'Cash',
        paymentDetails: constructedPaymentDetails,
        therapistId: bookingData.therapistId,
        clientNotes: bookingData.clientInfo.notes
      };

      console.log('Creating booking with payload:', payload);
      const response = await apiClient.post('/bookings', payload);

      if (onBookingComplete) {
        onBookingComplete(response.data);
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        error.response?.data?.errors ||
        error.message ||
        'Booking submission failed.';
      setSubmissionError(errorMessage);
      setPaymentStep('ready');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 0 }}>
      <Paper sx={{ 
        p: { xs: 2, sm: 3, md: 4 }, 
        borderRadius: 4, 
        backgroundColor: theme.palette.background.paper,
        border: theme.palette.mode === 'dark' ? '1px solid' : 'none',
        borderColor: theme.palette.mode === 'dark' ? 'divider' : 'transparent'
      }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: 'center', color: theme.palette.text.primary }}>
          Booking Summary
        </Typography>

        <Grid container spacing={2} justifyContent="space-between" ml={8}>
          {/* Row 1: Service Details + Payment Method */}
          <Grid item xs={12} md={6}>
            <Section title="Service Details" icon={<Spa />} theme={theme}>
              <Item label="Service:" value={service?.name || 'N/A'} />
              <Item
                label="Option:"
                value={
                  serviceOption
                    ? `${serviceOption.optionName || ''} - ${serviceOption.price} (${serviceOption.duration} min)`
                    : 'N/A'
                }
              />
            </Section>
          </Grid>

          <Grid item xs={12} md={6}>
            <Section title="Payment Method" icon={<Security />} theme={theme}>
              <Item 
                value={<PaymentMethodDisplay paymentDetails={paymentDetails} theme={theme} />} 
                fullWidth 
              />
            </Section>
          </Grid>

          {/* Divider */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2, borderColor: theme.palette.divider }} />
          </Grid>

          {/* Row 2: Appointment + Summary */}
          <Grid item xs={12} md={6}>
            <Section title="Appointment" icon={<CalendarToday />} theme={theme}>
              <Item value={`${formattedDate} at ${formattedTime}`} fullWidth />
            </Section>
          </Grid>

          <Grid item xs={12} md={6}>
            <Section title="Summary" icon={<MonetizationOn />} theme={theme}>
              <Item
                label="Total:"
                value={
                  <Chip
                    label={`${serviceOption?.price ? Number(serviceOption.price).toFixed(2) : '0.00'}`}
                    color="primary"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      px: 2,
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText
                    }}
                  />
                }
                fullWidth
              />
            </Section>
          </Grid>

          {/* Divider */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2, borderColor: theme.palette.divider }} />
          </Grid>

          {/* Row 3: Client Information full width */}
          <Grid item xs={12}>
            <Section title="Client Information" icon={<Person />} theme={theme}>
              <Item label="Name:" value={`${clientInfo.firstName} ${clientInfo.lastName}`} />
              <Item label="Email:" value={clientInfo.email} />
              <Item label="Phone:" value={clientInfo.phone} />
              {clientInfo.notes && (
                <Item label="Notes:" value={clientInfo.notes} fullWidth />
              )}
            </Section>
          </Grid>
        </Grid>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          Please review your booking details before confirming.
        </Typography>

        {submissionError && (
          <Alert severity="error" sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}>
            {submissionError}
          </Alert>
        )}

        {/* Payment Processing Status */}
        {paymentStep === 'processing' && (
          <Card sx={{ mt: 3, bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'info.50', maxWidth: 600, mx: 'auto' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Processing Payment...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please do not refresh or close this page while we process your payment.
              </Typography>
            </CardContent>
          </Card>
        )}

        {paymentStep === 'complete' && (
          <Alert severity="success" sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              ✓ Payment Processed Successfully!
            </Typography>
            <Typography variant="body2">
              Creating your booking...
            </Typography>
          </Alert>
        )}

        <Box
          sx={{
            mt: 4,
            mb: 2,
            textAlign: 'center',
            p: { xs: 2, md: 3 },
            backgroundColor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50',
            borderRadius: 2,
            border: '2px solid',
            borderColor: 'primary.main',
            maxWidth: 500,
            mx: 'auto'
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{ 
              mb: 2, 
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              color: theme.palette.text.primary
            }}
          >
            {paymentDetails.method === 'credit_card' && paymentStep !== 'complete' 
              ? 'Ready to process payment and confirm booking?'
              : 'Ready to confirm your booking?'
            }
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleBookNow}
            disabled={isSubmitting || paymentStep === 'processing'}
            sx={{
              minWidth: { xs: 200, sm: 220, md: 180 },
              py: { xs: 1.5, md: 1.2 },
              px: { xs: 3, md: 2.5 },
              fontSize: { xs: '1rem', md: '0.95rem' },
              fontWeight: 'bold',
              boxShadow: 3,
              '&:hover': { boxShadow: 6 }
            }}
          >
            {isSubmitting ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1, color: 'grey' }} />
                {paymentStep === 'processing' ? 'Processing Payment...' : 'Creating Booking...'}
              </>
            ) : paymentDetails.method === 'credit_card' && paymentStep !== 'complete' ? (
              'Pay & Book Now'
            ) : (
              'Book Now'
            )}
          </Button>
          
          {paymentDetails.method === 'credit_card' && paymentStep === 'ready' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              <Security sx={{ fontSize: 12, mr: 0.5 }} />
              Payment will be processed securely before booking confirmation
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Processing Overlay */}
      {paymentStep === 'processing' && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <Card sx={{ 
            p: 4, 
            minWidth: 300, 
            textAlign: 'center',
            backgroundColor: theme.palette.background.paper
          }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom color="text.primary">
              Processing Payment...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please do not refresh or close this page
            </Typography>
          </Card>
        </Box>
      )}
    </Container>
  );
}

function Section({ title, icon, children, theme }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight={600} color="text.primary">
          {title}
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {children}
      </Grid>
      <Divider sx={{ mt: 3, borderColor: theme.palette.divider }} />
    </Box>
  );
}

function Item({ label, value, icon, fullWidth = false }) {
  return (
    <Grid item xs={12} sm={fullWidth ? 12 : 6} sx={{ mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} sx={{ minHeight: 32 }}>
        {icon}
        <Box>
          {label && (
            <Typography
              component="span"
              color="text.secondary"
              fontWeight="bold"
              sx={{ fontSize: '0.875rem' }}
            >
              {label}
            </Typography>
          )}
          <Typography component="div" sx={{ wordBreak: 'break-word', fontSize: '0.95rem', color: 'text.primary' }}>
            {value}
          </Typography>
        </Box>
      </Box>
    </Grid>
  );
}