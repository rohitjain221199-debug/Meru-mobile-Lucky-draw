import React, { useState } from 'react';
import { Sparkles, Trophy, Gift, ArrowRight, Zap, CheckCircle2, Star, ChevronRight } from 'lucide-react';
import { Gift as GiftType, GrandPrize } from '../types.js';

interface FestivePrizesBannerProps {
  gifts: GiftType[];
  grandPrizes: GrandPrize[];
  onPlayClick: () => void;
  onOpenRules: () => void;
}

export const FestivePrizesBanner: React.FC<FestivePrizesBannerProps> = ({
  gifts,
  grandPrizes,
  onPlayClick,
  onOpenRules,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'bumper' | 'instant'>('all');
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    nameHi: string;
    image: string;
    description: string;
    tag: string;
    highlight: string;
    type: 'bumper' | 'instant';
  } | null>(null);

  // Curated list of all 15 authentic real products
  const allProducts = [
    // 5 Mega Bumper / Admin-Controlled Products
    {
      id: 'prod-bike',
      name: 'HERO / HONDA MOTORCYCLE BIKE',
      nameHi: 'ब्रांड न्यू मोटरसाइकिल',
      image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
      description: 'त्योहार का सबसे बड़ा महा बम्पर इनाम – 125cc माइलेज व पावर बाइक।',
      tag: '🏆 Maha Bumper Prize',
      type: 'bumper' as const,
      highlight: '125cc Mileage King'
    },
    {
      id: 'prod-tv',
      name: '43" 4K SMART ANDROID LED TV',
      nameHi: '43 इंच 4K स्मार्ट LED टीवी',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80',
      description: 'अल्ट्रा HD 4K बेज़ेल-लेस डिस्प्ले, डॉल्बी ऑडियो व स्मार्ट ऐप्स सपोर्ट।',
      tag: '📺 Mega Prize',
      type: 'bumper' as const,
      highlight: '4K Ultra HD Frameless'
    },
    {
      id: 'prod-fridge',
      name: 'DOUBLE DOOR REFRIGERATOR',
      nameHi: 'डबल डोर इन्वर्टर रेफ्रिजरेटर',
      image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80',
      description: '5-स्टार एनर्जी सेवर फ्रॉस्ट-फ्री डबल डोर आधुनिक रेफ्रिजरेटर।',
      tag: '❄️ Home Appliance',
      type: 'bumper' as const,
      highlight: '5-Star Energy Saver'
    },
    {
      id: 'prod-induction',
      name: 'SMART INDUCTION COOKTOP',
      nameHi: 'स्मार्ट इंडक्शन कुकटॉप',
      image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
      description: 'ऑटोमैटिक भारतीय कुकिंग प्रीसेट्स, फास्ट हीटिंग व टच कंट्रोल।',
      tag: '🍳 Smart Kitchen',
      type: 'bumper' as const,
      highlight: 'Touch Sensor Controls'
    },
    {
      id: 'prod-trolley',
      name: 'PREMIUM TRAVEL TROLLEY BAG',
      nameHi: 'प्रीमियम ट्रेवल ट्रॉली बैग',
      image: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?auto=format&fit=crop&w=800&q=80',
      description: 'मजबूत हार्ड-शेल पॉलीकार्बोनेट 360° स्पिनर 4-व्हील लगेज सूटकेस।',
      tag: '🧳 Travel Luggage',
      type: 'bumper' as const,
      highlight: '360° Spinner Wheels'
    },

    // 10 Smart Instant Customer Gifts
    {
      id: 'prod-box',
      name: 'MERU PREMIUM GIFT BOX',
      nameHi: 'मेरू प्रीमियम गिफ्ट बॉक्स',
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
      description: 'मेरू मोबाइल शॉप का एक्सक्लूसिव फेस्टिव लक्जरी गिफ्ट हैंपर।',
      tag: '🎁 Luxury Hamper',
      type: 'instant' as const,
      highlight: 'Festive Special Edition'
    },
    {
      id: 'prod-powerbank',
      name: '10,000 mAh SLIM POWER BANK',
      nameHi: '10,000 mAh स्लिम पावर बैंक',
      image: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?auto=format&fit=crop&w=800&q=80',
      description: 'ड्यूल USB हाई स्पीड फास्ट चार्जिंग, सेफ बैटरी बैकअप।',
      tag: '🔋 Fast Charging',
      type: 'instant' as const,
      highlight: 'Dual USB Output'
    },
    {
      id: 'prod-speaker',
      name: 'BLUETOOTH PORTABLE SPEAKER',
      nameHi: 'डीप बास ब्लूटूथ स्पीकर',
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80',
      description: 'दमदार बेस, वायरलेस कनेक्टिविटी और लॉन्ग बैटरी बैकअप।',
      tag: '🔊 Deep Bass Sound',
      type: 'instant' as const,
      highlight: 'Wireless Stereo Audio'
    },
    {
      id: 'prod-watch',
      name: 'AMOLED DISPLAY SMART WATCH',
      nameHi: 'फुल टच डिस्प्ले स्मार्ट वॉच',
      image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
      description: 'ब्लूटूथ कॉलिंग, हेल्थ व फिटनेस ट्रैकिंग, एचडी टच स्क्रीन।',
      tag: '⌚ Bluetooth Calling',
      type: 'instant' as const,
      highlight: 'Health & Fitness Track'
    },
    {
      id: 'prod-earbuds',
      name: 'TRUE WIRELESS TWS EARBUDS',
      nameHi: 'TWS वायरलेस ईयरबड्स',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      description: 'क्रिस्टल क्लियर साउंड, टच कंट्रोल्स व डिजिटल बैटरी डिस्प्ले केस।',
      tag: '🎵 Crystal Clear Audio',
      type: 'instant' as const,
      highlight: 'Touch Controls & Case'
    },
    {
      id: 'prod-headphone',
      name: 'OVER-EAR STEREO HEADPHONES',
      nameHi: 'ओवर-ईयर स्टीरियो हेडफोन',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      description: 'कुशन्ड ईयरकप्स, पॉवरफुल बेस और आरामदायक लिसनिंग एक्सपीरियंस।',
      tag: '🎧 Super Bass',
      type: 'instant' as const,
      highlight: 'Noise Isolating Cups'
    },
    {
      id: 'prod-neckband',
      name: 'MAGNETIC BLUETOOTH NECKBAND',
      nameHi: 'वायरलेस मैग्नेटिक नेकबैंड',
      image: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=800&q=80',
      description: 'फास्ट चार्जिंग, मैग्नेटिक लॉक और स्पष्ट कॉलिंग माइक।',
      tag: '📿 Magnetic Earphones',
      type: 'instant' as const,
      highlight: 'Fast Charge Tech'
    },
    {
      id: 'prod-weight',
      name: 'DIGITAL BODY WEIGHT SCALE',
      nameHi: 'डिजिटल इलेक्ट्रॉनिक वेट मशीन',
      image: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=800&q=80',
      description: 'मजबूत टेम्पर्ड ग्लास, ऑटो ऑन-ऑफ व सटीक डिजिटल LCD डिस्प्ले।',
      tag: '⚖️ High Precision',
      type: 'instant' as const,
      highlight: 'Tempered Glass LCD'
    },
    {
      id: 'prod-voucher',
      name: '₹500 INSTANT CASH DISCOUNT',
      nameHi: '₹500 फ्लैट डिस्काउंट वाउचर',
      image: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80',
      description: 'मोबाइल या एक्सेसरीज़ की खरीद पर तुरंत ₹500 की फ्लैट छूट।',
      tag: '🎟️ Cash Discount',
      type: 'instant' as const,
      highlight: 'Flat ₹500 Off Bill'
    },
    {
      id: 'prod-tripod',
      name: 'BLUETOOTH SELFIE STICK & TRIPOD',
      nameHi: 'सेल्फी स्टिक व ट्राइपॉड स्टैंड',
      image: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=800&q=80',
      description: 'वायरलेस रिमोट, 360° रोटेशन व एक्सटेंडेबल मजबूत ट्राइपॉड स्टैंड।',
      tag: '🤳 Camera Tripod',
      type: 'instant' as const,
      highlight: 'Bluetooth Remote'
    },
  ];

  const displayedProducts = allProducts.filter((p) => {
    if (activeTab === 'bumper') return p.type === 'bumper';
    if (activeTab === 'instant') return p.type === 'instant';
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-8">
      {/* GRAND TOP BANNER CONTAINER */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-amber-400/60 bg-gradient-to-b from-[#141B2D] via-[#0B1120] to-[#070D18] shadow-2xl shadow-amber-950/50">
        {/* Festive Golden Garland & Lighting Border */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 via-rose-500 to-amber-500 animate-pulse" />
        
        {/* Decorative corner glow */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Banner Top Header */}
        <div className="p-6 sm:p-8 text-center relative z-10 border-b border-amber-500/20">
          {/* Festive Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>त्योहारों का सबसे बड़ा लकी ड्रा महा उत्सव</span>
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[11px] sm:text-xs font-bold">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>100% निश्चित गिफ्ट गारंटी</span>
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 tracking-tight drop-shadow-md">
            MERU MOBILE SHOP • GANJ BASODA
          </h1>

          <div className="text-lg sm:text-2xl md:text-3xl font-black text-white mt-1">
            नवरत्न महा धमाका लकी ड्रा 2026
          </div>

          <p className="text-xs sm:text-sm text-amber-200/90 max-w-2xl mx-auto mt-2 font-medium">
            नया स्मार्टफोन या एक्सेसरी खरीदिए और घर ले जाइए बाइक, 4K LED TV, फ्रिज, वॉच, पावर बैंक या आकर्षक गिफ्ट्स!
          </p>

          {/* Top Quick Actions Bar */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onPlayClick}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-serif font-black text-sm sm:text-base shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-slate-950" />
              <span>अभी Lucky Draw खेलें (Spin / Scratch)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenRules}
              className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              नियम व शर्तें (Campaign Rules)
            </button>
          </div>
        </div>

        {/* REAL PRODUCT SHOWCASE GALLERY */}
        <div className="p-4 sm:p-6 bg-slate-950/60">
          {/* Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-serif font-black text-amber-300">
                🎁 असली उपहार गैलरी (Real Products Showcase):
              </span>
            </div>

            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                सभी 15 उपहार (All)
              </button>
              <button
                onClick={() => setActiveTab('bumper')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'bumper'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏆 महा बम्पर इनाम (5)
              </button>
              <button
                onClick={() => setActiveTab('instant')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'instant'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ स्मार्ट इंस्टेंट गिफ्ट्स (10)
              </button>
            </div>
          </div>

          {/* Product Cards Grid with Real Photography */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {displayedProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => setSelectedProduct(prod)}
                className="group relative bg-slate-900/90 border border-slate-800 hover:border-amber-400/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-amber-500/15 cursor-pointer overflow-hidden backdrop-blur-sm"
              >
                {/* Product Type Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-md ${
                      prod.type === 'bumper'
                        ? 'bg-rose-500/90 text-white border border-rose-400/50'
                        : 'bg-amber-500/90 text-slate-950 border border-amber-300/60'
                    }`}
                  >
                    {prod.tag}
                  </span>
                </div>

                {/* Real Product Picture */}
                <div className="relative w-full h-32 sm:h-36 rounded-xl overflow-hidden mb-2.5 bg-slate-950 flex items-center justify-center border border-slate-800/80 group-hover:border-amber-400/40">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
                </div>

                {/* Product Details */}
                <div>
                  <div className="text-[10px] text-amber-300 font-bold tracking-tight">
                    {prod.highlight}
                  </div>
                  <h4 className="text-xs sm:text-sm font-serif font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1 leading-snug">
                    {prod.name}
                  </h4>
                  <p className="text-[11px] text-amber-200/90 font-medium line-clamp-1 mt-0.5">
                    {prod.nameHi}
                  </p>
                </div>

                {/* View Details / Play Callout */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-amber-300">
                  <span>विवरण देखें</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Notice Banner below cards */}
          <div className="mt-6 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-amber-950/30 to-blue-950/40 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
              </div>
              <p className="text-xs text-slate-200">
                <strong className="text-amber-300">100% पारदर्शी व्यवस्था:</strong> कोई भी खाली हाथ नहीं जाएगा! हर ग्राहक को गारंटीड उपहार मिलेगा।
              </p>
            </div>

            <button
              onClick={onPlayClick}
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-serif font-black text-xs shrink-0 transition-colors cursor-pointer shadow-md"
            >
              लकी ड्रॉ फॉर्म भरें
            </button>
          </div>
        </div>
      </div>

      {/* PRODUCT QUICK VIEW MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400/60 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Image */}
            <div className="relative w-full h-56 bg-slate-950 overflow-hidden">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shadow-md">
                  {selectedProduct.tag}
                </span>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-950/80 text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6">
              <div className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                {selectedProduct.highlight}
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-black text-white mt-1">
                {selectedProduct.name}
              </h3>
              <p className="text-sm font-semibold text-amber-200 mt-0.5">
                {selectedProduct.nameHi}
              </p>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                {selectedProduct.description}
              </p>

              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selectedProduct.type === 'bumper'
                      ? 'दीपावली महा ड्रा के अंतर्गत शामिल'
                      : 'Spin / Scratch में तुरंत जीतने योग्य'}
                  </span>
                </div>
                <p className="text-slate-400">
                  मेरू मोबाइल शॉप पर मोबाइल या एक्सेसरीज़ की प्रत्येक पात्र खरीद पर लकी ड्रॉ कूपन प्राप्त करें।
                </p>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    onPlayClick();
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-serif font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trophy className="w-4 h-4" />
                  <span>यह इनाम जीतने के लिए खेलें</span>
                </button>

                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  बंद करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
