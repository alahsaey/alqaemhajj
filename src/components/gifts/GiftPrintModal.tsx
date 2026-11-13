import React, { useRef } from 'react';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';
import { getStatusLabelArabic } from '../../utils/giftExport';

interface GiftPrintModalProps {
  title: string;
  subtitle?: string;
  generatedBy: string;
  filterSummary?: string;
  columns: string[];
  data: (string | number)[][];
  summaryCards?: { label: string; value: string | number }[];
  onClose: () => void;
}

export const GiftPrintModal: React.FC<GiftPrintModalProps> = ({
  title,
  subtitle,
  generatedBy,
  filterSummary,
  columns,
  data,
  summaryCards = [],
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-[#0B1221] border border-amber-500/30 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Controls Header (Screen only) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0F172A] shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-white">معاينة التقرير والطباعة الرسمية</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير (أو حفظ PDF)</span>
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

        {/* Printable Document Area */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-950 print:p-0 print:m-0" id="giftPrintArea" ref={printAreaRef}>
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-amber-600 pb-4 mb-5 flex items-center justify-between gap-4">
            <div className="text-right">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">قافلة القائم للحج والعمرة والزيارة</h1>
              <p className="text-xs text-slate-600 font-bold mt-0.5">بوابة أمور الحاج ونظام الإدارة والتشغيل المعتمد — موسم 1448هـ</p>
              <p className="text-[11px] text-slate-500">الأحساء - المملكة العربية السعودية • ترخيص رسمي معتمد</p>
            </div>

            <div className="text-center shrink-0">
              <div className="w-18 h-18 rounded-2xl bg-white border-2 border-amber-500/40 shadow-sm flex items-center justify-center p-1.5 mx-auto">
                <img
                  src="/assets/aistudio/media_1794134676879_98f1e0ea.png"
                  alt="شعار قافلة القائم"
                  className="w-14 h-14 object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.includes('Screenshot_20261107_174409')) {
                      img.src = '/assets/aistudio/Screenshot_20261107_174409_com_instagram_android_InstagramMainActivity_441b738d.png';
                    } else {
                      img.style.display = 'none';
                    }
                  }}
                />
              </div>
              <span className="text-[10px] font-bold text-amber-700 block mt-1">قافلة القائم</span>
            </div>

            <div className="text-left text-xs text-slate-600 space-y-0.5">
              <p>تاريخ الاستخراج: <span className="font-mono font-bold">{new Date().toLocaleDateString('ar-SA')}</span></p>
              <p>الوقت: <span className="font-mono">{new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span></p>
              <p>المشرف المستخرج: <span className="font-bold text-slate-900">{generatedBy}</span></p>
            </div>
          </div>

          {/* Report Title */}
          <div className="text-center my-4 space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 bg-amber-50 inline-block px-6 py-1.5 rounded-xl border border-amber-200">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
            {filterSummary && (
              <p className="text-[11px] text-slate-500">نطاق التصفية المطبق: {filterSummary}</p>
            )}
          </div>

          {/* Summary Mini Cards */}
          {summaryCards.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              {summaryCards.map((card, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">{card.label}</span>
                  <strong className="text-sm font-black text-slate-900 font-mono mt-0.5 block">{card.value}</strong>
                </div>
              ))}
            </div>
          )}

          {/* Data Table */}
          <div className="mt-4 overflow-x-auto border border-slate-300 rounded-xl">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  {columns.map((col, idx) => (
                    <th key={idx} className="p-2 border-l border-slate-300 last:border-l-0 text-center first:text-right">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="p-4 text-center text-slate-500">
                      لا توجد بيانات مسجلة مطابقة لمعايير هذا التقرير.
                    </td>
                  </tr>
                ) : (
                  data.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="p-2 border-l border-slate-200 last:border-l-0 text-center first:text-right text-[11px]"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Official Signature Footer */}
          <div className="mt-8 pt-6 border-t border-slate-300 flex items-center justify-between text-xs text-slate-700">
            <div className="text-center">
              <span className="block font-bold">مسؤول وحدة توزيع الهدايا</span>
              <span className="block text-[11px] text-slate-500 mt-6">............................................</span>
            </div>
            <div className="text-center">
              <span className="block font-bold">ختم إدارة القافلة المعتمد</span>
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-600/40 flex items-center justify-center text-[10px] text-amber-700 font-bold mx-auto mt-2">
                ختم الإدارة
              </div>
            </div>
            <div className="text-center">
              <span className="block font-bold">اعتماد المشرف العام</span>
              <span className="block text-[11px] text-slate-500 mt-6">............................................</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
