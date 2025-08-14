import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  useTheme,
  useMediaQuery,
  Button
} from '@mui/material';
import {
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import LockIcon from '@mui/icons-material/Lock';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Enhanced card styling options with theme support
const getCardElementOptions = (theme) => ({
  style: {
    base: {
      fontSize: '16px',
      color: theme.palette.mode === 'dark' ? '#ffffff' : '#424770',
      backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffff',
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontSmoothing: 'antialiased',
      '::placeholder': {
        color: theme.palette.mode === 'dark' ? '#aab7c4' : '#aab7c4',
      },
    },
    invalid: {
      color: theme.palette.error.main,
      iconColor: theme.palette.error.main,
    },
  },
  hidePostalCode: true,
  hideIcon: false,
});

// Updated Stripe Card Component - only validates, doesn't process payment
function StripeCardForm({ onCardValidation, bookingData }) {
  const stripe = useStripe();
  const elements = useElements();
  const theme = useTheme();
  const [cardError, setCardError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardFocused, setCardFocused] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);

  const handleCardChange = (event) => {
    const errorMsg = event.error ? event.error.message : null;
    setCardError(errorMsg);
    setCardComplete(event.complete);
    
    // Notify parent about card validation status
    onCardValidation({
      isValid: event.complete && !event.error,
      error: errorMsg,
      cardBrand: event.brand,
      last4: event.complete ? '****' : null // We'll get real last4 when creating payment method
    });
  };

  // Create payment method for later use (doesn't charge)
  const createPaymentMethod = async () => {
    if (!stripe || !elements || !cardComplete) {
      return null;
    }

    try {
      const cardElement = elements.getElement(CardElement);
      
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: `${bookingData.clientInfo.firstName} ${bookingData.clientInfo.lastName}`,
          email: bookingData.clientInfo.email,
          phone: bookingData.clientInfo.phone,
        },
      });

      if (error) {
        setCardError(error.message);
        return null;
      }

      setPaymentMethod(paymentMethod);
      onCardValidation({
        isValid: true,
        error: null,
        cardBrand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        paymentMethodId: paymentMethod.id
      });

      return paymentMethod;
    } catch (error) {
      setCardError(error.message);
      return null;
    }
  };

  // Auto-create payment method when card is complete
  useEffect(() => {
    if (cardComplete && !cardError && !paymentMethod) {
      createPaymentMethod();
    }
  }, [cardComplete, cardError, paymentMethod]);

  if (!stripe || !elements) {
    return (
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} sx={{ mr: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading secure payment system...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom fontWeight="600" sx={{ mb: 2 }}>
        Card Information
      </Typography>

      <Card
        variant="outlined"
        sx={{
          transition: 'all 0.2s ease-in-out',
          borderColor: cardFocused ? 'primary.main' : cardError ? 'error.main' : 'grey.300',
          borderWidth: cardFocused ? 2 : 1,
          boxShadow: cardFocused ? 2 : 0,
          backgroundColor: theme.palette.background.paper,
          '&:hover': {
            borderColor: cardError ? 'error.main' : 'primary.light',
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            onFocus={() => setCardFocused(true)}
            onBlur={() => setCardFocused(false)}
          >
            <CardElement
              options={getCardElementOptions(theme)}
              onChange={handleCardChange}
            />
          </Box>
        </CardContent>
      </Card>

      {cardError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {cardError}
        </Alert>
      )}

      {cardComplete && !cardError && paymentMethod && (
        <Alert severity="success" sx={{ mt: 2 }}>
          ✓ Card details are valid - Payment will be processed after booking confirmation
        </Alert>
      )}

      <Card sx={{ mt: 3, bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Amount to be charged:
            </Typography>
            <Chip
              label={`$${parseFloat(bookingData.serviceOption.price).toFixed(2)} CAD`}
              color="primary"
              variant="outlined"
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
            <LockIcon sx={{ fontSize: 12, mr: 0.5 }} />
            Secured by Stripe. Payment will be processed after you confirm your booking.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

// Updated Insurance Form with theme support
function InsuranceForm({ insuranceProvider, setInsuranceProvider, insurancePolicyId, setInsurancePolicyId, onComplete }) {
  const theme = useTheme();
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const complete = insuranceProvider && insurancePolicyId;
    setIsComplete(complete);
    onComplete(complete, {
      provider: insuranceProvider,
      policyId: insurancePolicyId,
      last4: insurancePolicyId ? insurancePolicyId.slice(-4) : null
    });
  }, [insuranceProvider, insurancePolicyId, onComplete]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="600" sx={{ mb: 3 }}>
        Insurance Information
      </Typography>
      <Box sx={{ display: 'grid', gap: 3 }}>
        <TextField
          label="Insurance Provider"
          value={insuranceProvider}
          onChange={(e) => setInsuranceProvider(e.target.value)}
          fullWidth
          required
          variant="outlined"
          placeholder="e.g., Blue Cross, Manulife, Sun Life, Green Shield"
          helperText="Enter the name of your insurance company"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: theme.palette.background.paper,
            }
          }}
        />
        <TextField
          label="Policy / Member ID"
          value={insurancePolicyId}
          onChange={(e) => setInsurancePolicyId(e.target.value)}
          fullWidth
          required
          variant="outlined"
          placeholder="Your policy or member identification number"
          helperText="This can usually be found on your insurance card"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: theme.palette.background.paper,
            }
          }}
        />
      </Box>
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Important:</strong> Our staff will verify your insurance coverage before your appointment.
          You may be responsible for any amounts not covered by your plan, including deductibles or co-payments.
        </Typography>
      </Alert>

      {isComplete && (
        <Alert severity="success" sx={{ mt: 2 }}>
          ✓ Insurance information completed. You can proceed to the next step.
        </Alert>
      )}
    </Box>
  );
}

