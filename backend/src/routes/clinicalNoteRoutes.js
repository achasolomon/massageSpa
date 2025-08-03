const express = require("express");
const { body, param, query } = require("express-validator");
const clinicalNoteController = require("../controllers/clinicalNoteController");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const router = express.Router();

// --- Therapist Routes ---

// POST /api/v1/clinical-notes - Create a clinical note for a booking (Therapist only)
router.post(
    "/",
    authenticateToken,
    authorizeRole(["therapist", "admin"]),
    [
        body("bookingId").isUUID({ gt: 0 }).withMessage("Booking ID must be a UUID"),
        body("notes").notEmpty().withMessage("Clinical notes cannot be empty"),
        body("subjective").optional().isString(),
        body("objective").optional().isString(),
        body("assessment").optional().isString(),
        body("plan").optional().isString(),
    ],
    validateRequest,
    clinicalNoteController.createClinicalNote // Controller needs to verify therapist owns the booking
);

// GET /api/v1/clinical-notes/booking/:bookingId - Get clinical note for a specific booking (Therapist/Admin/Staff)
router.get(
    "/booking/:bookingId",
    authenticateToken,
    authorizeRole(["admin", "staff", "therapist"]),
    [param("bookingId").isUUID().withMessage("Booking ID must be a  UUID")],
    validateRequest,
    clinicalNoteController.getClinicalNoteByBookingId // Controller needs role/ownership check
);

// PUT /api/v1/clinical-notes/:id - Update a clinical note (Therapist who created it, or Admin/Staff)
router.put(
    "/:id",
    authenticateToken,
    authorizeRole(["admin", "staff", "therapist"]),
    [
        param("id").isUUID().withMessage("Note ID must be a UUID"),
        body("notes").optional().notEmpty().withMessage("Clinical notes cannot be empty"),
        body("subjective").optional().isString(),
        body("objective").optional().isString(),
        body("assessment").optional().isString(),
        body("plan").optional().isString(),
    ],
    validateRequest,
    clinicalNoteController.updateClinicalNote // Controller needs ownership/role check
);

// --- Admin/Staff Routes ---

// GET /api/v1/clinical-notes - Get all clinical notes (Admin/Staff only)
router.get(
    "/",
    authenticateToken,
    authorizeRole(["admin", "staff"]),
    [
        query("page").optional().isInt({ gt: 0 }).withMessage("Page must be a positive integer"),
        query("limit").optional().isInt({ gt: 0 }).withMessage("Limit must be a positive integer"),
        query("therapistId").optional().isUUID().withMessage("Therapist ID must be a UUID"),
        query("clientId").optional().isUUID().withMessage("Client ID must be a UUID"),
        query("bookingId").optional().isUUID().withMessage("Booking ID must be a UUID"),
    ],
    validateRequest,
    clinicalNoteController.getAllClinicalNotes
);

router.post('/complete',
    authenticateToken,
    authorizeRole(['admin', 'therapist', 'staff']),
    validateRequest,
    clinicalNoteController.createCompleteNote
);

// GET /api/v1/clinical-notes/my-notes - Therapist: Get only their own notes
router.get(
    "/my-notes",
    authenticateToken,
    authorizeRole("therapist"),
    [
        query("page").optional().isInt({ gt: 0 }).withMessage("Page must be a positive integer"),
        query("limit").optional().isInt({ gt: 0 }).withMessage("Limit must be a positive integer"),
    ],
    validateRequest,
    clinicalNoteController.getTherapistClinicalNotes
);


// PATCH /api/v1/clinical-notes/:id/auto-save - Real-time save endpoint
router.patch(
    "/:id/auto-save",
    authenticateToken,
    authorizeRole(["admin", "staff", "therapist"]),
    [
        param("id").isUUID().withMessage("Note ID must be a valid UUID"),
        body("objective").optional().isString(),
        body("assessment").optional().isString(),
        body("plan").optional().isString(),
        body("generalNotes").optional().isString(),
    ],
    validateRequest,
    clinicalNoteController.autoSaveClinicalNote
);

// GET /api/v1/clinical-notes/:id - Get a specific clinical note by ID (Admin/Staff)
router.get(
    "/:id",
    authenticateToken,
    authorizeRole(["admin", "staff", "therapist"]),
    [param("id").isUUID().withMessage("Note ID must be a UUID")],
    validateRequest,
    clinicalNoteController.getClinicalNoteById
);

// DELETE /api/v1/clinical-notes/:id - Delete a clinical note (Admin only?)
router.delete(
    "/:id",
    authenticateToken,
    authorizeRole("admin"), // Restrict deletion to Admin?
    [param("id").isUUID().withMessage("Note ID must be a UUID")],
    validateRequest,
    clinicalNoteController.deleteClinicalNote
);

module.exports = router;

