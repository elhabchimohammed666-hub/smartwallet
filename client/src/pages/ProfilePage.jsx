import React, { useState } from 'react';
import { User, Wallet, Wand2, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CURRENCIES = [
  { code: 'MAD', name: 'Moroccan Dirham (MAD)', symbol: 'MAD' },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
  { code: 'EUR', name: 'Euro (€)', symbol: '€' },
  { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar (CAD)', symbol: 'CA$' }
];

export default function ProfilePage() {
  const { user, updateProfile, currency } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [preferredCurrency, setPreferredCurrency] = useState(currency || 'MAD');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProfile({ name, preferredCurrency });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Update failed', err);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedScenario = async () => {
    if (!window.confirm("Seed Yassine's full scenario from the PDF? This will reset and populate transactions, 4,000 MAD monthly budget, laptop savings goal, and Marjane receipt.")) return;
    try {
      setSeeding(true);
      await api.post('/demo/seed');
      setSeedSuccess(true);
      setTimeout(() => {
        setSeedSuccess(false);
        window.location.href = '/';
      }, 1500);
    } catch (err) {
      console.error('Seed failed', err);
      alert('Failed to seed demo scenario');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Profile & Settings"
        subtitle="Manage your personal account preferences, default currency, and demo data"
      />

      <div className="max-w-4xl mx-auto px-8 pt-6 space-y-8">
        {/* Profile Form */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{user?.name}</h3>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Updated!
              </span>
            )}
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">Email is tied to your account login.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Display Currency
              </label>
              <select
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                All financial summaries, dashboards, and receipts will format amounts with this currency.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Demo Scenario Seed Box */}
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">PDF Demonstration Scenario</h3>
              <p className="text-xs text-slate-600">
                End-to-End Workflow from Page 12 of the SmartWallet Specification
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Click the button below to load <strong>Yassine's Scenario</strong>: records salary income, a 4,000 MAD overall budget with 1,500 MAD groceries and 600 MAD transport limits, an 8,000 MAD savings goal for a new laptop with contributions, a 285 MAD Marjane receipt with OCR transaction, and pre-computed AI analysis!
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSeedScenario}
              disabled={seeding}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Wand2 className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'Seeding Yassine Scenario...' : 'Seed Yassine Demo Scenario'}</span>
            </button>
            {seedSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Ready! Redirecting to Dashboard...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
