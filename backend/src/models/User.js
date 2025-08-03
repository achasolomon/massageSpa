const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcrypt");
const config = require("../config");

const User = sequelize.define("User", {
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
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true, // Or false depending on requirements
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Roles", // This assumes a 'Roles' table/model exists
      key: "id",
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // Add other fields as needed, e.g., profilePictureUrl
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, config.bcryptSaltRounds);
      }
    },
    beforeUpdate: async (user) => {
      // Hash password only if it has been changed
      if (user.changed("password")) {
        user.password = await bcrypt.hash(user.password, config.bcryptSaltRounds);
      }
    },
  },
});

// Instance method to compare passwords
User.prototype.isValidPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;

