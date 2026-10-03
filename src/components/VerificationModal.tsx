import React, { useState } from 'react';
import { X, Search, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Calendar, Ticket, User, Gift } from 'lucide-react';
import { api } from '../services/api.js';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.verifyEntry(query.trim());
      if (data.success && data.entry) {
        setResult(data.entry);
      } else {
        setError('रिकॉर्ड नहीं मिला। कृपया सही कूपन आईडी या मोबाइल नंबर दर्ज करें।');
      }
    } catch (err: any) {
      setError(err.message || 'सत्यापन करने में त्रुटि। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden p-6 animate-scale-up">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-serif font-black text-white text-lg">
              कूपन सत्यापन (Verification)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="mt-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Entry ID या 10-अंकों का मोबाइल नंबर दर्ज करें:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="उदा. MMS-2026-92841 या 9340259168"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>खोजें</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-5 p-4 rounded-xl bg-slate-950/90 border border-emerald-500/40 text-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>सत्यापित विजेता (Verified Genuine)</span>
              </span>
              <span className="font-mono text-slate-400 text-[10px]">{result.id}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">विजेता का नाम:</span>
              <span className="font-bold text-white text-sm">{result.customerName}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">मोबाइल:</span>
              <span className="font-mono text-slate-300">{result.customerMobile}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">उपहार (Gift Won):</span>
              <span className="font-bold text-amber-300 text-sm">{result.giftName}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">कूपन स्थिति:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                  result.resultStatus === 'claimed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {result.resultStatus === 'claimed' ? 'उपहार वितरित (Claimed)' : 'अभी क्लेम बाकी (Pending)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <span>दिनांक:</span>
              <span>{new Date(result.playedAt).toLocaleString('hi-IN')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
