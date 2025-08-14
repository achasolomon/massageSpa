/**
 * Reminder Service
 * 
 * This service handles the generation and sending of reminders for upcoming appointments.
 * Updated to use settings from database instead of environment variables.
 */

const { Op } = require('sequelize');
const { Booking, Client, ServiceOption, Service, Therapist, User } = require('../../models');
const { addDays, format, parseISO } = require('date-fns');
const emailService = require('../emailService'); // Import your email service

/**
 * Safe date parsing utility - handles both Date objects and strings
 */
const safeDateParse = (dateInput) => {
  if (!dateInput) {
    throw new Error('Date input is null or undefined');
  }
  
  // If it's already a Date object, return it
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  // If it's a string, parse it
  if (typeof dateInput === 'string') {
    return parseISO(dateInput);
  }
  
  // Try to convert to Date
  return new Date(dateInput);
};

/**
 * Generate SMS reminder content for an appointment
 */
const generateSMSContent = (booking, client, service, settings) => {
  try {
    // Use safe date parsing
    const appointmentDate = format(safeDateParse(booking.bookingStartTime), 'MMM d');
    const appointmentTime = format(safeDateParse(booking.bookingStartTime), 'h:mm a');
    
    return `Reminder from ${settings.companyName}: Your ${service.name} appointment is scheduled for ${appointmentDate} at ${appointmentTime}. Please arrive 10 minutes early. Reply Y to confirm.`;
    
  } catch (error) {
    console.error('Error generating SMS content:', error);
    throw new Error(`Failed to generate SMS content for booking ${booking.id}: ${error.message}`);
  }
};

/**
 * SMS notification service (placeholder - would integrate with actual SMS provider)
 */
const sendSMSNotification = async (to, body) => {
  // In production, this would integrate with Twilio, Nexmo, etc.
  // console.log(`[SMS NOTIFICATION] To: ${to}`);
  // console.log(`Body: ${body}`);
  
  // Return success for now
  return { success: true, messageId: `mock-sms-${Date.now()}` };
};

/**
 * Find bookings that need reminders
 * @param {Object} options - Filter options
 * @param {number} options.daysAhead - Number of days ahead to check for appointments (default: 1)
 * @param {string} options.status - Booking status to filter by (default: 'confirmed')
 * @returns {Promise<Array>} - Array of bookings that need reminders
 */
const findBookingsForReminders = async (options = {}) => {
  const { daysAhead = 1, status = 'confirmed' } = options;
  
  try {
    // Calculate the date range for the target day
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    targetDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    
    // console.log(`Looking for ${status} bookings between ${targetDate.toISOString()} and ${endDate.toISOString()}`);
    
    // Find all confirmed bookings for the date range
    const bookings = await Booking.findAll({
      where: {
        bookingStartTime: {
          [Op.between]: [targetDate, endDate]
        },
        [Op.or]: [
          { status: status },
          { status: status.toLowerCase() },
          { status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() }
        ],
        reminderSent: {
          [Op.or]: [false, null] // Handle both false and null values
        }
      },
      include: [
        { 
          model: Client,
          required: true // Ensure we only get bookings with clients
        },
        { 
          model: ServiceOption,
          required: false,
          include: [{ 
            model: Service,
            required: false
          }]
        },
        { 
          model: Therapist,
          required: false,
          include: [{
            model: User,
            required: false
          }]
        }
      ]
    });
    
    // console.log(`Found ${bookings.length} bookings that need reminders`);
    return bookings;
    
  } catch (error) {
    console.error('Error finding bookings for reminders:', error);
    throw error;
  }
};

/**
 * Send reminders for upcoming appointments
 * @param {Object} options - Options for sending reminders
 * @param {number} options.daysAhead - Number of days ahead to check for appointments
 * @param {string} options.status - Booking status to filter by
 * @param {boolean} options.sendEmail - Whether to send email reminders
 * @param {boolean} options.sendSMS - Whether to send SMS reminders
 * @returns {Promise<Object>} - Results of the reminder sending operation
 */
