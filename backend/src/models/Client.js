const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Client = sequelize.define("Client", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Ensure unique email for clients
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false, // Typically required for booking communication
  },
  // Optional: Link to a User account if clients can register/login
  // userId: {
  //   type: DataTypes.UUID,
  //   allowNull: true,
  //   references: {
  //     model: 'Users',
  //     key: 'id',
  //   },
  // },
  address: {
    type: DataTypes.STRING, // Simple address field, could be expanded
    allowNull: true,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  // Store preferences, allergies, or other notes relevant to the client
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true, // Track when client record was created/updated
});

module.exports = Client;

