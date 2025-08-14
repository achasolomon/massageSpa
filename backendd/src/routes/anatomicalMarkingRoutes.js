const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { validateRequest } = require('../middleware/validationMiddleware');
const anatomicalMarkingController = require('../controllers/anatomicalMarkingController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// Valid view types
const VALID_VIEWS = ['anterior', 'posterior', 'lateral_left', 'lateral_right', 'skeletal'];

// Valid marking types
const VALID_TYPES = ['pain', 'tension', 'injury', 'treatment', 'improvement', 'sensitive', 'trigger', 'note'];

// Common validation middleware
const validateClinicalNoteId = param('clinicalNoteId')
  .isUUID()
  .withMessage('Invalid clinical note ID format');

const validateMarkingId = param('id')
  .isString()
  .matches(/^[a-z]+-\d+-[a-z0-9]+$/)
  .withMessage('Invalid marking ID format');

// GET all markings for a clinical note
router.get(
  '/:clinicalNoteId',
  authenticateToken,
  validateClinicalNoteId,
  validateRequest,
  anatomicalMarkingController.getAllMarkings
);

// CREATE a new marking
router.post(
  '/:clinicalNoteId',
  authenticateToken,
  authorizeRole(['admin', 'therapist', 'staff']),
  validateClinicalNoteId,
  body('x')
    .isFloat({ min: 0, max: 100 })
    .withMessage('X coordinate must be between 0 and 100'),
  body('y')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Y coordinate must be between 0 and 100'),
  body('view')
    .isIn(VALID_VIEWS)
    .withMessage(`Invalid view, must be one of: ${VALID_VIEWS.join(', ')}`),
  body('type')
    .isIn(VALID_TYPES)
    .withMessage(`Invalid type, must be one of: ${VALID_TYPES.join(', ')}`),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  body('intensity')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('Intensity must be between 1 and 4'),
  body('color')
    .optional()
    .isHexColor()
    .withMessage('Invalid color format'),
  body('size')
    .optional()
    .isInt({ min: 8, max: 32 })
    .withMessage('Size must be between 8 and 32'),
  validateRequest,
  anatomicalMarkingController.createMarking
);

// UPDATE a marking
router.put(
  '/:id',
  authenticateToken,
  authorizeRole(['admin', 'therapist', 'staff']),
  validateMarkingId,
  body('x')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('X coordinate must be between 0 and 100'),
  body('y')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Y coordinate must be between 0 and 100'),
  body('type')
    .optional()
    .isIn(VALID_TYPES)
    .withMessage(`Invalid type, must be one of: ${VALID_TYPES.join(', ')}`),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  body('intensity')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('Intensity must be between 1 and 4'),
  body('color')
    .optional()
    .isHexColor()
    .withMessage('Invalid color format'),
  body('size')
    .optional()
    .isInt({ min: 8, max: 32 })
    .withMessage('Size must be between 8 and 32'),
  validateRequest,
  anatomicalMarkingController.updateMarking
);

// DELETE a marking
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole(['admin', 'therapist', 'staff']),
  validateMarkingId,
  validateRequest,
  anatomicalMarkingController.deleteMarking
);

// BULK update markings (for incremental updates)
router.post(
  '/:clinicalNoteId/bulk',
  authenticateToken,
  authorizeRole(['admin', 'therapist', 'staff']),
  validateClinicalNoteId,
  body('markings')
    .isObject()
    .withMessage('Markings must be an object grouped by view'),
  body('markings.*')
    .isArray()
    .withMessage('Each view must contain an array of markings'),
  body('markings.*.*.id')
    .isString()
    .matches(/^[a-z]+-\d+-[a-z0-9]+$/)
    .withMessage('Invalid marking ID format'),
  body('markings.*.*.x')
    .isFloat({ min: 0, max: 100 })
    .withMessage('X coordinate must be between 0 and 100'),
  body('markings.*.*.y')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Y coordinate must be between 0 and 100'),
  body('markings.*.*.view')
    .isIn(VALID_VIEWS)
    .withMessage(`Invalid view, must be one of: ${VALID_VIEWS.join(', ')}`),
  body('markings.*.*.type')
    .isIn(VALID_TYPES)
    .withMessage(`Invalid type, must be one of: ${VALID_TYPES.join(', ')}`),
  validateRequest,
  anatomicalMarkingController.bulkUpdateMarkings
);

// NEW: BULK sync markings (for complete replacement - this is what your frontend is calling)
router.post(
  '/:clinicalNoteId/bulk-sync',
  authenticateToken,
  authorizeRole(['admin', 'therapist', 'staff']),
  validateClinicalNoteId,
  body('markings')
    .isObject()
    .withMessage('Markings must be an object grouped by view'),
  validateRequest,
  anatomicalMarkingController.bulkSyncMarkings
);

module.exports = router;