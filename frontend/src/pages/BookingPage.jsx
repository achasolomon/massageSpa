import React, { useState, useCallback } from 'react';
import {
  Container,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Box,
  Alert,
  Paper,
  useMediaQuery,
  useTheme,
  LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ServiceSelector from '../components/booking/ServiceSelector';
import Scheduler from '../components/booking/Scheduler';
import ClientForm from '../components/booking/ClientForm';
import PaymentSection from '../components/booking/PaymentSection';
import BookingSummary from '../components/booking/BookingSummary';

const steps = ['Select Service', 'Choose Date & Time', 'Your Details', 'Payment', 'Review & Confirm'];

// Thank You Component for successful booking
function BookingThankYou({ bookingResult }) {
  const theme = useTheme();
  return (
    <Box sx={{ 
      textAlign: 'center', 
      py: 4,
      backgroundColor: theme.palette.background.paper,
      borderRadius: 2,
      p: 4
    }}>
      <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'success.main' }}>
        Booking Confirmed!
      </Typography>
      <Typography variant="h6" gutterBottom color="text.primary">
        Thank you for booking with us
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Your appointment has been successfully scheduled. You will receive a confirmation email shortly.
      </Typography>

      {bookingResult && (
        <Paper sx={{ 
          p: 3, 
          mb: 4, 
          backgroundColor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50',
          border: theme.palette.mode === 'dark' ? '1px solid' : 'none',
          borderColor: theme.palette.mode === 'dark' ? 'divider' : 'transparent'
        }}>
          <Typography variant="h6" gutterBottom color="text.primary">
            Booking Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Booking ID: {bookingResult.bookingId.split('-')[0]}
          </Typography>
          {bookingResult.StartDate && (
            <Typography variant="body2" color="text.secondary">
              Date & Time: {new Date(bookingResult.startDate).toLocaleDateString()} at {new Date(bookingResult.appointmentTime).toLocaleTimeString()}
            </Typography>
          )}
        </Paper>
      )}

      <Button
        variant="contained"
        size="large"
        onClick={() => window.location.reload()}
        sx={{ 
          minWidth: 200,
          backgroundColor: theme.palette.primary.main,
          '&:hover': {
            backgroundColor: theme.palette.primary.dark
          }
        }}
      >
        Book Another Appointment
      </Button>
    </Box>
  );
}

// Main BookingPage Component
function BookingPageContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeStep, setActiveStep] = useState(0);
  const [bookingData, setBookingData] = useState({
    service: null,
    serviceOption: null,
    dateTime: { date: null, time: null },
    clientInfo: { firstName: '', lastName: '', email: '', phone: '', notes: '' },
    paymentDetails: { method: 'credit_card', details: {}, isComplete: false },
    therapistId: null,
  });
  const [bookingResult, setBookingResult] = useState(null);

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

  const handleBookingComplete = useCallback((result) => {
    setBookingResult(result);
    setActiveStep(5); // Move to thank you step (beyond the stepper)
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
        return bookingData.paymentDetails.isComplete;
      case 4:
        return true; // Summary step is always complete (user reviews and confirms)
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
          />
        );
      case 4:
        return (
          <BookingSummary
            bookingData={bookingData}
            onBookingComplete={handleBookingComplete}
            onBack={handleBack}
          />
        );
      case 5:
        return <BookingThankYou bookingResult={bookingResult} />;
      default:
        return 'Unknown step';
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (activeStep < 4) { // Only allow navigation up to summary step
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: 4, 
        mb: 4, 
        pb: '80px',
        backgroundColor: theme.palette.background.default,
        minHeight: '100vh'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => window.location.href = 'https://spa.algosoftwarelabs.com/'}
          sx={{ 
            textTransform: 'none',
            color: theme.palette.text.primary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover
            }
          }}
        >
          Back to Main Site
        </Button>
      </Box>

      <Typography 
        variant="h4" 
        align="center" 
        gutterBottom
        sx={{ color: theme.palette.text.primary }}
      >
        Book Your Massage
      </Typography>

      {/* Show stepper and progress only for steps 0-4 */}
      {activeStep <= 4 && (
        <>
          {/* Mobile Progress Indicator */}
          {isMobile && (
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
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: theme.palette.mode === 'dark' ? 'grey.700' : 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.primary.main
                  }
                }}
              />
              <Typography variant="h6" sx={{ mt: 2, fontWeight: 'bold', color: theme.palette.text.primary }}>
                {steps[activeStep]}
              </Typography>
            </Box>
          )}

          {/* Desktop Stepper - Hidden on mobile */}
          {!isMobile && (
            <Stepper 
              activeStep={activeStep} 
              sx={{ 
                pt: 3, 
                pb: 5, 
                width: '100%',
                '& .MuiStepLabel-label': {
                  color: theme.palette.text.secondary,
                  '&.Mui-active': {
                    color: theme.palette.primary.main,
                  },
                  '&.Mui-completed': {
                    color: theme.palette.primary.main,
                  }
                },
                '& .MuiStepIcon-root': {
                  color: theme.palette.mode === 'dark' ? 'grey.600' : 'grey.300',
                  '&.Mui-active': {
                    color: theme.palette.primary.main,
                  },
                  '&.Mui-completed': {
                    color: theme.palette.primary.main,
                  }
                }
              }}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}
        </>
      )}

      {/* Step Content */}
      <Box sx={{ mt: 2, mb: 1, p: { xs: 1, sm: 3 } }}>
        {getStepContent(activeStep)}
      </Box>

      {/* Navigation - Only show for steps 0-3 (not on summary or thank you) */}
      {activeStep >= 0 && activeStep <= 3 && (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            backgroundColor: theme.palette.background.paper,
            borderTop: '1px solid',
            borderColor: theme.palette.divider,
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
                  sx={{ 
                    mr: 1,
                    color: theme.palette.text.primary,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    }
                  }}
                  size={isMobile ? "small" : "medium"}
                >
                  Back
                </Button>
              )}
            </Box>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isStepComplete()}
              sx={{ 
                minWidth: { xs: '120px', sm: '150px' },
                backgroundColor: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark
                },
                '&:disabled': {
                  backgroundColor: theme.palette.action.disabled,
                  color: theme.palette.action.disabled
                }
              }}
              size={isMobile ? "large" : "large"}
            >
              Continue
            </Button>
          </Box>
        </Paper>
      )}

      {/* Back button only for Summary step */}
      {activeStep === 4 && (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            backgroundColor: theme.palette.background.paper,
            borderTop: '1px solid',
            borderColor: theme.palette.divider,
            zIndex: 1000,
          }}
        >
          <Box sx={{
            display: 'flex',
            justifyContent: 'flex-start',
            maxWidth: 'lg',
            mx: 'auto',
            width: '100%',
            px: { xs: 1, sm: 0 }
          }}>
            <Button
              onClick={handleBack}
              size={isMobile ? "small" : "medium"}
              sx={{
                mr: 1,
                color: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: theme.palette.primary.light,
                  color: theme.palette.primary.contrastText
                }
              }}
            >
              ← Back to Edit Details
            </Button>
          </Box>
        </Paper>
      )}

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
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
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
    </Container>
  );
}

// Wrapper component that doesn't need Elements (since App.jsx provides it)
export default function BookingPage() {
  return <BookingPageContent />;
}