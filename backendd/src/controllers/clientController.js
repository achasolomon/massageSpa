const { Client, Booking, ClinicalNote, User } = require("../models");
const { Op } = require("sequelize");

// Get all clients (Admin/Staff only)
exports.getAllClients = async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (search) {
        whereClause[Op.or] = [
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } },
        ];
    }

    try {
        const { count, rows } = await Client.findAndCountAll({
            where: whereClause,
            order: [["lastName", "ASC"], ["firstName", "ASC"]],
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true,
            // Optionally include related data counts if needed
            // attributes: {
            //     include: [
            //         [sequelize.fn("COUNT", sequelize.col("Bookings.id")), "bookingCount"],
            //     ]
            // },
            // include: [
            //     { model: Booking, attributes: [] }
            // ],
            // group: ["Client.id"]
        });

        res.json({
            totalClients: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            clients: rows,
        });
    } catch (error) {
        console.error("Error fetching all clients:", error);
        res.status(500).json({ message: "Server error while fetching clients." });
    }
};

// Get a specific client by ID (Admin/Staff only)
exports.getClientById = async (req, res) => {
    const { id } = req.params;

    try {
        const client = await Client.findByPk(id, {
            include: [
                // Include related data if needed for the detail view
                { model: Booking, limit: 5, order: [["bookingStartTime", "DESC"]] }, // Example: recent bookings
                { model: ClinicalNote, limit: 3, order: [["createdAt", "DESC"]] } // Example: recent notes
            ]
        });

        if (!client) {
            return res.status(404).json({ message: "Client not found." });
        }
        res.json(client);
    } catch (error) {
        console.error("Error fetching client by ID:", error);
        res.status(500).json({ message: "Server error while fetching client." });
    }
};

// Create a new client (Admin/Staff only - for manual entry)
// Note: Booking creation already handles findOrCreateClient
exports.createClient = async (req, res) => {
    const { firstName, lastName, email, phone, address } = req.body;

    try {
        // Check if client already exists by email
        const existingClient = await Client.findOne({ where: { email } });
        if (existingClient) {
            return res.status(400).json({ message: "Client with this email already exists." });
        }

        const newClient = await Client.create({
            firstName,
            lastName,
            email,
            phone,
            address, // Assuming address field exists in model
        });
        res.status(201).json(newClient);
    } catch (error) {
        console.error("Error creating client:", error);
        if (error.name === "SequelizeValidationError" || error.name === "SequelizeUniqueConstraintError") {
            const messages = error.errors ? error.errors.map(err => err.message) : [error.message];
            return res.status(400).json({ message: "Validation Error", errors: messages });
        }
        res.status(500).json({ message: "Server error while creating client." });
    }
};

// Update a client (Admin/Staff only)
exports.updateClient = async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, phone, address } = req.body;

    try {
        const client = await Client.findByPk(id);
        if (!client) {
            return res.status(404).json({ message: "Client not found." });
        }

        // Check if email is being changed and if the new email already exists for another client
        if (email && email !== client.email) {
            const existingClient = await Client.findOne({ where: { email } });
            if (existingClient) {
                return res.status(400).json({ message: "Another client with this email already exists." });
            }
            client.email = email;
        }

        if (firstName !== undefined) client.firstName = firstName;
        if (lastName !== undefined) client.lastName = lastName;
        if (phone !== undefined) client.phone = phone;
        if (address !== undefined) client.address = address; // Assuming address field exists

        await client.save();
        res.json(client);
    } catch (error) {
        console.error("Error updating client:", error);
        if (error.name === "SequelizeValidationError" || error.name === "SequelizeUniqueConstraintError") {
            const messages = error.errors ? error.errors.map(err => err.message) : [error.message];
            return res.status(400).json({ message: "Validation Error", errors: messages });
        }
        res.status(500).json({ message: "Server error while updating client." });
    }
};

// Delete a client (Admin/Staff only - use with caution!)
exports.deleteClient = async (req, res) => {
    const { id } = req.params;

    // Consider soft delete (e.g., adding an isActive flag to Client model) instead of hard delete
    // Hard delete can cause issues with historical booking/note data unless using ON DELETE SET NULL/CASCADE carefully.

    try {
        const client = await Client.findByPk(id);
        if (!client) {
            return res.status(404).json({ message: "Client not found." });
        }

        // Check for associated bookings or notes before deleting?
        // const bookingCount = await Booking.count({ where: { clientId: id } });
        // if (bookingCount > 0) {
        //     return res.status(400).json({ message: "Cannot delete client with existing bookings. Consider deactivating instead." });
        // }

        await client.destroy();
        res.status(204).send(); // No content on successful deletion

    } catch (error) {
        console.error("Error deleting client:", error);
        res.status(500).json({ message: "Server error while deleting client." });
    }
};

