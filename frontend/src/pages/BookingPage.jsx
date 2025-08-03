import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Container,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  useMediaQuery,
  useTheme,
  LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import ServiceSelector from '../components/booking/ServiceSelector';
import Scheduler from '../components/booking/Scheduler';
import ClientForm from '../components/booking/ClientForm';
import PaymentSection from '../components/booking/PaymentSection';
import BookingSummary from '../components/booking/BookingSummary';
import apiClient from '../services/apiClient';

const steps = ['Select Service', 'Choose Date & Time', 'Your Details', 'Payment', 'Review Booking'];

// Helper function to map frontend payment methods to backend expected values
const mapPaymentMethodToBackend = (frontendMethod) => {
  const paymentMethodMap = {
    'credit_card': 'Credit Card',
    'insurance': 'Insurance',
    'cash': 'Cash',
    'interac': 'interac'
  };
  return paymentMethodMap[frontendMethod] || frontendMethod;
};

// Helper function to construct payment details based on method
const constructPaymentDetails = (paymentDetails, paymentIntentId, paymentMethodId) => {
  switch (paymentDetails.method) {
    case 'credit_card':
      return {
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

// Helper function to construct booking time
const constructBookingTime = (dateTime) => {
  let dateStr = dateTime.date;

  // Handle Date object
  if (dateStr instanceof Date) {
    const year = dateStr.getFullYear();
    const month = String(dateStr.getMonth() + 1).padStart(2, '0');
    const day = String(dateStr.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  }

  const timeStr = dateTime.time;

  // Parse time (handle both 12-hour and 24-hour formats)
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

  // Construct ISO string in UTC
  const bookingTime = new Date(Date.UTC(
    Number(dateStr.substring(0, 4)),
    Number(dateStr.substring(5, 7)) - 1,
    Number(dateStr.substring(8, 10)),
    hour,
    minute,
    0
  ));

  return bookingTime.toISOString();
};

// Hidden CardElement component that stays mounted throughout the entire process
function HiddenCardElement({ onCardReady, paymentMethod }) {
  const [cardError, setCardError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const cardElementRef = useRef(null);

  const handleCardChange = (event) => {
    const errorMsg = event.error ? event.error.message : null;
    setCardError(errorMsg);
    setCardComplete(event.complete);
    
    // Notify parent about card state
    onCardReady({
      cardComplete: event.complete,
      cardError: errorMsg,
      cardElement: cardElementRef.current
    });
  };

  const handleCardReady = (element) => {
    cardElementRef.current = element;
    onCardReady({
      cardComplete: false,
      cardError: null,
      cardElement: element
    });
  };

  // Only render when credit card is selected
  if (paymentMethod !== 'credit_card') {
    return null;
  }

  return (
    <Box sx={{ 
      position: 'absolute', 
      top: -9999, 
      left: -9999, 
      width: 1, 
      height: 1, 
      overflow: 'hidden' 
    }}>
      <CardElement
        onReady={handleCardReady}
        onChange={handleCardChange}
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            },
          },
        }}
      />
    </Box>
  );
}

// Main BookingPage Component
function BookingPageContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Use Stripe hooks directly in the booking page
  const stripe = useStripe();
  const elements = useElements();

  const [activeStep, setActiveStep] = useState(0);
  const [bookingData, setBookingData] = useState({
    service: null,
    serviceOption: null,
    dateTime: { date: null, time: null },
    clientInfo: { firstName: '', lastName: '', email: '', phone: '', notes: '' },
    paymentDetails: { method: 'credit_card', details: {}, cardComplete: false },
    therapistId: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  
  // Hidden card element state
  const [hiddenCardState, setHiddenCardState] = useState({
    cardComplete: false,
    cardError: null,
    cardElement: null
  });

  // Memoized handlers to prevent infinite re-renders
  const handleServiceSelect = useCallback((service, option) => {
    setBookingData((prev) => ({
      ...prev,
      service,
      serviceOption: option,
      dateTime: { date: null, time: null }, // reset date/time on service change
    }));
  }, []);

  const handleDateTimeSelect = useCallback((dateTime) => {
    setBookingData((prev) => ({ ...prev, dateTime }));
  }, []);

  const handleClientInfoChange = useCallback((clientInfo) => {
    setBookingData((prev) => ({ ...prev, clientInfo }));
  }, []);

  const handlePaymentDetailsChange = useCallback((paymentDetails) => {
    setBookingData((prev) => ({ ...prev, paymentDetails }));
  }, []);

  const handleHiddenCardReady = useCallback((cardState) => {
    setHiddenCardState(cardState);
  }, []);

  // Enhanced validation with payment method specific checks
  const isStepComplete = () => {
    switch (activeStep) {
      case 0:
        return !!bookingData.service && !!bookingData.serviceOption;
      case 1:
        return !!bookingData.dateTime.date && !!bookingData.dateTime.time;
      case 2: {
        const { firstName, lastName, email, phone } = bookingData.clientInfo;
        return firstName && lastName && email && phone;
      }
      case 3:
        if (bookingData.paymentDetails.method === 'insurance') {
          const { provider, policyId } = bookingData.paymentDetails.details;
          return provider && policyId;
        }
        if (bookingData.paymentDetails.method === 'credit_card') {
          return hiddenCardState.cardComplete && !hiddenCardState.cardError;
        }
        return true; // For cash and interac methods
      case 4:
        return true;
      default:
        return false;
    }
  };

  // Step content
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <ServiceSelector
            selectedServiceId={bookingData.service?.id}
            onServiceSelect={handleServiceSelect}
          />
        );
      case 1:
        return (
          <Scheduler
            serviceId={bookingData.service?.id}
            serviceOptionId={bookingData.serviceOption?.id}
            selectedDateTime={bookingData.dateTime}
            onDateTimeSelect={handleDateTimeSelect}
            therapistId={bookingData.therapistId}
          />
        );
      case 2:
        return (
          <ClientForm
            formData={bookingData.clientInfo}
            onFormChange={handleClientInfoChange}
          />
        );
      case 3:
        return (
          <PaymentSection
            paymentDetails={bookingData.paymentDetails}
            onPaymentDetailsChange={handlePaymentDetailsChange}
            bookingData={bookingData}
            hiddenCardState={hiddenCardState}
          />
        );
      case 4:
        return <BookingSummary bookingData={bookingData} />;
      default:
        return 'Unknown step';
    }
  };

  // Updated submitBooking function that uses the persistent hidden card element
  const submitBooking = async () => {
    setIsProcessing(true);

    try {
      // Validate required booking data
      if (!bookingData.dateTime.date || !bookingData.dateTime.time) {
        throw new Error('Please select a valid date and time.');
      }

      if (!bookingData.service || !bookingData.serviceOption) {
        throw new Error('Please select a service and option.');
      }

      if (!bookingData.clientInfo.firstName || !bookingData.clientInfo.lastName ||
        !bookingData.clientInfo.email || !bookingData.clientInfo.phone) {
        throw new Error('Please complete all required client information.');
      }

      let paymentIntentId = null;
      let paymentMethodId = null;

      // Process payment based on method
      if (bookingData.paymentDetails.method === 'credit_card') {
        console.log('Processing credit card payment...');
        
        if (!stripe) {
          throw new Error('Stripe failed to load. Please refresh the page.');
        }

        if (!elements) {
          throw new Error('Payment form failed to load. Please refresh the page.');
        }

        if (!hiddenCardState.cardComplete || hiddenCardState.cardError) {
          throw new Error('Please complete your card information.');
        }

        if (!hiddenCardState.cardElement) {
          throw new Error('Card element not found. Please refresh the page.');
        }

        console.log('Using persistent card element:', !!hiddenCardState.cardElement);

        // Create payment intent
        console.log('Creating payment intent...');
        const paymentIntentResponse = await apiClient.post('/payments/create-intent', {
          amount: Math.round(parseFloat(bookingData.serviceOption.price) * 100), // Convert to cents
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

        // Confirm payment with Stripe using the persistent cardElement
        console.log('Confirming payment with Stripe...');
        
        const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
          payment_method: {
            card: hiddenCardState.cardElement, // Use the persistent cardElement
            billing_details: {
              name: `${bookingData.clientInfo.firstName} ${bookingData.clientInfo.lastName}`,
              email: bookingData.clientInfo.email,
              phone: bookingData.clientInfo.phone,
            },
          },
        });

        if (error) {
          console.error('Payment confirmation error:', error);
          
          // Handle specific Stripe errors
          if (error.code === 'card_declined') {
            throw new Error(`Your card was declined. ${error.decline_code ? `Reason: ${error.decline_code}` : 'Please try a different payment method.'}`);
          } else if (error.code === 'expired_card') {
            throw new Error('Your card has expired. Please use a different card.');
          } else if (error.code === 'incorrect_cvc') {
            throw new Error('Your card\'s security code is incorrect.');
          } else if (error.code === 'processing_error') {
            throw new Error('An error occurred while processing your card. Please try again.');
          } else {
            throw new Error(error.message || 'Payment failed. Please try again.');
          }
        }

        if (paymentIntent.status !== 'succeeded') {
          throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
        }

        paymentIntentId = paymentIntent.id;
        paymentMethodId = paymentIntent.payment_method;

        console.log('Payment confirmed successfully:', paymentIntent.id);
      }

      // Construct booking time
      const bookingTime = constructBookingTime(bookingData.dateTime);

      // Prepare payload for booking creation
      const payload = {
        serviceOptionId: bookingData.serviceOption.id,
        bookingTime,
        clientDetails: bookingData.clientInfo,
        paymentMethod: mapPaymentMethodToBackend(bookingData.paymentDetails.method),
        paymentDetails: constructPaymentDetails(bookingData.paymentDetails, paymentIntentId, paymentMethodId),
        therapistId: bookingData.therapistId,
        clientNotes: bookingData.clientInfo.notes,
      };

      console.log('Creating booking with payload:', payload);

      // Create booking
      const response = await apiClient.post('/bookings', payload);

      if (response.data.success) {
        setBookingResult(response.data);
        setActiveStep((prev) => prev + 1);
      } else {
        throw new Error(response.data.message || 'Booking creation failed');
      }

    } catch (error) {
      console.error("Booking error:", error);
      console.log("Error response data:", error.response?.data);

      // Handle specific Stripe errors
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setSubmissionError(error.message);
      } else {
        const errorMessage = error.response?.data?.message ||
          error.response?.data?.errors?.[0]?.msg ||
          error.response?.data?.errors ||
          error.message ||
          'Booking submission failed.';
        setSubmissionError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced navigation handlers with Stripe payment processing
  const handleNext = async () => {
    setSubmissionError(null);

    if (activeStep === steps.length - 1) {
      await submitBooking();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setSubmissionError(null);
    setActiveStep((prev) => prev - 1);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pb: '80px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => window.location.href = 'https://spa.algosoftwarelabs.com/'}
          sx={{ textTransform: 'none' }}
        >
          Back to Main Site
        </Button>
      </Box>

      <Typography variant="h4" align="center" gutterBottom>
        Book Your Massage
      </Typography>

      {/* Hidden CardElement that stays mounted throughout the process */}
      <HiddenCardElement 
        onCardReady={handleHiddenCardReady}
        paymentMethod={bookingData.paymentDetails.method}
      />

      {/* Mobile Progress Indicator */}
      {isMobile && activeStep < steps.length && (
        <Box sx={{ width: '100%', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Step {activeStep + 1} of {steps.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(((activeStep + 1) / steps.length) * 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={((activeStep + 1) / steps.length) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="h6" sx={{ mt: 2, fontWeight: 'bold' }}>
            {steps[activeStep]}
          </Typography>
        </Box>
      )}

      {/* Desktop Stepper - Hidden on mobile */}
      {!isMobile && (
        <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5, width: '100%' }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}

      {activeStep === steps.length ? (
        <Box sx={{
          textAlign: 'center',
          p: 3,
          border: '1px solid #eee',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9',
          maxWidth: '600px',
          mx: 'auto'
        }}>
          <Typography variant="h5" gutterBottom>
            {bookingResult?.success ? 'Thank you for your booking!' : 'Booking Submission Issue'}
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            {bookingResult?.success
              ? `Your booking reference is #${bookingResult?.bookingId?.substring(0, 8) || 'N/A'}. ${bookingResult?.status === 'Confirmed'
                ? 'Your booking is confirmed!'
                : 'Please complete the consent form sent to your email to finalize your booking.'
              }`
              : submissionError || 'There was an issue processing your booking. Please contact us.'}
          </Typography>
          {bookingResult?.success && (
            <>
              <Alert severity={bookingResult?.status === 'Confirmed' ? 'success' : 'info'} sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                  <strong>Booking Status:</strong> {bookingResult?.status || 'Unknown'}<br />
                  <strong>Payment Status:</strong> {bookingResult?.paymentStatus || 'Unknown'}
                  {bookingResult?.paymentResult?.status && (
                    <>
                      <br /><strong>Payment:</strong> {bookingResult.paymentResult.status}
                    </>
                  )}
                </Typography>
              </Alert>

              {bookingResult?.status !== 'Confirmed' && (
                <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">
                    Your booking is pending confirmation. Please check your email for next steps.
                  </Typography>
                </Alert>
              )}
            </>
          )}
          <Button variant="contained" sx={{ mt: 3 }} onClick={() => window.location.reload()}>
            Book Another Appointment
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ mt: 2, mb: 1, p: { xs: 1, sm: 3 } }}>{getStepContent(activeStep)}</Box>

          {submissionError && <Alert severity="error" sx={{ mt: 2 }}>{submissionError}</Alert>}

          <Paper
            elevation={3}
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              backgroundColor: 'background.paper',
              borderTop: '1px solid',
              borderColor: 'divider',
              zIndex: 1000,
            }}
          >
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              maxWidth: 'lg',
              mx: 'auto',
              width: '100%',
              px: { xs: 1, sm: 0 }
            }}>
              <Box>
                {activeStep !== 0 && (
                  <Button
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                    disabled={isProcessing}
                    size={isMobile ? "small" : "medium"}
                  >
                    Back
                  </Button>
                )}
              </Box>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isStepComplete() || isProcessing}
                sx={{ minWidth: { xs: '120px', sm: '150px' } }}
                size={isMobile ? "large" : "large"}
              >
                {isProcessing ? (
                  <CircularProgress size={isMobile ? 20 : 24} />
                ) : (
                  activeStep === steps.length - 1 ? 'Confirm Booking' : 'Continue'
                )}
              </Button>
            </Box>
          </Paper>

          {/* Selected service summary on first step */}
          {activeStep === 0 && bookingData.service && (
            <Paper
              elevation={3}
              sx={{
                position: 'fixed',
                bottom: 56,
                left: 0,
                right: 0,
                p: 2,
                backgroundColor: 'primary.main',
                color: 'white',
                zIndex: 999
              }}
            >
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                maxWidth: 'lg',
                mx: 'auto',
                px: { xs: 1, sm: 0 }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ mr: 2, fontSize: { xs: 20, sm: 24 } }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {bookingData.service.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {bookingData.serviceOption?.duration} min • ${bookingData.serviceOption?.price}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          )}
        </>
      )}
    </Container>
  );
}

// Wrapper component that doesn't need Elements (since App.jsx provides it)
export default function BookingPage() {
  return <BookingPageContent />;
}