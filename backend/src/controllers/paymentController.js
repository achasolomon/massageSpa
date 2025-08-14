// controllers/paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Payment, Booking, Client, ServiceOption, Service } = require('../models');
const { findOrCreateClient } = require('./bookingController'); // Import the helper function

/**
 * Create a Stripe Payment Intent
 */
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'cad', bookingData, metadata } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: 'Amount is required and must be greater than 0'
      });
    }

    if (!bookingData || !bookingData.serviceOptionId) {
      return res.status(400).json({
        message: 'Booking data with service option ID is required'
      });
    }

    // Verify service option exists and is active
    const serviceOption = await ServiceOption.findByPk(bookingData.serviceOptionId, {
      include: {
        model: Service,
        as: 'service'
      }
    });

    if (!serviceOption || !serviceOption.isActive) {
      return res.status(404).json({
        message: 'Service option not found or inactive'
      });
    }

    // Verify amount matches service option price (security check)
    const expectedAmount = Math.round(parseFloat(serviceOption.price) * 100);
    if (Math.abs(amount - expectedAmount) > 1) { // Allow for minor rounding differences
      return res.status(400).json({
        message: 'Payment amount does not match service price'
      });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: expectedAmount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        service_option_id: bookingData.serviceOptionId,
        service_name: serviceOption.service?.name || 'Unknown Service', // FIXED: Updated property access
        client_email: bookingData.clientInfo?.email || 'Unknown',
        booking_date: bookingData.dateTime?.date || 'Unknown',
        booking_time: bookingData.dateTime?.time || 'Unknown',
        ...metadata
      },
      description: `Booking for ${serviceOption.service?.name || 'Service'} - ${serviceOption.optionName || 'Standard Session'}`, // FIXED: Updated property access
    });

    // Store payment intent in database for tracking
    await Payment.create({
      stripePaymentIntentId: paymentIntent.id,
      transactionId: paymentIntent.id, // Use your existing transactionId field
      amount: (expectedAmount / 100).toFixed(2), // Convert from cents to dollars for your DECIMAL field
      currency: currency.toUpperCase(),
      status: 'Pending', // Use your existing enum values
      method: 'Credit Card',
      serviceOptionId: bookingData.serviceOptionId,
      clientEmail: bookingData.clientInfo?.email,
      providerDetails: JSON.stringify(metadata || {}), // Use your existing providerDetails field
    });

    // console.log('Payment Intent created:', paymentIntent.id, 'for amount:', expectedAmount);

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: expectedAmount,
      currency: currency.toLowerCase()
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);

    if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        message: error.message,
        type: error.type
      });
    }

    res.status(500).json({
      message: 'Failed to create payment intent',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Confirm payment and update booking
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, bookingId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'Payment Intent ID is required' });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        message: 'Payment has not been completed successfully',
        status: paymentIntent.status
      });
    }

    // Update payment record in database
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntentId }
    });

    if (payment) {
      await payment.update({
        status: 'Succeeded', // Use your existing enum values
        stripePaymentMethodId: paymentIntent.payment_method,
        stripeChargeId: paymentIntent.latest_charge,
        paidAt: new Date(),
        transactionId: paymentIntent.latest_charge || paymentIntent.id // Update your existing transactionId
      });

      // If booking exists, update its payment status
      if (bookingId) {
        const booking = await Booking.findByPk(bookingId);
        if (booking) {
          await booking.update({
            paymentStatus: 'Paid',
            status: booking.status === 'Pending Confirmation' ? 'Confirmed' : booking.status
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      payment_intent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount
      }
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      message: 'Failed to confirm payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Handle Stripe webhooks
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // console.log('Received Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object);
        break;

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  // console.log('Payment succeeded:', paymentIntent.id);

  try {
    // Update payment record
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (payment) {
      await payment.update({
        status: 'Succeeded', // Use your existing enum
        stripePaymentMethodId: paymentIntent.payment_method,
        stripeChargeId: paymentIntent.latest_charge,
        paidAt: new Date(),
        transactionId: paymentIntent.latest_charge || paymentIntent.id
      });

      // Update associated booking if exists
      if (payment.bookingId) {
        const booking = await Booking.findByPk(payment.bookingId);
        if (booking) {
          await booking.update({
            paymentStatus: 'Paid',
            status: booking.status === 'Pending Confirmation' ? 'Confirmed' : booking.status
          });

          // Send confirmation email if booking is now confirmed
          if (booking.status === 'Confirmed') {
            const { sendBookingDetailsEmail } = require('../services/emailService');
            const bookingWithDetails = await Booking.findByPk(booking.id, {
              include: [
                {
                  model: Client,
                  as: 'client' // FIXED: Added alias
                },
                {
                  model: ServiceOption,
                  as: 'serviceOption', // FIXED: Added alias
                  include: [{
                    model: Service,
                    as: 'service' // FIXED: Added alias
                  }]
                }
              ]
            });

            if (bookingWithDetails) {
              await sendBookingDetailsEmail(
                bookingWithDetails,
                bookingWithDetails.client,
                bookingWithDetails.serviceOption,
                bookingWithDetails.serviceOption.service
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent) {
  // console.log('Payment failed:', paymentIntent.id);

  try {
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (payment) {
      await payment.update({
        status: 'Failed', // Use your existing enum
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed'
      });

      // Update booking status if exists
      if (payment.bookingId) {
        const booking = await Booking.findByPk(payment.bookingId);
        if (booking) {
          await booking.update({
            paymentStatus: 'Failed',
            status: 'Payment Failed'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * Handle canceled payment intent
 */
async function handlePaymentIntentCanceled(paymentIntent) {
  // console.log('Payment canceled:', paymentIntent.id);

  try {
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (payment) {
      await payment.update({
        status: 'Cancelled' // Use your existing enum (will be added in migration)
      });

      // Update booking status if exists
      if (payment.bookingId) {
        const booking = await Booking.findByPk(payment.bookingId);
        if (booking && booking.paymentStatus === 'Pending') {
          await booking.update({
            paymentStatus: 'Cancelled',
            status: 'Cancelled By Client'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
  }
}

/**
 * Handle charge disputes
 */
async function handleChargeDispute(dispute) {
  // console.log('Charge dispute created:', dispute.id);

  try {
    // Find payment by charge ID
    const payment = await Payment.findOne({
      where: { stripeChargeId: dispute.charge }
    });

    if (payment) {
      await payment.update({
        status: 'Disputed', // Use your existing enum (will be added in migration)
        disputeId: dispute.id,
        disputeReason: dispute.reason
      });

      // Update booking status
      if (payment.bookingId) {
        const booking = await Booking.findByPk(payment.bookingId);
        if (booking) {
          await booking.update({
            paymentStatus: 'Disputed',
            internalNotes: (booking.internalNotes || '') +
              `\n[${new Date().toISOString()}] Payment disputed: ${dispute.reason}`
          });
        }
      }

      // TODO: Send notification to admin about dispute
    }
  } catch (error) {
    console.error('Error handling charge dispute:', error);
  }
}

/**
 * Process refund
 */
exports.processRefund = async (req, res) => {
  try {
    const { paymentIntentId, amount, reason = 'requested_by_customer' } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'Payment Intent ID is required' });
    }

    // Get payment from database
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
      include: [{
        model: Booking,
        as: 'booking',
        include: [{
          model: Client,
          as: 'client'
        }]
      }]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'Succeeded') {
      return res.status(400).json({ message: 'Can only refund successful payments' });
    }

    // Calculate refund amount in dollars (your model uses DECIMAL)
    const refundAmountInDollars = amount ? (amount / 100) : parseFloat(payment.amount);
    const refundAmountInCents = Math.round(refundAmountInDollars * 100); // Convert back to cents for Stripe

    if (refundAmountInDollars > parseFloat(payment.amount)) {
      return res.status(400).json({ message: 'Refund amount cannot exceed original payment' });
    }

    // Create refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmountInCents,
      reason: reason,
      metadata: {
        booking_id: payment.bookingId || 'N/A',
        refunded_by: req.user?.email || 'system'
      }
    });

    // Update payment record
    const currentRefundAmount = parseFloat(payment.refundAmount || 0);
    const newRefundAmount = currentRefundAmount + refundAmountInDollars;
    const isPartialRefund = newRefundAmount < parseFloat(payment.amount);

    await payment.update({
      status: isPartialRefund ? 'Partially Refunded' : 'Refunded',
      refundAmount: newRefundAmount.toFixed(2),
      refundedAt: new Date(),
      transactionId: refund.id // Update transaction ID to refund ID
    });

    // Update booking if exists
    if (payment.booking) {
      await payment.booking.update({
        paymentStatus: isPartialRefund ? 'Partially Refunded' : 'Refunded'
      });
    }

    // console.log('Refund processed:', refund.id, 'Amount:', refundAmount);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refundAmount,
        status: refund.status
      }
    });

  } catch (error) {
    console.error('Error processing refund:', error);

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        message: error.message,
        type: error.type
      });
    }

    res.status(500).json({
      message: 'Failed to process refund',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get payment details
 */
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
      include: [
        {
          model: Booking,
          as: 'booking',
          include: [
            {
              model: Client,
              as: 'client'
            },
            {
              model: ServiceOption,
              as: 'serviceOption',
              include: [{
                model: Service,
                as: 'service'
              }]
            }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Get latest status from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({
      payment: {
        id: payment.id,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        paidAt: payment.paidAt,
        refundAmount: payment.refundAmount,
        booking: payment.booking
      },
      stripeStatus: paymentIntent.status,
      stripeAmount: paymentIntent.amount
    });

  } catch (error) {
    console.error('Error getting payment details:', error);
    res.status(500).json({
      message: 'Failed to get payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};