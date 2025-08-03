const jwt = require("jsonwebtoken");
const config = require("../config");
const { User, Role } = require("../models"); // Assuming models/index.js exports User and Role

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ message: "Authentication required: No token provided." });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Fetch user and role details from DB to ensure user exists and has valid role
    const user = await User.findByPk(decoded.id, {
        include: [{ model: Role, attributes: ["name"] }] // Include role name
    });

    if (!user || !user.isActive) {
        return res.status(403).json({ message: "Forbidden: User not found or inactive." });
    }

    // Attach user object (with role) to the request for use in subsequent middleware/controllers
    req.user = {
        id: user.id,
        email: user.email,
        role: user.Role.name // Attach role name
    };

    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: "Unauthorized: Token expired." });
    } else if (err instanceof jwt.JsonWebTokenError) {
        return res.status(403).json({ message: "Forbidden: Invalid token." });
    } else {
        console.error("Authentication error:", err);
        return res.status(500).json({ message: "Internal server error during authentication." });
    }
  }
};

// Middleware to check for specific roles
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Forbidden: User role not available." });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: `Forbidden: Access denied. Required roles: ${allowedRoles.join(", ")}` });
    }

    next(); // User has the required role
  };
};

module.exports = { authenticateToken, authorizeRole };

