const { validationResult } = require("express-validator");

// Middleware to handle validation errors from express-validator
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Return a 400 Bad Request with the validation errors
        return res.status(400).json({ errors: errors.array() });
    }
    // If no errors, proceed to the next middleware or route handler
    next();
};

module.exports = { validateRequest };

