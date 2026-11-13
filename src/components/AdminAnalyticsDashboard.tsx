import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  Users,
  CheckCircle2,
  Clock,
  Package,
  Plane,
  Bus,
  TrendingUp,
  Award,
  Layers,
  ArrowUpRight,
  FileSpreadsheet,
  Star,
  RefreshCw,
  AlertCircle,
  Loader2,
  Info,
  X,
} from 'lucide-react';
import { Pilgrim, HajjPackage, Announcement, PilgrimFeedback } from '../types';
import { getDocuments, getSeasonPilgrims } from '../lib/db';
import { isPilgrimInSeason } from '../utils/pilgrimStats';

interface AdminAnalyticsDashboardProps {
  pilgrims: Pilgrim[];
  packages: HajjPackage[];
  announcements: Announcement[];
  feedback?: PilgrimFeedback[];
  onNavigateTab: (tab: 'pilgrims' | 'packages' | 'announcements' | 'staff' | 'settings' | 'feedback') => void;
  onExportCSV?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRefreshData?: () => Promise<void> | void;
}

const STATUS_COLORS: Record<string, string> = {
  'مقبول ومؤكد': '#10b981', // emerald
  'مكتمل الدفع': '#f59e0b', // amber
  'قيد المراجعة': '#3b82f6', // blue
  'معتذر': '#f43f5e', // rose
};

