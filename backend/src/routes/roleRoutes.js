const express = require("express");
const { body, param } = require("express-validator");
const roleController = require("../controllers/roleController");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const router = express.Router();

// GET /api/v1/roles - Get all roles (Admin only)
router.get("/", authenticateToken, authorizeRole(["admin", "staff"]), roleController.getAllRoles);

// GET /api/v1/roles/:id - Get a specific role
router.get(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "staff"]),
  [param("id").isInt({ gt: 0 }).withMessage("Role ID must be a positive integer")],
  validateRequest,
  roleController.getRoleById
);

// POST /api/v1/roles - Create a new role
router.post(
  "/",
  authenticateToken,
  authorizeRole(["admin", "staff"]),
  [
    body("name").notEmpty().withMessage("Role name is required"),
    body("description").optional().isString().withMessage("Description must be a string"),
  ],
  validateRequest,
  roleController.createRole
);

// PUT /api/v1/roles/:id - Update an existing role
router.put(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "staff"]),
  [
    param("id").isInt({ gt: 0 }).withMessage("Role ID must be a positive integer"),
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("description").optional().isString().withMessage("Description must be a string"),
  ],
  validateRequest,
  roleController.updateRole
);

// DELETE /api/v1/roles/:id - Delete a role
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "staff"]),
  [param("id").isInt({ gt: 0 }).withMessage("Role ID must be a positive integer")],
  validateRequest,
  roleController.deleteRole
);

module.exports = router;
