import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, FileText, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ReceiptReviewModal({ isOpen, onClose, extractedPayload, onSuccess }) {
  const { currency } = useAuth();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    merchant: '',
    date: '',
    totalAmount: '',
    categoryId: '',
    paymentMethod: 'Credit Card',
    notes: ''
  });
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (extractedPayload && categories.length > 0) {
      const data = extractedPayload.extractedData || {};
      const rawDate = data.date ? new Date(data.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

      // Match category
      let matchedCat = categories.find(
        (c) => c.name.toLowerCase() === (data.suggestedCategoryName || '').toLowerCase()
      );
      if (!matchedCat && categories.length > 0) {
        matchedCat = categories[0];
      }

      setFormData({
        merchant: data.merchant || '',
        date: rawDate,
        totalAmount: data.totalAmount || '',
        categoryId: matchedCat ? matchedCat._id : '',
        paymentMethod: 'Credit Card',
        notes: `Receipt from ${data.merchant || 'Store'}`
      });
    }
  }, [extractedPayload, categories]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories?type=expense');
      setCategories(res.data.data || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  if (!isOpen || !extractedPayload) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.totalAmount || Number(formData.totalAmount) <= 0) {
      setError('Please provide a valid total amount.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await api.post(`/receipts/${extractedPayload.receiptId}/confirm`, {
        merchant: formData.merchant,
        date: formData.date,
        totalAmount: Number(formData.totalAmount),
        categoryId: formData.categoryId,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes
      });

      if (onSuccess) onSuccess(res.data.data);
      onClose();
    } catch (err) {
      console.error('Confirmation failed', err);
      setError(err.response?.data?.message || 'Failed to confirm receipt transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Review & Confirm Receipt</h3>
              <p className="text-xs text-slate-500">Verify AI-extracted fields before creating transaction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Banner */}
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                OCR and AI successfully extracted transaction data. You can edit any field before confirming.
              </span>
            </div>
            {extractedPayload.extractedData?.confidence && (
              <span className="font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">
                {Math.round(extractedPayload.extractedData.confidence * 100)}% Confidence
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Merchant */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Merchant / Store Name</label>
              <input
                type="text"
                required
                value={formData.merchant}
                onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                placeholder="e.g. Marjane Market"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Total Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Amount ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Category</label>
                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> AI Suggestion
                </span>
              </div>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Payment">Mobile Payment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Toggle OCR Text */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowRawOcr(!showRawOcr)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showRawOcr ? 'Hide Raw OCR Text' : 'View Raw OCR Text'}</span>
            </button>
            {showRawOcr && (
              <pre className="mt-2 p-3 bg-slate-100 rounded-xl text-[11px] font-mono text-slate-700 max-h-36 overflow-y-auto whitespace-pre-wrap border border-slate-200">
                {extractedPayload.ocrRawText || 'No raw text available.'}
              </pre>
            )}
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Confirm & Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
