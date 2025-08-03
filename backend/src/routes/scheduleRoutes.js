const express = require("express");
const { body, param, query } = require("express-validator");
const scheduleController = require("../controllers/scheduleController");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const router = express.Router();

// Custom validation helpers
const dateValidation = (field) => {
  return query(field).optional().isISO8601().withMessage(`${field} must be in YYYY-MM-DD format`);
};

const timeValidation = (field) => {
  return body(field).custom((value) => {
    if (!value) return true;
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
    if (!timeRegex.test(value)) {
      throw new Error(`${field} must be in HH:mm or HH:mm:ss format`);
    }
    return true;
  });
};

const therapistIdValidation = (field = "therapistId") => {
  return param(field).isUUID().withMessage(`${field} must be a valid UUID`);
};

const scheduleTypeValidation = (field) => {
  return body(field).isIn(['WorkingHours', 'TimeOff']).withMessage(`${field} must be 'WorkingHours' or 'TimeOff'`);
};

// Fixed notes validation - allows null, undefined, or string
const notesValidation = (field) => {
  return body(field).custom((value) => {
    // Allow null, undefined, or empty string
    if (value === null || value === undefined || value === '') {
      return true;
    }
    // If value exists, it must be a string
    if (typeof value === 'string') {
      return true;
    }
    throw new Error(`${field} must be a string or null`);
  });
};

// --- HYBRID SCHEDULE ENDPOINTS ---

// Get therapist's daily schedule (Admin/Staff/Therapist)
router.get(
  "/therapist/:therapistId/daily",
  authenticateToken,
  authorizeRole(["admin", "staff", "therapist"]),
  [
    therapistIdValidation("therapistId"),
    dateValidation("date")
  ],
  validateRequest,
  scheduleController.getTherapistDailySchedule
);

// Get therapist's weekly schedule (Admin/Staff/Therapist)
router.get(
  "/therapist/:therapistId/weekly",
  authenticateToken,
  authorizeRole(["admin", "staff", "therapist"]),
  [
    therapistIdValidation("therapistId"),
    dateValidation("startDate")
  ],
  validateRequest,
  scheduleController.getTherapistWeeklySchedule
);

// Get all therapists schedule overview (Admin/Staff only)
router.get(
  "/overview",
  authenticateToken,
  authorizeRole(["admin", "staff"]),
  [
    dateValidation("date")
  ],
  validateRequest,
  scheduleController.getAllTherapistsScheduleOverview
);

// Get available booking slots for a therapist (Public/Authenticated)
router.get(
  "/availability/:therapistId",
  authenticateToken,
  [
    therapistIdValidation("therapistId"),
    query("date").isISO8601().withMessage("Date is required in YYYY-MM-DD format"),
    query("duration").optional().isInt({ min: 15, max: 480 }).withMessage("Duration must be between 15 and 480 minutes")
  ],
  validateRequest,
  scheduleController.getAvailableBookingSlots
);

// --- THERAPIST SELF-SERVICE ENDPOINTS ---

// Get my daily schedule (Therapist only)
router.get(
  "/my/daily",
  authenticateToken,
  authorizeRole(["therapist"]),
  [
    dateValidation("date")
  ],
  validateRequest,
  scheduleController.getMyDailySchedule
);

// Get my weekly schedule (Therapist only)
router.get(
  "/my/weekly",
  authenticateToken,
  authorizeRole(["therapist"]),
  [
    dateValidation("startDate")
  ],
  validateRequest,
  scheduleController.getMyWeeklySchedule
);

// Get my availability settings (Therapist only)
router.get(
  "/my/availability-settings",
  authenticateToken,
  authorizeRole(["therapist"]),
  scheduleController.getMyAvailabilitySettings
);

