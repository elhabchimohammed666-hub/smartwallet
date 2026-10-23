const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

// Helper to calculate budget metrics for a given month
async function calculateBudgetPerformance(userId, monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  let budget = await Budget.findOne({ user: userId, month: monthStr }).populate('categoryLimits.category');

  // Aggregation for category expenses this month
  const expenses = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: 'expense',
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$amount' }
      }
    }
  ]);

  const spentByCatId = {};
  let totalSpent = 0;
  expenses.forEach((item) => {
    if (item._id) {
      spentByCatId[item._id.toString()] = item.totalSpent;
    }
    totalSpent += item.totalSpent;
  });

  const overallLimit = budget ? budget.overallLimit : 0;
  const overallRemaining = Math.max(0, overallLimit - totalSpent);
  const overallPercent = overallLimit > 0 ? Math.round((totalSpent / overallLimit) * 1000) / 10 : 0;
  const overallStatus =
    overallLimit === 0 ? 'no_budget' : overallPercent >= 100 ? 'exceeded' : overallPercent >= 80 ? 'warning' : 'good';

  // Build category limit performance
  const categoryLimits = [];
  if (budget && budget.categoryLimits) {
    budget.categoryLimits.forEach((cl) => {
      if (!cl.category) return;
      const catId = cl.category._id.toString();
      const spent = spentByCatId[catId] || 0;
      const limit = cl.limit;
      const remaining = Math.max(0, limit - spent);
      const percent = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
      const status = percent >= 100 ? 'exceeded' : percent >= 80 ? 'warning' : 'good';

      categoryLimits.push({
        category: cl.category,
        limit,
        spent: Math.round(spent * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        percent,
        status
      });
    });
  }

  return {
    month: monthStr,
    budgetId: budget ? budget._id : null,
    overallLimit,
    totalSpent: Math.round(totalSpent * 100) / 100,
    overallRemaining: Math.round(overallRemaining * 100) / 100,
    overallPercent,
    overallStatus,
    categoryLimits,
    notes: budget ? budget.notes : ''
  };
}

// @desc    Get budget and usage for a month
// @route   GET /api/budgets
exports.getBudget = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const performance = await calculateBudgetPerformance(req.user._id, month);
    res.status(200).json({ success: true, data: performance });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update budget for a month
// @route   POST /api/budgets
exports.setBudget = async (req, res, next) => {
  try {
    const { month, overallLimit, categoryLimits, notes } = req.body;

    if (!month || overallLimit === undefined) {
      return res.status(400).json({ success: false, message: 'Month and overallLimit are required' });
    }

    let budget = await Budget.findOne({ user: req.user._id, month });

    if (budget) {
      budget.overallLimit = Number(overallLimit);
      if (categoryLimits) budget.categoryLimits = categoryLimits;
      if (notes !== undefined) budget.notes = notes;
      await budget.save();
    } else {
      budget = await Budget.create({
        user: req.user._id,
        month,
        overallLimit: Number(overallLimit),
        categoryLimits: categoryLimits || [],
        notes: notes || ''
      });
    }

    const performance = await calculateBudgetPerformance(req.user._id, month);
    res.status(200).json({ success: true, data: performance });
  } catch (error) {
    next(error);
  }
};

// @desc    Get budget history across previous months
// @route   GET /api/budgets/history
exports.getBudgetHistory = async (req, res, next) => {
  try {
    const budgets = await Budget.find({ user: req.user._id }).sort({ month: -1 }).limit(12);

    const history = [];
    for (const b of budgets) {
      const perf = await calculateBudgetPerformance(req.user._id, b.month);
      history.push(perf);
    }

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};
