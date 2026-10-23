import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  PieChart as PieIcon,
  Plus,
  Camera,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import AlertBanner from '../components/AlertBanner';
import TransactionModal from '../components/TransactionModal';
import ReceiptReviewModal from '../components/ReceiptReviewModal';
import ReceiptViewerModal from '../components/ReceiptViewerModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

export default function Dashboard() {
  const { formatCurrency, currency } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [extractedReceiptPayload, setExtractedReceiptPayload] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, budRes, txRes, savRes] = await Promise.all([
        api.get(`/transactions/summary?month=${selectedMonth}`),
        api.get(`/budgets?month=${selectedMonth}`),
        api.get(`/transactions?limit=6`),
        api.get('/savings')
      ]);

      setSummary(sumRes.data.summary);
      setBudgetData(budRes.data.data);
      setRecentTransactions(txRes.data.data || []);
      setSavingsGoals(savRes.data.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  // Direct quick receipt upload from dashboard
  const handleQuickReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      setIsUploadingReceipt(true);
      const res = await api.post('/receipts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExtractedReceiptPayload(res.data.data);
      setIsReviewModalOpen(true);
    } catch (err) {
      console.error('Receipt upload failed', err);
      alert('Receipt processing error: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploadingReceipt(false);
      e.target.value = '';
    }
  };

  const pieData =
    summary?.categoryBreakdown?.map((cat) => ({
      name: cat.name,
      value: cat.total,
      color: cat.color || '#3B82F6'
    })) || [];

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Financial Dashboard"
        subtitle={`Summary and performance for ${selectedMonth}`}
        onOpenNewTransaction={() => setIsTxModalOpen(true)}
        onOpenReceiptModal={() => document.getElementById('dash-receipt-upload').click()}
        onRefresh={fetchDashboardData}
      />

      <input
        type="file"
        id="dash-receipt-upload"
        accept="image/*"
        className="hidden"
        onChange={handleQuickReceiptUpload}
      />

      <div className="max-w-7xl mx-auto px-8 pt-6 space-y-6">
        {/* Month Selector Bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected Month:</span>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Budget Alert Banners */}
        <AlertBanner budgetData={budgetData} />

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Income"
            amount={formatCurrency(summary?.totalIncome || 0)}
            subtitle="Recorded this month"
            icon={TrendingUp}
            color="emerald"
          />
          <StatCard
            title="Total Expenses"
            amount={formatCurrency(summary?.totalExpense || 0)}
            subtitle="Recorded purchases & bills"
            icon={TrendingDown}
            color="rose"
          />
          <StatCard
            title="Net Balance"
            amount={formatCurrency(summary?.balance || 0)}
            subtitle="Cash flow remaining"
            icon={Wallet}
            color={summary?.balance >= 0 ? 'blue' : 'rose'}
          />
          <StatCard
            title="Monthly Budget Used"
            amount={
              budgetData?.overallLimit > 0
                ? `${budgetData.overallPercent}%`
                : 'No budget set'
            }
            subtitle={
              budgetData?.overallLimit > 0
                ? `${formatCurrency(budgetData.overallRemaining)} remaining`
                : 'Click to configure budget'
            }
            icon={PieIcon}
            color={
              budgetData?.overallPercent >= 100
                ? 'rose'
                : budgetData?.overallPercent >= 80
                ? 'amber'
                : 'purple'
            }
          />
        </div>

        {/* Monthly Budget Progress Card */}
        {budgetData && budgetData.overallLimit > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Monthly Budget Progress</h3>
                <p className="text-xs text-slate-500">
                  {formatCurrency(budgetData.totalSpent)} spent out of {formatCurrency(budgetData.overallLimit)}
                </p>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  budgetData.overallPercent >= 100
                    ? 'bg-rose-100 text-rose-700'
                    : budgetData.overallPercent >= 80
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {budgetData.overallPercent}% Used
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetData.overallPercent >= 100
                    ? 'bg-rose-500'
                    : budgetData.overallPercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budgetData.overallPercent)}%` }}
              />
            </div>

            {/* Category limits row */}
            {budgetData.categoryLimits && budgetData.categoryLimits.length > 0 && (
              <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                {budgetData.categoryLimits.map((cat, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-slate-800">{cat.category.name}</span>
                      <span className="font-bold text-slate-600">
                        {formatCurrency(cat.spent)} / {formatCurrency(cat.limit)} ({cat.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cat.percent >= 100 ? 'bg-rose-500' : cat.percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, cat.percent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Charts & Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Spending Distribution Donut Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm">Expenses by Category</h3>
                <span className="text-xs text-slate-400 font-medium">{pieData.length} categories</span>
              </div>

              {pieData.length > 0 ? (
                <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatCurrency(value), 'Spent']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {formatCurrency(summary?.totalExpense || 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <PieIcon className="w-8 h-8 mb-2 stroke-1" />
                  <p>No expenses recorded this month</p>
                </div>
              )}
            </div>

            {/* Category breakdown pill list */}
            {pieData.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                {pieData.slice(0, 5).map((item, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}:</span>
                    <span className="font-bold">{formatCurrency(item.value)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Recent Transactions</h3>
                  <p className="text-xs text-slate-400">Latest recorded income & expenses</p>
                </div>
                <Link
                  to="/transactions"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentTransactions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentTransactions.map((tx) => (
                    <div key={tx._id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 rounded-xl px-2 transition-colors">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                          }`}
                        >
                          {tx.type === 'income' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-800">{tx.description}</p>
                            {tx.receipt && (
                              <button
                                onClick={() => setViewingReceipt(tx.receipt)}
                                className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1 hover:bg-emerald-100"
                                title="View Receipt"
                              >
                                <Receipt className="w-2.5 h-2.5" /> Receipt
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {tx.category?.name || 'Uncategorized'} • {new Date(tx.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-extrabold ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <p>No transactions yet</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setIsTxModalOpen(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Manual
              </button>
            </div>
          </div>
        </div>

        {/* Savings Goals Progress Summary Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <PiggyBank className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Personal Savings Goals</h3>
                <p className="text-xs text-slate-400">Tracked separately from regular expenses</p>
              </div>
            </div>
            <Link
              to="/savings"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Manage Goals <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {savingsGoals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {savingsGoals.map((goal) => (
                <div key={goal._id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{goal.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        Target: {formatCurrency(goal.targetAmount)}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">
                      {goal.percentage}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, goal.percentage)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                    <span>Saved: {formatCurrency(goal.currentAmount)}</span>
                    <span>Remaining: {formatCurrency(goal.remaining)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              <p>No active savings goals. Create one to begin saving toward personal objectives!</p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={fetchDashboardData}
      />

      {/* Review Modal for Uploaded Receipt */}
      <ReceiptReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setExtractedReceiptPayload(null);
        }}
        extractedPayload={extractedReceiptPayload}
        onSuccess={fetchDashboardData}
      />

      {/* Receipt Viewer Modal */}
      <ReceiptViewerModal
        isOpen={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        receipt={viewingReceipt}
      />
    </div>
  );
}
