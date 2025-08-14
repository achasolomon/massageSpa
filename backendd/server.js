require("dotenv").config(); 

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./src/config");
const db = require("./src/models");
const apiRoutes = require("./src/routes"); 
const errorHandler = require("./src/middleware/errorHandler");
const scheduleReminderJob = require('./src/utils/reminderMail');
const path = require('path');
const app = express();

// --- Middleware ---
app.set('trust proxy', 1); 

// Enable CORS
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  exposedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition']
}));
// Set security-related HTTP headers
app.use(helmet());

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api", limiter); // Apply rate limiting to all API routes

// --- Routes ---

app.use('/uploads', (req, res, next) => {
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', config.clientUrl);
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// Mount main API routes under /api/v1
app.use("/api/v1", apiRoutes);

// --- Error Handling ---
// Not found handler (if no route matched)
app.use((req, res, next) => {
    res.status(404).json({ message: "Not Found" });
});


// Centralized error handling middleware (must be last middleware)
app.use(errorHandler);

// --- Database Connection & Server Start ---

const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    // Sync database models (use migrations in production!)
     await db.sequelize.sync({ force: false }); // force: true will drop and recreate tables
    console.log("Database synchronized.");

        // Start scheduled jobs
    scheduleReminderJob();

    // Start the server
    app.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
      console.log(`API available at http://localhost:${config.port}/api/v1`);
      console.log(`Frontend expected at ${config.clientUrl}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database or start server:", error);
    process.exit(1);
  }
};


startServer();

module.exports = app; 

