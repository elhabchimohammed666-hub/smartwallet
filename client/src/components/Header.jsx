import React, { useState } from 'react';
import { Plus, Camera, Sparkles, Wand2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Header({ title, subtitle, onOpenNewTransaction, onOpenReceiptModal, onRefresh }) {
  const { currency, updateProfile } = useAuth();
  const [seeding, setSeeding] = useState(false);

  const handleSeedDemo = async () => {
    if (!window.confirm("Seed demo data for Yassine's scenario from the PDF? This will load realistic transactions, budget, savings goals, and receipt.")) return;
    try {
      setSeeding(true);
      await api.post('/demo/seed');
      if (onRefresh) onRefresh();
      window.location.reload();
    } catch (err) {
      console.error('Failed to seed demo data', err);
      alert('Failed to seed demo data: ' + (err.response?.data?.message || err.message));
    } finally {
      setSeeding(false);
    }
  };

  const handleCurrencyChange = async (newCur) => {
    try {
      await updateProfile({ preferredCurrency: newCur });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to update currency', err);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-8 py-5 sticky top-0 z-20 shadow-sm backdrop-blur-md bg-white/95">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Quick Currency Selector */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            {['MAD', 'USD', 'EUR'].map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => handleCurrencyChange(cur)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  currency === cur
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>

          {/* Seed Demo Scenario (from PDF) */}
          <button
            type="button"
            onClick={handleSeedDemo}
            disabled={seeding}
            title="Load End-to-End Scenario (Yassine) from PDF"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Wand2 className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Seeding...' : 'Load PDF Demo'}</span>
          </button>

          {/* Quick Upload Receipt */}
          {onOpenReceiptModal && (
            <button
              type="button"
              onClick={onOpenReceiptModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors shadow-sm"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600" />
              <span>Scan Receipt</span>
            </button>
          )}

          {/* Quick Add Transaction */}
          {onOpenNewTransaction && (
            <button
              type="button"
              onClick={onOpenNewTransaction}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Transaction</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
