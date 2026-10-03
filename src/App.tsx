import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Phone,
  MessageSquare,
  MapPin,
  Share2,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { Header } from './components/Header.js';
import { StoreHero } from './components/StoreHero.js';
import { FestivePrizesBanner } from './components/FestivePrizesBanner.js';
import { RegistrationForm } from './components/RegistrationForm.js';
import { GameSelector } from './components/GameSelector.js';
import { SpinWheel } from './components/SpinWheel.js';
import { ScratchCard } from './components/ScratchCard.js';
import { ResultCelebration } from './components/ResultCelebration.js';
import { GrandPrizesSection } from './components/GrandPrizesSection.js';
import { VisitStoreSection } from './components/VisitStoreSection.js';
import { PosterModal } from './components/PosterModal.js';
import { VerificationModal } from './components/VerificationModal.js';
import { AdminRouteGuard } from './components/AdminRouteGuard.js';
import { CampaignRulesModal } from './components/CampaignRulesModal.js';
import { api } from './services/api.js';
import { PublicConfigResponse, DrawEntry } from './types.js';

export default function App() {
  const [config, setConfig] = useState<PublicConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Draw Journey State
  // 0: Form, 1: Choice (Spin/Scratch), 2: Playing Game, 3: Revealed Result
  const [drawStep, setDrawStep] = useState<0 | 1 | 2 | 3>(0);
  const [customerData, setCustomerData] = useState<{
    fullName: string;
    mobile: string;
    billNumber?: string;
    locality?: string;
    entryId?: string;
  } | null>(null);
  const [selectedGame, setSelectedGame] = useState<'spin' | 'scratch' | null>(null);
  const [activeEntry, setActiveEntry] = useState<DrawEntry | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // SPA Route Path
  const [currentPath, setCurrentPath] = useState(window.location.pathname.toLowerCase());

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path.toLowerCase());
  };

  // Modals
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isPosterOpen, setIsPosterOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const drawSectionRef = useRef<HTMLDivElement>(null);

  // Fetch Public Configuration
  const loadConfig = async () => {
    try {
      const res = await api.getConfig();
      if (res.success) {
        setConfig(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();

    // Check query parameter ?entry=... or ?entryId=... or localStorage on page load/refresh (Requirement 4 & 7 & 10)
    const checkEntryStatusOnRefresh = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlEntryId = urlParams.get('entry') || urlParams.get('entryId') || urlParams.get('id');

      if (urlEntryId) {
        try {
          const statusRes = await api.getEntryStatus(urlEntryId);
          if (statusRes.alreadyPlayed && statusRes.entry) {
            setActiveEntry(statusRes.entry);
            setDrawStep(3); // Already played, locked result
            return;
          } else if (statusRes.can_play) {
            setCustomerData({
              fullName: statusRes.customerName || 'Valued Customer',
              mobile: '',
              entryId: statusRes.entryId || urlEntryId,
            });
            setDrawStep(1); // Ready to pick Spin or Scratch!
            setTimeout(() => {
              drawSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 400);
            return;
          }
        } catch (e) {
          console.warn('Failed to verify URL entry status:', e);
        }
      }

      // Check for previous saved entry in localStorage
      const saved = api.getLocalSavedEntry();
      if (saved && saved.id) {
        try {
          const statusRes = await api.getEntryStatus(saved.id);
          if (statusRes.alreadyPlayed && statusRes.entry) {
            setActiveEntry(statusRes.entry);
            setDrawStep(3);
          } else {
            api.clearLocalSavedEntry();
            setActiveEntry(null);
            setDrawStep(0);
          }
        } catch {
          setActiveEntry(saved);
          setDrawStep(3);
        }
      }
    };

    checkEntryStatusOnRefresh();

    // Connect to Server-Sent Events (SSE) for Realtime Updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === 'SHOP_PHOTO_CHANGED' ||
            data.type === 'MAPS_LINK_CHANGED' ||
            data.type === 'CAMPAIGN_SETTINGS_CHANGED' ||
            data.type === 'GIFTS_CHANGED' ||
            data.type === 'GRAND_PRIZES_CHANGED' ||
            data.type === 'ASSIGNMENTS_UPDATED'
          ) {
            loadConfig();
          }
        } catch {}
      };
    } catch (e) {
      console.warn('SSE not supported or failed to connect', e);
    }

    // Handle URL Path Routing (/lucky-draw, /verify, /poster, /rules)
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/verify')) {
      setIsVerifyOpen(true);
    } else if (path.startsWith('/poster')) {
      setIsPosterOpen(true);
    } else if (path.startsWith('/rules')) {
      setIsRulesOpen(true);
    } else if (path.startsWith('/lucky-draw')) {
      setTimeout(() => {
        drawSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }

    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname.toLowerCase());
    };
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      if (eventSource) eventSource.close();
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const scrollToDraw = () => {
    drawSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Step 1: Customer Form Submitted
  const handleRegistrationSuccess = (data: {
    fullName: string;
    mobile: string;
    billNumber?: string;
    locality?: string;
    entryId?: string;
  }) => {
    setCustomerData(data);
    setDrawStep(1); // Go to Game Choice
    scrollToDraw();
  };

  // Existing Entry Found during registration
  const handleAlreadyPlayed = (entry: DrawEntry) => {
    setActiveEntry(entry);
    setDrawStep(3); // Directly show locked result
    scrollToDraw();
  };

  // Step 2: Customer Selects Spin or Scratch
  const handleSelectGame = (type: 'spin' | 'scratch') => {
    setSelectedGame(type);
    setDrawStep(2); // Go to active game screen
    scrollToDraw();
  };

  // Atomic Backend Draw Execution for Spin/Scratch (CAMPAIGN SCOPED)
  const executeDraw = async (): Promise<DrawEntry> => {
    if (!customerData || !selectedGame) {
      throw new Error('Customer information or game type missing');
    }

    const campaignId = config?.campaign.id || 'meru-festive-2024';
    const res = await api.play({
      campaignId,
      fullName: customerData.fullName,
      mobile: customerData.mobile,
      billNumber: customerData.billNumber,
      locality: customerData.locality,
      gameType: selectedGame,
      entryId: customerData.entryId,
    });

    setActiveEntry(res.entry);
    return res.entry;
  };

  // Step 3: Game Completed & Confetti Burst
  const handleGameComplete = (entry: DrawEntry) => {
    setActiveEntry(entry);
    setDrawStep(3); // Result revealed
    scrollToDraw();
  };

  // Reset to let user view entry form or test again
  const handleResetView = () => {
    api.clearLocalSavedEntry();
    setActiveEntry(null);
    setCustomerData(null);
    setSelectedGame(null);
    setDrawStep(0);
    scrollToDraw();
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/lucky-draw`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Protected Admin Route Guard (/admin, /admin/login, /admin/*)
  if (currentPath.startsWith('/admin')) {
    return (
      <AdminRouteGuard
        currentPath={currentPath}
        onNavigate={navigateTo}
        onRefreshPublicConfig={loadConfig}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-4 animate-bounce">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-serif font-black text-white">
          MERU MOBILE SHOP
        </h2>
        <p className="text-xs text-amber-200/80 mt-1">Festive Lucky Draw लोड हो रहा है...</p>
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin mt-4" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
        <h2 className="text-lg font-bold text-white">सेवा अस्थायी रूप से अनुपलब्ध है</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1">{error}</p>
        <button
          onClick={loadConfig}
          className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
        >
          पुनः लोड करें (Retry)
        </button>
      </div>
    );
  }

  const { campaign, shop, gifts, grandPrizes } = config;

  return (
    <div className="min-h-screen bg-[#070E1A] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Header */}
      <Header
        shop={shop}
        onOpenAdmin={() => navigateTo('/admin')}
        onOpenVerify={() => setIsVerifyOpen(true)}
        onOpenPoster={() => setIsPosterOpen(true)}
      />

      <main className="flex-1">
        {/* Festive Hero Section with requested headlines & copy */}
        <StoreHero
          campaign={campaign}
          shop={shop}
          onStartClick={scrollToDraw}
          onOpenRules={() => setIsRulesOpen(true)}
        />

        {/* ATTRACTIVE TOP BANNER WITH ALL REAL PRODUCT PHOTOS & INTERACTIVE SHOWCASE */}
        <FestivePrizesBanner
          gifts={gifts}
          grandPrizes={grandPrizes}
          onPlayClick={scrollToDraw}
          onOpenRules={() => setIsRulesOpen(true)}
        />

        {/* INTERACTIVE LUCKY DRAW CAMPAIGN SECTION */}
        <section
          ref={drawSectionRef}
          id="lucky-draw-area"
          className="py-10 px-4 sm:px-6 relative scroll-mt-16"
        >
          <div className="max-w-xl mx-auto">
            {/* Step 0: Registration Form */}
            {drawStep === 0 && (
              <RegistrationForm
                campaignId={campaign.id}
                onSuccess={handleRegistrationSuccess}
                onAlreadyPlayed={handleAlreadyPlayed}
              />
            )}

            {/* Step 1: Choose Spin or Scratch */}
            {drawStep === 1 && customerData && (
              <GameSelector
                customerName={customerData.fullName}
                onSelectGame={handleSelectGame}
                spinEnabled={campaign.spinEnabled}
                scratchEnabled={campaign.scratchEnabled}
              />
            )}

            {/* Step 2: Spin Wheel */}
            {drawStep === 2 && selectedGame === 'spin' && (
              <div className="bg-slate-900/90 border border-blue-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md">
                <div className="text-center mb-4">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                    🎡 SPIN & WIN
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-white">
                    Wheel घुमाएँ और Gift खोलें
                  </h3>
                </div>

                <SpinWheel
                  gifts={gifts}
                  onSpinStart={executeDraw}
                  onSpinComplete={handleGameComplete}
                  soundEnabledDefault={false}
                />
              </div>
            )}

            {/* Step 2: Scratch Card */}
            {drawStep === 2 && selectedGame === 'scratch' && (
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md">
                <div className="text-center mb-4">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                    🎫 SCRATCH & WIN
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-white">
                    Scratch करें और Gift खोलें
                  </h3>
                </div>

                <ScratchCard
                  onScratchStart={executeDraw}
                  onScratchComplete={handleGameComplete}
                  soundEnabledDefault={false}
                />
              </div>
            )}

            {/* Step 3: Congratulations & Result Card */}
            {drawStep === 3 && activeEntry && (
              <div className="space-y-4">
                <ResultCelebration
                  entry={activeEntry}
                  shop={shop}
                  onVisitShopClick={() => {
                    const el = document.getElementById('visit-store-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />

                <div className="text-center">
                  <button
                    onClick={handleResetView}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>नया लकी ड्रॉ खेलें (New Participant Entry)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* GRAND FESTIVE PRIZES SECTION (TV, COOLER, AC, BIKE) */}
        <GrandPrizesSection grandPrizes={grandPrizes} />

        {/* OFFICIAL REAL SHOP STOREFRONT IDENTITY & PROMOTION SECTION */}
        <VisitStoreSection shop={shop} />

        {/* Social Sharing Strip */}
        <section className="py-8 px-4 bg-slate-950/80 border-t border-b border-slate-800/80 text-center">
          <div className="max-w-xl mx-auto">
            <h4 className="text-base font-serif font-black text-white mb-1">
              अपने दोस्तों व परिवार के साथ शेयर करें
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              गंज बासोदा के सबसे बड़े फेस्टिव लकी ड्रॉ में सबको शामिल होने का मौका दें
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🎉 Meru Mobile Shop का Diwali Dhamaka Lucky Draw शुरू हो गया है!\n🎁 Scratch & Win 🎡 Spin & Win 🏆 Grand Festive Prizes (TV, AC, Cooler, Bike)\nअपना Lucky Draw खेलने के लिए यहाँ क्लिक करें 👇\n${window.location.origin}/lucky-draw`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp पर भेजें</span>
              </a>

              <button
                onClick={copyPublicLink}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={() => setIsPosterOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>🖨️ दुकान का पोस्टर देखें</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-8 px-4 text-xs text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="font-serif font-black text-white text-sm">
              MERU MOBILE SHOP · GANJ BASODA
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tyoda Road, Near Pawan Automobile / Old Bus Stand, District Vidisha, M.P. – 464221
            </p>
            <p className="text-[11px] text-amber-300 mt-1">
              हेल्पलाइन: 9340259168 / 9584672211
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRulesOpen(true)}
              className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Campaign Rules</span>
            </button>
            <span>·</span>
            <button
              onClick={() => setIsVerifyOpen(true)}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Verify Coupon
            </button>
            <span>·</span>
            <button
              onClick={() => setIsPosterOpen(true)}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Shop Poster
            </button>
            <span>·</span>
            <button
              onClick={() => navigateTo('/admin')}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
            >
              Admin Portal
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto text-center text-[10px] text-slate-600 mt-6 pt-4 border-t border-slate-900">
          © 2026 MERU MOBILE SHOP. All rights reserved. Festive Lucky Draw Dhamaka.
        </div>
      </footer>

      {/* MODALS */}
      <VerificationModal
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
      />

      <PosterModal
        isOpen={isPosterOpen}
        onClose={() => setIsPosterOpen(false)}
        shop={shop}
      />

      <CampaignRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        campaign={campaign}
        shop={shop}
      />
    </div>
  );
}
