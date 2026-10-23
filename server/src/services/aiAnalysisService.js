const { GoogleGenerativeAI } = require('@google/generative-ai');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const Category = require('../models/Category');

/**
 * Helper to get previous month string 'YYYY-MM'
 */
function getPreviousMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  const prevYear = date.getFullYear();
  const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${prevYear}-${prevMonth}`;
}

/**
 * Calculate actual statistics from MongoDB transactions and budgets
 */
async function calculateMonthlyStatistics(userId, monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Fetch current month transactions
  const transactions = await Transaction.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  }).populate('category');

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap = {};

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
      const catId = tx.category?._id ? tx.category._id.toString() : 'uncategorized';
      const catName = tx.category?.name || 'Uncategorized';
      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          categoryId: tx.category?._id || null,
          categoryName: catName,
          amount: 0
        };
      }
      categoryMap[catId].amount += tx.amount;
    }
  });

  const netSavings = Math.round((totalIncome - totalExpense) * 100) / 100;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 1000) / 10 : 0;

  // Fetch Budget for the month
  const budget = await Budget.findOne({ user: userId, month: monthStr }).populate('categoryLimits.category');
  const overallLimit = budget ? budget.overallLimit : 0;
  const overallBudgetRemaining = Math.max(0, overallLimit - totalExpense);
  const overallBudgetPercent = overallLimit > 0 ? Math.round((totalExpense / overallLimit) * 1000) / 10 : 0;

  // Category breakdown with budget limits
  const categoryBreakdown = Object.values(categoryMap).map((cat) => {
    const percentOfTotal = totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 1000) / 10 : 0;
    let budgetLimit = null;
    let budgetUsedPercent = null;

    if (budget && budget.categoryLimits) {
      const matchedLimit = budget.categoryLimits.find(
        (cl) => cl.category && (cl.category._id.toString() === cat.categoryId?.toString() || cl.category.name === cat.categoryName)
      );
      if (matchedLimit) {
        budgetLimit = matchedLimit.limit;
        budgetUsedPercent = budgetLimit > 0 ? Math.round((cat.amount / budgetLimit) * 1000) / 10 : 0;
      }
    }

    return {
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      amount: Math.round(cat.amount * 100) / 100,
      percentOfTotal,
      budgetLimit,
      budgetUsedPercent
    };
  });

  // Sort by highest amount
  categoryBreakdown.sort((a, b) => b.amount - a.amount);

  // Historical Comparison with Prior Month
  const prevMonthStr = getPreviousMonth(monthStr);
  const [prevYear, prevM] = prevMonthStr.split('-').map(Number);
  const prevStartDate = new Date(prevYear, prevM - 1, 1, 0, 0, 0, 0);
  const prevEndDate = new Date(prevYear, prevM, 0, 23, 59, 59, 999);

  const prevTransactions = await Transaction.find({
    user: userId,
    date: { $gte: prevStartDate, $lte: prevEndDate }
  });

  let priorMonthComparison = {
    hasPriorData: false,
    priorMonth: prevMonthStr,
    priorIncome: 0,
    priorExpense: 0,
    incomeChangePercent: 0,
    expenseChangePercent: 0,
    differenceExpense: 0
  };

  if (prevTransactions.length > 0) {
    let prevIncome = 0;
    let prevExpense = 0;
    prevTransactions.forEach((tx) => {
      if (tx.type === 'income') prevIncome += tx.amount;
      if (tx.type === 'expense') prevExpense += tx.amount;
    });

    const incomeChangePercent =
      prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 1000) / 10 : totalIncome > 0 ? 100 : 0;
    const expenseChangePercent =
      prevExpense > 0 ? Math.round(((totalExpense - prevExpense) / prevExpense) * 1000) / 10 : totalExpense > 0 ? 100 : 0;

    priorMonthComparison = {
      hasPriorData: true,
      priorMonth: prevMonthStr,
      priorIncome: Math.round(prevIncome * 100) / 100,
      priorExpense: Math.round(prevExpense * 100) / 100,
      incomeChangePercent,
      expenseChangePercent,
      differenceExpense: Math.round((totalExpense - prevExpense) * 100) / 100
    };
  }

  // Active Savings Goals
  const savingsGoals = await SavingsGoal.find({ user: userId });
  let savingsContributionsThisMonth = 0;

  savingsGoals.forEach((goal) => {
    if (goal.contributions && goal.contributions.length > 0) {
      goal.contributions.forEach((c) => {
        const cDate = new Date(c.date);
        if (cDate >= startDate && cDate <= endDate) {
          savingsContributionsThisMonth += c.amount;
        }
      });
    }
  });

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    netSavings,
    savingsRate,
    overallBudget: overallLimit,
    overallBudgetUsed: Math.round(totalExpense * 100) / 100,
    overallBudgetRemaining: Math.round(overallBudgetRemaining * 100) / 100,
    overallBudgetPercent,
    categoryBreakdown,
    priorMonthComparison,
    activeSavingsGoalsCount: savingsGoals.filter((g) => !g.isCompleted).length,
    savingsContributionsThisMonth: Math.round(savingsContributionsThisMonth * 100) / 100
  };
}

/**
 * Intelligent Rule-based Financial Interpretation Engine
 * Follows all reliability criteria from the PDF specification
 */
function generateHeuristicAnalysis(stats, monthStr, currency = 'MAD') {
  const {
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    overallBudget,
    overallBudgetPercent,
    categoryBreakdown,
    priorMonthComparison,
    activeSavingsGoalsCount,
    savingsContributionsThisMonth
  } = stats;

  // 1. Overview
  let overview = `For ${monthStr}, recorded income totaled ${totalIncome.toLocaleString()} ${currency} and expenses reached ${totalExpense.toLocaleString()} ${currency}, resulting in a net balance of ${netSavings.toLocaleString()} ${currency} (savings rate of ${savingsRate}%). `;
  if (overallBudget > 0) {
    overview += `The overall monthly budget of ${overallBudget.toLocaleString()} ${currency} is currently ${overallBudgetPercent}% utilized with ${stats.overallBudgetRemaining.toLocaleString()} ${currency} remaining.`;
  } else {
    overview += `No overall spending budget was set for this month.`;
  }

  // 2. Spending Patterns
  const spendingPatterns = [];
  if (categoryBreakdown.length > 0) {
    const topCat = categoryBreakdown[0];
    spendingPatterns.push(
      `Primary spending driver is "${topCat.categoryName}", accounting for ${topCat.amount.toLocaleString()} ${currency} (${topCat.percentOfTotal}% of total monthly expenditure).`
    );
    if (categoryBreakdown.length > 1) {
      const secondCat = categoryBreakdown[1];
      spendingPatterns.push(
        `Secondary spending is "${secondCat.categoryName}" at ${secondCat.amount.toLocaleString()} ${currency} (${secondCat.percentOfTotal}% of total expenses).`
      );
    }
  } else {
    spendingPatterns.push('No expense transactions recorded for this month.');
  }

  if (priorMonthComparison.hasPriorData) {
    const changeWord = priorMonthComparison.differenceExpense >= 0 ? 'increased' : 'decreased';
    spendingPatterns.push(
      `Compared to ${priorMonthComparison.priorMonth}, total expenditures have ${changeWord} by ${Math.abs(priorMonthComparison.differenceExpense).toLocaleString()} ${currency} (${Math.abs(priorMonthComparison.expenseChangePercent)}%).`
    );
  } else {
    spendingPatterns.push(
      `Historical comparison: Prior month data (${priorMonthComparison.priorMonth}) is not recorded yet; multi-month trend analysis will be available as more data accumulates.`
    );
  }

  // 3. Budget Concerns
  const budgetConcerns = [];
  if (overallBudget > 0 && overallBudgetPercent >= 100) {
    budgetConcerns.push(
      `Overall monthly budget exceeded: Total spending of ${totalExpense.toLocaleString()} ${currency} exceeds the planned ${overallBudget.toLocaleString()} ${currency} limit by ${(totalExpense - overallBudget).toLocaleString()} ${currency} (${overallBudgetPercent}% used).`
    );
  } else if (overallBudget > 0 && overallBudgetPercent >= 80) {
    budgetConcerns.push(
      `Overall budget warning: You have consumed ${overallBudgetPercent}% of your ${overallBudget.toLocaleString()} ${currency} monthly budget, with only ${stats.overallBudgetRemaining.toLocaleString()} ${currency} remaining.`
    );
  }

  categoryBreakdown.forEach((cat) => {
    if (cat.budgetLimit && cat.budgetUsedPercent >= 100) {
      budgetConcerns.push(
        `Category limit exceeded for "${cat.categoryName}": Recorded ${cat.amount.toLocaleString()} ${currency} against an allocated ${cat.budgetLimit.toLocaleString()} ${currency} limit (${cat.budgetUsedPercent}%).`
      );
    } else if (cat.budgetLimit && cat.budgetUsedPercent >= 80) {
      budgetConcerns.push(
        `Category warning for "${cat.categoryName}": Spending has reached ${cat.budgetUsedPercent}% of the ${cat.budgetLimit.toLocaleString()} ${currency} ceiling.`
      );
    }
  });

  if (budgetConcerns.length === 0) {
    if (overallBudget > 0) {
      budgetConcerns.push(
        `All spending is well within planned thresholds. Total spending is at ${overallBudgetPercent}% of the monthly ceiling.`
      );
    } else {
      budgetConcerns.push('No budget alerts triggered. Consider defining category budgets to monitor spending proactively.');
    }
  }

  // 4. Positive Observations
  const positiveObservations = [];
  if (netSavings > 0) {
    positiveObservations.push(
      `Maintained a positive cash flow with ${netSavings.toLocaleString()} ${currency} retained from monthly income (${savingsRate}% savings rate).`
    );
  }
  if (savingsContributionsThisMonth > 0) {
    positiveObservations.push(
      `Dedicated ${savingsContributionsThisMonth.toLocaleString()} ${currency} to personal savings goals during this billing cycle without counting it as spending.`
    );
  }
  const controlledCats = categoryBreakdown.filter((c) => c.budgetLimit && c.budgetUsedPercent < 80);
  if (controlledCats.length > 0) {
    const names = controlledCats.map((c) => `"${c.categoryName}" (${c.budgetUsedPercent}% used)`).join(', ');
    positiveObservations.push(`Disciplined spending maintained in: ${names}.`);
  }
  if (positiveObservations.length === 0) {
    positiveObservations.push('Spending tracking is actively functioning, providing transparency into cash flow patterns.');
  }

  // 5. Recommendations (Evidence-based)
  const recommendations = [];
  if (categoryBreakdown.length > 0 && categoryBreakdown[0].percentOfTotal > 40) {
    recommendations.push(
      `Focus on "${categoryBreakdown[0].categoryName}", which represents ${categoryBreakdown[0].percentOfTotal}% of all expenses. A 10% reduction here would preserve approximately ${Math.round(categoryBreakdown[0].amount * 0.1).toLocaleString()} ${currency} next month.`
    );
  }
  if (activeSavingsGoalsCount > 0 && netSavings > 0 && savingsContributionsThisMonth === 0) {
    recommendations.push(
      `You have ${activeSavingsGoalsCount} active savings goals and positive cash flow of ${netSavings.toLocaleString()} ${currency}. Consider directing a portion towards your goals to accelerate progress.`
    );
  }
  if (!overallBudget || overallBudget === 0) {
    recommendations.push(
      `Set an overall monthly spending ceiling for next month to establish a clear benchmark for discretionary spending.`
    );
  } else if (overallBudgetPercent > 90) {
    recommendations.push(
      `Review upcoming recurring commitments to avoid exceeding the monthly spending ceiling before the period concludes.`
    );
  } else {
    recommendations.push(
      `Continue current spending pace; remaining buffer of ${stats.overallBudgetRemaining.toLocaleString()} ${currency} provides financial resilience for unexpected expenses.`
    );
  }

  const insufficientHistoryNote = !priorMonthComparison.hasPriorData
    ? `Notice: Multi-month trend comparisons are currently limited because prior month (${priorMonthComparison.priorMonth}) data is not yet recorded.`
    : '';

  return {
    overview,
    spendingPatterns,
    budgetConcerns,
    positiveObservations,
    recommendations,
    insufficientHistoryNote,
    aiModelUsed: 'SmartWallet Heuristic Intelligence Engine'
  };
}

/**
 * Generate complete AI Monthly Financial Report
 */
async function generateMonthlyReport(userId, monthStr, currency = 'MAD') {
  // 1. Calculate actual backend statistics
  const stats = await calculateMonthlyStatistics(userId, monthStr);

  // 2. Generate AI narrative
  let aiAnalysis = null;

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are a certified personal financial analysis assistant for the SmartWallet application.
Analyze these backend-calculated statistics for month: ${monthStr} (Currency: ${currency}).

DO NOT INVENT NUMBERS. Adhere strictly to the calculated statistics below:
${JSON.stringify(stats, null, 2)}

Produce a structured JSON report with EXACTLY these 5 sections:
{
  "overview": "Detailed overview paragraph of monthly income, expenses, net balance, and budget usage.",
  "spendingPatterns": [
    "Bullet point about top spending categories and their percentages",
    "Bullet point about historical changes or statement acknowledging insufficient prior history"
  ],
  "budgetConcerns": [
    "Specific bullet points referencing any exceeded or near-limit (>80%) budgets, or clean statement if all within limit"
  ],
  "positiveObservations": [
    "Bullet points about disciplined spending, positive savings rate, or goals contributed to"
  ],
  "recommendations": [
    "Evidence-based practical suggestions referencing specific amounts or categories"
  ],
  "insufficientHistoryNote": "${stats.priorMonthComparison.hasPriorData ? '' : 'Prior month data is not yet available for trend comparison.'}"
}
Reliability rules:
- No investment advice.
- All numbers and percentages must match the provided statistics.
- Return ONLY valid JSON, no markdown backticks.`;

      const result = await model.generateContent(prompt);
      const text = (await result.response)
        .text()
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(text);

      aiAnalysis = {
        overview: parsed.overview || '',
        spendingPatterns: parsed.spendingPatterns || [],
        budgetConcerns: parsed.budgetConcerns || [],
        positiveObservations: parsed.positiveObservations || [],
        recommendations: parsed.recommendations || [],
        insufficientHistoryNote: parsed.insufficientHistoryNote || '',
        aiModelUsed: 'Gemini 1.5 Flash'
      };
    } catch (apiError) {
      console.warn('Gemini report generation failed, using intelligent heuristic engine:', apiError.message);
    }
  }

  if (!aiAnalysis) {
    aiAnalysis = generateHeuristicAnalysis(stats, monthStr, currency);
  }

  // Validate that all sections are populated
  if (!aiAnalysis.overview) {
    aiAnalysis.overview = `Financial overview for ${monthStr}: Income ${stats.totalIncome} ${currency}, Expenses ${stats.totalExpense} ${currency}.`;
  }
  if (!aiAnalysis.spendingPatterns || aiAnalysis.spendingPatterns.length === 0) {
    aiAnalysis.spendingPatterns = ['Spending tracked across active categories.'];
  }
  if (!aiAnalysis.budgetConcerns || aiAnalysis.budgetConcerns.length === 0) {
    aiAnalysis.budgetConcerns = ['No immediate budget overruns detected.'];
  }
  if (!aiAnalysis.positiveObservations || aiAnalysis.positiveObservations.length === 0) {
    aiAnalysis.positiveObservations = ['Active personal financial tracking maintained.'];
  }
  if (!aiAnalysis.recommendations || aiAnalysis.recommendations.length === 0) {
    aiAnalysis.recommendations = ['Continue monitoring monthly budget limits to optimize savings.'];
  }

  return {
    statistics: stats,
    aiAnalysis
  };
}

module.exports = {
  calculateMonthlyStatistics,
  generateMonthlyReport
};
