import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AlertBanner({ budgetData }) {
  const { formatCurrency } = useAuth();
  if (!budgetData) return null;

  const { overallLimit, totalSpent, overallPercent, categoryLimits } = budgetData;

  const alerts = [];

  // Check overall budget
  if (overallLimit > 0) {
    if (overallPercent >= 100) {
      alerts.push({
        type: 'danger',
        title: 'Monthly Budget Exceeded',
        message: `You have spent ${formatCurrency(totalSpent)} out of your ${formatCurrency(overallLimit)} overall budget (${overallPercent}%). Overspent by ${formatCurrency(totalSpent - overallLimit)}.`
      });
    } else if (overallPercent >= 80) {
      alerts.push({
        type: 'warning',
        title: 'Approaching Monthly Budget Limit',
        message: `You have used ${overallPercent}% of your ${formatCurrency(overallLimit)} overall budget. Remaining buffer: ${formatCurrency(overallLimit - totalSpent)}.`
      });
    }
  }

  // Check category limits
  if (categoryLimits && categoryLimits.length > 0) {
    categoryLimits.forEach((cat) => {
      if (cat.percent >= 100) {
        alerts.push({
          type: 'danger',
          title: `Budget Exceeded for "${cat.category.name}"`,
          message: `Spent ${formatCurrency(cat.spent)} against an allocated ${formatCurrency(cat.limit)} (${cat.percent}%).`
        });
      } else if (cat.percent >= 80) {
        alerts.push({
          type: 'warning',
          title: `Category Alert: "${cat.category.name}" at ${cat.percent}%`,
          message: `Spent ${formatCurrency(cat.spent)} out of ${formatCurrency(cat.limit)}. Remaining: ${formatCurrency(cat.remaining)}.`
        });
      }
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {alerts.map((alert, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
            alert.type === 'danger'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {alert.type === 'danger' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="text-sm font-semibold">{alert.title}</h4>
            <p className="text-xs text-slate-700 mt-0.5">{alert.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
