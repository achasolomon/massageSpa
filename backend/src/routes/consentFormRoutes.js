const express = require('express');
const { body, param } = require('express-validator');
const consentFormController = require('../controllers/ConsentFormController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

// GET /api/v1/consent-form/:token - Get consent form by token (Public)
router.get(
  '/:token',
  [
    param('token').isLength({ min: 32, max: 128 }).withMessage('Invalid token format')
  ],
  validateRequest,
  consentFormController.getConsentFormByToken
);

// POST /api/v1/consent-form/:token - Submit consent form (Public)
router.post(
  '/:token',
  [
    param('token').isLength({ min: 32, max: 128 }).withMessage('Invalid token format'),
    body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
    body('dateOfBirth').isISO8601().toDate().withMessage('Valid date of birth is required'),
    body('address').trim().isLength({ min: 10, max: 500 }).withMessage('Address must be between 10 and 500 characters'),
    body('emergencyContactName').trim().isLength({ min: 2, max: 100 }).withMessage('Emergency contact name must be between 2 and 100 characters'),
    body('emergencyContactPhone').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Valid emergency contact phone is required'),
    body('emergencyContactRelationship').trim().isLength({ min: 2, max: 50 }).withMessage('Emergency contact relationship must be between 2 and 50 characters'),
    body('medicalConditions').optional().trim().isLength({ max: 1000 }).withMessage('Medical conditions must not exceed 1000 characters'),
    body('currentMedications').optional().trim().isLength({ max: 1000 }).withMessage('Current medications must not exceed 1000 characters'),
    body('allergies').optional().trim().isLength({ max: 1000 }).withMessage('Allergies must not exceed 1000 characters'),
    body('previousInjuries').optional().trim().isLength({ max: 1000 }).withMessage('Previous injuries must not exceed 1000 characters'),
    body('physicalLimitations').optional().trim().isLength({ max: 1000 }).withMessage('Physical limitations must not exceed 1000 characters'),
    body('treatmentConsent').isBoolean().equals('true').withMessage('Treatment consent must be accepted'),
    body('privacyPolicyConsent').isBoolean().equals('true').withMessage('Privacy policy consent must be accepted'),
    body('communicationConsent').isBoolean().equals('true').withMessage('Communication consent must be accepted'),
    body('howDidYouHear').optional().trim().isLength({ max: 100 }).withMessage('How did you hear about us must not exceed 100 characters'),
    body('additionalNotes').optional().trim().isLength({ max: 1000 }).withMessage('Additional notes must not exceed 1000 characters'),
  ],
  validateRequest,
  consentFormController.submitConsentForm
);

// GET /api/v1/consent-form/booking/:bookingId - Get consent form by booking ID (Admin/Staff only)
router.get(
  '/booking/:bookingId',
  authenticateToken,
  authorizeRole(['admin', 'staff']),
  [
    param('bookingId').isUUID().withMessage('Valid booking ID is required')
  ],
  validateRequest,
  consentFormController.getConsentFormByBookingId
);

module.exports = router;