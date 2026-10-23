import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Camera,
  ScanText,
  Sparkles,
  FileText,
  CheckCircle2,
  Clock,
  ExternalLink,
  Store,
  Calendar,
  DollarSign,
  Tag,
  AlertCircle
} from 'lucide-react';
import Header from '../components/Header';
import ReceiptReviewModal from '../components/ReceiptReviewModal';
import ReceiptViewerModal from '../components/ReceiptViewerModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ReceiptsPage() {
  const { formatCurrency } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

  // Modals
  const [reviewPayload, setReviewPayload] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/receipts');
      setReceipts(res.data.data || []);
    } catch (err) {
      console.error('Failed to load receipts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setUploadProgress('Uploading receipt image to backend...');

      const formData = new FormData();
      formData.append('receipt', file);

      setUploadProgress('Running OCR text recognition & AI categorization...');
      const res = await api.post('/receipts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadProgress('OCR complete! Opening review modal...');
      setReviewPayload(res.data.data);
      loadReceipts();
    } catch (err) {
      console.error('Upload failed', err);
      setError(err.response?.data?.message || 'Failed to process receipt image.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Receipt Scanner & OCR"
        subtitle="Automatic text extraction and AI-assisted categorization for shopping receipts"
        onRefresh={loadReceipts}
      />

      <div className="max-w-7xl mx-auto px-8 pt-6 space-y-8">
        {/* Step-by-Step Workflow Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>AI Receipt Processing Workflow</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Upload Image</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Drop receipt photo (JPEG, PNG, WEBP)</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800">OCR Extraction</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Tesseract reads printed text automatically</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800">AI Parsing</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Identifies Merchant, Total & Category</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800">User Validation</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Review, correct errors, and confirm</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
            uploading
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-slate-300 hover:border-emerald-500 bg-white'
          }`}
        >
          <input
            type="file"
            id="receipt-file-input"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              e.target.value = '';
            }}
          />

          {uploading ? (
            <div className="py-8 space-y-3">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Processing Receipt...</h4>
              <p className="text-xs text-slate-500">{uploadProgress}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  Drop your shopping receipt here, or{' '}
                  <label
                    htmlFor="receipt-file-input"
                    className="text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                  >
                    browse files
                  </label>
                </h4>
                <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, JPEG, WEBP up to 10MB</p>
              </div>

              {error && (
                <div className="max-w-md mx-auto p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Receipt History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Receipt History</h3>
              <p className="text-xs text-slate-500">
                Uploaded receipts linked to your transactions ({receipts.length} total)
              </p>
            </div>
          </div>

          {receipts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {receipts.map((receipt) => {
                const isConfirmed = receipt.status === 'confirmed';
                return (
                  <div
                    key={receipt._id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Image Thumbnail & Status */}
                      <div className="relative h-44 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center group cursor-pointer"
                        onClick={() => setViewingReceipt(receipt)}
                      >
                        <img
                          src={receipt.imageUrl}
                          alt={receipt.originalFilename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                          <ExternalLink className="w-4 h-4" /> View Full
                        </div>
                        <span
                          className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                            isConfirmed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                          }`}
                        >
                          {isConfirmed ? 'Confirmed' : 'Pending Review'}
                        </span>
                      </div>

                      {/* Extracted Details */}
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {receipt.extractedData?.merchant || 'Shopping Receipt'}
                          </h4>
                          <span className="text-sm font-extrabold text-emerald-600">
                            {formatCurrency(receipt.extractedData?.totalAmount || 0)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {receipt.extractedData?.date
                              ? new Date(receipt.extractedData.date).toLocaleDateString()
                              : 'Date unknown'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-[11px] text-slate-700">
                            {receipt.extractedData?.suggestedCategoryName || 'Groceries'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => setViewingReceipt(receipt)}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        Inspect
                      </button>
                      {!isConfirmed && (
                        <button
                          onClick={() => {
                            setReviewPayload({
                              receiptId: receipt._id,
                              imageUrl: receipt.imageUrl,
                              ocrRawText: receipt.ocrRawText,
                              extractedData: receipt.extractedData
                            });
                          }}
                          className="flex-1 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                          Review & Confirm
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
              <Camera className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-xs">No receipts uploaded yet. Drop a receipt image above to get started!</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <ReceiptReviewModal
        isOpen={!!reviewPayload}
        onClose={() => setReviewPayload(null)}
        extractedPayload={reviewPayload}
        onSuccess={loadReceipts}
      />

      {/* Viewer Modal */}
      <ReceiptViewerModal
        isOpen={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        receipt={viewingReceipt}
      />
    </div>
  );
}
