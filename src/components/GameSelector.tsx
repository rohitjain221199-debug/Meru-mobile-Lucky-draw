import React from 'react';
import { Disc, Sparkles, ArrowRight } from 'lucide-react';

interface GameSelectorProps {
  customerName: string;
  onSelectGame: (type: 'spin' | 'scratch') => void;
  spinEnabled: boolean;
  scratchEnabled: boolean;
}

export const GameSelector: React.FC<GameSelectorProps> = ({
  customerName,
  onSelectGame,
  spinEnabled,
  scratchEnabled,
}) => {
  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 sm:p-8 shadow-2xl backdrop-blur-md">
      <div className="text-center mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          नमस्ते, {customerName}!
        </span>
        <h3 className="text-xl sm:text-2xl font-serif font-black text-white mt-2">
          अपना तरीका चुनें (Choose Your Game)
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Wheel घुमाकर या कूपन स्क्रैच करके अपना निश्चित उपहार जीतिए!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        {/* Spin & Win Card */}
        <button
          onClick={() => onSelectGame('spin')}
          disabled={!spinEnabled}
          className={`group relative overflow-hidden text-left p-5 sm:p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
            spinEnabled
              ? 'bg-gradient-to-br from-blue-950/80 to-slate-900 border-blue-500/40 hover:border-amber-400 hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.02] cursor-pointer'
              : 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 group-hover:text-amber-300 group-hover:border-amber-400/50 transition-colors">
              <Disc className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Interactive Wheel
            </span>
          </div>

          <div>
            <h4 className="text-lg font-serif font-black text-white group-hover:text-amber-300 transition-colors">
              🎡 SPIN & WIN
            </h4>
            <p className="text-xs text-amber-200/90 font-medium mt-0.5">
              “Wheel घुमाइए और Gift जीतिए”
            </p>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              डिजिटल व्हील को घुमाएँ, पहिया जिस उपहार पर रुकेगा वही गिफ्ट आपका होगा!
            </p>
          </div>

          <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
            <span>Spin शुरू करें</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>

        {/* Scratch & Win Card */}
        <button
          onClick={() => onSelectGame('scratch')}
          disabled={!scratchEnabled}
          className={`group relative overflow-hidden text-left p-5 sm:p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
            scratchEnabled
              ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/20 hover:scale-[1.02] cursor-pointer'
              : 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:text-amber-300 group-hover:border-amber-400/50 transition-colors">
              <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Metallic Foil Card
            </span>
          </div>

          <div>
            <h4 className="text-lg font-serif font-black text-white group-hover:text-amber-300 transition-colors">
              🎫 SCRATCH & WIN
            </h4>
            <p className="text-xs text-amber-200/90 font-medium mt-0.5">
              “Scratch करके Gift खोलिए”
            </p>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              अपनी उंगली या माउस से कूपन की सुनहरी परत को स्क्रैच करके तुरंत गिफ्ट खोलें!
            </p>
          </div>

          <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
            <span>Scratch शुरू करें</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
};
