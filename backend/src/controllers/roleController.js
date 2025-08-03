const { Role } = require("../models");

// Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({ order: [["id", "ASC"]] });
    res.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ message: "Server error while fetching roles." });
  }
};

// Get role by ID
exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found." });
    }
    res.json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    res.status(500).json({ message: "Server error while fetching role." });
  }
};

// Create new role
exports.createRole = async (req, res) => {
  const { name, description } = req.body;
  try {
    const existing = await Role.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ message: "Role name already exists." });
    }
    const role = await Role.create({ name, description });
    res.status(201).json(role);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ message: "Server error while creating role." });
  }
};

// Update role
exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found." });
    }

    if (name) role.name = name;
    if (description) role.description = description;

    await role.save();
    res.json(role);
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ message: "Server error while updating role." });
  }
};

// Delete role
exports.deleteRole = async (req, res) => {
  const { id } = req.params;
  try {
    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found." });
    }

    await role.destroy();
    res.status(200).json({ message: "Role deleted successfully." });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ message: "Server error while deleting role." });
  }
};
