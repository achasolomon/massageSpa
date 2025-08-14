const { Service, ServiceOption, ServiceAvailability, Therapist, User, Booking, sequelize } = require("../models");
const { Op } = require("sequelize");
const { getEndTime } = require('../utils/timeUtils');

// --- Public Controllers ---

// Get all services (optionally active only, with options/availability)
exports.getAllServices = async (req, res) => {
  const { isActive, includeOptions, includeAvailability } = req.query;
  
  const whereClause = {};
  const include = [];

  // Fix the isActive comparison - it comes as a string
  if (isActive !== undefined) {
    whereClause.isActive = isActive === 'true';
  }

  if (includeOptions === 'true') {
    include.push({
      model: ServiceOption,
      as: 'options', // FIXED: Added alias
      where: { isActive: true },
      required: false
    });
  }

  if (includeAvailability === 'true') {
    include.push({
      model: ServiceAvailability,
      as: 'availabilities', // FIXED: Added alias
      where: { isActive: true },
      required: false,
      include: [{
        model: Therapist,
        as: 'therapist', // FIXED: Added alias
        include: [{
          model: User,
          as: 'user', // FIXED: Added alias
          attributes: ["firstName", "lastName"]
        }],
        required: false
      }]
    });
  }

  try {
    const services = await Service.findAll({
      where: whereClause,
      include: include,
      order: [["name", "ASC"]],
    });
    
    res.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ message: "Server error while fetching services." });
  }
};

// Get a single service by ID (with options/availability)
exports.getServiceById = async (req, res) => {
  const { id } = req.params;
  const { includeOptions, includeAvailability } = req.query;
  const include = [];

  if (includeOptions) {
    include.push({
      model: ServiceOption,
      as: 'options', // FIXED: Added alias
      where: { isActive: true },
      required: false
    });
  }

  if (includeAvailability) {
    include.push({
      model: ServiceAvailability,
      as: 'availabilities', // FIXED: Added alias
      where: { isActive: true },
      required: false,
      include: [{
        model: Therapist,
        as: 'therapist', // FIXED: Added alias
        include: [{
          model: User,
          as: 'user', // FIXED: Added alias
          attributes: ["firstName", "lastName"]
        }],
        required: false
      }]
    });
  }

  try {
    const service = await Service.findByPk(id, {
      include: include,
    });

    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }
    res.json(service);
  } catch (error) {
    console.error("Error fetching service by ID:", error);
    res.status(500).json({ message: "Server error while fetching service." });
  }
};

// Get services by category (Public)
exports.getServicesByCategory = async (req, res) => {
  const { category } = req.params;
  const { includeOptions, includeAvailability } = req.query;
  const include = [];

  if (includeOptions) {
    include.push({
      model: ServiceOption,
      as: 'options', // FIXED: Added alias
      where: { isActive: true },
      required: false
    });
  }

  if (includeAvailability) {
    include.push({
      model: ServiceAvailability,
      as: 'availabilities', // FIXED: Added alias
      where: { isActive: true },
      required: false
    });
  }

  try {
    const services = await Service.findAll({
      where: {
        category: category,
        isActive: true
      },
      include: include,
      order: [["name", "ASC"]],
    });
    res.json(services);
  } catch (error) {
    console.error("Error fetching services by category:", error);
    res.status(500).json({ message: "Server error while fetching services by category." });
  }
};

// Get all service categories (Public)
exports.getServiceCategories = async (req, res) => {
  try {
    const categories = await Service.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      where: {
        isActive: true,
        category: { [Op.ne]: null }
      },
      order: [['category', 'ASC']]
    });

    const categoryList = categories.map(service => service.category).filter(Boolean);
    res.json(categoryList);
  } catch (error) {
    console.error("Error fetching service categories:", error);
    res.status(500).json({ message: "Server error while fetching service categories." });
  }
};

// --- Admin Controllers for Services ---

// Create a new service
exports.createService = async (req, res) => {
  const { name, description, category, isActive, imageUrl, imagePublicId } = req.body;

  try {
    const newService = await Service.create({
      name,
      description,
      category,
      isActive: isActive !== undefined ? isActive : true,
      imageUrl: imageUrl || null,
      imagePublicId: imagePublicId || null,
    });
    res.status(201).json(newService);
  } catch (error) {
    console.error("Error creating service:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.errors.map(e => e.message)
      });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Service with this name already exists."
      });
    }
    res.status(500).json({ message: "Server error while creating service." });
  }
};

