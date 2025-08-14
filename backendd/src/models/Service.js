const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Service = sequelize.define("Service", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true, 
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
imageUrl: {
  type: DataTypes.STRING,
  // validate: { isUrl: true }
  validate: {
    isCustomUrl(value) {
      if (value && !/^https?:\/\/.+/.test(value)) {
        throw new Error("Image URL must be a valid URL");
      }
    }
  }
},
  imagePublicId: {
    type: DataTypes.STRING,
    allowNull: true 
  },
}, {
  timestamps: true,
});

module.exports = Service;

