import React, { useState, useEffect } from 'react';
import {
  Target,
  Shuffle,
  Bookmark,
  Calendar,
  Clock,
  History,
  FileText,
  AlertTriangle,
  Search,
  CheckCircle2,
  X,
  UserCheck,
  Package,
  Layers,
  Sparkles,
  ShieldAlert,
  Loader2,
  Trash2,
  Edit3,
  RefreshCw,
  Info,
  Plus,
  Copy,
  Percent,
  Image as ImageIcon,
  Check,
  Upload,
  ArrowRight,
  TrendingUp,
  Zap,
  Phone,
  User,
  Ticket
} from 'lucide-react';
import { api } from '../services/api.js';
import { AdminStats, Gift, PrizeAssignment, DrawEntry } from '../types.js';

interface PrizeControlCenterProps {
  stats: AdminStats;
  onRefreshStats: () => Promise<void>;
  showFeedback: (msg: string) => void;
  adminUser: { email: string; role: string } | null;
}

type MainTab = 'assign_live' | 'prizes' | 'probability' | 'inventory' | 'images' | 'history';

export const PrizeControlCenter: React.FC<PrizeControlCenterProps> = ({
  stats,
  onRefreshStats,
  showFeedback,
  adminUser,
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('assign_live');
  const [loading, setLoading] = useState(false);

  // Assignments & Audit list
  const [assignments, setAssignments] = useState<PrizeAssignment[]>(stats.assignments || []);
  const [auditLogs, setAuditLogs] = useState<any[]>(stats.recentAuditLogs || []);

  // PART 1: CUSTOMER / ENTRY SEARCH & SELECT STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Form State for Assignment
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>('');
  const [assignmentMode, setAssignmentMode] = useState<'ENTRY_SPECIFIC' | 'NEXT_ELIGIBLE' | 'SCHEDULED' | 'RESERVE_ONLY'>('ENTRY_SPECIFIC');
  const [reasonNote, setReasonNote] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  // Modals
  const [showGrandPrizeWarning, setShowGrandPrizeWarning] = useState(false);
  const [pendingAssignPayload, setPendingAssignPayload] = useState<any | null>(null);

  // Review & Activate Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAsgToActivate, setSelectedAsgToActivate] = useState<PrizeAssignment | null>(null);
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);

  // Cancellation Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedCancelId, setSelectedCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustEntryId, setAdjustEntryId] = useState<string | null>(null);
  const [adjustNewPrizeId, setAdjustNewPrizeId] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // PART 4: ADD NEW PRIZE MODAL
  const [addPrizeModalOpen, setAddPrizeModalOpen] = useState(false);
  const [newPrizeData, setNewPrizeData] = useState({
    name: '',
    nameHi: '',
    id: '',
    image: '',
    description: '',
    prizeType: 'SMART_RANDOM' as 'SMART_RANDOM' | 'ADMIN_CONTROLLED' | 'GRAND_PRIZE',
    probability: 5.0,
    totalQuantity: 10,
    minStock: 1,
    active: true,
    cooldown: 4,
    displayOrder: 11,
    notes: '',
    color: '#3B82F6',
  });
  const [rebalanceOnAdd, setRebalanceOnAdd] = useState(false);
  const [addingPrize, setAddingPrize] = useState(false);

  // PART 7: EDIT PRIZE MODAL
  const [editPrizeModalOpen, setEditPrizeModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Gift | null>(null);
  const [updatingPrize, setUpdatingPrize] = useState(false);

  // PART 5 & 6: PROBABILITY EDITOR STATE
  const [editingProbs, setEditingProbs] = useState<Record<string, number>>({});
  const [savingProbs, setSavingProbs] = useState(false);
  const [probSaveError, setProbSaveError] = useState<string | null>(null);

  // Filter for history
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchAssignments();
    fetchAuditLogs();
    initProbabilityState();
  }, [stats.gifts]);

  const initProbabilityState = () => {
    const map: Record<string, number> = {};
    for (const g of stats.gifts) {
      map[g.id] = Number(g.probability || 0);
    }
    setEditingProbs(map);
  };

  const fetchAssignments = async () => {
    try {
      const res = await api.getAssignments();
      if (res.success && res.assignments) {
        setAssignments(res.assignments);
      }
    } catch {
      if (stats.assignments) setAssignments(stats.assignments);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.getAuditLogs(100);
      if (res.success && res.logs) {
        setAuditLogs(res.logs);
      }
    } catch {}
  };

  // Grand Prize check
  const isGrandPrize = (prizeId: string) => {
    const gift = stats.gifts.find((g) => g.id === prizeId);
    if (!gift) return false;
    const lowerName = gift.name.toLowerCase();
    return (
      gift.mode === 'admin_controlled' ||
      gift.probability === 0 ||
      lowerName.includes('tv') ||
      lowerName.includes('refrigerator') ||
      lowerName.includes('bike') ||
      lowerName.includes('cooktop') ||
      lowerName.includes('trolley')
    );
  };

  // Real-time Stock Calculation considering pending assignments
  const getAvailableStock = (prizeId: string) => {
    const gift = stats.gifts.find((g) => g.id === prizeId);
    if (!gift) return 0;
    const pendingCount = assignments.filter(
      (a) => a.prizeId === prizeId && a.status === 'PENDING'
    ).length;
    return Math.max(0, (gift.remainingQuantity ?? 0) - pendingCount);
  };

  // PART 1: CUSTOMER SEARCH HANDLER
  const handleSearchCustomers = async (queryText: string) => {
    setSearchQuery(queryText);
    if (!queryText.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.searchCustomers(queryText.trim());
      if (res.success && res.results) {
        setSearchResults(res.results);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // SELECT CUSTOMER (PART 1.A & 1.B)
  const handleSelectCustomer = (cust: any) => {
    if (cust.playStatus === 'PLAYED') {
      alert(`⚠️ यह ग्राहक '${cust.customerName}' पहले ही Lucky Draw खेल चुका है! (Played: ${cust.finalPrize || 'Yes'})`);
      return;
    }
    setSelectedCustomer(cust);
    setSearchQuery('');
    setSearchResults([]);
    showFeedback(`✓ चयनित ग्राहक: ${cust.customerName} (${cust.entryId})`);
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomer(null);
  };

  // Handle Form Submit (Save Pending or Auto-Activate)
  const handleFormSubmit = async (
    e: React.FormEvent,
    autoActivate = false
  ) => {
    e.preventDefault();

    if (!selectedPrizeId) {
      alert('कृपया एक उपहार/पुरस्कार चुनें (Please select a prize)');
      return;
    }

    if (assignmentMode === 'ENTRY_SPECIFIC' && !selectedCustomer) {
      alert('कृपया "Select Customer / Entry" खोज बॉक्स से किसी मान्य ग्राहक को चुनें। (Please search and select a customer)');
      return;
    }

    const available = getAvailableStock(selectedPrizeId);
    if (available <= 0) {
      alert('ASSIGNMENT FAILED: इस उपहार का उपलब्ध स्टॉक समाप्त हो चुका है।');
      return;
    }

    let schedIso: string | undefined;
    if (assignmentMode === 'SCHEDULED') {
      if (!scheduledDate) {
        alert('कृपया शेड्यूल्ड तिथि (Date) चुनें');
        return;
      }
      const timeStr = scheduledTime || '12:00';
      schedIso = new Date(`${scheduledDate}T${timeStr}:00`).toISOString();
    }

    const payload = {
      prizeId: selectedPrizeId,
      mode: assignmentMode,
      targetEntryId: selectedCustomer ? selectedCustomer.entryId : undefined,
      targetMobile: selectedCustomer ? selectedCustomer.customerMobile : undefined,
      customerName: selectedCustomer ? selectedCustomer.customerName : undefined,
      billNumber: selectedCustomer ? selectedCustomer.billNumber : undefined,
      scheduledAt: schedIso,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      note: reasonNote.trim() || undefined,
      autoActivate,
    };

    // If Grand Prize and not auto-activating directly, confirm
    if (isGrandPrize(selectedPrizeId) && !autoActivate) {
      setPendingAssignPayload(payload);
      setShowGrandPrizeWarning(true);
      return;
    }

    await executeAssign(payload, autoActivate);
  };

  const executeAssign = async (payload: any, autoActivate: boolean) => {
    try {
      setLoading(true);
      const res = await api.assignPrize(payload);
      if (res.success && res.assignment) {
        const gift = stats.gifts.find((g) => g.id === payload.prizeId);

        if (autoActivate) {
          try {
            const actRes = await api.activateAssignment(res.assignment.id);
            if (actRes.success) {
              showFeedback(`🟢 LIVE / ACTIVE: '${gift?.name}' को ग्राहक ${payload.customerName || payload.targetEntryId} हेतु तुरंत LIVE कर दिया गया!`);
              resetAssignForm();
              await onRefreshStats();
              await fetchAssignments();
              await fetchAuditLogs();
              setActiveTab('assign_live');
              return;
            }
          } catch (actErr: any) {
            alert(`असाइनमेंट PENDING में बन गया परंतु एक्टिवेट नहीं हो सका: ${actErr.message}`);
          }
        } else {
          showFeedback(`✓ असाइनमेंट सुरक्षित हुआ (Status: PENDING): '${gift?.name}'`);
        }

        resetAssignForm();
        await onRefreshStats();
        await fetchAssignments();
        await fetchAuditLogs();
      }
    } catch (err: any) {
      alert(`असाइनमेंट विफल: ${err.message || 'त्रुटि हुई'}`);
    } finally {
      setLoading(false);
      setShowGrandPrizeWarning(false);
      setPendingAssignPayload(null);
    }
  };

  const resetAssignForm = () => {
    setSelectedCustomer(null);
    setSelectedPrizeId('');
    setReasonNote('');
    setScheduledDate('');
    setScheduledTime('');
    setExpiresAt('');
    setSearchQuery('');
    setSearchResults([]);
  };

  // ACTIVATE ASSIGNMENT HANDLER (PART 2)
  const openReviewAndActivateModal = (asg: PrizeAssignment) => {
    setSelectedAsgToActivate(asg);
    setActivateError(null);
    setReviewModalOpen(true);
  };

  const handleConfirmActivate = async () => {
    if (!selectedAsgToActivate) return;
    try {
      setActivating(true);
      setActivateError(null);
      const res = await api.activateAssignment(selectedAsgToActivate.id);
      if (res.success) {
        showFeedback(`🟢 LIVE / ACTIVE: '${selectedAsgToActivate.prizeName}' (${selectedAsgToActivate.targetEntryId || selectedAsgToActivate.id})`);
        setReviewModalOpen(false);
        setSelectedAsgToActivate(null);
        await onRefreshStats();
        await fetchAssignments();
        await fetchAuditLogs();
      }
    } catch (err: any) {
      setActivateError(err.message || 'एक्टिवेशन विफल हुआ');
    } finally {
      setActivating(false);
    }
  };

  // CANCELLATION HANDLER
  const openCancelModal = (asgId: string) => {
    setSelectedCancelId(asgId);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedCancelId) return;
    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      alert('रद्दीकरण का कारण लिखना अनिवार्य है (कम से कम 3 अक्षर)');
      return;
    }
    try {
      setLoading(true);
      const res = await api.cancelAssignment(selectedCancelId, cancelReason.trim());
      if (res.success) {
        showFeedback('असाइनमेंट सफलतापूर्वक निरस्त (Cancelled) कर दिया गया!');
        setCancelModalOpen(false);
        setSelectedCancelId(null);
        await onRefreshStats();
        await fetchAssignments();
        await fetchAuditLogs();
      }
    } catch (err: any) {
      alert(`निरस्तीकरण विफल: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // PART 4: ADD NEW PRIZE HANDLER
  const handleAddNewPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrizeData.name.trim()) {
      alert('कृपया उपहार का नाम दर्ज करें');
      return;
    }
    try {
      setAddingPrize(true);
      const mode = newPrizeData.prizeType === 'SMART_RANDOM' ? 'smart_random' : 'admin_controlled';
      const prob = mode === 'admin_controlled' ? 0 : Number(newPrizeData.probability);

      const res = await api.addGift(
        {
          id: newPrizeData.id.trim() || undefined,
          name: newPrizeData.name.trim(),
          nameHi: newPrizeData.nameHi.trim() || newPrizeData.name.trim(),
          image: newPrizeData.image.trim() || undefined,
          description: newPrizeData.description.trim() || newPrizeData.name.trim(),
          mode,
          probability: prob,
          totalQuantity: Number(newPrizeData.totalQuantity),
          remainingQuantity: Number(newPrizeData.totalQuantity),
          minStock: Number(newPrizeData.minStock),
          active: newPrizeData.active,
          cooldown: Number(newPrizeData.cooldown),
          notes: newPrizeData.notes.trim() || undefined,
          color: newPrizeData.color,
        },
        { rebalance: rebalanceOnAdd }
      );

      if (res.success) {
        showFeedback(`✓ नया उपहार जोड़ा गया: '${newPrizeData.name}'!`);
        setAddPrizeModalOpen(false);
        setNewPrizeData({
          name: '',
          nameHi: '',
          id: '',
          image: '',
          description: '',
          prizeType: 'SMART_RANDOM',
          probability: 5.0,
          totalQuantity: 10,
          minStock: 1,
          active: true,
          cooldown: 4,
          displayOrder: 11,
          notes: '',
          color: '#3B82F6',
        });
        setRebalanceOnAdd(false);
        await onRefreshStats();
      }
    } catch (err: any) {
      alert(`उपहार जोड़ने में त्रुटि: ${err.message}`);
    } finally {
      setAddingPrize(false);
    }
  };

  // PART 7: EDIT PRIZE HANDLER
  const openEditPrizeModal = (gift: Gift) => {
    setEditingPrize({ ...gift });
    setEditPrizeModalOpen(true);
  };

  const handleSaveEditedPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrize) return;
    try {
      setUpdatingPrize(true);
      const res = await api.updateGift(editingPrize.id, editingPrize);
      if (res.success) {
        showFeedback(`✓ उपहार '${editingPrize.name}' अपडेट हुआ!`);
        setEditPrizeModalOpen(false);
        setEditingPrize(null);
        await onRefreshStats();
      }
    } catch (err: any) {
      alert(`अपडेट विफल: ${err.message}`);
    } finally {
      setUpdatingPrize(false);
    }
  };

  // DUPLICATE PRIZE
  const handleDuplicatePrize = async (giftId: string) => {
    if (!window.confirm('क्या आप इस उपहार की डुप्लीकेट प्रतिलिपि बनाना चाहते हैं?')) return;
    try {
      setLoading(true);
      const res = await api.duplicateGift(giftId);
      if (res.success) {
        showFeedback(`✓ उपहार प्रतिलिपि बनाई गई: '${res.gift?.name}'`);
        await onRefreshStats();
      }
    } catch (err: any) {
      alert(`डुप्लीकेट बनाने में त्रुटि: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // DELETE OR DEACTIVATE PRIZE (PART 7)
  const handleDeletePrize = async (gift: Gift) => {
    const confirmMsg = `क्या आप सचमुच उपहार '${gift.name}' को हटाना या निष्क्रिय करना चाहते हैं?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      const res = await api.deleteGift(gift.id);
      if (res.success) {
        showFeedback(res.message || 'कार्रवाई पूर्ण हुई');
        await onRefreshStats();
      }
    } catch (err: any) {
      alert(`हटाने में त्रुटि: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // TOGGLE ACTIVE STATUS (PART 11)
  const handleTogglePrizeActive = async (gift: Gift) => {
    try {
      const newActive = !gift.active;
      const res = await api.updateGift(gift.id, { active: newActive });
      if (res.success) {
        showFeedback(`उपहार '${gift.name}' अब ${newActive ? 'ACTIVE' : 'INACTIVE'} है`);
        await onRefreshStats();
      }
    } catch (err: any) {
      alert(`स्थिति बदलने में त्रुटि: ${err.message}`);
    }
  };

  // STOCK QUICK UPDATE (PART 10)
  const handleQuickStockChange = async (giftId: string, delta: number) => {
    try {
      const res = await api.updateGiftStock(giftId, { delta });
      if (res.success) {
        await onRefreshStats();
      }
    } catch (err: any) {
      alert(`स्टॉक अपडेट विफल: ${err.message}`);
    }
  };

  // PART 5 & 6: PROBABILITY EDITOR HANDLERS
  const calculateTotalProbability = () => {
    const activeSmartGifts = stats.gifts.filter((g) => g.active && g.mode === 'smart_random');
    const total = activeSmartGifts.reduce((sum, g) => {
      const val = editingProbs[g.id] !== undefined ? editingProbs[g.id] : Number(g.probability || 0);
      return sum + Number(val || 0);
    }, 0);
    return Number(total.toFixed(2));
  };

  const currentTotalProb = calculateTotalProbability();
  const isProbValid = Math.abs(currentTotalProb - 100.0) <= 0.01;

  const handleProbChange = (giftId: string, value: string) => {
    const num = parseFloat(value);
    setEditingProbs((prev) => ({
      ...prev,
      [giftId]: isNaN(num) ? 0 : Math.max(0, Math.min(100, num)),
    }));
    setProbSaveError(null);
  };

  const handleSaveProbabilities = async () => {
    if (!isProbValid) {
      setProbSaveError(`Total probability must be exactly 100%. (Current: ${currentTotalProb}%)`);
      return;
    }
    try {
      setSavingProbs(true);
      setProbSaveError(null);
      const res = await api.updateProbabilities(editingProbs);
      if (res.success) {
        showFeedback('✓ Smart Random प्रोबेबिलिटी सफलता पूर्वक सुरक्षित हुई (Total: 100%)!');
        await onRefreshStats();
      }
    } catch (err: any) {
      setProbSaveError(err.message || 'प्रोबेबिलिटी सेव करने में त्रुटि');
    } finally {
      setSavingProbs(false);
    }
  };

  // Auto Rebalance to 100%
  const handleAutoRebalance = () => {
    if (!window.confirm('क्या आप सभी सक्रिय Smart Random उपहारों की प्रोबेबिलिटी को स्वतः 100% में रीबैलेंस (Normalize) करना चाहते हैं?')) {
      return;
    }
    const activeSmart = stats.gifts.filter((g) => g.active && g.mode === 'smart_random');
    if (activeSmart.length === 0) return;

    const currentSum = activeSmart.reduce((sum, g) => sum + (editingProbs[g.id] || 0), 0);
    const newProbs: Record<string, number> = { ...editingProbs };

    if (currentSum === 0) {
      const even = Number((100 / activeSmart.length).toFixed(2));
      let sum = 0;
      activeSmart.forEach((g, idx) => {
        if (idx === activeSmart.length - 1) {
          newProbs[g.id] = Number((100 - sum).toFixed(2));
        } else {
          newProbs[g.id] = even;
          sum += even;
        }
      });
    } else {
      let sum = 0;
      activeSmart.forEach((g, idx) => {
        if (idx === activeSmart.length - 1) {
          newProbs[g.id] = Number((100 - sum).toFixed(2));
        } else {
          const val = Number(((editingProbs[g.id] / currentSum) * 100).toFixed(2));
          newProbs[g.id] = val;
          sum += val;
        }
      });
    }
    setEditingProbs(newProbs);
    setProbSaveError(null);
    showFeedback('प्रोबेबिलिटी 100% पर रीबैलेंस हो गई। कृपया [SAVE PROBABILITIES] दबाएँ।');
  };

  // Calculations for Summary Cards (PART 3)
  const totalPrizesCount = stats.gifts.length;
  const activePrizesCount = stats.gifts.filter((g) => g.active).length;
  const smartRandomPrizesCount = stats.gifts.filter((g) => g.mode === 'smart_random').length;
  const adminOnlyPrizesCount = stats.gifts.filter((g) => g.mode === 'admin_controlled').length;
  const outOfStockCount = stats.gifts.filter((g) => (g.remainingQuantity ?? 0) <= 0).length;
  const totalActiveSmartProb = Number(
    stats.gifts
      .filter((g) => g.active && g.mode === 'smart_random')
      .reduce((sum, g) => sum + Number(g.probability || 0), 0)
      .toFixed(2)
  );

  const activeAssignments = assignments.filter((a) => a.status === 'ACTIVE');
  const pendingAssignments = assignments.filter((a) => a.status === 'PENDING' || a.status === 'REVIEW');

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* PART 3: TOP HEADER & DASHBOARD SUMMARY CARDS               */}
      {/* ========================================================= */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                MERU LUCKY DRAW ENGINE
              </span>
              <span className="text-xs text-slate-400">· Server Authoritative</span>
            </div>
            <h2 className="text-2xl font-serif font-black text-white mt-1 flex items-center gap-2.5">
              <span>🎁 PRIZE CONTROL CENTER</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              पुरस्कार आवंटन, प्रोबेबिलिटी कंट्रोल, स्टॉक प्रबंधन और लाइव वीडियो शूट रिज़र्वेशन
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAddPrizeModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD NEW PRIZE</span>
            </button>

            <button
              onClick={async () => {
                await onRefreshStats();
                await fetchAssignments();
                await fetchAuditLogs();
                showFeedback('डेटा रिफ्रेश हुआ');
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6 SUMMARY CARDS (PART 3) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Prizes</span>
            <div className="text-2xl font-black text-white font-mono mt-1">{totalPrizesCount}</div>
            <span className="text-[10px] text-slate-500">कैलेंडर में कुल उपहार</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Active Prizes</span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{activePrizesCount}</div>
            <span className="text-[10px] text-slate-500">सक्रिय (Draw योग्य)</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Smart Random</span>
            <div className="text-2xl font-black text-blue-400 font-mono mt-1">{smartRandomPrizesCount}</div>
            <span className="text-[10px] text-slate-500">प्रायिकता आधारित</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Admin Only</span>
            <div className="text-2xl font-black text-purple-400 font-mono mt-1">{adminOnlyPrizesCount}</div>
            <span className="text-[10px] text-slate-500">केवल असाइनमेंट से</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Out of Stock</span>
            <div className="text-2xl font-black text-rose-400 font-mono mt-1">{outOfStockCount}</div>
            <span className="text-[10px] text-slate-500">शून्य इन्वेंट्री</span>
          </div>

          {/* TOTAL PROBABILITY CARD WITH RED WARNING (PART 3) */}
          <div
            className={`rounded-2xl p-3.5 border transition-all ${
              Math.abs(totalActiveSmartProb - 100.0) <= 0.01
                ? 'bg-slate-900/90 border-emerald-500/40 text-emerald-400'
                : 'bg-rose-950/60 border-rose-500/80 text-rose-300 animate-pulse'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block">
              Total Probability
            </span>
            <div className="text-2xl font-black font-mono mt-1">
              {totalActiveSmartProb}%
            </div>
            <span className="text-[10px]">
              {Math.abs(totalActiveSmartProb - 100.0) <= 0.01 ? (
                <span className="text-emerald-400 font-bold">✓ 100% Balanced</span>
              ) : (
                <span className="text-rose-400 font-black">🔴 Must be 100%</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* NAVIGATION TABS (PART 19)                                  */}
      {/* ========================================================= */}
      <div className="bg-slate-950 border-b border-slate-800 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('assign_live')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'assign_live'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>🎯 Assign & Live Reveal</span>
          {activeAssignments.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-400 text-slate-950 font-black">
              {activeAssignments.length} LIVE
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('prizes')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'prizes'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>🎁 All Prizes ({stats.gifts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('probability')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'probability'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>📊 Probability Control</span>
          {Math.abs(totalActiveSmartProb - 100.0) > 0.01 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'inventory'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>📦 Stock & Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab('images')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'images'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>🖼️ Prize Image Manager</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'history'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>📝 Audit & History ({auditLogs.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ASSIGN & LIVE REVEAL (PART 1, 2, C)                */}
      {/* ========================================================= */}
      {activeTab === 'assign_live' && (
        <div className="space-y-6">
          {/* LIVE REVEAL MODE BANNER (VIDEO SHOOT) */}
          {activeAssignments.length > 0 && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-950 to-slate-950 border border-emerald-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <h4 className="font-serif font-black text-emerald-400 text-sm tracking-wide flex items-center gap-2">
                    <span>🎥 LIVE REVEAL MODE READY FOR VIDEO SHOOT</span>
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeAssignments.length} ACTIVE RESERVATION
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {activeAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2.5 text-xs shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Customer</span>
                        <div className="font-bold text-white text-sm">{asg.customerName || 'Next Eligible Customer'}</div>
                        <div className="font-mono text-amber-300 font-bold text-xs">{asg.targetEntryId || 'General Pool'}</div>
                        {asg.targetMobile && (
                          <div className="text-slate-400 font-mono text-[11px]">{asg.targetMobile}</div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          🟢 ACTIVE / LIVE
                        </span>
                        <div className="mt-1.5 font-bold text-amber-400 text-sm">{asg.prizeName}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                      <span className="text-slate-400">By: {asg.activatedBy || 'Admin'}</span>
                      <div className="flex items-center gap-2">
                        {asg.targetEntryId && (
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}/?entry=${encodeURIComponent(asg.targetEntryId!)}`;
                              navigator.clipboard.writeText(url);
                              showFeedback(`Copied Live Play URL: ${url}`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold cursor-pointer border border-slate-700"
                          >
                            Copy Live URL
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openCancelModal(asg.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold cursor-pointer border border-rose-500/30"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PART 1: CUSTOMER SEARCH & ASSIGNMENT BUILDER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: CUSTOMER / ENTRY SEARCH (PART 1.A) */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div>
                <h4 className="font-serif font-black text-white text-base flex items-center gap-2">
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>1. Select Customer / Entry</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  ग्राहक को मोबाइल नंबर, नाम, Entry ID या बिल नंबर से खोजें
                </p>
              </div>

              {/* SEARCH INPUT */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="उदा. 9340259168, Rahul, MMS-2026-..."
                  value={searchQuery}
                  onChange={(e) => handleSearchCustomers(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 placeholder-slate-500 font-mono"
                />
                {isSearching && (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* SEARCH RESULTS LIST */}
              {searchResults.length > 0 && (
                <div className="max-h-72 overflow-y-auto space-y-2 border border-slate-800 rounded-2xl p-2 bg-slate-900/60 divide-y divide-slate-800/50">
                  {searchResults.map((cust) => {
                    const isPlayed = cust.playStatus === 'PLAYED';
                    return (
                      <div
                        key={cust.entryId}
                        className={`p-3 rounded-xl transition-all flex items-start justify-between gap-3 ${
                          isPlayed ? 'bg-slate-950/40 opacity-75' : 'hover:bg-slate-800/80 bg-slate-900'
                        }`}
                      >
                        <div className="space-y-0.5 text-xs">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{cust.customerName}</span>
                            {cust.billNumber && (
                              <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                                Bill: {cust.billNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-amber-300 font-mono font-bold text-[11px]">{cust.entryId}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{cust.customerMobile}</div>

                          <div className="pt-1 flex items-center gap-1.5">
                            {isPlayed ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                ALREADY PLAYED ({cust.finalPrize})
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ELIGIBLE · NOT PLAYED
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          {isPlayed ? (
                            <button
                              type="button"
                              disabled
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-500 font-bold text-xs cursor-not-allowed"
                            >
                              Played
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectCustomer(cust)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md flex items-center gap-1 transition-all"
                            >
                              <span>Select Customer</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SELECTED CUSTOMER CARD (PART 1.A VERIFIED BADGE) */}
              {selectedCustomer ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/50 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Verified Campaign Entry</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelectedCustomer}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Customer Name</span>
                      <span className="font-bold text-white text-sm">{selectedCustomer.customerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Mobile</span>
                      <span className="font-mono text-slate-200">{selectedCustomer.customerMobile}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Target Entry ID</span>
                      <span className="font-mono text-amber-300 font-bold">{selectedCustomer.entryId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Bill Number</span>
                      <span className="font-mono text-slate-300">{selectedCustomer.billNumber || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                  <User className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                  <span>ऊपर खोज बॉक्स में ग्राहक का मोबाइल या नाम लिखकर [Select Customer] दबाएँ</span>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: PRIZE ASSIGNMENT & ACTIVATION FORM */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div>
                <h4 className="font-serif font-black text-white text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>2. Assign Prize & Activate</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  उपहार चुनें और [ACTIVATE ASSIGNMENT] दबाएँ ताकि ग्राहक के स्पिन करने पर वही उपहार प्राप्त हो
                </p>
              </div>

              <form onSubmit={(e) => handleFormSubmit(e, true)} className="space-y-4">
                {/* PRIZE SELECTION */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Prize to Reserve (उपहार चुनें): *
                  </label>
                  <select
                    value={selectedPrizeId}
                    onChange={(e) => setSelectedPrizeId(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-bold"
                  >
                    <option value="">-- उपहार चुनें (Select Gift) --</option>
                    {stats.gifts.map((g) => {
                      const avail = getAvailableStock(g.id);
                      return (
                        <option key={g.id} value={g.id} disabled={avail <= 0}>
                          {g.name} · शेष स्टॉक: {avail} {isGrandPrize(g.id) ? '★ [GRAND / ADMIN ONLY]' : `(${g.probability}%)`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* ASSIGNMENT MODE */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mode (आवंटन प्रकार):
                    </label>
                    <select
                      value={assignmentMode}
                      onChange={(e) => setAssignmentMode(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="ENTRY_SPECIFIC">Specific Customer / Entry (चयनित ग्राहक)</option>
                      <option value="NEXT_ELIGIBLE">Next Eligible Customer (आगामी कोई भी)</option>
                      <option value="SCHEDULED">Scheduled (निर्धारित समय)</option>
                      <option value="RESERVE_ONLY">Reserve Only (होल्ड)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Expiry (optional):
                    </label>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* REASON / NOTE */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reason / Shoot Note (कारण / नोट): *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="उदा. Live video shoot demonstration / Smartphone promotion reserve"
                    value={reasonNote}
                    onChange={(e) => setReasonNote(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* ACTION BUTTONS: DIRECT ACTIVATE OR SAVE PENDING */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={resetAssignForm}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Clear Form
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={(e) => handleFormSubmit(e, false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer disabled:opacity-50"
                  >
                    Save as Pending
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-lg cursor-pointer flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 fill-slate-950" />
                    )}
                    <span>ACTIVATE ASSIGNMENT (LIVE)</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* PENDING / REVIEW ASSIGNMENTS TABLE */}
          {pendingAssignments.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-black text-white text-base">
                    Pending / Review Assignments ({pendingAssignments.length})
                  </h4>
                  <p className="text-xs text-slate-400">
                    समीक्षा करें और [ACTIVATE] दबाकर तुरंत LIVE करें
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-300 text-[11px] uppercase border-b border-slate-800 font-mono">
                    <tr>
                      <th className="p-3">ID / Mode</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Prize</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {pendingAssignments.map((asg) => (
                      <tr key={asg.id} className="hover:bg-slate-900/50">
                        <td className="p-3">
                          <span className="font-mono text-amber-300 font-bold block">{asg.id}</span>
                          <span className="text-[10px] text-slate-400">{asg.mode}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{asg.customerName || 'Next Eligible'}</div>
                          <div className="font-mono text-slate-400 text-[11px]">{asg.targetEntryId || asg.targetMobile}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-amber-400">{asg.prizeName}</div>
                          {asg.isGrandPrize && (
                            <span className="text-[10px] text-purple-400 font-mono">★ GRAND PRIZE</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {asg.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 max-w-xs truncate">{asg.note || '-'}</td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => openReviewAndActivateModal(asg)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-sm"
                          >
                            ACTIVATE
                          </button>
                          <button
                            type="button"
                            onClick={() => openCancelModal(asg.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 font-semibold text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ALL PRIZES & ADD (PART 4, 7, 8, 9)                 */}
      {/* ========================================================= */}
      {activeTab === 'prizes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-serif font-black text-white">
                All Configured Lucky Draw Prizes
              </h3>
              <p className="text-xs text-slate-400">
                हर उपहार का नाम, इमेज, प्रकार, प्रोबेबिलिटी और स्टॉक यहीं से प्रबंधित करें
              </p>
            </div>
            <button
              onClick={() => setAddPrizeModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD NEW PRIZE</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {stats.gifts.map((gift) => {
              const avail = getAvailableStock(gift.id);
              const isGrand = isGrandPrize(gift.id);
              return (
                <div
                  key={gift.id}
                  className={`p-4 rounded-2xl bg-slate-950 border transition-all flex flex-col justify-between gap-3 shadow-lg ${
                    gift.active ? 'border-slate-800 hover:border-amber-500/40' : 'border-slate-800/40 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={gift.image}
                          alt={gift.name}
                          className="w-14 h-14 rounded-xl object-cover bg-slate-900 border border-slate-800 shrink-0"
                        />
                        <div>
                          <h5 className="font-bold text-sm text-white">{gift.name}</h5>
                          <p className="text-xs text-amber-200/80">{gift.nameHi}</p>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">ID: {gift.id}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleTogglePrizeActive(gift)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                            gift.active
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {gift.active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          {gift.mode === 'admin_controlled' ? 'ADMIN ONLY (0%)' : `${gift.probability}%`}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">{gift.description}</p>

                    {/* STOCK COUNTERS */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-2 rounded-xl text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total</span>
                        <span className="font-mono font-bold text-white">{gift.totalQuantity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Remaining</span>
                        <span className={`font-mono font-bold ${avail <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {gift.remainingQuantity}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Distributed</span>
                        <span className="font-mono font-bold text-amber-300">
                          {(gift.totalQuantity || 0) - (gift.remainingQuantity || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BAR */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuickStockChange(gift.id, -1)}
                        disabled={(gift.remainingQuantity ?? 0) <= 0}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer disabled:opacity-30"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickStockChange(gift.id, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer"
                      >
                        +1
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditPrizeModal(gift)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicatePrize(gift.id)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePrize(gift)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Delete / Deactivate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PROBABILITY CONTROL & EASY EDITOR (PART 5 & 6)       */}
      {/* ========================================================= */}
      {activeTab === 'probability' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-serif font-black text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" />
                <span>Smart Random Probability Editor</span>
              </h3>
              <p className="text-xs text-slate-400">
                हर Smart Random उपहार की प्रतिशत संभावना बदलें। कुल योग ठीक 100.00% होना अनिवार्य है।
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* LIVE PROBABILITY TOTAL BADGE (PART 6) */}
              <div
                className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-mono text-xs font-bold ${
                  isProbValid
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500/80 text-rose-300 animate-pulse'
                }`}
              >
                <span>Total Probability:</span>
                <span className="text-base font-black font-mono">{currentTotalProb}%</span>
                <span>{isProbValid ? '🟢 VALID' : '🔴 INVALID'}</span>
              </div>

              <button
                type="button"
                onClick={handleAutoRebalance}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700"
              >
                Auto-Rebalance to 100%
              </button>

              <button
                type="button"
                disabled={!isProbValid || savingProbs}
                onClick={handleSaveProbabilities}
                className={`px-5 py-2 rounded-xl text-xs font-black shadow-lg cursor-pointer transition-all ${
                  isProbValid && !savingProbs
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {savingProbs ? 'सेव हो रहा है...' : 'SAVE PROBABILITIES'}
              </button>
            </div>
          </div>

          {/* WARNING MESSAGE IF NOT 100% (PART 5 & 6) */}
          {!isProbValid && (
            <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <div>
                  <span className="font-bold">Total probability must be exactly 100%.</span>
                  <span className="block text-[11px] text-rose-300/80 mt-0.5">
                    "Smart Random gifts की कुल probability 100% होनी चाहिए। वर्तमान योग: {currentTotalProb}%"
                  </span>
                </div>
              </div>
              <button
                onClick={handleAutoRebalance}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold border border-rose-500/40 cursor-pointer"
              >
                Fix Automatically
              </button>
            </div>
          )}

          {probSaveError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {probSaveError}
            </div>
          )}

          {/* EASY PROBABILITY TABLE (PART 6) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 text-[11px] uppercase border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Gift Name</th>
                  <th className="p-3">Remaining Stock</th>
                  <th className="p-3">Probability %</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Quick Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {stats.gifts.map((gift) => {
                  const isAdminControlled = gift.mode === 'admin_controlled';
                  const probVal = editingProbs[gift.id] !== undefined ? editingProbs[gift.id] : Number(gift.probability || 0);

                  return (
                    <tr key={gift.id} className="hover:bg-slate-900/40">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={gift.image}
                            alt={gift.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-800 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-white block">{gift.name}</span>
                            <span className="text-[10px] text-amber-200/80">{gift.nameHi}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold">
                        <span className={(gift.remainingQuantity ?? 0) <= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                          {gift.remainingQuantity}
                        </span>
                        <span className="text-slate-500 text-[11px]"> / {gift.totalQuantity}</span>
                      </td>
                      <td className="p-3">
                        {isAdminControlled ? (
                          <span className="text-slate-500 font-mono italic">0.00% (Admin Only)</span>
                        ) : (
                          <div className="flex items-center gap-1.5 max-w-[130px]">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={probVal}
                              onChange={(e) => handleProbChange(gift.id, e.target.value)}
                              className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold focus:border-amber-400"
                            />
                            <span className="text-slate-400 font-bold">%</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            gift.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {gift.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            isAdminControlled
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {isAdminControlled ? 'ADMIN_CONTROLLED' : 'SMART_RANDOM'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {!isAdminControlled && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleProbChange(gift.id, String(Math.max(0, probVal - 1)))}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleProbChange(gift.id, String(Math.min(100, probVal + 1)))}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                            >
                              +1
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: INVENTORY & STOCK CONTROL (PART 10, 11)             */}
      {/* ========================================================= */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div>
            <h3 className="text-lg font-serif font-black text-white">
              Inventory & Remaining Stock Tracker
            </h3>
            <p className="text-xs text-slate-400">
              प्रत्येक उपहार की कुल और शेष मात्रा नियंत्रित करें। स्टॉक शून्य होने पर ऑटोमैटिक OUT OF STOCK हो जाता है।
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 text-[11px] uppercase border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Gift</th>
                  <th className="p-3">Total Qty</th>
                  <th className="p-3">Remaining Qty</th>
                  <th className="p-3">Distributed</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Stock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {stats.gifts.map((gift) => {
                  const rem = gift.remainingQuantity ?? 0;
                  const isOut = rem <= 0;
                  return (
                    <tr key={gift.id} className="hover:bg-slate-900/40">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={gift.image}
                            alt={gift.name}
                            className="w-9 h-9 rounded-lg object-cover bg-slate-900 border border-slate-800 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-white block">{gift.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{gift.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-white font-bold">{gift.totalQuantity}</td>
                      <td className="p-3 font-mono font-bold">
                        <span className={isOut ? 'text-rose-400' : 'text-emerald-400'}>{rem}</span>
                      </td>
                      <td className="p-3 font-mono text-amber-300 font-bold">
                        {(gift.totalQuantity || 0) - rem}
                      </td>
                      <td className="p-3">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            OUT OF STOCK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            IN STOCK
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickStockChange(gift.id, -1)}
                            disabled={rem <= 0}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer disabled:opacity-30"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickStockChange(gift.id, 1)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const val = prompt(`'${gift.name}' का नया शेष स्टॉक दर्ज करें:`, String(rem));
                              if (val !== null) {
                                const parsed = parseInt(val, 10);
                                if (!isNaN(parsed) && parsed >= 0) {
                                  api.updateGiftStock(gift.id, { newQuantity: parsed }).then(() => onRefreshStats());
                                }
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold cursor-pointer"
                          >
                            Set Stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: PRIZE IMAGE MANAGER (PART 14)                      */}
      {/* ========================================================= */}
      {activeTab === 'images' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div>
            <h3 className="text-lg font-serif font-black text-white">
              Prize Image Gallery & Manager
            </h3>
            <p className="text-xs text-slate-400">
              प्रत्येक उपहार की सटीक इमेज (URL/फ़ाइल) सीधे gift_id से मैप होती है ताकि परिणाम स्क्रीन पर सही फोटो दिखे
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.gifts.map((gift) => (
              <div key={gift.id} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                  <img
                    src={gift.image}
                    alt={gift.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-950/80 text-white border border-slate-700">
                    {gift.id}
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-sm text-white">{gift.name}</h5>
                  <p className="text-xs text-slate-400 truncate">{gift.image}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newUrl = prompt(`'${gift.name}' के लिए नया Image URL दर्ज करें:`, gift.image);
                      if (newUrl && newUrl.trim()) {
                        api.updateGift(gift.id, { image: newUrl.trim() }).then(() => {
                          showFeedback('इमेज अपडेट हो गई');
                          onRefreshStats();
                        });
                      }
                    }}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer text-center"
                  >
                    Change URL
                  </button>
                  <label className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold cursor-pointer text-center">
                    Upload File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const b64 = ev.target?.result as string;
                            api.updateGift(gift.id, { image: b64 }).then(() => {
                              showFeedback('इमेज फ़ाइल अपलोड हुई');
                              onRefreshStats();
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: AUDIT & HISTORY (PART 15 & 16)                     */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-serif font-black text-white">
                Configuration & Audit History
              </h3>
              <p className="text-xs text-slate-400">
                हर परिवर्तन का पूर्ण ऑडिट लॉग: एडमिन ईमेल, पुराना मान, नया मान, क्रिया और टाइमस्टैम्प
              </p>
            </div>
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              <option value="ALL">All Actions</option>
              <option value="PROBABILITY_UPDATED">Probability Updates</option>
              <option value="ACTIVATE_ASSIGNMENT">Activations</option>
              <option value="ASSIGN_PRIZE">Assignments</option>
              <option value="STOCK_UPDATED">Stock Updates</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 text-[11px] uppercase border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Admin</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target / Detail</th>
                  <th className="p-3">Changes / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {auditLogs
                  .filter((l) => historyFilter === 'ALL' || l.action === historyFilter)
                  .map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40">
                      <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono text-amber-300 font-semibold">{log.adminEmail}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-white">{log.targetId || '-'}</td>
                      <td className="p-3 text-slate-300 max-w-sm truncate">{log.details || '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD NEW PRIZE (PART 4 & TEST F)                  */}
      {/* ========================================================= */}
      {addPrizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-serif font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <span>+ ADD NEW PRIZE (नया उपहार जोड़ें)</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddPrizeModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewPrize} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prize Name (English): *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. Wireless Earphone"
                    value={newPrizeData.name}
                    onChange={(e) => setNewPrizeData({ ...newPrizeData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prize Name (Hindi):
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. वायरलेस ईयरफोन"
                    value={newPrizeData.nameHi}
                    onChange={(e) => setNewPrizeData({ ...newPrizeData, nameHi: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prize ID (optional, auto-generated if blank):
                  </label>
                  <input
                    type="text"
                    placeholder="g-wireless-earphone"
                    value={newPrizeData.id}
                    onChange={(e) => setNewPrizeData({ ...newPrizeData, id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prize Type: *
                  </label>
                  <select
                    value={newPrizeData.prizeType}
                    onChange={(e) => setNewPrizeData({ ...newPrizeData, prizeType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  >
                    <option value="SMART_RANDOM">1. SMART RANDOM (प्रायिकता आधारित)</option>
                    <option value="ADMIN_CONTROLLED">2. ADMIN CONTROLLED (0% Prob - केवल असाइनमेंट से)</option>
                    <option value="GRAND_PRIZE">3. GRAND PRIZE (बड़ा पुरस्कार)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Stock Quantity: *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newPrizeData.totalQuantity}
                    onChange={(e) => setNewPrizeData({ ...newPrizeData, totalQuantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Probability % (Smart Random होने पर):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={newPrizeData.prizeType !== 'SMART_RANDOM'}
                    value={newPrizeData.prizeType === 'SMART_RANDOM' ? newPrizeData.probability : 0}
                    onChange={(e) => setNewPrizeData({ ...newPrizeData, probability: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono disabled:opacity-40"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prize Image URL:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={newPrizeData.image}
                      onChange={(e) => setNewPrizeData({ ...newPrizeData, image: e.target.value })}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold cursor-pointer shrink-0">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setNewPrizeData({ ...newPrizeData, image: ev.target?.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {newPrizeData.image && (
                    <div className="mt-2 flex items-center gap-3 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                      <img src={newPrizeData.image} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                      <span className="text-[11px] text-slate-400">Image Preview Verified</span>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Description:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="उपहार का संक्षिप्त विवरण..."
                    value={newPrizeData.description}
                    onChange={(e) => setNewPrizeData({ ...newPrizeData, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* REBALANCE CHECKBOX OPTION (TEST F REQUIREMENT) */}
              {newPrizeData.prizeType === 'SMART_RANDOM' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="rebalanceCheckbox"
                    checked={rebalanceOnAdd}
                    onChange={(e) => setRebalanceOnAdd(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-amber-500 cursor-pointer"
                  />
                  <label htmlFor="rebalanceCheckbox" className="text-xs text-amber-200 cursor-pointer">
                    <span className="font-bold block text-white">Automatically rebalance other Smart Random prizes to total exactly 100%</span>
                    <span>अन्य सक्रिय Smart Random उपहारों की प्रोबेबिलिटी को स्वतः आनुपातिक रूप से संतुलित करें ताकि कुल योग ठीक 100% रहे।</span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddPrizeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingPrize}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg cursor-pointer"
                >
                  {addingPrize ? 'जोड़ रहे हैं...' : 'Save & Add Prize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT PRIZE MODAL (PART 7)                        */}
      {/* ========================================================= */}
      {editPrizeModalOpen && editingPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-serif font-black text-white">
                Edit Prize: {editingPrize.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditPrizeModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedPrize} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Name (English):</label>
                  <input
                    type="text"
                    required
                    value={editingPrize.name}
                    onChange={(e) => setEditingPrize({ ...editingPrize, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Name (Hindi):</label>
                  <input
                    type="text"
                    value={editingPrize.nameHi}
                    onChange={(e) => setEditingPrize({ ...editingPrize, nameHi: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Remaining Stock:</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPrize.remainingQuantity ?? 0}
                    onChange={(e) => setEditingPrize({ ...editingPrize, remainingQuantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Total Stock:</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPrize.totalQuantity ?? 0}
                    onChange={(e) => setEditingPrize({ ...editingPrize, totalQuantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Cooldown Draws (PART 12):</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPrize.cooldown ?? 4}
                    onChange={(e) => setEditingPrize({ ...editingPrize, cooldown: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Status:</label>
                  <select
                    value={editingPrize.active ? 'true' : 'false'}
                    onChange={(e) => setEditingPrize({ ...editingPrize, active: e.target.value === 'true' })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="true">ACTIVE</option>
                    <option value="false">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Image URL:</label>
                <input
                  type="url"
                  value={editingPrize.image}
                  onChange={(e) => setEditingPrize({ ...editingPrize, image: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Description:</label>
                <textarea
                  rows={2}
                  value={editingPrize.description}
                  onChange={(e) => setEditingPrize({ ...editingPrize, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditPrizeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPrize}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black"
                >
                  {updatingPrize ? 'सेव हो रहा है...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: REVIEW & ACTIVATE MODAL (PART 2)                 */}
      {/* ========================================================= */}
      {reviewModalOpen && selectedAsgToActivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-serif font-black text-emerald-400 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <span>Confirm Live Activation (समीक्षा एवं एक्टिवेशन)</span>
              </h3>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activateError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/60 text-rose-300 text-xs">
                <span className="font-bold block">❌ Activation Validation Failed:</span>
                <span className="mt-0.5 block">{activateError}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Assignment ID:</span>
                <span className="text-amber-300 font-mono font-bold">{selectedAsgToActivate.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Customer Name:</span>
                <span className="text-white font-bold">{selectedAsgToActivate.customerName || 'Next Customer'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Target Entry ID:</span>
                <span className="text-amber-300 font-mono font-bold">{selectedAsgToActivate.targetEntryId || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Reserved Prize:</span>
                <span className="text-emerald-400 font-black text-sm">{selectedAsgToActivate.prizeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Mobile:</span>
                <span className="text-slate-300 font-mono">{selectedAsgToActivate.targetMobile || 'N/A'}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              एक्टिवेट होते ही यह असाइनमेंट <span className="text-emerald-400 font-bold">🟢 ACTIVE</span> हो जाएगा। ग्राहक के वेबसाइट रिफ्रेश करके स्पिन/स्क्रैच करने पर बैकएंड द्वारा ठीक यही उपहार दिया जाएगा।
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={activating}
                onClick={handleConfirmActivate}
                className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>CONFIRM & ACTIVATE NOW</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: CANCELLATION MODAL                               */}
      {/* ========================================================= */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-3">
            <h4 className="text-base font-serif font-black text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Cancel Prize Assignment</span>
            </h4>
            <p className="text-xs text-slate-400">
              रद्दीकरण का कारण लिखना अनिवार्य है (यह ऑडिट लॉग में सुरक्षित रहेगा):
            </p>

            <textarea
              rows={3}
              required
              placeholder="उदा. Video shoot postponed / Customer cancelled purchase"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-400"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading || !cancelReason.trim() || cancelReason.trim().length < 3}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
