const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

// @desc    Get all transactions with filtering and search
// @route   GET /api/transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, search, limit = 100, page = 1 } = req.query;

    const query = { user: req.user._id };

    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('category')
      .populate('receipt', 'imageUrl originalFilename')
      .sort({ date: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
exports.getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id })
      .populate('category')
      .populate('receipt');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
exports.createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, date, description, receipt, receiptUrl, paymentMethod, isRecurring, recurringInterval, notes } =
      req.body;

    if (!type || !amount || !category || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type, amount, category, and description'
      });
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount: Number(amount),
      category,
      date: date ? new Date(date) : new Date(),
      description,
      receipt: receipt || null,
      receiptUrl: receiptUrl || null,
      paymentMethod: paymentMethod || 'Cash',
      isRecurring: Boolean(isRecurring),
      recurringInterval: recurringInterval || 'none',
      notes: notes || ''
    });

    const populated = await Transaction.findById(transaction._id).populate('category');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
exports.updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const { type, amount, category, date, description, paymentMethod, isRecurring, recurringInterval, notes } = req.body;

    if (type) transaction.type = type;
    if (amount !== undefined) transaction.amount = Number(amount);
    if (category) transaction.category = category;
    if (date) transaction.date = new Date(date);
    if (description) transaction.description = description;
    if (paymentMethod) transaction.paymentMethod = paymentMethod;
    if (isRecurring !== undefined) transaction.isRecurring = isRecurring;
    if (recurringInterval) transaction.recurringInterval = recurringInterval;
    if (notes !== undefined) transaction.notes = notes;

    await transaction.save();

    const populated = await Transaction.findById(transaction._id).populate('category');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    await Transaction.deleteOne({ _id: req.params.id });

    res.status(200).json({ success: true, message: 'Transaction removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get financial summary (income, expenses, balance)
// @route   GET /api/transactions/summary
exports.getSummary = async (req, res, next) => {
  try {
    const { month, startDate, endDate } = req.query;

    const query = { user: req.user._id };

    if (month) {
      const [year, m] = month.split('-').map(Number);
      query.date = {
        $gte: new Date(year, m - 1, 1, 0, 0, 0, 0),
        $lte: new Date(year, m, 0, 23, 59, 59, 999)
      };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const transactions = await Transaction.find(query).populate('category');

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown = {};

    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
        const catName = tx.category?.name || 'Uncategorized';
        const catColor = tx.category?.color || '#94A3B8';
        if (!categoryBreakdown[catName]) {
          categoryBreakdown[catName] = { name: catName, total: 0, color: catColor };
        }
        categoryBreakdown[catName].total += tx.amount;
      }
    });

    const balance = Math.round((totalIncome - totalExpense) * 100) / 100;

    res.status(200).json({
      success: true,
      summary: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        balance,
        transactionCount: transactions.length,
        categoryBreakdown: Object.values(categoryBreakdown).map((c) => ({
          ...c,
          total: Math.round(c.total * 100) / 100
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export transactions as CSV
// @route   GET /api/transactions/export/csv
exports.exportCSV = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id })
      .populate('category')
      .sort({ date: -1 });

    let csv = 'Date,Type,Category,Description,Amount,Payment Method,Notes\n';

    transactions.forEach((tx) => {
      const dateStr = new Date(tx.date).toISOString().split('T')[0];
      const categoryName = tx.category?.name || 'Uncategorized';
      const cleanDesc = `"${(tx.description || '').replace(/"/g, '""')}"`;
      const cleanNotes = `"${(tx.notes || '').replace(/"/g, '""')}"`;
      csv += `${dateStr},${tx.type},"${categoryName}",${cleanDesc},${tx.amount},"${tx.paymentMethod}",${cleanNotes}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`smartwallet-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};