// Create my availability setting (Therapist only)
router.post(
  "/my/availability-settings",
  authenticateToken,
  authorizeRole(["therapist"]),
  [
    scheduleTypeValidation("type").notEmpty().withMessage("Type is required"),
    timeValidation("startTime").notEmpty().withMessage("Start time is required"),
    timeValidation("endTime").notEmpty().withMessage("End time is required"),
    body("dayOfWeek").optional().isInt({ min: 0, max: 6 }).withMessage("Day of week must be between 0 and 6"),
    body("specificDate").optional().isISO8601().withMessage("Specific date must be in YYYY-MM-DD format"),
    body("effectiveFrom").optional().isISO8601().withMessage("Effective from date must be in YYYY-MM-DD format"),
    body("effectiveTo").optional().isISO8601().withMessage("Effective to date must be in YYYY-MM-DD format"),
    notesValidation("notes"),
    // Custom validation for date/recurrence logic
    body().custom((value) => {
      const hasSpecificDate = value.specificDate;
      const hasDayOfWeek = value.dayOfWeek !== null && value.dayOfWeek !== undefined;
      
      if (hasSpecificDate && hasDayOfWeek) {
        throw new Error("Cannot specify both specificDate and dayOfWeek");
      }
      
      if (!hasSpecificDate && !hasDayOfWeek) {
        throw new Error("Must specify either specificDate or dayOfWeek");
      }
      
      return true;
    })
  ],
  validateRequest,
  scheduleController.createMyAvailabilitySetting
);

// --- AVAILABILITY MANAGEMENT (Admin/Staff) ---

// Get therapist's availability settings (Admin/Staff)
router.get(
  "/availability-settings/:therapistId",
  authenticateToken,
  authorizeRole(["admin", "staff", "therapist"]),
  [
    therapistIdValidation("therapistId")
  ],
  validateRequest,
  scheduleController.getTherapistAvailabilitySettings
);

// Create availability setting for therapist (Admin/Staff) - FIXED VALIDATION
router.post(
  "/availability-settings",
  authenticateToken,
  authorizeRole(["admin", "staff"]),
  [
    body("therapistId").isUUID().withMessage("Therapist ID must be a valid UUID"),
    scheduleTypeValidation("type").notEmpty().withMessage("Type is required"),
    timeValidation("startTime").notEmpty().withMessage("Start time is required"),
    timeValidation("endTime").notEmpty().withMessage("End time is required"),
    body("dayOfWeek").optional().isInt({ min: 0, max: 6 }).withMessage("Day of week must be between 0 and 6"),
    body("specificDate").optional().isISO8601().withMessage("Specific date must be in YYYY-MM-DD format"),
    body("effectiveFrom").optional().isISO8601().withMessage("Effective from date must be in YYYY-MM-DD format"),
    body("effectiveTo").optional().isISO8601().withMessage("Effective to date must be in YYYY-MM-DD format"),
    // FIXED: Use custom notes validation that properly handles null values
    notesValidation("notes"),
    // Custom validation for date/recurrence logic
    body().custom((value) => {
      const hasSpecificDate = value.specificDate;
      const hasDayOfWeek = value.dayOfWeek !== null && value.dayOfWeek !== undefined;
      
      if (hasSpecificDate && hasDayOfWeek) {
        throw new Error("Cannot specify both specificDate and dayOfWeek");
      }
      
      if (!hasSpecificDate && !hasDayOfWeek) {
        throw new Error("Must specify either specificDate or dayOfWeek");
      }
      
      return true;
    })
  ],
  validateRequest,
  scheduleController.createAvailabilitySetting
);

// Update availability setting (Admin/Staff/Therapist)
router.put(
  "/availability-settings/:id",
  authenticateToken,
  authorizeRole(["admin", "staff", "therapist"]),
  [
    param("id").isUUID().withMessage("Setting ID must be a valid UUID"),
    scheduleTypeValidation("type").optional(),
    timeValidation("startTime").optional(),
    timeValidation("endTime").optional(),
    body("dayOfWeek").optional().isInt({ min: 0, max: 6 }).withMessage("Day of week must be between 0 and 6"),
    body("specificDate").optional().isISO8601().withMessage("Specific date must be in YYYY-MM-DD format"),
    body("effectiveFrom").optional().isISO8601().withMessage("Effective from date must be in YYYY-MM-DD format"),
    body("effectiveTo").optional().isISO8601().withMessage("Effective to date must be in YYYY-MM-DD format"),
    notesValidation("notes"),
    body("isActive").optional().isBoolean().withMessage("isActive must be a boolean")
  ],
  validateRequest,
  scheduleController.updateAvailabilitySetting
);

