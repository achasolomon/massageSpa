const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ClinicalNote = sequelize.define("ClinicalNote", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // Typically one note per booking session
    references: {
      model: "Bookings",
      key: "id",
    },
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Clients",
      key: "id",
    },
  },
  therapistId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Therapists",
      key: "id",
    },
  },
  completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  // ADDED: Track when note was completed
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  subjective: {
    type: DataTypes.TEXT, // What the client reports
    allowNull: true,
  },
  objective: {
    type: DataTypes.TEXT, // Therapist's objective findings (palpation, ROM, etc.)
    allowNull: true,
  },
  assessment: {
    type: DataTypes.TEXT, // Therapist's professional judgment
    allowNull: true,
    // FIXED: Add validation for completion
    validate: {
      requiredForCompletion(value) {
        // Only validate assessment if note is being marked as completed
        if (this.completed && (!value || value.trim().length < 10)) {
          throw new Error('Assessment is required and must be at least 10 characters when completing a note');
        }
      }
    }
  },
  plan: {
    type: DataTypes.TEXT, // Treatment provided and future plan
    allowNull: true,
  },
  // General notes field if SOAP format isn't strictly enforced or for additional info
  generalNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // ADDED: Notes field for backward compatibility
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true, 
  indexes: [
    { fields: ["bookingId"] },
    { fields: ["clientId"] },
    { fields: ["therapistId"] },
    { fields: ["completed"] }, 
    { fields: ["completedAt"] }, 
  ],
  // Model-level validation
  validate: {
    completedNotesValidation() {
      if (this.completed) {
        if (!this.assessment || this.assessment.trim().length < 10) {
          throw new Error('Completed clinical notes must have a valid assessment of at least 10 characters');
        }
      }
    }
  },

  hooks: {
    beforeUpdate: (clinicalNote, options) => {
      // Automatically set completedAt when marked as completed
      if (clinicalNote.completed && !clinicalNote.completedAt) {
        clinicalNote.completedAt = new Date();
      }
      // Clear completedAt if unmarked as completed
      if (!clinicalNote.completed && clinicalNote.completedAt) {
        clinicalNote.completedAt = null;
      }
    },
    beforeCreate: (clinicalNote, options) => {
      // Set completedAt if creating as completed
      if (clinicalNote.completed && !clinicalNote.completedAt) {
        clinicalNote.completedAt = new Date();
      }
    },
    beforeSave: (clinicalNote, options) => {
      // Validate assessment before saving if completed
      if (clinicalNote.completed && (!clinicalNote.assessment || clinicalNote.assessment.trim().length < 10)) {
        throw new Error('Assessment is required and must be at least 10 characters when completing a note');
      }
    }
  }
});

module.exports = ClinicalNote;