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
      { fields: ["bookingStartTime"] },
      { fields: ["status"] },
      { fields: ["reminderSent"] }, 
      { fields: ["consentFormToken"] },
    ],
  });

  module.exports = Booking;
