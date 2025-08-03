const express = require('express');
const { body, query, param } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// Stripe webhook endpoint (must be before other middleware - no auth/validation needed)
router.post('/webhook', 
  express.raw({ type: 'application/json' }), 
  paymentController.handleStripeWebhook
);

// POST /api/v1/payments/create-intent - Create payment intent (Public for booking flow)
router.post(
  '/create-intent',
  [
    body('amount').isInt({ gt: 0 }).withMessage('Amount must be a positive integer (in cents)'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('bookingData.serviceOptionId').isUUID().withMessage('Service Option ID must be a valid UUID'),
    body('bookingData.clientInfo.email').isEmail().withMessage('Valid client email is required'),
    body('bookingData.dateTime.date').notEmpty().withMessage('Booking date is required'),
    body('bookingData.dateTime.time').notEmpty().withMessage('Booking time is required'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
  ],
  validateRequest,
  paymentController.createPaymentIntent
);

// POST /api/v1/payments/confirm - Confirm payment (Public for booking flow)
router.post(
  '/confirm',
  [
    body('paymentIntentId').notEmpty().withMessage('Payment Intent ID is required'),
    body('bookingId').optional().isUUID().withMessage('Booking ID must be a valid UUID')
  ],
  validateRequest,
  paymentController.confirmPayment
);

// --- Admin/Staff Routes ---

// GET /api/v1/payments - Get all payments (Admin/Staff only)
router.get(
  '/',
  authenticateToken,
  authorizeRole(['admin', 'staff']),
  [
    query('page').optional().isInt({ gt: 0 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ gt: 0 }).withMessage('Limit must be a positive integer'),
    query('status').optional().isIn(['Pending', 'Succeeded', 'Failed', 'Refunded', 'Partially Refunded', 'Cancelled', 'Disputed']).withMessage('Invalid status filter'),
    query('method').optional().isIn(['Credit Card', 'Insurance', 'Cash', 'Interac', 'Other']).withMessage('Invalid payment method filter'),
    query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format'),
    query('clientEmail').optional().isEmail().withMessage('Invalid email format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 25, 
        status, 
        method, 
        startDate, 
        endDate,
        clientEmail 
      } = req.query;
      
      const offset = (page - 1) * limit;
      const whereClause = {};
      
      // Build where clause based on filters
      if (status) whereClause.status = status;
      if (method) whereClause.method = method;
      if (clientEmail) {
        whereClause.clientEmail = { 
          [require('sequelize').Op.iLike]: `%${clientEmail}%` 
        };
      }
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [require('sequelize').Op.between]: [
            new Date(startDate), 
            new Date(endDate)
          ]
        };
      }
      
      const { Payment, Booking, ServiceOption, Service, Client } = require('../models');
      
      const { count, rows } = await Payment.findAndCountAll({
        where: whereClause,
        include: [
          { 
            model: Booking, 
            include: [
              { model: Client, attributes: ['firstName', 'lastName', 'email'] }
            ]
          },
          { 
            model: ServiceOption, 
            include: [
              { model: Service, attributes: ['name'] }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });
      
      res.json({
        payments: rows,
        totalPayments: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page)
      });
      
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ 
        message: 'Failed to fetch payments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/v1/payments/stats/overview - Get payment statistics (Admin/Staff only)
router.get(
  '/stats/overview',
  authenticateToken,
  authorizeRole(['admin', 'staff']),
  [
    query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const { Payment } = require('../models');
      const { Op, fn, col } = require('sequelize');
      
      const whereClause = {};
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      // Get revenue statistics
      const revenueStats = await Payment.getTotalRevenue(
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );
      
      // Get payment method breakdown
      const methodBreakdown = await Payment.findAll({
        where: {
          ...whereClause,
          status: 'Succeeded'
        },
        attributes: [
          'method',
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('amount')), 'total']
        ],
        group: ['method']
      });
      
      // Get status breakdown
      const statusBreakdown = await Payment.findAll({
        where: whereClause,
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status']
      });
      
      // Get recent failed payments
      const recentFailures = await Payment.findAll({
        where: {
          ...whereClause,
          status: 'Failed'
        },
        order: [['createdAt', 'DESC']],
        limit: 10,
        include: [
          { 
            model: require('../models').Booking, 
            include: [
              { model: require('../models').Client, attributes: ['firstName', 'lastName', 'email'] }
            ]
          }
        ]
      });
      
      res.json({
        revenue: revenueStats,
        methodBreakdown: methodBreakdown.map(item => ({
          method: item.method,
          count: parseInt(item.dataValues.count),
          total: parseFloat(item.dataValues.total || 0)
        })),
        statusBreakdown: statusBreakdown.map(item => ({
          status: item.status,
          count: parseInt(item.dataValues.count)
        })),
        recentFailures
      });
      
    } catch (error) {
      console.error('Error fetching payment statistics:', error);
      res.status(500).json({ 
        message: 'Failed to fetch payment statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/v1/payments/:paymentIntentId - Get payment details
router.get(
  '/:paymentIntentId',
  authenticateToken,
  authorizeRole(['admin', 'staff']),
  [
    param('paymentIntentId').notEmpty().withMessage('Payment Intent ID is required')
  ],
  validateRequest,
  paymentController.getPaymentDetails
);

// POST /api/v1/payments/refund - Process refund (Admin/Staff only)
router.post(
  '/refund',
  authenticateToken,
  authorizeRole(['admin', 'staff']),
  [
    body('paymentIntentId').notEmpty().withMessage('Payment Intent ID is required'),
    body('amount').optional().isInt({ gt: 0 }).withMessage('Refund amount must be a positive integer (in cents)'),
    body('reason').optional().isIn(['duplicate', 'fraudulent', 'requested_by_customer']).withMessage('Invalid refund reason')
  ],
  validateRequest,
  paymentController.processRefund
);

// POST /api/v1/payments/:paymentId/retry - Retry failed payment (Admin/Staff only)
router.post(
  '/:paymentId/retry',
  authenticateToken,
  authorizeRole(['admin', 'staff']),
  [
    param('paymentId').isUUID().withMessage('Payment ID must be a valid UUID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { Payment, Booking } = require('../models');
      
      const payment = await Payment.findByPk(paymentId, {
        include: [{ model: Booking }]
      });
      
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      
      if (payment.status !== 'Failed') {
        return res.status(400).json({ 
          message: 'Can only retry failed payments' 
        });
      }
      
      // Create new payment intent for retry
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      const newPaymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(payment.amount) * 100), // Convert to cents
        currency: payment.currency.toLowerCase(),
        metadata: {
          original_payment_id: payment.id,
          retry_attempt: 'true',
          booking_id: payment.bookingId || 'N/A'
        }
      });
      
      // Create new payment record
      const newPayment = await Payment.create({
        stripePaymentIntentId: newPaymentIntent.id,
        transactionId: newPaymentIntent.id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: 'Pending',
        bookingId: payment.bookingId,
        serviceOptionId: payment.serviceOptionId,
        clientEmail: payment.clientEmail,
        providerDetails: JSON.stringify({ 
          retryOf: payment.id,
          originalAttempt: payment.createdAt 
        })
      });
      
      res.json({
        success: true,
        message: 'Payment retry initiated',
        newPayment: {
          id: newPayment.id,
          client_secret: newPaymentIntent.client_secret,
          payment_intent_id: newPaymentIntent.id
        }
      });
      
    } catch (error) {
      console.error('Error retrying payment:', error);
      res.status(500).json({ 
        message: 'Failed to retry payment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;