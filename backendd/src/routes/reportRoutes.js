const express = require("express");
const { query } = require("express-validator");
const reportController = require("../controllers/reportController");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const router = express.Router();

// --- Admin/Staff Routes ---

// GET /api/v1/reports/revenue - Get revenue report
router.get(
    "/revenue",
    authenticateToken,
    authorizeRole("admin", "staff"),
    [
        query("startDate").isISO8601().toDate().withMessage("Valid start date is required (YYYY-MM-DD)"),
        query("endDate").isISO8601().toDate().withMessage("Valid end date is required (YYYY-MM-DD)")
            .custom((value, { req }) => new Date(value) >= new Date(req.query.startDate)).withMessage("End date must be after or same as start date"),
        query("therapistId").optional().isUUID().withMessage("Therapist ID must be a positive integer"),
        query("serviceId").optional().isUUID().withMessage("Service ID must be a positive integer"),
    ],
    validateRequest,
    reportController.getRevenueReport
);

// GET /api/v1/reports/booking-stats - Get booking statistics report
router.get(
    "/booking-stats",
    authenticateToken,
    authorizeRole("admin", "staff"),
    [
        query("startDate").isISO8601().toDate().withMessage("Valid start date is required (YYYY-MM-DD)"),
        query("endDate").isISO8601().toDate().withMessage("Valid end date is required (YYYY-MM-DD)")
            .custom((value, { req }) => new Date(value) >= new Date(req.query.startDate)).withMessage("End date must be after or same as start date"),
        query("therapistId").optional().isUUID().withMessage("Therapist ID must be a positive integer"),
        query("serviceId").optional().isUUID().withMessage("Service ID must be a positive integer"),
    ],
    validateRequest,
    reportController.getBookingStatsReport
);

// TODO: Add more report endpoints as needed (e.g., client demographics, therapist performance)

module.exports = router;

