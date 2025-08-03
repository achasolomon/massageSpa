const express = require("express");
const authRoutes = require("./authRoutes");
const serviceRoutes = require("./serviceRoutes");
const bookingRoutes = require("./bookingRoutes");
const userRoutes = require("./userRoutes");
const therapistRoutes = require("./therapistRoutes");
const scheduleRoutes = require("./scheduleRoutes");
const reportRoutes = require("./reportRoutes");
const reminderRoutes = require("./reminderRoutes");
const clinicalNoteRoutes = require("./clinicalNoteRoutes");
const roleRoutes = require("./roleRoutes");
const clientRoutes = require("./clientRoutes")
const dashboardRoutes = require("./dashboardRoutes");
const uploadRoutes = require("./uploadRoutes");
const consentFormRoutes = require("./consentFormRoutes");
const anatomicalMakingRoutes = require("./anatomicalMarkingRoutes")
const settingsRoutes = require("./settingsRoutes")
const paymnentRoutes = require("./paymentRoutes");

const router = express.Router();

// Mount authentication routes
router.use("/auth", authRoutes);

// Mount service routes (publicly accessible for booking site)
router.use("/services", serviceRoutes);

// TODO: Mount other routes (many will require authentication/authorization)
 router.use("/bookings", bookingRoutes);
router.use("/users", userRoutes);
router.use("/therapists", therapistRoutes);
router.use("/schedule", scheduleRoutes);
router.use("/reports", reportRoutes);
router.use("/reminders", reminderRoutes);  
router.use("/clinical-notes", clinicalNoteRoutes); 
router.use("/roles", roleRoutes);
router.use("/clients", clientRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/upload", uploadRoutes);
router.use("/consent-form", consentFormRoutes);
router.use("/anatomical-markings", anatomicalMakingRoutes);
router.use("/settings", settingsRoutes);
router.use("/payments", paymnentRoutes);


module.exports = router;

