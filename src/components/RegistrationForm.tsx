import React, { useState } from 'react';
import { User, Phone, Receipt, MapPin, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api.js';
import { DrawEntry } from '../types.js';

interface RegistrationFormProps {
  campaignId?: string;
  initialEntryId?: string;
  onSuccess: (data: {
    fullName: string;
    mobile: string;
    billNumber?: string;
    locality?: string;
    entryId?: string;
  }) => void;
  onAlreadyPlayed: (entry: DrawEntry) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  campaignId = 'meru-festive-2024',
  initialEntryId = '',
  onSuccess,
  onAlreadyPlayed,
}) => {
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [locality, setLocality] = useState('');
  const [entryId, setEntryId] = useState(initialEntryId);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const trimmedEntryId = entryId.trim();

    if (trimmedName.length < 2) {
      setError('कृपया अपना पूरा नाम दर्ज करें (Please enter full name)');
      return;
    }

    if (
      cleanMobile.length !== 10 ||
      !/^[6-9]\d{9}$/.test(cleanMobile) ||
      /^(\d)\1{9}$/.test(cleanMobile) ||
      cleanMobile === '1234567890'
    ) {
      setError('कृपया अपना सही 10 अंकों का मोबाइल नंबर दर्ज करें। इसी नंबर पर आपका Congratulations Message भेजा जाएगा।');
      return;
    }

    if (!agreed) {
      setError('कृपया नियमों और शर्तों के लिए सहमति टिक करें');
      return;
    }

    setLoading(true);
    try {
      // If entryId was provided, check its latest status first
      if (trimmedEntryId) {
        try {
          const entryStatus = await api.getEntryStatus(trimmedEntryId);
          if (entryStatus.alreadyPlayed && entryStatus.entry) {
            onAlreadyPlayed(entryStatus.entry);
            return;
          }
        } catch {}
      }

      // Verify if mobile already has a locked entry for this campaign
      const checkRes = await api.checkCustomer(cleanMobile, campaignId);
      if (checkRes.alreadyPlayed && checkRes.entry) {
        onAlreadyPlayed(checkRes.entry);
        return;
      }

      onSuccess({
        fullName: trimmedName,
        mobile: cleanMobile,
        billNumber: billNumber.trim() || undefined,
        locality: locality.trim() || undefined,
        entryId: trimmedEntryId || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'जाँच करने में समस्या आई। पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 sm:p-7 shadow-2xl shadow-blue-950/40 backdrop-blur-md relative overflow-hidden">
      {/* Decorative corner glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="mb-6 text-center">
        <h3 className="text-xl sm:text-2xl font-serif font-black text-white">
          Lucky Draw Entry Form
        </h3>
        <p className="text-xs sm:text-sm text-amber-200/80 mt-1">
          अपना नाम व मोबाइल नंबर दर्ज कर तुरंत लकी ड्रा खेलें
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Entry ID (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Entry ID / टोकन आईडी <span className="text-slate-500 text-[10px]">(यदि स्टोर बिल/मैसेज में प्राप्त हुई हो - optional)</span>
          </label>
          <div className="relative">
            <Receipt className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={entryId}
              onChange={(e) => setEntryId(e.target.value)}
              placeholder="उदा. MMS-2026-XXXXXXXX"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
            />
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            पूरा नाम (Customer Name) <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="उदा. राहुल जैन (Rahul Jain)"
              required
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
            />
          </div>
        </div>

        {/* Mobile Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            10-अंकों का मोबाइल नंबर (Mobile Number) <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400 text-xs font-bold border-r border-slate-700 pr-2">
              <span>+91</span>
            </div>
            <input
              type="tel"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="9340259168"
              required
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-16 pr-4 py-2.5 text-sm text-white placeholder-slate-500 font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            * 1 मोबाइल नंबर पर केवल 1 बार लकी ड्रा खेला जा सकता है
          </p>
        </div>

        {/* Bill / Order Number (Optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              बिल / टोकन नंबर <span className="text-slate-500 text-[10px]">(वैकल्पिक)</span>
            </label>
            <div className="relative">
              <Receipt className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="उदा. MMS-582"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              गांव / शहर (Locality) <span className="text-slate-500 text-[10px]">(वैकल्पिक)</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="उदा. गंज बासोदा / त्योंदा"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-950 cursor-pointer"
            />
            <span className="text-xs text-slate-300 leading-snug">
              मैं Meru Mobile Shop के इस festive lucky draw में भाग लेने के लिए सहमत हूँ एवं दुकान से उपहार प्राप्त करूँगा।
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-serif font-black text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>सत्यापित किया जा रहा है...</span>
            </>
          ) : (
            <>
              <span>PLAY NOW (आगे बढ़ें)</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
