const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    originalFilename: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      default: 'image/jpeg'
    },
    fileSize: {
      type: Number,
      default: 0
    },
    ocrRawText: {
      type: String,
      default: ''
    },
    extractedData: {
      merchant: { type: String, default: '' },
      date: { type: Date, default: null },
      totalAmount: { type: Number, default: 0 },
      currency: { type: String, default: 'MAD' },
      suggestedCategoryName: { type: String, default: 'Groceries' },
      confidence: { type: Number, default: 0 }
    },
    status: {
      type: String,
      enum: ['pending_review', 'confirmed', 'failed'],
      default: 'pending_review'
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null
    }
  },
  {
    timestamps: true
  }
);

receiptSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Receipt', receiptSchema);
