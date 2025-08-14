const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');
const { Therapist } = require('../models');

const router = express.Router();

// GET /api/v1/dashboard/overview
router.get(
  '/overview',
  authenticateToken,
  authorizeRole(['admin', 'staff', 'therapist']),
  dashboardController.getOverview
);

module.exports = router;
