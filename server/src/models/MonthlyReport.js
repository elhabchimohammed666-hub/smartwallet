const mongoose = require('mongoose');

const monthlyReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    month: {
      type: String, // Format: YYYY-MM
      required: true,
      trim: true
    },
    statistics: {
      totalIncome: { type: Number, default: 0 },
      totalExpense: { type: Number, default: 0 },
      netSavings: { type: Number, default: 0 },
      savingsRate: { type: Number, default: 0 },
      overallBudget: { type: Number, default: 0 },
      overallBudgetUsed: { type: Number, default: 0 },
      overallBudgetRemaining: { type: Number, default: 0 },
      overallBudgetPercent: { type: Number, default: 0 },
      categoryBreakdown: [
        {
          categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
          categoryName: { type: String, default: '' },
          amount: { type: Number, default: 0 },
          percentOfTotal: { type: Number, default: 0 },
          budgetLimit: { type: Number, default: null },
          budgetUsedPercent: { type: Number, default: null }
        }
      ],
      priorMonthComparison: {
        hasPriorData: { type: Boolean, default: false },
        priorMonth: { type: String, default: '' },
        priorIncome: { type: Number, default: 0 },
        priorExpense: { type: Number, default: 0 },
        incomeChangePercent: { type: Number, default: 0 },
        expenseChangePercent: { type: Number, default: 0 },
        differenceExpense: { type: Number, default: 0 }
      },
      activeSavingsGoalsCount: { type: Number, default: 0 },
      savingsContributionsThisMonth: { type: Number, default: 0 }
    },
    aiAnalysis: {
      overview: { type: String, default: '' },
      spendingPatterns: [{ type: String }],
      budgetConcerns: [{ type: String }],
      positiveObservations: [{ type: String }],
      recommendations: [{ type: String }],
      insufficientHistoryNote: { type: String, default: '' }
    },
    aiModelUsed: {
      type: String,
      default: 'SmartWallet Heuristic AI Engine'
    }
  },
  {
    timestamps: true
  }
);

monthlyReportSchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyReport', monthlyReportSchema);
