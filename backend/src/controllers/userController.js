const { User, Role, Therapist } = require("../models");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 10, role, isActive } = req.query;
  const offset = (page - 1) * limit;
  const whereClause = {};
  const roleWhereClause = {};

  if (role) {
    roleWhereClause.name = role;
  }
  if (isActive !== undefined) {
    whereClause.isActive = isActive === 'true';
  }

  try {
    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ["password"] },
      include: [{
        model: Role,
        as: 'role', // FIXED: Added alias
        attributes: ["name"],
        where: roleWhereClause,
        required: !!role
      }],
      order: [["lastName", "ASC"], ["firstName", "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    res.json({
      totalUsers: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      users: rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error while fetching users." });
  }
};

// Get user by ID (Admin only)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
      include: [{ 
        model: Role, 
        as: 'role', // FIXED: Added alias
        attributes: ["name"] 
      }],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ message: "Server error while fetching user." });
  }
};

// Create a new user (Admin only)
exports.createUser = async (req, res) => {
  const { firstName, lastName, email, password, roleId, isActive, therapistDetails } = req.body;

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use." });
    }

    // Check if role exists
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(400).json({ message: "Invalid Role ID specified." });
    }

    // Create user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      roleId,
      isActive: isActive !== undefined ? isActive : true,
    });

    // If the role is Therapist, create associated Therapist profile
    if (role.name === 'therapist' && therapistDetails) {
      await Therapist.create({
        userId: newUser.id,
        specialties: therapistDetails.specializations || [],
        bio: therapistDetails.bio || null,
        isActive: newUser.isActive,
      });
    }

    // Fetch the created user data - FIXED: Added alias
    const createdUser = await User.findByPk(newUser.id, {
        attributes: { exclude: ["password"] },
        include: [{ 
          model: Role, 
          as: 'role', // FIXED: Added alias
          attributes: ["name"] 
        }]
    });

    res.status(201).json(createdUser);

  } catch (error) {
    console.error("Error creating user:", error);
    if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(err => err.message);
        return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server error while creating user." });
  }
};

// Update user (Admin only)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone, roleId, isActive, therapistDetails } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Prevent email conflicts if email is being changed
    if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use by another account." });
        }
        user.email = email;
    }

    // Update basic fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (typeof isActive === "boolean") user.isActive = isActive;

    // Update role if roleId is provided
    let roleName = null;
    if (roleId) {
      const role = await Role.findByPk(roleId);
      if (!role) {
        return res.status(400).json({ message: `Invalid role specified: ${roleId}` });
      }
      user.roleId = role.id;
      roleName = role.name;
    }

    await user.save();

    // Update associated therapist details - FIXED: Added alias
    const currentRole = roleName || (await user.getRole()).name;
    if (currentRole === 'therapist' && therapistDetails) {
        let therapist = await Therapist.findOne({ 
          where: { userId: id },
          include: [{ 
            model: User, 
            as: 'user' // FIXED: Added alias
          }]
        });
        if (therapist) {
            if (therapistDetails.specializations) therapist.specialties = therapistDetails.specializations;
            if (therapistDetails.bio) therapist.bio = therapistDetails.bio;
            if (typeof isActive === "boolean") therapist.isActive = isActive;
            await therapist.save();
        } else {
            // If therapist profile doesn't exist, create it
             await Therapist.create({
                userId: user.id,
                specialties: therapistDetails.specializations || [],
                bio: therapistDetails.bio || null,
                isActive: user.isActive,
            });
        }
    }

    // Fetch updated user data - FIXED: Added alias
    const updatedUser = await User.findByPk(id, {
        attributes: { exclude: ["password"] },
        include: [{ 
          model: Role, 
          as: 'role', // FIXED: Added alias
          attributes: ["name"] 
        }]
    });

    res.json(updatedUser);

  } catch (error) {
    console.error("Error updating user:", error);
     if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(err => err.message);
        return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server error while updating user." });
  }
};


// Delete user (Admin only - soft delete by setting isActive=false)
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Soft delete
    user.isActive = false;
    await user.save();
    
    // Also deactivate associated therapist profile - FIXED: Added alias
    const therapist = await Therapist.findOne({ 
      where: { userId: id },
      include: [{ 
        model: User, 
        as: 'user' // FIXED: Added alias
      }]
    });
    if (therapist) {
        therapist.isActive = false;
        await therapist.save();
    }
    res.status(200).json({ message: "User deactivated successfully." });

  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error while deleting user." });
  }
};

// --- Profile Routes ---

// Get current user's profile
exports.getCurrentUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
      include: [{ 
        model: Role, 
        as: 'role', // FIXED: Added alias
        attributes: ["name"] 
      }],
    });

    if (!user) {
      return res.status(404).json({ message: "User profile not found." });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching current user profile:", error);
    res.status(500).json({ message: "Server error while fetching profile." });
  }
};

// Update current user's profile
exports.updateCurrentUserProfile = async (req, res) => {
  const userId = req.user.id;
  const { firstName, lastName, email, phone } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Prevent email conflicts if email is being changed
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use by another account." });
      }
      user.email = email;
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;

    await user.save();

    // Fetch updated user data - FIXED: Added alias
    const updatedUser = await User.findByPk(userId, {
        attributes: { exclude: ["password"] },
        include: [{ 
          model: Role, 
          as: 'role', // FIXED: Added alias
          attributes: ["name"] 
        }]
    });

    res.json(updatedUser);

  } catch (error) {
    console.error("Error updating current user profile:", error);
    if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(err => err.message);
        return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server error while updating profile." });
  }
};

// Change current user's password
exports.changeCurrentUserPassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;

    await user.save();

    res.json({ message: "Password changed successfully." });

  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error while changing password." });
  }
};

