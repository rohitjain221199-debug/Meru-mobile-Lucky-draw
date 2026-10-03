import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Printer, Download, Sparkles, Phone, MapPin, Store } from 'lucide-react';
import { ShopInfo } from '../types.js';

interface PosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopInfo;
}

export const PosterModal: React.FC<PosterModalProps> = ({ isOpen, onClose, shop }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Use single public campaign URL: /lucky-draw
    const publicUrl = `${window.location.origin}/lucky-draw`;

    QRCode.toDataURL(publicUrl, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0B192C',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed generating QR code', err));
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Top Modal Controls (Hidden when printing) */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-amber-300">
              🖨️ Meru Mobile Shop – A4 Festive Campaign Poster
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (Ready for High-Res Large Format Printing)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>पोस्टर प्रिंट करें (Print)</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE POSTER CONTAINER (A4 Proportion) */}
        <div className="overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-950/50">
          <div
            ref={posterRef}
            className="w-full max-w-[560px] bg-gradient-to-b from-[#0B192C] via-[#081120] to-[#050C18] text-white border-4 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden print:w-full print:max-w-none print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* Golden Header Border */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600" />

            {/* Poster Header */}
            <div className="text-center pt-2 mb-4">
              <div className="inline-block px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
                नवरात्रि • दशहरा • दीपावली धमाका
              </div>

              <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-white mb-0.5">
                MERU MOBILE SHOP
              </h2>

              <p className="text-xs sm:text-sm font-semibold text-amber-200">
                {shop.subtitle || 'आपका अपना भरोसेमंद Mobile Store – Ganj Basoda'}
              </p>
            </div>

            {/* Lucky Draw Main Headline */}
            <div className="text-center my-3 bg-gradient-to-r from-amber-500/20 via-blue-600/30 to-amber-500/20 py-3 rounded-2xl border border-amber-400/40 shadow-inner">
              <div className="text-3xl sm:text-5xl font-serif font-black tracking-wider text-amber-300 drop-shadow-md">
                LUCKY DRAW
              </div>
              <p className="text-xs sm:text-sm font-bold text-white mt-1">
                मोबाइल खरीदिए • Lucky Draw खेलिए • Gift जीतिए
              </p>
            </div>

            {/* Middle Section: Real Shop Photo & Interactive Draw Modes */}
            <div className="grid grid-cols-2 gap-3 my-4">
              {/* Authentic Shop Photo thumbnail */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400/50 bg-slate-900 h-36 sm:h-44 shadow-lg">
                <img
                  src={shop.photoUrl}
                  alt="Meru Mobile Shop Storefront"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 py-1 px-2 text-center text-[10px] font-bold text-amber-300 border-t border-amber-500/30">
                  📍 Tyoda Road, Ganj Basoda
                </div>
              </div>

              {/* Draw types */}
              <div className="flex flex-col justify-between gap-2">
                <div className="bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-500/40 rounded-xl p-2.5 sm:p-3 text-center">
                  <span className="text-lg">🎡</span>
                  <div className="font-bold text-xs sm:text-sm text-white">SPIN & WIN</div>
                  <div className="text-[10px] text-blue-200">Wheel घुमाइए और Gift जीतिए</div>
                </div>

                <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 rounded-xl p-2.5 sm:p-3 text-center">
                  <span className="text-lg">🎁</span>
                  <div className="font-bold text-xs sm:text-sm text-white">SCRATCH & WIN</div>
                  <div className="text-[10px] text-amber-200">Scratch करके Gift खोलिए</div>
                </div>
              </div>
            </div>

            {/* Grand Festive Prizes Banner */}
            <div className="my-4 bg-gradient-to-r from-rose-950/70 via-slate-900 to-rose-950/70 border-2 border-rose-500/50 rounded-2xl p-3 text-center shadow-lg">
              <span className="text-[10px] font-black tracking-widest uppercase text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30 inline-block mb-1">
                GRAND FESTIVE PRIZES
              </span>
              <div className="text-base sm:text-xl font-serif font-black text-amber-300 tracking-wide">
                TV • COOLER • AC • BIKE
              </div>
              <div className="text-[11px] font-bold text-rose-200 mt-1">
                * Grand Prizes का Final Mega Lucky Draw अलग से होगा *
              </div>
            </div>

            {/* Dynamic QR Code & Scan Instructions */}
            <div className="my-4 p-3 bg-white text-slate-950 rounded-2xl flex items-center justify-between gap-4 shadow-xl">
              <div className="text-left pl-2">
                <span className="text-xs font-black text-blue-950 uppercase tracking-wider block">
                  Scan & Play Instant Draw
                </span>
                <p className="text-sm font-serif font-black text-slate-900 mt-0.5 leading-snug">
                  अपना Lucky Draw खेलने के लिए QR Scan करें!
                </p>
                <p className="text-[10px] text-slate-600 mt-1">
                  100% निश्चित उपहार • अपने स्मार्टफोन से तुरंत खेलें
                </p>
              </div>

              {qrDataUrl && (
                <div className="shrink-0 p-1 bg-slate-100 rounded-xl border border-slate-300">
                  <img src={qrDataUrl} alt="Lucky Draw QR Code" className="w-20 h-20 sm:w-24 sm:h-24" />
                </div>
              )}
            </div>

            {/* Bottom Footer Details */}
            <div className="pt-3 border-t border-amber-500/30 text-center text-xs space-y-1">
              <p className="font-serif font-black text-white text-sm">
                MERU MOBILE SHOP
              </p>
              <p className="text-slate-300 text-[11px]">
                Tyoda Road, Ganj Basoda · Near Pawan Automobile / Old Bus Stand · District Vidisha (M.P.) – 464221
              </p>
              <p className="text-amber-300 font-bold text-xs pt-1 flex items-center justify-center gap-3">
                <span>📞 9340259168</span>
                <span>·</span>
                <span>📞 9584672211</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
