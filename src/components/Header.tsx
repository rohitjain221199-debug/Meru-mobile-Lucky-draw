import React from 'react';
import { Phone, MessageSquare, MapPin, ShieldCheck, Settings } from 'lucide-react';
import { ShopInfo } from '../types.js';

interface HeaderProps {
  shop: ShopInfo;
  onOpenAdmin: () => void;
  onOpenVerify: () => void;
  onOpenPoster: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  shop,
  onOpenAdmin,
  onOpenVerify,
  onOpenPoster,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-amber-500/20 text-slate-100">
      {/* Top micro-bar for quick shop contacts */}
      <div className="bg-gradient-to-r from-amber-950/80 via-blue-950/90 to-amber-950/80 px-3 py-1.5 border-b border-amber-500/10 text-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-200/90 font-medium truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="hidden sm:inline">गंभीर एवं भरोसेमंद सेवा</span>
            <span className="hidden sm:inline">·</span>
            <span className="truncate">Tyoda Road, Ganj Basoda</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`tel:${shop.phone1}`}
              className="flex items-center gap-1 text-slate-200 hover:text-amber-300 font-semibold transition-colors"
            >
              <Phone className="w-3 h-3 text-amber-400" />
              <span>{shop.phone1}</span>
            </a>
            <span className="text-slate-600 hidden xs:inline">|</span>
            <a
              href={`https://wa.me/91${shop.whatsapp}?text=${encodeURIComponent('नमस्ते Meru Mobile Shop, मुझे फेस्टिव लकी ड्रॉ के बारे में जानकारी चाहिए।')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              <span className="hidden xs:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1.5px] shadow-lg shadow-amber-500/20 shrink-0">
            <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-serif font-black text-amber-400 text-lg sm:text-xl">
              M
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-black tracking-wide text-base sm:text-lg text-white truncate">
                MERU MOBILE SHOP
              </h1>
              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider hidden sm:inline-block">
                Festive Dhamaka
              </span>
            </div>
            <p className="text-xs text-amber-200/80 truncate">
              {shop.subtitle || 'आपका अपना भरोसेमंद Mobile Store – Ganj Basoda'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onOpenPoster}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors"
            title="दुकान के लिए पोस्टर और QR कोड देखें"
          >
            🖨️ <span className="hidden lg:inline">प्रिंट पोस्टर &</span> QR
          </button>

          <button
            onClick={onOpenVerify}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-950/70 hover:bg-blue-900/80 border border-blue-600/40 text-blue-200 hover:text-white transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xs:inline">सत्यापन /</span> Verify
          </button>

          <button
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02]"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
