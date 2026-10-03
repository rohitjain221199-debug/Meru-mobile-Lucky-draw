import React, { useState } from 'react';
import { Gift, Share2, MapPin, Phone, CheckCircle2, Ticket, Calendar, ShieldCheck, MessageSquare } from 'lucide-react';
import { DrawEntry, ShopInfo } from '../types.js';

interface ResultCelebrationProps {
  entry: DrawEntry;
  shop: ShopInfo;
  onVisitShopClick?: () => void;
  onPlayAnother?: () => void;
}

export const ResultCelebration: React.FC<ResultCelebrationProps> = ({
  entry,
  shop,
  onVisitShopClick,
}) => {
  const [imgError, setImgError] = useState(false);

  const formattedDate = new Date(entry.playedAt || entry.createdAt).toLocaleDateString('hi-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const whatsappShareText = `🎉 Congratulations!
मैंने MERU MOBILE SHOP के
Navratri – Dussehra – Diwali Lucky Draw
में Gift जीता है!

🎁 ${entry.giftName} (${entry.giftNameHi})
Entry ID: ${entry.id}

MERU MOBILE SHOP
Tyoda Road, Ganj Basoda
District Vidisha (M.P.) – 464221
Helpline: 9340259168 / 9584672211`;

  const shareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappShareText)}`;
  const hasMapsUrl = Boolean(shop.mapsUrl && shop.mapsUrl.trim().length > 0);

  return (
    <div className="bg-slate-900/95 border-2 border-amber-400/60 rounded-3xl p-6 sm:p-8 max-w-lg mx-auto shadow-2xl shadow-amber-500/20 text-center relative overflow-hidden backdrop-blur-xl animate-fade-in">
      {/* Decorative festive ambient banner */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-blue-500" />
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Verification & Lock Status Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-4">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>सर्वर द्वारा प्रमाणित & लॉक किया गया परिणाम</span>
      </div>

      {/* Header */}
      <h3 className="text-2xl sm:text-3xl font-serif font-black text-amber-300 tracking-wide mb-1">
        🎉 CONGRATULATIONS!
      </h3>
      <div className="text-lg sm:text-xl font-bold text-white mb-1">
        {entry.customerName}
      </div>
      <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-5">
        YOU WON
      </p>

      {/* Gift Highlight Box */}
      <div className="bg-gradient-to-b from-slate-950 to-blue-950/60 border border-amber-500/40 rounded-2xl p-5 mb-5 shadow-inner relative">
        <div className="w-32 h-32 sm:w-36 sm:h-36 mx-auto rounded-2xl bg-amber-500/10 border border-amber-400/40 p-2 shadow-lg mb-3 flex items-center justify-center overflow-hidden">
          {entry.giftImage && !imgError ? (
            <img
              src={entry.giftImage}
              alt={entry.giftName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-amber-400 p-2">
              <Gift className="w-14 h-14 text-amber-400 mb-1" />
              <span className="text-[10px] text-amber-300 font-bold">MERU MOBILE SHOP</span>
            </div>
          )}
        </div>

        <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
          <span>🎁</span>
          <span>{entry.giftName}</span>
        </div>
        <div className="text-sm font-semibold text-amber-200/90 mt-0.5">
          {entry.giftNameHi}
        </div>

        {/* Condition display for ₹500 OFF or specific gifts */}
        {(entry.condition || (entry.giftName && entry.giftName.includes('500'))) && (
          <div className="mt-3 inline-block bg-emerald-950/90 border border-emerald-500/50 rounded-xl px-3 py-1.5 text-xs font-medium text-emerald-300 text-left">
            <span className="font-bold text-emerald-200">लागू नियम: </span>
            <span>{entry.condition || 'मान्य न्यूनतम ₹2,000 की स्मार्टफोन अथवा एक्सेसरी खरीद पर'}</span>
          </div>
        )}

        {entry.voucherCode && (
          <div className="mt-2.5 inline-block bg-blue-950/80 border border-blue-500/40 rounded-lg px-3 py-1 text-xs font-mono font-bold text-blue-300">
            कूपन कोड: {entry.voucherCode}
          </div>
        )}
      </div>

      {/* Verified Claim Ticket Metadata */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-left mb-5 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-amber-400" />
            <span>लकी ड्रॉ Entry ID:</span>
          </span>
          <span className="font-mono font-black text-amber-300 text-sm tracking-wider">{entry.id}</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-slate-400">विजेता (Customer):</span>
          <span className="font-bold text-white">{entry.customerName}</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-slate-400">मोबाइल नंबर:</span>
          <span className="font-mono text-slate-300">{entry.customerMobile}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>दिनांक & समय:</span>
          </span>
          <span className="text-slate-300">{formattedDate}</span>
        </div>
      </div>

      {/* WhatsApp Delivery Status Badge */}
      {entry.whatsappStatus === 'sent' && (
        <div className="mb-4 py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Congratulations संदेश आपके WhatsApp नंबर पर भेज दिया गया है!</span>
        </div>
      )}

      {/* Shop Claim Instructions */}
      <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
        <p className="font-serif font-black text-white text-sm mb-0.5">MERU MOBILE SHOP</p>
        <p className="text-emerald-300 font-bold mb-1">“अपना gift लेने के लिए दुकान पर Entry ID/मोबाइल नंबर साथ लाएं।”</p>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Tyoda Road, Ganj Basoda, Near Pawan Automobile / Old Bus Stand, Vidisha (M.P.) – 464221
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.01]"
        >
          <Share2 className="w-4 h-4" />
          <span>व्हाट्सएप पर शेयर करें (Share on WhatsApp)</span>
        </a>

        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={`tel:${shop.phone1}`}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>Call Shop</span>
          </a>

          {hasMapsUrl ? (
            <a
              href={shop.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Get Directions</span>
            </a>
          ) : (
            <button
              onClick={onVisitShopClick}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Store Details</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
