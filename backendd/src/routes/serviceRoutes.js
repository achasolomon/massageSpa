const express = require("express");
const { body, param, query } = require("express-validator");
const serviceController = require("../controllers/serviceController");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const router = express.Router();

// --- Public Routes ---

// GET /api/v1/services - Get all services (with optional filtering)
router.get(
  "/",
  [
    query("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be true or false")
      .toBoolean(),
    query("includeOptions")
      .optional()
      .isBoolean()
      .withMessage("includeOptions must be true or false")
      .toBoolean(),
    query("includeAvailability")
      .optional()
      .isBoolean()
      .withMessage("includeAvailability must be true or false")
      .toBoolean(),
  ],
  validateRequest,
  serviceController.getAllServices
);

// GET /api/v1/services/categories - Get all service categories
router.get(
  "/categories",
  serviceController.getServiceCategories
);

// GET /api/v1/services/category/:category - Get services by category
router.get(
  "/category/:category",
  [
    param("category").notEmpty().withMessage("Category is required"),
    query("includeOptions")
      .optional()
      .isBoolean()
      .withMessage("includeOptions must be true or false")
      .toBoolean(),
    query("includeAvailability")
      .optional()
      .isBoolean()
      .withMessage("includeAvailability must be true or false")
      .toBoolean(),
  ],
  validateRequest,
  serviceController.getServicesByCategory
);

// GET /api/v1/services/:id - Get a single service by ID
router.get(
  "/:id",
  [
    param("id").isUUID().withMessage("Service ID must be a valid UUID"),
    query("includeOptions")
      .optional()
      .isBoolean()
      .withMessage("includeOptions must be true or false")
      .toBoolean(),
    query("includeAvailability")
      .optional()
      .isBoolean()
      .withMessage("includeAvailability must be true or false")
      .toBoolean(),
  ],
  validateRequest,
  serviceController.getServiceById
);

// GET /api/v1/services/:serviceId/availabilty/slots - Get available time slots for a specific date
router.get(
  "/:serviceId/availability/slots",
  [
    param("serviceId").isUUID().withMessage("Service ID must be a valid UUID"),
    query("date").isISO8601().withMessage("Date must be in YYYY-MM-DD format"),
    query("serviceOptionId")
      .isUUID()
      .withMessage("Service Option ID must be a valid UUID"),
    query("therapistId")
      .optional()
      .isUUID()
      .withMessage("Therapist ID must be a valid UUID"),
  ],
  validateRequest,
  serviceController.getAvailableSlots
);

// --- Admin Routes for Services ---

// POST /api/v1/services - Create a new service
router.post(
  "/",
  authenticateToken,
  authorizeRole("admin"),
  [
    body("name")
      .notEmpty()
      .withMessage("Service name is required")
      .isLength({ max: 255 })
      .withMessage("Service name must not exceed 255 characters"),
    body("description")
      .optional()
      .isString()
      .withMessage("Description must be a string")
      .isLength({ max: 1000 })
      .withMessage("Description must not exceed 1000 characters"),
    body("category")
      .optional()
      .isString()
      .withMessage("Category must be a string")
      .isLength({ max: 100 })
      .withMessage("Category must not exceed 100 characters"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be true or false"),
    // body("imageUrl")
    //   .optional()
    //   .isURL({ require_protocol: true, allow_underscores: true })
    //   .withMessage("Image URL must be a valid URL"),
    body("imageUrl")
      .optional()
      .custom((value) => {
        // Accept any http(s) URL (including localhost)
        if (/^https?:\/\/.+/.test(value)) return true;
        throw new Error("Image URL must be a valid URL");
      }),
    body("imagePublicId")
      .optional()
      .isString()
      .withMessage("Image public ID must be a string"),
  ],
  validateRequest,
  serviceController.createService
);

// PUT /api/v1/services/:id - Update a service
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  [
    param("id").isUUID().withMessage("Service ID must be a valid UUID"),
    body("name")
      .optional()
      .notEmpty()
      .withMessage("Service name cannot be empty")
      .isLength({ max: 255 })
      .withMessage("Service name must not exceed 255 characters"),
    body("description")
      .optional()
      .isString()
      .withMessage("Description must be a string")
      .isLength({ max: 1000 })
      .withMessage("Description must not exceed 1000 characters"),
    body("category")
      .optional()
      .isString()
      .withMessage("Category must be a string")
      .isLength({ max: 100 })
      .withMessage("Category must not exceed 100 characters"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be true or false"),
    body("imageUrl")
      .optional()
      .isURL()
      .withMessage("Image URL must be a valid URL"),
    body("imagePublicId")
      .optional()
      .isString()
      .withMessage("Image public ID must be a string"),
  ],
  validateRequest,
  serviceController.updateService
);

// DELETE /api/v1/services/:id - Delete/Deactivate a service
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  [
    param("id").isUUID().withMessage("Service ID must be a valid UUID"),
    query("hardDelete")
      .optional()
      .isBoolean()
      .withMessage("hardDelete must be true or false")
      .toBoolean(),
  ],
  validateRequest,
  serviceController.deleteService
);

