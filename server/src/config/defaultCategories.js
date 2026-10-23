const defaultCategories = [
  // Income Categories
  { name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10B981', isDefault: true },
  { name: 'Freelance', type: 'income', icon: 'Laptop', color: '#3B82F6', isDefault: true },
  { name: 'Gifts', type: 'income', icon: 'Gift', color: '#EC4899', isDefault: true },
  { name: 'Other Income', type: 'income', icon: 'Coins', color: '#8B5CF6', isDefault: true },

  // Expense Categories
  { name: 'Groceries', type: 'expense', icon: 'ShoppingCart', color: '#F59E0B', isDefault: true },
  { name: 'Transportation', type: 'expense', icon: 'Car', color: '#3B82F6', isDefault: true },
  { name: 'Housing', type: 'expense', icon: 'Home', color: '#6366F1', isDefault: true },
  { name: 'Entertainment', type: 'expense', icon: 'Film', color: '#EC4899', isDefault: true },
  { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#8B5CF6', isDefault: true },
  { name: 'Healthcare', type: 'expense', icon: 'HeartPulse', color: '#EF4444', isDefault: true },
  { name: 'Utilities', type: 'expense', icon: 'Zap', color: '#14B8A6', isDefault: true },
  { name: 'Dining', type: 'expense', icon: 'Utensils', color: '#F97316', isDefault: true },
  { name: 'Other Expense', type: 'expense', icon: 'Receipt', color: '#64748B', isDefault: true }
];

module.exports = defaultCategories;
