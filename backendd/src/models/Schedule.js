const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Schedule = sequelize.define("Schedule", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  therapistId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Therapists",
      key: "id",
    },
  },
  // Simplified types: base availability or time off
  type: {
    type: DataTypes.ENUM("WorkingHours", "TimeOff"),
    allowNull: false,
    defaultValue: "WorkingHours"
  },
  // Day of week for recurring patterns (0 = Sunday, 6 = Saturday)
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: true, // Null for specific date entries
    validate: {
      min: 0,
      max: 6
    }
  },
  // For specific date entries (holidays, special time off)
  specificDate: {
    type: DataTypes.DATEONLY,
    allowNull: true, // Null for recurring entries
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  // When this schedule rule becomes effective
  effectiveFrom: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  // When this schedule rule expires (null = indefinite)
  effectiveTo: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  // Active status for quick enable/disable
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ["therapistId", "dayOfWeek", "isActive"] },
    { fields: ["therapistId", "specificDate", "isActive"] },
    { fields: ["therapistId", "type", "isActive"] },
    { fields: ["effectiveFrom", "effectiveTo"] },
  ],
  validate: {
    // Ensure either dayOfWeek or specificDate is set, not both
    dateOrRecurring() {
      const hasSpecificDate = this.specificDate !== null;
      const hasDayOfWeek = this.dayOfWeek !== null;
      
      if (hasSpecificDate && hasDayOfWeek) {
        throw new Error('Cannot specify both specificDate and dayOfWeek');
      }
      
      if (!hasSpecificDate && !hasDayOfWeek) {
        throw new Error('Must specify either specificDate or dayOfWeek');
      }
    },
    
    // Ensure start time is before end time
    timeRange() {
      if (this.startTime >= this.endTime) {
        throw new Error('End time must be after start time');
      }
    },
    
    // Ensure effective dates are logical
    effectiveDateRange() {
      if (this.effectiveFrom && this.effectiveTo && this.effectiveFrom > this.effectiveTo) {
        throw new Error('Effective end date must be after start date');
      }
    }
  }
});

module.exports = Schedule;