// Update a service
exports.updateService = async (req, res) => {
  const { id } = req.params;
  const { name, description, category, isActive, imageUrl, imagePublicId } = req.body;

  try {
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    // Update only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (imagePublicId !== undefined) updateData.imagePublicId = imagePublicId;

    await service.update(updateData);
    res.json(service);
  } catch (error) {
    console.error("Error updating service:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.errors.map(e => e.message)
      });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Service with this name already exists."
      });
    }
    res.status(500).json({ message: "Server error while updating service." });
  }
};

// Delete/Deactivate a service
exports.deleteService = async (req, res) => {
  const { id } = req.params;
  const { hardDelete } = req.query;

  try {
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    if (hardDelete === 'true') {
      // Hard delete - first clean up dependencies
      await sequelize.transaction(async (t) => {
        await ServiceAvailability.destroy({ where: { serviceId: id }, transaction: t });
        await ServiceOption.destroy({ where: { serviceId: id }, transaction: t });
        await service.destroy({ transaction: t });
      });
      return res.status(204).send();
    } else {
      // Soft delete - skip validation for isActive updates
      await sequelize.transaction(async (t) => {
        await service.update({ isActive: false }, { transaction: t });
        await ServiceOption.update(
          { isActive: false },
          { where: { serviceId: id }, transaction: t, validate: false }
        );
        await ServiceAvailability.update(
          { isActive: false },
          { where: { serviceId: id }, transaction: t, validate: false }
        );
      });
      return res.status(200).json({ message: "Service deactivated successfully." });
    }
  } catch (error) {
    console.error("Error deleting service:", error);
    return res.status(500).json({ 
      message: "Server error while deleting service.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// --- Admin Controllers for Service Options ---

// Get all options for a service
exports.getServiceOptions = async (req, res) => {
  const { serviceId } = req.params;
  const { includeInactive } = req.query;

  try {
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    const whereClause = { serviceId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const options = await ServiceOption.findAll({
      where: whereClause,
      order: [['optionName', 'ASC'], ['duration', 'ASC']]
    });

    res.json(options);
  } catch (error) {
    console.error("Error fetching service options:", error);
    res.status(500).json({ message: "Server error while fetching service options." });
  }
};

// Add a service option
exports.addServiceOption = async (req, res) => {
  const { serviceId } = req.params;
  const { duration, price, optionName, isActive } = req.body;

  try {
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    const newOption = await ServiceOption.create({
      serviceId,
      duration,
      price,
      optionName,
      isActive: isActive !== undefined ? isActive : true,
    });
    res.status(201).json(newOption);
  } catch (error) {
    console.error("Error adding service option:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.errors.map(e => e.message)
      });
    }
    res.status(500).json({ message: "Server error while adding service option." });
  }
};

// Update a service option
exports.updateServiceOption = async (req, res) => {
  const { optionId } = req.params;
  const { duration, price, optionName, isActive } = req.body;

  try {
    const option = await ServiceOption.findByPk(optionId);
    if (!option) {
      return res.status(404).json({ message: "Service option not found." });
    }

    // Optionally: Validate fields (e.g., duration > 0, price >= 0)
    if (duration !== undefined && (isNaN(duration) || duration <= 0)) {
      return res.status(400).json({ message: "Duration must be a positive number." });
    }
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return res.status(400).json({ message: "Price must be a non-negative number." });
    }

    const updateData = {};
    if (duration !== undefined) updateData.duration = duration;
    if (price !== undefined) updateData.price = price;
    if (optionName !== undefined) updateData.optionName = optionName;
    if (isActive !== undefined) updateData.isActive = isActive;

    await option.update(updateData);
    res.json(option);
  } catch (error) {
    console.error("Error updating service option:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.errors.map(e => e.message)
      });
    }
    res.status(500).json({ message: "Server error while updating service option." });
  }
};

// Delete a service option
exports.deleteServiceOption = async (req, res) => {
  const { optionId } = req.params;
  const { hardDelete } = req.query;

  try {
    const option = await ServiceOption.findByPk(optionId);
    if (!option) {
      return res.status(404).json({ message: "Service option not found." });
    }

    if (hardDelete === 'true') {
      await option.destroy();
      res.status(204).send();
    } else {
      // Soft delete
      await option.update({ isActive: false });
      res.status(200).json({ message: "Service option deactivated successfully." });
    }
  } catch (error) {
    console.error("Error deleting service option:", error);
    res.status(500).json({ message: "Server error while deleting service option." });
  }
};

