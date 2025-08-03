const express = require("express");
const { body, param, query } = require("express-validator");
const clientController = require("../controllers/clientController");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const router = express.Router();

// Middleware applied to all client routes: Must be authenticated and either Admin or Staff
router.use(authenticateToken, authorizeRole(["admin", "staff", "therapist"]));

// GET /api/v1/clients - Get all clients with pagination and search
router.get(
    "/",
    [
        query("page").optional().isInt({ gt: 0 }).withMessage("Page must be a positive integer"),
        query("limit").optional().isInt({ gt: 0 }).withMessage("Limit must be a positive integer"),
        query("search").optional().isString().trim(),
    ],
    validateRequest,
    clientController.getAllClients
);

// GET /api/v1/clients/:id - Get a specific client by ID
router.get(
    "/:id",
    [param("id").isUUID().withMessage("Client ID must be a valid UUID")],
    validateRequest,
    clientController.getClientById
);

// POST /api/v1/clients - Create a new client (manual entry)
router.post(
    "/",
    [
        body("firstName").notEmpty().withMessage("First name is required").trim(),
        body("lastName").notEmpty().withMessage("Last name is required").trim(),
        body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
        body("phone").optional({ checkFalsy: true }).isString().trim(),
        // Add validation for address if it exists in the model
        // body("address.street").optional().isString(),
        // body("address.city").optional().isString(),
        // ... etc
    ],
    validateRequest,
    clientController.createClient
);

// PUT /api/v1/clients/:id - Update a client
router.put(
    "/:id",
    [
        param("id").isUUID().withMessage("Client ID must be a valid UUID"),
        body("firstName").optional().notEmpty().withMessage("First name cannot be empty").trim(),
        body("lastName").optional().notEmpty().withMessage("Last name cannot be empty").trim(),
        body("email").optional().isEmail().withMessage("Valid email is required").normalizeEmail(),
        body("phone").optional({ checkFalsy: true }).isString().trim(),
        // Add validation for address updates
    ],
    validateRequest,
    clientController.updateClient
);

// DELETE /api/v1/clients/:id - Delete a client
router.delete(
    "/:id",
    [param("id").isUUID().withMessage("Client ID must be a valid UUID")],
    validateRequest,
    clientController.deleteClient // Consider soft delete implementation in controller
);

module.exports = router;

