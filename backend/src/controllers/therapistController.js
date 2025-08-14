const { Therapist, User, Service, Schedule, Booking, Client, TherapistServices, Role, sequelize } = require("../models");
const { Op } = require("sequelize");

// Get active therapists (public)
exports.getPublicTherapists = async (req, res) => {
    const { serviceId } = req.query;
    const whereClause = { isActive: true };
    const includeOptions = [
        {
            model: User,
            as: 'user',
            where: { isActive: true },
            attributes: ["firstName", "lastName"]
        },
    ];

    // If filtering by serviceId, adjust the include options
    if (serviceId) {
        includeOptions.push({
            model: Service,
            as: 'services',
            where: { id: serviceId, isActive: true },
            attributes: [],
            through: { attributes: [] },
            required: true
        });
    }

    try {
        const therapists = await Therapist.findAll({
            where: whereClause,
            include: includeOptions,
            attributes: ["id", "bio", "specialties", "profilePictureUrl"],
            order: [[{ model: User, as: 'user' }, "lastName", "ASC"], [{ model: User, as: 'user' }, "firstName", "ASC"]] // FIXED: Added alias in order clause
        });
        res.json(therapists);
    } catch (error) {
        console.error("Error fetching public therapists:", error);
        res.status(500).json({ message: "Server error while fetching therapists." });
    }
};

// Get public profile of a specific therapist
exports.getPublicTherapistProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const therapist = await Therapist.findOne({
            where: { id: id, isActive: true },
            include: [
                {
                    model: User,
                    as: 'user', // FIXED: Added alias
                    where: { isActive: true },
                    attributes: ["firstName", "lastName"]
                },
                {
                    model: Service,
                    as: 'services', // FIXED: Added alias (plural for many-to-many)
                    where: { isActive: true },
                    attributes: ["id", "name"],
                    through: { attributes: [] }
                }
            ],
            attributes: ["id", "bio", "specialties", "profilePictureUrl", "yearsOfExperience"]
        });

        if (!therapist) {
            return res.status(404).json({ message: "Active therapist profile not found." });
        }
        res.json(therapist);
    } catch (error) {
        console.error("Error fetching public therapist profile:", error);
        res.status(500).json({ message: "Server error while fetching therapist profile." });
    }
};


// --- Admin Only Controllers ---

// Get all therapists (Admin)
exports.getAllTherapists = async (req, res) => {
    const { page = 1, limit = 10, isActive, serviceId } = req.query;
    const offset = (page - 1) * limit;
    const whereClause = {};
    const includeOptions = [
        {
            model: User,
            as: 'user', // FIXED: Added alias
            attributes: { exclude: ["password"] }
        },
        {
            model: Service,
            as: 'services', // FIXED: Added alias (plural for many-to-many)
            attributes: ["id", "name"],
            through: { attributes: [] }
        }
    ];

    if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
    }

    // If filtering by serviceId, adjust the include options
    if (serviceId) {
        // Find the Service include option or add it if not present
        let serviceInclude = includeOptions.find(inc => inc.model === Service);
        if (!serviceInclude) {
            serviceInclude = {
                model: Service,
                as: 'services', // FIXED: Added alias
                attributes: ["id", "name"],
                through: { attributes: [] }
            };
            includeOptions.push(serviceInclude);
        }
        serviceInclude.where = { id: serviceId };
        serviceInclude.required = true;
    }

    try {
        const { count, rows } = await Therapist.findAndCountAll({
            where: whereClause,
            include: includeOptions,
            order: [[{ model: User, as: 'user' }, "lastName", "ASC"], [{ model: User, as: 'user' }, "firstName", "ASC"]], // FIXED: Added alias in order clause
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true,
        });

        res.json({
            totalTherapists: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            therapists: rows,
        });

    } catch (error) {
        console.error("Error fetching all therapists:", error);
        res.status(500).json({ message: "Server error while fetching therapists." });
    }
};

