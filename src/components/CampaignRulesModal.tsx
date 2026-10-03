import React from 'react';
import { X, BookOpen, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Campaign, ShopInfo } from '../types.js';

interface CampaignRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  shop: ShopInfo;
}

export const CampaignRulesModal: React.FC<CampaignRulesModalProps> = ({
  isOpen,
  onClose,
  campaign,
  shop,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-black text-white text-base sm:text-lg">
                अभियान के आधिकारिक नियम एवं शर्तें
              </h3>
              <p className="text-[11px] text-amber-300 font-medium">
                {campaign.name} · {campaign.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-slate-200">
          <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs">
            <span className="font-bold text-white block mb-0.5">100% पारदर्शी एवं निष्पक्ष अभियान:</span>
            सभी उपहार सर्वर द्वारा पूर्व-आवंटित एवं प्रमाणित किए जाते हैं। किसी भी ग्राहक के साथ भेदभाव या ब्राउज़र में परिणाम बदलना संभव नहीं है।
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">1. पात्रता (Eligibility):</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  यह लकी ड्रॉ Meru Mobile Shop (Ganj Basoda) के सभी ग्राहकों एवं आगंतुकों के लिए खुला है। भाग लेने के लिए वैध 10-अंकों का भारतीय मोबाइल नंबर आवश्यक है।
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">2. प्रति मोबाइल सीमा (One Entry Per Campaign):</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  प्रत्येक ग्राहक वर्तमान अभियान में केवल एक बार भाग ले सकता है। यदि कोई ग्राहक पेज रिफ्रेश करता है या पुनः उसी नंबर से प्रवेश करता है, तो उसका पहले से लॉक किया गया परिणाम ही सुरक्षित रूप से प्रदर्शित होगा।
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">3. गेम का चयन (Spin vs Scratch):</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  ग्राहक Spin & Win (पहिया घुमाएँ) या Scratch & Win (कूपन स्क्रैच करें) में से कोई एक गेम चुन सकते हैं। दोनों में उपहार आवंटन सर्वर द्वारा समान निष्पक्षता से होता है।
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">4. त्वरित उपहार (Instant Gifts) बनाम मेगा ड्रा (Grand Prizes):</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  स्पीकर, फास्ट चार्जर, ईयरबड्स, पावर बैंक, एलईडी बल्ब, स्टैंड आदि तुरंत जीतने वाले उपहार हैं। <strong>TV, Cooler, AC और Bike जैसे बड़े पुरस्कारों का Final Mega Lucky Draw दीपावली पर अलग से दुकान पर आयोजित होगा।</strong>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">5. उपहार प्राप्त करने की विधि (Claim Procedure):</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  जीते गए उपहार को केवल Meru Mobile Shop के काउंटर (त्योंदा रोड, गंज बासोदा) पर अपनी Entry ID (उदा. <code className="text-amber-300 font-mono">MMS-2026-XXXXXXXX</code>) एवं पंजीकृत मोबाइल नंबर दिखाकर प्राप्त किया जा सकता है। एक बार क्लेम होने के बाद कूपन पुनः उपयोग नहीं हो सकता।
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">6. गोपनीयता (Privacy):</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  सार्वजनिक रूप से किसी भी ग्राहक का पूरा मोबाइल नंबर प्रदर्शित नहीं किया जाता (उदा. <code className="text-slate-300 font-mono">98******21</code>)। आपका डेटा केवल इस अभियान के सत्यापन हेतु सुरक्षित रखा जाता है।
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">7. उपलब्धता एवं अधिकार (Terms & Availability):</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  सभी उपहार स्टॉक की उपलब्धता के अधीन हैं। तकनीकी समस्या, अनुचित प्रयास या विवाद की स्थिति में Meru Mobile Shop का निर्णय अंतिम एवं सर्वमान्य रहेगा।
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300">8. विशेष पुरस्कार एवं आरक्षण नीति (Grand Prize & Special Reservation Policy):</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  एलईडी टीवी (LED TV), रेफ्रिजरेटर (Refrigerator) एवं मोटरसाइकिल (Bike) जैसे बंपर पुरस्कारों का आवंटन केवल अधिकृत स्टोर एडमिनिस्ट्रेशन द्वारा निर्धारित कूपन आवंटन / आधिकारिक पर्व ड्रा के माध्यम से 100% सुरक्षित रूप से किया जाता है। एक बार आधिकारिक रूप से आवंटित परिणाम में कोई गुप्त बदलाव संभव नहीं है तथा सभी आवंटन ऑडिट रिकॉर्ड में दर्ज होते हैं।
                </p>
              </div>
            </div>
          </div>

          {/* Store Contacts Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-white">MERU MOBILE SHOP</span>
              <p>Tyoda Road, Ganj Basoda · 📞 9340259168 / 9584672211</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              समझ गया (I Understand)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
