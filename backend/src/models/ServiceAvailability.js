const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// This model defines specific time slots when a service is available,
// potentially tied to a specific therapist, and includes a booking limit for that slot.
const ServiceAvailability = sequelize.define("ServiceAvailability", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  serviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Services",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  therapistId: {
    type: DataTypes.UUID,
    allowNull: true, // If null, applies to any therapist offering the service
    references: {
      model: "Therapists",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL", // Or CASCADE if availability should be removed if therapist is deleted
  },
  serviceOptionId: {
  type: DataTypes.UUID,
  allowNull: false,
  references: {
    model: "ServiceOptions", // or the actual table name for your options
    key: "id",
  },
  onUpdate: "CASCADE",
  onDelete: "CASCADE",
},
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: true, // 0=Sunday, 1=Monday, ..., 6=Saturday. Null if specificDate is set.
    validate: {
      min: 0,
      max: 6,
    },
  },
  specificDate: {
    type: DataTypes.DATEONLY, // Format: YYYY-MM-DD. For overrides or specific date availability.
    allowNull: true,
  },
  startTime: {
    type: DataTypes.TIME, // Format: HH:MM:SS or HH:MM
    allowNull: false,
    comment: "The specific start time for this availability slot (e.g., 09:00)",
  },
  // Removed endTime, as duration comes from ServiceOption
  bookingLimit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1, // Default to 1 booking per slot unless specified otherwise
    validate: {
      min: 1,
    },
    comment: "Maximum number of bookings allowed for this specific time slot.",
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ["serviceId"] },
    { fields: ["therapistId"] },
    { fields: ["dayOfWeek"] },
    { fields: ["specificDate"] },
    { fields: ["startTime"] },
    // Composite index for efficient availability lookup
    { fields: ["serviceId", "dayOfWeek", "startTime"] },
    { fields: ["serviceId", "specificDate", "startTime"] },
    { fields: ["therapistId", "dayOfWeek", "startTime"] },
    { fields: ["therapistId", "specificDate", "startTime"] },
  ],
  validate: {
    dayOrDateRequired() {
      if (this.dayOfWeek === null && this.specificDate === null) {
        throw new Error("Either dayOfWeek or specificDate must be set for availability.");
      }
      if (this.dayOfWeek !== null && this.specificDate !== null) {
        throw new Error("Cannot set both dayOfWeek and specificDate; use specificDate for overrides.");
      }
    }
  }
});

module.exports = ServiceAvailability;