// Updated other forms with theme support
function InteracForm({ bookingData, onComplete }) {
  const theme = useTheme();
  
  useEffect(() => {
    onComplete(true, { method: 'interac' });
  }, [onComplete]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="600" sx={{ mb: 3 }}>
        Interac e-Transfer Instructions
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Please send your Interac e-Transfer to:</strong><br />
          📧 <strong>payments@massagebyjacs.ca</strong><br /><br />
          <strong>Required Information:</strong><br />
          • Include your full name in the message field<br />
          • Add your phone number for reference<br />
          • Payment must be received before your appointment<br />
          • You'll receive a confirmation email once payment is processed
        </Typography>
      </Alert>

      {bookingData?.serviceOption && (
        <Card sx={{ bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Amount to send:
              </Typography>
              <Chip
                label={`$${parseFloat(bookingData.serviceOption.price).toFixed(2)} CAD`}
                color="primary"
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      <Alert severity="success" sx={{ mt: 2 }}>
        ✓ Instructions noted. You can proceed to review your booking.
      </Alert>
    </Box>
  );
}

function CashForm({ bookingData, onComplete }) {
  const theme = useTheme();
  
  useEffect(() => {
    onComplete(true, { method: 'cash' });
  }, [onComplete]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="600" sx={{ mb: 3 }}>
        Cash Payment
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Payment at Appointment:</strong><br />
          • You can pay with cash when you arrive for your massage<br />
          • Please bring exact change when possible<br />
          • Payment is due before your session begins<br />
          • We accept Canadian currency only
        </Typography>
      </Alert>

      {bookingData?.serviceOption && (
        <Card sx={{ bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Amount due at appointment:
              </Typography>
              <Chip
                label={`$${parseFloat(bookingData.serviceOption.price).toFixed(2)} CAD`}
                color="primary"
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      <Alert severity="success" sx={{ mt: 2 }}>
        ✓ Cash payment selected. You can proceed to review your booking.
      </Alert>
    </Box>
  );
}

// Main Payment Section Component - now only collects payment method info
export default function PaymentSection({ paymentDetails, onPaymentDetailsChange, bookingData }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [method, setMethod] = useState(paymentDetails.method || 'credit_card');
  const [showMobileForm, setShowMobileForm] = useState(false);
  const [insuranceProvider, setInsuranceProvider] = useState(paymentDetails.details?.provider || '');
  const [insurancePolicyId, setInsurancePolicyId] = useState(paymentDetails.details?.policyId || '');
  const [isMethodComplete, setIsMethodComplete] = useState(false);
  const [methodDetails, setMethodDetails] = useState({});

  const handleCardValidation = useCallback((cardInfo) => {
    setIsMethodComplete(cardInfo.isValid);
    setMethodDetails(cardInfo);
  }, []);

  const handleMethodComplete = useCallback((complete, details = {}) => {
    setIsMethodComplete(complete);
    setMethodDetails(details);
  }, []);

  useEffect(() => {
    let details = { ...methodDetails };

    if (method === 'insurance') {
      details = { 
        provider: insuranceProvider, 
        policyId: insurancePolicyId,
        last4: insurancePolicyId ? insurancePolicyId.slice(-4) : null
      };
    }

    onPaymentDetailsChange({
      method,
      details,
      isComplete: isMethodComplete,
      ...methodDetails
    });
  }, [method, insuranceProvider, insurancePolicyId, isMethodComplete, methodDetails, onPaymentDetailsChange]);

  const handleMethodChange = (newMethod) => {
    setMethod(newMethod);
    setIsMethodComplete(false);
    setMethodDetails({});
    if (isMobile) {
      setShowMobileForm(true);
    }
  };

  const handleBackToMethods = () => {
    setShowMobileForm(false);
  };

  const paymentMethods = [
    {
      value: 'credit_card',
      icon: <CreditCardIcon />,
      title: 'Credit or Debit Card',
      subtitle: 'Secure payment processed by Stripe',
      recommended: true
    },
    {
      value: 'insurance',
      icon: <AccountBalanceIcon />,
      title: 'Insurance',
      subtitle: 'Coverage verification required'
    },
    {
      value: 'interac',
      icon: <SwapHorizIcon />,
      title: 'Interac e-Transfer',
      subtitle: 'Canadian electronic transfer'
    },
    {
      value: 'cash',
      icon: <AttachMoneyIcon />,
      title: 'Cash',
      subtitle: 'Pay at the time of your appointment'
    }
  ];

  const renderPaymentForm = () => {
    const formContent = (() => {
      switch (method) {
        case 'insurance':
          return (
            <InsuranceForm
              insuranceProvider={insuranceProvider}
              setInsuranceProvider={setInsuranceProvider}
              insurancePolicyId={insurancePolicyId}
              setInsurancePolicyId={setInsurancePolicyId}
              onComplete={handleMethodComplete}
            />
          );
        case 'credit_card':
          return (
            <StripeCardForm
              onCardValidation={handleCardValidation}
              bookingData={bookingData}
            />
          );
        case 'interac':
          return <InteracForm bookingData={bookingData} onComplete={handleMethodComplete} />;
        case 'cash':
          return <CashForm bookingData={bookingData} onComplete={handleMethodComplete} />;
        default:
          return (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary'
            }}>
              <Typography variant="body1">
                Select a payment method to continue
              </Typography>
            </Box>
          );
      }
    })();

    if (isMobile && showMobileForm) {
      const selectedMethod = paymentMethods.find(pm => pm.value === method);
      return (
        <Box>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            pb: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            <Box
              onClick={handleBackToMethods}
              sx={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'primary.main',
                '&:hover': { color: 'primary.dark' }
              }}
            >
              <Typography variant="body2" sx={{ mr: 1 }}>←</Typography>
              <Typography variant="body2" fontWeight="600">Back</Typography>
            </Box>
            <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ mr: 1, color: 'primary.main' }}>
                {selectedMethod?.icon}
              </Box>
              <Typography variant="subtitle1" fontWeight="600">
                {selectedMethod?.title}
              </Typography>
            </Box>
          </Box>
          {formContent}
        </Box>
      );
    }

    return formContent;
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: { xs: 2, sm: 3, md: 4 }, 
        borderRadius: 2,
        backgroundColor: theme.palette.background.paper
      }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="700" color="primary.main">
          Payment Method
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Choose how you'd like to pay for your massage session
        </Typography>
      </Box>

      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 3, md: 4 },
        minHeight: { xs: 'auto', md: 500 }
      }}>
        {isMobile ? (
          <Box sx={{ width: '100%' }}>
            {!showMobileForm ? (
              <Box>
                <Typography variant="h6" gutterBottom fontWeight="600" sx={{ mb: 3 }}>
                  Select Payment Method
                </Typography>
                <RadioGroup
                  value={method}
                  onChange={(e) => handleMethodChange(e.target.value)}
                  sx={{ width: '100%' }}
                >
                  {paymentMethods.map((paymentMethod) => (
                    <Card
                      key={paymentMethod.value}
                      variant="outlined"
                      sx={{
                        mb: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        borderColor: method === paymentMethod.value ? 'primary.main' : 'divider',
                        bgcolor: method === paymentMethod.value ? 'primary.50' : 'background.paper',
                        width: '100%',
                        '&:hover': {
                          borderColor: 'primary.light',
                          boxShadow: 1
                        }
                      }}
                      onClick={() => handleMethodChange(paymentMethod.value)}
                    >
                      <CardContent sx={{ p: 2, width: '100%' }}>
                        <FormControlLabel
                          value={paymentMethod.value}
                          control={<Radio />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              <Box sx={{ mr: 2, color: 'primary.main' }}>
                                {paymentMethod.icon}
                              </Box>
                              <Box sx={{ flexGrow: 1 }}>
                                <Box sx={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  flexDirection: 'column',
                                  mb: 0.5
                                }}>
                                  <Typography variant="body1" fontWeight="600">
                                    {paymentMethod.title}
                                  </Typography>
                                  {paymentMethod.recommended && (
                                    <Chip
                                      label="Recommended"
                                      size="small"
                                      color="primary"
                                      sx={{
                                        mt: 0.5,
                                        height: 20
                                      }}
                                    />
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {paymentMethod.subtitle}
                                </Typography>
                              </Box>
                            </Box>
                          }
                          sx={{ margin: 0, width: '100%' }}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </RadioGroup>
              </Box>
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50',
                  borderRadius: 2,
                  width: '100%',
                }}
              >
                {renderPaymentForm()}
              </Paper>
            )}
          </Box>
        ) : (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" gutterBottom fontWeight="600" sx={{ mb: 3 }}>
                Select Payment Method
              </Typography>
              <RadioGroup
                value={method}
                onChange={(e) => handleMethodChange(e.target.value)}
                sx={{ width: '100%' }}
              >
                {paymentMethods.map((paymentMethod) => (
                  <Card
                    key={paymentMethod.value}
                    variant="outlined"
                    sx={{
                      mb: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      borderColor: method === paymentMethod.value ? 'primary.main' : 'divider',
                      bgcolor: method === paymentMethod.value ? 'primary.50' : 'background.paper',
                      width: '100%',
                      '&:hover': {
                        borderColor: 'primary.light',
                        boxShadow: 1
                      }
                    }}
                    onClick={() => handleMethodChange(paymentMethod.value)}
                  >
                    <CardContent sx={{ p: 2, width: '100%' }}>
                      <FormControlLabel
                        value={paymentMethod.value}
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Box sx={{ mr: 2, color: 'primary.main' }}>
                              {paymentMethod.icon}
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                              <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mb: 0.5
                              }}>
                                <Typography variant="body1" fontWeight="600">
                                  {paymentMethod.title}
                                </Typography>
                                {paymentMethod.recommended && (
                                  <Chip
                                    label="Recommended"
                                    size="small"
                                    color="primary"
                                    sx={{
                                      ml: 1,
                                      height: 20
                                    }}
                                  />
                                )}
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {paymentMethod.subtitle}
                              </Typography>
                            </Box>
                          </Box>
                        }
                        sx={{ margin: 0, width: '100%' }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </RadioGroup>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0, mb: 4 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  height: '100%',
                  minHeight: 400,
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50',
                  borderRadius: 2,
                  width: '100%',
                }}
              >
                {renderPaymentForm()}
              </Paper>
            </Box>
          </>
        )}
      </Box>

      <Box sx={{ mt: 4 }}>
        <Card sx={{ bgcolor: 'success.50', borderColor: 'success.200' }} variant="outlined">
          <CardContent sx={{ p: 2 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: { xs: 'column', sm: 'row' },
              textAlign: { xs: 'center', sm: 'left' }
            }}>
              <LockIcon sx={{
                color: 'success.main',
                mr: { xs: 0, sm: 1 },
                mb: { xs: 1, sm: 0 }
              }} />
              <Typography variant="body2" color="success.dark" fontWeight="600">
                Secure Payment - All transactions are encrypted and secure. We never store your payment information.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Paper>
  );
}