const { Booking, ClinicalNote, Client, Therapist, User, ServiceOption, Service } = require('../models');
const { Op } = require('sequelize');

// Get ready sessions
const getReadySessionsUpdated = async (req, res) => {
  try {
    console.log('Fetching ready sessions...');
    const { therapistId, limit = 100 } = req.query;
    
    const where = {
      status: 'Confirmed',
      paymentStatus: 'Paid',
      sessionStatus: { [Op.in]: ['scheduled', 'in-progress'] }
    };

    if (therapistId) {
      where.therapistId = therapistId;
    }

    // For therapists, only show their sessions
    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ 
        where: { userId: req.user.id },
        include: [{ 
          model: User, 
          as: 'user' // FIXED: Added alias
        }]
      });
      if (therapist) {
        where.therapistId = therapist.id;
      } else {
        return res.json({ success: true, sessions: [] });
      }
    }

    console.log('Query where:', where);

    const sessions = await Booking.findAll({
      where,
      include: [
        { 
          model: Client, 
          as: 'client', // FIXED: Added alias
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        { 
          model: Therapist, 
          as: 'therapist', // FIXED: Added alias
          include: [{ 
            model: User, 
            as: 'user', // FIXED: Added alias
            attributes: ['firstName', 'lastName'],
            required: false 
          }],
          required: false
        },
        {
          model: ClinicalNote,
          as: 'clinicalNote', // FIXED: Added alias
          required: false
        },
        {
          model: ServiceOption,
          as: 'serviceOption', // FIXED: Added alias
          include: [{ 
            model: Service, 
            as: 'service', // FIXED: Added alias
            attributes: ['name'],
            required: false 
          }],
          required: false
        }
      ],
      order: [['bookingStartTime', 'ASC']],
      limit: parseInt(limit)
    });

    console.log(`Found ${sessions.length} ready sessions`);

    res.json({
      success: true,
      sessions
    });

  } catch (error) {
    console.error('Error fetching ready sessions:', error);
    res.status(500).json({ 
      message: 'Failed to fetch ready sessions',
      error: error.message 
    });
  }
};


// Get sessions needing attention
const getSessionsNeedingAttention = async (req, res) => {
  try {
    console.log('Fetching sessions needing attention...');
    const { page = 1, limit = 20, therapistId } = req.query;
    const offset = (page - 1) * limit;

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const where = {
      status: 'Confirmed',
      paymentStatus: 'Paid',
      sessionStatus: 'scheduled',
      bookingStartTime: { [Op.lt]: thirtyMinutesAgo }
    };

    if (therapistId) {
      where.therapistId = therapistId;
    }

    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ 
        where: { userId: req.user.id },
        include: [{ 
          model: User, 
          as: 'user' // FIXED: Added alias
        }]
      });
      if (therapist) {
        where.therapistId = therapist.id;
      } else {
        return res.json({ total: 0, sessions: [] });
      }
    }

    console.log('Attention query where:', where);

    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: [
        { 
          model: Client, 
          as: 'client', // FIXED: Added alias
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        { 
          model: Therapist, 
          as: 'therapist', // FIXED: Added alias
          include: [{ 
            model: User, 
            as: 'user', // FIXED: Added alias
            attributes: ['firstName', 'lastName'],
            required: false 
          }],
          required: false
        },
        {
          model: ClinicalNote,
          as: 'clinicalNote', // FIXED: Added alias
          required: false
        }
      ],
      order: [['bookingStartTime', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Filter out sessions with completed notes
    const filteredRows = rows.filter(session => 
      !session.clinicalNote || !session.clinicalNote.completed // FIXED: Updated property access
    );

    console.log(`Found ${filteredRows.length} sessions needing attention`);

    res.json({
      total: filteredRows.length,
      page: parseInt(page),
      limit: parseInt(limit),
      sessions: filteredRows
    });

  } catch (error) {
    console.error('Error fetching sessions needing attention:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sessions needing attention',
      error: error.message 
    });
  }
};

// Mark session as no-show
const markAsNoShow = async (req, res) => {
  try {
    console.log('Marking session as no-show...');
    const { bookingId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check permissions
    if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
      if (!therapist || booking.therapistId !== therapist.id) {
        return res.status(403).json({ message: 'You can only mark no-shows for your assigned sessions' });
      }
    }

    // Check if there's already a clinical note
    const existingNote = await ClinicalNote.findOne({ where: { bookingId } });
    if (existingNote) {
      return res.status(400).json({ message: 'Cannot mark as no-show: Clinical note already exists' });
    }

    // Update booking with no-show information
    await booking.update({
      sessionStatus: 'no-show',
      noShowReason: reason || 'Client did not attend the session',
      noShowMarkedAt: new Date(),
      noShowMarkedBy: userId
    });

    console.log('Session marked as no-show successfully');

    res.json({
      success: true,
      message: 'Session marked as no-show successfully',
      booking: {
        id: booking.id,
        sessionStatus: booking.sessionStatus,
        noShowReason: booking.noShowReason,
        noShowMarkedAt: booking.noShowMarkedAt
      }
    });

  } catch (error) {
    console.error('Error marking session as no-show:', error);
    res.status(500).json({ 
      message: 'Failed to mark session as no-show',
      error: error.message 
    });
  }
};

// Reverse no-show
const reverseNoShow = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can reverse no-show status' });
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.sessionStatus !== 'no-show') {
      return res.status(400).json({ message: 'Session is not marked as no-show' });
    }

    await booking.update({
      sessionStatus: 'scheduled',
      noShowReason: null,
      noShowMarkedAt: null,
      noShowMarkedBy: null
    });

    res.json({
      success: true,
      message: 'No-show status reversed successfully'
    });

  } catch (error) {
    console.error('Error reversing no-show:', error);
    res.status(500).json({ 
      message: 'Failed to reverse no-show status',
      error: error.message 
    });
  }
};

// Get therapist profile
const getTherapistProfile = async (req, res) => {
  try {
    console.log('Getting therapist profile for user:', req.user.id);
    
    const therapist = await Therapist.findOne({
      where: { userId: req.user.id },
      include: [{ 
        model: User, 
        as: 'user', // FIXED: Added alias
        attributes: ['firstName', 'lastName', 'email'],
        required: false
      }]
    });

    if (!therapist) {
      console.log('Therapist profile not found');
      return res.status(404).json({ message: 'Therapist profile not found' });
    }

    console.log('Therapist profile found:', therapist.id);

    res.json({
      success: true,
      id: therapist.id,
      userId: therapist.userId,
      user: therapist.user // FIXED: Updated property access
    });

  } catch (error) {
    console.error('Error fetching therapist profile:', error);
    res.status(500).json({ 
      message: 'Failed to fetch therapist profile',
      error: error.message 
    });
  }
};

module.exports = {
  markAsNoShow,
  getSessionsNeedingAttention,
  reverseNoShow,
  getReadySessionsUpdated,
  getTherapistProfile
};