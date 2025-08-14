const { DataTypes } = require('sequelize');
const sequelize = require("../config/database");


  const ConsentForm = sequelize.define('ConsentForm', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Bookings',
        key: 'id',
      },
    },
    // Personal Information
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    emergencyContactName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    emergencyContactPhone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    emergencyContactRelationship: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    
    // Medical Information
    medicalConditions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    currentMedications: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    previousInjuries: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    physicalLimitations: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    
    // Consent Agreements
    treatmentConsent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    privacyPolicyConsent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    communicationConsent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    
    // Additional Information
    howDidYouHear: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    additionalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    
    // Form completion
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'consent_forms',
    timestamps: true,

    indexes: [
    { fields: ["bookingId"] },
  ]
  });
 

module.exports = ConsentForm;