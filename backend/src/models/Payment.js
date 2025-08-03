const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Payment = sequelize.define("Payment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: "Bookings",
      key: "id",
    },
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3), // e.g., "USD", "CAD", "EUR"
    allowNull: false,
    defaultValue: "CAD", // Changed from USD to CAD for Canadian clinic
  },
  method: {
    type: DataTypes.ENUM("Credit Card", "Insurance", "Cash", "Interac", "Other"),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(
      "Pending", 
      "Succeeded", 
      "Failed", 
      "Refunded", 
      "Partially Refunded",
      "Cancelled",
      "Disputed"
    ),
    allowNull: false,
    defaultValue: "Pending",
  },
  
  // External transaction ID (Stripe Payment Intent ID, Charge ID, etc.)
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  
  // Stripe-specific fields (added to your existing structure)
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Stripe Payment Intent ID'
  },
  
  stripePaymentMethodId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Payment Method ID'
  },
  
  stripeChargeId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Charge ID (for refunds and disputes)'
  },
  
  // Store details from the payment provider
  providerDetails: {
    type: DataTypes.JSON, // Your existing field - perfect for storing Stripe response data
    allowNull: true,
  },
  
  // Insurance specific fields (your existing fields)
  insuranceProvider: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  insurancePolicyId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  
  // Additional insurance fields
  insuranceClaimNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Insurance claim reference number'
  },
  
  // Refund tracking
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
    comment: 'Total amount refunded'
  },
  
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When refund was processed'
  },
  
  // Dispute handling
  disputeId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe dispute ID'
  },
  
  disputeReason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reason for dispute'
  },
  
  // Failure tracking
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for payment failure'
  },
  
  // Your existing field
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true, // Set when payment status becomes Succeeded
  },
  
  // Additional tracking fields
  clientEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Client email for tracking purposes'
  },
  
  serviceOptionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'ServiceOptions',
      key: 'id'
    },
    onDelete: 'SET NULL'
  }
}, {
  timestamps: true, // Your existing timestamps
  indexes: [
    { fields: ["bookingId"] },
    { fields: ["transactionId"] },
    { fields: ["status"] },
    // Additional indexes for Stripe fields
    { fields: ["stripePaymentIntentId"] },
    { fields: ["stripeChargeId"] },
    { fields: ["method"] },
    { fields: ["paidAt"] },
    { fields: ["clientEmail"] }
  ],
  
  // Instance methods
  instanceMethods: {
    // Check if payment is completed
    isCompleted() {
      return this.status === 'Succeeded';
    },
    
    // Check if payment is refunded (fully or partially)
    isRefunded() {
      return ['Refunded', 'Partially Refunded'].includes(this.status);
    },
    
    // Get remaining refundable amount
    getRefundableAmount() {
      return parseFloat(this.amount) - parseFloat(this.refundAmount || 0);
    },
    
    // Get amount in cents for Stripe API
    getAmountInCents() {
      return Math.round(parseFloat(this.amount) * 100);
    }
  }
});

// Association methods
Payment.associate = function(models) {
  // Your existing association
  Payment.belongsTo(models.Booking, {
    foreignKey: 'bookingId',
    as: 'Booking',
    allowNull: true
  });
  
  // New association with ServiceOption
  Payment.belongsTo(models.ServiceOption, {
    foreignKey: 'serviceOptionId',
    as: 'ServiceOption'
  });
};

// Static methods for common queries
Payment.getSuccessfulPayments = function(startDate, endDate) {
  const whereClause = {
    status: 'Succeeded'
  };
  
  if (startDate && endDate) {
    whereClause.paidAt = {
      [DataTypes.Op.between]: [startDate, endDate]
    };
  }
  
  return this.findAll({
    where: whereClause,
    include: ['Booking', 'ServiceOption'],
    order: [['paidAt', 'DESC']]
  });
};

Payment.getTotalRevenue = async function(startDate, endDate) {
  const whereClause = {
    status: 'Succeeded'
  };
  
  if (startDate && endDate) {
    whereClause.paidAt = {
      [DataTypes.Op.between]: [startDate, endDate]
    };
  }
  
  const result = await this.findAll({
    where: whereClause,
    attributes: [
      [DataTypes.fn('SUM', DataTypes.col('amount')), 'totalAmount'],
      [DataTypes.fn('COUNT', DataTypes.col('id')), 'totalTransactions']
    ]
  });
  
  return {
    totalAmount: parseFloat(result[0].dataValues.totalAmount || 0),
    totalTransactions: parseInt(result[0].dataValues.totalTransactions || 0)
  };
};

module.exports = Payment;