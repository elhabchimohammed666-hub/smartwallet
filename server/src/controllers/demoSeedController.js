const User = require('../models/User');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const Receipt = require('../models/Receipt');
const MonthlyReport = require('../models/MonthlyReport');
const { generateMonthlyReport } = require('../services/aiAnalysisService');

// @desc    Seed the complete End-to-End scenario from the PDF (Yassine's story)
// @route   POST /api/demo/seed
exports.seedScenario = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Set user currency to MAD
    await User.findByIdAndUpdate(userId, { preferredCurrency: 'MAD' });

    // Ensure categories exist
    let groceriesCat = await Category.findOne({ user: userId, name: 'Groceries' });
    let transportCat = await Category.findOne({ user: userId, name: 'Transportation' });
    let salaryCat = await Category.findOne({ user: userId, name: 'Salary' });
    let diningCat = await Category.findOne({ user: userId, name: 'Dining' });
    let utilCat = await Category.findOne({ user: userId, name: 'Utilities' });

    if (!groceriesCat) groceriesCat = await Category.create({ user: userId, name: 'Groceries', type: 'expense', icon: 'ShoppingCart', color: '#F59E0B' });
    if (!transportCat) transportCat = await Category.create({ user: userId, name: 'Transportation', type: 'expense', icon: 'Car', color: '#3B82F6' });
    if (!salaryCat) salaryCat = await Category.create({ user: userId, name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10B981' });
    if (!diningCat) diningCat = await Category.create({ user: userId, name: 'Dining', type: 'expense', icon: 'Utensils', color: '#F97316' });
    if (!utilCat) utilCat = await Category.create({ user: userId, name: 'Utilities', type: 'expense', icon: 'Zap', color: '#14B8A6' });

    // Determine current month (e.g. 2026-10) and prior month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    // Clean previous records for clean demo
    await Transaction.deleteMany({ user: userId });
    await Budget.deleteMany({ user: userId });
    await SavingsGoal.deleteMany({ user: userId });
    await Receipt.deleteMany({ user: userId });
    await MonthlyReport.deleteMany({ user: userId });

    // 1. Previous Month Data (for historical comparison!)
    await Transaction.create([
      {
        user: userId,
        type: 'income',
        amount: 8500,
        category: salaryCat._id,
        date: new Date(prevDate.getFullYear(), prevDate.getMonth(), 1),
        description: 'Monthly Salary (Prior Month)',
        paymentMethod: 'Bank Transfer'
      },
      {
        user: userId,
        type: 'expense',
        amount: 1350,
        category: groceriesCat._id,
        date: new Date(prevDate.getFullYear(), prevDate.getMonth(), 5),
        description: 'Carrefour Market',
        paymentMethod: 'Debit Card'
      },
      {
        user: userId,
        type: 'expense',
        amount: 450,
        category: transportCat._id,
        date: new Date(prevDate.getFullYear(), prevDate.getMonth(), 12),
        description: 'Shell Fuel Station',
        paymentMethod: 'Cash'
      },
      {
        user: userId,
        type: 'expense',
        amount: 350,
        category: utilCat._id,
        date: new Date(prevDate.getFullYear(), prevDate.getMonth(), 15),
        description: 'Water & Electricity Bill',
        paymentMethod: 'Credit Card'
      }
    ]);

    // 2. Current Month Income (Step 2 of PDF: Salary recorded)
    await Transaction.create({
      user: userId,
      type: 'income',
      amount: 9000,
      category: salaryCat._id,
      date: new Date(now.getFullYear(), now.getMonth(), 1),
      description: 'Monthly Salary',
      paymentMethod: 'Bank Transfer'
    });

    // 3. Current Month Budget (Step 2 of PDF: 4,000 MAD overall, 1,500 groceries, 600 transportation)
    await Budget.create({
      user: userId,
      month: currentMonth,
      overallLimit: 4000,
      categoryLimits: [
        { category: groceriesCat._id, limit: 1500 },
        { category: transportCat._id, limit: 600 }
      ],
      notes: "Yassine's monthly spending budget"
    });

    // 4. Savings Goal (Step 3 & 7 of PDF: 8,000 MAD for Laptop, with initial 1,000 MAD + second contribution of 500 MAD)
    const laptopGoal = await SavingsGoal.create({
      user: userId,
      name: 'New Laptop',
      targetAmount: 8000,
      currentAmount: 1500,
      targetDate: new Date(now.getFullYear(), now.getMonth() + 4, 1),
      icon: 'Laptop',
      color: '#3B82F6',
      isCompleted: false,
      contributions: [
        {
          amount: 1000,
          date: new Date(now.getFullYear(), now.getMonth(), 2),
          notes: 'Initial contribution'
        },
        {
          amount: 500,
          date: new Date(now.getFullYear(), now.getMonth(), 18),
          notes: 'Mid-month savings allocation'
        }
      ],
      notes: 'Savings target for MacBook / work laptop'
    });

    // 5. Receipt & Expense Transaction (Step 4 & 5 of PDF: Supermarket receipt 285 MAD Groceries)
    const sampleReceipt = await Receipt.create({
      user: userId,
      imageUrl: '/uploads/receipts/sample-receipt.png',
      originalFilename: 'marjane_supermarket_receipt.jpg',
      mimeType: 'image/jpeg',
      fileSize: 142500,
      ocrRawText: 'MARJANE MARKET\nCASABLANCA\nDATE: 08/10/2026\nARTICLES ALIMENTAIRES\nTOTAL TTC: 285.00 MAD\nMERCI DE VOTRE VISITE',
      extractedData: {
        merchant: 'Marjane Market',
        date: new Date(now.getFullYear(), now.getMonth(), 8),
        totalAmount: 285,
        currency: 'MAD',
        suggestedCategoryName: 'Groceries',
        confidence: 0.95
      },
      status: 'confirmed'
    });

    const receiptTx = await Transaction.create({
      user: userId,
      type: 'expense',
      amount: 285,
      category: groceriesCat._id,
      date: new Date(now.getFullYear(), now.getMonth(), 8),
      description: 'Marjane Market (Receipt)',
      receipt: sampleReceipt._id,
      receiptUrl: sampleReceipt.imageUrl,
      paymentMethod: 'Credit Card',
      notes: 'Weekly fresh groceries, scanned via OCR'
    });

    sampleReceipt.transaction = receiptTx._id;
    await sampleReceipt.save();

    // Additional Groceries to reach ~1,400 MAD (from PDF page 4 example: 1,400 MAD used out of 2,000 or 1,500)
    await Transaction.create([
      {
        user: userId,
        type: 'expense',
        amount: 815,
        category: groceriesCat._id,
        date: new Date(now.getFullYear(), now.getMonth(), 12),
        description: 'Carrefour Hypermarket',
        paymentMethod: 'Credit Card'
      },
      // Transportation approaching limit (Step 6 of PDF: notices transport approaching planned limit of 600 MAD)
      {
        user: userId,
        type: 'expense',
        amount: 250,
        category: transportCat._id,
        date: new Date(now.getFullYear(), now.getMonth(), 4),
        description: 'Shell Gas Station Casablanca',
        paymentMethod: 'Credit Card'
      },
      {
        user: userId,
        type: 'expense',
        amount: 260,
        category: transportCat._id,
        date: new Date(now.getFullYear(), now.getMonth(), 15),
        description: 'Total Energies Fuel & Careem Taxi',
        paymentMethod: 'Debit Card'
      },
      // Dining out
      {
        user: userId,
        type: 'expense',
        amount: 320,
        category: diningCat._id,
        date: new Date(now.getFullYear(), now.getMonth(), 10),
        description: 'Dinner with colleagues',
        paymentMethod: 'Cash'
      }
    ]);

    // 6. Pre-generate AI Monthly Financial Report for current month
    const { statistics, aiAnalysis } = await generateMonthlyReport(userId, currentMonth, 'MAD');
    const report = await MonthlyReport.create({
      user: userId,
      month: currentMonth,
      statistics,
      aiAnalysis,
      aiModelUsed: aiAnalysis.aiModelUsed
    });

    res.status(200).json({
      success: true,
      message: "End-to-End Scenario (Yassine's story from PDF) seeded successfully!",
      currentMonth,
      sampleReceiptId: sampleReceipt._id,
      laptopGoalId: laptopGoal._id,
      reportId: report._id
    });
  } catch (error) {
    next(error);
  }
};
