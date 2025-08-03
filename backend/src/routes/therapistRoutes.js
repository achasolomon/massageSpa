const express = require("express");
const { body, param, query } = require("express-validator");
const therapistController = require("../controllers/therapistController");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const router = express.Router();

// --- Public Routes ---

// GET /api/v1/therapists/public - Get publicly available therapist info (e.g., for booking page)
router.get(
    "/public",
    [
        query("serviceId").optional().isInt({ gt: 0 }).withMessage("Service ID must be a positive integer"),
        // Add other relevant filters if needed (e.g., location, availability window)
    ],
    validateRequest,
    therapistController.getPublicTherapists // A specific controller for public view
);

// --- Admin/Staff Routes ---

// GET /api/v1/therapists - Get all therapists (Admin/Staff)
router.get(
    "/",
    authenticateToken,
    authorizeRole(["admin", "staff"]),
    [
        query("page").optional().isInt({ gt: 0 }).withMessage("Page must be a positive integer"),
        query("limit").optional().isInt({ gt: 0 }).withMessage("Limit must be a positive integer"),
        query("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
        query("serviceId").optional().isInt({ gt: 0 }).withMessage("Service ID must be a positive integer"),
    ],
    validateRequest,
    therapistController.getAllTherapists
);

// GET /api/v1/therapists/:id - Get a single therapist by ID (Admin/Staff)
router.get(
    "/:id",
    authenticateToken,
    authorizeRole(["admin", "staff"]),
    [param("id").isUUID().withMessage("User ID must be a valid UUID")],
    validateRequest,
    therapistController.getTherapistById
);

// POST /api/v1/therapists - Create a new therapist (Admin only - linked to a User)
// Note: Therapist creation might be part of User creation or a separate step after User exists
router.post(
    "/",
    authenticateToken,
    authorizeRole(["admin"]),
    [

    ],
    validateRequest,
    therapistController.createTherapist // Assumes User already exists
);

// PUT /api/v1/therapists/:id - Update a therapist (Admin only)
router.put(
    "/:id",
    authenticateToken,
    authorizeRole(["admin"]),
    [
        [
            param("id").isUUID().withMessage("User ID must be a valid UUID"),

            // If specializations is stored as JSON string in DB
            body("specialties")
                .optional()
                .isString()
                .withMessage("Specialties must be a JSON string")
                .custom((value) => {
                    if (value) {
                        try {
                            const parsed = JSON.parse(value);
                            if (!Array.isArray(parsed)) {
                                throw new Error("Specialties JSON must represent an array");
                            }
                            // Validate each item in the array is a string
                            if (!parsed.every(item => typeof item === 'string')) {
                                throw new Error("Each specialties must be a string");
                            }
                        } catch (error) {
                            throw new Error("Invalid JSON format for specializations");
                        }
                    }
                    return true;
                }),

            body("bio")
                .optional()
                .isString()
                .withMessage("Bio must be a string"),

            // If servicesOffered is stored as JSON string in DB
            body("servicesOffered")
                .optional()
                .isString()
                .withMessage("Services offered must be a JSON string")
                .custom((value) => {
                    if (value) {
                        try {
                            const parsed = JSON.parse(value);
                            if (!Array.isArray(parsed)) {
                                throw new Error("Services offered JSON must represent an array");
                            }
                            // Validate each item is a positive integer
                            if (!parsed.every(item => Number.isInteger(item) && item > 0)) {
                                throw new Error("Each service ID must be a positive integer");
                            }
                        } catch (error) {
                            throw new Error("Invalid JSON format for services offered");
                        }
                    }
                    return true;
                }),

            body("isActive")
                .optional()
                .isBoolean()
                .withMessage("isActive must be true or false")
        ]
    ],
    validateRequest,
    therapistController.updateTherapist
);

// DELETE /api/v1/therapists/:id - Deactivate/Delete a therapist (Admin only)
router.delete(
    "/:id",
    authenticateToken,
    authorizeRole(["admin"]),
    [param("id").isUUID().withMessage("User ID must be a valid UUID")],
    validateRequest,
    therapistController.deleteTherapist // Or deactivate
);

// --- Therapist Specific Routes (for the logged-in therapist) ---

// GET /api/v1/therapists/schedule/me - Get own schedule
router.get(
    "/schedule/me",
    authenticateToken,
    authorizeRole(["therapist"]),
    therapistController.getMySchedule // Needs implementation in controller
);

// GET /api/v1/therapists/bookings/me - Get own assigned bookings
router.get(
    "/bookings/me",
    authenticateToken,
    authorizeRole(["therapist"]),
    therapistController.getMyBookings // Needs implementation in controller
);

// GET /api/v1/therapists/me - Get current therapist info
router.get(
  "/me",
  authenticateToken,
  authorizeRole(["therapist"]),
  async (req, res) => {
    try {
      const therapistUserId = req.user.id;
      
      const therapist = await Therapist.findOne({
        where: { userId: therapistUserId },
        include: [{
          model: User,
          attributes: ["id", "firstName", "lastName", "email"]
        }]
      });
      
      if (!therapist) {
        return res.status(404).json({
          success: false,
          message: "Therapist profile not found"
        });
      }
      
      res.json({
        success: true,
        therapist: therapist.toJSON()
      });
      
    } catch (error) {
      console.error("Error fetching therapist info:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch therapist information"
      });
    }
  }
);

module.exports = router;

