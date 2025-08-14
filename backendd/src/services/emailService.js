const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { Booking, Settings } = require('../models'); // Add Settings model
const { format } = require('date-fns');

// Cache for settings to avoid repeated database calls
let settingsCache = null;
let settingsCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get settings from database with caching
const getSettings = async () => {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (settingsCache && settingsCacheTime && (now - settingsCacheTime) < CACHE_DURATION) {
      return settingsCache;
    }

    // Fetch from database
    const settings = await Settings.findOne({
      order: [['updatedAt', 'DESC']] // Get the most recent settings
    });

    if (settings) {
      settingsCache = settings.dataValues;
      settingsCacheTime = now;
      return settingsCache;
    }

    // Return default values if no settings found
    return {
      companyName: 'Your Business',
      businessEmail: process.env.SMTP_USER || 'noreply@yourbusiness.com',
      supportEmail: process.env.SMTP_USER || 'support@yourbusiness.com',
      phoneNumber1: '(555) 123-4567',
      phoneNumber2: '',
      companyAddress: 'Your Business Address',
      website: 'https://yourbusiness.com',
      themeColor: '#1976d2',
      secondaryColor: '#4caf50'
    };

  } catch (error) {
    console.error('Error fetching settings:', error);
    // Return fallback values
    return {
      companyName: 'Your Business',
      businessEmail: process.env.SMTP_USER || 'noreply@yourbusiness.com',
      supportEmail: process.env.SMTP_USER || 'support@yourbusiness.com',
      phoneNumber1: '(555) 123-4567',
      phoneNumber2: '',
      companyAddress: 'Your Business Address',
      website: 'https://yourbusiness.com',
      themeColor: '#1976d2',
      secondaryColor: '#4caf50'
    };
  }
};

// Clear settings cache (call this when settings are updated)
const clearSettingsCache = () => {
  settingsCache = null;
  settingsCacheTime = null;
};

// Create transporter with better error handling
const createTransporter = () => {
  // Validate required environment variables
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Missing required SMTP configuration in environment variables');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Additional security options
    // tls: {
    //   rejectUnauthorized: false // Only for development - remove in production
    // }
  });
};

// Generate unique token for consent form
const generateConsentFormToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Utility function to safely format dates
const safeFormatDate = (dateInput, formatString) => {
  try {
    if (!dateInput) return 'Date not available';

    let date;
    if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return format(date, formatString);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Date formatting error';
  }
};

