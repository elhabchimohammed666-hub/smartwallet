const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Contribution must be greater than 0']
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
});

const savingsGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Goal name is required'],
      trim: true
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be positive']
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    targetDate: {
      type: Date,
      default: null
    },
    icon: {
      type: String,
      default: 'Target'
    },
    color: {
      type: String,
      default: '#10B981'
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    contributions: [contributionSchema],
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

savingsGoalSchema.methods.recalculateCurrentAmount = function () {
  this.currentAmount = this.contributions.reduce((sum, c) => sum + c.amount, 0);
  if (this.currentAmount >= this.targetAmount) {
    this.isCompleted = true;
  }
  return this.currentAmount;
};

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema);
