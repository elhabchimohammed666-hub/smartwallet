const MonthlyReport = require('../models/MonthlyReport');
const { generateMonthlyReport } = require('../services/aiAnalysisService');

// @desc    Generate new AI monthly financial report or regenerate
// @route   POST /api/reports/generate
exports.generateReport = async (req, res, next) => {
  try {
    const month = req.body.month || new Date().toISOString().slice(0, 7);
    const currency = req.user.preferredCurrency || 'MAD';

    // Call AI analysis service (calculates backend stats first, then generates AI insights)
    const { statistics, aiAnalysis } = await generateMonthlyReport(req.user._id, month, currency);

    // Save or update the report in MongoDB
    let report = await MonthlyReport.findOne({ user: req.user._id, month });

    if (report) {
      report.statistics = statistics;
      report.aiAnalysis = aiAnalysis;
      report.aiModelUsed = aiAnalysis.aiModelUsed || 'SmartWallet AI';
      await report.save();
    } else {
      report = await MonthlyReport.create({
        user: req.user._id,
        month,
        statistics,
        aiAnalysis,
        aiModelUsed: aiAnalysis.aiModelUsed || 'SmartWallet AI'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get previously generated report for a month (reopen without running AI again)
// @route   GET /api/reports/:month
exports.getReportByMonth = async (req, res, next) => {
  try {
    const { month } = req.params;
    const report = await MonthlyReport.findOne({ user: req.user._id, month });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: `No saved report found for ${month}. Please generate one first.`
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all saved reports history
// @route   GET /api/reports
exports.getAllReports = async (req, res, next) => {
  try {
    const reports = await MonthlyReport.find({ user: req.user._id })
      .select('month createdAt updatedAt statistics.totalIncome statistics.totalExpense statistics.netSavings')
      .sort({ month: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};
