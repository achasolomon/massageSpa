const scheduleAggregationService = require('../services/scheduleAggregationService');
const { Schedule, Therapist, User } = require('../models');
const { format, parseISO, isValid } = require('date-fns');

// Standardized response helper
const createResponse = (success, data = null, message = null, errors = null, meta = null) => {
  const response = { success };
  if (data !== null) response.data = data;
  if (message) response.message = message;
  if (errors) response.errors = Array.isArray(errors) ? errors : [errors];
  if (meta) response.meta = meta;
  return response;
};

// --- HYBRID SCHEDULE CONTROLLERS ---

/**
 * Get therapist's daily schedule (bookings + availability)
 * GET /api/v1/schedule/therapist/:therapistId/daily?date=YYYY-MM-DD
 */
exports.getTherapistDailySchedule = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { date } = req.query;

    // Authorization check
    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json(createResponse(
          false, null, "Access denied", ["You can only view your own schedule"]
        ));
      }
    }

    if (!date) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Date parameter is required (YYYY-MM-DD format)"]
      ));
    }

    const targetDate = parseISO(date);
    if (!isValid(targetDate)) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Invalid date format. Use YYYY-MM-DD"]
      ));
    }

    const dailySchedule = await scheduleAggregationService.getTherapistDailySchedule(therapistId, date);

    res.json(createResponse(
      true,
      dailySchedule,
      `Retrieved daily schedule for ${date}`
    ));

  } catch (error) {
    console.error('Error getting therapist daily schedule:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Get therapist's weekly schedule overview
 * GET /api/v1/schedule/therapist/:therapistId/weekly?startDate=YYYY-MM-DD
 */
exports.getTherapistWeeklySchedule = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { startDate } = req.query;

    // Authorization check
    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json(createResponse(
          false, null, "Access denied", ["You can only view your own schedule"]
        ));
      }
    }

    const dateToUse = startDate || format(new Date(), 'yyyy-MM-dd');
    const targetDate = parseISO(dateToUse);
    
    if (!isValid(targetDate)) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Invalid start date format. Use YYYY-MM-DD"]
      ));
    }

    const weeklySchedule = await scheduleAggregationService.getTherapistWeeklySchedule(therapistId, dateToUse);

    res.json(createResponse(
      true,
      weeklySchedule,
      `Retrieved weekly schedule starting ${dateToUse}`
    ));

  } catch (error) {
    console.error('Error getting therapist weekly schedule:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Get all therapists schedule overview for a specific date
 * GET /api/v1/schedule/overview?date=YYYY-MM-DD
 */
exports.getAllTherapistsScheduleOverview = async (req, res) => {
  try {
    // Only admin/staff can view all therapists
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json(createResponse(
        false, null, "Access denied", ["Insufficient permissions"]
      ));
    }

    const { date } = req.query;
    const dateToUse = date || format(new Date(), 'yyyy-MM-dd');
    
    const targetDate = parseISO(dateToUse);
    if (!isValid(targetDate)) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Invalid date format. Use YYYY-MM-DD"]
      ));
    }

    const overview = await scheduleAggregationService.getAllTherapistsScheduleOverview(dateToUse);

    res.json(createResponse(
      true,
      overview,
      `Retrieved schedule overview for ${dateToUse}`
    ));

  } catch (error) {
    console.error('Error getting schedule overview:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Get available booking slots for a therapist
 * GET /api/v1/schedule/availability/:therapistId?date=YYYY-MM-DD&duration=60
 */
exports.getAvailableBookingSlots = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { date, duration = 60 } = req.query;

    if (!date) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Date parameter is required"]
      ));
    }

    const targetDate = parseISO(date);
    if (!isValid(targetDate)) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Invalid date format. Use YYYY-MM-DD"]
      ));
    }

    const durationMinutes = parseInt(duration);
    if (isNaN(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Duration must be between 15 and 480 minutes"]
      ));
    }

    const availableSlots = await scheduleAggregationService.getAvailableBookingSlots(
      therapistId, 
      date, 
      durationMinutes
    );

    res.json(createResponse(
      true,
      { 
        date,
        therapistId,
        duration: durationMinutes,
        availableSlots,
        totalSlots: availableSlots.length
      },
      `Found ${availableSlots.length} available slots`
    ));

  } catch (error) {
    console.error('Error getting available booking slots:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Get therapist's own schedule (for therapist users)
 * GET /api/v1/schedule/my/daily?date=YYYY-MM-DD
 */
exports.getMyDailySchedule = async (req, res) => {
  try {
    if (req.user.role !== 'therapist') {
      return res.status(403).json(createResponse(
        false, null, "Access denied", ["This endpoint is for therapists only"]
      ));
    }

    const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
    if (!therapist) {
      return res.status(404).json(createResponse(
        false, null, "Profile not found", ["Therapist profile not found"]
      ));
    }

    // Delegate to the main daily schedule method
    req.params.therapistId = therapist.id;
    return this.getTherapistDailySchedule(req, res);

  } catch (error) {
    console.error('Error getting my daily schedule:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Get therapist's own weekly schedule
 * GET /api/v1/schedule/my/weekly?startDate=YYYY-MM-DD
 */
exports.getMyWeeklySchedule = async (req, res) => {
  try {
    if (req.user.role !== 'therapist') {
      return res.status(403).json(createResponse(
        false, null, "Access denied", ["This endpoint is for therapists only"]
      ));
    }

    const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
    if (!therapist) {
      return res.status(404).json(createResponse(
        false, null, "Profile not found", ["Therapist profile not found"]
      ));
    }

    // Delegate to the main weekly schedule method
    req.params.therapistId = therapist.id;
    return this.getTherapistWeeklySchedule(req, res);

  } catch (error) {
    console.error('Error getting my weekly schedule:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

// --- BASE AVAILABILITY MANAGEMENT (Working Hours / Time Off) ---

/**
 * Get therapist's base availability settings
 * GET /api/v1/schedule/availability-settings/:therapistId
 */
exports.getTherapistAvailabilitySettings = async (req, res) => {
  try {
    const { therapistId } = req.params;

    // Authorization check
    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json(createResponse(
          false, null, "Access denied", ["You can only view your own availability settings"]
        ));
      }
    }

    const availabilitySettings = await Schedule.findAll({
      where: { 
        therapistId,
        isActive: true
      },
      order: [
        ['type', 'ASC'],
        ['dayOfWeek', 'ASC'],
        ['specificDate', 'ASC'],
        ['startTime', 'ASC']
      ]
    });

    // Group by type for easier frontend consumption
    const groupedSettings = {
      workingHours: availabilitySettings.filter(s => s.type === 'WorkingHours'),
      timeOff: availabilitySettings.filter(s => s.type === 'TimeOff')
    };

    res.json(createResponse(
      true,
      groupedSettings,
      "Retrieved availability settings"
    ));

  } catch (error) {
    console.error('Error getting availability settings:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Create or update base availability (working hours/time off)
 * POST /api/v1/schedule/availability-settings
 */
exports.createAvailabilitySetting = async (req, res) => {
  try {
    const { therapistId, type, dayOfWeek, specificDate, startTime, endTime, effectiveFrom, effectiveTo, notes } = req.body;

    // Authorization check
    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json(createResponse(
          false, null, "Access denied", ["You can only manage your own availability"]
        ));
      }
    }

    // Validation
    if (!therapistId || !type || !startTime || !endTime) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["therapistId, type, startTime, and endTime are required"]
      ));
    }

    if (!['WorkingHours', 'TimeOff'].includes(type)) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Type must be 'WorkingHours' or 'TimeOff'"]
      ));
    }

    // Either dayOfWeek or specificDate must be provided, not both
    const hasSpecificDate = specificDate !== null && specificDate !== undefined;
    const hasDayOfWeek = dayOfWeek !== null && dayOfWeek !== undefined;

    if (hasSpecificDate && hasDayOfWeek) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Cannot specify both specificDate and dayOfWeek"]
      ));
    }

    if (!hasSpecificDate && !hasDayOfWeek) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Must specify either specificDate or dayOfWeek"]
      ));
    }

    const newSetting = await Schedule.create({
      therapistId,
      type,
      dayOfWeek: hasDayOfWeek ? dayOfWeek : null,
      specificDate: hasSpecificDate ? specificDate : null,
      startTime,
      endTime,
      effectiveFrom: effectiveFrom || null,
      effectiveTo: effectiveTo || null,
      notes: notes || null,
      isActive: true
    });

    res.status(201).json(createResponse(
      true,
      newSetting,
      "Availability setting created successfully"
    ));

  } catch (error) {
    console.error('Error creating availability setting:', error);
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json(createResponse(
        false, null, "Validation error", messages
      ));
    }

    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Update base availability setting
 * PUT /api/v1/schedule/availability-settings/:id
 */
