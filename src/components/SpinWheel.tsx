import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, Sparkles, Loader2 } from 'lucide-react';
import { Gift, DrawEntry } from '../types.js';
import { playTickSound, playWinCelebration } from '../utils/audio.js';

interface SpinWheelProps {
  gifts: Gift[];
  onSpinStart: () => Promise<DrawEntry>;
  onSpinComplete: (entry: DrawEntry) => void;
  soundEnabledDefault?: boolean;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  gifts,
  onSpinStart,
  onSpinComplete,
  soundEnabledDefault = false,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [sound, setSound] = useState(soundEnabledDefault);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wheelRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTickSliceRef = useRef<number>(-1);

  const numSlices = Math.max(gifts.length, 1);
  const sliceAngle = 360 / numSlices;

  // Clean vibrant segment color palette
  const colors = [
    '#1E3A8A', // Deep Blue
    '#B45309', // Amber Gold
    '#065F46', // Deep Emerald
    '#6D28D9', // Deep Purple
    '#BE185D', // Deep Rose
    '#0E7490', // Cyan Teal
    '#C2410C', // Orange
    '#3730A3', // Indigo
    '#15803D', // Green
    '#854D0E', // Bronze
    '#047857', // Forest
  ];

  const handleSpin = async () => {
    if (spinning) return;
    setError(null);
    setSpinning(true);

    try {
      // 1. BACKEND DECIDES FIRST: Call server to allocate prize atomically
      const entry = await onSpinStart();

      // 2. Find target slice index for this prize
      const targetIndex = gifts.findIndex((g) => g.id === entry.giftId);
      const safeIndex = targetIndex >= 0 ? targetIndex : 0;

      // Slice angle math:
      // In SVG circle, segment 0 starts at angle 0.
      // Top pointer is at 270 degrees (or -90 degrees).
      // Center of segment `safeIndex` is `safeIndex * sliceAngle + sliceAngle / 2`.
      // To bring this angle to 270 degrees (top pointer):
      // Calculate precise rotation to land exactly at top pointer (270 deg)
      const sliceCenter = safeIndex * sliceAngle + sliceAngle / 2;
      const fullRotations = 8 + Math.floor(Math.random() * 2); // 8-9 full high-speed spins for 5-second excitement
      const currentNorm = rotation % 360;
      let targetDeg = 270 - sliceCenter;
      while (targetDeg < currentNorm) {
        targetDeg += 360;
      }
      const finalDeg = targetDeg + fullRotations * 360;

      // EXACTLY 5.0 SECONDS (5000ms) suspenseful spin duration for maximum customer excitement
      const startTime = performance.now();
      const spinDuration = 5000; // Exactly 5.0 seconds
      const startDeg = rotation;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);

        // Quintic ease-out curve: high-speed thrill initially, followed by dramatic slow-motion suspense over the last 2 seconds
        const easeOut = 1 - Math.pow(1 - progress, 4.2);
        const currentRot = startDeg + (finalDeg - startDeg) * easeOut;
        setRotation(currentRot);

        // Sound tick check as wheel passes segments
        if (sound) {
          const currentSlice = Math.floor((currentRot % 360) / sliceAngle);
          if (currentSlice !== lastTickSliceRef.current) {
            playTickSound();
            lastTickSliceRef.current = currentSlice;
          }
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Completed at 5.0 seconds!
          setSpinning(false);
          if (sound) playWinCelebration();

          // Confetti celebration
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#FEF08A'],
          });

