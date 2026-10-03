import React from 'react';
import { Phone, MessageSquare, MapPin, Store, Smartphone, CreditCard, Sparkles, AlertCircle } from 'lucide-react';
import { ShopInfo } from '../types.js';

interface VisitStoreSectionProps {
  shop: ShopInfo;
}

export const VisitStoreSection: React.FC<VisitStoreSectionProps> = ({ shop }) => {
  const hasMapsUrl = Boolean(shop.mapsUrl && shop.mapsUrl.trim().length > 0);

  return (
    <section id="visit-store-section" className="py-12 px-4 sm:px-6 relative">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Store className="w-3.5 h-3.5 text-blue-400" />
            <span>Storefront & Business Identity</span>
          </div>

          <h3 className="text-2xl sm:text-4xl font-serif font-black text-white">
            MERU MOBILE SHOP
          </h3>

          <p className="text-sm font-semibold text-amber-300 mt-1">
            {shop.subtitle || 'आपका अपना भरोसेमंद Mobile Store – Ganj Basoda'}
          </p>

          <p className="text-xs font-bold text-emerald-400 mt-2">
            “आपका Gift यहीं से मिलेगा।”
          </p>
        </div>

        {/* Real Business Identity Showcase Card */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border-2 border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-blue-950/60">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Real Shop Photo Showcase Container */}
            <div className="lg:col-span-6 relative min-h-[300px] sm:min-h-[380px] bg-slate-950 overflow-hidden flex flex-col justify-end p-6">
              {/* Actual Real Shop Photograph */}
              <img
                src={shop.photoUrl}
                alt="Meru Mobile Shop Ganj Basoda Official Storefront"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />

              {/* Contrast protection overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />

              {/* Signboard Overlay Badge */}
              <div className="relative z-10 bg-slate-950/90 border border-amber-500/40 rounded-2xl p-4 backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    Official Storefront Photograph
                  </span>
                </div>
                <h4 className="text-lg font-serif font-black text-white">
                  MERU MOBILE SHOP
                </h4>
                <p className="text-xs text-slate-300">
                  Tyoda Road, Ganj Basoda – Near Old Bus Stand
                </p>
              </div>
            </div>

            {/* Shop Details & Call to Actions */}
            <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="mb-4">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                    भरोसे का प्रतीक · गंज बासोदा
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-serif font-black text-white mt-1">
                    MERU MOBILE SHOP
                  </h4>
                  <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                    “आपका Gift यहीं से मिलेगा।”
                  </p>
                </div>

                {/* Full Address Block */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-5 text-xs text-slate-200 space-y-1.5">
                  <div className="flex items-start gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-sm">दुकान का पूरा पता:</p>
                      <p className="leading-relaxed mt-0.5 text-slate-300">
                        Tyoda Road, Ganj Basoda,<br />
                        Near Pawan Automobile / Old Bus Stand,<br />
                        District Vidisha, Madhya Pradesh – 464221
                      </p>
                    </div>
                  </div>
                </div>

                {/* Offerings badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-center">
                    <Smartphone className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <span className="text-[11px] font-semibold text-white block">Smartphones</span>
                    <span className="text-[10px] text-slate-400">All Top Brands</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-center">
                    <Sparkles className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <span className="text-[11px] font-semibold text-white block">Accessories</span>
                    <span className="text-[10px] text-slate-400">100% Genuine</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-center">
                    <CreditCard className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <span className="text-[11px] font-semibold text-white block">Easy Finance</span>
                    <span className="text-[10px] text-slate-400">0% EMI Available</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Phone Numbers & Directions */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                {/* 2 Call buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href={`tel:${shop.phone1}`}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-amber-400" />
                    <span>CALL NOW (9340259168)</span>
                  </a>

                  <a
                    href={`tel:${shop.phone2}`}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-amber-400" />
                    <span>CALL NOW (9584672211)</span>
                  </a>
                </div>

                {/* WhatsApp & Google Maps Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href={`https://wa.me/91${shop.whatsapp}?text=${encodeURIComponent('नमस्ते Meru Mobile Shop, मुझे मोबाइल व ऑफर्स के बारे में जानकारी चाहिए।')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WHATSAPP ({shop.whatsapp})</span>
                  </a>

                  {hasMapsUrl ? (
                    <a
                      href={shop.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.01]"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>GET DIRECTIONS (Google Maps)</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      title="Google Maps link not configured in Admin Settings"
                      className="py-3 px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-500 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>GET DIRECTIONS (Link Not Set)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
