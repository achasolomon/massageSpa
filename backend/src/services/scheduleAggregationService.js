const { Op } = require("sequelize");
const { Booking, Therapist, User, Schedule, ServiceOption, Service, Client } = require("../models");
const { format, parseISO, startOfDay, endOfDay, addMinutes, differenceInMinutes } = require("date-fns");

class ScheduleAggregationService {
  
  /**
   * Get therapist's daily schedule combining base availability + actual bookings
   * @param {string} therapistId - Therapist UUID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Object} Daily schedule with time slots, bookings, and availability
   */
  async getTherapistDailySchedule(therapistId, date) {
    try {
      const targetDate = parseISO(date);
      const dayOfWeek = targetDate.getDay();
      const dateStart = startOfDay(targetDate);
      const dateEnd = endOfDay(targetDate);

      // 1. Get base working hours for this day
      const workingHours = await this.getBaseWorkingHours(therapistId, date, dayOfWeek);
      
      // 2. Get all bookings for this day
      const bookings = await this.getDayBookings(therapistId, dateStart, dateEnd);
      
      // 3. Get any time-off blocks for this day
      const timeOffBlocks = await this.getTimeOffBlocks(therapistId, date, dayOfWeek);
      
      // 4. Calculate available time slots
      const availableSlots = this.calculateAvailableSlots(workingHours, bookings, timeOffBlocks);
      
      // 5. Build unified schedule view
      return {
        date,
        therapistId,
        workingHours,
        bookings: bookings.map(this.formatBookingForSchedule),
        timeOffBlocks,
        availableSlots,
        summary: this.generateDaySummary(workingHours, bookings, timeOffBlocks)
      };
    } catch (error) {
      console.error('Error getting therapist daily schedule:', error);
      throw new Error('Failed to retrieve daily schedule');
    }
  }