          setTimeout(() => {
            onSpinComplete(entry);
          }, 600);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } catch (err: any) {
      setSpinning(false);
      setError(err.message || 'Spin failed to initiate. Please try again.');
    }
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center max-w-md mx-auto px-2">
      {/* Sound toggle & Info bar */}
      <div className="w-full flex items-center justify-between mb-3 px-2 text-xs">
        <div className="text-amber-300 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Wheel घुमाएँ और निश्चित Gift जीतें</span>
        </div>

        <button
          onClick={() => setSound(!sound)}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-700/60 px-2 py-1 rounded-md transition-colors cursor-pointer"
        >
          {sound ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{sound ? 'Sound ON' : 'Muted'}</span>
        </button>
      </div>

      {error && (
        <div className="w-full mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-center">
          {error}
        </div>
      )}

      {/* Outer Wheel Container */}
      <div className="relative w-[320px] h-[320px] xs:w-[350px] xs:h-[350px] sm:w-[380px] sm:h-[380px] flex items-center justify-center select-none">
        {/* Outer Festive Gold Ring with LED Dots */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-600 via-amber-300 to-amber-600 p-2 shadow-2xl shadow-amber-500/20">
          <div className="w-full h-full rounded-full bg-slate-950 p-1 relative overflow-hidden flex items-center justify-center">
            {/* LED bulbs ring */}
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 360) / 24;
              const rad = (angle * Math.PI) / 180;
              const r = 47.5; // percentage radius
              const left = 50 + r * Math.cos(rad);
              const top = 50 + r * Math.sin(rad);
              return (
                <div
                  key={i}
                  className={`absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                    i % 2 === 0 ? 'bg-amber-300 shadow-[0_0_6px_#fde047]' : 'bg-blue-300 shadow-[0_0_6px_#93c5fd]'
                  }`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                />
              );
            })}

            {/* Rotating Wheel Canvas/SVG */}
            <div
              ref={wheelRef}
              className="w-full h-full rounded-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  {gifts.map((_, i) => (
                    <radialGradient key={`grad-${i}`} id={`grad-${i}`} cx="50%" cy="50%" r="50%">
                      <stop offset="60%" stopColor={colors[i % colors.length]} />
                      <stop offset="100%" stopColor="#0B132B" stopOpacity="0.8" />
                    </radialGradient>
                  ))}
                </defs>

                {gifts.map((gift, i) => {
                  const startAngle = (i * sliceAngle * Math.PI) / 180;
                  const endAngle = ((i + 1) * sliceAngle * Math.PI) / 180;
                  const x1 = 200 + 190 * Math.cos(startAngle);
                  const y1 = 200 + 190 * Math.sin(startAngle);
                  const x2 = 200 + 190 * Math.cos(endAngle);
                  const y2 = 200 + 190 * Math.sin(endAngle);

                  const pathData = `M 200 200 L ${x1} ${y1} A 190 190 0 0 1 ${x2} ${y2} Z`;
                  const textAngle = i * sliceAngle + sliceAngle / 2;

                  return (
                    <g key={gift.id}>
                      <path
                        d={pathData}
                        fill={`url(#grad-${i})`}
                        stroke="#FEF08A"
                        strokeWidth="1.2"
                      />
                      {/* Segment text */}
                      <g
                        transform={`rotate(${textAngle}, 200, 200) translate(280, 200)`}
                      >
                        <text
                          textAnchor="end"
                          dominantBaseline="central"
                          fill="#FFFFFF"
                          fontSize="11"
                          fontWeight="700"
                          fontFamily="sans-serif"
                          className="drop-shadow-sm select-none"
                        >
                          {gift.name.length > 16 ? `${gift.name.slice(0, 15)}…` : gift.name}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Center Golden Hub / Brand Emblem */}
            <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 p-1 shadow-xl flex items-center justify-center z-10 pointer-events-none">
              <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center text-center p-0.5 border border-amber-300/40">
                <span className="font-serif font-black text-amber-300 text-[10px] leading-tight tracking-wider">
                  MERU
                </span>
                <span className="text-[7px] text-slate-300 font-semibold tracking-tighter">
                  SHOP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Pointer Needle with Golden Arrow */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-xl">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[26px] border-t-amber-400 filter drop-shadow(0 2px 4px rgba(0,0,0,0.6))" />
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white absolute -top-5 left-1/2 -translate-x-1/2 shadow-sm" />
        </div>
      </div>

      {/* Spin Button */}
      <div className="w-full mt-6">
        <button
          onClick={handleSpin}
          disabled={spinning}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-serif font-black text-lg shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          {spinning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
              <span className="animate-pulse">घूम रहा है... आपका भाग्य तय हो रहा है! 🎉</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-slate-950" />
              <span>SPIN NOW (Wheel घुमाएँ)</span>
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-slate-400 mt-2">
          सुरक्षित सर्वर द्वारा निष्पक्ष आवंटन (100% Guaranteed Gift)
        </p>
      </div>
    </div>
  );
};
