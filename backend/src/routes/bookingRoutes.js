const express = require("express");
const { body, query, param } = require("express-validator");
const bookingController = require("../controllers/bookingController");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const router = express.Router();

// GET /api/v1/bookings/availability - Check therapist availability
router.get(
    "/availability",
    [
        query("therapistId").optional().isUUID().withMessage("Therapist ID must be a positive integer"),
        query("serviceId").isUUID().withMessage("Service ID must be a positive integer"),
        query("date").isISO8601().toDate().withMessage("Valid date is required (YYYY-MM-DD)"),
    ],
    validateRequest,
    // No auth needed for public availability check?
    bookingController.checkAvailability
);

// POST /api/v1/bookings - Create a new booking (Public/Client)
router.post(
    "/",
    [
        body("clientId").optional().isUUID().withMessage("Client ID must be a positive integer if provided"),
        body("clientDetails.firstName").if(body("clientId").not().exists()).notEmpty().withMessage("Client first name is required"),
        body("clientDetails.lastName").if(body("clientId").not().exists()).notEmpty().withMessage("Client last name is required"),
        body("clientDetails.email").if(body("clientId").not().exists()).isEmail().withMessage("Valid client email is required"),
        body("clientDetails.phone").if(body("clientId").not().exists()).notEmpty().withMessage("Client phone number is required"),
        // Changed from serviceId to serviceOptionId to match your frontend and controller
        body("serviceOptionId").isUUID().withMessage("Service Option ID must be a positive integer"),
        body("therapistId").optional().custom((value) => {
            if (value === "any" || value === null || value === undefined) return true;
        }),
        body("bookingTime").isISO8601().toDate().withMessage("Valid booking time is required (ISO8601 format)"),
        body("paymentMethod").isIn(["Credit Card", "Insurance", "Cash", "interac"]).withMessage("Invalid payment method"),
        body("paymentDetails.token").if(body("paymentMethod").equals("Credit Card")).notEmpty().withMessage("Payment token is required for credit card payments"),
        body("clientNotes").optional().isString().withMessage("Client notes must be a string"),
    ],
    validateRequest,
    bookingController.createBooking
);


// --- Admin/Staff Routes ---

// GET /api/v1/bookings - Get all bookings (Admin/Staff)
router.get(
    "/",
    authenticateToken,
    authorizeRole(["admin", "staff", "therapist"]), // Only Admin and Staff can view all bookings
    [
        query("page").optional().isInt({ gt: 0 }).withMessage("Page must be a positive integer"),
        query("limit").optional().isInt({ gt: 0 }).withMessage("Limit must be a positive integer"),
        query("status").optional().isIn(["pending", "confirmed", "completed", "cancelled", "no_show"]).withMessage("Invalid status filter"),
        query("therapistId").optional().isUUID().withMessage("Therapist ID must be a positive integer"),
        query("clientId").optional().isUUID().withMessage("Client ID must be a positive integer"),
        query("startDate").optional().isISO8601().toDate().withMessage("Invalid start date format"),
        query("endDate").optional().isISO8601().toDate().withMessage("Invalid end date format"),
    ],
    validateRequest,
    bookingController.getAllBookings
);

// GET /api/v1/bookings/incomplete-notes/therapist/:therapistId
router.get(
  "/incomplete-notes/therapist/:therapistId",
  authenticateToken,
  authorizeRole(["admin", "staff", "therapist"]),
  [param("therapistId").isUUID().withMessage("Therapist ID must be a valid UUID")],
  validateRequest,
  bookingController.getBookingsWithoutCompletedNotes
);
router.get(
  '/ready-for-notes',
  authenticateToken,
  authorizeRole(['admin', 'staff', 'therapist']),
  [
    query("page").optional().isInt({ gt: 0 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ gt: 0 }).withMessage("Limit must be a positive integer"),
    query("therapistId").optional().isUUID().withMessage("Therapist ID must be a valid UUID"),
  ],
  validateRequest,
  bookingController.getBookingsReadyForNotes
);
// GET /api/v1/bookings/:id - Get a single booking (Admin/Staff/Therapist - if assigned)
router.get(
    "/:id",
    authenticateToken,
    authorizeRole("admin", "staff", "therapist"), // Allow therapist to view their assigned bookings
    [param("id").isUUID().withMessage("Booking ID must be a UUID")],
    validateRequest,
    bookingController.getBookingById
);

// Get therapist's bookings
router.get(
  '/therapist/:therapistId',
  bookingController.getTherapistBookings
);

// Get client's bookings
router.get(
  '/client/:clientId',
  bookingController.getClientBookings
);

// PUT /api/v1/bookings/:id - Update a booking (Admin/Staff)
router.put(
    "/:id",
    authenticateToken,
    authorizeRole("admin", "staff"),
    [
        param("id").isUUID().withMessage("Booking ID must be a UUID"),
        body("therapistId").optional().isUUID().withMessage("Therapist ID must be UUID"),
        body("bookingTime").optional().isISO8601().toDate().withMessage("Valid booking time is required (ISO8601 format)"),
        body("status").optional().isIn(["Pending Confirmation", "Confirmed", "Completed", "Cancelled By Client", "Cancelled By Staff", "No Show"]).withMessage("Invalid booking status"),
    ],
    validateRequest,
    bookingController.updateBooking
);

// DELETE /api/v1/bookings/:id - Cancel/Delete a booking (Admin/Staff)
router.delete(
    "/:id",
    authenticateToken,
    authorizeRole("admin", "staff"),
    [param("id").isUUID().withMessage("Booking ID must be a UUID")],
    validateRequest,
    bookingController.deleteBooking // Or perhaps a cancelBooking method
);

module.exports = router;