  /**
   * Get weekly overview for a therapist
   * @param {string} therapistId 
   * @param {string} startDate - Week start date
   * @returns {Object} Weekly schedule overview
   */
  async getTherapistWeeklySchedule(therapistId, startDate) {
    try {
      const weekDays = [];
      const start = parseISO(startDate);
      
      // Generate 7 days starting from startDate
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        const dailySchedule = await this.getTherapistDailySchedule(therapistId, dateStr);
        weekDays.push(dailySchedule);
      }
      
      return {
        therapistId,
        weekStartDate: startDate,
        days: weekDays,
        weeklySummary: this.generateWeeklySummary(weekDays)
      };
    } catch (error) {
      console.error('Error getting therapist weekly schedule:', error);
      throw new Error('Failed to retrieve weekly schedule');
    }
  }

  /**
   * Get overview of all therapists for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Array} All therapists' schedules for the date
   */
  async getAllTherapistsScheduleOverview(date) {
    try {
      // Get all active therapists
      const therapists = await Therapist.findAll({
        include: [{
          model: User,
          attributes: ['firstName', 'lastName', 'email']
        }],
        where: { isActive: true }
      });

      const scheduleOverviews = await Promise.all(
        therapists.map(async (therapist) => {
          const dailySchedule = await this.getTherapistDailySchedule(therapist.id, date);
          return {
            therapist: {
              id: therapist.id,
              name: `${therapist.User.firstName} ${therapist.User.lastName}`,
              email: therapist.User.email,
              specialties: therapist.specialties
            },
            schedule: dailySchedule
          };
        })
      );

      return {
        date,
        therapists: scheduleOverviews,
        overallSummary: this.generateOverallSummary(scheduleOverviews)
      };
    } catch (error) {
      console.error('Error getting all therapists schedule overview:', error);
      throw new Error('Failed to retrieve schedule overview');
    }
  }

  /**
   * Get real-time available slots for booking
   * @param {string} therapistId 
   * @param {string} date 
   * @param {number} duration - Required duration in minutes
   * @returns {Array} Available time slots
   */
  async getAvailableBookingSlots(therapistId, date, duration = 60) {
    try {
      const dailySchedule = await this.getTherapistDailySchedule(therapistId, date);
      
      if (!dailySchedule.workingHours || dailySchedule.workingHours.length === 0) {
        return []; // No working hours defined
      }

      const availableSlots = [];
      
      // For each working hour block, find available slots
      dailySchedule.workingHours.forEach(workBlock => {
        const slots = this.findAvailableSlotsInTimeBlock(
          workBlock.startTime,
          workBlock.endTime,
          dailySchedule.bookings,
          dailySchedule.timeOffBlocks,
          duration
        );
        availableSlots.push(...slots);
      });

      return availableSlots.sort();
    } catch (error) {
      console.error('Error getting available booking slots:', error);
      throw new Error('Failed to retrieve available slots');
    }
  }

  // Private helper methods

  async getBaseWorkingHours(therapistId, date, dayOfWeek) {
    return await Schedule.findAll({
      where: {
        therapistId,
        type: 'WorkingHours',
        isActive: true,
        [Op.or]: [
          // Recurring weekly hours
          {
            dayOfWeek,
            specificDate: null,
            [Op.and]: [
              {
                [Op.or]: [
                  { effectiveFrom: null },
                  { effectiveFrom: { [Op.lte]: date } }
                ]
              },
              {
                [Op.or]: [
                  { effectiveTo: null },
                  { effectiveTo: { [Op.gte]: date } }
                ]
              }
            ]
          },
          // Specific date overrides
          { specificDate: date }
        ]
      },
      order: [['startTime', 'ASC']]
    });
  }

  async getDayBookings(therapistId, dateStart, dateEnd) {
    return await Booking.findAll({
      where: {
        therapistId,
        bookingStartTime: {
          [Op.between]: [dateStart, dateEnd]
        },
        status: {
          [Op.notIn]: ['Cancelled By Client', 'Cancelled By Staff']
        }
      },
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: ServiceOption,
          include: [{
            model: Service,
            attributes: ['id', 'name']
          }]
        }
      ],
      order: [['bookingStartTime', 'ASC']]
    });
  }

  async getTimeOffBlocks(therapistId, date, dayOfWeek) {
    return await Schedule.findAll({
      where: {
        therapistId,
        type: 'TimeOff',
        isActive: true,
        [Op.or]: [
          // Recurring weekly time off
          {
            dayOfWeek,
            specificDate: null,
            [Op.and]: [
              {
                [Op.or]: [
                  { effectiveFrom: null },
                  { effectiveFrom: { [Op.lte]: date } }
                ]
              },
              {
                [Op.or]: [
                  { effectiveTo: null },
                  { effectiveTo: { [Op.gte]: date } }
                ]
              }
            ]
          },
          // Specific date time off
          { specificDate: date }
        ]
      },
      order: [['startTime', 'ASC']]
    });
  }

  calculateAvailableSlots(workingHours, bookings, timeOffBlocks) {
    // Implementation for calculating free time slots
    // This would subtract bookings and time-off from working hours
    const availableSlots = [];
    
    workingHours.forEach(workBlock => {
      let currentTime = workBlock.startTime;
      const endTime = workBlock.endTime;
      
      // Sort all occupied times (bookings + time off)
      const occupiedTimes = [
        ...bookings.map(b => ({
          start: format(b.bookingStartTime, 'HH:mm:ss'),
          end: format(b.bookingEndTime, 'HH:mm:ss'),
          type: 'booking'
        })),
        ...timeOffBlocks.map(t => ({
          start: t.startTime,
          end: t.endTime,
          type: 'timeOff'
        }))
      ].sort((a, b) => a.start.localeCompare(b.start));
      
      // Find gaps between occupied times
      occupiedTimes.forEach(occupied => {
        if (currentTime < occupied.start) {
          availableSlots.push({
            startTime: currentTime,
            endTime: occupied.start,
            duration: this.calculateDuration(currentTime, occupied.start)
          });
        }
        currentTime = occupied.end > currentTime ? occupied.end : currentTime;
      });
      
      // Add remaining time after last booking
      if (currentTime < endTime) {
        availableSlots.push({
          startTime: currentTime,
          endTime: endTime,
          duration: this.calculateDuration(currentTime, endTime)
        });
      }
    });
    
    return availableSlots;
  }

  formatBookingForSchedule(booking) {
    return {
      id: booking.id,
      startTime: format(booking.bookingStartTime, 'HH:mm:ss'),
      endTime: format(booking.bookingEndTime, 'HH:mm:ss'),
      duration: differenceInMinutes(booking.bookingEndTime, booking.bookingStartTime),
      status: booking.status,
      client: {
        id: booking.Client.id,
        name: `${booking.Client.firstName} ${booking.Client.lastName}`,
        email: booking.Client.email
      },
      service: {
        id: booking.ServiceOption.Service.id,
        name: booking.ServiceOption.Service.name,
        duration: booking.ServiceOption.duration,
        price: booking.priceAtBooking
      },
      notes: booking.clientNotes,
      paymentStatus: booking.paymentStatus
    };
  }

  generateDaySummary(workingHours, bookings, timeOffBlocks) {
    const totalWorkingMinutes = workingHours.reduce((sum, block) => 
      sum + this.calculateDuration(block.startTime, block.endTime), 0);
    
    const totalBookedMinutes = bookings.reduce((sum, booking) => 
      sum + differenceInMinutes(booking.bookingEndTime, booking.bookingStartTime), 0);
    
    const totalTimeOffMinutes = timeOffBlocks.reduce((sum, block) => 
      sum + this.calculateDuration(block.startTime, block.endTime), 0);
    
    const availableMinutes = totalWorkingMinutes - totalBookedMinutes - totalTimeOffMinutes;
    const utilizationRate = totalWorkingMinutes > 0 ? (totalBookedMinutes / totalWorkingMinutes) * 100 : 0;
    
    return {
      totalWorkingHours: Math.floor(totalWorkingMinutes / 60),
      totalBookedHours: Math.floor(totalBookedMinutes / 60),
      totalAvailableHours: Math.floor(availableMinutes / 60),
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      bookingCount: bookings.length,
      hasTimeOff: timeOffBlocks.length > 0
    };
  }

  generateWeeklySummary(weekDays) {
    const totalBookings = weekDays.reduce((sum, day) => sum + day.summary.bookingCount, 0);
    const totalWorkingHours = weekDays.reduce((sum, day) => sum + day.summary.totalWorkingHours, 0);
    const totalBookedHours = weekDays.reduce((sum, day) => sum + day.summary.totalBookedHours, 0);
    const avgUtilization = weekDays.reduce((sum, day) => sum + day.summary.utilizationRate, 0) / 7;
    
    return {
      totalBookings,
      totalWorkingHours,
      totalBookedHours,
      averageUtilization: Math.round(avgUtilization * 100) / 100,
      workingDays: weekDays.filter(day => day.summary.totalWorkingHours > 0).length
    };
  }

  generateOverallSummary(therapistSchedules) {
    const totalTherapists = therapistSchedules.length;
    const activeTherapists = therapistSchedules.filter(t => t.schedule.summary.totalWorkingHours > 0).length;
    const totalBookings = therapistSchedules.reduce((sum, t) => sum + t.schedule.summary.bookingCount, 0);
    const avgUtilization = therapistSchedules.reduce((sum, t) => sum + t.schedule.summary.utilizationRate, 0) / totalTherapists;
    
    return {
      totalTherapists,
      activeTherapists,
      totalBookings,
      averageUtilization: Math.round(avgUtilization * 100) / 100
    };
  }

  calculateDuration(startTime, endTime) {
    // Helper to calculate duration in minutes between time strings
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return differenceInMinutes(end, start);
  }

  findAvailableSlotsInTimeBlock(startTime, endTime, bookings, timeOffBlocks, requiredDuration) {
    // Implementation to find specific time slots of required duration
    const slots = [];
    const slotInterval = 15; // 15-minute intervals
    
    let currentTime = startTime;
    while (this.calculateDuration(currentTime, endTime) >= requiredDuration) {
      const slotEnd = this.addMinutesToTime(currentTime, requiredDuration);
      
      // Check if this slot conflicts with any booking or time off
      const hasConflict = [
        ...bookings.map(b => ({ start: format(b.bookingStartTime, 'HH:mm:ss'), end: format(b.bookingEndTime, 'HH:mm:ss') })),
        ...timeOffBlocks.map(t => ({ start: t.startTime, end: t.endTime }))
      ].some(occupied => 
        currentTime < occupied.end && slotEnd > occupied.start
      );
      
      if (!hasConflict) {
        slots.push(currentTime);
      }
      
      currentTime = this.addMinutesToTime(currentTime, slotInterval);
    }
    
    return slots;
  }

  addMinutesToTime(timeString, minutes) {
    const date = new Date(`2000-01-01T${timeString}`);
    const newDate = addMinutes(date, minutes);
    return format(newDate, 'HH:mm:ss');
  }
}

module.exports = new ScheduleAggregationService();