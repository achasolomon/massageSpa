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
  // Ensure notes are securely handled and access is restricted
}, {
  timestamps: true, // Track when the note was created/updated
  indexes: [
    { fields: ["bookingId"] },
    { fields: ["clientId"] },
    { fields: ["therapistId"] },
  ],
});

module.exports = ClinicalNote;