// --- Admin Routes for Service Options ---

// GET /api/v1/services/:serviceId/options - Get all options for a service
router.get(
  "/:serviceId/options",
  authenticateToken,
  authorizeRole("admin", "staff"),
  [
    param("serviceId").isUUID().withMessage("Service ID must be a valid UUID"),
    query("includeInactive")
      .optional()
      .isBoolean()
      .withMessage("includeInactive must be true or false")
      .toBoolean(),
  ],
  validateRequest,
  serviceController.getServiceOptions
);

// POST /api/v1/services/:serviceId/options - Add an option to a service
router.post(
  "/:serviceId/options",
  authenticateToken,
  authorizeRole("admin"),
  [
    param("serviceId").isUUID().withMessage("Service ID must be a valid UUID"),
    body("duration")
      .isInt({ gt: 0 })
      .withMessage("Duration must be a positive integer (in minutes)"),
    body("price")
      .isFloat({ gt: 0 })
      .withMessage("Price must be a positive number"),
    body("optionName")
      .optional()
      .isString()
      .withMessage("Option name must be a string")
      .isLength({ max: 255 })
      .withMessage("Option name must not exceed 255 characters"),
      
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be true or false"),
  ],
  validateRequest,
  serviceController.addServiceOption
);

// PUT /api/v1/services/options/:optionId - Update a specific service option
router.put(
  "/options/:optionId",
  authenticateToken,
  authorizeRole("admin"),
  [
    param("optionId").isUUID().withMessage("Option ID must be a valid UUID"),
    body("duration")
      .optional()
      .isInt({ gt: 0 })
      .withMessage("Duration must be a positive integer (in minutes)"),
    body("price")
      .optional()
      .isFloat({ gt: 0 })
      .withMessage("Price must be a positive number"),
    body("optionName")
      .optional()
      .isString()
      .withMessage("Option name must be a string")
      .isLength({ max: 255 })
      .withMessage("Option name must not exceed 255 characters"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be true or false"),
  ],
  validateRequest,
  serviceController.updateServiceOption
);

// DELETE /api/v1/services/options/:optionId - Delete a specific service option
router.delete(
  "/options/:optionId",
  authenticateToken,
  authorizeRole("admin"),
  [
    param("optionId").isUUID().withMessage("Option ID must be a valid UUID"),
    query("hardDelete")
      .optional()
      .isBoolean()
      .withMessage("hardDelete must be true or false")
      .toBoolean(),
  ],
  validateRequest,
  serviceController.deleteServiceOption
);

// --- Admin Routes for Service Availability ---

// GET /api/v1/services/:serviceId/availability - Get availability rules for a service
router.get(
  "/:serviceId/availability",
  authenticateToken,
  authorizeRole("admin", "staff"),
  [
    param("serviceId").isUUID().withMessage("Service ID must be a valid UUID"),
    query("therapistId")
      .optional()
      .isUUID()
      .withMessage("Therapist ID must be a valid UUID"),
    query("date")
      .optional()
      .isISO8601()
      .withMessage("Date must be in YYYY-MM-DD format"),
    query("includeInactive")
      .optional()
      .isBoolean()
      .withMessage("includeInactive must be true or false")
      .toBoolean(),
  ],
  validateRequest,
  serviceController.getServiceAvailability
);

// POST /api/v1/services/:serviceId/availability - Add an availability rule
router.post(
  "/:serviceId/availability",
  authenticateToken,
  authorizeRole("admin"),
  [
    param("serviceId").isUUID().withMessage("Service ID must be a valid UUID"),
    body("therapistId")
      .optional()
      .isUUID()
      .withMessage("Therapist ID must be a valid UUID"),
    body("dayOfWeek")
      .optional({ checkFalsy: true })
      .isInt({ min: 0, max: 6 })
      .withMessage("Day of week must be between 0 (Sunday) and 6 (Saturday)"),
    body("specificDate")
      .optional({ checkFalsy: true })
      .isISO8601()
      .withMessage("Specific date must be in YYYY-MM-DD format"),
    body("startTime")
      .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
      .withMessage("Start time must be in HH:MM or HH:MM:SS format"),
    body("bookingLimit")
      .isInt({ min: 1 })
      .withMessage("Booking limit must be at least 1"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be true or false"),
    body("serviceOptionId")
      .notEmpty()
      .isUUID()
      .withMessage("Service Option ID must be a valid UUID"),
  ],
  validateRequest,
  serviceController.addServiceAvailability
);

// POST /api/v1/services/:serviceId/availability/bulk - Bulk create availability rules
router.post(
  "/:serviceId/availability/bulk",
  authenticateToken,
  authorizeRole("admin"),
  [
    param("serviceId").isUUID().withMessage("Service ID must be a valid UUID"),
    body("rules")
      .isArray({ min: 1 })
      .withMessage("Rules must be a non-empty array"),
    body("rules.*.therapistId")
      .optional()
      .isUUID()
      .withMessage("Therapist ID must be a valid UUID"),
    body("serviceOptionId")
      .notEmpty()
      .isUUID()
      .withMessage("Service Option ID must be a valid UUID"),
    body("rules.*.dayOfWeek")
      .optional()
      .isInt({ min: 0, max: 6 })
      .withMessage("Day of week must be between 0 and 6"),
    body("rules.*.specificDate")
      .optional()
      .isISO8601()
      .withMessage("Specific date must be in YYYY-MM-DD format"),
    body("rules.*.time")
      .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
      .withMessage("Time must be in HH:MM or HH:MM:SS format"),
    body("rules.*.bookingLimit")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Booking limit must be at least 1"),
    body("rules.*.isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be true or false"),
  ],
  validateRequest,
  serviceController.bulkCreateServiceAvailability
);

// PUT /api/v1/services/availability/:availabilityId - Update an availability rule
router.put(
  "/availability/:availabilityId",
  authenticateToken,
  authorizeRole("admin"),
  [
    param("availabilityId")
      .isUUID()
      .withMessage("Availability ID must be a valid UUID"),
    body("therapistId")
      .optional()
      .isUUID()
      .withMessage("Therapist ID must be a valid UUID"),
    body("dayOfWeek")
      .optional({ checkFalsy: true })
      .isInt({ min: 0, max: 6 })
      .withMessage("Day of week must be between 0 (Sunday) and 6 (Saturday)"),
    body("specificDate")
      .optional({ checkFalsy: true })
      .isISO8601()
      .withMessage("Specific date must be in YYYY-MM-DD format"),
    body("startTime")
      .optional()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
      .withMessage("Start time must be in HH:MM or HH:MM:SS format"),
    body("bookingLimit")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Booking limit must be at least 1"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be true or false"),
  ],
  validateRequest,
  serviceController.updateServiceAvailability
);

// DELETE /api/v1/services/availability/:availabilityId - Delete an availability rule
router.delete(
  "/availability/:availabilityId",
  authenticateToken,
  authorizeRole("admin"),
  [
    param("availabilityId")
      .isUUID()
      .withMessage("Availability ID must be a valid UUID"),
    query("hardDelete")
      .optional()
      .isBoolean()
      .withMessage("hardDelete must be true or false")
      .toBoolean(),
  ],
  validateRequest,
  serviceController.deleteServiceAvailability
);

module.exports = router;