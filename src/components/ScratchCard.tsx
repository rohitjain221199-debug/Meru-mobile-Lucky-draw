import React, { useRef, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Loader2, Gift as GiftIcon } from 'lucide-react';
import { DrawEntry } from '../types.js';
import { playScratchSound, playWinCelebration } from '../utils/audio.js';

interface ScratchCardProps {
  onScratchStart: () => Promise<DrawEntry>;
  onScratchComplete: (entry: DrawEntry) => void;
  soundEnabledDefault?: boolean;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({
  onScratchStart,
  onScratchComplete,
  soundEnabledDefault = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [assignedEntry, setAssignedEntry] = useState<DrawEntry | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scratchedPct, setScratchedPct] = useState(0);

  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const checkThrottle = useRef<number>(0);

  // Initialize and call server atomic allocation FIRST
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const entry = await onScratchStart();
        if (mounted) {
          setAssignedEntry(entry);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Scratch Card could not be loaded');
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize Canvas Foil Layer once entry is ready
  useEffect(() => {
    if (!assignedEntry || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create realistic metallic golden-silver foil gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#D4AF37'); // Metallic Gold
    gradient.addColorStop(0.3, '#FFF8DC'); // Light shimmer
    gradient.addColorStop(0.5, '#C5A059'); // Deep Gold
    gradient.addColorStop(0.7, '#E5E4E2'); // Platinum Silver
    gradient.addColorStop(1, '#996515'); // Dark Golden Amber

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative festive pattern on the foil
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let x = 0; x < width; x += 24) {
      for (let y = 0; y < height; y += 24) {
        ctx.beginPath();
        ctx.arc(x + 12, y + 12, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Border line inside
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Festive Hindi & English Text on Foil
    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'bold 18px Hind, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎁 ऊपर की परत हटाइए', width / 2, height / 2 - 20);

    ctx.font = 'bold 22px Cinzel, sans-serif';
    ctx.fillStyle = '#451a03';
    ctx.fillText('SCRATCH & WIN', width / 2, height / 2 + 10);

    ctx.font = '13px Hind, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('और देखिए आपका निश्चित Gift!', width / 2, height / 2 + 34);
  }, [assignedEntry]);

  // Scratch action handler
  const scratchAt = (clientX: number, clientY: number) => {
    if (!canvasRef.current || revealed || !assignedEntry) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();

    if (lastPoint.current) {
      ctx.lineWidth = 45;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    lastPoint.current = { x, y };

    if (soundEnabledDefault && Math.random() > 0.4) {
      playScratchSound();
    }

    // Periodically calculate scratched percentage
    const now = Date.now();
    if (now - checkThrottle.current > 180) {
      checkThrottle.current = now;
      calculateProgress(ctx, canvas.width, canvas.height);
    }
  };

  const calculateProgress = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const pixels = imgData.data;
      let transparent = 0;
      const total = pixels.length / 4;
      const step = 16; // Sample every 16th pixel for performance

      for (let i = 3; i < pixels.length; i += step * 4) {
        if (pixels[i] === 0) {
          transparent++;
        }
      }

      const percent = Math.round((transparent / (total / step)) * 100);
      setScratchedPct(percent);

      // Once 42% or more is cleared, auto complete reveal!
      if (percent >= 42 && !revealed && assignedEntry) {
        setRevealed(true);
        if (soundEnabledDefault) playWinCelebration();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#FEF08A'],
        });

        setTimeout(() => {
          onScratchComplete(assignedEntry);
        }, 1200);
      }
    } catch {
      // Ignore security errors if canvas tainted
    }
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    lastPoint.current = null;
    scratchAt(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    scratchAt(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  // Touch Handlers for Mobile screens
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    lastPoint.current = null;
    if (e.touches[0]) {
      scratchAt(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    if (e.touches[0]) {
      scratchAt(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900 border border-amber-500/20 rounded-2xl max-w-md mx-auto">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
        <p className="text-sm font-semibold text-white">कूपन तैयार किया जा रहा है...</p>
        <p className="text-xs text-slate-400 mt-1">Securing your lucky draw result</p>
      </div>
    );
  }

  if (error || !assignedEntry) {
    return (
      <div className="p-6 text-center bg-rose-950/40 border border-rose-500/30 rounded-2xl max-w-md mx-auto">
        <p className="text-sm font-bold text-rose-300 mb-2">कूपन लोड करने में समस्या आई</p>
        <p className="text-xs text-rose-200/80">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center max-w-md mx-auto px-2">
      <div className="w-full flex items-center justify-between mb-2 text-xs">
        <div className="text-amber-300 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>उंगली या माउस से सुनहरी परत को खुरचें</span>
        </div>
        <span className="text-slate-400 font-mono text-[11px]">
          {revealed ? '100% Revealed 🎉' : `${scratchedPct}% Scratched`}
        </span>
      </div>

      {/* Card Wrapper */}
      <div className="relative w-[320px] h-[340px] xs:w-[350px] xs:h-[360px] rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-2xl shadow-amber-500/20 bg-slate-950 select-none touch-none">
        {/* UNDERLYING PRIZE CARD (Revealed when foil is scratched) */}
        <div className="absolute inset-0 p-5 flex flex-col items-center justify-between text-center bg-gradient-to-b from-blue-950 via-slate-900 to-amber-950/40">
          <div className="w-full flex items-center justify-between border-b border-amber-500/20 pb-2">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              MERU MOBILE SHOP
            </span>
            <span className="text-[10px] font-mono text-slate-400 font-bold">
              {assignedEntry.id}
            </span>
          </div>

          <div className="my-auto flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-400/30 p-2 shadow-inner mb-3 flex items-center justify-center overflow-hidden">
              {assignedEntry.giftImage ? (
                <img
                  src={assignedEntry.giftImage}
                  alt={assignedEntry.giftName}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <GiftIcon className="w-10 h-10 text-amber-400" />
              )}
            </div>

            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-0.5">
              🎉 बधाई हो! आपने जीता
            </span>
            <h4 className="text-xl font-serif font-black text-white px-2">
              {assignedEntry.giftName}
            </h4>
            <p className="text-xs text-amber-200/80 font-medium mt-0.5">
              {assignedEntry.giftNameHi}
            </p>
          </div>

          <div className="w-full pt-2 border-t border-amber-500/20">
            <p className="text-[11px] text-slate-300 font-medium">
              दुकान पर यह कूपन दिखाकर अपना उपहार प्राप्त करें
            </p>
          </div>
        </div>

        {/* OVERLYING CANVAS FOIL LAYER */}
        <canvas
          ref={canvasRef}
          width={350}
          height={360}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing transition-opacity duration-700 ${
            revealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />
      </div>

      <div className="mt-4 text-center">
        {revealed ? (
          <button
            onClick={() => onScratchComplete(assignedEntry)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.02] cursor-pointer"
          >
            परिणाम देखें (View Congratulations)
          </button>
        ) : (
          <p className="text-xs text-slate-400">
            * 40% से अधिक स्क्रैच होने पर गिफ्ट अपने आप पूर्ण प्रकट हो जाएगा
          </p>
        )}
      </div>
    </div>
  );
};