const PACKAGE_COLORS = [
  '#f59e0b', // amber
  '#6366f1', // indigo
  '#10b981', // emerald
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

export const AdminAnalyticsDashboard: React.FC<AdminAnalyticsDashboardProps> = ({
  pilgrims,
  packages,
  announcements,
  feedback = [],
  onNavigateTab,
  onExportCSV,
  isLoading: externalLoading = false,
  error: externalError = null,
  onRefreshData,
}) => {
  // Track initial data readiness so we don't show a misleading "0" before Firestore responds
  const [initialChecking, setInitialChecking] = useState<boolean>(() => pilgrims.length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(externalError);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'info';
    message: string;
  } | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() =>
    new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
  );
  const [syncedPilgrimsFallback, setSyncedPilgrimsFallback] = useState<Pilgrim[] | null>(null);

  useEffect(() => {
    setErrorMessage(externalError);
  }, [externalError]);

  // If pilgrims prop updates from parent subscription, clear initial checking state
  useEffect(() => {
    if (pilgrims.length > 0) {
      setInitialChecking(false);
      setSyncedPilgrimsFallback(null);
      setLastUpdatedTime(
        new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      );
    }
  }, [pilgrims]);

  // Perform a quick initial verification if pilgrims is empty on mount so we distinguish "Loading" vs "Truly 0 records"
  useEffect(() => {
    let isMounted = true;
    if (pilgrims.length > 0) {
      setInitialChecking(false);
      return;
    }

    const verifyInitialData = async () => {
      try {
        const fetched = await getSeasonPilgrims<Pilgrim>('1448');
        if (!isMounted) return;
        const activeFetched = fetched.filter(
          (p) => p.status !== 'معتذر' && p.status !== 'مرفوض' && p.status !== 'محذوف' && !p.isDeleted
        );
        if (activeFetched.length > 0 && pilgrims.length === 0) {
          setSyncedPilgrimsFallback(activeFetched);
        }
      } catch {
        // Keep silent on initial mount check; subscription handles live state
      } finally {
        if (isMounted) {
          setInitialChecking(false);
        }
      }
    };

    const timer = setTimeout(verifyInitialData, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [pilgrims.length]);

  // Auto-dismiss success feedback after 4.5 seconds
  useEffect(() => {
    if (!statusFeedback) return;
    const timer = setTimeout(() => {
      setStatusFeedback(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [statusFeedback]);

  const [selectedSeason, setSelectedSeason] = useState<'1448' | 'all'>('1448');

  const rawPilgrimsList =
    pilgrims.length > 0 ? pilgrims : syncedPilgrimsFallback || pilgrims;

  // Filter analytics to reflect strictly active season (1448) by default
  const effectivePilgrims = useMemo(() => {
    if (selectedSeason === 'all') return rawPilgrimsList;
    return rawPilgrimsList.filter((p) => isPilgrimInSeason(p, selectedSeason));
  }, [rawPilgrimsList, selectedSeason]);

  const isDataLoading = externalLoading || initialChecking || isRefreshing;

  const totalPilgrims = effectivePilgrims.length;
  const averageRating =
    feedback.length > 0
      ? (feedback.reduce((acc, curr) => acc + curr.rating, 0) / feedback.length).toFixed(1)
      : '0.0';
  const confirmedPilgrims = effectivePilgrims.filter(
    (p) =>
      p.status === 'مقبول ومؤكد' ||
      p.status === 'مكتمل الدفع' ||
      p.status === 'مكتمل' ||
      p.status === 'تم القبول' ||
      p.paymentReceived === true
  ).length;
  const pendingPilgrims = effectivePilgrims.filter((p) => p.status === 'قيد المراجعة').length;
  const apologizedPilgrims = effectivePilgrims.filter((p) => p.status === 'معتذر').length;
  const confirmationRate =
    totalPilgrims > 0 ? Math.round((confirmedPilgrims / totalPilgrims) * 100) : 0;

  // Flight vs Bus
  const flightCount = effectivePilgrims.filter((p) => p.transport === 'طائرة').length;
  const busCount = effectivePilgrims.filter((p) => p.transport === 'باص').length;

  // Gender breakdown
  const maleCount = effectivePilgrims.filter((p) => p.gender === 'ذكر').length;
  const femaleCount = effectivePilgrims.filter((p) => p.gender === 'أنثى').length;

  // Handle Manual Refresh
  const handleRefreshClick = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setErrorMessage(null);
    setStatusFeedback(null);

    try {
      if (onRefreshData) {
        await onRefreshData();
      } else {
        const fetched = await getSeasonPilgrims<Pilgrim>('1448');
        const activeFetched = fetched.filter(
          (p) => p.status !== 'معتذر' && p.status !== 'مرفوض' && p.status !== 'محذوف' && !p.isDeleted
        );
        if (activeFetched.length > 0 && pilgrims.length === 0) {
          setSyncedPilgrimsFallback(activeFetched);
        }
      }
      setLastUpdatedTime(
        new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      );
      setStatusFeedback({
        type: 'success',
        message: 'تم تحديث البيانات والمؤشرات الإحصائية بنجاح.',
      });
    } catch {
      setErrorMessage('تعذّر تحديث البيانات حالياً. يرجى التحقق من الاتصال بالشبكة والمحاولة مرة أخرى.');
    } finally {
      setIsRefreshing(false);
      setInitialChecking(false);
    }
  }, [isRefreshing, onRefreshData, pilgrims.length]);

  // Handle CSV Export with clear feedback
  const handleExportCSVClick = useCallback(() => {
    if (isDataLoading || totalPilgrims === 0 || !onExportCSV) return;
    try {
      onExportCSV();
      setStatusFeedback({
        type: 'success',
        message: `تم تصدير ملف CSV بنجاح (${totalPilgrims} سجل جاهز للفتح في Excel).`,
      });
    } catch {
      setErrorMessage('حدث خطأ أثناء تصدير ملف CSV. يرجى المحاولة مرة أخرى.');
    }
  }, [isDataLoading, totalPilgrims, onExportCSV]);

  // Package distribution data
  const packageStats = packages.map((pkg, idx) => {
    const count = effectivePilgrims.filter((p) => p.selectedPackage === pkg.title).length;
    const percentage = totalPilgrims > 0 ? Math.round((count / totalPilgrims) * 100) : 0;
    const numericPrice = parseInt(pkg.price.replace(/[^\d]/g, ''), 10) || 0;
    const estimatedRevenue = count * numericPrice;

    return {
      name: pkg.title,
      shortName: pkg.title.length > 18 ? pkg.title.substring(0, 16) + '...' : pkg.title,
      count,
      percentage,
      price: pkg.price,
      numericPrice,
      estimatedRevenue,
      type: pkg.type,
      color: PACKAGE_COLORS[idx % PACKAGE_COLORS.length],
    };
  });

  // Handle pilgrims with no package selected or other
  const assignedPilgrimsCount = packageStats.reduce((sum, item) => sum + item.count, 0);
  const unassignedCount = totalPilgrims - assignedPilgrimsCount;
  if (unassignedCount > 0) {
    packageStats.push({
      name: 'تسجيل عام (لم تُحدد باقة بعد)',
      shortName: 'تسجيل عام',
      count: unassignedCount,
      percentage: Math.round((unassignedCount / totalPilgrims) * 100),
      price: 'غير محدد',
      numericPrice: 0,
      estimatedRevenue: 0,
      type: 'عام',
      color: '#94a3b8',
    });
  }

  // Registration Status Pie Data
  const statusStats = [
    {
      name: 'مقبول ومؤكد',
      value: effectivePilgrims.filter(
        (p) => p.status === 'مقبول ومؤكد' || p.status === 'تم القبول'
      ).length,
      color: STATUS_COLORS['مقبول ومؤكد'],
    },
    {
      name: 'مكتمل الدفع',
      value: effectivePilgrims.filter(
        (p) => p.status === 'مكتمل الدفع' || p.status === 'مكتمل'
      ).length,
      color: STATUS_COLORS['مكتمل الدفع'],
    },
    {
      name: 'قيد المراجعة',
      value: pendingPilgrims,
      color: STATUS_COLORS['قيد المراجعة'],
    },
    {
      name: 'معتذر',
      value: apologizedPilgrims,
      color: STATUS_COLORS['معتذر'],
    },
  ].filter((item) => item.value > 0);

  // Hajj Type distribution
  const hajjTypeCounts: Record<string, number> = {};
  effectivePilgrims.forEach((p) => {
    const type = p.hajjType || 'تمتع';
    hajjTypeCounts[type] = (hajjTypeCounts[type] || 0) + 1;
  });

  const hajjTypeData = Object.entries(hajjTypeCounts).map(([type, count]) => ({
    type,
    count,
    percentage: totalPilgrims > 0 ? Math.round((count / totalPilgrims) * 100) : 0,
  }));

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-right text-xs space-y-1 text-white">
          <p className="font-bold text-amber-400">{label || payload[0]?.name}</p>
          <p className="text-slate-300">
            العدد: <span className="font-bold text-white font-mono">{payload[0]?.value}</span> حاج
          </p>
          {payload[0]?.payload?.percentage !== undefined && (
            <p className="text-slate-400">
              النسبة: <span className="text-amber-300 font-bold">{payload[0]?.payload?.percentage}%</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn text-right overflow-x-hidden" dir="rtl">
      {/* Top Banner & Quick Actions Card — Refined Executive Luxury Layout */}
      <section
        aria-labelledby="analytics-hero-heading"
        className="bg-gradient-to-l from-[#0B1221] via-[#10192D] to-[#1C160C] border border-amber-500/35 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl relative overflow-hidden"
      >
        {/* Subtle Decorative Gold Top Accent Line */}
        <div
          aria-hidden="true"
          className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/20 via-amber-400 to-amber-500/20"
        />

        <div className="flex flex-col gap-5 sm:gap-6">
          {/* Top Bar: Section Badge + Refresh Action */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/35 px-3 sm:px-3.5 py-1.5 rounded-full text-amber-300 text-[11px] sm:text-xs font-bold shadow-sm max-w-full">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span className="leading-snug">لوحة المؤشرات والتحليلات البيانية المباشرة</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mr-auto sm:mr-0">
              <span className="text-[11px] text-slate-300/80 hidden sm:inline-flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-amber-400/80" aria-hidden="true" />
                <span>آخر تحديث: {lastUpdatedTime}</span>
              </span>

              <div className="flex items-center gap-1.5 bg-[#15223B] border border-amber-500/30 rounded-xl px-2.5 py-1.5 shadow-sm">
                <span className="text-[11px] text-slate-300 font-bold whitespace-nowrap">الموسم:</span>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value as any)}
                  className="bg-transparent text-amber-300 text-xs font-bold focus:outline-none cursor-pointer"
                  title="تحديد نطاق إحصائيات الموسم"
                >
                  <option value="1448" className="bg-[#0B1221] text-amber-300">موسم 1448هـ (النشط)</option>
                  <option value="all" className="bg-[#0B1221] text-white">كافة المواسم والأرشيف</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleRefreshClick}
                disabled={isDataLoading}
                aria-label="تحديث البيانات والمؤشرات الإحصائية"
                aria-busy={isDataLoading}
                className="min-h-[38px] sm:min-h-[40px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#15223B] hover:bg-[#1C2D4D] text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-400/60 text-xs font-bold transition-all duration-150 inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1221] active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 shrink-0 text-amber-400 ${isDataLoading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{isDataLoading ? 'جاري التحديث...' : 'تحديث البيانات'}</span>
              </button>
            </div>
          </div>

          {/* Main Content Row: Title, Description & Action Buttons */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-end gap-5 lg:gap-8">
            {/* Right Column: Title, Description & Summary Pills */}
            <div className="space-y-3 flex-1 min-w-0">
              <h2
                id="analytics-hero-heading"
                className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-snug tracking-tight"
              >
                {selectedSeason === 'all' ? 'إحصائيات كافة المواسم والأرشيف العام' : 'إحصائيات موسم حج وعمرة 1448هـ النشط'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-2xl font-normal">
                متابعة فورية ومباشرة لأعداد الحجاج، نسب القبول وتأكيد الحجوزات، توزيع الباقات وسعة السفر مع تحليل الرسوم البيانية.
              </p>

              {/* Clear Status & Count Summary Strip */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B1221]/90 border border-slate-700/80 text-xs">
                  <span className="text-slate-300 font-medium">الحجاج النشطون:</span>
                  {isDataLoading ? (
                    <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>جاري التحميل...</span>
                    </span>
                  ) : totalPilgrims > 0 ? (
                    <span className="font-mono font-black text-amber-400 tabular-nums">
                      {totalPilgrims.toLocaleString('en-US')} حاج
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold">لا توجد بيانات مسجلة بعد</span>
                  )}
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B1221]/90 border border-slate-700/80 text-xs">
                  <span className="text-slate-300 font-medium">الباقات المعتمدة:</span>
                  {isDataLoading && packages.length === 0 ? (
                    <span className="text-amber-300 font-bold">...</span>
                  ) : (
                    <span className="font-mono font-black text-emerald-400 tabular-nums">
                      {packages.length} باقات
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Left Column: Responsive Touch-Friendly Action Buttons */}
            <div
              role="group"
              aria-label="إجراءات سريعة لإحصائيات الحجاج والباقات"
              className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:flex-wrap items-stretch gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0"
            >
              {/* Button 1: Export CSV */}
              {onExportCSV && (
                <button
                  type="button"
                  onClick={handleExportCSVClick}
                  disabled={isDataLoading || totalPilgrims === 0}
                  aria-label={
                    isDataLoading
                      ? 'جاري تحميل بيانات الحجاج قبل التصدير'
                      : totalPilgrims === 0
                      ? 'تصدير الحجاج CSV غير متاح لعدم وجود حجاج مسجلين'
                      : `تصدير بيانات الحجاج إلى ملف CSV وعددهم ${totalPilgrims} حاج`
                  }
                  title={
                    isDataLoading
                      ? 'انتظر اكتمال تحميل البيانات'
                      : totalPilgrims === 0
                      ? 'لا توجد سجلات حجاج متاحة للتصدير حالياً'
                      : 'تصدير بيانات جميع الحجاج المسجلين إلى ملف إكسل CSV'
                  }
                  className="min-h-[48px] sm:min-h-[46px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all duration-150 text-xs sm:text-sm flex items-center justify-between sm:justify-center gap-2.5 shadow-md hover:shadow-lg border border-emerald-400/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1221] active:scale-[0.98] disabled:bg-slate-800/90 disabled:text-slate-400 disabled:border-slate-700/80 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    {isDataLoading ? (
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin text-emerald-200" aria-hidden="true" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">تصدير الحجاج CSV</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-black tabular-nums shrink-0 ${
                      isDataLoading || totalPilgrims === 0
                        ? 'bg-slate-900/80 text-slate-400 border border-slate-700'
                        : 'bg-emerald-950/60 text-emerald-100 border border-emerald-400/30'
                    }`}
                  >
                    {isDataLoading
                      ? 'جاري التحميل'
                      : totalPilgrims > 0
                      ? totalPilgrims.toLocaleString('en-US')
                      : 'بدون بيانات'}
                  </span>
                </button>
              )}

              {/* Button 2: Navigate to Pilgrims List */}
              <button
                type="button"
                onClick={() => onNavigateTab('pilgrims')}
                aria-label={
                  isDataLoading
                    ? 'الانتقال إلى قائمة الحجاج (جاري تحميل العدد)'
                    : totalPilgrims > 0
                    ? `الانتقال إلى قائمة الحجاج وعددهم ${totalPilgrims} حاج`
                    : 'الانتقال إلى قائمة الحجاج (لا يوجد مسجلون حالياً)'
                }
                className="min-h-[48px] sm:min-h-[46px] px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-all duration-150 text-xs sm:text-sm flex items-center justify-between sm:justify-center gap-2.5 shadow-md hover:shadow-lg border border-amber-300/60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1221] active:scale-[0.98]"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Users className="w-4 h-4 shrink-0 text-slate-950" aria-hidden="true" />
                  <span className="truncate">قائمة الحجاج</span>
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-black tabular-nums bg-slate-950/15 text-slate-950 border border-slate-950/15 shrink-0">
                  {isDataLoading
                    ? '...'
                    : totalPilgrims > 0
                    ? totalPilgrims.toLocaleString('en-US')
                    : 'فتح السجل'}
                </span>
              </button>

              {/* Button 3: Navigate to Packages Management */}
              <button
                type="button"
                onClick={() => onNavigateTab('packages')}
                aria-label={`تعديل الباقات المعتمدة وعددها ${packages.length} باقات`}
                className="min-h-[48px] sm:min-h-[46px] px-4 py-2.5 bg-[#131F38] hover:bg-[#1A2A4A] text-white font-bold rounded-xl transition-all duration-150 text-xs sm:text-sm border border-amber-500/35 hover:border-amber-400/70 flex items-center justify-between sm:justify-center gap-2.5 shadow-sm hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1221] active:scale-[0.98]"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Package className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">تعديل الباقات</span>
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-black tabular-nums bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                  {isDataLoading && packages.length === 0 ? '...' : packages.length}
                </span>
              </button>
            </div>
          </div>

          {/* Dynamic Contextual UI State Banners (Loading, Error, Empty, Success) */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-100 text-xs sm:text-sm"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" aria-hidden="true" />
                <span className="font-bold leading-relaxed">{errorMessage}</span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleRefreshClick}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-100 font-bold text-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                >
                  إعادة المحاولة
                </button>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  aria-label="إغلاق رسالة الخطأ"
                  className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-500/20 transition cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {statusFeedback && !errorMessage && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-100 text-xs sm:text-sm"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="font-bold leading-relaxed">{statusFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusFeedback(null)}
                aria-label="إغلاق الإشعار"
                className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-500/20 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {!isDataLoading && !errorMessage && totalPilgrims === 0 && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0B1221]/90 border border-amber-500/30 text-slate-200 text-xs sm:text-sm"
            >
              <div className="flex items-start sm:items-center gap-2.5">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
                <span className="leading-relaxed">
                  لا توجد سجلات حجاج نشطة حالياً في هذا الموسم. ستظهر المؤشرات والأرقام تلقائياً فور تسجيل الحجاج، أو يمكنك تحديث البيانات للتحقق.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefreshClick}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-bold text-xs transition shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                تحقق الآن
              </button>
            </div>
          )}
        </div>
      </section>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* Total Pilgrims */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">إجمالي الحجاج المسجلين</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isDataLoading ? (
              <span className="h-8 w-20 rounded-lg bg-slate-800 animate-pulse inline-block" />
            ) : totalPilgrims > 0 ? (
              <>
                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                  {totalPilgrims}
                </span>
                <span className="text-xs text-amber-500 font-bold">حاج مسجل</span>
              </>
            ) : (
              <span className="text-sm font-bold text-slate-400">لا توجد بيانات بعد</span>
            )}
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
            <span>محدث تلقائياً مع كل تسجيل جديد</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>

        {/* Confirmed / Paid */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">المؤكدون ومكتملو الدفع</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            {isDataLoading ? (
              <span className="h-8 w-20 rounded-lg bg-slate-800 animate-pulse inline-block" />
            ) : totalPilgrims > 0 ? (
              <>
                <span className="text-3xl font-black text-emerald-500 font-mono tabular-nums">
                  {confirmedPilgrims}
                </span>
                <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold">
                  {confirmationRate}% نسبة الإنجاز
                </span>
              </>
            ) : (
              <span className="text-sm font-bold text-slate-400">بانتظار التسجيل</span>
            )}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            جاهزون لإصدار تصاريح الحج الرسمية
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* Pending Review */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">طلبات قيد المراجعة</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isDataLoading ? (
              <span className="h-8 w-20 rounded-lg bg-slate-800 animate-pulse inline-block" />
            ) : totalPilgrims > 0 ? (
              <>
                <span className="text-3xl font-black text-blue-500 font-mono tabular-nums">
                  {pendingPilgrims}
                </span>
                <span className="text-xs text-slate-400">بانتظار الاعتماد</span>
              </>
            ) : (
              <span className="text-sm font-bold text-slate-400">لا توجد طلبات معلقة</span>
            )}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            تتطلب مراجعة البيانات البنكية والمحرم
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
        </div>

        {/* Transport Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">توزيع وسيلة السفر</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <Bus className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-indigo-500 shrink-0" aria-hidden="true" />
              <span className="font-bold text-slate-800 dark:text-slate-200">حافلات:</span>
              <span className="font-mono font-bold text-indigo-500">
                {isDataLoading ? '...' : totalPilgrims > 0 ? busCount : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Plane className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
              <span className="font-bold text-slate-800 dark:text-slate-200">طيران:</span>
              <span className="font-mono font-bold text-amber-500">
                {isDataLoading ? '...' : totalPilgrims > 0 ? flightCount : '—'}
              </span>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${totalPilgrims > 0 ? (busCount / totalPilgrims) * 100 : 50}%` }}
              title={`باصات: ${busCount}`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${totalPilgrims > 0 ? (flightCount / totalPilgrims) * 100 : 50}%` }}
              title={`طيران: ${flightCount}`}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
        </div>

        {/* Feedback Summary KPI */}
        <button
          type="button"
          onClick={() => onNavigateTab('feedback')}
          className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition cursor-pointer text-right w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">تقييم جودة الخدمات</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-amber-500" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {feedback.length > 0 ? (
              <>
                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                  {averageRating}
                </span>
                <span className="text-xs text-amber-500 font-bold">/ 5.0</span>
              </>
            ) : (
              <span className="text-sm font-bold text-slate-400">لا توجد تقييمات بعد</span>
            )}
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>{feedback.length > 0 ? `من إجمالي ${feedback.length} تقييم` : 'عرض سجل التقييمات'}</span>
            <span className="text-amber-500 font-bold">عرض الكل</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </button>
      </div>

      {/* Main Charts Row: Package Distribution (Bar Chart) & Registration Status (Pie Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Bar Chart: Pilgrims per Package */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />
                <span>توزيع الحجاج حسب الباقات</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مقارنة الإقبال على باقات الحج والعمرة والرحلات المتاحة
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full shrink-0">
              {packages.length} باقات معتمدة
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {isDataLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" aria-hidden="true" />
                <span>جاري تحميل الرسم البياني لتوزيع الباقات...</span>
              </div>
            ) : totalPilgrims > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={packageStats} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis
                    dataKey="shortName"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="عدد الحجاج" radius={[8, 8, 0, 0]}>
                    {packageStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                لا توجد بيانات مسجلين حالياً لعرض الرسم البياني
              </div>
            )}
          </div>

          {/* Quick Package Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {packageStats.slice(0, 3).map((pkg, i) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center gap-2"
              >
                <div className="space-y-0.5 truncate min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{pkg.name}</div>
                  <div className="text-slate-400 font-mono truncate">{pkg.price}</div>
                </div>
                <div className="text-left font-mono shrink-0">
                  {isDataLoading ? (
                    <span className="text-xs text-slate-400">...</span>
                  ) : totalPilgrims > 0 ? (
                    <>
                      <span className="text-base font-black text-amber-500">{pkg.count}</span>
                      <span className="text-slate-400 text-[10px] block">حاج ({pkg.percentage}%)</span>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400">بدون مسجلين</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart: Registration Status */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 min-w-0">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>حالات التسجيل والقبول</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                نسب ومراحل قبول الحجاج والجاهزية
              </p>
            </div>
          </div>

          <div className="h-64 w-full relative flex items-center justify-center">
            {isDataLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" aria-hidden="true" />
                <span>جاري تحميل نسب القبول...</span>
              </div>
            ) : totalPilgrims > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={statusStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {statusStats.map((entry, index) => (
                      <Cell key={`status-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm">لا توجد بيانات حالياً</div>
            )}
            {/* Center Total Overlay */}
            {!isDataLoading && totalPilgrims > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {totalPilgrims}
                </span>
                <span className="text-[11px] text-slate-400 font-bold">إجمالي الحجاج</span>
              </div>
            )}
          </div>

          {/* Legend Items */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            {statusStats.map((st, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: st.color }}
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-bold truncate">
                    {st.name}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                  {st.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Row: Additional Analytics & Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hajj Type Distribution */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
              <span>نوع الحج المسجل به</span>
            </h4>
            <span className="text-xs text-slate-400">فقهي</span>
          </div>

          <div className="space-y-3 pt-1">
            {hajjTypeData.length > 0 ? (
              hajjTypeData.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">حج {item.type}</span>
                    <span className="text-slate-500 font-mono">
                      {item.count} حاج ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                {isDataLoading ? 'جاري التحميل...' : 'لا توجد بيانات مسجلة حالياً'}
              </p>
            )}
          </div>
        </div>

        {/* Gender Demographics */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500 shrink-0" aria-hidden="true" />
              <span>توزيع الحجاج حسب الجنس</span>
            </h4>
            <span className="text-xs text-slate-400">إحصاء ديموغرافي</span>
          </div>

          <div className="flex items-center justify-around py-4">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto text-xl font-black">
                👨
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">رجال</div>
              <div className="font-mono text-lg font-black text-blue-500">
                {isDataLoading ? '...' : totalPilgrims > 0 ? maleCount : '—'}
              </div>
              <div className="text-[11px] text-slate-400">
                {totalPilgrims > 0 ? `${Math.round((maleCount / totalPilgrims) * 100)}%` : 'لا توجد بيانات'}
              </div>
            </div>

            <div className="h-16 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center mx-auto text-xl font-black">
                🧕
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">نساء</div>
              <div className="font-mono text-lg font-black text-pink-500">
                {isDataLoading ? '...' : totalPilgrims > 0 ? femaleCount : '—'}
              </div>
              <div className="text-[11px] text-slate-400">
                {totalPilgrims > 0 ? `${Math.round((femaleCount / totalPilgrims) * 100)}%` : 'لا توجد بيانات'}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            تسهيل ترتيب توزيع الغرف والمخيمات بين الرجال والنساء
          </p>
        </div>

        {/* Announcements & Lessons Overview */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
              <span>إعلانات ودروس القافلة</span>
            </h4>
            <span className="text-xs text-slate-400">{announcements.length} منشورة</span>
          </div>

          <div className="space-y-2.5">
            {announcements.slice(0, 3).map((ann) => (
              <div
                key={ann.id}
                className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-white truncate min-w-0 flex-1">
                    {ann.title}
                  </span>
                  <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold shrink-0">
                    {ann.category}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] line-clamp-1">{ann.content}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('announcements')}
            className="w-full text-center text-xs font-bold text-amber-500 hover:text-amber-400 transition pt-1 flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg py-1"
          >
            <span>إدارة التعاميم والدروس</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Package Performance & Registration Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />
              <span>جدول أداء الباقات ونسب التسجيل المفصلة</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تفاصيل الإشغال والرسوم ونسب الإقبال لكل باقة
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('packages')}
            className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg px-2 py-1"
          >
            <span>تعديل وحذف الباقات</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">اسم الباقة</th>
                <th className="px-5 py-3.5">نوع الرحلة</th>
                <th className="px-5 py-3.5">سعر المقعد</th>
                <th className="px-5 py-3.5 text-center">عدد المسجلين</th>
                <th className="px-5 py-3.5">نسبة الإقبال</th>
                <th className="px-5 py-3.5">شريط التقدم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {packageStats.map((pkg, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="px-5 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: pkg.color }}
                      />
                      <span>{pkg.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                      {pkg.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-amber-500 font-mono whitespace-nowrap">
                    {pkg.price}
                  </td>
                  <td className="px-5 py-4 text-center font-mono font-black text-slate-900 dark:text-white">
                    {isDataLoading ? '...' : totalPilgrims > 0 ? pkg.count : '—'}
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {isDataLoading ? '...' : totalPilgrims > 0 ? `${pkg.percentage}%` : '—'}
                  </td>
                  <td className="px-5 py-4 w-44">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pkg.percentage}%`,
                          backgroundColor: pkg.color,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
