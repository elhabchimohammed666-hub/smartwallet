import React from 'react';
import { X, ExternalLink, Calendar, DollarSign, Tag, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReceiptViewerModal({ isOpen, onClose, receipt }) {
  const { formatCurrency } = useAuth();
  if (!isOpen || !receipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Receipt Details</h3>
            <p className="text-xs text-slate-500">{receipt.originalFilename || 'Receipt Image'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image view */}
          <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-2 min-h-[300px]">
            {receipt.imageUrl ? (
              <img
                src={receipt.imageUrl}
                alt="Receipt"
                className="max-h-[450px] w-auto object-contain rounded-lg shadow-sm"
              />
            ) : (
              <p className="text-xs text-slate-400">No image available</p>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Extracted Information</h4>

              <div className="flex items-center gap-3">
                <Store className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Merchant</p>
                  <p className="text-sm font-bold text-slate-800">{receipt.extractedData?.merchant || 'Unknown'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Total Amount</p>
                  <p className="text-sm font-extrabold text-emerald-600">
                    {formatCurrency(receipt.extractedData?.totalAmount || 0)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Date</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {receipt.extractedData?.date
                      ? new Date(receipt.extractedData.date).toLocaleDateString()
                      : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Suggested Category</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-800">
                    {receipt.extractedData?.suggestedCategoryName || 'Groceries'}
                  </span>
                </div>
              </div>
            </div>

            {/* Raw OCR Text */}
            {receipt.ocrRawText && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Raw OCR Text</h4>
                <pre className="p-3 bg-slate-100 rounded-xl text-[11px] font-mono text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap border border-slate-200">
                  {receipt.ocrRawText}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
