const { ConsentForm, Booking, Client, ServiceOption, Service } = require('../models');
const { sendBookingDetailsEmail } = require('../services/emailService');
const crypto = require('crypto');

// Get consent form by token
exports.getConsentFormByToken = async (req, res) => {
  const { token } = req.params;

  try {
    const booking = await Booking.findOne({
      where: { consentFormToken: token },
      include: [
        { model: Client, attributes: ['firstName', 'lastName', 'email', 'phone'] },
        { 
          model: ServiceOption, 
          include: [{ model: Service, attributes: ['name'] }],
          attributes: ['optionName', 'price', 'duration']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Invalid or expired consent form link.' });
    }

    // Check if consent form is already completed
    const existingForm = await ConsentForm.findOne({ where: { bookingId: booking.id } });
    if (existingForm) {
      return res.status(400).json({ 
        message: 'Consent form has already been completed for this booking.',
        bookingStatus: booking.status
      });
    }

    // Check if booking is still in pending confirmation status
    if (booking.status !== 'Pending Confirmation') {
      return res.status(400).json({ 
        message: 'This booking is no longer pending confirmation.',
        bookingStatus: booking.status
      });
    }

    res.json({
      success: true,
      booking: {
        id: booking.id,
        bookingStartTime: booking.bookingStartTime,
        bookingEndTime: booking.bookingEndTime,
        client: booking.Client,
        service: booking.ServiceOption.Service,
        serviceOption: booking.ServiceOption
      }
    });

  } catch (error) {
    console.error('Error fetching consent form:', error);
    res.status(500).json({ message: 'Server error while fetching consent form.' });
  }
};

// Submit consent form
exports.submitConsentForm = async (req, res) => {
  const { token } = req.params;
  const {
    fullName,
    dateOfBirth,
    address,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelationship,
    medicalConditions,
    currentMedications,
    allergies,
    previousInjuries,
    physicalLimitations,
    treatmentConsent,
    privacyPolicyConsent,
    communicationConsent,
    howDidYouHear,
    additionalNotes,
  } = req.body;

  // Validation
  if (!fullName || !dateOfBirth || !address || !emergencyContactName || 
      !emergencyContactPhone || !emergencyContactRelationship) {
    return res.status(400).json({ 
      message: 'All required fields must be completed.' 
    });
  }

  if (!treatmentConsent || !privacyPolicyConsent || !communicationConsent) {
    return res.status(400).json({ 
      message: 'All consent agreements must be accepted.' 
    });
  }

  const transaction = await require('../models').sequelize.transaction();

  try {
    // Find booking by token
    const booking = await Booking.findOne({
      where: { consentFormToken: token },
      include: [
        { model: Client, attributes: ['firstName', 'lastName', 'email', 'phone'] },
        { 
          model: ServiceOption, 
          include: [{ model: Service, attributes: ['name'] }],
          attributes: ['optionName', 'price', 'duration']
        }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Invalid or expired consent form link.' });
    }

    // Check if already completed
    const existingForm = await ConsentForm.findOne({ 
      where: { bookingId: booking.id }, 
      transaction 
    });
    if (existingForm) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Consent form has already been completed for this booking.' 
      });
    }

    // Create consent form record
    const consentForm = await ConsentForm.create({
      bookingId: booking.id,
      fullName,
      dateOfBirth,
      address,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      medicalConditions: medicalConditions || null,
      currentMedications: currentMedications || null,
      allergies: allergies || null,
      previousInjuries: previousInjuries || null,
      physicalLimitations: physicalLimitations || null,
      treatmentConsent,
      privacyPolicyConsent,
      communicationConsent,
      howDidYouHear: howDidYouHear || null,
      additionalNotes: additionalNotes || null,
      completedAt: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress
    }, { transaction });

    // Update booking status to Active and set completion timestamp
    await booking.update({
      status: 'Confirmed',
      consentFormCompletedAt: new Date()
    }, { transaction });

    // Commit transaction
    await transaction.commit();

    // Send booking details email (async)
    sendBookingDetailsEmail(booking, booking.Client, booking.ServiceOption, booking.ServiceOption.Service)
      .then(emailResult => {
        if (!emailResult.success) {
          console.error('Failed to send booking details email:', emailResult.error);
        }
      })
      .catch(error => {
        console.error('Error sending booking details email:', error);
      });

    res.json({
      success: true,
      message: 'Consent form submitted successfully. Your appointment is now confirmed!',
      bookingId: booking.id,
      bookingStatus: 'Active'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting consent form:', error);
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({ message: 'Validation Error', errors: messages });
    }
    
    res.status(500).json({ message: 'Server error while submitting consent form.' });
  }
};

// Get consent form details (for admin/staff)
exports.getConsentFormByBookingId = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const consentForm = await ConsentForm.findOne({
      where: { bookingId },
      include: [{
        model: Booking,
        as: 'booking',
        include: [
          { model: Client, attributes: ['firstName', 'lastName', 'email'] },
          { 
            model: ServiceOption, 
            include: [{ model: Service, attributes: ['name'] }],
            attributes: ['optionName']
          }
        ]
      }]
    });

    if (!consentForm) {
      return res.status(404).json({ message: 'Consent form not found for this booking.' });
    }

    res.json({
      success: true,
      consentForm
    });

  } catch (error) {
    console.error('Error fetching consent form:', error);
    res.status(500).json({ message: 'Server error while fetching consent form.' });
  }
};