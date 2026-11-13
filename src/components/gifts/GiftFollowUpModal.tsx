import React, { useState } from 'react';
import { PhoneCall, Calendar, Clock, User, X, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { GiftDistribution, GiftCommunication, GiftOperationLog } from '../../types';

interface GiftFollowUpModalProps {
  giftItem: GiftDistribution;
  currentStaffName: string;
  onSaveFollowUp: (comm: GiftCommunication, updatedGift: GiftDistribution, auditLog: GiftOperationLog) => Promise<void> | void;
  onClose: () => void;
}

export const GiftFollowUpModal: React.FC<GiftFollowUpModalProps> = ({
  giftItem,
  currentStaffName,
  onSaveFollowUp,
  onClose,
}) => {
  const [contactMethod, setContactMethod] = useState<GiftCommunication['contactMethod']>('اتصال هاتفي');
  const [result, setResult] = useState<GiftCommunication['result']>('تم التواصل ولم يحضر');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [contactStaff, setContactStaff] = useState(currentStaffName || 'مشرف المتابعة');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const now = new Date();
      const contactDate = now.toISOString().split('T')[0];
      const contactTime = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });

      const newComm: GiftCommunication = {
        id: `comm-${Date.now()}`,
        pilgrimId: giftItem.pilgrimId,
        nationalId: giftItem.nationalId,
        pilgrimName: giftItem.pilgrimName,
        mobile: giftItem.mobile,
        busNumber: giftItem.busNumber,
        flightNumber: giftItem.flightNumber,
        contactDate,
        contactTime,
        contactMethod,
        contactStaff,
        result,
        nextFollowUpDate: nextFollowUpDate || undefined,
        notes: notes.trim() || undefined,
        createdAt: now.toISOString(),
      };

      let nextFollowUpStatus: GiftDistribution['followUpStatus'] = 'not_contacted';
      let nextGiftStatus = giftItem.status;

      if (result === 'تم التواصل ولم يحضر') {
        nextFollowUpStatus = 'contacted_no_show';
        nextGiftStatus = 'contacted_no_show';
      } else if (result === 'تعذر التواصل معه') {
        nextFollowUpStatus = 'unable_to_contact';
      } else if (result === 'تم تحديد موعد جديد') {
        nextFollowUpStatus = 'new_date_set';
        nextGiftStatus = 'postponed';
      } else if (result === 'تعذر التسليم لسبب آخر') {
        nextFollowUpStatus = 'unable_other';
        nextGiftStatus = 'unable_to_deliver';
      }

      const auditLog: GiftOperationLog = {
        id: `log-${Date.now()}`,
        timestamp: `${contactDate} ${contactTime}`,
        staffName: contactStaff,
        action: 'تسجيل تواصل',
        previousStatus: giftItem.status,
        newStatus: nextGiftStatus,
        details: `وسيلة: ${contactMethod} • النتيجة: ${result} ${nextFollowUpDate ? `• موعد قادم: ${nextFollowUpDate}` : ''}`,
      };

      const updatedGift: GiftDistribution = {
        ...giftItem,
        status: nextGiftStatus,
        followUpStatus: nextFollowUpStatus,
        lastContactDate: `${contactDate} ${contactTime}`,
        lastContactStaff: contactStaff,
        nextFollowUpDate: nextFollowUpDate || giftItem.nextFollowUpDate,
        contactAttemptsCount: (giftItem.contactAttemptsCount || 0) + 1,
        history: [auditLog, ...(giftItem.history || [])],
        updatedAt: now.toISOString(),
      };

      await onSaveFollowUp(newComm, updatedGift, auditLog);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ محاولة التواصل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-[#0B1221] border border-amber-500/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0F172A]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/35">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">تسجيل محاولة تواصل ومتابعة</h3>
              <p className="text-xs text-slate-400">
                الحاج: <strong className="text-amber-400">{giftItem.pilgrimName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mx-5 mt-4 bg-rose-500/15 border border-rose-500/35 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-[#070C18] border border-slate-800 rounded-xl p-3 text-xs flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-400 block">رقم الجوال</span>
              <a
                href={`tel:${giftItem.mobile}`}
                className="font-mono text-amber-400 font-bold hover:underline"
                dir="ltr"
              >
                {giftItem.mobile}
              </a>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">رقم الباص</span>
              <span className="font-bold text-white">{giftItem.busNumber || 'غير محدد'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">محاولات سابقة</span>
              <span className="font-mono text-amber-400 font-bold">{giftItem.contactAttemptsCount || 0}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">وسيلة التواصل:</label>
            <select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value as any)}
              className="w-full bg-[#10192D] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="اتصال هاتفي">اتصال هاتفي</option>
              <option value="واتساب">رسالة واتساب</option>
              <option value="رسالة نصية">رسالة نصية SMS</option>
              <option value="مقابلة مباشرة">مقابلة مباشرة</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">نتيجة التواصل والمحاولة:</label>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as any)}
              className="w-full bg-[#10192D] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="تم التواصل ولم يحضر">تم التواصل مع الحاج ولم يحضر</option>
              <option value="تعذر التواصل معه">تعذر التواصل معه (مغلق / لا يرد)</option>
              <option value="تم تحديد موعد جديد">تم تحديد موعد استلام جديد</option>
              <option value="تم الاتفاق على الاستلام">تم التنسيق للاستلام في المقر</option>
              <option value="تعذر التسليم لسبب آخر">تعذر التسليم لسبب آخر</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">موعد الاستلام أو المتابعة القادم (إن وجد):</label>
            <input
              type="date"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              className="w-full bg-[#10192D] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">اسم الموظف المتواصل:</label>
            <input
              type="text"
              required
              value={contactStaff}
              onChange={(e) => setContactStaff(e.target.value)}
              className="w-full bg-[#10192D] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات المحاولة والتفاصيل:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تم الاتفاق على حضور ابنه للاستلام غداً..."
              className="w-full bg-[#10192D] border border-slate-700 focus:border-amber-400 rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ نتيجة التواصل'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
