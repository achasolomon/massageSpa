// utils/stripePayment.js
import apiClient from '../services/apiClient';

/**
 * Create a payment intent on the backend
 * @param {Object} bookingData - The booking data
 * @returns {Promise<Object>} Payment intent client secret and details
 */
export const createPaymentIntent = async (bookingData) => {
  try {
    const response = await apiClient.post('/payments/create-intent', {
      amount: Math.round(parseFloat(bookingData.serviceOption.price) * 100), // Convert to cents
      currency: 'cad', // or 'usd' depending on your location
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

    return response.data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error(error.response?.data?.message || 'Failed to create payment intent');
  }
};

/**
 * Confirm payment with Stripe
 * @param {Object} stripe - Stripe instance
 * @param {Object} elements - Stripe elements instance
 * @param {string} clientSecret - Payment intent client secret
 * @param {Object} clientInfo - Client information for billing
 * @returns {Promise<Object>} Payment confirmation result
 */
export const confirmCardPayment = async (stripe, elements, clientSecret, clientInfo) => {
  if (!stripe || !elements) {
    throw new Error('Stripe has not loaded yet');
  }

  const cardElement = elements.getElement('card');
  
  if (!cardElement) {
    throw new Error('Card element not found');
  }

  try {
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: `${clientInfo.firstName} ${clientInfo.lastName}`,
          email: clientInfo.email,
          phone: clientInfo.phone,
        },
      },
    });

    if (error) {
      console.error('Payment confirmation error:', error);
      throw new Error(error.message);
    }

    return { paymentIntent };
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
};

/**
 * Process the complete booking with payment
 * @param {Object} bookingData - Complete booking data
 * @param {Object} paymentResult - Result from Stripe payment confirmation
 * @returns {Promise<Object>} Booking creation result
 */
export const processBookingWithPayment = async (bookingData, paymentResult) => {
  try {
    const response = await apiClient.post('/bookings', {
      serviceOptionId: bookingData.serviceOption.id,
      bookingTime: constructBookingDateTime(bookingData.dateTime),
      clientDetails: bookingData.clientInfo,
      paymentMethod: 'credit_card',
      paymentDetails: {
        stripePaymentIntentId: paymentResult.paymentIntent.id,
        stripePaymentMethodId: paymentResult.paymentIntent.payment_method,
        amount: paymentResult.paymentIntent.amount,
        currency: paymentResult.paymentIntent.currency,
        status: paymentResult.paymentIntent.status
      },
      therapistId: bookingData.therapistId,
      clientNotes: bookingData.clientInfo.notes,
    });

    return response.data;
  } catch (error) {
    console.error('Error processing booking with payment:', error);
    throw new Error(error.response?.data?.message || 'Failed to complete booking');
  }
};

/**
 * Construct proper datetime for booking from date and time strings
 * @param {Object} dateTime - Object with date and time
 * @returns {string} ISO datetime string
 */
const constructBookingDateTime = (dateTime) => {
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

/**
 * Handle different payment methods
 * @param {Object} bookingData - Complete booking data
 * @returns {Promise<Object>} Processing result
 */
export const processPayment = async (bookingData) => {
  const { paymentDetails } = bookingData;
  
  switch (paymentDetails.method) {
    case 'credit_card':
      return await processCreditCardPayment(bookingData);
    
    case 'insurance':
      return await processInsurancePayment(bookingData);
    
    case 'cash':
    case 'interac':
      return await processOfflinePayment(bookingData);
    
    default:
      throw new Error('Invalid payment method');
  }
};

/**
 * Process credit card payment through Stripe
 */
const processCreditCardPayment = async (bookingData) => {
  const { paymentDetails } = bookingData;
  
  if (!paymentDetails.details.stripe || !paymentDetails.details.elements) {
    throw new Error('Stripe elements not initialized');
  }

  if (!paymentDetails.cardComplete) {
    throw new Error('Please complete your card information');
  }

  // Create payment intent
  const paymentIntentData = await createPaymentIntent(bookingData);
  
  // Confirm payment
  const paymentResult = await confirmCardPayment(
    paymentDetails.details.stripe,
    paymentDetails.details.elements,
    paymentIntentData.client_secret,
    bookingData.clientInfo
  );

  // Process booking with payment
  return await processBookingWithPayment(bookingData, paymentResult);
};

/**
 * Process insurance payment (manual verification)
 */
const processInsurancePayment = async (bookingData) => {
  try {
    const response = await apiClient.post('/bookings', {
      serviceOptionId: bookingData.serviceOption.id,
      bookingTime: constructBookingDateTime(bookingData.dateTime),
      clientDetails: bookingData.clientInfo,
      paymentMethod: 'insurance',
      paymentDetails: {
        provider: bookingData.paymentDetails.details.provider,
        policyId: bookingData.paymentDetails.details.policyId
      },
      therapistId: bookingData.therapistId,
      clientNotes: bookingData.clientInfo.notes,
    });

    return response.data;
  } catch (error) {
    console.error('Error processing insurance booking:', error);
    throw new Error(error.response?.data?.message || 'Failed to process insurance booking');
  }
};

/**
 * Process offline payment methods (cash, interac)
 */
const processOfflinePayment = async (bookingData) => {
  try {
    const response = await apiClient.post('/bookings', {
      serviceOptionId: bookingData.serviceOption.id,
      bookingTime: constructBookingDateTime(bookingData.dateTime),
      clientDetails: bookingData.clientInfo,
      paymentMethod: bookingData.paymentDetails.method,
      paymentDetails: {},
      therapistId: bookingData.therapistId,
      clientNotes: bookingData.clientInfo.notes,
    });

    return response.data;
  } catch (error) {
    console.error('Error processing offline payment booking:', error);
    throw new Error(error.response?.data?.message || 'Failed to process booking');
  }
};