import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  FileText,
  BarChart3,
  History,
  Info
} from 'lucide-react';
import Header from '../components/Header';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ReportsPage() {
  const { formatCurrency, currency } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [currentReport, setCurrentReport] = useState(null);
  const [reportHistory, setReportHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSavedReports();
    loadReportForMonth(selectedMonth);
  }, [selectedMonth]);

  const loadSavedReports = async () => {
    try {
      const res = await api.get('/reports');
      setReportHistory(res.data.data || []);
    } catch (err) {
      console.error('Failed to load reports history', err);
    }
  };

  const loadReportForMonth = async (month) => {
    try {
      setLoading(true);
      setError('');
      // Reopen previously generated report without running AI again
      const res = await api.get(`/reports/${month}`);
      setCurrentReport(res.data.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setCurrentReport(null);
      } else {
        console.error('Error fetching report', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      setError('');
      const res = await api.post('/reports/generate', { month: selectedMonth });
      setCurrentReport(res.data.data);
      loadSavedReports();
    } catch (err) {
      console.error('Failed to generate report', err);
      setError(err.response?.data?.message || 'Failed to generate financial analysis report.');
    } finally {
      setGenerating(false);
    }
  };

  const stats = currentReport?.statistics;
  const ai = currentReport?.aiAnalysis;

  return (
    <div className="flex-1 pb-16">
      <Header
        title="AI Monthly Financial Reports"
        subtitle="Automated financial health evaluation grounded strictly in recorded spending data"
        onRefresh={() => {
          loadReportForMonth(selectedMonth);
          loadSavedReports();
        }}
      />

      <div className="max-w-7xl mx-auto px-8 pt-6 space-y-6">
        {/* Month Selector & Generate Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Analysis Month</p>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="mt-0.5 px-3 py-1 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Generating AI Report...' : currentReport ? 'Regenerate Analysis' : 'Generate AI Report'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Saved Reports Drawer / Tabs */}
        {reportHistory.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="font-bold text-slate-400 shrink-0 flex items-center gap-1">
              <History className="w-3.5 h-3.5" /> Reopen Report:
            </span>
            {reportHistory.map((rep) => (
              <button
                key={rep.month}
                onClick={() => setSelectedMonth(rep.month)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                  selectedMonth === rep.month
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {rep.month}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-emerald-600" />
            <p className="text-xs font-semibold">Loading report for {selectedMonth}...</p>
          </div>
        ) : currentReport ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Badge */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Model Engine:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  {currentReport.aiModelUsed || 'SmartWallet AI Engine'}
                </span>
              </div>
              <span>
                Generated: {new Date(currentReport.updatedAt || currentReport.createdAt).toLocaleString()}
              </span>
            </div>

            {/* SECTION 1: MONTHLY OVERVIEW (Calculated Stats vs AI interpretation) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Monthly Overview</h3>
                  <p className="text-xs text-slate-400">Actual calculated backend statistics & summary</p>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Recorded Income</p>
                  <p className="text-lg font-extrabold text-emerald-600 mt-0.5">{formatCurrency(stats?.totalIncome)}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Expenses</p>
                  <p className="text-lg font-extrabold text-rose-600 mt-0.5">{formatCurrency(stats?.totalExpense)}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Net Balance</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">{formatCurrency(stats?.netSavings)}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Budget Usage</p>
                  <p className="text-lg font-extrabold text-purple-600 mt-0.5">
                    {stats?.overallBudget > 0 ? `${stats.overallBudgetPercent}%` : 'No budget set'}
                  </p>
                </div>
              </div>

              {/* AI Narrative Overview */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-slate-700 text-xs leading-relaxed">
                <p className="font-semibold text-emerald-900 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  AI Summary Assessment:
                </p>
                <p>{ai?.overview}</p>
              </div>
            </div>

            {/* SECTION 2: SPENDING PATTERNS & HISTORICAL CHANGES */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Spending Patterns & Historical Changes</h3>
                  <p className="text-xs text-slate-400">Category breakdown and multi-month comparison</p>
                </div>
              </div>

              {/* Historical notice if insufficient data */}
              {!stats?.priorMonthComparison?.hasPriorData && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Historical trend analysis: Prior month ({stats?.priorMonthComparison?.priorMonth}) has no recorded data. Multi-month trends will become available as more records accumulate.
                  </span>
                </div>
              )}

              {/* Category distribution pills */}
              {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {stats.categoryBreakdown.map((c, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-bold text-slate-800">{c.categoryName}</span>
                        <span className="text-xs font-extrabold text-slate-700">{formatCurrency(c.amount)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>{c.percentOfTotal}% of total spending</span>
                        {c.budgetLimit && <span>Budget: {formatCurrency(c.budgetLimit)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bullet points */}
              <ul className="space-y-2 pt-2">
                {ai?.spendingPatterns?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SECTION 3: BUDGET CONCERNS */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Budget Concerns & Thresholds</h3>
                  <p className="text-xs text-slate-400">Limits approaching (≥80%) or exceeding (≥100%) defined caps</p>
                </div>
              </div>

              <ul className="space-y-2.5">
                {ai?.budgetConcerns?.map((item, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-xl bg-rose-50/70 border border-rose-100 text-rose-900 text-xs flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SECTION 4: POSITIVE OBSERVATIONS */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Positive Observations</h3>
                  <p className="text-xs text-slate-400">Areas where spending remained disciplined or savings improved</p>
                </div>
              </div>

              <ul className="space-y-2.5">
                {ai?.positiveObservations?.map((item, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 text-xs flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SECTION 5: RECOMMENDATIONS */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Evidence-Based Recommendations</h3>
                  <p className="text-xs text-slate-400">Practical actions grounded in your actual recorded financial activity</p>
                </div>
              </div>

              <div className="space-y-3">
                {ai?.recommendations?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-amber-950 text-xs flex items-start gap-3"
                  >
                    <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">{item}</p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 italic pt-2">
                Disclaimer: Recommendations are generated as general personal budgeting guidance and do not constitute formal investment or professional financial advice.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-4">
            <Sparkles className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <div>
              <h4 className="text-sm font-bold text-slate-700">No report generated for {selectedMonth}</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Click "Generate AI Report" above to calculate monthly statistics and run the financial analysis.
              </p>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Report Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
