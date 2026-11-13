import React, { useRef, useState } from 'react';
import { Printer, X, Download, FileText, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { ReligiousGuide } from '../../types/religiousGuidance';
import {
  GuideRealStats,
  getPilgrimDisplayName,
  getPilgrimFileNumber,
  getPilgrimGroupLabel,
} from '../../lib/religiousGuidanceDb';
import { exportAlQaemExcelReport } from '../../utils/alqaemExcelEngine';

interface GuidePilgrimsPdfModalProps {
  guide: ReligiousGuide;
  stats: GuideRealStats;
  generatedBy: string;
  onClose: () => void;
}

export const GuidePilgrimsPdfModal: React.FC<GuidePilgrimsPdfModalProps> = ({
  guide,
  stats,
  generatedBy,
  onClose,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [supervisorNotes, setSupervisorNotes] = useState<string>('');

  const nowDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const nowTime = new Date().toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Paginate rows cleanly in chunks of 25 for page numbering display while rendering all pilgrims
  const PAGE_SIZE = 25;
  const totalPages = Math.max(1, Math.ceil(stats.assignedItems.length / PAGE_SIZE));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfNotice(null);

    try {
      const element = reportRef.current;
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const a4WidthMm = 210;
      const a4HeightMm = 297;
      const marginMm = 8;
      const printableWidthMm = a4WidthMm - marginMm * 2;
      const printableHeightMm = a4HeightMm - marginMm * 2;

      const scaledImgHeightMm = (img.height * printableWidthMm) / img.width;

      if (scaledImgHeightMm <= printableHeightMm) {
        pdf.addImage(
          dataUrl,
          'PNG',
          marginMm,
          marginMm,
          printableWidthMm,
          scaledImgHeightMm
        );
      } else {
        // Multi-page vertical slice support for large numbers of pilgrims
        let heightLeft = scaledImgHeightMm;
        let positionY = marginMm;
        let pageIndex = 0;

        while (heightLeft > 0) {
          if (pageIndex > 0) {
            pdf.addPage();
          }
          pdf.addImage(
            dataUrl,
            'PNG',
            marginMm,
            positionY - pageIndex * printableHeightMm,
            printableWidthMm,
            scaledImgHeightMm
          );
          heightLeft -= printableHeightMm;
          pageIndex++;
        }
      }

      const safeGuideName = guide.name.replace(/\s+/g, '_');
      const dateStamp = new Date().toISOString().split('T')[0];
      pdf.save(`كشف_الحجاج_المسندين_للمرشد_${safeGuideName}_${dateStamp}.pdf`);
      setPdfNotice('تم تصدير وتحميل ملف PDF الرسمي بنجاح.');
    } catch (err) {
      console.error('PDF export error:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportGuideExcel = () => {
    const columns = [
      'م',
      'اسم الحاج كاملاً',
      'رقم الملف / الحاج',
      'رقم الهوية',
      'رقم الجوال',
      'المجموعة / القافلة',
      'حالة الحاج',
      'حالة التعليم والإرشاد',
      'حالة التطويف',
      'تاريخ الإسناد للمرشد',
    ];
    const rows = stats.assignedItems.map((item, idx) => [
      idx + 1,
      getPilgrimDisplayName(item.pilgrim),
      getPilgrimFileNumber(item.pilgrim),
      item.pilgrim.nationalId || '—',
      item.pilgrim.mobile || '—',
      getPilgrimGroupLabel(item.pilgrim),
      item.pilgrim.status || 'مؤكد',
      item.followUp.educationStatus,
      item.followUp.tawafStatus,
      item.assignedAt || '—',
    ]);

    void exportAlQaemExcelReport({
      reportTitle: `كشف الحجاج المسندين للمرشد الديني: ${guide.name}`,
      subtitle: `التخصص: ${guide.specialization} • الجوال: ${guide.phone || '—'} • المجموعات: ${guide.assignedGroups.join('، ') || 'عام'}`,
      category: 'تقارير المشرفين والمرشدين الدينيين',
      filename: `كشف_حجاج_المرشد_${guide.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
      columns,
      rows,
      generatedBy,
      summaryCards: [
        { label: 'إجمالي الحجاج المسندين', value: stats.totalAssigned },
        { label: 'أتموا التعليم', value: `${stats.completedEducationCount} (${stats.educationCompletionPercent}%)` },
        { label: 'المتبقي تعليمهم', value: stats.remainingEducationCount },
        { label: 'أتموا التطويف', value: `${stats.completedTawafCount} (${stats.tawafCompletionPercent}%)` },
        { label: 'المتبقي تطويفهم', value: stats.remainingTawafCount },
      ],
    });
    setPdfNotice('تم تصدير وتحميل ملف Excel (.xlsx) الرسمي بالهوية البصرية لنظام قافلة القائم.');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-[#0B1221] border border-amber-500/40 rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Top Action Bar (Screen Only) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-800 bg-[#0F172A] shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                تصدير كشف الحجاج المسندين للمرشد الديني (PDF & Excel)
              </h3>
              <p className="text-[11px] text-slate-400">
                {guide.name} • إجمالي الحجاج المسندين فعلياً: {stats.totalAssigned} حاج
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportGuideExcel}
              className="px-4 py-2 rounded-xl bg-[#12192C] hover:bg-slate-800 text-[#F4C84A] border border-[#C5A45D] text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#20B995]" />
              <span>تصدير Excel الرسمي (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'جاري تجهيز ملف PDF...' : 'تحميل ملف PDF مباشر'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير / حفظ PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {pdfNotice && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-300 flex items-center gap-2 print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{pdfNotice}</span>
          </div>
        )}

        {/* Printable / PDF Document Container */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100 print:bg-white print:p-0">
          <div
            ref={reportRef}
            id="guidePilgrimsPrintArea"
            className="bg-white text-slate-950 rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-200 max-w-4xl mx-auto print:shadow-none print:border-0 print:p-4"
            dir="rtl"
          >
            {/* 1. رأس التقرير (Report Header) */}
            <div className="border-b-2 border-amber-600 pb-4 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-right space-y-1">
                <span className="text-[11px] font-bold text-amber-800 block">
                  المملكة العربية السعودية • وزارة الحج والعمرة
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  قافلة القائم للحج والعمرة والزيارة
                </h1>
                <p className="text-xs font-bold text-amber-700">
                  منظومة الإرشاد والتوعية الدينية المعتمدة — موسم الحج والعمرة 1448هـ
                </p>
              </div>

              {/* Center Official Al-Qaem Logo */}
              <div className="text-center shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-amber-500/50 shadow-sm flex items-center justify-center p-1.5 mx-auto">
                  <img
                    src="/assets/aistudio/media_1794134676879_98f1e0ea.png"
                    alt="شعار نظام القائم"
                    className="w-16 h-16 object-contain"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.includes('Screenshot_20261107_174409')) {
                        img.src =
                          '/assets/aistudio/Screenshot_20261107_174409_com_instagram_android_InstagramMainActivity_441b738d.png';
                      }
                    }}
                  />
                </div>
                <span className="text-[10px] font-black text-amber-800 block mt-1">
                  نظام القائم للحج والعمرة
                </span>
              </div>

              <div className="text-left text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <p>
                  تاريخ الاستخراج: <strong className="font-mono text-slate-950">{nowDate}</strong>
                </p>
                <p>
                  وقت الاستخراج: <strong className="font-mono text-slate-950">{nowTime}</strong>
                </p>
                <p>
                  الموسم: <strong className="text-amber-800">موسم حج وعمرة 1448هـ</strong>
                </p>
                <p>
                  المستخرج: <strong className="text-slate-950">{generatedBy}</strong>
                </p>
              </div>
            </div>

            {/* Report Main Title Banner */}
            <div className="text-center my-4">
              <div className="inline-block bg-amber-50 border-2 border-amber-300 rounded-2xl px-8 py-2.5 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-950">
                  كشف الحجاج المسندين للمرشد الديني
                </h2>
                <p className="text-xs font-bold text-amber-800 mt-0.5">
                  سجل مسؤولية التعليم الشرعي والتطويف الميداني المعتمد من قاعدة البيانات الفعلية
                </p>
              </div>
            </div>

            {/* 2. بيانات المرشد وإحصائيات الإنجاز الفعلية (Guide Information & Real Statistics) */}
            <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 my-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-amber-800 block">
                    بيانات المرشد الديني المسؤول:
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950">
                    {guide.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-600">{guide.specialization}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-800">
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                    <span className="text-slate-500 font-bold">رقم الجوال: </span>
                    <strong className="font-mono text-slate-950" dir="ltr">
                      {guide.phone || '—'}
                    </strong>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                    <span className="text-slate-500 font-bold">البريد الإلكتروني: </span>
                    <strong className="font-mono text-slate-950" dir="ltr">
                      {guide.email || '—'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 5 Key Guide Statistics Required in PDF Header */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                <div className="bg-white border border-amber-300 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-600 font-bold block">
                    الحجاج المسندون فعلياً
                  </span>
                  <strong className="text-base font-black text-amber-700 font-mono mt-0.5 block">
                    {stats.totalAssigned}
                  </strong>
                </div>

                <div className="bg-white border border-emerald-300 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-600 font-bold block">
                    أتموا التعليم ({stats.educationCompletionPercent}%)
                  </span>
                  <strong className="text-base font-black text-emerald-700 font-mono mt-0.5 block">
                    {stats.completedEducationCount}
                  </strong>
                </div>

                <div className="bg-white border border-orange-300 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-600 font-bold block">
                    لم يتم تعليمهم بعد
                  </span>
                  <strong className="text-base font-black text-orange-700 font-mono mt-0.5 block">
                    {stats.remainingEducationCount}
                  </strong>
                </div>

                <div className="bg-white border border-sky-300 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-600 font-bold block">
                    أتموا التطويف ({stats.tawafCompletionPercent}%)
                  </span>
                  <strong className="text-base font-black text-sky-700 font-mono mt-0.5 block">
                    {stats.completedTawafCount}
                  </strong>
                </div>

                <div className="bg-white border border-rose-300 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-600 font-bold block">
                    لم يتم تطويفهم بعد
                  </span>
                  <strong className="text-base font-black text-rose-700 font-mono mt-0.5 block">
                    {stats.remainingTawafCount}
                  </strong>
                </div>
              </div>
            </div>

            {/* 3. جدول أسماء الحجاج (Complete Assigned Pilgrims Table) */}
            <div className="mt-4 overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black border-b border-slate-300">
                    <th className="p-2.5 border-l border-slate-700 text-center w-12">م</th>
                    <th className="p-2.5 border-l border-slate-700">اسم الحاج</th>
                    <th className="p-2.5 border-l border-slate-700 text-center">رقم الملف</th>
                    <th className="p-2.5 border-l border-slate-700 text-center">الجوال</th>
                    <th className="p-2.5 border-l border-slate-700 text-center">المجموعة</th>
                    <th className="p-2.5 border-l border-slate-700 text-center">حالة التعليم</th>
                    <th className="p-2.5 text-center">حالة التطويف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.assignedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                        لا يوجد حجاج مسندون لهذا المرشد الديني في قاعدة البيانات حالياً (العدد الفعلي: 0).
                      </td>
                    </tr>
                  ) : (
                    stats.assignedItems.map((item, idx) => {
                      const p = item.pilgrim;
                      const flw = item.followUp;
                      const isEduDone = flw.educationStatus === 'أتم التعليم';
                      const isTawafDone =
                        flw.tawafCompleted || flw.tawafStatus === 'أتم التطويف';

                      return (
                        <tr
                          key={p.id || p.nationalId || idx}
                          className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}
                        >
                          <td className="p-2 border-l border-slate-200 text-center font-mono font-bold text-slate-700">
                            {idx + 1}
                          </td>
                          <td className="p-2 border-l border-slate-200 font-black text-slate-950">
                            {getPilgrimDisplayName(p)}
                          </td>
                          <td className="p-2 border-l border-slate-200 text-center font-mono text-slate-800">
                            {getPilgrimFileNumber(p)}
                          </td>
                          <td
                            className="p-2 border-l border-slate-200 text-center font-mono text-slate-800"
                            dir="ltr"
                          >
                            {p.mobile || '—'}
                          </td>
                          <td className="p-2 border-l border-slate-200 text-center font-bold text-slate-800">
                            {getPilgrimGroupLabel(p)}
                          </td>
                          <td className="p-2 border-l border-slate-200 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                isEduDone
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : flw.educationStatus === 'قيد التعليم'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              {flw.educationStatus}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                isTawafDone
                                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                                  : flw.tawafStatus === 'قيد التطويف'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              {isTawafDone ? 'أتم التطويف' : flw.tawafStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. أسفل التقرير (Report Footer: Total Count, Notes Space, Signatures, Page Numbering) */}
            <div className="mt-6 space-y-5">
              {/* Total Summary & Notes Area */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-col justify-center">
                  <span className="text-xs font-bold text-amber-900">
                    إجمالي عدد الحجاج المسندين بالكشف:
                  </span>
                  <strong className="text-xl font-black text-slate-950 font-mono mt-1">
                    {stats.totalAssigned} حاج / حاجة
                  </strong>
                  <span className="text-[10px] text-slate-600 mt-1">
                    أتموا التعليم: {stats.completedEducationCount} • أتموا التطويف:{' '}
                    {stats.completedTawafCount}
                  </span>
                </div>

                <div className="sm:col-span-2 bg-slate-50 border border-slate-300 rounded-xl p-3.5">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    مساحة للملاحظات والاعتماد الميداني:
                  </label>
                  <textarea
                    rows={2}
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                    placeholder="اكتب أي ملاحظات ميدانية أو توجيهات خاصة بكشف حجاج المرشد لتظهر في التقرير المطبوع..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Official Signatures Block */}
              <div className="pt-5 border-t-2 border-slate-300 grid grid-cols-3 gap-4 text-xs text-slate-800 text-center">
                <div>
                  <span className="block font-black text-slate-900">توقيع المرشد الديني</span>
                  <span className="block text-[11px] font-bold text-slate-600 mt-1">
                    {guide.name}
                  </span>
                  <span className="block text-slate-400 mt-6">
                    ................................................
                  </span>
                </div>

                <div>
                  <span className="block font-black text-slate-900">ختم إدارة الإرشاد الديني</span>
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-600/50 flex items-center justify-center text-[10px] text-amber-800 font-black mx-auto mt-2">
                    ختم القافلة المعتمد
                  </div>
                </div>

                <div>
                  <span className="block font-black text-slate-900">توقيع المشرف المسؤول</span>
                  <span className="block text-[11px] font-bold text-slate-600 mt-1">
                    {generatedBy}
                  </span>
                  <span className="block text-slate-400 mt-6">
                    ................................................
                  </span>
                </div>
              </div>

              {/* Page Numbering Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                <span>
                  نظام بوابة القائم للحج والعمرة — منظومة الإرشاد الديني (تقرير مستخرج من قاعدة البيانات الفعلية)
                </span>
                <span className="font-mono">
                  صفحة 1 من {totalPages} (إجمالي السجلات: {stats.totalAssigned})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
