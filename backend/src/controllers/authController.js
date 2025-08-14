const { User, Role } = require("../models");
const jwt = require("jsonwebtoken");
const config = require("../config");

// Login User
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    // Find user by email, include their role name
    const user = await User.findOne({
      where: { email },
      include: [{ 
        model: Role,
        as: 'role',
        attributes: ["name"] 
      }],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials: User not found." });
    }

    if (!user.isActive) {
        return res.status(403).json({ message: "Forbidden: User account is inactive." });
    }

    // Check if password is valid
    const isMatch = await user.isValidPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials: Incorrect password." });
    }

    // User matched, create JWT Payload
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role.name, // Include role name in the token payload
    };

    // Sign token
    const token = jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: "1d" } // Token expires in 1 day (adjust as needed)
    );

    res.json({
      success: true,
      token: `Bearer ${token}`,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role.name,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};

// Register User (Example - potentially restricted access)
// This might be used by an Admin to create Therapist/Staff accounts
exports.registerUser = async (req, res) => {
  const { firstName, lastName, email, password, roleName, phone } = req.body; // Expect roleName like "Therapist", "Staff"

  if (!firstName || !lastName || !email || !password || !roleName) {
    return res.status(400).json({ message: "Missing required fields for registration." });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use." });
    }

    // Find the role ID based on the provided role name
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ message: `Invalid role specified: ${roleName}` });
    }

    // Create new user (password hashing is handled by the model hook)
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      roleId: role.id,
      phone,
      isActive: true, // New users are active by default
    });

    // Respond with the created user data (excluding password)
    res.status(201).json({
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      roleId: newUser.roleId,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
    });

  } catch (error) {
    console.error("Registration Error:", error);
    // Handle potential validation errors from Sequelize
    if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(err => err.message);
        return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server error during registration." });
  }
};

// Get Current User (Example)
exports.getCurrentUser = async (req, res) => {
    // req.user is attached by authenticateToken middleware
    if (!req.user) {
        return res.status(401).json({ message: "Not authorized" });
    }
    // Optionally fetch fresh data if needed, but token payload might suffice
    res.json({ user: req.user });
};

