import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Plus,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Save,
  Trash2,
  TrendingDown
} from 'lucide-react';
import Header from '../components/Header';
import AlertBanner from '../components/AlertBanner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BudgetsPage() {
  const { formatCurrency, currency } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [budgetData, setBudgetData] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form edit state
  const [overallLimitInput, setOverallLimitInput] = useState('');
  const [categoryLimitsInput, setCategoryLimitsInput] = useState([]);
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadCategories();
    loadBudgetHistory();
  }, []);

  useEffect(() => {
    loadBudgetData();
  }, [selectedMonth]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories?type=expense');
      setExpenseCategories(res.data.data || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/budgets?month=${selectedMonth}`);
      const data = res.data.data;
      setBudgetData(data);

      setOverallLimitInput(data.overallLimit || '');
      setNotesInput(data.notes || '');

      // Prepare category limits input
      if (data.categoryLimits && data.categoryLimits.length > 0) {
        setCategoryLimitsInput(
          data.categoryLimits.map((cl) => ({
            category: cl.category?._id || cl.category,
            name: cl.category?.name || 'Category',
            limit: cl.limit
          }))
        );
      } else {
        setCategoryLimitsInput([]);
      }
    } catch (err) {
      console.error('Failed to load budget', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetHistory = async () => {
    try {
      const res = await api.get('/budgets/history');
      setHistory(res.data.data || []);
    } catch (err) {
      console.error('Failed to load budget history', err);
    }
  };

  const handleAddCategoryLimit = (categoryId) => {
    if (!categoryId) return;
    if (categoryLimitsInput.some((c) => c.category === categoryId)) return;

    const cat = expenseCategories.find((c) => c._id === categoryId);
    setCategoryLimitsInput([
      ...categoryLimitsInput,
      {
        category: categoryId,
        name: cat?.name || 'Category',
        limit: 500
      }
    ]);
  };

  const handleRemoveCategoryLimit = (categoryId) => {
    setCategoryLimitsInput(categoryLimitsInput.filter((c) => c.category !== categoryId));
  };

  const handleCategoryLimitChange = (categoryId, newLimit) => {
    setCategoryLimitsInput(
      categoryLimitsInput.map((c) => (c.category === categoryId ? { ...c, limit: Number(newLimit) } : c))
    );
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveSuccess(false);

      const payload = {
        month: selectedMonth,
        overallLimit: Number(overallLimitInput) || 0,
        categoryLimits: categoryLimitsInput.map((cl) => ({
          category: cl.category,
          limit: cl.limit
        })),
        notes: notesInput
      };

      await api.post('/budgets', payload);
      setSaveSuccess(true);
      await loadBudgetData();
      await loadBudgetHistory();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save budget', err);
      alert('Error saving budget');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Monthly Budgets"
        subtitle="Define overall monthly spending limits and category-specific thresholds"
        onRefresh={() => {
          loadBudgetData();
          loadBudgetHistory();
        }}
      />

      <div className="max-w-7xl mx-auto px-8 pt-6 space-y-6">
        {/* Month Selector */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Managing Budget For</p>
              <h3 className="text-base font-bold text-slate-900">{selectedMonth}</h3>
            </div>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Alert Banner */}
        <AlertBanner budgetData={budgetData} />

        {/* Current Budget Performance Cards */}
        {budgetData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Planned Budget</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {formatCurrency(budgetData.overallLimit)}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Monthly ceiling</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Actual Spent</p>
              <h3 className="text-2xl font-extrabold text-rose-600 mt-1">
                {formatCurrency(budgetData.totalSpent)}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{budgetData.overallPercent}% consumed</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Remaining Budget</p>
              <h3
                className={`text-2xl font-extrabold mt-1 ${
                  budgetData.overallRemaining <= 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(budgetData.overallRemaining)}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {budgetData.overallRemaining <= 0 ? 'Over limit!' : 'Available to spend'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget Configuration Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Configure Limits for {selectedMonth}</h3>
                <p className="text-xs text-slate-500">Set overall ceiling and individual category limits</p>
              </div>
              {saveSuccess && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-5">
              {/* Overall Monthly Limit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Overall Monthly Spending Budget ({currency})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10"
                    min="0"
                    required
                    value={overallLimitInput}
                    onChange={(e) => setOverallLimitInput(e.target.value)}
                    placeholder="e.g. 4000"
                    className="w-full px-4 py-2.5 text-base font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  This overall ceiling sets the primary boundary for your entire monthly expenditure.
                </p>
              </div>

              {/* Category Limits */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Category-Specific Limits (Optional)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      e.g. Groceries 1,500 {currency}, Transportation 600 {currency}
                    </p>
                  </div>

                  {/* Add category limit dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        handleAddCategoryLimit(e.target.value);
                        e.target.value = '';
                      }}
                      className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-semibold focus:outline-none"
                    >
                      <option value="">+ Add Category Limit</option>
                      {expenseCategories
                        .filter((ec) => !categoryLimitsInput.some((c) => c.category === ec._id))
                        .map((ec) => (
                          <option key={ec._id} value={ec._id}>
                            {ec.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {categoryLimitsInput.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {categoryLimitsInput.map((cl) => {
                      // Find actual spent in this category
                      const perf = budgetData?.categoryLimits?.find(
                        (p) => p.category?._id === cl.category || p.category === cl.category
                      );
                      const spent = perf ? perf.spent : 0;
                      const percent = cl.limit > 0 ? Math.round((spent / cl.limit) * 100) : 0;

                      return (
                        <div
                          key={cl.category}
                          className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{cl.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-500">Limit:</span>
                              <input
                                type="number"
                                step="10"
                                min="0"
                                value={cl.limit}
                                onChange={(e) => handleCategoryLimitChange(cl.category, e.target.value)}
                                className="w-24 px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                              />
                              <span className="text-xs font-bold text-slate-600">{currency}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCategoryLimit(cl.category)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Live usage visual */}
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                              <span>Spent: {formatCurrency(spent)}</span>
                              <span
                                className={`font-bold ${
                                  percent >= 100
                                    ? 'text-rose-600'
                                    : percent >= 80
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {percent}% used
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  percent >= 100
                                    ? 'bg-rose-500'
                                    : percent >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, percent)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    No category-specific limits defined yet. Select one above to allocate spending caps.
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Budget Notes</label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g. Vacation saving month, tight budget"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Monthly Budget'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Budget History Sidebar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Budget History</h3>
            <p className="text-xs text-slate-500">Review spending vs targets in past months</p>

            <div className="space-y-3 pt-2">
              {history.length > 0 ? (
                history.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedMonth(h.month)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedMonth === h.month
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-800">{h.month}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          h.overallStatus === 'exceeded'
                            ? 'bg-rose-100 text-rose-700'
                            : h.overallStatus === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {h.overallPercent}%
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Spent: {formatCurrency(h.totalSpent)}</span>
                      <span>Limit: {formatCurrency(h.overallLimit)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No budget history available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
