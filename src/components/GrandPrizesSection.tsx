import React from 'react';
import { Tv, Wind, Snowflake, Bike, Trophy, AlertCircle, Sparkles } from 'lucide-react';
import { GrandPrize } from '../types.js';

interface GrandPrizesSectionProps {
  grandPrizes: GrandPrize[];
}

export const GrandPrizesSection: React.FC<GrandPrizesSectionProps> = ({ grandPrizes }) => {
  const getPrizeIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'tv':
        return <Tv className="w-8 h-8 text-amber-400" />;
      case 'wind':
        return <Wind className="w-8 h-8 text-cyan-400" />;
      case 'snowflake':
        return <Snowflake className="w-8 h-8 text-blue-400" />;
      case 'bike':
        return <Bike className="w-8 h-8 text-rose-400" />;
      default:
        return <Trophy className="w-8 h-8 text-amber-400" />;
    }
  };

  return (
    <section className="py-12 px-4 sm:px-6 relative">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Trophy className="w-3.5 h-3.5 text-rose-400" />
            <span>Grand Festive Prizes</span>
          </div>

          <h3 className="text-2xl sm:text-4xl font-serif font-black text-white">
            बड़े इनामों का महा धमाका
          </h3>

          <p className="text-xs sm:text-sm text-amber-200/90 font-medium max-w-xl mx-auto mt-1">
            TV • COOLER • AC • BIKE
          </p>

          {/* CRITICAL DISCLAIMER CALLOUT AS REQUIRED BY BRIEF */}
          <div className="mt-4 max-w-2xl mx-auto p-3 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 border-2 border-amber-400/50 shadow-lg text-center">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-serif font-black text-sm sm:text-base">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Grand Prizes का Final Mega Lucky Draw अलग से होगा</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-1">
              (यह बड़े इनाम स्पिन/स्क्रैच में नहीं, बल्कि दीपावली पर दुकान पर होने वाले महा लकी ड्रा में निकाले जाएँगे)
            </p>
          </div>
        </div>

        {/* Grand Prize Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {grandPrizes.map((prize) => (
            <div
              key={prize.id}
              className="group relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 hover:border-amber-400/80 rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-amber-500/10 overflow-hidden"
            >
              {/* Image banner or icon display */}
              <div className="relative w-full h-36 rounded-xl overflow-hidden mb-4 bg-slate-950/80 border border-slate-800 flex items-center justify-center">
                {prize.image ? (
                  <img
                    src={prize.image}
                    alt={prize.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="p-4 rounded-full bg-slate-900 border border-slate-800">
                    {getPrizeIcon(prize.icon)}
                  </div>
                )}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-500/30 text-[10px] font-bold text-amber-300">
                  {prize.quantity} {prize.quantity > 1 ? 'Units' : 'Unit'}
                </div>
              </div>

              <div>
                <h4 className="text-base sm:text-lg font-serif font-black text-white group-hover:text-amber-300 transition-colors">
                  {prize.name}
                </h4>
                <p className="text-xs font-semibold text-amber-200/90 mt-0.5">
                  {prize.nameHi}
                </p>
                <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                  {prize.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Mega Draw Date:</span>
                <span className="text-amber-300 font-semibold">{prize.drawDate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