const sendReminders = async (options = {}) => {
  const {
    daysAhead = 1,
    status = 'confirmed',
    sendEmail = true,
    sendSMS = false // Default to false since SMS is not implemented
  } = options;
  
  try {
    // console.log(`Starting reminder service with options:`, { daysAhead, status, sendEmail, sendSMS });
    
    // Get settings for SMS content generation
    const settings = await emailService.getSettings();
    
    // Find bookings that need reminders
    const bookings = await findBookingsForReminders({ daysAhead, status });
    
    const results = {
      total: bookings.length,
      emailSent: 0,
      smsSent: 0,
      errors: []
    };
    
    if (bookings.length === 0) {
      // console.log('No bookings found that need reminders');
      return results;
    }
    
    // Send reminders for each booking
    for (const booking of bookings) {
      const client = booking.Client;
      const therapist = booking.Therapist;
      // Access service via ServiceOption
      const service = booking.ServiceOption?.Service;

      if (!client) {
        console.warn(`Booking ${booking.id} has no associated client.`);
        results.errors.push({
          bookingId: booking.id,
          error: 'No client associated with booking'
        });
        continue;
      }

      if (!service) {
        console.warn(`Booking ${booking.id} has no associated service.`);
        results.errors.push({
          bookingId: booking.id,
          clientId: client.id,
          error: 'No service associated with booking'
        });
        continue;
      }
      
      try {
        // Send email reminder using the email service
        if (sendEmail && client.email) {
          try {
            const therapistData = therapist?.User ? {
              firstName: therapist.User.firstName,
              lastName: therapist.User.lastName
            } : null;
            
            const result = await emailService.sendReminderEmail(booking, client, service, therapistData);
            
            if (result.success) {
              results.emailSent++;
              // console.log(`Email reminder sent successfully for booking ${booking.id}`);
            } else {
              throw new Error(result.error || 'Unknown email error');
            }
            
          } catch (emailError) {
            console.error(`Failed to send email for booking ${booking.id}:`, emailError.message);
            results.errors.push({
              bookingId: booking.id,
              clientId: client.id,
              type: 'email',
              error: emailError.message
            });
          }
        }
        
        // Send SMS reminder
        if (sendSMS && client.phone) {
          try {
            const smsContent = generateSMSContent(booking, client, service, settings);
            await sendSMSNotification(client.phone, smsContent);
            results.smsSent++;
            // console.log(`SMS reminder sent successfully for booking ${booking.id}`);
          } catch (smsError) {
            console.error(`Failed to send SMS for booking ${booking.id}:`, smsError.message);
            results.errors.push({
              bookingId: booking.id,
              clientId: client.id,
              type: 'sms',
              error: smsError.message
            });
          }
        }
        
        // Mark reminder as sent (only if at least one notification was attempted successfully)
        const emailSuccess = !sendEmail || !client.email || results.emailSent > 0;
        const smsSuccess = !sendSMS || !client.phone || results.smsSent > 0;
        
        if (emailSuccess || smsSuccess) {
          await booking.update({ reminderSent: true });
          // console.log(`Marked reminder as sent for booking ${booking.id}`);
        }
        
      } catch (error) {
        console.error(`Error processing reminder for booking ${booking.id}:`, error);
        results.errors.push({
          bookingId: booking.id,
          clientId: client.id,
          error: error.message
        });
      }
    }
    
    // console.log('Reminder service completed:', results);
    return results;
    
  } catch (error) {
    console.error('Error in sendReminders:', error);
    throw error;
  }
};

/**
 * Send immediate reminder for a specific booking (for testing or manual triggers)
 */
const sendImmediateReminder = async (bookingId) => {
  try {
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Client, required: true },
        { 
          model: ServiceOption,
          include: [{ model: Service }]
        },
        { 
          model: Therapist,
          include: [{
            model: User,
            required: false
          }]
        }
      ]
    });

    if (!booking) {
      throw new Error(`Booking with ID ${bookingId} not found`);
    }

    const client = booking.Client;
    const service = booking.ServiceOption?.Service;

    if (!client || !service) {
      throw new Error('Booking missing required client or service information');
    }

    const therapistData = booking.Therapist?.User ? {
      firstName: booking.Therapist.User.firstName,
      lastName: booking.Therapist.User.lastName
    } : null;

    const result = await emailService.sendReminderEmail(booking, client, service, therapistData);

    if (!result.success) {
      throw new Error(result.error || 'Failed to send reminder email');
    }

    // Don't mark as reminderSent for immediate reminders
    return {
      success: true,
      bookingId: bookingId,
      messageId: result.messageId
    };

  } catch (error) {
    console.error(`Error sending immediate reminder for booking ${bookingId}:`, error);
    throw error;
  }
};

/**
 * Reset reminder flags for testing purposes
 */
const resetReminderFlags = async (bookingIds = null) => {
  try {
    const whereClause = bookingIds ? { id: { [Op.in]: bookingIds } } : {};
    
    const result = await Booking.update(
      { reminderSent: false },
      { where: whereClause }
    );
    
    // console.log(`Reset reminder flags for ${result[0]} bookings`);
    return { success: true, updatedCount: result[0] };
    
  } catch (error) {
    console.error('Error resetting reminder flags:', error);
    throw error;
  }
};

module.exports = {
  findBookingsForReminders,
  sendReminders,
  sendImmediateReminder,
  resetReminderFlags,
  generateSMSContent,
  safeDateParse
};