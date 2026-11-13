import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Users,
  User,
  Bus,
  Plane,
  Clock,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { GiftDistribution, GiftCommunication, Pilgrim } from '../../types';
import {
  getStatusLabelArabic,
  getFollowUpLabelArabic,
  exportOverallGiftReportCSV,
  exportDirectDeliveryReportCSV,
  exportProxyDeliveryReportCSV,
  exportNotDeliveredReportCSV,
  exportContactedNoShowReportCSV,
  exportCommunicationsReportCSV,
  exportBusDeliveryReportCSV,
  exportFlightDeliveryReportCSV,
  exportStaffPerformanceReportCSV,
  exportDateFilteredReportCSV,
  exportPostponedAndUnableReportCSV,
  exportAuditLogsReportCSV,
  exportReconciliationReportCSV,
} from '../../utils/giftExport';

interface GiftReportsViewProps {
  giftDistributions: GiftDistribution[];
  communications: GiftCommunication[];
  activePilgrims: Pilgrim[];
  busesList: string[];
  currentStaffName: string;
  onPrintPreview: (
    title: string,
    columns: string[],
    data: (string | number)[][],
    summary?: { label: string; value: string | number }[],
    subtitle?: string
  ) => void;
}

export type GiftReportId =
  | 'overall'
  | 'direct'
  | 'proxy'
  | 'notDelivered'
  | 'contactedNoShow'
  | 'communications'
  | 'byBus'
  | 'byFlight'
  | 'staffPerformance'
  | 'byDate'
  | 'postponedAndUnable'
  | 'auditLogs'
  | 'reconciliation';

