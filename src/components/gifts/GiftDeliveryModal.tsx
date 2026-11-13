import React, { useState } from 'react';
import { Gift, User, Users, CheckCircle2, AlertCircle, X, ShieldCheck, MapPin, Calendar, Clock, FileText, Phone, Hash } from 'lucide-react';
import { GiftDistribution, GiftOperationLog } from '../../types';

interface GiftDeliveryModalProps {
  giftItem: GiftDistribution;
  currentStaffName: string;
  onSaveDelivery: (updatedGift: GiftDistribution, auditLog: GiftOperationLog) => Promise<void> | void;
  onClose: () => void;
}

export const GiftDeliveryModal: React.FC<GiftDeliveryModalProps> = ({
  giftItem,
  currentStaffName,
  onSaveDelivery,
  onClose,
}) => {
  const isAlreadyDelivered = giftItem.status === 'delivered_direct' || giftItem.status === 'delivered_proxy';

  const [recipientType, setRecipientType] = useState<'pilgrim' | 'proxy'>(
    giftItem.recipientType || 'pilgrim'
  );

  // Form Fields
  const [recipientName, setRecipientName] = useState(
    giftItem.recipientType === 'proxy' && giftItem.recipientName ? giftItem.recipientName : ''
  );
  const [recipientIdNumber, setRecipientIdNumber] = useState(giftItem.recipientIdNumber || '');
  const [recipientMobile, setRecipientMobile] = useState(giftItem.recipientMobile || '');
  const [recipientRelation, setRecipientRelation] = useState(giftItem.recipientRelation || 'قريب');
  const [proxyType, setProxyType] = useState<'قريب' | 'مرافق' | 'مشرف مجموعة' | 'مندوب' | 'أخرى'>(
    giftItem.proxyType || 'قريب'
  );

  const [deliveryDate, setDeliveryDate] = useState(
    giftItem.deliveryDate || new Date().toISOString().split('T')[0]
  );
  const [deliveryTime, setDeliveryTime] = useState(
    giftItem.deliveryTime ||
      new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
  const [deliveredBy, setDeliveredBy] = useState(giftItem.deliveredBy || currentStaffName || 'مشرف التوزيع');
  const [deliveryLocation, setDeliveryLocation] = useState(giftItem.deliveryLocation || 'مقر توزيع الهدايا الرئيسي');
  const [notes, setNotes] = useState(giftItem.notes || '');

  // Override / Confirmation state
  const [overrideReason, setOverrideReason] = useState('');
  const [showConfirmationStep, setShowConfirmationStep] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PROXY_RELATION_OPTIONS = [
    'ابن / ابنة',
    'زوج / زوجة',
    'أخ / أخت',
    'أب / أم',
    'قريب من العائلة',
    'مرافق في نفس الغرفة/الباص',
    'مشرف المجموعة أو الباص',
    'مندوب مفوض',
    'أخرى',
  ];

  const DELIVERY_LOCATIONS = [
    'مقر توزيع الهدايا الرئيسي (الأحساء)',
    'نقطة تجمع المغادرة',
    'على متن الحافلة',
    'صالة مطار الدمام',
    'صالة مطار جدة / المدينة',
    'فندق مكة المكرمة',
    'فندق المدينة المنورة',
    'مقر مخيم مشعر منى',
    'تسليم عبر مندوب توصيل',
  ];

  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (recipientType === 'proxy') {
      if (!recipientName.trim()) {
        setFormError('يرجى إدخال اسم الشخص المستلم بالإنابة');
        return;
      }
      if (!recipientMobile.trim()) {
        setFormError('يرجى إدخال رقم جوال الشخص المستلم للإشعار والتوثيق');
        return;
      }
    }

    if (!deliveryLocation.trim()) {
      setFormError('يرجى تحديد مكان التسليم');
      return;
    }

    if (isAlreadyDelivered && !overrideReason.trim()) {
      setFormError('تم تسليم هذه الهدية مسبقاً، يرجى كتابة سبب التعديل أو إعادة التسليم للتوثيق الرقابي');
      return;
    }

    setShowConfirmationStep(true);
  };

  const handleFinalConfirmAndSave = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const now = new Date();
      const timestamp = now.toLocaleString('ar-SA');
      const finalStatus = recipientType === 'pilgrim' ? 'delivered_direct' : 'delivered_proxy';

      const auditLog: GiftOperationLog = {
        id: `log-${Date.now()}`,
        timestamp,
        staffName: deliveredBy,
        action: isAlreadyDelivered
          ? 'تعديل حالة'
          : recipientType === 'pilgrim'
          ? 'تسجيل تسليم مباشر'
          : 'تسجيل تسليم بالإنابة',
        previousStatus: giftItem.status,
        newStatus: finalStatus,
        reason: isAlreadyDelivered ? overrideReason : undefined,
        details:
          recipientType === 'pilgrim'
            ? `استلام الحاج بنفسه في (${deliveryLocation})`
            : `استلام بالإنابة بواسطة: ${recipientName} (${proxyType} - ${recipientRelation}) جوال: ${recipientMobile}`,
      };

      const updatedGift: GiftDistribution = {
        ...giftItem,
        status: finalStatus,
        recipientType,
        recipientName: recipientType === 'pilgrim' ? giftItem.pilgrimName : recipientName.trim(),
        recipientIdNumber: recipientType === 'proxy' ? recipientIdNumber.trim() : undefined,
        recipientMobile: recipientType === 'proxy' ? recipientMobile.trim() : giftItem.mobile,
        recipientRelation: recipientType === 'proxy' ? recipientRelation : 'الحاج نفسه',
        proxyType: recipientType === 'proxy' ? proxyType : undefined,
        deliveryDate,
        deliveryTime,
        deliveredBy,
        deliveryLocation,
        notes: notes.trim() || undefined,
        history: [auditLog, ...(giftItem.history || [])],
        updatedAt: now.toISOString(),
      };

      await onSaveDelivery(updatedGift, auditLog);
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء حفظ عملية التسليم');
      setShowConfirmationStep(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-[#0B1221] border border-amber-500/30 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0F172A]/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold border border-amber-500/35 shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white truncate">
                {showConfirmationStep ? 'تأكيد عملية تسليم الهدية' : 'تسجيل تسليم هدية الحاج'}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                الحاج: <strong className="text-amber-400">{giftItem.pilgrimName}</strong> • الهوية:{' '}
                <span className="font-mono">{giftItem.nationalId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning if already delivered */}
        {isAlreadyDelivered && !showConfirmationStep && (
          <div className="p-3 mx-4 sm:mx-6 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="block font-bold">تنبيه رقابي: تم توثيق تسليم الهدية لهذا الحاج سابقاً!</strong>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                مسجل سابقاً باسم ({giftItem.recipientName}) بتاريخ ({giftItem.deliveryDate} {giftItem.deliveryTime}) بواسطة ({giftItem.deliveredBy}). يلزم تسجيل سبب التعديل أدناه للمطابقة.
              </p>
            </div>
          </div>
        )}

        {/* Form Error */}
        {formError && (
          <div className="p-3 mx-4 sm:mx-6 mt-3 bg-rose-500/15 border border-rose-500/35 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {!showConfirmationStep ? (
            <form id="giftDeliveryForm" onSubmit={handleProceedToConfirmation} className="space-y-5">
              {/* Pilgrim Quick Meta Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#070C18] border border-slate-800 rounded-2xl p-3 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">رقم العضوية</span>
                  <span className="font-mono font-bold text-amber-400">
                    {giftItem.membershipNumber || 'QAEM-1448'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">رقم الجوال</span>
                  <span className="font-mono text-slate-200" dir="ltr">
                    {giftItem.mobile}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">رقم الباص</span>
                  <span className="font-bold text-emerald-400">{giftItem.busNumber || 'غير محدد'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">الرحلة الجوية</span>
                  <span className="font-bold text-sky-400">{giftItem.flightNumber || 'غير محدد'}</span>
                </div>
              </div>

              {/* Recipient Type Selector (Two Distinct Options) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200">
                  صفة المستلم الفعلي للهدية: <span className="text-amber-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: الحاج نفسه */}
                  <button
                    type="button"
                    onClick={() => setRecipientType('pilgrim')}
                    className={`p-3.5 rounded-2xl border text-right flex items-center gap-3 transition-all cursor-pointer ${
                      recipientType === 'pilgrim'
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                        : 'bg-[#10192D] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        recipientType === 'pilgrim'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-[#0B1221] text-slate-400'
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <strong className="block text-xs font-black text-white">الخيار الأول: استلام الحاج بنفسه</strong>
                      <span className="text-[11px] text-slate-400 truncate block">
                        تسليم مباشر للحاج الشخصي ({giftItem.pilgrimName})
                      </span>
                    </div>
                  </button>

                  {/* Option 2: شخص ينوب عن الحاج */}
                  <button
                    type="button"
                    onClick={() => setRecipientType('proxy')}
                    className={`p-3.5 rounded-2xl border text-right flex items-center gap-3 transition-all cursor-pointer ${
                      recipientType === 'proxy'
                        ? 'bg-sky-500/15 border-sky-500 text-white shadow-md'
                        : 'bg-[#10192D] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        recipientType === 'proxy'
                          ? 'bg-sky-500 text-slate-950 font-black'
                          : 'bg-[#0B1221] text-slate-400'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <strong className="block text-xs font-black text-white">الخيار الثاني: استلام بالإنابة</strong>
                      <span className="text-[11px] text-slate-400 truncate block">
                        استلام قريب، مرافق، مشرف، أو مندوب مفوض
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditional Proxy Fields */}
              {recipientType === 'proxy' && (
                <div className="bg-[#10192D] border border-sky-500/30 rounded-2xl p-4 sm:p-5 space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                    <Users className="w-4 h-4 text-sky-400" />
                    <h4 className="text-xs font-bold text-sky-300">بيانات الشخص المستلم بالإنابة (حقول إلزامية للتوثيق)</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Proxy Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        اسم الشخص المستلم الفعلي: <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="الاسم الثلاثي أو الرباعي للمستلم"
                        className="w-full bg-[#070C18] border border-slate-700 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    {/* Proxy Mobile */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        رقم جوال المستلم الفعلي: <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        dir="ltr"
                        value={recipientMobile}
                        onChange={(e) => setRecipientMobile(e.target.value)}
                        placeholder="05xxxxxxxx"
                        className="w-full bg-[#070C18] border border-slate-700 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white font-mono text-left focus:outline-none"
                      />
                    </div>

                    {/* Proxy ID / Iqama */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        رقم الهوية / الإثبات (وفق سياسة النظام):
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={recipientIdNumber}
                        onChange={(e) => setRecipientIdNumber(e.target.value)}
                        placeholder="10 أرقام (اختياري للتوثيق)"
                        className="w-full bg-[#070C18] border border-slate-700 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white font-mono text-left focus:outline-none"
                      />
                    </div>

                    {/* Proxy Type & Relation */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        نوع وصفة الإنابة: <span className="text-rose-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={proxyType}
                          onChange={(e) => setProxyType(e.target.value as any)}
                          className="bg-[#070C18] border border-slate-700 focus:border-sky-400 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="قريب">قريب</option>
                          <option value="مرافق">مرافق</option>
                          <option value="مشرف مجموعة">مشرف مجموعة</option>
                          <option value="مندوب">مندوب</option>
                          <option value="أخرى">أخرى</option>
                        </select>

                        <select
                          value={recipientRelation}
                          onChange={(e) => setRecipientRelation(e.target.value)}
                          className="bg-[#070C18] border border-slate-700 focus:border-sky-400 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                        >
                          {PROXY_RELATION_OPTIONS.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Metadata (Date, Time, Location, Staff) */}
              <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-4 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Delivery Location */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      مكان التسليم: <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      list="giftDeliveryLocationsList"
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      placeholder="اختر أو اكتب مكان التسليم"
                      className="w-full bg-[#070C18] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <datalist id="giftDeliveryLocationsList">
                      {DELIVERY_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                  </div>

                  {/* Staff Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      اسم الموظف المسؤول عن التسليم: <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={deliveredBy}
                      onChange={(e) => setDeliveredBy(e.target.value)}
                      className="w-full bg-[#070C18] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Delivery Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ التسليم:</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full bg-[#070C18] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>

                  {/* Delivery Time */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">وقت التسليم:</label>
                    <input
                      type="text"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      placeholder="مثال: 04:30 مساءً"
                      className="w-full bg-[#070C18] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات التسليم (اختياري):</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات خاصة أو متعلقات إضافية..."
                    className="w-full bg-[#070C18] border border-slate-700 focus:border-amber-400 rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
                  />
                </div>

                {/* Override Reason (if already delivered) */}
                {isAlreadyDelivered && (
                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-xs font-bold text-amber-300 mb-1">
                      سبب إعادة التسليم أو تعديل الحالة (إلزامي للتدقيق): <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="مثال: تصحيح اسم المستلم الفعلي بعد التحقق..."
                      className="w-full bg-[#070C18] border border-amber-500/50 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </form>
          ) : (
            /* Confirmation Step Dialog */
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-gradient-to-br from-[#10192D] to-[#070C18] border border-amber-500/40 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="text-sm font-black text-white">مراجعة وتأكيد عملية تسليم الهدية</h4>
                    <p className="text-[11px] text-slate-400">يرجى التأكد من صحة البيانات التالية قبل الحفظ النهائي في السجل</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#0B1221] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">اسم الحاج صاحب الهدية</span>
                    <strong className="text-white text-sm block">{giftItem.pilgrimName}</strong>
                    <span className="text-slate-400 font-mono text-[11px]">{giftItem.nationalId}</span>
                  </div>

                  <div className="bg-[#0B1221] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">اسم المستلم الفعلي</span>
                    <strong className="text-amber-400 text-sm block">
                      {recipientType === 'pilgrim' ? giftItem.pilgrimName : recipientName}
                    </strong>
                    <span className="text-slate-400 text-[11px]">
                      {recipientType === 'pilgrim' ? 'الحاج نفسه (تسليم مباشر)' : `إنابة (${proxyType} - ${recipientRelation})`}
                    </span>
                  </div>

                  <div className="bg-[#0B1221] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">رقم الباص والرحلة</span>
                    <strong className="text-slate-200 block">
                      باص: {giftItem.busNumber || 'غير محدد'} • طيران: {giftItem.flightNumber || 'غير محدد'}
                    </strong>
                  </div>

                  <div className="bg-[#0B1221] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">الموظف المسؤول ومكان التسليم</span>
                    <strong className="text-slate-200 block">{deliveredBy}</strong>
                    <span className="text-slate-400 text-[11px] truncate block">{deliveryLocation}</span>
                  </div>

                  <div className="bg-[#0B1221] p-3 rounded-xl border border-slate-800 sm:col-span-2">
                    <span className="text-[10px] text-slate-400 block mb-0.5">تاريخ ووقت التسليم</span>
                    <strong className="text-slate-200 font-mono">
                      {deliveryDate} — {deliveryTime}
                    </strong>
                    {notes && <p className="text-slate-400 text-[11px] mt-1">ملاحظة: {notes}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0F172A]/90 flex items-center justify-between gap-3 shrink-0">
          {!showConfirmationStep ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                form="giftDeliveryForm"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>متابعة والتأكيد</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmationStep(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                رجوع وتعديل
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalConfirmAndSave}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>جاري الحفظ والتوثيق...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد وحفظ عملية التسليم</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
