import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  SlidersHorizontal,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  Download,
  X,
  Eye,
  Sparkles,
  CheckCircle2,
  GripVertical,
} from 'lucide-react';
import {
  ALQAEM_EXCEL_BRAND,
  AlQaemExcelReportOptions,
  closeAlQaemExcelCustomizer,
  exportAlQaemExcelReport,
  openAlQaemExcelCustomizer,
  subscribeToAlQaemExcelCustomizer,
  subscribeToLastExportedAlQaemReport,
} from '../utils/alqaemExcelEngine';

export const ExcelReportCustomizerModal: React.FC = () => {
  const [activeReport, setActiveReport] = useState<AlQaemExcelReportOptions | null>(null);
  const [lastExportedReport, setLastExportedReport] = useState<AlQaemExcelReportOptions | null>(
    null
  );
  const [showFloatingBanner, setShowFloatingBanner] = useState(false);

  // Ordered list of column objects: { originalIndex, label, selected }
  const [columnConfig, setColumnConfig] = useState<
    { originalIndex: number; label: string; selected: boolean }[]
  >([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customSubtitle, setCustomSubtitle] = useState('');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const unsubModal = subscribeToAlQaemExcelCustomizer((report) => {
      setActiveReport(report);
      if (report) {
        setCustomTitle(report.reportTitle);
        setCustomSubtitle(
          report.subtitle ||
            `${report.category || 'التقارير الرسمية'} — ${ALQAEM_EXCEL_BRAND.systemName}`
        );
        setColumnConfig(
          report.columns.map((col, idx) => ({
            originalIndex: idx,
            label: col,
            selected: true,
          }))
        );
      }
    });

    const unsubLast = subscribeToLastExportedAlQaemReport((report) => {
      setLastExportedReport(report);
      if (report) {
        setShowFloatingBanner(true);
      }
    });

    return () => {
      unsubModal();
      unsubLast();
    };
  }, []);

  // Auto-hide the floating quick-customizer banner after 12 seconds
  useEffect(() => {
    if (!showFloatingBanner) return;
    const timer = setTimeout(() => {
      setShowFloatingBanner(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, [showFloatingBanner, lastExportedReport]);

  const selectedColumns = useMemo(
    () => columnConfig.filter((c) => c.selected),
    [columnConfig]
  );

  const handleToggleColumn = (idxInList: number) => {
    setColumnConfig((prev) => {
      const target = prev[idxInList];
      if (!target) return prev;
      // Ensure at least 1 column remains selected
      const currentSelectedCount = prev.filter((c) => c.selected).length;
      if (target.selected && currentSelectedCount <= 1) return prev;
      return prev.map((c, i) => (i === idxInList ? { ...c, selected: !c.selected } : c));
    });
  };

  const handleSelectAll = () => {
    setColumnConfig((prev) => prev.map((c) => ({ ...c, selected: true })));
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    setColumnConfig((prev) => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIdx, 0, moved);
      return copy;
    });
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    setColumnConfig((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedIdx, 1);
      copy.splice(targetIdx, 0, moved);
      return copy;
    });
    setDraggedIdx(targetIdx);
  };

  const handleExportCustomized = async () => {
    if (!activeReport || selectedColumns.length === 0) return;
    setIsExporting(true);
    try {
      await exportAlQaemExcelReport({
        ...activeReport,
        reportTitle: customTitle.trim() || activeReport.reportTitle,
        subtitle: customSubtitle.trim() || activeReport.subtitle,
        OrderedSelectedColumnIndices: selectedColumns.map((c) => c.originalIndex),
      });
      closeAlQaemExcelCustomizer();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* شريط عائم أنيق يظهر بعد أي عملية تصدير لإتاحة تخصيص الأعمدة وإعادة ترتيبها بهوية القائم */}
      {showFloatingBanner && lastExportedReport && !activeReport && (
        <div
          dir="rtl"
          className="fixed bottom-5 left-5 z-50 max-w-md bg-[#0C1220] border-2 border-[#C5A45D] rounded-2xl p-4 shadow-2xl text-white animate-fadeIn"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#12192C] border border-[#C5A45D]/50 flex items-center justify-center text-[#F4C84A] shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#20B995]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#F4C84A] flex items-center gap-1.5">
                  <span>تم تصدير ملف Excel بالهوية الرسمية (.xlsx)</span>
                </h4>
                <p className="text-[11px] text-[#D6DCE8] mt-0.5 leading-relaxed">
                  التقرير: <strong className="text-white">{lastExportedReport.reportTitle}</strong> ({lastExportedReport.rows.length} سجل). يمكنك تخصيص الأعمدة أو إعادة ترتيبها مع ثبات الهوية البصرية.
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      openAlQaemExcelCustomizer(lastExportedReport);
                      setShowFloatingBanner(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#F4C84A] hover:bg-amber-300 text-[#0C1220] font-black text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>تخصيص وترتيب أعمدة التقرير</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFloatingBanner(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#12192C] hover:bg-slate-800 text-[#D6DCE8] font-bold text-[11px] border border-[#263247] transition cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowFloatingBanner(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* نافذة إعداد وتخصيص تقرير Excel بالهوية البصرية لنظام قافلة القائم */}
      {activeReport && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="bg-[#0C1220] border-2 border-[#C5A45D]/60 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* رأس النافذة بالكحلي الداكن والذهبي المشرق */}
            <div className="bg-[#0C1220] px-6 py-4 border-b-2 border-[#C5A45D] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={ALQAEM_EXCEL_BRAND.logoUrl}
                  alt="شعار قافلة القائم"
                  className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-[#C5A45D]"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#12192C] border border-[#C5A45D]/40 text-[#F4C84A] text-[10px] font-black">
                      محرك تصدير تقارير Excel المركزي
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#20B995]/15 border border-[#20B995]/40 text-[#20B995] text-[10px] font-black">
                      الهوية البصرية الأصلية المعتمدة (.xlsx)
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#F4C84A] mt-1">
                    إعداد وتخصيص تقرير Excel — {ALQAEM_EXCEL_BRAND.systemName}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAlQaemExcelCustomizer}
                className="w-9 h-9 rounded-xl bg-[#12192C] hover:bg-red-500/20 text-[#D6DCE8] hover:text-red-400 border border-[#263247] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى النافذة */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* شريط المرجعية البصرية المعتمدة */}
              <div className="bg-[#12192C] border border-[#263247] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#D6DCE8]">
                  <Sparkles className="w-4 h-4 text-[#F4C84A] shrink-0" />
                  <span>
                    الهوية المطبقة تلقائياً: ترويسة كحلية داكنة + شعار القافلة + خط ذهبي فاصل + جدول فاتح متناوب للطباعة:
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                  <span className="px-2 py-1 rounded bg-[#0C1220] text-white border border-[#263247]">
                    كحلي داكن #0C1220
                  </span>
                  <span className="px-2 py-1 rounded bg-[#12192C] text-[#D6DCE8] border border-[#263247]">
                    كحلي متوسط #12192C
                  </span>
                  <span className="px-2 py-1 rounded bg-[#F4C84A] text-[#0C1220] font-black">
                    ذهبي مشرق #F4C84A
                  </span>
                  <span className="px-2 py-1 rounded bg-[#C5A45D] text-[#0C1220] font-black">
                    ذهبي هادئ #C5A45D
                  </span>
                  <span className="px-2 py-1 rounded bg-[#20B995] text-white">
                    فيروزي #20B995
                  </span>
                  <span className="px-2 py-1 rounded bg-[#35B8E8] text-[#0C1220] font-black">
                    سماوي #35B8E8
                  </span>
                </div>
              </div>

              {/* تعديل عنوان التقرير والعنوان الفرعي */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#F4C84A] mb-1.5">
                    عنوان التقرير الرئيسي (يظهر بالذهبي المشرق في الترويسة):
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-[#12192C] border border-[#263247] focus:border-[#F4C84A] rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#35B8E8] mb-1.5">
                    العنوان الفرعي / الوصف (يظهر بالأزرق السماوي):
                  </label>
                  <input
                    type="text"
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    className="w-full bg-[#12192C] border border-[#263247] focus:border-[#35B8E8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#D6DCE8] focus:outline-none"
                  />
                </div>
              </div>

              {/* قسم اختيار الأعمدة وإعادة ترتيبها */}
              <div className="bg-[#12192C] border border-[#263247] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#F4C84A]" />
                      <span>
                        اختيار وترتيب أعمدة التقرير ({selectedColumns.length} من {columnConfig.length} عمود مختار)
                      </span>
                    </h4>
                    <p className="text-[11px] text-[#D6DCE8] mt-0.5">
                      يمكنك تحديد الأعمدة المطلوبة أو سحبها وإعادة ترتيبها بالأسهم، وستستمر الهوية البصرية الرسمية تلقائياً.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 rounded-xl bg-[#0C1220] hover:bg-slate-900 text-[#F4C84A] border border-[#C5A45D]/40 text-xs font-bold transition cursor-pointer"
                  >
                    إظهار وتحديد جميع الأعمدة
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
                  {columnConfig.map((col, idx) => (
                    <div
                      key={`${col.originalIndex}-${col.label}`}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={() => setDraggedIdx(null)}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition ${
                        col.selected
                          ? 'bg-[#0C1220] border-[#C5A45D]/60 text-white'
                          : 'bg-[#0C1220]/40 border-[#263247] text-slate-500'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleColumn(idx)}
                        className="flex items-center gap-2 text-right flex-1 min-w-0 cursor-pointer"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0 cursor-grab" />
                        {col.selected ? (
                          <CheckSquare className="w-4 h-4 text-[#20B995] shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="text-xs font-bold truncate">
                          {idx + 1}. {col.label}
                        </span>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveColumn(idx, 'up')}
                          disabled={idx === 0}
                          title="تحريك لليمين / للأعلى"
                          className="p-1 rounded bg-[#12192C] hover:bg-slate-800 text-[#D6DCE8] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveColumn(idx, 'down')}
                          disabled={idx === columnConfig.length - 1}
                          title="تحريك لليسار / للأسفل"
                          className="p-1 rounded bg-[#12192C] hover:bg-slate-800 text-[#D6DCE8] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* معاينة حية لشكل ملف Excel المعتمد (النظام المزدوج: ترويسة كحلية داكنة + جدول بيانات فاتح للطباعة) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#F4C84A] flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>معاينة حية لتصميم ملف Excel الرسمي (أول 4 صفوف):</span>
                  </span>
                  <span className="text-[11px] text-[#D6DCE8]">
                    إجمالي الصفوف في الملف: <strong>{activeReport.rows.length}</strong> صف
                  </span>
                </div>

                <div className="rounded-2xl overflow-hidden border-2 border-[#C5A45D] shadow-xl">
                  {/* 1. الترويسة الكحلية الداكنة */}
                  <div className="bg-[#0C1220] p-4 text-center relative">
                    <img
                      src={ALQAEM_EXCEL_BRAND.logoUrl}
                      alt="شعار القافلة"
                      className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-[#C5A45D] sm:absolute sm:right-4 sm:top-4 mx-auto mb-2 sm:mb-0"
                    />
                    <div className="text-[11px] font-bold text-[#D6DCE8]">
                      {ALQAEM_EXCEL_BRAND.systemName} • {ALQAEM_EXCEL_BRAND.seasonLabel}
                    </div>
                    <div className="text-base sm:text-lg font-black text-[#F4C84A] mt-0.5">
                      {customTitle || activeReport.reportTitle}
                    </div>
                    <div className="text-[11px] font-bold text-[#35B8E8] mt-0.5">
                      {customSubtitle}
                    </div>
                  </div>

                  {/* 2. الخط الذهبي الفاصل */}
                  <div className="h-1.5 bg-gradient-to-r from-[#C5A45D] via-[#F4C84A] to-[#C5A45D]" />

                  {/* 3. شريط معلومات التقرير بالكحلي المتوسط */}
                  <div className="bg-[#12192C] px-4 py-2 text-[11px] font-bold text-[#D6DCE8] flex items-center justify-center gap-4 flex-wrap border-b border-[#263247]">
                    <span>
                      الجهة: <strong className="text-white">{ALQAEM_EXCEL_BRAND.systemName}</strong>
                    </span>
                    <span className="text-[#C5A45D]">|</span>
                    <span>
                      الأعمدة المعتمدة:{' '}
                      <strong className="text-[#35B8E8]">{selectedColumns.length} أعمدة</strong>
                    </span>
                    <span className="text-[#C5A45D]">|</span>
                    <span>
                      إجمالي السجلات:{' '}
                      <strong className="text-[#F4C84A]">{activeReport.rows.length} سجل</strong>
                    </span>
                  </div>

                  {/* 4. جدول البيانات (رؤوس كحلية + صفوف فاتحة متناوبة للطباعة) */}
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0C1220] border-b-2 border-[#F4C84A]">
                          {selectedColumns.map((col, idx) => (
                            <th
                              key={`${col.originalIndex}-${idx}`}
                              className={`px-3 py-2.5 font-black border border-[#263247] whitespace-nowrap text-center ${
                                idx === 0 ? 'text-[#F4C84A]' : 'text-white'
                              }`}
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeReport.rows.slice(0, 4).map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={rIdx % 2 === 0 ? 'bg-white' : 'bg-[#F4F7FB]'}
                          >
                            {selectedColumns.map((col, cIdx) => {
                              const cellVal = String(row[col.originalIndex] ?? '');
                              const isPos =
                                cellVal === 'نعم' ||
                                cellVal.includes('مؤكد') ||
                                cellVal === 'تم القبول' ||
                                cellVal === 'مكتمل' ||
                                cellVal.includes('تم التسليم') ||
                                cellVal === 'حاضر' ||
                                cellVal === 'نشط';
                              return (
                                <td
                                  key={cIdx}
                                  className={`px-3 py-2 border border-[#CBD5E1] text-center whitespace-nowrap ${
                                    cIdx === 0
                                      ? 'bg-[#EEF2F8] font-black text-[#0C1220]'
                                      : isPos
                                      ? 'bg-[#E6F8F3] font-black text-[#0D7A5F]'
                                      : 'text-[#0C1220] font-semibold'
                                  }`}
                                >
                                  {cellVal || '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* ذيل النافذة وأزرار الاعتماد والتصدير */}
            <div className="bg-[#12192C] px-6 py-4 border-t border-[#263247] flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-[#D6DCE8] font-bold">
                سيتم تصدير ملف <strong className="text-[#F4C84A]">Excel (.xlsx)</strong> جاهز للفتح والطباعة المباشرة على ورق A4 باتجاه RTL.
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeAlQaemExcelCustomizer}
                  className="px-4 py-2.5 rounded-xl bg-[#0C1220] hover:bg-slate-900 text-[#D6DCE8] border border-[#263247] text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isExporting || selectedColumns.length === 0}
                  onClick={handleExportCustomized}
                  className="px-5 py-2.5 rounded-xl bg-[#F4C84A] hover:bg-amber-300 text-[#0C1220] font-black text-xs transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>
                    {isExporting
                      ? 'جاري تجهيز ملف Excel الرسمي...'
                      : `تصدير ملف Excel المعتمد (${selectedColumns.length} عمود)`}
                  </span>
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