// Create a new therapist profile (Admin)
exports.createTherapist = async (req, res) => {
    const { userId, bio, specialties, yearsOfExperience, profilePictureUrl, serviceIds } = req.body;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required to create a therapist profile." });
    }

    const transaction = await sequelize.transaction();
    try {
        // Check if user exists and is not already a therapist - FIXED: Added alias
        const user = await User.findByPk(userId, {
            include: [{
                model: Role,
                as: 'role' // FIXED: Added alias
            }]
        });
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ message: "User not found." });
        }
        // Ensure the user has the 'Therapist' role - FIXED: Updated property access
        if (user.role.name !== 'therapist') {
            await transaction.rollback();
            return res.status(400).json({ message: `User with ID ${userId} does not have the 'Therapist' role.` });
        }

        const existingTherapist = await Therapist.findOne({ where: { userId } });
        if (existingTherapist) {
            await transaction.rollback();
            return res.status(400).json({ message: "This user already has a therapist profile." });
        }

        // Create therapist profile
        const newTherapist = await Therapist.create({
            userId,
            bio,
            specialties,
            yearsOfExperience,
            profilePictureUrl,
            isActive: true,
        }, { transaction });

        // Assign services if provided - FIXED: Use alias
        if (serviceIds && serviceIds.length > 0) {
            const services = await Service.findAll({ where: { id: { [Op.in]: serviceIds } } });
            if (services.length !== serviceIds.length) {
                await transaction.rollback();
                return res.status(400).json({ message: "One or more provided service IDs are invalid." });
            }
            await newTherapist.setServices(services, { transaction }); // This uses the alias automatically
        }

        await transaction.commit();

        // Fetch the created therapist with associations - FIXED: Added aliases
        const result = await Therapist.findByPk(newTherapist.id, {
            include: [
                {
                    model: User,
                    as: 'user', // FIXED: Added alias
                    attributes: { exclude: ["password"] }
                },
                {
                    model: Service,
                    as: 'services', // FIXED: Added alias
                    attributes: ["id", "name"],
                    through: { attributes: [] }
                }
            ]
        });

        res.status(201).json(result);

    } catch (error) {
        await transaction.rollback();
        console.error("Error creating therapist:", error);
        res.status(500).json({ message: "Server error while creating therapist profile." });
    }
};

// getTherapistById method (Admin)
exports.getTherapistById = async (req, res) => {
    const { id } = req.params;
    try {
        const therapist = await Therapist.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user', // FIXED: Added alias
                    attributes: { exclude: ["password"] }
                },
                {
                    model: Service,
                    as: 'services', // FIXED: Added alias
                    attributes: ["id", "name"],
                    through: { attributes: [] }
                }
            ]
        });
        if (!therapist) {
            return res.status(404).json({ message: "Therapist not found." });
        }
        res.json(therapist);
    } catch (error) {
        console.error("Error fetching therapist by ID:", error);
        res.status(500).json({ message: "Server error while fetching therapist." });
    }
};


// Update therapist profile (Admin)
exports.updateTherapist = async (req, res) => {
    const { id } = req.params;
    const { bio, specialties, yearsOfExperience, profilePictureUrl, isActive, serviceIds } = req.body;
    const transaction = await sequelize.transaction();

    try {
        const therapist = await Therapist.findByPk(id);
        if (!therapist) {
            await transaction.rollback();
            return res.status(404).json({ message: "Therapist not found." });
        }

        // Update fields
        if (bio !== undefined) therapist.bio = bio;
        if (specialties !== undefined) therapist.specialties = specialties;
        if (yearsOfExperience !== undefined) therapist.yearsOfExperience = yearsOfExperience;
        if (profilePictureUrl !== undefined) therapist.profilePictureUrl = profilePictureUrl;
        if (typeof isActive === "boolean") therapist.isActive = isActive;

        await therapist.save({ transaction });

        // Update services if provided - uses alias automatically
        if (serviceIds && Array.isArray(serviceIds)) {
            const services = await Service.findAll({ where: { id: { [Op.in]: serviceIds } } });
            if (services.length !== serviceIds.length) {
                await transaction.rollback();
                return res.status(400).json({ message: "One or more provided service IDs are invalid." });
            }
            await therapist.setServices(services, { transaction });
        }

        // If deactivating therapist, also deactivate user
        if (typeof isActive === "boolean" && !isActive) {
            const user = await User.findByPk(therapist.userId);
            if (user) {
                user.isActive = false;
                await user.save({ transaction });
            }
        }

        await transaction.commit();

        // Fetch updated data - FIXED: Added aliases
        const updatedTherapist = await Therapist.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user', // FIXED: Added alias
                    attributes: { exclude: ["password"] }
                },
                {
                    model: Service,
                    as: 'services', // FIXED: Added alias
                    attributes: ["id", "name"],
                    through: { attributes: [] }
                }
            ]
        });

        res.json(updatedTherapist);
    } catch (error) {
        await transaction.rollback();
        console.error("Error updating therapist:", error);
        res.status(500).json({ message: "Server error while updating therapist profile." });
    }
};

