import React from 'react';
import { Sparkles, Gift, Disc, Trophy, ArrowDown } from 'lucide-react';
import { Campaign, ShopInfo } from '../types.js';

interface StoreHeroProps {
  campaign: Campaign;
  shop: ShopInfo;
  onStartClick: () => void;
  onOpenRules: () => void;
}

export const StoreHero: React.FC<StoreHeroProps> = ({
  campaign,
  shop,
  onStartClick,
  onOpenRules,
}) => {
  return (
    <section className="relative overflow-hidden pt-6 pb-12 px-4 sm:px-6">
      {/* Background festive ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-64 h-64 bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-72 h-72 bg-rose-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Festive Kicker */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-blue-500/20 to-amber-500/20 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-semibold mb-4 shadow-lg shadow-amber-950/40">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>NAVRATRI • DUSSEHRA • DIWALI DHAMAKA</span>
        </div>

        {/* Main Store Headline */}
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-serif font-black tracking-tight text-white mb-2 leading-tight">
          MERU MOBILE SHOP
        </h2>

        {/* Campaign Headline as required */}
        <div className="relative inline-block mb-3">
          <div className="text-2xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400 bg-clip-text text-transparent drop-shadow-sm">
            “इस बार त्योहार सिर्फ मनाइए नहीं… Gift भी जीतिए!”
          </div>
          <div className="h-1 w-24 sm:w-36 bg-gradient-to-r from-amber-500 to-blue-500 mx-auto rounded-full mt-2" />
        </div>

        <p className="text-sm sm:text-lg font-semibold text-amber-200/90 max-w-xl mx-auto mb-2">
          मोबाइल खरीदिए • Lucky Draw खेलिए • Gift जीतिए
        </p>

        <p className="text-xs text-slate-300 max-w-xl mx-auto mb-6">
          Tyoda Road, Ganj Basoda · Near Pawan Automobile / Old Bus Stand
        </p>

        {/* Two Options Highlight Cards as required */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto mb-8 text-left">
          <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-4 flex items-center gap-3 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 text-blue-400 text-2xl">
              🎡
            </div>
            <div>
              <div className="text-sm font-black text-white">SPIN & WIN</div>
              <div className="text-xs text-amber-200 font-medium">“Wheel घुमाएँ और Gift खोलें”</div>
              <div className="text-[10px] text-slate-400 mt-0.5">निश्चित लकी ड्रा पहिया</div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400 text-2xl">
              🎫
            </div>
            <div>
              <div className="text-sm font-black text-white">SCRATCH & WIN</div>
              <div className="text-xs text-amber-200 font-medium">“Scratch करें और Gift खोलें”</div>
              <div className="text-[10px] text-slate-400 mt-0.5">डिजिटल मैटेलिक कूपन</div>
            </div>
          </div>
        </div>

        {/* Primary CTA Button as requested: "LUCKY DRAW खेलें" */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <button
            onClick={onStartClick}
            className="w-full sm:w-auto px-10 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-serif font-black text-lg shadow-xl shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>LUCKY DRAW खेलें</span>
            <ArrowDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <span>* नियम व शर्तों के अधीन</span>
          <span>·</span>
          <button
            onClick={onOpenRules}
            className="text-amber-400 hover:underline font-semibold cursor-pointer"
          >
            अभियान के नियम देखें (Campaign Rules)
          </button>
        </div>
      </div>
    </section>
  );
};
