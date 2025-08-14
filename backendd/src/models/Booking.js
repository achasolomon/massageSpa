const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Booking = sequelize.define("Booking", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
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
    allowNull: true,
    references: {
      model: "Therapists",
      key: "id",
    },
  },
  serviceOptionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "ServiceOptions",
      key: "id",
    },
  },
  bookingStartTime: {
    type: DataTypes.DATE, // Store full date and time
    allowNull: false,
  },
  bookingEndTime: {
    type: DataTypes.DATE, // Calculated based on start time and service duration
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(
      "Pending Confirmation", // Initial state after client books
      "Confirmed",
      "Completed",
      "Cancelled By Client",
      "Cancelled By Staff",
      "No Show"
    ),
    allowNull: false,
    defaultValue: "Pending Confirmation",
  },
  clientNotes: {
    type: DataTypes.TEXT, // Notes provided by the client during booking
    allowNull: true,
  },
  internalNotes: {
    type: DataTypes.TEXT, // Notes added by staff/admin
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.ENUM("Credit Card", "Insurance", "Cash", "Other"), // Added Cash/Other for manual bookings
    allowNull: true, // Might be null initially for insurance/manual
  },
  paymentStatus: {
    type: DataTypes.ENUM("Pending", "Paid", "Failed", "Refunded", "Not Applicable"),
    allowNull: false,
    defaultValue: "Pending",
  },
  // Store price at the time of booking in case service prices change
  priceAtBooking: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  // Track whether a reminder has been sent for this booking
  reminderSent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  consentFormToken: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true, // Ensure each token is unique
  },
  consentFormCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sessionStatus: {
    type: DataTypes.ENUM('scheduled', 'in-progress', 'completed', 'no-show', 'cancelled', 'rescheduled'),
    defaultValue: 'scheduled',
    allowNull: false,
  },
  noShowReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  noShowMarkedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  noShowMarkedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  // Optional: Link to a Payment record
  // paymentId: {
  //   type: DataTypes.UUID,
  //   allowNull: true,
  //   references: {
  //     model: 'Payments',
  //     key: 'id',
  //   },
  // },
}, {
  timestamps: true,
  // Add indexes for frequently queried columns
  indexes: [
    { fields: ["clientId"] },
    { fields: ["therapistId"] },
    { fields: ["status"] },
    { fields: ["reminderSent"] },
    { fields: ["consentFormToken"] },
    { fields: ["sessionStatus"] },
    { fields: ["noShowMarkedAt"] },
    { fields: ["bookingStartTime", "sessionStatus"] },
  ],

  hooks: {
    afterCreate: async (booking, options) => {
      // Set initial status based on booking time
      if (booking.bookingStartTime <= new Date()) {
        // If booking is in the past, it might need attention
        console.log(`Booking ${booking.id} created for past time, may need status review`);
      }
    },

    // Hook to update session status when clinical note is created
    afterUpdate: async (booking, options) => {
      if (booking.sessionStatus === 'scheduled' && booking.bookingStartTime <= new Date()) {
        // Could automatically mark as in-progress, but better to do this explicitly
        console.log(`Booking ${booking.id} may need status update`);
      }
    }
  }
});

Booking.prototype.canBeMarkedNoShow = function () {
  return this.sessionStatus === 'scheduled' && !this.ClinicalNote;
};

Booking.prototype.isOverdue = function () {
  return this.sessionStatus === 'scheduled' && new Date() > new Date(this.bookingStartTime);
};

Booking.prototype.getTimeSinceScheduled = function () {
  const now = new Date();
  const scheduledTime = new Date(this.bookingStartTime);
  return now - scheduledTime; // milliseconds
};


module.exports = Booking;
