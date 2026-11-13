import React from 'react';
import { Gift, Clock, User, Users, PhoneCall, X, ShieldCheck, MapPin, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { GiftDistribution, GiftCommunication } from '../../types';
import { getStatusLabelArabic, getFollowUpLabelArabic } from '../../utils/giftExport';

interface GiftHistoryModalProps {
  giftItem: GiftDistribution;
  communications: GiftCommunication[];
  onClose: () => void;
  onOpenDeliveryModal?: () => void;
}

export const GiftHistoryModal: React.FC<GiftHistoryModalProps> = ({
  giftItem,
  communications,
  onClose,
  onOpenDeliveryModal,
}) => {
  const pilgrimComms = communications.filter(
    (c) => c.pilgrimId === giftItem.pilgrimId || c.nationalId === giftItem.nationalId
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-[#0B1221] border border-amber-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0F172A]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/35">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                سجل تفاصيل ومتابعة هدية الحاج
              </h3>
              <p className="text-xs text-slate-400">
                الحاج: <strong className="text-amber-400">{giftItem.pilgrimName}</strong> • الهوية:{' '}
                <span className="font-mono">{giftItem.nationalId}</span>
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

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status & Delivery Card */}
          <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">الحالة الحالية:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black border ${
                    giftItem.status === 'delivered_direct'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : giftItem.status === 'delivered_proxy'
                      ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                      : giftItem.status === 'contacted_no_show'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : giftItem.status === 'unable_to_deliver'
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : giftItem.status === 'postponed'
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {getStatusLabelArabic(giftItem.status)}
                </span>
              </div>

              {onOpenDeliveryModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDeliveryModal();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition cursor-pointer"
                >
                  {giftItem.status === 'delivered_direct' || giftItem.status === 'delivered_proxy'
                    ? 'تعديل بيانات التسليم'
                    : 'تسجيل التسليم الآن'}
                </button>
              )}
            </div>

            {/* If Delivered */}
            {(giftItem.status === 'delivered_direct' || giftItem.status === 'delivered_proxy') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#070C18] p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">المستلم الفعلي</span>
                  <strong className="text-white block">{giftItem.recipientName}</strong>
                  <span className="text-slate-400 text-[11px]">
                    {giftItem.recipientType === 'pilgrim' ? 'الحاج نفسه' : `إنابة (${giftItem.proxyType || 'قريب'} - ${giftItem.recipientRelation || ''})`}
                  </span>
                  {giftItem.recipientMobile && (
                    <span className="text-slate-400 font-mono text-[11px] block mt-0.5" dir="ltr">
                      {giftItem.recipientMobile}
                    </span>
                  )}
                </div>

                <div className="bg-[#070C18] p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">تاريخ ومكان التسليم</span>
                  <strong className="text-white font-mono block">
                    {giftItem.deliveryDate} — {giftItem.deliveryTime}
                  </strong>
                  <span className="text-slate-300 text-[11px] block mt-0.5">
                    الموقع: {giftItem.deliveryLocation || 'المقر الرئيسي'}
                  </span>
                  <span className="text-slate-400 text-[10px] block">
                    الموظف: {giftItem.deliveredBy || 'المشرف'}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Bus & Flight */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-1">
              <span>رقم الباص: <strong className="text-emerald-400 font-bold">{giftItem.busNumber || 'غير محدد'}</strong></span>
              <span>الرحلة الجوية: <strong className="text-sky-400 font-bold">{giftItem.flightNumber || 'غير محدد'}</strong></span>
              <span>رقم العضوية: <strong className="text-amber-400 font-mono">{giftItem.membershipNumber || 'QAEM-1448'}</strong></span>
            </div>

            {giftItem.notes && (
              <div className="bg-[#070C18] p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="text-[10px] text-slate-400 block mb-0.5">ملاحظات:</span>
                <p>{giftItem.notes}</p>
              </div>
            )}
          </div>

          {/* Section 2: Communication Attempts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>سجل محاولات التواصل والمتابعة ({pilgrimComms.length})</span>
              </h4>
            </div>

            {pilgrimComms.length === 0 ? (
              <div className="bg-[#10192D]/60 border border-slate-800/80 rounded-2xl p-4 text-center text-xs text-slate-400">
                لم يتم تسجيل أي محاولات تواصل مسبقة لهذا الحاج.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pilgrimComms.map((comm) => (
                  <div
                    key={comm.id}
                    className="bg-[#10192D] border border-slate-800 rounded-xl p-3.5 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        <span>{comm.result}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {comm.contactDate} {comm.contactTime}
                      </span>
                    </div>
                    <div className="text-slate-300 flex flex-wrap gap-3 text-[11px]">
                      <span>الوسيلة: <strong>{comm.contactMethod}</strong></span>
                      <span>الموظف: <strong>{comm.contactStaff}</strong></span>
                      {comm.nextFollowUpDate && (
                        <span>الموعد القادم: <strong className="text-amber-300">{comm.nextFollowUpDate}</strong></span>
                      )}
                    </div>
                    {comm.notes && (
                      <p className="text-[11px] text-slate-400 bg-[#070C18] p-2 rounded-lg border border-slate-800/90">
                        {comm.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Audit Trail of Status Changes */}
          {Array.isArray(giftItem.history) && giftItem.history.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>سجل العمليات والتدقيق الرقابي ({giftItem.history.length})</span>
              </h4>

              <div className="space-y-2">
                {giftItem.history.map((log) => (
                  <div
                    key={log.id}
                    className="bg-[#070C18] border border-slate-800/90 rounded-xl p-3 text-xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{log.action}</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{log.details}</p>
                      {log.reason && (
                        <p className="text-amber-400 text-[11px]">سبب التعديل: {log.reason}</p>
                      )}
                    </div>
                    <div className="text-left shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 block">{log.timestamp}</span>
                      <span className="text-[10px] text-slate-300 block">{log.staffName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0F172A]/90 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