// --- Admin Controllers for Service Availability ---

// Get service availability rules
exports.getServiceAvailability = async (req, res) => {
  const { serviceId } = req.params;
  const { therapistId, date, includeInactive } = req.query;
  const whereClause = { serviceId };

  if (therapistId) {
    whereClause.therapistId = therapistId;
  }

  if (!includeInactive) {
    whereClause.isActive = true;
  }

  if (date) {
    const targetDate = new Date(date);
    const dayNum = targetDate.getDay();
    whereClause[Op.or] = [
      { specificDate: date },
      { dayOfWeek: dayNum, specificDate: null }
    ];
  }

  try {
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    const availabilityRules = await ServiceAvailability.findAll({
      where: whereClause,
      include: [{
        model: Therapist,
        as: 'therapist', // FIXED: Added alias
        include: [{
          model: User,
          as: 'user', // FIXED: Added alias
          attributes: ["firstName", "lastName"]
        }],
        required: false
      }],
      order: [["dayOfWeek", "ASC"], ["specificDate", "ASC"], ["startTime", "ASC"]],
    });

    res.json(availabilityRules);
  } catch (error) {
    console.error("Error fetching service availability:", error);
    res.status(500).json({ message: "Server error while fetching service availability." });
  }
};

// Add service availability rule
exports.addServiceAvailability = async (req, res) => {
  const { serviceId } = req.params;
  const { therapistId, serviceOptionId, dayOfWeek, specificDate, startTime, bookingLimit, isActive } = req.body;

  // Basic validation
  if (!serviceOptionId) {
    return res.status(400).json({ message: "Service option ID is required." });
  }

  try {
    const [service, option] = await Promise.all([
      Service.findByPk(serviceId),
      ServiceOption.findByPk(serviceOptionId, {
        include: [{
          model: Service,
          as: 'service' // FIXED: Added alias
        }]
      })
    ]);

    if (!service) return res.status(404).json({ message: "Service not found." });
    if (!option) return res.status(404).json({ message: "Service option not found." });
    if (option.serviceId !== service.id) {
      return res.status(400).json({ message: "Service option doesn't belong to this service." });
    }

    // Format startTime correctly (HH:MM:SS)
    const formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
    const endTime = getEndTime(formattedStartTime, option.duration);

    const newAvailability = await ServiceAvailability.create({
      serviceId,
      serviceOptionId,
      therapistId: therapistId || null,
      dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : null,
      specificDate: specificDate || null,
      startTime: formattedStartTime,
      endTime,
      bookingLimit: bookingLimit || 1,
      currentBookings: 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json(newAvailability);
  } catch (error) {
    console.error("Error adding service availability:", error);
    res.status(500).json({ message: "Server error while adding service availability." });
  }
};

// Bulk create service availability rules
exports.bulkCreateServiceAvailability = async (req, res) => {
  const { serviceId } = req.params;
  const { rules } = req.body;

  try {
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    // Validate all rules
    const errors = [];
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (rule.dayOfWeek === null && !rule.specificDate) {
        errors.push(`Rule ${i + 1}: Must have dayOfWeek or specificDate`);
      }
      if (rule.dayOfWeek !== null && rule.specificDate) {
        errors.push(`Rule ${i + 1}: Cannot have both dayOfWeek and specificDate`);
      }
      if (rule.therapistId) {
        const therapist = await Therapist.findByPk(rule.therapistId);
        if (!therapist) {
          errors.push(`Rule ${i + 1}: Therapist not found`);
        }
      }
    }

    if (errors.length) {
      return res.status(400).json({ errors });
    }

    // Create in transaction
    const created = await sequelize.transaction(async (t) => {
      return Promise.all(rules.map(rule => {
        const formattedTime = rule.time.length === 5 ? `${rule.time}:00` : rule.time;
        return ServiceAvailability.create({
          serviceId,
          therapistId: rule.therapistId || null,
          dayOfWeek: rule.dayOfWeek !== undefined ? rule.dayOfWeek : null,
          specificDate: rule.specificDate || null,
          startTime: formattedTime,
          bookingLimit: rule.bookingLimit || 1,
          isActive: rule.isActive !== false
        }, { transaction: t });
      }));
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("Bulk availability error:", error);
    res.status(500).json({ message: "Failed to create availability rules." });
  }
};

//getAvailableSlots function controller
exports.getAvailableSlots = async (req, res) => {
  const { serviceId } = req.params;
  const { date, serviceOptionId, therapistId } = req.query;

  try {
    // Verify service exists
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    // Verify service option exists and belongs to this service
    if (serviceOptionId) {
      const serviceOption = await ServiceOption.findOne({
        where: { id: serviceOptionId, serviceId },
        include: [{
          model: Service,
          as: 'service' // FIXED: Added alias
        }]
      });
      if (!serviceOption) {
        return res.status(404).json({ message: "Service option not found for this service." });
      }
    }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Build where clause based on your model structure
    const whereClause = {
      serviceId,
      isActive: true,
      [Op.or]: [
        { specificDate: date },
        {
          dayOfWeek: dayOfWeek,
          specificDate: null
        }
      ]
    };

    // Add service option filter if provided
    if (serviceOptionId) {
      whereClause.serviceOptionId = serviceOptionId;
    }

    // Add therapist filter if provided
    if (therapistId) {
      whereClause.therapistId = therapistId;
    }

    // Fetch availability rules - FIXED: Added aliases
    const availabilityRules = await ServiceAvailability.findAll({
      where: whereClause,
      include: [
        {
          model: Therapist,
          as: 'therapist', // FIXED: Added alias
          include: [{
            model: User,
            as: 'user', // FIXED: Added alias
            attributes: ["firstName", "lastName"]
          }],
          required: false
        },
        {
          model: ServiceOption,
          as: 'serviceOption', // FIXED: Added alias
          attributes: ['duration', 'price', 'optionName'],
          required: true
        }
      ],
      order: [['startTime', 'ASC']]
    });

    // Calculate available slots
    const slots = await Promise.all(availabilityRules.map(async (rule) => {
      const slotDateTime = new Date(`${date}T${rule.startTime}`);

      // Count existing bookings for this exact slot
      const bookedCount = await Booking.count({
        where: {
          serviceId,
          serviceOptionId: rule.serviceOptionId,
          bookingStartTime: slotDateTime,
          status: { [Op.notIn]: ['Cancelled By Client', 'Cancelled By Staff', 'No Show'] }
        }
      })

      // Calculate end time using service option duration
      const startTime = rule.startTime;
      const duration = rule.serviceOption.duration; // FIXED: Updated property access
      const endTime = calculateEndTime(startTime, duration);

      const remaining = rule.bookingLimit - bookedCount;

      return {
        availabilityId: rule.id,
        time: startTime,
        endTime: endTime,
        duration: duration,
        serviceOptionId: rule.serviceOptionId,
        therapist: rule.therapist ? { // FIXED: Updated property access
          id: rule.therapistId,
          name: `${rule.therapist.user.firstName} ${rule.therapist.user.lastName}` // FIXED: Updated property access
        } : null,
        available: remaining > 0,
        remaining: remaining,
        bookingLimit: rule.bookingLimit,
        currentBookings: bookedCount,
        price: rule.serviceOption.price, // FIXED: Updated property access
        optionName: rule.serviceOption.optionName // FIXED: Updated property access
      };
    }));

    res.json(slots);

  } catch (error) {
    console.error("Get available slots error:", error);
    res.status(500).json({
      message: "Failed to check availability.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to calculate end time
function calculateEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));

  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;
}

// Update service availability rule
exports.updateServiceAvailability = async (req, res) => {
  const { availabilityId } = req.params;
  const { therapistId, serviceOptionId, dayOfWeek, specificDate, startTime, bookingLimit, isActive } = req.body;

  // Validate that both dayOfWeek and specificDate are not set together
  if (dayOfWeek !== undefined && specificDate !== undefined) {
    if (dayOfWeek !== null && specificDate !== null) {
      return res.status(400).json({
        message: "Cannot provide both dayOfWeek and specificDate."
      });
    }
  }

  try {
    const availability = await ServiceAvailability.findByPk(availabilityId);
    if (!availability) {
      return res.status(404).json({ message: "Availability rule not found." });
    }

    // Validate therapist if provided
    if (therapistId !== undefined && therapistId !== null) {
      const therapist = await Therapist.findByPk(therapistId);
      if (!therapist) {
        return res.status(404).json({ message: "Therapist not found." });
      }
    }

    // Validate service option if provided
    if (serviceOptionId !== undefined && serviceOptionId !== null) {
      const option = await ServiceOption.findByPk(serviceOptionId);
      if (!option) {
        return res.status(404).json({ message: "Service option not found." });
      }
      // Optionally: Check if option belongs to the same service
      if (option.serviceId !== availability.serviceId) {
        return res.status(400).json({ message: "Service option doesn't belong to this service." });
      }
    }

    // Format startTime
    let formattedStartTime;
    if (startTime !== undefined) {
      formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
    }

    const updateData = {};
    if (therapistId !== undefined) updateData.therapistId = therapistId;
    if (serviceOptionId !== undefined) updateData.serviceOptionId = serviceOptionId;
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
    if (specificDate !== undefined) updateData.specificDate = specificDate;
    if (startTime !== undefined) updateData.startTime = formattedStartTime;
    if (bookingLimit !== undefined) updateData.bookingLimit = bookingLimit;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Optionally: Update endTime if startTime or serviceOptionId/duration changed
    if (updateData.startTime || updateData.serviceOptionId) {
      // Get duration from the correct option
      let option = null;
      if (updateData.serviceOptionId) {
        option = await ServiceOption.findByPk(updateData.serviceOptionId);
      } else {
        option = await ServiceOption.findByPk(availability.serviceOptionId);
      }
      if (option) {
        const start = updateData.startTime || availability.startTime;
        updateData.endTime = require('../utils/timeUtils').getEndTime(start, option.duration);
      }
    }

    await availability.update(updateData);

    // Re-validate day/date combination after update
    if (availability.dayOfWeek === null && availability.specificDate === null) {
      return res.status(400).json({
        message: "Either dayOfWeek or specificDate must be set."
      });
    }
    if (availability.dayOfWeek !== null && availability.specificDate !== null) {
      return res.status(400).json({
        message: "Cannot set both dayOfWeek and specificDate."
      });
    }

    res.json(availability);
  } catch (error) {
    console.error("Error updating service availability:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.errors.map(e => e.message)
      });
    }
    res.status(500).json({ message: "Server error while updating service availability." });
  }
};

exports.bookSlot = async (req, res) => {
  const { availabilityId } = req.params;
  const { userId, date } = req.body;

  try {
    const availability = await ServiceAvailability.findByPk(availabilityId, {
      include: [{
        model: ServiceOption,
        as: 'serviceOption' // FIXED: Added alias
      }]
    });

    if (!availability) {
      return res.status(404).json({ message: "Availability slot not found." });
    }

    // Check if slot is still available
    const bookedCount = await Booking.count({
      where: {
        serviceId: availability.serviceId,
        serviceOptionId: availability.serviceOptionId,
        date,
        startTime: availability.startTime,
        status: { [Op.notIn]: ['cancelled', 'no-show'] }
      }
    });

    if (bookedCount >= availability.bookingLimit) {
      return res.status(400).json({ message: "This time slot is no longer available." });
    }

    // Create booking
    const booking = await Booking.create({
      userId,
      serviceId: availability.serviceId,
      serviceOptionId: availability.serviceOptionId,
      date,
      startTime: availability.startTime,
      endTime: availability.endTime,
      status: 'confirmed',
      price: availability.serviceOption.price // FIXED: Updated property access
    });

    // Update availability count
    await availability.update({
      currentBookings: bookedCount + 1
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ message: "Failed to book appointment." });
  }
};

// Delete service availability rule
exports.deleteServiceAvailability = async (req, res) => {
  const { availabilityId } = req.params;
  const { hardDelete } = req.query;

  try {
    const availability = await ServiceAvailability.findByPk(availabilityId);
    if (!availability) {
      return res.status(404).json({ message: "Availability rule not found." });
    }

    if (hardDelete === 'true') {
      await availability.destroy();
      res.status(204).send();
    } else {
      // Soft delete
      await availability.update({ isActive: false });
      res.status(200).json({ message: "Availability rule deactivated successfully." });
    }
  } catch (error) {
    console.error("Error deleting service availability:", error);
    res.status(500).json({ message: "Server error while deleting service availability." });
  }
};