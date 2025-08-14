const { Sequelize } = require("sequelize");
const sequelize = require("../config/database");

// Import all models (they're already defined with sequelize.define)
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
const Settings = require("./Settings");

// --- Define Associations ---

// User <-> Role (Many-to-One)
User.belongsTo(Role, { 
  foreignKey: "roleId",
  as: "role"
});
Role.hasMany(User, { 
  foreignKey: "roleId",
  as: "users"
});

// User <-> Therapist (One-to-One)
User.hasOne(Therapist, { 
  foreignKey: "userId",
  as: "therapist",
  onDelete: "CASCADE"
});
Therapist.belongsTo(User, { 
  foreignKey: "userId",
  as: "user"
});

// User <-> Client (One-to-One, Optional)
User.hasOne(Client, { 
  foreignKey: "userId",
  as: "client",
  onDelete: "SET NULL"
});
Client.belongsTo(User, { 
  foreignKey: "userId",
  as: "user"
});

// Service <-> ServiceOption (One-to-Many) - WITH PROPER ALIAS
Service.hasMany(ServiceOption, { 
  foreignKey: "serviceId",
  as: "serviceOptions", // This is the key alias that was missing!
  onDelete: "CASCADE"
});
ServiceOption.belongsTo(Service, { 
  foreignKey: "serviceId",
  as: "service"
});

// Service <-> ServiceAvailability (One-to-Many)
Service.hasMany(ServiceAvailability, { 
  foreignKey: "serviceId",
  as: "availabilities",
  onDelete: "CASCADE"
});
ServiceAvailability.belongsTo(Service, { 
  foreignKey: "serviceId",
  as: "service"
});

// ServiceOption <-> ServiceAvailability (One-to-Many)
ServiceOption.hasMany(ServiceAvailability, { 
  foreignKey: "serviceOptionId",
  as: "availabilities",
  onDelete: "CASCADE"
});
ServiceAvailability.belongsTo(ServiceOption, { 
  foreignKey: "serviceOptionId",
  as: "serviceOption"
});

// Therapist <-> ServiceAvailability (One-to-Many, optional)
Therapist.hasMany(ServiceAvailability, { 
  foreignKey: "therapistId",
  as: "availabilities",
  onDelete: "SET NULL"
});
ServiceAvailability.belongsTo(Therapist, { 
  foreignKey: "therapistId",
  as: "therapist"
});

// Therapist <-> Schedule (One-to-Many)
Therapist.hasMany(Schedule, { 
  foreignKey: "therapistId",
  as: "schedules",
  onDelete: "CASCADE"
});
Schedule.belongsTo(Therapist, { 
  foreignKey: "therapistId",
  as: "therapist"
});

// Client <-> Booking (One-to-Many)
Client.hasMany(Booking, { 
  foreignKey: "clientId",
  as: "bookings"
});
Booking.belongsTo(Client, { 
  foreignKey: "clientId",
  as: "client"
});

// ServiceOption <-> Booking (One-to-Many)
ServiceOption.hasMany(Booking, { 
  foreignKey: "serviceOptionId",
  as: "bookings"
});
Booking.belongsTo(ServiceOption, { 
  foreignKey: "serviceOptionId",
  as: "serviceOption"
});

// Therapist <-> Booking (One-to-Many)
Therapist.hasMany(Booking, { 
  foreignKey: "therapistId",
  as: "bookings"
});
Booking.belongsTo(Therapist, { 
  foreignKey: "therapistId",
  as: "therapist"
});

// User <-> Booking (for noShowMarkedBy)
User.hasMany(Booking, {
  foreignKey: 'noShowMarkedBy',
  as: 'markedNoShowBookings'
});
Booking.belongsTo(User, {
  foreignKey: 'noShowMarkedBy',
  as: 'noShowMarkedByUser'
});

// Booking <-> Payment (One-to-One)
Booking.hasOne(Payment, { 
  foreignKey: "bookingId",
  as: "payment",
  onDelete: "CASCADE"
});
Payment.belongsTo(Booking, { 
  foreignKey: "bookingId",
  as: "booking"
});

// ServiceOption <-> Payment (One-to-Many)
ServiceOption.hasMany(Payment, {
  foreignKey: "serviceOptionId",
  as: "payments"
});
Payment.belongsTo(ServiceOption, {
  foreignKey: "serviceOptionId",
  as: "serviceOption"
});

// Booking <-> ConsentForm (One-to-One)
Booking.hasOne(ConsentForm, { 
  foreignKey: "bookingId",
  as: "consentForm",
  onDelete: "CASCADE"
});
ConsentForm.belongsTo(Booking, { 
  foreignKey: "bookingId",
  as: "booking"
});

// Booking <-> ClinicalNote (One-to-One)
Booking.hasOne(ClinicalNote, { 
  foreignKey: "bookingId",
  as: "clinicalNote",
  onDelete: "CASCADE"
});
ClinicalNote.belongsTo(Booking, { 
  foreignKey: "bookingId",
  as: "booking"
});

// Client <-> ClinicalNote (One-to-Many)
Client.hasMany(ClinicalNote, { 
  foreignKey: "clientId",
  as: "clinicalNotes"
});
ClinicalNote.belongsTo(Client, { 
  foreignKey: "clientId",
  as: "client"
});

// Therapist <-> ClinicalNote (One-to-Many)
Therapist.hasMany(ClinicalNote, { 
  foreignKey: "therapistId",
  as: "clinicalNotes"
});
ClinicalNote.belongsTo(Therapist, { 
  foreignKey: "therapistId",
  as: "therapist"
});

// ClinicalNote <-> AnatomicalMarking (One-to-Many)
ClinicalNote.hasMany(AnatomicalMarking, { 
  foreignKey: "clinicalNoteId",
  as: "anatomicalMarkings",
  onDelete: "CASCADE"
});
AnatomicalMarking.belongsTo(ClinicalNote, { 
  foreignKey: "clinicalNoteId",
  as: "clinicalNote"
});

// Therapist <-> Service (Many-to-Many)
const TherapistServices = sequelize.define("TherapistServices", {
  therapistId: {
    type: Sequelize.DataTypes.UUID, // Fixed: Use UUID to match your model IDs
    primaryKey: true,
    references: {
      model: 'Therapists',
      key: 'id'
    }
  },
  serviceId: {
    type: Sequelize.DataTypes.UUID, // Fixed: Use UUID to match your model IDs
    primaryKey: true,
    references: {
      model: 'Services',
      key: 'id'
    }
  }
}, { 
  timestamps: false,
  tableName: 'therapist_services'
});

Therapist.belongsToMany(Service, { 
  through: TherapistServices,
  foreignKey: 'therapistId',
  otherKey: 'serviceId',
  as: 'services'
});
Service.belongsToMany(Therapist, { 
  through: TherapistServices,
  foreignKey: 'serviceId',
  otherKey: 'therapistId',
  as: 'therapists'
});

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
  ConsentForm,
  AnatomicalMarking,
  Settings,
  TherapistServices
};

module.exports = db;