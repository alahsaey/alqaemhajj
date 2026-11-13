import React, { useState, useEffect, useMemo } from 'react';
import {
  Gift,
  LayoutDashboard,
  Users,
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  PhoneCall,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  GiftDistribution,
  GiftCommunication,
  GiftOperationLog,
  Pilgrim,
} from '../../types';
import { subscribeToCollection, setDocument } from '../../lib/db';
import { GiftDashboardView } from './GiftDashboardView';
import { GiftRegistryView } from './GiftRegistryView';
import { GiftFollowUpView } from './GiftFollowUpView';
import { GiftReportsView } from './GiftReportsView';
import { GiftDeliveryModal } from './GiftDeliveryModal';
import { GiftFollowUpModal } from './GiftFollowUpModal';
import { GiftHistoryModal } from './GiftHistoryModal';
import { GiftPrintModal } from './GiftPrintModal';
import { exportOverallGiftReportCSV } from '../../utils/giftExport';

interface GiftDistributionManagerProps {
  activePilgrims: Pilgrim[];
  busesList?: string[];
  currentStaffName: string;
  seasonYear?: string;
  initialSubTab?: 'dashboard' | 'registry' | 'followup' | 'reports';
  onNavigateTab?: (tab: string) => void;
}

export const GiftDistributionManager: React.FC<GiftDistributionManagerProps> = ({
  activePilgrims,
  busesList = [],
  currentStaffName,
  seasonYear = '1448',
  initialSubTab = 'dashboard',
  onNavigateTab,
}) => {
  const [currentSubTab, setCurrentSubTab] = useState<
    'dashboard' | 'registry' | 'followup' | 'reports'
  >(initialSubTab);

  const [giftDistributions, setGiftDistributions] = useState<GiftDistribution[]>([]);
  const [communications, setCommunications] = useState<GiftCommunication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedItemForDelivery, setSelectedItemForDelivery] = useState<GiftDistribution | null>(null);
  const [selectedItemForFollowUp, setSelectedItemForFollowUp] = useState<GiftDistribution | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<GiftDistribution | null>(null);

  // Quick delivery search modal state
  const [isQuickDeliverModalOpen, setIsQuickDeliverModalOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  // Print modal state
  const [printModalConfig, setPrintModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    filterSummary?: string;
    columns: string[];
    data: (string | number)[][];
    summaryCards?: { label: string; value: string | number }[];
  }>({
    isOpen: false,
    title: '',
    columns: [],
    data: [],
  });

  // Effective buses list
  const effectiveBuses = useMemo(() => {
    const list = new Set<string>();
    busesList.forEach((b) => b && list.add(b));
    activePilgrims.forEach((p) => {
      if (p.busNumber) list.add(p.busNumber);
    });
    if (list.size === 0) {
      return ['باص 1', 'باص 2', 'باص 3', 'باص 4', 'باص 5'];
    }
    return Array.from(list).sort();
  }, [busesList, activePilgrims]);

  // Sync initialSubTab if parent changes
  useEffect(() => {
    if (initialSubTab) {
      setCurrentSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Real-time Firestore subscriptions for gift distributions and communications
  useEffect(() => {
    setIsLoading(true);
    const unsubGifts = subscribeToCollection<GiftDistribution>('gift_distributions', (data) => {
      setGiftDistributions(data || []);
      setIsLoading(false);
    });

    const unsubComms = subscribeToCollection<GiftCommunication>('gift_communications', (data) => {
      setCommunications(data || []);
    });

    return () => {
      unsubGifts();
      unsubComms();
    };
  }, []);

  // Delivery Save Handler
  const handleSaveDelivery = async (
    updatedGift: GiftDistribution,
    auditLog: GiftOperationLog
  ) => {
    const docId = updatedGift.id || `gift-${updatedGift.nationalId}`;
    const finalGift: GiftDistribution = {
      ...updatedGift,
      id: docId,
      seasonYear: seasonYear || '1448',
      updatedAt: new Date().toISOString(),
      auditLogs: [auditLog, ...(updatedGift.auditLogs || [])],
    };

    // Optimistic UI update
    setGiftDistributions((prev) => {
      const idx = prev.findIndex(
        (g) => g.id === docId || g.nationalId === updatedGift.nationalId
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = finalGift;
        return copy;
      }
      return [finalGift, ...prev];
    });

    try {
      await setDocument('gift_distributions', docId, finalGift);
    } catch (err) {
      console.error('Failed to save gift distribution to Firestore:', err);
    }
    setSelectedItemForDelivery(null);
  };

  // Follow-Up Save Handler
  const handleSaveFollowUp = async (
    comm: GiftCommunication,
    updatedGift: GiftDistribution,
    auditLog: GiftOperationLog
  ) => {
    const commId = comm.id || `comm-${Date.now()}`;
    const docId = updatedGift.id || `gift-${updatedGift.nationalId}`;
    const finalGift: GiftDistribution = {
      ...updatedGift,
      id: docId,
      seasonYear: seasonYear || '1448',
      updatedAt: new Date().toISOString(),
      auditLogs: [auditLog, ...(updatedGift.auditLogs || [])],
    };

    // Optimistic UI updates
    setCommunications((prev) => [comm, ...prev]);
    setGiftDistributions((prev) => {
      const idx = prev.findIndex(
        (g) => g.id === docId || g.nationalId === updatedGift.nationalId
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = finalGift;
        return copy;
      }
      return [finalGift, ...prev];
    });

    try {
      await setDocument('gift_communications', commId, comm);
      await setDocument('gift_distributions', docId, finalGift);
    } catch (err) {
      console.error('Failed to save follow-up to Firestore:', err);
    }
    setSelectedItemForFollowUp(null);
  };

  // Open Print Preview Helper
  const handleOpenPrintPreview = (
    title: string,
    columns: string[],
    data: (string | number)[][],
    summaryCards?: { label: string; value: string | number }[],
    subtitle?: string
  ) => {
    setPrintModalConfig({
      isOpen: true,
      title,
      subtitle: subtitle || `موسم الحج ${seasonYear}هـ — قافلة القائم لحجاج بيت الله الحرام`,
      columns,
      data,
      summaryCards,
    });
  };

  // Key Quick Metrics for navigation badges
  const totalCount = activePilgrims.length;
  const deliveredCount = useMemo(() => {
    return giftDistributions.filter(
      (g) => g.status === 'delivered_direct' || g.status === 'delivered_proxy'
    ).length;
  }, [giftDistributions]);

  const pendingCount = Math.max(0, totalCount - deliveredCount);

  const getPilgrimFullName = (p: Pilgrim) => {
    if (p.name && p.name.trim()) return p.name.trim();
    const full = `${p.firstName || ''} ${p.secondName || ''} ${p.thirdName || ''} ${p.lastName || ''}`.trim();
    return full || 'حاج مسجل';
  };

  // Quick deliver pilgrim selector items
  const quickDeliverPilgrims = useMemo(() => {
    if (!quickSearchQuery.trim()) {
      return activePilgrims.slice(0, 10);
    }
    const q = quickSearchQuery.trim().toLowerCase();
    return activePilgrims.filter((p) => {
      const pName = getPilgrimFullName(p).toLowerCase();
      return (
        pName.includes(q) ||
        (p.nationalId && p.nationalId.includes(q)) ||
        (p.mobile && p.mobile.includes(q)) ||
        (p.busNumber && p.busNumber.toLowerCase().includes(q))
      );
    });
  }, [activePilgrims, quickSearchQuery]);

  const handleSelectQuickPilgrim = (pilgrim: Pilgrim) => {
    setIsQuickDeliverModalOpen(false);
    const existing = giftDistributions.find(
      (g) => g.pilgrimId === pilgrim.id || g.nationalId === pilgrim.nationalId
    );

    const flightVal = (
      pilgrim.flightNumberOutbound ||
      pilgrim.flightNumberReturn ||
      pilgrim.flightTicketNumber ||
      ''
    );

    const fullName = getPilgrimFullName(pilgrim);
    const giftItem: GiftDistribution = existing || {
      id: `gift-${pilgrim.nationalId}`,
      pilgrimId: pilgrim.id,
      nationalId: pilgrim.nationalId,
      pilgrimName: fullName,
      gender: pilgrim.gender || 'ذكر',
      mobile: pilgrim.mobile,
      packageType: pilgrim.selectedPackage || pilgrim.packageType || 'الباقة الاقتصادية',
      busNumber: pilgrim.busNumber || 'غير محدد',
      flightNumber: flightVal || 'بدون رحلة',
      roomNumber: pilgrim.roomNumber || pilgrim.roomNumberMakkah || pilgrim.hotelRoom || 'غير محدد',
      status: 'not_delivered',
      seasonYear,
      allocatedGiftsCount: 1,
      createdAt: pilgrim.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSelectedItemForDelivery(giftItem);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#0E1726] via-[#10192D] to-[#0A0F1D] border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 border border-amber-300/40">
              <Gift className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold">
                  منظومة الهدايا الرسمية
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  مباشر من قاعدة بيانات الحجاج
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  موسم {seasonYear}هـ
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                إدارة وتوزيع هدايا الحجاج
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                لوحة إدارية وميدانية متكاملة لتوثيق تسليم الهدايا (مباشر / بالإنابة)، متابعة الحجاج الذين لم يستلموا، وإصدار 13 تقريراً تفصيلياً مع الطباعة والتصدير.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setIsQuickDeliverModalOpen(true)}
              className="flex-1 lg:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              <span>تسجيل تسليم سريع</span>
            </button>
            <button
              type="button"
              onClick={() => exportOverallGiftReportCSV(giftDistributions, activePilgrims.length)}
              className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
              title="تصدير كشف الهدايا الإجمالي إلى Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">تصدير إجمالي</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="relative mt-7 pt-5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setCurrentSubTab('dashboard');
              if (onNavigateTab) onNavigateTab('giftDashboard');
            }}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition shrink-0 cursor-pointer ${
              currentSubTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>لوحة التحكم الإحصائية</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentSubTab('registry');
              if (onNavigateTab) onNavigateTab('giftRegistry');
            }}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition shrink-0 cursor-pointer ${
              currentSubTab === 'registry'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-800 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>سجل توزيع الهدايا</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                currentSubTab === 'registry'
                  ? 'bg-slate-950/25 text-slate-950'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {deliveredCount} / {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentSubTab('followup');
              if (onNavigateTab) onNavigateTab('giftFollowUp');
            }}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition shrink-0 cursor-pointer ${
              currentSubTab === 'followup'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>متابعة غير المستلمين</span>
            {pendingCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  currentSubTab === 'followup'
                    ? 'bg-red-950/30 text-slate-950'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {pendingCount} متبقي
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentSubTab('reports');
              if (onNavigateTab) onNavigateTab('giftReports');
            }}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition shrink-0 cursor-pointer ${
              currentSubTab === 'reports'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-800 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>منظومة التقارير الشاملة</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                currentSubTab === 'reports'
                  ? 'bg-slate-950/25 text-slate-950'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              13 تقريراً
            </span>
          </button>
        </div>
      </div>

      {/* Main View Display */}
      {currentSubTab === 'dashboard' && (
        <GiftDashboardView
          giftDistributions={giftDistributions}
          activePilgrims={activePilgrims}
          busesList={effectiveBuses}
          onNavigateTab={(tab) => setCurrentSubTab(tab)}
          onOpenQuickDelivery={() => setIsQuickDeliverModalOpen(true)}
          onExportOverallReport={() => exportOverallGiftReportCSV(giftDistributions, activePilgrims.length)}
        />
      )}

      {currentSubTab === 'registry' && (
        <GiftRegistryView
          giftDistributions={giftDistributions}
          activePilgrims={activePilgrims}
          busesList={effectiveBuses}
          currentStaffName={currentStaffName}
          onOpenDeliveryModal={(item) => setSelectedItemForDelivery(item)}
          onOpenFollowUpModal={(item) => setSelectedItemForFollowUp(item)}
          onOpenHistoryModal={(item) => setSelectedItemForHistory(item)}
          onPrintPreview={handleOpenPrintPreview}
        />
      )}

      {currentSubTab === 'followup' && (
        <GiftFollowUpView
          giftDistributions={giftDistributions}
          communications={communications}
          activePilgrims={activePilgrims}
          busesList={effectiveBuses}
          currentStaffName={currentStaffName}
          onOpenDeliveryModal={(item) => setSelectedItemForDelivery(item)}
          onOpenFollowUpModal={(item) => setSelectedItemForFollowUp(item)}
          onOpenHistoryModal={(item) => setSelectedItemForHistory(item)}
          onPrintPreview={handleOpenPrintPreview}
        />
      )}

      {currentSubTab === 'reports' && (
        <GiftReportsView
          giftDistributions={giftDistributions}
          communications={communications}
          activePilgrims={activePilgrims}
          busesList={effectiveBuses}
          currentStaffName={currentStaffName}
          onPrintPreview={handleOpenPrintPreview}
        />
      )}

      {/* Delivery Modal */}
      {selectedItemForDelivery && (
        <GiftDeliveryModal
          giftItem={selectedItemForDelivery}
          currentStaffName={currentStaffName}
          onSaveDelivery={handleSaveDelivery}
          onClose={() => setSelectedItemForDelivery(null)}
        />
      )}

      {/* Follow-Up Modal */}
      {selectedItemForFollowUp && (
        <GiftFollowUpModal
          giftItem={selectedItemForFollowUp}
          currentStaffName={currentStaffName}
          onSaveFollowUp={handleSaveFollowUp}
          onClose={() => setSelectedItemForFollowUp(null)}
        />
      )}

      {/* History Modal */}
      {selectedItemForHistory && (
        <GiftHistoryModal
          giftItem={selectedItemForHistory}
          communications={communications}
          onClose={() => setSelectedItemForHistory(null)}
          onOpenDeliveryModal={() => {
            const item = selectedItemForHistory;
            setSelectedItemForHistory(null);
            setSelectedItemForDelivery(item);
          }}
        />
      )}

      {/* Print Preview & PDF Modal */}
      {printModalConfig.isOpen && (
        <GiftPrintModal
          title={printModalConfig.title}
          subtitle={printModalConfig.subtitle}
          generatedBy={currentStaffName || 'مشرف النظام'}
          filterSummary={printModalConfig.filterSummary}
          columns={printModalConfig.columns}
          data={printModalConfig.data}
          summaryCards={printModalConfig.summaryCards}
          onClose={() => setPrintModalConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Quick Deliver Pilgrim Picker Modal */}
      {isQuickDeliverModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-amber-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0F172A] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    تسجيل تسليم هدية — اختيار الحاج
                  </h3>
                  <p className="text-xs text-slate-400">
                    ابحث بالاسم أو رقم الهوية أو الجوال لتسجيل التسليم مباشرة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickDeliverModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-800 bg-[#10192D]">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={quickSearchQuery}
                  onChange={(e) => setQuickSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم الرباعي، رقم الهوية/الإقامة، أو رقم الجوال..."
                  className="w-full bg-[#0B1221] border border-slate-700/80 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Pilgrims List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[55vh]">
              {quickDeliverPilgrims.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                  <p className="text-sm">لم يتم العثور على حجاج مطابقين لبيانات البحث</p>
                </div>
              ) : (
                quickDeliverPilgrims.map((pilgrim) => {
                  const existing = giftDistributions.find(
                    (g) => g.pilgrimId === pilgrim.id || g.nationalId === pilgrim.nationalId
                  );
                  const isDelivered =
                    existing &&
                    (existing.status === 'delivered_direct' || existing.status === 'delivered_proxy');

                  return (
                    <div
                      key={pilgrim.id}
                      onClick={() => handleSelectQuickPilgrim(pilgrim)}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isDelivered
                          ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-80'
                          : 'bg-[#10192D] border-slate-800 hover:border-amber-500/60 hover:bg-[#131f38]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                            isDelivered
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isDelivered ? <CheckCircle2 className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white truncate">
                              {getPilgrimFullName(pilgrim)}
                            </span>
                            {isDelivered && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                تم التسليم مسبقاً
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                            <span className="font-mono">هوية: {pilgrim.nationalId}</span>
                            {pilgrim.busNumber && <span>• {pilgrim.busNumber}</span>}
                            {pilgrim.mobile && (
                              <span className="font-mono" dir="ltr">
                                • {pilgrim.mobile}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                          isDelivered
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                        }`}
                      >
                        {isDelivered ? 'تعديل / تفاصيل' : 'تسجيل تسليم ←'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
