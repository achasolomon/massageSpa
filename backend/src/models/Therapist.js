const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Therapist = sequelize.define("Therapist", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Link to the User model for login credentials and basic info
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // Each therapist corresponds to one user account
    references: {
      model: "Users",
      key: "id",
    },
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // specialties: {
  //   type: DataTypes.ARRAY(DataTypes.STRING), // List of specialties
  //   allowNull: true,
  // },
  // In your Therapist model
specialties: {
  type: DataTypes.JSON,
  allowNull: true,
  defaultValue: []
},
  yearsOfExperience: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  profilePictureUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true, // Therapists are active by default
  },
  // Add other therapist-specific fields as needed
}, {
  timestamps: true,
});

// Define associations later in a dedicated associations file or after all models are defined
// Example: Therapist.belongsTo(User, { foreignKey: 'userId' });
// Example: Therapist.belongsToMany(Service, { through: 'TherapistServices' });

module.exports = Therapist;

