const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ServiceOption = sequelize.define("ServiceOption", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  serviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Services", // Name of the table
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in minutes
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  optionName: {
      type: DataTypes.STRING,
      allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

module.exports = ServiceOption;

