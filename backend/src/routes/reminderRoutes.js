const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const reminderService = require('../services/reminders/reminderService');

/**
 * @route   GET /api/v1/reminders/check
 * @desc    Check for bookings that need reminders
 * @access  Private (Admin, Staff)
 */
router.get('/check',
  authenticateToken,
  authorizeRole(['admin', 'staff']),
  [
    check('daysAhead').optional().isInt({ min: 1, max: 7 }).withMessage('Days ahead must be between 1 and 7'),
    check('status').optional().isIn(['Pending Confirmation', 'Confirmed']).withMessage('Invalid status')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const options = {
        daysAhead: req.query.daysAhead ? parseInt(req.query.daysAhead) : 1,
        status: req.query.status || 'Confirmed'
      };

      const bookings = await reminderService.findBookingsForReminders(options);

      return res.json({
        success: true,
        count: bookings.length,
        bookings: bookings.map(booking => ({
          id: booking.id,
          clientName: booking.Client
            ? `${booking.Client.firstName} ${booking.Client.lastName}`
            : 'Unknown',
          serviceName: booking.ServiceOption && booking.ServiceOption.Service
            ? booking.ServiceOption.Service.name
            : 'Unknown',
          appointmentDate: booking.bookingStartTime,
          therapistName: booking.Therapist
            ? `${booking.Therapist.firstName} ${booking.Therapist.lastName}`
            : 'Not assigned',
          hasEmail: !!booking.Client?.email,
          hasPhone: !!booking.Client?.phone
        }))
      });
    } catch (error) {
      console.error('Error checking for reminders:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking for reminders',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/v1/reminders/send
 * @desc    Send reminders for upcoming appointments
 * @access  Private (Admin, Staff)
 */
router.post('/send',
  authenticateToken,
  authorizeRole(['admin', 'staff']),
  [
    check('daysAhead').optional().isInt({ min: 1, max: 7 }).withMessage('Days ahead must be between 1 and 7'),
    check('status').optional().isIn(['Pending Confirmation', 'Confirmed']).withMessage('Invalid status'),
    check('sendEmail').optional().isBoolean().withMessage('sendEmail must be a boolean'),
    check('sendSMS').optional().isBoolean().withMessage('sendSMS must be a boolean')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const options = {
        daysAhead: req.body.daysAhead ? parseInt(req.body.daysAhead) : 1,
        status: req.body.status || 'Confirmed',
        sendEmail: req.body.sendEmail !== false, // Default to true
        sendSMS: req.body.sendSMS !== false // Default to true
      };

      const results = await reminderService.sendReminders(options);

      return res.json({
        success: true,
        results
      });
    } catch (error) {
      console.error('Error sending reminders:', error);
      return res.status(500).json({
        success: false,
        message: 'Error sending reminders',
        error: error.message
      });
    }
  }
);

module.exports = router;