// Send booking confirmation email with consent form link
exports.sendBookingConfirmation = async (booking, client, serviceOption, service) => {
  try {
    const transporter = createTransporter();
    const settings = await getSettings();

    // Generate and save consent form token
    const consentFormToken = generateConsentFormToken();
    await booking.update({ consentFormToken });

    // Create consent form URL - use settings website or fallback
    const baseUrl = settings.website || 'http://localhost:3000';
    const consentFormUrl = `${baseUrl}/consent-form/${consentFormToken}`;

    // Format booking details with safe date formatting
    const bookingDate = safeFormatDate(booking.bookingStartTime, 'EEEE, MMMM do, yyyy');
    const bookingTime = safeFormatDate(booking.bookingStartTime, 'h:mm a');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${settings.themeColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          
          .button { 
            display: inline-block; 
            background-color: ${settings.themeColor}; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
            font-weight: bold;
          }
          
          .info-box { 
            background-color: #e3f2fd; 
            border-left: 4px solid ${settings.themeColor}; 
            padding: 16px; 
            margin: 20px 0; 
          }
          .footer { 
            background-color: #333; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmation Required</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${client.firstName}!</h2>
            
            <p>Thank you for booking with ${settings.companyName}. Your appointment has been successfully submitted and is currently <strong>pending confirmation</strong>.</p>
            
            <div class="info-box">
              <h3>📋 Next Step Required</h3>
              <p>To complete your booking and confirm your appointment, please fill out our consent form by clicking the button below:</p>
              
              <a href="${consentFormUrl}" class="button">Complete Consent Form</a>
              
              <p><strong>Important:</strong> Your appointment will only be fully confirmed after you complete the consent form.</p>
            </div>
            
            <h3>Preliminary Booking Details:</h3>
            <ul>
              <li><strong>Service:</strong> ${service.name}</li>
              <li><strong>Date:</strong> ${bookingDate}</li>
              <li><strong>Time:</strong> ${bookingTime}</li>
              <li><strong>Duration:</strong> ${serviceOption.duration} minutes</li>
              <li><strong>Price:</strong> $${serviceOption.price}</li>
            </ul>
            
            <div class="info-box">
              <h4>⚠️ Please Note:</h4>
              <ul>
                <li>This is not your final confirmation</li>
                <li>Complete booking details will be sent after consent form submission</li>
                <li>The consent form link is valid for 48 hours</li>
              </ul>
            </div>           
            
            <h3>Contact Information:</h3>
            <p>
              📞 Phone: ${settings.phoneNumber1}${settings.phoneNumber2 ? ` / ${settings.phoneNumber2}` : ''}<br>
              📧 Email: ${settings.businessEmail}<br>
              📍 Address: ${settings.companyAddress}
            </p>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>${settings.companyName}</p>
          </div>
          
          <div class="footer">
            <p>This email was sent regarding your booking request.</p>
            <p>If you didn't make this booking, please contact us immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${settings.companyName}" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: 'Appointment scheduled - Next step required',
      html: emailHtml
    };

    const result = await transporter.sendMail(mailOptions);
    // console.log('Booking confirmation email sent successfully:', result.messageId);

    return { success: true, message: 'Booking confirmation email sent successfully' };

  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return { success: false, error: error.message };
  }
};

// Send booking details email after consent form completion
exports.sendBookingDetailsEmail = async (booking, client, serviceOption, service) => {
  try {
    const transporter = createTransporter();
    const settings = await getSettings();

    // Format booking details with safe date formatting
    const bookingDate = safeFormatDate(booking.bookingStartTime, 'EEEE, MMMM do, yyyy');
    const bookingTime = safeFormatDate(booking.bookingStartTime, 'h:mm a');
    const endTime = safeFormatDate(booking.bookingEndTime, 'h:mm a');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${settings.themeColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .appointment-card { 
            background-color: white; 
            border: 2px solid ${settings.themeColor}; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px solid #eee; 
          }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #666; margin-right: 8px;  }
          .value { color: #333; }
          .important-info { 
            background-color: #fff3cd; 
            border: 1px solid #ffeaa7; 
            border-radius: 4px; 
            padding: 16px; 
            margin: 20px 0; 
          }
          .footer { 
            background-color: #333; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Confirmed!</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${client.firstName}!</h2>
            
            <p>Great news! Your consent form has been received and your appointment is now <strong>fully confirmed</strong>.</p>
            
            <div class="appointment-card">
              <h3 style="margin-top: 0; color: ${settings.themeColor};">📅 Your Appointment Details</h3>
              
              <div class="detail-row">
                <span class="label">Booking ID: </span>
                <span class="value">#${booking.id.toString().substring(0, 8).toUpperCase()}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Service: </span>
                <span class="value">${service.name}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Date: </span>
                <span class="value">${bookingDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Time: </span>
                <span class="value">${bookingTime} - ${endTime}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Duration: </span>
                <span class="value">${serviceOption.duration} minutes</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Total Price: </span>
                <span class="value"><strong>$${serviceOption.price}</strong></span>
              </div>
              
              <div class="detail-row">
                <span class="label">Payment Status: </span>
                <span class="value">${booking.paymentStatus}</span>
              </div>
            </div>
            
            <div class="important-info">
              <h4>📍 Important Information:</h4>
              <ul>
                <li><strong>Arrival:</strong> Please arrive 10 minutes before your appointment time</li>
                <li><strong>Cancellation:</strong> Please provide at least 24 hours notice for cancellations</li>
                <li><strong>Contact:</strong> Call us if you need to reschedule or have any questions</li>
                <li><strong>What to Bring:</strong> Please bring a valid ID and any relevant medical documents</li>
              </ul>
            </div>
            
            <h3>Contact Information:</h3>
            <p>
              📞 Phone: ${settings.phoneNumber1}${settings.phoneNumber2 ? ` / ${settings.phoneNumber2}` : ''}<br>
              📧 Email: ${settings.businessEmail}<br>
              📍 Address: ${settings.companyAddress}
            </p>
            
            <p>We look forward to seeing you at your appointment!</p>
            
            <p>Best regards,<br>${settings.companyName}</p>
          </div>
          
          <div class="footer">
            <p>This is your official appointment confirmation.</p>
            <p>Please save this email for your records.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${settings.companyName}" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: `Appointment Confirmed - ${bookingDate} at ${bookingTime}`,
      html: emailHtml
    };

    const result = await transporter.sendMail(mailOptions);
    // console.log('Booking details email sent successfully:', result.messageId);

    return { success: true, message: 'Booking details email sent successfully' };

  } catch (error) {
    console.error('Error sending booking details email:', error);
    return { success: false, error: error.message };
  }
};

// Send reschedule email
exports.rescheduleBookingEmail = async (booking, client, newStartTime, newEndTime) => {
  try {
    const transporter = createTransporter();
    const settings = await getSettings();

    // Format new booking details with safe date formatting
    const newBookingDate = safeFormatDate(newStartTime, 'EEEE, MMMM do, yyyy');
    const newBookingTime = safeFormatDate(newStartTime, 'h:mm a');
    const newEndTimeFormatted = safeFormatDate(newEndTime, 'h:mm a');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Rescheduled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${settings.themeColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .appointment-card { 
            background-color: white; 
            border: 2px solid ${settings.themeColor}; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px solid #eee; 
          }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #666; }
          .value { color: #333; }
          .important-info { 
            background-color: #fff3cd; 
            border: 1px solid #ffeaa7; 
            border-radius: 4px; 
            padding: 16px; 
            margin: 20px 0; 
          }
          .footer { 
            background-color: #333; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Rescheduled</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${client.firstName}!</h2>
            
            <p>Your appointment has been successfully rescheduled. Here are the updated details:</p>
            
            <div class="appointment-card">
              <h3 style="margin-top: 0; color: ${settings.themeColor};">📅 Rescheduled Appointment Details</h3>
              
              <div class="detail-row">
                <span class="label">Booking ID:</span>
                <span class="value">#${booking.id.toString().substring(0, 8).toUpperCase()}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">New Date:</span>
                <span class="value">${newBookingDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">New Time:</span>
                <span class="value">${newBookingTime} - ${newEndTimeFormatted}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Duration:</span>
                <span class="value">${booking.serviceOption?.duration || 'N/A'} minutes</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Total Price:</span>
                <span class="value"><strong>$${booking.serviceOption?.price || 'N/A'}</strong></span>
              </div>
              
              <div class="detail-row">
                <span class="label">Payment Status:</span>
                <span class="value">${booking.paymentStatus}</span> 
              </div>
            </div>
            
            <div class="important-info">
              <h4>📍 Important Information:</h4>
              <ul>
                <li><strong>Arrival:</strong> Please arrive 10 minutes before your appointment time</li>
                <li><strong>Cancellation:</strong> Please provide at least 24 hours notice for cancellations</li>
                <li><strong>Contact:</strong> Call us if you need to reschedule or have any questions</li>
                <li><strong>What to Bring:</strong> Please bring a valid ID and any relevant medical documents</li>
              </ul>
            </div>
            
            <h3>Contact Information:</h3>
            <p>
              📞 Phone: ${settings.phoneNumber1}${settings.phoneNumber2 ? ` / ${settings.phoneNumber2}` : ''}<br>
              📧 Email: ${settings.businessEmail}<br>
              📍 Address: ${settings.companyAddress}
            </p>
            
            <p>We look forward to seeing you at your appointment!</p>
            
            <p>Best regards,<br>${settings.companyName}</p>
          </div>
          
          <div class="footer">
            <p>This is your official appointment confirmation.</p>
            <p>Please save this email for your records.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${settings.companyName}" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: `Appointment Rescheduled - ${newBookingDate} at ${newBookingTime}`,
      html: emailHtml
    };

    const result = await transporter.sendMail(mailOptions);
    // console.log('Reschedule email sent successfully:', result.messageId);

    return { success: true, message: 'Reschedule email sent successfully' };

  } catch (error) {
    console.error('Error sending reschedule email:', error);
    return { success: false, error: error.message };
  }
};

// Send cancellation email to client
exports.sendCancellationEmail = async (booking, client) => {
  try {
    const transporter = createTransporter();
    const settings = await getSettings();

    const bookingDate = safeFormatDate(booking.bookingStartTime, 'EEEE, MMMM do, yyyy');
    const bookingTime = safeFormatDate(booking.bookingStartTime, 'h:mm a');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Cancelled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { 
            background-color: #333; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Cancelled</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${client.firstName},</h2>
            
            <p>We regret to inform you that your appointment scheduled for ${bookingDate} at ${bookingTime} has been cancelled.</p>
            
            <p>If you have any questions or would like to reschedule, please contact us at your earliest convenience.</p>
            
            <h3>Contact Information:</h3>
            <p>
              📞 Phone: ${settings.phoneNumber1}${settings.phoneNumber2 ? ` / ${settings.phoneNumber2}` : ''}<br>
              📧 Email: ${settings.businessEmail}
            </p>
            
            <p>Thank you for your understanding.</p>
            
            <p>Best regards,<br>${settings.companyName}</p>
          </div>
          
          <div class="footer">
            <p>This is a notification regarding your appointment cancellation.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${settings.companyName}" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: 'Your Appointment Has Been Cancelled',
      html: emailHtml
    };

    const result = await transporter.sendMail(mailOptions);
    // console.log('Cancellation email sent successfully:', result.messageId);

    return { success: true, message: 'Cancellation email sent successfully' };

  } catch (error) {
    console.error('Error sending cancellation email:', error);
    return { success: false, error: error.message };
  }
};

// Send therapist assignment notification email
exports.sendTherapistAssignmentEmail = async (booking, therapist, client, serviceOption, service) => {
  try {
    const transporter = createTransporter();
    const settings = await getSettings();

    // Format booking details with safe date formatting
    const bookingDate = safeFormatDate(booking.bookingStartTime, 'EEEE, MMMM do, yyyy');
    const bookingTime = safeFormatDate(booking.bookingStartTime, 'h:mm a');
    const endTime = safeFormatDate(booking.bookingEndTime, 'h:mm a');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Booking Assignment</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${settings.themeColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .appointment-card { 
            background-color: white; 
            border: 2px solid ${settings.themeColor}; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px solid #eee; 
          }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #666; margin-right: 8px; }
          .value { color: #333; }
          .client-info { 
            background-color: #e8f5e8; 
            border: 1px solid ${settings.themeColor}; 
            border-radius: 4px; 
            padding: 16px; 
            margin: 20px 0; 
          }
          .important-info { 
            background-color: #fff3cd; 
            border: 1px solid #ffeaa7; 
            border-radius: 4px; 
            padding: 16px; 
            margin: 20px 0; 
          }
          .footer { 
            background-color: #333; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Booking Assignment</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${therapist.User.firstName}!</h2>
            
            <p>You have been assigned a new booking. Please review the details below and prepare accordingly.</p>
            
            <div class="appointment-card">
              <h3 style="margin-top: 0; color: ${settings.themeColor};">📅 Appointment Details</h3>
              
              <div class="detail-row">
                <span class="label">Booking ID:</span>
                <span class="value">#${booking.id.toString().substring(0, 8).toUpperCase()}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Service:</span>
                <span class="value">${service.name}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">${bookingDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Time:</span>
                <span class="value">${bookingTime} - ${endTime}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Duration:</span>
                <span class="value">${serviceOption.duration} minutes</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Status:</span>
                <span class="value">${booking.status}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Payment Status:</span>
                <span class="value">${booking.paymentStatus}</span>
              </div>
            </div>
            
            <div class="client-info">
              <h4>👤 Client Information</h4>
              <div class="detail-row">
                <span class="label">Name:</span>
                <span class="value">${client.firstName} ${client.lastName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Email:</span>
                <span class="value">${client.email}</span>
              </div>
              ${client.phone ? `
                <div class="detail-row">
                  <span class="label">Phone:</span>
                  <span class="value">${client.phone}</span>
                </div>
              ` : ''}
              ${booking.clientNotes ? `
                <div class="detail-row">
                  <span class="label">Client Notes:</span>
                  <span class="value">${booking.clientNotes}</span>
                </div>
              ` : ''}
            </div>
            
            <div class="important-info">
              <h4>⚠️ Important Notes:</h4>
              <ul>
                <li><strong>Preparation:</strong> Please review any relevant client history before the appointment</li>
                <li><strong>Arrival:</strong> Please arrive 10-15 minutes early to prepare</li>
                <li><strong>Contact:</strong> Contact the client if you need to reschedule or have questions</li>
                <li><strong>Documentation:</strong> Remember to complete clinical notes after the session</li>
              </ul>
            </div>
            
            <p>If you have any questions or concerns about this booking, please contact the administration team immediately.</p>
            
            <p>Best regards,<br>${settings.companyName}</p>
          </div>
          
          <div class="footer">
            <p>This is a booking assignment notification.</p>
            <p>Please keep this email for your records.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${settings.companyName}" <${process.env.SMTP_USER}>`,
      to: therapist.User.email,
      subject: `New Booking Assignment - ${bookingDate} at ${bookingTime}`,
      html: emailHtml
    };

    const result = await transporter.sendMail(mailOptions);
    // console.log('Therapist assignment email sent successfully:', result.messageId);

    return { success: true, message: 'Therapist assignment email sent successfully' };

  } catch (error) {
    console.error('Error sending therapist assignment email:', error);
    return { success: false, error: error.message };
  }
};

// Send reminder email (for reminder service)
exports.sendReminderEmail = async (booking, client, service, therapist = null) => {
  try {
    const transporter = createTransporter();
    const settings = await getSettings();

    // Format booking details with safe date formatting
    const bookingDate = safeFormatDate(booking.bookingStartTime, 'EEEE, MMMM do, yyyy');
    const bookingTime = safeFormatDate(booking.bookingStartTime, 'h:mm a');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${settings.themeColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .reminder-card { 
            background-color: white; 
            border: 2px solid ${settings.themeColor}; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px solid #eee; 
          }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #666; margin-right: 8px; }
          .value { color: #333; }
          .important-info { 
            background-color: #e8f5e8; 
            border: 1px solid ${settings.secondaryColor}; 
            border-radius: 4px; 
            padding: 16px; 
            margin: 20px 0; 
          }
          .footer { 
            background-color: #333; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Appointment Reminder</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${client.firstName}!</h2>
            
            <p>This is a friendly reminder about your upcoming appointment with ${settings.companyName}.</p>
            
            <div class="reminder-card">
              <h3 style="margin-top: 0; color: ${settings.themeColor};">📅 Appointment Details</h3>
              
              <div class="detail-row">
                <span class="label">Service:</span>
                <span class="value">${service.name}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">${bookingDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Time:</span>
                <span class="value">${bookingTime}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Duration:</span>
                <span class="value">${service.duration || 'N/A'} minutes</span>
              </div>
              
              ${therapist ? `
                <div class="detail-row">
                  <span class="label">Therapist:</span>
                  <span class="value">${therapist.firstName} ${therapist.lastName}</span>
                </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="label">Location:</span>
                <span class="value">${settings.companyAddress}</span>
              </div>
            </div>
            
            <div class="important-info">
              <h4>📍 Important Reminders:</h4>
              <ul>
                <li><strong>Arrival:</strong> Please arrive 10 minutes before your appointment time</li>
                <li><strong>Cancellation:</strong> If you need to reschedule, please contact us at least 24 hours in advance</li>
                <li><strong>What to Bring:</strong> Please bring a valid ID and any relevant medical documents</li>
                <li><strong>Contact:</strong> Call us if you have any questions or concerns</li>
              </ul>
            </div>
            
            <h3>Contact Information:</h3>
            <p>
              📞 Phone: ${settings.phoneNumber1}${settings.phoneNumber2 ? ` / ${settings.phoneNumber2}` : ''}<br>
              📧 Email: ${settings.businessEmail}<br>
              📍 Address: ${settings.companyAddress}
            </p>
            
            <p>We look forward to seeing you!</p>
            
            <p>Best regards,<br>${settings.companyName}</p>
          </div>
          
          <div class="footer">
            <p>This is an automated reminder. Please do not reply to this email.</p>
            <p>Contact us: ${settings.phoneNumber1}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${settings.companyName}" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: `Reminder: Your appointment on ${bookingDate}`,
      html: emailHtml
    };

    const result = await transporter.sendMail(mailOptions);
    // console.log('Reminder email sent successfully:', result.messageId);

    return { success: true, message: 'Reminder email sent successfully' };

  } catch (error) {
    console.error('Error sending reminder email:', error);
    return { success: false, error: error.message };
  }
};

// Export the settings cache management functions
exports.clearSettingsCache = clearSettingsCache;
exports.getSettings = getSettings;