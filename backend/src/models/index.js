const { Sequelize } = require("sequelize");
const sequelize = require("../config/database");

// Import all models
const User = require("./User");
const Role = require("./Role");
const Client = require("./Client");
const Therapist = require("./Therapist");
const Service = require("./Service");
const ServiceOption = require("./ServiceOption");
const ServiceAvailability = require("./ServiceAvailability");
const Booking = require("./Booking");
const Schedule = require("./Schedule");
const Payment = require("./Payment");
const ClinicalNote = require("./ClinicalNote");
const ConsentForm = require("./ConsentForm");
const AnatomicalMarking = require("./AnatomicalMarking");
const Settings = require("./Settings")

// --- Define Associations ---

// User <-> Role (One-to-Many)
Role.hasMany(User, { 
  foreignKey: {
    name: "roleId",
    allowNull: false // MySQL often prefers explicit nullability
  } 
});
User.belongsTo(Role, { 
  foreignKey: "roleId" 
});

// Therapist <-> User (One-to-One)
User.hasOne(Therapist, { 
  foreignKey: {
    name: "userId",
    onDelete: "CASCADE"
  } 
});
Therapist.belongsTo(User, { 
  foreignKey: "userId" 
});

// Client <-> User (One-to-One, Optional)
User.hasOne(Client, { 
  foreignKey: {
    name: 'userId',
    onDelete: 'SET NULL'
  },
  constraints: false // Important for MySQL with SET NULL
});
Client.belongsTo(User, { 
  foreignKey: 'userId',
  constraints: false 
});

// Service <-> ServiceOption (One-to-Many)
Service.hasMany(ServiceOption, { 
  foreignKey: {
    name: "serviceId",
    onDelete: "CASCADE"
  } 
});
ServiceOption.belongsTo(Service, { 
  foreignKey: "serviceId" 
});

// Service <-> ServiceAvailability (One-to-Many)
Service.hasMany(ServiceAvailability, { 
  foreignKey: {
    name: "serviceId",
    onDelete: "CASCADE"
  } 
});
ServiceAvailability.belongsTo(Service, { 
  foreignKey: "serviceId" 
});

// Therapist <-> ServiceAvailability (One-to-Many, optional)
Therapist.hasMany(ServiceAvailability, { 
  foreignKey: {
    name: "therapistId",
    onDelete: "CASCADE"
  } 
});
ServiceAvailability.belongsTo(Therapist, { 
  foreignKey: {
    name: "therapistId",
    allowNull: true
  } 
});

// Booking <-> Client (Many-to-One)
Client.hasMany(Booking, { 
  foreignKey: "clientId" 
});
Booking.belongsTo(Client, { 
  foreignKey: "clientId" 
});

// Booking <-> ServiceOption (Many-to-One)
ServiceOption.hasMany(Booking, { 
  foreignKey: "serviceOptionId" 
});

Booking.belongsTo(ServiceOption, { 
  foreignKey: "serviceOptionId" 
});

// Booking <-> Service (Many-to-One)
Service.hasMany(Booking, { 
  foreignKey: "serviceId" 
});
Booking.belongsTo(Service, { 
  foreignKey: "serviceId" 
});

// Booking <-> Therapist (Many-to-One)
Therapist.hasMany(Booking, { 
  foreignKey: "therapistId" 
});
Booking.belongsTo(Therapist, { 
  foreignKey: {
    name: "therapistId",
    allowNull: true
  } 
});

// Booking <-> Payment (One-to-One)
Booking.hasOne(Payment, { 
  foreignKey: {
    name: "bookingId",
    onDelete: "CASCADE"
  } 
});
Payment.belongsTo(Booking, { 
  foreignKey: "bookingId" 
});

// Booking <-> ClinicalNote (One-to-One)
Booking.hasOne(ClinicalNote, { 
  foreignKey: {
    name: "bookingId",
    onDelete: "CASCADE"
  } 
});
ClinicalNote.belongsTo(Booking, { 
  foreignKey: "bookingId" 
});

// ClinicalNote <-> Client (Many-to-One)
Client.hasMany(ClinicalNote, { 
  foreignKey: "clientId" 
});
ClinicalNote.belongsTo(Client, { 
  foreignKey: "clientId" 
});

// ClinicalNote <-> Therapist (Many-to-One)
Therapist.hasMany(ClinicalNote, { 
  foreignKey: "therapistId" 
});
ClinicalNote.belongsTo(Therapist, { 
  foreignKey: "therapistId" 
});

// Therapist <-> Schedule (One-to-Many)
Therapist.hasMany(Schedule, { 
  foreignKey: {
    name: "therapistId",
    onDelete: "CASCADE"
  } 
});
Schedule.belongsTo(Therapist, { 
  foreignKey: "therapistId" 
});

// Therapist <-> Service (Many-to-Many)
const TherapistServices = sequelize.define("TherapistServices", {
  // Explicitly define columns for MySQL compatibility
  therapistId: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    references: {
      model: 'Therapists',
      key: 'id'
    }
  },
  serviceId: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    references: {
      model: 'Services',
      key: 'id'
    }
  }
}, { 
  timestamps: false,
  tableName: 'therapist_services' // MySQL prefers snake_case for table names
});

Therapist.belongsToMany(Service, { 
  through: TherapistServices,
  foreignKey: 'therapistId',
  otherKey: 'serviceId'
});
Service.belongsToMany(Therapist, { 
  through: TherapistServices,
  foreignKey: 'serviceId',
  otherKey: 'therapistId'
});

// ConsentForm <-> Booking (One-to-One)
Booking.hasOne(ConsentForm, { 
  foreignKey: {
    name: "bookingId",
    onDelete: "CASCADE"
  },
  as: "consentForm" 
});
ConsentForm.belongsTo(Booking, { 
  foreignKey: "bookingId",
  as: "booking" 
});

// ServiceAvailability <-> ServiceOption
ServiceOption.hasMany(ServiceAvailability, { 
  foreignKey: 'serviceOptionId' 
});
ServiceAvailability.belongsTo(ServiceOption, { 
  foreignKey: 'serviceOptionId' 
});

// Anatomical Marking associations
ClinicalNote.hasMany(AnatomicalMarking, { 
  foreignKey: {
    name: 'clinicalNoteId',
    allowNull: false
  },
  as: 'anatomicalMarkings' 
});
AnatomicalMarking.belongsTo(ClinicalNote, { 
  foreignKey: 'clinicalNoteId',
  as: 'clinicalNote' 
});

Therapist.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Therapist, { foreignKey: 'userId' });

Schedule.belongsTo(Therapist, { foreignKey: 'therapistId' });
Therapist.hasMany(Schedule, { foreignKey: 'therapistId' });


// --- Export Models and Sequelize Instance ---
const db = {
  sequelize,
  Sequelize,
  User,
  Role,
  Client,
  Therapist,
  Service,
  ServiceOption,
  ServiceAvailability,
  Booking,
  Schedule,
  Payment,
  ClinicalNote,
  TherapistServices,
  ConsentForm,
  AnatomicalMarking,
  Settings,
};

module.exports = db;