const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController"); // Assuming you have an authController
const { validateRequest } = require("../middleware/validationMiddleware"); // Assuming validation middleware exists

const router = express.Router();

// POST /api/v1/auth/register
router.post(
    "/register", 
    [
        body("firstName").notEmpty().withMessage("First name is required"),
        body("lastName").notEmpty().withMessage("Last name is required"),
        body("email").isEmail().withMessage("Please provide a valid email address"),
        body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
        // Add role validation if clients can self-register with specific roles
    ],
    validateRequest, // Middleware to handle validation errors
    authController.registerUser
);

// POST /api/v1/auth/login
router.post(
    "/login", 
    [
        body("email").isEmail().withMessage("Please provide a valid email address"),
        body("password").notEmpty().withMessage("Password is required"),
    ],
    validateRequest,
    authController.loginUser
);

module.exports = router;