// Deactivate therapist (Admin)
// Renamed from deactivateTherapist to match therapistRoutes.js
exports.deleteTherapist = async (req, res) => {
    const { id } = req.params;
    const transaction = await sequelize.transaction();
    try {
        const therapist = await Therapist.findByPk(id);
        if (!therapist) {
            await transaction.rollback();
            return res.status(404).json({ message: "Therapist not found." });
        }

        // Deactivate therapist profile
        therapist.isActive = false;
        await therapist.save({ transaction });

        // Deactivate associated user account
        const user = await User.findByPk(therapist.userId);
        if (user) {
            user.isActive = false;
            await user.save({ transaction });
        }

        await transaction.commit();
        res.status(200).json({ message: "Therapist deactivated successfully." });

    } catch (error) {
        await transaction.rollback();
        console.error("Error deactivating therapist:", error);
        res.status(500).json({ message: "Server error while deactivating therapist." });
    }
};

// Update services offered by a therapist (Admin)
// This logic is now integrated into updateTherapist, but keeping the separate function signature if needed elsewhere
exports.updateTherapistServices = async (req, res) => {
    const { id } = req.params;
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds)) {
        return res.status(400).json({ message: "serviceIds must be an array." });
    }

    const transaction = await sequelize.transaction();
    try {
        const therapist = await Therapist.findByPk(id);
        if (!therapist) {
            await transaction.rollback();
            return res.status(404).json({ message: "Therapist not found." });
        }

        // Validate service IDs
        const services = await Service.findAll({ where: { id: { [Op.in]: serviceIds } } });
        if (services.length !== serviceIds.length) {
            await transaction.rollback();
            return res.status(400).json({ message: "One or more provided service IDs are invalid." });
        }

        // Set the therapist's services - uses alias automatically
        await therapist.setServices(services, { transaction });

        await transaction.commit();

        // Fetch updated data - FIXED: Added aliases
        const updatedTherapist = await Therapist.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user', // FIXED: Added alias
                    attributes: { exclude: ["password"] }
                },
                {
                    model: Service,
                    as: 'services', // FIXED: Added alias
                    attributes: ["id", "name"],
                    through: { attributes: [] }
                }
            ]
        });

        res.json(updatedTherapist);

    } catch (error) {
        await transaction.rollback();
        console.error("Error updating therapist services:", error);
        res.status(500).json({ message: "Server error while updating therapist services." });
    }
};

// --- Therapist Specific Controllers ---

// Get own schedule (Therapist)
exports.getMySchedule = async (req, res) => {
    const userId = req.user.id;
    try {
        const therapist = await Therapist.findOne({
            where: { userId: userId },
            include: [{
                model: User,
                as: 'user' // FIXED: Added alias
            }]
        });
        if (!therapist) {
            return res.status(404).json({ message: "Therapist profile not found for the current user." });
        }

        // Fetch actual schedule data - FIXED: Added alias
        const scheduleData = await Schedule.findAll({
            where: { therapistId: therapist.id },
            include: [{
                model: Therapist,
                as: 'therapist' // FIXED: Added alias
            }]
        });

        res.json({ message: "Therapist schedule endpoint - placeholder", schedule: scheduleData });
    } catch (error) {
        console.error("Error fetching therapist schedule:", error);
        res.status(500).json({ message: "Server error while fetching schedule." });
    }
};

// Get own assigned bookings (Therapist)
exports.getMyBookings = async (req, res) => {
    const userId = req.user.id;
    const { status, startDate, endDate } = req.query;
    const whereClause = {};

    try {
        const therapist = await Therapist.findOne({
            where: { userId: userId },
            include: [{
                model: User,
                as: 'user' // FIXED: Added alias
            }]
        });
        if (!therapist) {
            return res.status(404).json({ message: "Therapist profile not found for the current user." });
        }

        whereClause.therapistId = therapist.id;
        if (status) {
            whereClause.status = status;
        }
        if (startDate && endDate) {
            whereClause.bookingStartTime = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            whereClause.bookingStartTime = {
                [Op.gte]: new Date(startDate)
            };
        }

        // Fetch bookings assigned to this therapist - FIXED: Added aliases
        const bookings = await Booking.findAll({
            where: whereClause,
            include: [
                {
                    model: Client,
                    as: 'client', // FIXED: Added alias
                    attributes: ["id", "firstName", "lastName", "email", "phone"]
                },
                {
                    model: ServiceOption,
                    as: 'serviceOption', // FIXED: Added alias
                    attributes: ["id", "duration", "price"],
                    include: [{
                        model: Service,
                        as: 'service', // FIXED: Added alias
                        attributes: ["id", "name"]
                    }]
                }
            ],
            order: [["bookingStartTime", "ASC"]]
        });

        res.json(bookings);
    } catch (error) {
        console.error("Error fetching therapist bookings:", error);
        res.status(500).json({ message: "Server error while fetching bookings." });
    }
};

