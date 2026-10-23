import React, { useState, useEffect } from 'react';
import {
  PiggyBank,
  Plus,
  Target,
  CheckCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  History,
  Trash2,
  Edit,
  Award,
  Sparkles
} from 'lucide-react';
import Header from '../components/Header';
import GoalContributionModal from '../components/GoalContributionModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SavingsPage() {
  const { formatCurrency, currency } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Goal Modal state
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [initialContribution, setInitialContribution] = useState('');
  const [notes, setNotes] = useState('');

  // Contribution Modal state
  const [contributingGoal, setContributingGoal] = useState(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/savings');
      setGoals(res.data.data || []);
    } catch (err) {
      console.error('Failed to load goals', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalName.trim() || !targetAmount || Number(targetAmount) <= 0) {
      alert('Please enter a valid goal name and target amount');
      return;
    }

    try {
      await api.post('/savings', {
        name: goalName.trim(),
        targetAmount: Number(targetAmount),
        targetDate: targetDate || null,
        initialContribution: Number(initialContribution) || 0,
        notes
      });

      setIsNewGoalOpen(false);
      setGoalName('');
      setTargetAmount('');
      setTargetDate('');
      setInitialContribution('');
      setNotes('');
      loadGoals();
    } catch (err) {
      console.error('Failed to create goal', err);
      alert('Error creating savings goal');
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      await api.delete(`/savings/${id}`);
      loadGoals();
    } catch (err) {
      console.error('Failed to delete goal', err);
    }
  };

  const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  const overallPercentage = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Personal Savings Goals"
        subtitle="Set objective targets, log independent contributions, and visualize your progress"
        onRefresh={loadGoals}
      />

      <div className="max-w-7xl mx-auto px-8 pt-6 space-y-6">
        {/* Top Summary Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg shadow-emerald-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <PiggyBank className="w-4 h-4" />
              <span>Overall Savings Reserve</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              {formatCurrency(totalSaved)}
            </h2>
            <p className="text-xs text-emerald-100 font-medium">
              Across {goals.length} active goals • Target: {formatCurrency(totalTarget)} ({overallPercentage}%)
            </p>
          </div>

          <button
            onClick={() => setIsNewGoalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs shadow-md transition-all flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Goal</span>
          </button>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.length > 0 ? (
            goals.map((goal) => {
              const isDone = goal.isCompleted || goal.currentAmount >= goal.targetAmount;
              return (
                <div
                  key={goal._id}
                  className={`bg-white rounded-2xl p-6 border transition-all shadow-sm hover:shadow-md flex flex-col justify-between ${
                    isDone ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {isDone ? <Award className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900">{goal.name}</h4>
                          {goal.targetDate && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              Target: {new Date(goal.targetDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteGoal(goal._id)}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress Numbers */}
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xl font-extrabold text-slate-900">
                          {formatCurrency(goal.currentAmount)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          of {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isDone ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, goal.percentage)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-1.5">
                        <span className={isDone ? 'text-emerald-600 font-bold' : ''}>
                          {isDone ? 'Target Reached! 🎉' : `${formatCurrency(goal.remaining)} remaining`}
                        </span>
                        <span>{goal.percentage}%</span>
                      </div>
                    </div>

                    {/* Contribution History Log Preview */}
                    {goal.contributions && goal.contributions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                          <History className="w-3 h-3" /> Recent Contributions ({goal.contributions.length})
                        </p>
                        <div className="space-y-1 max-h-24 overflow-y-auto text-[11px]">
                          {goal.contributions.slice(-3).reverse().map((c, i) => (
                            <div key={i} className="flex justify-between text-slate-600 py-0.5">
                              <span>{new Date(c.date).toLocaleDateString()}</span>
                              <span className="font-bold text-emerald-600">+{formatCurrency(c.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="pt-5 mt-2 border-t border-slate-100">
                    <button
                      onClick={() => setContributingGoal(goal)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Contribution</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <PiggyBank className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
              <h4 className="text-sm font-bold text-slate-700">No savings goals yet</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Define targets like "Emergency Fund", "New Laptop", or "Vacation" to monitor contributions safely without counting them as expenses.
              </p>
              <button
                onClick={() => setIsNewGoalOpen(true)}
                className="mt-4 px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-700 transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create First Goal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Goal Modal */}
      {isNewGoalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Create Personal Savings Goal</h3>
              <button
                onClick={() => setIsNewGoalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="e.g. New Laptop, Vacation Fund, Emergency Reserve"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Amount ({currency})
                </label>
                <input
                  type="number"
                  step="10"
                  min="1"
                  required
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="e.g. 8000"
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Contribution ({currency}) - Optional
                </label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={initialContribution}
                  onChange={(e) => setInitialContribution(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Goal description or details"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewGoalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Contribution Modal */}
      <GoalContributionModal
        isOpen={!!contributingGoal}
        onClose={() => setContributingGoal(null)}
        goal={contributingGoal}
        onSuccess={loadGoals}
      />
    </div>
  );
}
