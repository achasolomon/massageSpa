const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Settings = sequelize.define("Settings", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  companyAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  phoneNumber1: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phoneNumber2: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  supportEmail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  businessEmail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  themeColor: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  secondaryColor: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  favicon: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  timezone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  currencySymbol: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dateFormat: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  timeFormat: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bookingConfirmationRequired: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  autoAssignTherapist: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  emailNotificationsEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  smsNotificationsEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  cancellationPolicy: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  termsAndConditions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  privacyPolicy: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  socialMediaLinks: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  businessHours: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ["isActive"] },
  ],
});

module.exports = Settings;