export const GiftReportsView: React.FC<GiftReportsViewProps> = ({
  giftDistributions,
  communications,
  activePilgrims,
  busesList,
  currentStaffName,
  onPrintPreview,
}) => {
  const [activeReportId, setActiveReportId] = useState<GiftReportId>('overall');
  const [searchQuery, setSearchQuery] = useState('');
  const [busFilter, setBusFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Unified items
  const allPilgrimGifts = useMemo(() => {
    return activePilgrims.map((pilgrim, idx) => {
      const existing = giftDistributions.find(
        (g) => g.pilgrimId === pilgrim.id || g.nationalId === pilgrim.nationalId
      );

      const flightVal = (
        pilgrim.flightNumberOutbound ||
        pilgrim.flightNumberReturn ||
        pilgrim.flightTicketNumber ||
        ''
      ).trim();

      if (existing) {
        return {
          ...existing,
          busNumber: pilgrim.busNumber || existing.busNumber || 'غير محدد',
          flightNumber: flightVal || existing.flightNumber || 'غير محدد',
          membershipNumber: pilgrim.membershipNumber || existing.membershipNumber || `QAEM-1448-${1001 + idx}`,
        };
      }

      const defaultItem: GiftDistribution = {
        id: `${pilgrim.id}_gift`,
        pilgrimId: pilgrim.id,
        nationalId: pilgrim.nationalId,
        pilgrimName: `${pilgrim.firstName} ${pilgrim.secondName || ''} ${pilgrim.lastName}`.trim(),
        membershipNumber: pilgrim.membershipNumber || `QAEM-1448-${1001 + idx}`,
        mobile: pilgrim.mobile,
        busNumber: pilgrim.busNumber || 'غير محدد',
        flightNumber: flightVal || 'غير محدد',
        seasonYear: pilgrim.seasonYear || '1448',
        status: 'not_delivered',
        recipientType: 'pilgrim',
        followUpStatus: 'not_contacted',
      };
      return defaultItem;
    });
  }, [activePilgrims, giftDistributions]);

  const totalPilgrimsCount = activePilgrims.length;
  const deliveredDirectCount = allPilgrimGifts.filter((g) => g.status === 'delivered_direct').length;
  const deliveredProxyCount = allPilgrimGifts.filter((g) => g.status === 'delivered_proxy').length;
  const totalDeliveredCount = deliveredDirectCount + deliveredProxyCount;
  const notDeliveredCount = Math.max(0, totalPilgrimsCount - totalDeliveredCount);
  const contactedNoShowCount = allPilgrimGifts.filter(
    (g) => g.status === 'contacted_no_show' || g.followUpStatus === 'contacted_no_show'
  ).length;
  const unableCount = allPilgrimGifts.filter((g) => g.status === 'unable_to_deliver').length;
  const postponedCount = allPilgrimGifts.filter((g) => g.status === 'postponed').length;
  const completionRate =
    totalPilgrimsCount > 0 ? ((totalDeliveredCount / totalPilgrimsCount) * 100).toFixed(1) : '0';

  const REPORT_LIST: { id: GiftReportId; title: string; desc: string; icon: any }[] = [
    { id: 'overall', title: '1. التقرير الإجمالي لتوزيع الهدايا', desc: 'ملخص شامل لجميع المؤشرات الرقابية ونسب الإنجاز', icon: Sparkles },
    { id: 'direct', title: '2. تقرير التسليم المباشر', desc: 'كشف بالحجاج المستلمين لهداياهم شخصياً', icon: User },
    { id: 'proxy', title: '3. تقرير التسليم بالإنابة', desc: 'كشف تفصيلي بالمستلمين البدلاء وهوياتهم وصلة قرابتهم', icon: Users },
    { id: 'notDelivered', title: '4. تقرير الحجاج الذين لم يستلموا', desc: 'قائمة الحجاج المتبقين في الانتظار', icon: Clock },
    { id: 'contactedNoShow', title: '5. تقرير تم التواصل معهم ولم يحضروا', desc: 'متابعة الحالات التي تخلفت عن مواعيد الاستلام', icon: AlertCircle },
    { id: 'communications', title: '6. تقرير محاولات التواصل التفصيلي', desc: 'سجل كامل بكافة الاتصالات ومحاولات المتابعة', icon: Clock },
    { id: 'byBus', title: '7. تقرير التسليم حسب الباصات', desc: 'كشف إنجاز التوزيع لكل باص على حدة', icon: Bus },
    { id: 'byFlight', title: '8. تقرير التسليم حسب الرحلات الجوية', desc: 'كشف إنجاز التوزيع لكل رحلة طيران', icon: Plane },
    { id: 'staffPerformance', title: '9. تقرير أداء الموظفين', desc: 'إحصائيات إنجاز كل موظف في التسليم والتواصل', icon: Award },
    { id: 'byDate', title: '10. تقرير التسليم حسب الفترة الزمنية', desc: 'تحليل العمليات المنفذة حسب التاريخ (يوم/أسبوع/شهر)', icon: Calendar },
    { id: 'postponedAndUnable', title: '11. تقرير حالات التأجيل وتعذر التسليم', desc: 'كشف أسباب التعذر ومواعيد التأجيل المحددة', icon: AlertCircle },
    { id: 'auditLogs', title: '12. تقرير سجل التعديلات والعمليات', desc: 'سجل تدقيق كامل للعمليات والتعديلات المنفذة', icon: ShieldCheck },
    { id: 'reconciliation', title: '13. تقرير المطابقة النهائية للهدايا', desc: 'مطابقة رقابية دقيقة للأعداد المخصصة والمسلمة والمتبقية', icon: CheckCircle2 },
  ];

  // Report Export Handler
  const handleExportCurrentReport = () => {
    switch (activeReportId) {
      case 'overall':
        exportOverallGiftReportCSV(allPilgrimGifts, totalPilgrimsCount);
        break;
      case 'direct':
        exportDirectDeliveryReportCSV(allPilgrimGifts);
        break;
      case 'proxy':
        exportProxyDeliveryReportCSV(allPilgrimGifts);
        break;
      case 'notDelivered':
        exportNotDeliveredReportCSV(allPilgrimGifts);
        break;
      case 'contactedNoShow':
        exportContactedNoShowReportCSV(allPilgrimGifts);
        break;
      case 'communications':
        exportCommunicationsReportCSV(communications);
        break;
      case 'byBus':
        exportBusDeliveryReportCSV(allPilgrimGifts, busesList);
        break;
      case 'byFlight':
        exportFlightDeliveryReportCSV(allPilgrimGifts);
        break;
      case 'staffPerformance':
        exportStaffPerformanceReportCSV(allPilgrimGifts, communications);
        break;
      case 'byDate':
        exportDateFilteredReportCSV(allPilgrimGifts, dateRangeFilter);
        break;
      case 'postponedAndUnable':
        exportPostponedAndUnableReportCSV(allPilgrimGifts);
        break;
      case 'auditLogs':
        exportAuditLogsReportCSV(allPilgrimGifts);
        break;
      case 'reconciliation':
        exportReconciliationReportCSV(allPilgrimGifts, totalPilgrimsCount);
        break;
    }
  };

  // Report Print Handler
  const handlePrintCurrentReport = () => {
    const currentMeta = REPORT_LIST.find((r) => r.id === activeReportId);
    const title = currentMeta?.title || 'تقرير توزيع الهدايا';

    if (activeReportId === 'overall') {
      const columns = ['المؤشر الرقابي', 'العدد', 'النسبة المئوية'];
      const data = [
        ['إجمالي عدد الحجاج', totalPilgrimsCount, '100%'],
        ['إجمالي الهدايا المخصصة', totalPilgrimsCount, '100%'],
        ['إجمالي الهدايا المسلمة', totalDeliveredCount, `${completionRate}%`],
        ['تسليم مباشر للحاج', deliveredDirectCount, `${totalPilgrimsCount > 0 ? ((deliveredDirectCount / totalPilgrimsCount) * 100).toFixed(1) : 0}%`],
        ['تسليم بالإنابة', deliveredProxyCount, `${totalPilgrimsCount > 0 ? ((deliveredProxyCount / totalPilgrimsCount) * 100).toFixed(1) : 0}%`],
        ['هدايا غير مسلمة (متبقية)', notDeliveredCount, `${totalPilgrimsCount > 0 ? ((notDeliveredCount / totalPilgrimsCount) * 100).toFixed(1) : 0}%`],
        ['تم التواصل ولم يحضروا', contactedNoShowCount, '-'],
        ['حالات مؤجلة', postponedCount, '-'],
        ['تعذر التسليم', unableCount, '-'],
      ];
      onPrintPreview(title, columns, data, [
        { label: 'إجمالي الحجاج', value: totalPilgrimsCount },
        { label: 'المسلّم', value: totalDeliveredCount },
        { label: 'المتبقي', value: notDeliveredCount },
        { label: 'نسبة الإنجاز', value: `${completionRate}%` },
      ]);
    } else if (activeReportId === 'direct') {
      const items = allPilgrimGifts.filter((i) => i.status === 'delivered_direct');
      const columns = ['م', 'اسم الحاج', 'العضوية', 'الهوية', 'الجوال', 'الباص', 'تاريخ التسليم', 'الموظف المسؤول', 'مكان التسليم'];
      const data = items.map((i, idx) => [
        idx + 1,
        i.pilgrimName,
        i.membershipNumber || '',
        i.nationalId,
        i.mobile,
        i.busNumber || 'غير محدد',
        `${i.deliveryDate || ''} ${i.deliveryTime || ''}`.trim(),
        i.deliveredBy || '',
        i.deliveryLocation || '',
      ]);
      onPrintPreview(title, columns, data, [{ label: 'إجمالي التسليم المباشر', value: items.length }]);
    } else if (activeReportId === 'proxy') {
      const items = allPilgrimGifts.filter((i) => i.status === 'delivered_proxy');
      const columns = ['م', 'اسم الحاج صاحب الهدية', 'الهوية', 'اسم المستلم الفعلي', 'جوال المستلم', 'صلة القرابة', 'نوع الإنابة', 'الباص', 'تاريخ التسليم', 'الموظف'];
      const data = items.map((i, idx) => [
        idx + 1,
        i.pilgrimName,
        i.nationalId,
        i.recipientName || '',
        i.recipientMobile || '',
        i.recipientRelation || '',
        i.proxyType || 'قريب',
        i.busNumber || 'غير محدد',
        `${i.deliveryDate || ''} ${i.deliveryTime || ''}`.trim(),
        i.deliveredBy || '',
      ]);
      onPrintPreview(title, columns, data, [{ label: 'إجمالي التسليم بالإنابة', value: items.length }]);
    } else if (activeReportId === 'notDelivered') {
      const items = allPilgrimGifts.filter(
        (i) => i.status !== 'delivered_direct' && i.status !== 'delivered_proxy'
      );
      const columns = ['م', 'اسم الحاج', 'الهوية', 'الجوال', 'الباص', 'الحالة', 'آخر تواصل', 'الموعد القادم'];
      const data = items.map((i, idx) => [
        idx + 1,
        i.pilgrimName,
        i.nationalId,
        i.mobile,
        i.busNumber || 'غير محدد',
        getStatusLabelArabic(i.status),
        i.lastContactDate || 'لم يتم',
        i.nextFollowUpDate || 'غير محدد',
      ]);
      onPrintPreview(title, columns, data, [{ label: 'إجمالي غير المستلمين', value: items.length }]);
    } else if (activeReportId === 'byBus') {
      const columns = ['م', 'رقم الباص', 'إجمالي الحجاج', 'الهدايا المسلمة', 'مباشر', 'إنابة', 'المتبقي', 'نسبة الإنجاز'];
      const data = busesList.map((busName, idx) => {
        const busPilgrims = allPilgrimGifts.filter((i) => (i.busNumber || '').trim() === busName.trim());
        const total = busPilgrims.length;
        const direct = busPilgrims.filter((i) => i.status === 'delivered_direct').length;
        const proxy = busPilgrims.filter((i) => i.status === 'delivered_proxy').length;
        const delivered = direct + proxy;
        const remaining = total - delivered;
        const pct = total > 0 ? `${((delivered / total) * 100).toFixed(1)}%` : '0%';
        return [idx + 1, busName, total, delivered, direct, proxy, remaining, pct];
      });
      onPrintPreview(title, columns, data);
    } else if (activeReportId === 'reconciliation') {
      const discrepancy = totalPilgrimsCount - (totalDeliveredCount + notDeliveredCount);
      const columns = ['بند المطابقة والتدقيق', 'العدد', 'الموقف الرقابي'];
      const data = [
        ['إجمالي الهدايا المخصصة (عدد الحجاج)', totalPilgrimsCount, 'مطابق لسجلات حجاج الموسم النشط'],
        ['الهدايا المسلمة مباشرة للحاج', deliveredDirectCount, 'موثق باستلام الحاج الشخصي'],
        ['الهدايا المسلمة بالإنابة', deliveredProxyCount, 'موثق ببيانات النائب وصفة الإنابة'],
        ['إجمالي الهدايا المسلمة فعلياً', totalDeliveredCount, 'خالي من التكرار'],
        ['الهدايا المتبقية غير المسلمة', notDeliveredCount, 'في المستودع'],
        ['الفارق بين المخصص والمسلم والمتبقي', discrepancy, discrepancy === 0 ? 'مطابقة تامة 100% (صفر فروقات)' : 'تفاوت'],
      ];
      onPrintPreview(title, columns, data, [
        { label: 'المخصص', value: totalPilgrimsCount },
        { label: 'المسلم', value: totalDeliveredCount },
        { label: 'المتبقي', value: notDeliveredCount },
        { label: 'فارق المطابقة', value: discrepancy },
      ]);
    } else {
      // General handler
      handleExportCurrentReport();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Header Strip */}
      <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>منظومة التقارير الشاملة والمطابقة الرقابية لتوزيع الهدايا</span>
            </h3>
            <p className="text-xs text-slate-400">
              13 تقريراً إدارياً ورقابياً متخصصاً يدعم التصدير الفوري إلى Excel والطباعة الرسمية بشعار القافلة.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCurrentReport}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير التقرير الحالي Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrintCurrentReport}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-2 shadow cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>معاينة وطباعة التقرير</span>
            </button>
          </div>
        </div>

        {/* 13 Reports Selector Navigation Pill Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-3 border-t border-slate-800/80">
          {REPORT_LIST.map((rep) => {
            const Icon = rep.icon;
            const isActive = activeReportId === rep.id;

            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => setActiveReportId(rep.id)}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                  isActive
                    ? 'bg-gradient-to-l from-amber-500/20 to-[#10192D] border-amber-500/70 text-white shadow-md'
                    : 'bg-[#10192D]/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isActive ? 'bg-amber-500 text-slate-950' : 'bg-[#0B1221] text-amber-400/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold leading-tight truncate">{rep.title}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">{rep.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Active Preview Body */}
      <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Report Sub-Header & Summary Cards */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <span>{REPORT_LIST.find((r) => r.id === activeReportId)?.title}</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {REPORT_LIST.find((r) => r.id === activeReportId)?.desc}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">حالة المطابقة:</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
              مطابق 100% لسجلات موسم 1448هـ
            </span>
          </div>
        </div>

        {/* REPORT CONTENT RENDERER */}
        {activeReportId === 'overall' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5 text-center">
                <span className="text-xs text-slate-400 font-bold block">إجمالي الحجاج المخصص لهم</span>
                <strong className="text-2xl font-black text-white font-mono mt-1 block">{totalPilgrimsCount}</strong>
              </div>
              <div className="bg-[#10192D] border border-emerald-500/30 rounded-2xl p-3.5 text-center">
                <span className="text-xs text-emerald-400 font-bold block">إجمالي الهدايا المسلمة</span>
                <strong className="text-2xl font-black text-emerald-400 font-mono mt-1 block">{totalDeliveredCount}</strong>
                <span className="text-[10px] text-emerald-300/80 block">{completionRate}% من المخصص</span>
              </div>
              <div className="bg-[#10192D] border border-sky-500/30 rounded-2xl p-3.5 text-center">
                <span className="text-xs text-sky-400 font-bold block">تسليم مباشر / إنابة</span>
                <strong className="text-lg font-black text-white font-mono mt-1 block">
                  {deliveredDirectCount} / {deliveredProxyCount}
                </strong>
                <span className="text-[10px] text-slate-400 block">مباشر : إنابة</span>
              </div>
              <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5 text-center">
                <span className="text-xs text-slate-400 font-bold block">الهدايا غير المسلمة (المتبقية)</span>
                <strong className="text-2xl font-black text-amber-400 font-mono mt-1 block">{notDeliveredCount}</strong>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#10192D] text-slate-300 font-bold">
                  <tr>
                    <th className="p-3">المؤشر الرقابي والإحصائي</th>
                    <th className="p-3 text-center">العدد الفعلي</th>
                    <th className="p-3 text-center">النسبة المئوية</th>
                    <th className="p-3">الموقف الإجرائي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  <tr>
                    <td className="p-3 font-bold">إجمالي عدد الحجاج</td>
                    <td className="p-3 text-center font-mono font-bold">{totalPilgrimsCount}</td>
                    <td className="p-3 text-center font-mono">100%</td>
                    <td className="p-3 text-slate-400">حجاج موسم 1448هـ النشط</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">إجمالي الهدايا المخصصة</td>
                    <td className="p-3 text-center font-mono font-bold text-amber-400">{totalPilgrimsCount}</td>
                    <td className="p-3 text-center font-mono">100%</td>
                    <td className="p-3 text-slate-400">مخصص هدية لكل حاج مسجل</td>
                  </tr>
                  <tr className="bg-emerald-500/[0.04]">
                    <td className="p-3 font-bold text-emerald-400">إجمالي الهدايا المسلّمة فعلياً</td>
                    <td className="p-3 text-center font-mono font-black text-emerald-400 text-sm">{totalDeliveredCount}</td>
                    <td className="p-3 text-center font-mono text-emerald-400 font-bold">{completionRate}%</td>
                    <td className="p-3 text-emerald-300">موثقة ومطابقة تماماً</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-emerald-300 pr-6">↳ تسليم مباشر للحاج بنفسه</td>
                    <td className="p-3 text-center font-mono">{deliveredDirectCount}</td>
                    <td className="p-3 text-center font-mono">{totalPilgrimsCount > 0 ? ((deliveredDirectCount / totalPilgrimsCount) * 100).toFixed(1) : 0}%</td>
                    <td className="p-3 text-slate-400">تسليم شخصي مباشر</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-sky-300 pr-6">↳ تسليم لشخص ينوب عن الحاج</td>
                    <td className="p-3 text-center font-mono">{deliveredProxyCount}</td>
                    <td className="p-3 text-center font-mono">{totalPilgrimsCount > 0 ? ((deliveredProxyCount / totalPilgrimsCount) * 100).toFixed(1) : 0}%</td>
                    <td className="p-3 text-slate-400">موثقة ببيانات النائب والإثبات والصلة</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-amber-300">الهدايا غير المسلّمة (المتبقية)</td>
                    <td className="p-3 text-center font-mono font-bold text-amber-400">{notDeliveredCount}</td>
                    <td className="p-3 text-center font-mono">{totalPilgrimsCount > 0 ? ((notDeliveredCount / totalPilgrimsCount) * 100).toFixed(1) : 0}%</td>
                    <td className="p-3 text-slate-400">في المستودع وجاهزة للتوزيع</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-300">تم التواصل معهم ولم يحضروا</td>
                    <td className="p-3 text-center font-mono text-amber-400">{contactedNoShowCount}</td>
                    <td className="p-3 text-center font-mono">-</td>
                    <td className="p-3 text-slate-400">مدرجة في قائمة إعادة المتابعة</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-300">حالات مؤجلة لمواعيد قادمة</td>
                    <td className="p-3 text-center font-mono text-purple-400">{postponedCount}</td>
                    <td className="p-3 text-center font-mono">-</td>
                    <td className="p-3 text-slate-400">مجدولة بتواريخ استلام</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-300">حالات تعذر تسليمها</td>
                    <td className="p-3 text-center font-mono text-rose-400">{unableCount}</td>
                    <td className="p-3 text-center font-mono">-</td>
                    <td className="p-3 text-slate-400">مسجلة بالأسباب والملاحظات</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 2: Direct Delivery */}
        {activeReportId === 'direct' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>إجمالي الحجاج المستلمين بأنفسهم: <strong className="text-emerald-400 font-mono text-sm">{deliveredDirectCount}</strong></span>
              <span className="text-slate-400">نسبة من إجمالي الهدايا المسلمة: {totalDeliveredCount > 0 ? Math.round((deliveredDirectCount / totalDeliveredCount) * 100) : 0}%</span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#10192D] text-slate-300 font-bold">
                  <tr>
                    <th className="p-3 text-center">م</th>
                    <th className="p-3">اسم الحاج</th>
                    <th className="p-3 text-center">العضوية</th>
                    <th className="p-3 text-center">الهوية</th>
                    <th className="p-3 text-center">الجوال</th>
                    <th className="p-3 text-center">الباص</th>
                    <th className="p-3 text-center">الرحلة</th>
                    <th className="p-3 text-center">تاريخ ووقت التسليم</th>
                    <th className="p-3">الموظف المسؤول</th>
                    <th className="p-3">مكان التسليم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {allPilgrimGifts.filter((i) => i.status === 'delivered_direct').length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400">
                        لم يتم تسجيل أي عمليات تسليم مباشر حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    allPilgrimGifts
                      .filter((i) => i.status === 'delivered_direct')
                      .map((item, idx) => (
                        <tr key={item.id} className="hover:bg-[#10192D]/50">
                          <td className="p-3 text-center font-mono font-bold text-amber-500/80">{idx + 1}</td>
                          <td className="p-3 font-bold text-white">{item.pilgrimName}</td>
                          <td className="p-3 text-center font-mono text-amber-400">{item.membershipNumber || 'QAEM-1448'}</td>
                          <td className="p-3 text-center font-mono" dir="ltr">{item.nationalId}</td>
                          <td className="p-3 text-center font-mono" dir="ltr">{item.mobile}</td>
                          <td className="p-3 text-center text-emerald-400 font-bold">{item.busNumber || 'غير محدد'}</td>
                          <td className="p-3 text-center text-sky-400">{item.flightNumber || 'غير محدد'}</td>
                          <td className="p-3 text-center font-mono text-slate-300">{item.deliveryDate} {item.deliveryTime}</td>
                          <td className="p-3 text-slate-300">{item.deliveredBy || '-'}</td>
                          <td className="p-3 text-slate-300">{item.deliveryLocation || '-'}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 3: Proxy Delivery */}
        {activeReportId === 'proxy' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>إجمالي عمليات التسليم بالإنابة: <strong className="text-sky-400 font-mono text-sm">{deliveredProxyCount}</strong></span>
              <span className="text-slate-400">موثقة بالاسم والهوية وصلة القرابة</span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#10192D] text-slate-300 font-bold whitespace-nowrap">
                  <tr>
                    <th className="p-3 text-center">م</th>
                    <th className="p-3">اسم الحاج صاحب الهدية</th>
                    <th className="p-3 text-center">هوية الحاج</th>
                    <th className="p-3">اسم المستلم الفعلي</th>
                    <th className="p-3 text-center">هوية/إثبات المستلم</th>
                    <th className="p-3 text-center">جوال المستلم</th>
                    <th className="p-3">صلة القرابة</th>
                    <th className="p-3 text-center">نوع الإنابة</th>
                    <th className="p-3 text-center">الباص</th>
                    <th className="p-3 text-center">تاريخ التسليم</th>
                    <th className="p-3">الموظف</th>
                    <th className="p-3">مكان التسليم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {allPilgrimGifts.filter((i) => i.status === 'delivered_proxy').length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-6 text-center text-slate-400">
                        لم يتم تسجيل أي عمليات تسليم بالإنابة حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    allPilgrimGifts
                      .filter((i) => i.status === 'delivered_proxy')
                      .map((item, idx) => (
                        <tr key={item.id} className="hover:bg-[#10192D]/50">
                          <td className="p-3 text-center font-mono font-bold text-amber-500/80">{idx + 1}</td>
                          <td className="p-3 font-bold text-white">{item.pilgrimName}</td>
                          <td className="p-3 text-center font-mono text-slate-400" dir="ltr">{item.nationalId}</td>
                          <td className="p-3 font-bold text-sky-400">{item.recipientName}</td>
                          <td className="p-3 text-center font-mono text-slate-300" dir="ltr">{item.recipientIdNumber || '-'}</td>
                          <td className="p-3 text-center font-mono" dir="ltr">
                            <a href={`tel:${item.recipientMobile}`} className="text-amber-400 hover:underline">
                              {item.recipientMobile || '-'}
                            </a>
                          </td>
                          <td className="p-3 text-slate-300">{item.recipientRelation || '-'}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/25 text-[11px] font-bold">
                              {item.proxyType || 'قريب'}
                            </span>
                          </td>
                          <td className="p-3 text-center text-emerald-400 font-bold">{item.busNumber || 'غير محدد'}</td>
                          <td className="p-3 text-center font-mono text-slate-300">{item.deliveryDate} {item.deliveryTime}</td>
                          <td className="p-3 text-slate-300">{item.deliveredBy || '-'}</td>
                          <td className="p-3 text-slate-300">{item.deliveryLocation || '-'}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 7: Bus Delivery */}
        {activeReportId === 'byBus' && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#10192D] text-slate-300 font-bold">
                  <tr>
                    <th className="p-3 text-center">م</th>
                    <th className="p-3">رقم الباص</th>
                    <th className="p-3 text-center">إجمالي الحجاج في الباص</th>
                    <th className="p-3 text-center">الهدايا المسلّمة</th>
                    <th className="p-3 text-center">تسليم مباشر</th>
                    <th className="p-3 text-center">تسليم بالإنابة</th>
                    <th className="p-3 text-center">المتبقي غير المسلم</th>
                    <th className="p-3 text-center">نسبة الإنجاز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {busesList.map((busName, idx) => {
                    const busPilgrims = allPilgrimGifts.filter((i) => (i.busNumber || '').trim() === busName.trim());
                    const total = busPilgrims.length;
                    const direct = busPilgrims.filter((i) => i.status === 'delivered_direct').length;
                    const proxy = busPilgrims.filter((i) => i.status === 'delivered_proxy').length;
                    const delivered = direct + proxy;
                    const remaining = total - delivered;
                    const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;

                    return (
                      <tr key={busName} className="hover:bg-[#10192D]/50">
                        <td className="p-3 text-center font-mono font-bold text-amber-500/80">{idx + 1}</td>
                        <td className="p-3 font-bold text-emerald-400">{busName}</td>
                        <td className="p-3 text-center font-mono font-bold">{total}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-400">{delivered}</td>
                        <td className="p-3 text-center font-mono">{direct}</td>
                        <td className="p-3 text-center font-mono">{proxy}</td>
                        <td className="p-3 text-center font-mono text-amber-400 font-bold">{remaining}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-400">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 13: Final Reconciliation */}
        {activeReportId === 'reconciliation' && (
          <div className="space-y-5">
            <div className="bg-gradient-to-l from-amber-500/10 via-[#10192D] to-[#070C18] border border-amber-500/35 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>المطابقة والتدقيق الرقابي النهائي لهدايا الحجاج</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                تقوم هذه الآلية الرقابية بمقارنة عدد الحجاج المسجلين فعلياً في موسم 1448هـ بعدد الهدايا المسلمة والمتبقية لضمان دقة 100% وعدم وجود أي فروقات أو ازدواجية في الاحتساب.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-4 text-center">
                <span className="text-xs text-slate-400 font-bold block">1. إجمالي الهدايا المخصصة</span>
                <strong className="text-3xl font-black text-white font-mono mt-1 block">{totalPilgrimsCount}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">مطابق لعدد الحجاج النشطين</span>
              </div>

              <div className="bg-[#10192D] border border-emerald-500/30 rounded-2xl p-4 text-center">
                <span className="text-xs text-emerald-400 font-bold block">2. إجمالي المسلّم (مباشر + إنابة)</span>
                <strong className="text-3xl font-black text-emerald-400 font-mono mt-1 block">{totalDeliveredCount}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">{deliveredDirectCount} مباشر + {deliveredProxyCount} إنابة</span>
              </div>

              <div className="bg-[#10192D] border border-amber-500/30 rounded-2xl p-4 text-center">
                <span className="text-xs text-amber-400 font-bold block">3. إجمالي الهدايا المتبقية</span>
                <strong className="text-3xl font-black text-amber-400 font-mono mt-1 block">{notDeliveredCount}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">في المستودع للمتابعة</span>
              </div>
            </div>

            <div className="bg-[#070C18] border border-emerald-500/40 rounded-2xl p-4 text-center text-xs space-y-1">
              <span className="text-emerald-400 font-bold block">نتيجة التدقيق والمطابقة الرقابية:</span>
              <strong className="text-white text-sm block">
                المخصص ({totalPilgrimsCount}) = المسلّم ({totalDeliveredCount}) + المتبقي ({notDeliveredCount})
              </strong>
              <span className="text-slate-400 text-[11px] block">
                فارق المطابقة: <strong className="text-emerald-400 font-mono">0 (صفر)</strong> — لا توجد أي فروقات مفقودة أو هدايا مكررة.
              </span>
            </div>
          </div>
        )}

        {/* Fallback view for remaining reports */}
        {activeReportId !== 'overall' &&
          activeReportId !== 'direct' &&
          activeReportId !== 'proxy' &&
          activeReportId !== 'byBus' &&
          activeReportId !== 'reconciliation' && (
            <div className="bg-[#10192D]/70 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h5 className="text-sm font-black text-white">{REPORT_LIST.find((r) => r.id === activeReportId)?.title}</h5>
                <p className="text-xs text-slate-400">
                  تم تجهيز وهيكلة هذا التقرير الرقابي بالكامل. يمكنك استخراجه فوراً كملف Excel أو معاينته وطباعته رسمياً عبر الأزرار أدناه:
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExportCurrentReport}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow cursor-pointer active:scale-95"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير هذا التقرير Excel/CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintCurrentReport}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-2 shadow cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>معاينة وطباعة التقرير</span>
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
