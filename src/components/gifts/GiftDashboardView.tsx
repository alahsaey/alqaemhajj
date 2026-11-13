import React from 'react';
import {
  Gift,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  UserCheck,
  UserX,
  Calendar,
  Bus,
  Plane,
  Sparkles,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { GiftDistribution, Pilgrim } from '../../types';

interface GiftDashboardViewProps {
  giftDistributions: GiftDistribution[];
  activePilgrims: Pilgrim[];
  busesList: string[];
  onNavigateTab: (tab: 'registry' | 'followup' | 'reports') => void;
  onOpenQuickDelivery?: () => void;
  onExportOverallReport: () => void;
}

export const GiftDashboardView: React.FC<GiftDashboardViewProps> = ({
  giftDistributions,
  activePilgrims,
  busesList,
  onNavigateTab,
  onOpenQuickDelivery,
  onExportOverallReport,
}) => {
  // 1. Core KPIs
  const totalPilgrimsCount = activePilgrims.length;
  const totalAllocatedGifts = totalPilgrimsCount; // Exactly 1 gift allocated per pilgrim

  const deliveredDirectCount = giftDistributions.filter((g) => g.status === 'delivered_direct').length;
  const deliveredProxyCount = giftDistributions.filter((g) => g.status === 'delivered_proxy').length;
  const totalDeliveredCount = deliveredDirectCount + deliveredProxyCount;

  const notDeliveredCount = Math.max(0, totalPilgrimsCount - totalDeliveredCount);
  const contactedNoShowCount = giftDistributions.filter(
    (g) => g.status === 'contacted_no_show' || g.followUpStatus === 'contacted_no_show'
  ).length;
  const unableToDeliverCount = giftDistributions.filter((g) => g.status === 'unable_to_deliver').length;
  const postponedCount = giftDistributions.filter((g) => g.status === 'postponed').length;

  const completionRate =
    totalPilgrimsCount > 0 ? Math.round((totalDeliveredCount / totalPilgrimsCount) * 100) : 0;
  const directRate =
    totalDeliveredCount > 0 ? Math.round((deliveredDirectCount / totalDeliveredCount) * 100) : 0;
  const proxyRate =
    totalDeliveredCount > 0 ? Math.round((deliveredProxyCount / totalDeliveredCount) * 100) : 0;

  // 2. Chart 1: Delivery status breakdown
  const deliveryStatusPieData = [
    { name: 'تسليم مباشر للحاج', value: deliveredDirectCount, color: '#10b981' }, // emerald
    { name: 'تسليم بالإنابة', value: deliveredProxyCount, color: '#38bdf8' }, // sky
    { name: 'مؤجل لموعد آخر', value: postponedCount, color: '#a855f7' }, // purple
    { name: 'تم التواصل ولم يحضر', value: contactedNoShowCount, color: '#f59e0b' }, // amber
    { name: 'تعذر التسليم', value: unableToDeliverCount, color: '#f43f5e' }, // rose
    {
      name: 'لم يتم التسليم بعد',
      value: Math.max(0, notDeliveredCount - contactedNoShowCount - unableToDeliverCount - postponedCount),
      color: '#475569',
    }, // slate
  ].filter((d) => d.value > 0);

  // 3. Chart 2: Direct vs Proxy
  const deliveryTypeData = [
    { name: 'تسليم مباشر', value: deliveredDirectCount, color: '#10b981' },
    { name: 'تسليم بالإنابة', value: deliveredProxyCount, color: '#38bdf8' },
  ].filter((d) => d.value > 0);

  // 4. Chart 3: Distribution by Bus
  const busChartData = busesList.map((busName) => {
    const pilgrimsInBus = activePilgrims.filter((p) => (p.busNumber || '').trim() === busName.trim());
    const giftsInBus = giftDistributions.filter(
      (g) =>
        (g.busNumber || '').trim() === busName.trim() &&
        (g.status === 'delivered_direct' || g.status === 'delivered_proxy')
    );
    const busDirect = giftsInBus.filter((g) => g.status === 'delivered_direct').length;
    const busProxy = giftsInBus.filter((g) => g.status === 'delivered_proxy').length;
    const busRemaining = Math.max(0, pilgrimsInBus.length - giftsInBus.length);

    return {
      name: busName,
      'تسليم مباشر': busDirect,
      'تسليم بالإنابة': busProxy,
      'متبقي': busRemaining,
      total: pilgrimsInBus.length,
    };
  });

  // 5. Chart 4: Distribution by Flight
  const flightMap = new Map<string, { direct: number; proxy: number; remaining: number }>();
  activePilgrims.forEach((p) => {
    const flight = (p.flightNumberOutbound || p.flightNumberReturn || p.flightTicketNumber || '').trim() || 'طيران عام';
    if (!flightMap.has(flight)) {
      flightMap.set(flight, { direct: 0, proxy: 0, remaining: 0 });
    }
  });

  activePilgrims.forEach((p) => {
    const flight = (p.flightNumberOutbound || p.flightNumberReturn || p.flightTicketNumber || '').trim() || 'طيران عام';
    const gift = giftDistributions.find((g) => g.pilgrimId === p.id || g.nationalId === p.nationalId);
    const entry = flightMap.get(flight)!;
    if (gift?.status === 'delivered_direct') {
      entry.direct++;
    } else if (gift?.status === 'delivered_proxy') {
      entry.proxy++;
    } else {
      entry.remaining++;
    }
  });

  const flightChartData: any[] = [];
  flightMap.forEach((val, key) => {
    flightChartData.push({
      name: key,
      'تسليم مباشر': val.direct,
      'تسليم بالإنابة': val.proxy,
      'متبقي': val.remaining,
    });
  });

  // 6. Chart 5: Daily Delivery Timeline
  const dailyMap = new Map<string, number>();
  giftDistributions.forEach((g) => {
    if (g.deliveryDate && (g.status === 'delivered_direct' || g.status === 'delivered_proxy')) {
      dailyMap.set(g.deliveryDate, (dailyMap.get(g.deliveryDate) || 0) + 1);
    }
  });

  const dailyTimelineData = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, 'عدد الهدايا المسلمة': count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Hero Strip with Action Shortcuts */}
      <div className="bg-gradient-to-l from-amber-500/15 via-[#10192D] to-[#0B1221] border border-amber-500/35 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full text-amber-300 text-xs font-bold shadow-sm">
            <Gift className="w-4 h-4 text-amber-400" />
            <span>لوحة المؤشرات والتحليلات الرقابية لتوزيع الهدايا — موسم 1448هـ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
            إدارة وتوثيق تسليم هدايا ضيوف الرحمن
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            نظام رقابي وتشغيلي متكامل يوثق تسليم الهدايا للحجاج مباشرة أو بالإنابة، ومتابعة غير المستلمين مع الربط التلقائي ببيانات الباصات والرحلات.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-end">
          <button
            type="button"
            onClick={() => onNavigateTab('registry')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer active:scale-95"
          >
            <UserCheck className="w-4 h-4" />
            <span>سجل توزيع الهدايا</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('followup')}
            className="px-4 py-2.5 rounded-xl bg-[#15223B] hover:bg-[#1E3052] text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>متابعة غير المستلمين ({notDeliveredCount})</span>
          </button>
          <button
            type="button"
            onClick={onExportOverallReport}
            className="px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-500/40 shadow-sm flex items-center gap-2 transition cursor-pointer active:scale-95"
            title="تصدير التقرير الإجمالي إلى ملف Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير التقرير الإجمالي</span>
          </button>
        </div>
      </div>

      {/* Progress Bar Header */}
      <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>نسبة إنجاز التوزيع العام للهدايا:</span>
            <strong className="text-amber-400 font-mono text-base">{completionRate}%</strong>
          </span>
          <span className="text-slate-400 font-mono">
            {totalDeliveredCount} من {totalAllocatedGifts} هدية مستلمة
          </span>
        </div>
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${totalPilgrimsCount > 0 ? (deliveredDirectCount / totalPilgrimsCount) * 100 : 0}%` }}
            title={`تسليم مباشر: ${deliveredDirectCount}`}
          />
          <div
            className="h-full bg-sky-400 transition-all duration-500"
            style={{ width: `${totalPilgrimsCount > 0 ? (deliveredProxyCount / totalPilgrimsCount) * 100 : 0}%` }}
            title={`تسليم بالإنابة: ${deliveredProxyCount}`}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>مباشر: {deliveredDirectCount} ({directRate}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              <span>إنابة: {deliveredProxyCount} ({proxyRate}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
              <span>متبقي: {notDeliveredCount}</span>
            </span>
          </div>
          <span className="text-amber-400 font-medium">موسم 1448هـ النشط</span>
        </div>
      </div>

      {/* 10 Core KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: إجمالي عدد الحجاج */}
        <div className="bg-[#0B1221] border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">إجمالي الحجاج</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white font-mono tabular-nums">{totalPilgrimsCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">الحجاج المسجلين بالموسم</span>
          </div>
        </div>

        {/* KPI 2: إجمالي الهدايا المخصصة */}
        <div className="bg-[#0B1221] border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300">الهدايا المخصصة</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-400 font-mono tabular-nums">{totalAllocatedGifts}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">هدية واحدة لكل حاج</span>
          </div>
        </div>

        {/* KPI 3: التسليم المباشر للحاج */}
        <div className="bg-[#0B1221] border border-emerald-500/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400">تسليم مباشر للحاج</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">{deliveredDirectCount}</span>
            <span className="text-[10px] text-emerald-300/80 block mt-0.5">{directRate}% من المسلّم</span>
          </div>
        </div>

        {/* KPI 4: التسليم بالإنابة */}
        <div className="bg-[#0B1221] border border-sky-500/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-400">تسليم بالإنابة</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-sky-400 font-mono tabular-nums">{deliveredProxyCount}</span>
            <span className="text-[10px] text-sky-300/80 block mt-0.5">{proxyRate}% من المسلّم</span>
          </div>
        </div>

        {/* KPI 5: إجمالي الهدايا المسلمة */}
        <div className="bg-[#0B1221] border border-amber-500/40 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white">إجمالي المسلّم</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white font-mono tabular-nums">{totalDeliveredCount}</span>
            <span className="text-[10px] text-amber-300 block mt-0.5">إنجاز كلي: {completionRate}%</span>
          </div>
        </div>

        {/* KPI 6: لم يستلموا بعد */}
        <div className="bg-[#0B1221] border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300">لم يستلموا بعد</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-200 font-mono tabular-nums">{notDeliveredCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">جاهزة للتسليم</span>
          </div>
        </div>

        {/* KPI 7: تم التواصل ولم يحضر */}
        <div className="bg-[#0B1221] border border-amber-500/20 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400">تواصل ولم يحضر</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-400 font-mono tabular-nums">{contactedNoShowCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">بحاجة لإعادة التواصل</span>
          </div>
        </div>

        {/* KPI 8: تعذر التسليم */}
        <div className="bg-[#0B1221] border border-rose-500/20 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400">تعذر التسليم</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-400 font-mono tabular-nums">{unableToDeliverCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">مسجلة بالأسباب</span>
          </div>
        </div>

        {/* KPI 9: مؤجل لموعد آخر */}
        <div className="bg-[#0B1221] border border-purple-500/20 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-400">مؤجل لموعد آخر</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-purple-400 font-mono tabular-nums">{postponedCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">محدد بمواعيد قادمة</span>
          </div>
        </div>

        {/* KPI 10: نسبة الإنجاز الإجمالية */}
        <div className="bg-gradient-to-br from-amber-500/20 to-[#10192D] border border-amber-500/50 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-300">نسبة الإنجاز</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              %
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-400 font-mono tabular-nums">{completionRate}%</span>
            <span className="text-[10px] text-slate-300 block mt-0.5">نسبة المستلمين الفعليين</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Donut Breakdown */}
        <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black text-white">توزيع حالات الهدايا (مسلمة / متبقية / أخرى)</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">إجمالي: {totalPilgrimsCount}</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deliveryStatusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {deliveryStatusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} هدية`, name]}
                  contentStyle={{ backgroundColor: '#0B1221', borderColor: '#334155', borderRadius: '12px', textAlign: 'right' }}
                />
                <Legend
                  formatter={(value) => <span className="text-[11px] text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Direct vs Proxy Bar/Pie */}
        <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-black text-white">التسليم المباشر للحاج مقابل التسليم بالإنابة</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">مسلّم: {totalDeliveredCount}</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deliveryTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {deliveryTypeData.map((entry, index) => (
                    <Cell key={`type-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} عملية تسليم`, name]}
                  contentStyle={{ backgroundColor: '#0B1221', borderColor: '#334155', borderRadius: '12px', textAlign: 'right' }}
                />
                <Legend
                  formatter={(value) => <span className="text-[11px] text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Distribution by Bus */}
        <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Bus className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-black text-white">توزيع عمليات التسليم حسب الحافلات</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{busesList.length} حافلات</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={busChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1221', borderColor: '#334155', borderRadius: '12px', textAlign: 'right' }}
                />
                <Legend formatter={(val) => <span className="text-[11px] text-slate-300">{val}</span>} />
                <Bar dataKey="تسليم مباشر" fill="#10b981" stackId="a" />
                <Bar dataKey="تسليم بالإنابة" fill="#38bdf8" stackId="a" />
                <Bar dataKey="متبقي" fill="#475569" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Daily Delivery Timeline */}
        <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black text-white">توزيع عمليات التسليم حسب الأيام</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">سجل زمني</span>
          </div>

          <div className="h-64">
            {dailyTimelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                سيظهر الرسم البياني الزمني فور بدء تسجيل عمليات التسليم بالأيام.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTimelineData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1221', borderColor: '#334155', borderRadius: '12px', textAlign: 'right' }}
                  />
                  <Bar dataKey="عدد الهدايا المسلمة" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
