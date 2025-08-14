// Create new file: routes/sessionManagementRoutes.js

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { validateRequest } = require('../middleware/validationMiddleware');
const sessionManagementController = require('../controllers/sessionManagementController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// Mark session as no-show
router.patch(
  '/:bookingId/no-show',
  authenticateToken,
  authorizeRole(['admin', 'staff', 'therapist']),
  param('bookingId').isUUID().withMessage('Invalid booking ID'),
  body('reason').optional().isString().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters'),
  validateRequest,
  sessionManagementController.markAsNoShow
);

// Reverse no-show status
router.patch(
  '/:bookingId/reverse-no-show',
  authenticateToken,
  authorizeRole(['admin']), // Only admin can reverse
  param('bookingId').isUUID().withMessage('Invalid booking ID'),
  validateRequest,
  sessionManagementController.reverseNoShow
);

// Get sessions needing attention
router.get(
  '/needing-attention',
  authenticateToken,
  authorizeRole(['admin', 'staff', 'therapist']),
  query('page').optional().isInt({ gt: 0 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ gt: 0 }).withMessage('Limit must be a positive integer'),
  query('status').optional().isIn(['scheduled', 'in-progress', 'completed', 'no-show', 'cancelled', 'rescheduled']).withMessage('Invalid status'),
  query('therapistId').optional().isUUID().withMessage('Invalid therapist ID'),
  validateRequest,
  sessionManagementController.getSessionsNeedingAttention
);

// Updated ready sessions endpoint
router.get(
  '/ready',
  authenticateToken,
  authorizeRole(['admin', 'staff', 'therapist']),
  query('therapistId').optional().isUUID().withMessage('Invalid therapist ID'),
  query('limit').optional().isInt({ gt: 0 }).withMessage('Limit must be a positive integer'),
  validateRequest,
  sessionManagementController.getReadySessionsUpdated
);

module.exports = router;