// Delete availability setting (Admin/Staff/Therapist)
router.delete(
  "/availability-settings/:id",
  authenticateToken,
  authorizeRole(["admin", "staff", "therapist"]),
  [
    param("id").isUUID().withMessage("Setting ID must be a valid UUID")
  ],
  validateRequest,
  scheduleController.deleteAvailabilitySetting
);

// --- UTILITY ENDPOINTS ---

// Get therapist schedule statistics (Admin/Staff/Therapist)
router.get(
  "/stats/:therapistId",
  authenticateToken,
  authorizeRole(["admin", "staff", "therapist"]),
  [
    therapistIdValidation("therapistId"),
    dateValidation("startDate"),
    dateValidation("endDate")
  ],
  validateRequest,
  scheduleController.getTherapistScheduleStats
);

// Bulk update availability settings (Admin/Staff/Therapist)
router.post(
  "/bulk-availability",
  authenticateToken,
  authorizeRole(["admin", "staff", "therapist"]),
  [
    body("therapistId").optional().isUUID().withMessage("Therapist ID must be a valid UUID"),
    body("settings").isArray({ min: 1 }).withMessage("Settings array is required"),
    body("settings.*.type").isIn(['WorkingHours', 'TimeOff']).withMessage("Each setting type must be 'WorkingHours' or 'TimeOff'"),
    body("settings.*.startTime").matches(/^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/).withMessage("Each setting must have valid start time"),
    body("settings.*.endTime").matches(/^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/).withMessage("Each setting must have valid end time")
  ],
  validateRequest,
  scheduleController.bulkUpdateAvailability
);

// --- LEGACY COMPATIBILITY (Deprecated but maintained for transition) ---

// Legacy endpoints - redirect to new hybrid endpoints with deprecation warning
router.get("/", (req, res) => {
  res.status(410).json({
    success: false,
    message: "This endpoint has been deprecated. Use /overview for schedule overview or /therapist/:id/daily for specific schedules.",
    newEndpoints: {
      overview: "/api/v1/schedule/overview",
      therapistDaily: "/api/v1/schedule/therapist/:therapistId/daily",
      therapistWeekly: "/api/v1/schedule/therapist/:therapistId/weekly",
      mySchedule: "/api/v1/schedule/my/daily"
    }
  });
});

router.post("/", (req, res) => {
  res.status(410).json({
    success: false,
    message: "This endpoint has been deprecated. Use /availability-settings for managing base availability.",
    newEndpoint: "/api/v1/schedule/availability-settings"
  });
});

router.post(
  "/availability-settings/bulk",
  authenticateToken,
  authorizeRole(["admin", "staff"]),
  [
    body("settings").isArray({ min: 1 }).withMessage("Settings array is required"),
    body("settings.*.therapistId").isUUID().withMessage("Each setting must have a valid therapist ID"),
    body("settings.*.type").isIn(['WorkingHours', 'TimeOff']).withMessage("Each setting type must be 'WorkingHours' or 'TimeOff'"),
    body("settings.*.startTime").matches(/^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/).withMessage("Each setting must have valid start time"),
    body("settings.*.endTime").matches(/^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/).withMessage("Each setting must have valid end time"),
    body("settings.*.dayOfWeek").optional().isInt({ min: 0, max: 6 }).withMessage("Day of week must be between 0 and 6"),
    body("settings.*.specificDate").optional().isISO8601().withMessage("Specific date must be in YYYY-MM-DD format"),
    // Custom validation for each setting
    body("settings.*").custom((setting) => {
      const hasSpecificDate = setting.specificDate;
      const hasDayOfWeek = setting.dayOfWeek !== null && setting.dayOfWeek !== undefined;
      
      if (hasSpecificDate && hasDayOfWeek) {
        throw new Error("Cannot specify both specificDate and dayOfWeek in a setting");
      }
      
      if (!hasSpecificDate && !hasDayOfWeek) {
        throw new Error("Must specify either specificDate or dayOfWeek in each setting");
      }
      
      return true;
    })
  ],
  validateRequest,
  scheduleController.createBulkAvailabilitySettings
);

module.exports = router;