exports.updateAvailabilitySetting = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const setting = await Schedule.findByPk(id);
    if (!setting) {
      return res.status(404).json(createResponse(
        false, null, "Not found", ["Availability setting not found"]
      ));
    }

    // Authorization check
    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
      if (!therapist || therapist.id !== setting.therapistId) {
        return res.status(403).json(createResponse(
          false, null, "Access denied", ["You can only update your own availability"]
        ));
      }
    }

    const updatedSetting = await setting.update(updateData);

    res.json(createResponse(
      true,
      updatedSetting,
      "Availability setting updated successfully"
    ));

  } catch (error) {
    console.error('Error updating availability setting:', error);
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json(createResponse(
        false, null, "Validation error", messages
      ));
    }

    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Delete availability setting
 * DELETE /api/v1/schedule/availability-settings/:id
 */
exports.deleteAvailabilitySetting = async (req, res) => {
  try {
    const { id } = req.params;

    const setting = await Schedule.findByPk(id);
    if (!setting) {
      return res.status(404).json(createResponse(
        false, null, "Not found", ["Availability setting not found"]
      ));
    }

    // Authorization check
    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
      if (!therapist || therapist.id !== setting.therapistId) {
        return res.status(403).json(createResponse(
          false, null, "Access denied", ["You can only delete your own availability"]
        ));
      }
    }

    await setting.destroy();

    res.json(createResponse(
      true,
      { deletedId: id },
      "Availability setting deleted successfully"
    ));

  } catch (error) {
    console.error('Error deleting availability setting:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Get my availability settings (for therapist users)
 * GET /api/v1/schedule/my/availability-settings
 */
exports.getMyAvailabilitySettings = async (req, res) => {
  try {
    if (req.user.role !== 'therapist') {
      return res.status(403).json(createResponse(
        false, null, "Access denied", ["This endpoint is for therapists only"]
      ));
    }

    const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
    if (!therapist) {
      return res.status(404).json(createResponse(
        false, null, "Profile not found", ["Therapist profile not found"]
      ));
    }

    // Delegate to the main method
    req.params.therapistId = therapist.id;
    return this.getTherapistAvailabilitySettings(req, res);

  } catch (error) {
    console.error('Error getting my availability settings:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Create my availability setting (for therapist users)
 * POST /api/v1/schedule/my/availability-settings
 */
exports.createMyAvailabilitySetting = async (req, res) => {
  try {
    if (req.user.role !== 'therapist') {
      return res.status(403).json(createResponse(
        false, null, "Access denied", ["This endpoint is for therapists only"]
      ));
    }

    const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
    if (!therapist) {
      return res.status(404).json(createResponse(
        false, null, "Profile not found", ["Therapist profile not found"]
      ));
    }

    // Add therapist ID to request body
    req.body.therapistId = therapist.id;
    return this.createAvailabilitySetting(req, res);

  } catch (error) {
    console.error('Error creating my availability setting:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

// --- UTILITY ENDPOINTS ---

/**
 * Get schedule statistics for a therapist
 * GET /api/v1/schedule/stats/:therapistId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
exports.getTherapistScheduleStats = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { startDate, endDate } = req.query;

    // Authorization check
    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json(createResponse(
          false, null, "Access denied", ["You can only view your own statistics"]
        ));
      }
    }

    // Default to current week if no dates provided
    const start = startDate || format(new Date(), 'yyyy-MM-dd');
    const end = endDate || format(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

    // Get weekly schedule to calculate stats
    const weeklySchedule = await scheduleAggregationService.getTherapistWeeklySchedule(therapistId, start);

    const stats = {
      dateRange: { startDate: start, endDate: end },
      summary: weeklySchedule.weeklySummary,
      dailyBreakdown: weeklySchedule.days.map(day => ({
        date: day.date,
        summary: day.summary
      })),
      trends: {
        busiestDay: weeklySchedule.days.reduce((prev, current) => 
          (prev.summary.bookingCount > current.summary.bookingCount) ? prev : current
        ),
        averageBookingsPerDay: weeklySchedule.weeklySummary.totalBookings / 7,
        peakUtilizationDay: weeklySchedule.days.reduce((prev, current) => 
          (prev.summary.utilizationRate > current.summary.utilizationRate) ? prev : current
        )
      }
    };

    res.json(createResponse(
      true,
      stats,
      "Retrieved schedule statistics"
    ));

  } catch (error) {
    console.error('Error getting schedule stats:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Bulk update availability settings
 * POST /api/v1/schedule/bulk-availability
 */
exports.bulkUpdateAvailability = async (req, res) => {
  try {
    const { therapistId, settings } = req.body;

    // Authorization check
    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
      if (!therapist || therapist.id !== therapistId) {
        return res.status(403).json(createResponse(
          false, null, "Access denied", ["You can only update your own availability"]
        ));
      }
    }

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Settings array is required"]
      ));
    }

    const results = [];
    const errors = [];

    // Process each setting
    for (let i = 0; i < settings.length; i++) {
      try {
        const setting = { ...settings[i], therapistId };
        const newSetting = await Schedule.create(setting);
        results.push(newSetting);
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    res.json(createResponse(
      true,
      { 
        created: results,
        errors: errors,
        successCount: results.length,
        errorCount: errors.length
      },
      `Bulk update completed: ${results.length} created, ${errors.length} failed`
    ));

  } catch (error) {
    console.error('Error in bulk availability update:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};

/**
 * Create bulk availability settings
 * POST /api/v1/schedule/availability-settings/bulk
 */
exports.createBulkAvailabilitySettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json(createResponse(
        false, null, "Validation error", ["Settings array is required"]
      ));
    }

    // Authorization check - ensure all settings are for therapists the user can manage
    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
      if (!therapist) {
        return res.status(404).json(createResponse(
          false, null, "Profile not found", ["Therapist profile not found"]
        ));
      }

      // Check if all settings are for this therapist
      const invalidSettings = settings.filter(setting => setting.therapistId !== therapist.id);
      if (invalidSettings.length > 0) {
        return res.status(403).json(createResponse(
          false, null, "Access denied", ["You can only create availability for yourself"]
        ));
      }
    }

    const results = [];
    const errors = [];

    // Process each setting
    for (let i = 0; i < settings.length; i++) {
      try {
        const setting = settings[i];
        
        // Validate each setting
        const { therapistId, type, dayOfWeek, specificDate, startTime, endTime, effectiveFrom, effectiveTo, notes } = setting;

        if (!therapistId || !type || !startTime || !endTime) {
          errors.push({ 
            index: i, 
            error: "therapistId, type, startTime, and endTime are required" 
          });
          continue;
        }

        if (!['WorkingHours', 'TimeOff'].includes(type)) {
          errors.push({ 
            index: i, 
            error: "Type must be 'WorkingHours' or 'TimeOff'" 
          });
          continue;
        }

        // Either dayOfWeek or specificDate must be provided, not both
        const hasSpecificDate = specificDate !== null && specificDate !== undefined;
        const hasDayOfWeek = dayOfWeek !== null && dayOfWeek !== undefined;

        if (hasSpecificDate && hasDayOfWeek) {
          errors.push({ 
            index: i, 
            error: "Cannot specify both specificDate and dayOfWeek" 
          });
          continue;
        }

        if (!hasSpecificDate && !hasDayOfWeek) {
          errors.push({ 
            index: i, 
            error: "Must specify either specificDate or dayOfWeek" 
          });
          continue;
        }

        const newSetting = await Schedule.create({
          therapistId,
          type,
          dayOfWeek: hasDayOfWeek ? dayOfWeek : null,
          specificDate: hasSpecificDate ? specificDate : null,
          startTime,
          endTime,
          effectiveFrom: effectiveFrom || null,
          effectiveTo: effectiveTo || null,
          notes: notes || null,
          isActive: true
        });

        results.push(newSetting);
      } catch (error) {
        console.error(`Error creating setting at index ${i}:`, error);
        errors.push({ 
          index: i, 
          error: error.message || 'Unknown error occurred' 
        });
      }
    }

    const statusCode = errors.length > 0 ? 207 : 201; // 207 Multi-Status if there are errors

    res.status(statusCode).json(createResponse(
      results.length > 0, // success if at least one was created
      { 
        created: results,
        errors: errors,
        totalRequested: settings.length,
        successCount: results.length,
        errorCount: errors.length
      },
      `Bulk creation completed: ${results.length} created, ${errors.length} failed`
    ));

  } catch (error) {
    console.error('Error in bulk availability creation:', error);
    res.status(500).json(createResponse(
      false, null, "Server error", [error.message]
    ));
  }
};