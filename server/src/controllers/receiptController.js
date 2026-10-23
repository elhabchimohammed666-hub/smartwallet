const path = require('path');
const fs = require('fs');
const Receipt = require('../models/Receipt');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { extractTextFromImage } = require('../services/ocrService');
const { parseReceiptText } = require('../services/receiptParserService');

// @desc    Upload receipt and process with OCR & AI
// @route   POST /api/receipts/upload
exports.uploadAndProcessReceipt = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const filePath = req.file.path;
    const relativeUrl = `/uploads/receipts/${req.file.filename}`;

    // Get available user categories for suggestion matching
    const userCategories = await Category.find({ user: req.user._id, type: 'expense' });

    let ocrRawText = '';
    try {
      // 1. Process OCR
      ocrRawText = await extractTextFromImage(filePath);
    } catch (ocrErr) {
      console.warn('OCR processing encountered an issue, proceeding with fallback extraction:', ocrErr.message);
      ocrRawText = 'RECEIPT\nTOTAL: 0.00\nDATE: ' + new Date().toISOString().slice(0, 10);
    }

    // 2. Identify transaction information & AI category suggestion
    const extractedData = await parseReceiptText(
      ocrRawText,
      req.user.preferredCurrency || 'MAD',
      userCategories
    );

    // 3. Save receipt record in database (pending user review)
    const receipt = await Receipt.create({
      user: req.user._id,
      imageUrl: relativeUrl,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      ocrRawText,
      extractedData,
      status: 'pending_review'
    });

    res.status(200).json({
      success: true,
      data: {
        receiptId: receipt._id,
        imageUrl: relativeUrl,
        ocrRawText,
        extractedData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm extracted receipt details and save as transaction
// @route   POST /api/receipts/:id/confirm
exports.confirmReceipt = async (req, res, next) => {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.id, user: req.user._id });
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const { merchant, date, totalAmount, categoryId, categoryName, notes, paymentMethod } = req.body;

    if (!totalAmount || Number(totalAmount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid total amount is required' });
    }

    // Find category or resolve by name
    let selectedCategory = null;
    if (categoryId) {
      selectedCategory = await Category.findOne({ _id: categoryId, user: req.user._id });
    }
    if (!selectedCategory && categoryName) {
      selectedCategory = await Category.findOne({
        user: req.user._id,
        name: { $regex: new RegExp(`^${categoryName}$`, 'i') },
        type: 'expense'
      });
    }
    if (!selectedCategory) {
      // Fallback to first expense category or default Groceries
      selectedCategory = await Category.findOne({ user: req.user._id, type: 'expense' });
    }

    const description = merchant ? `${merchant} (Receipt)` : 'Shopping Receipt';

    // Create the expense transaction
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'expense',
      amount: Number(totalAmount),
      category: selectedCategory._id,
      date: date ? new Date(date) : new Date(),
      description,
      receipt: receipt._id,
      receiptUrl: receipt.imageUrl,
      paymentMethod: paymentMethod || 'Cash',
      notes: notes || `Extracted via OCR from ${receipt.originalFilename}`
    });

    // Update receipt status
    receipt.status = 'confirmed';
    receipt.transaction = transaction._id;
    receipt.extractedData.merchant = merchant || receipt.extractedData.merchant;
    receipt.extractedData.totalAmount = Number(totalAmount);
    receipt.extractedData.suggestedCategoryName = selectedCategory.name;
    if (date) receipt.extractedData.date = new Date(date);
    await receipt.save();

    const populatedTx = await Transaction.findById(transaction._id).populate('category');

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully from receipt',
      data: {
        receipt,
        transaction: populatedTx
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's receipt history
// @route   GET /api/receipts
exports.getReceipts = async (req, res, next) => {
  try {
    const receipts = await Receipt.find({ user: req.user._id })
      .populate({
        path: 'transaction',
        populate: { path: 'category' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: receipts.length, data: receipts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single receipt details
// @route   GET /api/receipts/:id
exports.getReceiptById = async (req, res, next) => {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.id, user: req.user._id }).populate({
      path: 'transaction',
      populate: { path: 'category' }
    });

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};
