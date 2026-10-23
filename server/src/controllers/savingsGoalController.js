const SavingsGoal = require('../models/SavingsGoal');

// @desc    Get all savings goals for user
// @route   GET /api/savings
exports.getSavingsGoals = async (req, res, next) => {
  try {
    const goals = await SavingsGoal.find({ user: req.user._id }).sort({ createdAt: -1 });

    const formatted = goals.map((goal) => {
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      const percentage = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 1000) / 10 : 0;
      return {
        ...goal.toObject(),
        remaining: Math.round(remaining * 100) / 100,
        percentage
      };
    });

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new savings goal
// @route   POST /api/savings
exports.createSavingsGoal = async (req, res, next) => {
  try {
    const { name, targetAmount, targetDate, initialContribution, icon, color, notes } = req.body;

    if (!name || !targetAmount) {
      return res.status(400).json({ success: false, message: 'Name and targetAmount are required' });
    }

    const contributions = [];
    let currentAmount = 0;

    if (initialContribution && Number(initialContribution) > 0) {
      contributions.push({
        amount: Number(initialContribution),
        date: new Date(),
        notes: 'Initial contribution'
      });
      currentAmount = Number(initialContribution);
    }

    const isCompleted = currentAmount >= Number(targetAmount);

    const goal = await SavingsGoal.create({
      user: req.user._id,
      name: name.trim(),
      targetAmount: Number(targetAmount),
      currentAmount,
      targetDate: targetDate ? new Date(targetDate) : null,
      icon: icon || 'Target',
      color: color || '#10B981',
      isCompleted,
      contributions,
      notes: notes || ''
    });

    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Record contribution towards savings goal
// @route   POST /api/savings/:id/contributions
exports.addContribution = async (req, res, next) => {
  try {
    const { amount, notes, date } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Contribution amount must be greater than 0' });
    }

    const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Savings goal not found' });
    }

    goal.contributions.push({
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      notes: notes || 'Contribution'
    });

    goal.recalculateCurrentAmount();
    await goal.save();

    res.status(200).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Update savings goal
// @route   PUT /api/savings/:id
exports.updateSavingsGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Savings goal not found' });
    }

    const { name, targetAmount, targetDate, icon, color, notes, isCompleted } = req.body;

    if (name) goal.name = name.trim();
    if (targetAmount !== undefined) goal.targetAmount = Number(targetAmount);
    if (targetDate !== undefined) goal.targetDate = targetDate ? new Date(targetDate) : null;
    if (icon) goal.icon = icon;
    if (color) goal.color = color;
    if (notes !== undefined) goal.notes = notes;
    if (isCompleted !== undefined) goal.isCompleted = Boolean(isCompleted);

    goal.recalculateCurrentAmount();
    await goal.save();

    res.status(200).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete savings goal
// @route   DELETE /api/savings/:id
exports.deleteSavingsGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Savings goal not found' });
    }

    await SavingsGoal.deleteOne({ _id: req.params.id });
    res.status(200).json({ success: true, message: 'Savings goal removed' });
  } catch (error) {
    next(error);
  }
};
