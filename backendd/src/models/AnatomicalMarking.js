const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AnatomicalMarking = sequelize.define("AnatomicalMarking", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  clinicalNoteId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  x: DataTypes.FLOAT,
  y: DataTypes.FLOAT,
  view: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['anterior', 'posterior', 'lateral_left', 'lateral_right', 'skeletal']]
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['pain', 'tension', 'injury', 'treatment', 'improvement', 'sensitive', 'trigger', 'note']]
    }
  },
  description: DataTypes.TEXT,
  notes: DataTypes.TEXT,
  intensity: {
    type: DataTypes.INTEGER,
    validate: { min: 1, max: 4 }
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: "#FF0000"
  },
  size: {
    type: DataTypes.INTEGER,
    defaultValue: 16
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ["clinicalNoteId"] },
    { fields: ["view"] },
    { fields: ["type"] }
  ]
});

module.exports = AnatomicalMarking;