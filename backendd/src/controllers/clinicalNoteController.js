const { ClinicalNote, Client, Booking, Therapist, User, AnatomicalMarking } = require("../models");
const { Op } = require("sequelize");
const sequelize = require('../config/database');

// Create a clinical note (Therapist only)
exports.createClinicalNote = async (req, res) => {
  const therapistUserId = req.user.id;
  const { bookingId, notes, subjective, objective, assessment, plan } = req.body;

  try {
    const therapist = await Therapist.findOne({ where: { userId: therapistUserId } });
    if (!therapist) {
      return res.status(404).json({ message: "Therapist profile not found." });
    }

    const booking = await Booking.findOne({ where: { id: bookingId } });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.therapistId !== therapist.id) {
      return res.status(403).json({ message: "You can only add notes for bookings assigned to you." });
    }

    const existingNote = await ClinicalNote.findOne({ where: { bookingId } });
    if (existingNote) {
      return res.status(400).json({ message: "A clinical note already exists for this booking." });
    }

    const newNote = await ClinicalNote.create({
      bookingId,
      clientId: booking.clientId,
      therapistId: therapist.id,
      subjective,
      objective,
      assessment,
      plan,
      notes
    });

    res.status(201).json(newNote);
  } catch (error) {
    console.error("Error creating clinical note:", error);
    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((err) => err.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server error while creating clinical note." });
  }
};

exports.createCompleteNote = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { clinicalNoteData, anatomicalMarkings } = req.body;

    // Validate required data
    if (!clinicalNoteData || !anatomicalMarkings) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Missing required data',
        details: 'Both clinicalNoteData and anatomicalMarkings are required'
      });
    }

    console.log('Creating clinical note with data:', clinicalNoteData);

    // FIXED: Ensure assessment validation before marking as completed
    if (!clinicalNoteData.assessment || clinicalNoteData.assessment.trim().length < 10) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Assessment is required and must be at least 10 characters to complete the session'
      });
    }

    // FIXED: Add completed status and timestamp to clinical note data
    const noteDataWithStatus = {
      ...clinicalNoteData,
      completed: true, // Mark as completed when using "Complete Session"
      completedAt: new Date()
    };

    console.log('Note data with completion status:', noteDataWithStatus);

    // 1. Create clinical note
    const note = await ClinicalNote.create(noteDataWithStatus, { transaction });
    console.log('Clinical note created:', note.id);

    // 2. Process anatomical markings
    const markingsArray = [];

    // Flatten markings from all views
    Object.entries(anatomicalMarkings).forEach(([view, viewMarkings]) => {
      if (Array.isArray(viewMarkings) && viewMarkings.length > 0) {
        viewMarkings.forEach(marking => {
          markingsArray.push({
            ...marking,
            clinicalNoteId: note.id,
            view: view,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });
      }
    });

    console.log('Processed markings array:', markingsArray.length, 'items');

    // 3. Create anatomical markings if any exist
    if (markingsArray.length > 0) {
      await AnatomicalMarking.bulkCreate(markingsArray, {
        transaction,
        validate: true
      });
      console.log('Anatomical markings created successfully');
    }

    await transaction.commit();
    console.log('Transaction committed successfully');

    return res.status(201).json({
      success: true,
      note: {
        id: note.id,
        ...note.dataValues
      },
      markingsCreated: markingsArray.length,
      completed: true,
      message: 'Clinical note completed successfully'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('--- Error Handler ---');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Full Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create clinical note',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// FIXED: Add new function to complete existing notes
exports.completeExistingNote = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    console.log('Completing note:', id, 'by user:', requestingUser.id);

    // Get the note first
    const note = await ClinicalNote.findByPk(id, { transaction });
    if (!note) {
      await transaction.rollback();
      return res.status(404).json({ message: "Clinical note not found." });
    }

    // Authorization check
    if (requestingUser.role === "therapist") {
      // For therapists, check if they own this note
      if (note.therapistId !== requestingUser.therapistId) {
        await transaction.rollback();
        return res.status(403).json({ message: "You can only complete notes you have written." });
      }
    }

    // Check if already completed
    if (note.completed) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: "Clinical note is already completed.",
        completedAt: note.completedAt 
      });
    }

    // Validate required fields before completion
    if (!note.assessment || note.assessment.trim().length < 10) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: "Cannot complete note: Assessment is required and must be at least 10 characters." 
      });
    }

    console.log('Validation passed, marking note as completed');

    // Mark as completed
    note.completed = true;
    note.completedAt = new Date();
    await note.save({ transaction });

    await transaction.commit();
    console.log('Note marked as completed successfully');

    return res.status(200).json({
      success: true,
      note: note,
      message: "Clinical note marked as completed successfully"
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error completing clinical note:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while completing clinical note.",
      error: error.message
    });
  }
};
// Get clinical note by booking ID (Therapist/Admin/Staff)
exports.getClinicalNoteByBookingId = async (req, res) => {
  const { bookingId } = req.params;
  const requestingUser = req.user;

  try {
    const note = await ClinicalNote.findOne({
      where: { bookingId },
      include: [
        { model: Booking, attributes: ["therapistId"] },
        { model: Therapist, include: [{ model: User, attributes: ["firstName", "lastName"] }] }
      ]
    });

    if (!note) {
      return res.status(404).json({ message: "Clinical note not found for this booking." });
    }

    // Authorization check
    if (requestingUser.role === "therapist") {
      const therapist = await Therapist.findOne({ where: { userId: requestingUser.id } });
      if (!therapist || note.Booking.therapistId !== therapist.id) {
        return res.status(403).json({ message: "You can only view notes for your bookings." });
      }
    }

    res.json(note);
  } catch (error) {
    console.error("Error fetching note by booking ID:", error);
    res.status(500).json({ message: "Server error while fetching clinical note." });
  }
};

