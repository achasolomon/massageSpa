const { BaseError } = require("sequelize"); // Import BaseError for Sequelize specific errors

// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error("\n--- Error Handler --- ");
  console.error("Error Name:", err.name);
  console.error("Error Message:", err.message);
  // console.error("Error Stack:", err.stack); // Uncomment for detailed stack trace during development

  let statusCode = err.statusCode || 500; // Default to 500 Internal Server Error
  let message = err.message || "An unexpected error occurred.";
  let errors = err.errors; // For validation errors

  // Handle specific error types
  if (err instanceof BaseError) { // Sequelize errors
    // Handle specific Sequelize errors if needed (e.g., UniqueConstraintError)
    if (err.name === "SequelizeUniqueConstraintError") {
        statusCode = 400;
        message = "Database constraint violation.";
        errors = err.errors.map(e => ({ field: e.path, message: e.message }));
    } else if (err.name === "SequelizeValidationError") {
        statusCode = 400;
        message = "Validation Error";
        errors = err.errors.map(e => ({ field: e.path, message: e.message }));
    } else {
        // Generic Sequelize error
        message = "Database operation failed.";
    }
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401; // Unauthorized or Forbidden might be more appropriate depending on context
    message = "Invalid or expired authentication token.";
  } else if (err.name === "SyntaxError" && err.status === 400 && "body" in err) {
    // Handle JSON parsing errors
    statusCode = 400;
    message = "Invalid JSON payload received.";
  }

  // Ensure status code is within valid range
  if (statusCode < 100 || statusCode > 599) {
      console.warn(`Invalid status code ${statusCode} detected, defaulting to 500.`);
      statusCode = 500;
  }

  // Send the response
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }), // Include errors array if present
  });
};

module.exports = errorHandler;

