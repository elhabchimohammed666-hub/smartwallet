const mongoose = require('mongoose');

const categoryLimitSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  limit: {
    type: Number,
    required: true,
    min: 0
  }
});

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    month: {
      type: String, // Format: YYYY-MM (e.g. 2026-10)
      required: true,
      trim: true
    },
    overallLimit: {
      type: Number,
      required: true,
      min: 0
    },
    categoryLimits: [categoryLimitSchema],
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

budgetSchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