// Update a clinical note (Therapist who created it, or Admin/Staff)
exports.updateClinicalNote = async (req, res) => {
  const { id } = req.params;
  const requestingUser = req.user;
  const { notes, subjective, objective, assessment, plan } = req.body;

  try {
    const note = await ClinicalNote.findByPk(id);
    if (!note) {
      return res.status(404).json({ message: "Clinical note not found." });
    }

    // Authorization check
    if (requestingUser.role === "therapist") {
      const therapist = await Therapist.findOne({ where: { userId: requestingUser.id } });
      if (!therapist || note.therapistId !== therapist.id) {
        return res.status(403).json({ message: "You can only update notes you have written." });
      }
    }

    // Update fields
    note.notes = notes ?? note.notes;
    note.subjective = subjective ?? note.subjective;
    note.objective = objective ?? note.objective;
    note.assessment = assessment ?? note.assessment;
    note.plan = plan ?? note.plan;

    await note.save();
    res.json(note);
  } catch (error) {
    console.error("Error updating clinical note:", error);
    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((err) => err.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server error while updating clinical note." });
  }
};

// get therapist clinica notes 
exports.getTherapistClinicalNotes = async (req, res) => {
  try {
    // FIXED: Get therapist ID properly
    let therapistId;
    
    if (req.user.role === 'therapist') {
      // For therapist users, get their therapist profile ID
      const therapist = await Therapist.findOne({ 
        where: { userId: req.user.id },
        attributes: ['id']
      });
      
      if (!therapist) {
        return res.status(404).json({ message: "Therapist profile not found." });
      }
      
      therapistId = therapist.id;
    } else {
      // For admin/staff, they might be querying specific therapist
      therapistId = req.query.therapistId || req.user.therapistId;
    }

    console.log('Fetching notes for therapist ID:', therapistId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { search, completed } = req.query;

    const where = { therapistId };
    
    // Handle completion filter properly
    if (completed !== undefined) {
      where.completed = completed === 'true';
      console.log('Filtering by completed status:', where.completed);
    }
    
    // Add search functionality
    if (search) {
      where[Op.or] = [
        { assessment: { [Op.like]: `%${search}%` } },
        { plan: { [Op.like]: `%${search}%` } },
        { generalNotes: { [Op.like]: `%${search}%` } },
        { subjective: { [Op.like]: `%${search}%` } },
        { objective: { [Op.like]: `%${search}%` } }
      ];
    }

    console.log('Therapist query filters:', where);

    const { count: total, rows: notes } = await ClinicalNote.findAndCountAll({
      where,
      include: [
        { 
          model: Booking, 
          attributes: ["bookingStartTime", "bookingEndTime", "id"],
          as: 'Booking'
        },
        { 
          model: Client, 
          include: [{ model: User, attributes: ["firstName", "lastName", "email"] }],
          as: 'Client'
        },
        { 
          model: Therapist, 
          include: [{ model: User, attributes: ["firstName", "lastName"] }],
          as: 'Therapist'
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    console.log(`Therapist found ${total} notes`);

    res.json({
      notes,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching therapist notes:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all clinical notes (Admin/Staff only)
exports.getAllClinicalNotes = async (req, res) => {
  const { therapistId, clientId, bookingId, page = 1, limit = 10, search, completed } = req.query;
  const offset = (page - 1) * limit;

  try {
    const where = {};
    
    // Handle completion filter properly
    if (completed !== undefined) {
      where.completed = completed === 'true';
      console.log('Admin filtering by completed status:', where.completed);
    }
    
    if (therapistId) where.therapistId = therapistId;
    if (clientId) where.clientId = clientId;
    if (bookingId) where.bookingId = bookingId;
    
    // Add search functionality
    if (search) {
      where[Op.or] = [
        { assessment: { [Op.like]: `%${search}%` } },
        { plan: { [Op.like]: `%${search}%` } },
        { generalNotes: { [Op.like]: `%${search}%` } },
        { subjective: { [Op.like]: `%${search}%` } },
        { objective: { [Op.like]: `%${search}%` } }
      ];
    }

    console.log('Admin query filters:', where);

    const { count, rows } = await ClinicalNote.findAndCountAll({
      where,
      include: [
        { 
          model: Booking, 
          attributes: ["bookingStartTime", "bookingEndTime", "id"],
          as: 'Booking'
        },
        { 
          model: Therapist, 
          include: [{ model: User, attributes: ["firstName", "lastName"] }],
          as: 'Therapist'
        },
        { 
          model: Client, 
          include: [{ model: User, attributes: ["firstName", "lastName", "email"] }],
          as: 'Client'
        }
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: offset
    });

    console.log(`Admin found ${count} notes with filters:`, where);

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      notes: rows
    });
  } catch (error) {
    console.error("Error fetching clinical notes:", error);
    res.status(500).json({ 
      message: "Server error while fetching clinical notes.",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get a specific clinical note by ID (Admin/Staff)
exports.getClinicalNoteById = async (req, res) => {
  const { id } = req.params;

  try {
    const note = await ClinicalNote.findByPk(id, {
      include: [
        { 
          model: Booking, 
          attributes: ["bookingStartTime", "bookingEndTime"],
          as: 'Booking'
        },
        { 
          model: Therapist, 
          include: [{ model: User, attributes: ["firstName", "lastName"] }],
          as: 'Therapist'
        },
        { 
          model: Client, 
          include: [{ model: User, attributes: ["firstName", "lastName"] }],
          as: 'Client'
        }
      ]
    });

    if (!note) {
      return res.status(404).json({ message: "Clinical note not found." });
    }

    // FIXED: Permission check - therapists can view notes assigned to them
    if (req.user.role === 'therapist') {
      // Check if this note is assigned to the requesting therapist
      const therapist = await Therapist.findOne({ where: { userId: req.user.id } });
      if (!therapist || note.therapistId !== therapist.id) {
        return res.status(403).json({ message: "You can only view notes assigned to you." });
      }
    }

    res.json(note);
  } catch (error) {
    console.error("Error fetching clinical note by ID:", error);
    res.status(500).json({ message: "Server error while fetching clinical note." });
  }
};

// Real-time save endpoint
exports.autoSaveClinicalNote = async (req, res) => {
  const { id } = req.params;
  const requestingUser = req.user;
  const { objective, assessment, plan, generalNotes } = req.body;

  try {
    const note = await ClinicalNote.findByPk(id);
    if (!note) {
      return res.status(404).json({ message: "Clinical note not found." });
    }

    // Authorization check
    if (requestingUser.role === "therapist") {
      const therapist = await Therapist.findOne({ where: { userId: requestingUser.id } });
      if (!therapist || note.therapistId !== therapist.id) {
        return res.status(403).json({ message: "You can only update notes you have written." });
      }
    }

    // Update fields
    note.objective = objective ?? note.objective;
    note.assessment = assessment ?? note.assessment;
    note.plan = plan ?? note.plan;
    note.generalNotes = generalNotes ?? note.generalNotes;

    await note.save();

    // Return minimal data for real-time updates
    res.json({
      success: true,
      updatedAt: note.updatedAt
    });
  } catch (error) {
    console.error("Error auto-saving clinical note:", error);
    res.status(500).json({
      success: false,
      message: "Server error while auto-saving clinical note."
    });
  }
};

// Delete a clinical note (Admin only)
exports.deleteClinicalNote = async (req, res) => {
  const { id } = req.params;

  try {
    const note = await ClinicalNote.findByPk(id);
    if (!note) {
      return res.status(404).json({ message: "Clinical note not found." });
    }

    await note.destroy();
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting clinical note:", error);
    res.status(500).json({ message: "Server error while deleting clinical note." });
  }
};