const express = require("express");
const { body, param, query } = require("express-validator");
const userController = require("../controllers/userController");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const router = express.Router();

// --- Admin Routes ---

// GET /api/v1/users - Get all users (Admin only)
router.get(
    "/",
    authenticateToken,
    authorizeRole("admin"),
    [
        query("page").optional().isInt({ gt: 0 }).withMessage("Page must be a positive integer"),
        query("limit").optional().isInt({ gt: 0 }).withMessage("Limit must be a positive integer"),
        query("role").optional().isIn(["admin", "staff", "therapist", "client"]).withMessage("Invalid role filter"),
        query("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
    ],
    validateRequest,
    userController.getAllUsers
);

// GET /api/v1/users/:id - Get a single user by ID (Admin only)
router.get(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    [param("id").isUUID().withMessage("User ID must be a valid UUID")],
    validateRequest,
    userController.getUserById
);

// POST /api/v1/users - Create a new user (Admin only)
router.post(
    "/",
    authenticateToken,
    authorizeRole("admin"),
    [
        body("firstName").notEmpty().withMessage("First name is required"),
        body("lastName").notEmpty().withMessage("Last name is required"),
        body("email").isEmail().withMessage("Please provide a valid email address"),
        body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
        body("roleId").isInt({ gt: 0 }).withMessage("Role ID must be a positive integer"),
        body("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
        // Add validation for therapist-specific fields if role is therapist
        body("therapistDetails.specializations").if(body("roleId").custom((value, { req }) => req.body.roleName === 'therapist')).optional().isArray().withMessage("Specializations must be an array"),
        body("therapistDetails.bio").if(body("roleId").custom((value, { req }) => req.body.roleName === 'therapist')).optional().isString().withMessage("Bio must be a string"),
    ],
    validateRequest,
    userController.createUser
);

// PUT /api/v1/users/:id - Update a user (Admin only)
router.put(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    [
        [param("id").isUUID().withMessage("User ID must be a valid UUID")],
        body("firstName").optional().notEmpty().withMessage("First name cannot be empty"),
        body("lastName").optional().notEmpty().withMessage("Last name cannot be empty"),
        body("email").optional().isEmail().withMessage("Please provide a valid email address"),
        body("roleId").optional().isInt({ gt: 0 }).withMessage("Role ID must be a positive integer"),
        body("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
        // Add validation for therapist-specific fields if role is therapist
        body("therapistDetails.specializations").if(body("roleId").custom((value, { req }) => req.body.roleName === 'therapist')).optional().isArray().withMessage("Specializations must be an array"),
        body("therapistDetails.bio").if(body("roleId").custom((value, { req }) => req.body.roleName === 'therapist')).optional().isString().withMessage("Bio must be a string"),
    ],
    validateRequest,
    userController.updateUser
);

// DELETE /api/v1/users/:id - Deactivate/Delete a user (Admin only)
router.delete(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    [param("id").isUUID().withMessage("User ID must be a valid UUID")],
    validateRequest,
    userController.deleteUser // Or deactivateUser
);

// --- Profile Routes (for logged-in user) ---

// GET /api/v1/users/profile/me - Get current user's profile
router.get(
    "/profile/me",
    authenticateToken,
    userController.getCurrentUserProfile
);

// PUT /api/v1/users/profile/me - Update current user's profile
router.put(
    "/profile/me",
    authenticateToken,
    [
        body("firstName").optional().notEmpty().withMessage("First name cannot be empty"),
        body("lastName").optional().notEmpty().withMessage("Last name cannot be empty"),
        body("email").optional().isEmail().withMessage("Please provide a valid email address"),
        // Allow password change separately
    ],
    validateRequest,
    userController.updateCurrentUserProfile
);

// PUT /api/v1/users/profile/change-password - Change current user's password
router.put(
    "/profile/change-password",
    authenticateToken,
    [
        body("currentPassword").notEmpty().withMessage("Current password is required"),
        body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters long"),
    ],
    validateRequest,
    userController.changeCurrentUserPassword
);


module.exports = router;

