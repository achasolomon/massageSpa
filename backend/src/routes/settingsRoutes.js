// routes/settingsRoutes.js

const express = require("express");
const { body } = require("express-validator");
const settingsController = require("../controllers/settingsController");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const router = express.Router();

// GET /api/v1/settings - Get current settings (Public access for basic info)
router.get(
  "/",
  settingsController.getSettings
);

// PUT /api/v1/settings - Create or update settings (Admin only)
router.put(
  "/",
  authenticateToken,
  authorizeRole(["admin"]),
  [
    body("companyName").optional().isString().withMessage("Company name must be a string"),
    body("companyAddress").optional().isString().withMessage("Company address must be a string"),
    body("phoneNumber1").optional().isString().withMessage("Phone number 1 must be a string"),
    body("phoneNumber2").optional().isString().withMessage("Phone number 2 must be a string"),
    body("supportEmail").optional().isEmail().withMessage("Support email must be valid"),
    body("businessEmail").optional().isEmail().withMessage("Business email must be valid"),
    body("website").optional().isURL().withMessage("Website must be a valid URL"),
    body("themeColor").optional().matches(/^#[0-9A-F]{6}$/i).withMessage("Theme color must be a valid hex color"),
    body("secondaryColor").optional().matches(/^#[0-9A-F]{6}$/i).withMessage("Secondary color must be a valid hex color"),
    body("currency").optional().isLength({ min: 3, max: 3 }).withMessage("Currency must be 3 characters"),
    body("currencySymbol").optional().isString().withMessage("Currency symbol must be a string"),
    body("timezone").optional().isString().withMessage("Timezone must be a string"),
    body("dateFormat").optional().isString().withMessage("Date format must be a string"),
    body("timeFormat").optional().isString().withMessage("Time format must be a string"),
    body("bookingConfirmationRequired").optional().isBoolean().withMessage("Booking confirmation required must be boolean"),
    body("autoAssignTherapist").optional().isBoolean().withMessage("Auto assign therapist must be boolean"),
    body("emailNotificationsEnabled").optional().isBoolean().withMessage("Email notifications enabled must be boolean"),
    body("smsNotificationsEnabled").optional().isBoolean().withMessage("SMS notifications enabled must be boolean"),
    body("cancellationPolicy").optional().isString().withMessage("Cancellation policy must be a string"),
    body("termsAndConditions").optional().isString().withMessage("Terms and conditions must be a string"),
    body("privacyPolicy").optional().isString().withMessage("Privacy policy must be a string"),
    body("socialMediaLinks").optional().isObject().withMessage("Social media links must be an object"),
    body("businessHours").optional().isObject().withMessage("Business hours must be an object"),
  ],
  validateRequest,
  settingsController.updateSettings
);

// DELETE /api/v1/settings - Deactivate settings (Admin only)
router.delete(
  "/",
  authenticateToken,
  authorizeRole(["admin"]),
  settingsController.deleteSettings
);

module.exports = router;