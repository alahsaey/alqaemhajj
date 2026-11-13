import React, { useState } from 'react';
import { Pilgrim, CampaignSettings } from '../types';
import { 
  Search, UserCheck, ShieldCheck, CheckCircle2, AlertCircle, 
  Loader2, Sparkles, Star, MessageSquare, Send, Smartphone, FileCheck,
  Lock, KeyRound, CreditCard, RotateCcw, Shield, ShieldAlert, Clock, UploadCloud
} from 'lucide-react';
import { getDocument, queryDocuments, updateDocument, recordActivityLog } from '../lib/db';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { PilgrimNotificationCenter } from './PilgrimNotificationCenter';

interface PilgrimPortalProps {
  pilgrims: Pilgrim[];
  campaignSettings?: CampaignSettings;
}

export const PilgrimPortal: React.FC<PilgrimPortalProps> = ({ 
  pilgrims: initialPilgrims,
  campaignSettings = {
    phone: '0534717773',
    whatsapp: '0534717773',
    email: 'alqaemhajj@gmail.com',
    address: 'المملكة العربية السعودية - المنطقة الشرقية (الأحساء-المبرز)',
    marjiList: []
  }
}) => {
  const [nationalIdInput, setNationalIdInput] = useState('');
  const [registrationRefInput, setRegistrationRefInput] = useState('');
  const [searchedPilgrim, setSearchedPilgrim] = useState<Pilgrim | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = nationalIdInput.trim();
    const cleanRef = registrationRefInput.trim().toLowerCase();

    if (!cleanId && !cleanRef) {
      setValidationError('يرجى إدخال رقم البطاقة (الهوية) ورقم التسجيل معاً لإتمام التحقق.');
      return;
    }

    if (!cleanId) {
      setValidationError('يرجى إدخال رقم البطاقة (الهوية الوطنية / الإقامة).');
      return;
    }

    if (!cleanRef) {
      setValidationError('يرجى إدخال رقم التسجيل المرجعي الصادر لك عند التسجيل.');
      return;
    }

    setValidationError('');
    setSearching(true);
    setSearched(false);

    try {
      // 1. Search in local pilgrims list first (MUST match both nationalId AND registrationReference)
      let found = initialPilgrims.find(p => {
        const idMatches = p.nationalId.trim() === cleanId;
        const pilgrimRef = (p.registrationReference || '').trim().toLowerCase();
        const refMatches = pilgrimRef === cleanRef;
        return idMatches && refMatches;
      });

      // 2. If not found locally, query Firestore
      if (!found) {
        try {
          // Attempt direct document lookup by season-specific id or bare nationalId
          let docById = await getDocument<Pilgrim>('pilgrims', `${cleanId}_1448`);
          if (!docById) {
            docById = await getDocument<Pilgrim>('pilgrims', cleanId);
          }
          if (docById) {
            const docRef = (docById.registrationReference || '').trim().toLowerCase();
            if (docRef === cleanRef) {
              found = docById;
            }
          }

          // Fallback: query documents where nationalId equals cleanId
          if (!found) {
            const results = await queryDocuments<Pilgrim>('pilgrims', 'nationalId', '==', cleanId);
            if (results && results.length > 0) {
              const matched = results.find(p => (p.registrationReference || '').trim().toLowerCase() === cleanRef);
              if (matched) {
                found = matched;
              }
            }
          }
        } catch (dbErr) {
          console.warn("Firestore dual-verification query fallback warning:", dbErr);
        }
      }

      setSearchedPilgrim(found || null);
      if (found) {
        recordActivityLog({
          adminId: found.nationalId,
          adminName: `${found.firstName} ${found.secondName || ''} ${found.lastName}`.replace(/\s+/g, ' ').trim(),
          username: found.nationalId,
          userRole: 'حاج مسجل (بوابة الحاج)',
          category: 'بوابة الحاج والتسجيل',
          action: 'تسجيل دخول واستعلام عبر بوابة الحجاج الآمنة',
          target: `رقم الهوية: ${found.nationalId} — رقم التسجيل: #${found.registrationReference}`,
          details: `حالة الطلب: ${found.status}`,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Dual-verification search error:", err);
      setSearchedPilgrim(null);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  const handleResetSearch = () => {
    setNationalIdInput('');
    setRegistrationRefInput('');
    setSearchedPilgrim(null);
    setSearched(false);
    setValidationError('');
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-[#0B1221] border border-amber-500/30 text-white rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-12 text-right">
        {/* Header with Privacy Emphasis */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-3">
          <div className="w-16 h-16 bg-amber-500/15 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-amber-400">بوابة استعلام الحجاج الآمنة</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            حفاظاً على خصوصية وسرية بيانات الحجاج ومنع الاطلاع غير المصرح به، يتطلب النظام إدخال 
            <strong className="text-amber-400 mx-1">رقم البطاقة (الهوية)</strong> و
            <strong className="text-amber-400 mx-1">رقم التسجيل المرجعي</strong> معاً للتحقق من هوية الحاج.
          </p>

          <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-1.5 rounded-full text-xs font-bold mt-1">
            <Lock className="w-3.5 h-3.5" />
            <span>نظام تحقق ثنائي مشفر لضمان أقصى درجات الخصوصية</span>
          </div>
        </div>

        {/* Dual Input Form */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto space-y-4 mb-8 bg-[#070C18] p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field 1: National ID / Card Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-200">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>1. رقم البطاقة (الهوية الوطنية / الإقامة) <span className="text-amber-400">*</span></span>
                </span>
              </label>
              <input
                type="text"
                value={nationalIdInput}
                onChange={(e) => {
                  setNationalIdInput(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="أدخل رقم الهوية (10 أرقام)"
                maxLength={10}
                className="w-full bg-[#090F1E] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/25 font-mono font-bold transition"
                dir="ltr"
              />
              <span className="text-[11px] text-slate-400 block">مثال: 1003300132</span>
            </div>

            {/* Field 2: Registration Reference Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-200">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>2. رقم التسجيل (الرقم المرجعي) <span className="text-amber-400">*</span></span>
                </span>
              </label>
              <input
                type="text"
                value={registrationRefInput}
                onChange={(e) => {
                  setRegistrationRefInput(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="أدخل رقم التسجيل المرجعي (مثال: 1001)"
                className="w-full bg-[#090F1E] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/25 font-mono font-bold transition"
                dir="ltr"
              />
              <span className="text-[11px] text-slate-400 block">الرقم المرجعي المسلّم لك في استمارة التسجيل</span>
            </div>
          </div>

          {validationError && (
            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-500 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={searching}
              className="w-full sm:flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-98 disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{searching ? 'جاري التحقق من مطابقة البيانات...' : 'التحقق والاستعلام عن البيانات'}</span>
            </button>

            {(nationalIdInput || registrationRefInput || searched) && (
              <button
                type="button"
                onClick={handleResetSearch}
                className="w-full sm:w-auto bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-5 rounded-xl transition text-xs flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>مسح الحقول</span>
              </button>
            )}
          </div>
        </form>

        {searched && (
          <div>
            {searchedPilgrim ? (
              <div className="bg-slate-50 dark:bg-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-black text-xl shadow">
                      🕋
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {searchedPilgrim.firstName} {searchedPilgrim.secondName} {searchedPilgrim.thirdName} {searchedPilgrim.lastName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono" dir="ltr">رقم مرجعي: {searchedPilgrim.registrationReference}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <PilgrimNotificationCenter pilgrim={searchedPilgrim} />
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                      searchedPilgrim.status === 'مقبول ومؤكد' || searchedPilgrim.status === 'مكتمل الدفع' || searchedPilgrim.status === 'مكتمل' || searchedPilgrim.status === 'تم القبول'
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : searchedPilgrim.status === 'مرفوض'
                        ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                        : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                    }`}>
                      {searchedPilgrim.status}
                    </span>
                    <button
                      type="button"
                      onClick={handleResetSearch}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm hover:shadow"
                      title="البحث عن حاج آخر أو مسح الحقول"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>استعلام آخر</span>
                    </button>
                  </div>
                </div>

                {searchedPilgrim.status === 'مرفوض' && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 text-right">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-red-600 dark:text-red-400">
                        نعتذر، تم رفض طلب التسجيل
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        <strong className="text-red-600 dark:text-red-400">سبب الرفض: </strong>
                        {searchedPilgrim.rejectionReason || searchedPilgrim.statusNotes || 'لم يتم تحديد سبب إضافي، يرجى التواصل مع إدارة القافلة للاستفسار.'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div className="bg-[#090F1E] p-4 rounded-xl border border-amber-500/40 space-y-1 sm:col-span-2 lg:col-span-3">
                    <span className="text-xs text-amber-400 block font-bold">الباقة المحجوزة والمرتبطة بالطلب</span>
                    <strong className="text-white text-base font-black">{searchedPilgrim.selectedPackage || 'التسجيل العام'}</strong>
                  </div>
                  <div className="bg-[#090F1E] p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400 block font-bold">رقم الهوية</span>
                    <strong className="text-white text-xs font-mono font-bold" dir="ltr">{searchedPilgrim.nationalId}</strong>
                  </div>
                  <div className="bg-[#090F1E] p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400 block font-bold">وسيلة المواصلات</span>
                    <strong className="text-white font-bold">
                      {(searchedPilgrim.selectedPackage || '').includes('طيران') || searchedPilgrim.transport === 'طائرة'
                        ? 'طائرة'
                        : searchedPilgrim.transport || 'باص'}
                    </strong>
                  </div>
                  <div className="bg-[#090F1E] p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400 block font-bold">نوع الحجة</span>
                    <strong className="text-white font-bold">{searchedPilgrim.hajjType}</strong>
                  </div>
                  <div className="bg-[#090F1E] p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400 block font-bold">مرجع التقليد</span>
                    <strong className="text-white font-bold">{searchedPilgrim.currentMarji}</strong>
                  </div>
                  <div className="bg-[#090F1E] p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400 block font-bold">غرفة سكن مكة المكرمة</span>
                    <strong className="text-amber-400 font-bold">{searchedPilgrim.roomNumberMakkah || searchedPilgrim.roomNumber || 'قيد التخصيص'}</strong>
                  </div>
                  <div className="bg-[#090F1E] p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400 block font-bold">غرفة سكن المدينة المنورة</span>
                    <strong className="text-amber-400 font-bold">{searchedPilgrim.roomNumberMadinah || 'قيد التخصيص'}</strong>
                  </div>
                  <div className="bg-[#090F1E] p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400 block font-bold">تسكين منى (المخيم / المقر)</span>
                    <strong className="text-amber-400 font-bold">{searchedPilgrim.roomNumberMina || 'قيد التخصيص'}</strong>
                  </div>
                  <div className="bg-[#090F1E] p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400 block font-bold">
                      {(searchedPilgrim.selectedPackage || '').includes('طيران') || searchedPilgrim.transport === 'طائرة' || searchedPilgrim.flightNumberOutbound || searchedPilgrim.flightNumberReturn
                        ? 'بيانات رحلة الطيران (الذهاب / العودة)'
                        : 'رقم الباص والمقعد'}
                    </span>
                    <strong className="text-amber-400 font-bold">
                      {(searchedPilgrim.selectedPackage || '').includes('طيران') || searchedPilgrim.transport === 'طائرة' || searchedPilgrim.flightNumberOutbound || searchedPilgrim.flightNumberReturn
                        ? `${searchedPilgrim.flightNumberOutbound || 'الذهاب قيد التحديد'} | ${searchedPilgrim.flightNumberReturn || 'العودة قيد التحديد'}${searchedPilgrim.flightTicketNumber ? ` (حجز: ${searchedPilgrim.flightTicketNumber})` : ''}`
                        : searchedPilgrim.busNumber || searchedPilgrim.busSeat
                        ? `${searchedPilgrim.busNumber || 'الباص قيد التحديد'} — ${searchedPilgrim.busSeat ? `مقعد ${searchedPilgrim.busSeat}` : 'المقعد قيد التحديد'}`
                        : 'قيد التخصيص'}
                    </strong>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span>بطاقة تعريف الحاج الرسمية لقافلة القائم صالحة لموسم 1448هـ</span>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow hover:bg-amber-400 transition"
                  >
                    طباعة البطاقة
                  </button>
                </div>

                {/* Official Electronic Payment Receipt PDF Download Banner (Strictly only for confirmed paid pilgrims) */}
                {searchedPilgrim.status === 'مكتمل الدفع' || searchedPilgrim.status === 'مكتمل' ? (
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                      <FileCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <strong className="block text-slate-900 dark:text-white text-sm">وصل وسند الدفع الإلكتروني المعتمد (PDF)</strong>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">سند قبض مالي رسمي ومختوم - تم تأكيد واستلام السداد بنجاح</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowReceiptModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>تحميل / طباعة سند الدفع PDF</span>
                    </button>
                  </div>
                ) : searchedPilgrim.status === 'تم القبول' || searchedPilgrim.status === 'مقبول ومؤكد' ? (
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <strong className="block text-slate-900 dark:text-white text-sm">حالة الطلب: تم القبول واعتماد المستندات ✓</strong>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          تم قبول طلبك واستلام المستندات المطلوبة. بانتظار سداد رسوم الحج لإصدار سند القبض الرسمي وتثبيت الحجز النهائي.
                        </span>
                      </div>
                    </div>
                    <div className="bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 px-3.5 py-1.5 rounded-xl font-bold text-[11px] border border-emerald-500/30">
                      مقبول مبدئياً - بانتظار السداد
                    </div>
                  </div>
                ) : searchedPilgrim.status === 'قيد المراجعة' ? (
                  <div className="bg-amber-500/10 border-2 border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <strong className="block text-slate-900 dark:text-white text-sm">حالة السداد: قيد التدقيق المحاسبي والمراجعة</strong>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          {searchedPilgrim.paymentReceipt 
                            ? 'تم إرفاق إيصال التحويل، وهو قيد المراجعة للتحقق من وصول المبلغ للحساب البنكي.'
                            : 'بانتظار إتمام التحويل البنكي وتأكيد استلام المبلغ من قبل الإدارة المالية.'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-amber-500/20 text-amber-900 dark:text-amber-200 px-3.5 py-1.5 rounded-xl font-bold text-[11px] border border-amber-500/30">
                      يصدر السند فور تأكيد الإدارة للسداد 🔒
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-4">
                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                      <CreditCard className="w-6 h-6 text-amber-500" />
                      <strong className="text-sm">لم يتم تأكيد السداد الكامل حتى الآن</strong>
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm">
                      يمكنك رفع إيصالات الدفع (للدفعات الجزئية أو سداد كامل الرسوم) هنا ليقوم المحاسب بتدقيقها وإضافتها لسجلك المالي.
                    </p>
                    <button
                      onClick={() => setShowReceiptModal(true)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow transition flex items-center gap-2"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>رفع إيصال دفع جديد</span>
                    </button>
                  </div>
                )}

                {/* WhatsApp Notification Preferences Feature */}
                <WhatsAppNotificationSection 
                  pilgrim={searchedPilgrim}
                  onUpdatePilgrim={(updated) => setSearchedPilgrim(updated)}
                />

                {/* Feedback Section */}
                <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
                  <div className="text-right">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 justify-end">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>تقديم تقييم وملاحظات حول الرحلة</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">نسعى دائماً لتطوير خدماتنا.. رأيك يهمنا جداً في تحسين الجودة للأعوام القادمة.</p>
                  </div>

                  <FeedbackForm 
                    pilgrimId={searchedPilgrim.nationalId} 
                    pilgrimName={`${searchedPilgrim.firstName} ${searchedPilgrim.lastName}`} 
                  />
                </div>
                {showReceiptModal && (
                  <PaymentReceiptModal
                    pilgrim={{
                      ...searchedPilgrim,
                      pilgrimSequenceNumber: (initialPilgrims && initialPilgrims.findIndex(p => p.nationalId === searchedPilgrim.nationalId) + 1) || undefined,
                      membershipNumber: searchedPilgrim.membershipNumber || `QAEM-1448-${searchedPilgrim.registrationReference || '1001'}`
                    }}
                    campaignSettings={campaignSettings}
                    onClose={() => setShowReceiptModal(false)}
                  />
                )}
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-950 border-2 border-red-500/20 rounded-3xl space-y-4 animate-fadeIn max-w-xl mx-auto">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">تعذر مطابقة البيانات المدخلة</h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    لم يتم العثور على أي حاج يطابق 
                    <strong className="text-red-500 mx-1">رقم البطاقة</strong> مع 
                    <strong className="text-red-500 mx-1">رقم التسجيل</strong> المدخلين معاً.
                  </p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl text-xs text-amber-700 dark:text-amber-300 text-right space-y-1">
                  <span className="font-bold block">🔒 تنبيه الخصوصية والأمان:</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    لحماية خصوصية الحجاج وسرية السكن والحجوزات، لن يتم عرض أي بيانات إلا عند إدخال رقم الهوية الوطنية ورقم التسجيل الصحيحين لنفس الحاج وتطابقهما معاً.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold px-6 py-2.5 rounded-xl transition text-xs inline-flex items-center gap-2 shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة وتعديل الأرقام</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface WhatsAppNotificationSectionProps {
  pilgrim: Pilgrim;
  onUpdatePilgrim?: (updated: Pilgrim) => void;
}

const WhatsAppNotificationSection: React.FC<WhatsAppNotificationSectionProps> = ({ pilgrim, onUpdatePilgrim }) => {
  const [enabled, setEnabled] = useState<boolean>(pilgrim.whatsappNotificationsEnabled ?? true);
  const [mobileNumber, setMobileNumber] = useState<string>(
    pilgrim.whatsappNotificationMobile || pilgrim.whatsapp || pilgrim.mobile || ''
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    pilgrim.whatsappNotificationTopics || [
      'مواعيد المغادرة والرحلات',
      'التفويج ومقاعد الباصات',
      'الإرشاد الديني والمناسك',
      'استلام مفاتيح السكن والغرف'
    ]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const allTopics = [
    { id: 'مواعيد المغادرة والرحلات', label: 'تذكير بمواعيد المغادرة وتجهيز الحقائب (قبل 24 ساعة و 6 ساعات)', icon: '🛫' },
    { id: 'التفويج ومقاعد الباصات', label: 'تحديثات حافلات النقل والتفويج وتأكيد المقاعد', icon: '🚌' },
    { id: 'الإرشاد الديني والمناسك', label: 'تنبيهات الإرشاد الديني ومناسك التروية وعرفة ومزدلفة', icon: '🕋' },
    { id: 'استلام مفاتيح السكن والغرف', label: 'تنبيهات السكن واستلام المفاتيح والوجبات', icon: '🏨' },
  ];

  const handleToggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId) ? prev.filter(t => t !== topicId) : [...prev, topicId]
    );
  };

  const handleSavePreferences = async () => {
    if (enabled && !mobileNumber.trim()) {
      setSaveError('يرجى إدخال رقم جوال صحيح لربط خدمة الواتساب.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const updatedData = {
        whatsappNotificationsEnabled: enabled,
        whatsappNotificationMobile: mobileNumber.trim(),
        whatsappNotificationTopics: selectedTopics
      };

      await updateDocument('pilgrims', pilgrim.nationalId, updatedData);

      if (onUpdatePilgrim) {
        onUpdatePilgrim({
          ...pilgrim,
          ...updatedData
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to update WhatsApp preferences:', err);
      setSaveError('حدث خطأ أثناء حفظ التفضيلات. يرجى المحاولة لاحقاً.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestMessage = () => {
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('05')) {
      formattedPhone = '966' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('5')) {
      formattedPhone = '966' + formattedPhone;
    }

    const text = encodeURIComponent(
      `سلام الله عليك حاجنا الكريم/ة (${pilgrim.firstName} ${pilgrim.lastName}) 🕋✨\n\nتم تفعيل خدمة التذكير المباشر عبر الواتساب لقافلة القائم لحج موسم 1448هـ بنجاح! 📱\n\n- الرقم المرجعي: ${pilgrim.registrationReference}\n- وسيلة النقل: ${pilgrim.transport}\n- حالة الخدمة: نشطة ومفعلة ✅\n\nستصلك كافة الإشعارات الهامة قبل مواعيد الرحلة والتفويج.`
    );

    const waUrl = `https://wa.me/${formattedPhone}?text=${text}`;
    const anchor = document.createElement('a');
    anchor.href = waUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <div className="bg-emerald-950/20 dark:bg-emerald-950/40 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-500/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-black text-slate-900 dark:text-white">إشعارات وتنبيهات الواتساب المباشرة</h4>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-500/20 text-slate-400'
              }`}>
                {enabled ? 'مُفعّل - متصل' : 'غير مُفعّل'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              احصل على تذكيرات فورية ومهمة قبل الرحلات، التفويج، كروت الغرف والمناسك مباشرة على جوالك.
            </p>
          </div>
        </div>

        {/* Master Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
          <span className="mr-3 text-xs font-bold text-slate-700 dark:text-slate-300">
            {enabled ? 'التنبيهات مفعلة' : 'التنبيهات معطلة'}
          </span>
        </label>
      </div>

      {enabled && (
        <div className="space-y-6 animate-fadeIn">
          {/* Mobile Linking Section */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              رقم الواتساب المعتمد لتلقي التنبيهات:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="05XXXXXXXX أو 9665XXXXXXXX"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-left font-mono"
                  dir="ltr"
                />
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <button
                type="button"
                onClick={() => setMobileNumber(pilgrim.whatsapp || pilgrim.mobile || '')}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-4 py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 border border-emerald-500/30"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>ربط الرقم المسجل بملفك تلقائياً</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              الرقم المسجل بالاستمارة: <span className="font-mono font-bold text-emerald-500">{pilgrim.mobile || pilgrim.whatsapp}</span>
            </p>
          </div>

          {/* Topics selection */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">اختر مواضيع التنبيهات والتذكيرات المطلوبة:</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allTopics.map((topic) => {
                const isSelected = selectedTopics.includes(topic.id);
                return (
                  <div
                    key={topic.id}
                    onClick={() => handleToggleTopic(topic.id)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                    />
                    <span className="text-base">{topic.icon}</span>
                    <span className="text-xs font-bold leading-snug">{topic.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save & Test Action Bar */}
          {saveError && (
            <p className="text-xs font-bold text-red-500">{saveError}</p>
          )}

          {saveSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-emerald-500 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم حفظ تفضيلات إشعارات الواتساب بنجاح في نظام القافلة!</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl transition text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ وتفعيل التفضيلات'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendTestMessage}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-400 font-bold px-5 py-3 rounded-xl transition text-xs flex items-center gap-2 border border-emerald-500/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>اختبار التذكير الآن (تجربة إرسال عبر الواتساب)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FeedbackForm: React.FC<{ pilgrimId: string; pilgrimName: string }> = ({ pilgrimId, pilgrimName }) => {
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState<any>('عام');
  const [comment, setComment] = useState('');
  const [submitting, setSearching] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setFeedbackError(null);
    try {
      const { setDocument, recordActivityLog: logFeedbackActivity } = await import('../lib/db');
      
      const id = 'fb-' + Date.now();
      await setDocument('feedback', id, {
        id,
        pilgrimId,
        pilgrimName,
        rating,
        category,
        comment,
        createdAt: new Date().toISOString().split('T')[0]
      });
      await logFeedbackActivity({
        adminId: pilgrimId,
        adminName: pilgrimName || 'حاج مسجل',
        username: pilgrimId,
        userRole: 'حاج مسجل (تقييم)',
        category: 'بوابة الحاج والتسجيل',
        action: `إرسال تقييم وملاحظة (${rating} نجوم — ${category})`,
        target: `الحاج: ${pilgrimName} (${pilgrimId})`,
        details: comment || 'تقييم بدون تعليق نصي',
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Feedback error:", err);
      setFeedbackError('حدث خطأ أثناء إرسال التقييم. يرجى المحاولة لاحقاً.');
    } finally {
      setSearching(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl text-center space-y-3 animate-fadeIn">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">شكراً لك! تم استلام تقييمك بنجاح</h4>
        <p className="text-sm text-slate-500">تقييمك يساعدنا على تقديم خدمة أفضل لضيوف الرحمن في المستقبل.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      {feedbackError && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs p-3 rounded-xl flex items-center justify-between">
          <span>⚠️ {feedbackError}</span>
          <button type="button" onClick={() => setFeedbackError(null)} className="text-red-400 hover:text-white font-bold">×</button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-6 mb-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 block">التصنيف</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-amber-500"
          >
            <option value="عام">تقييم عام</option>
            <option value="التنظيم">التنظيم والتنسيق</option>
            <option value="السكن">السكن والإقامة</option>
            <option value="الإعاشة">الإعاشة والوجبات</option>
            <option value="الإرشاد الديني">الإرشاد الديني</option>
            <option value="المواصلات">المواصلات والنقل</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 block">التقييم العام</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star 
                  className={`w-6 h-6 ${star <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'}`} 
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 block">ملاحظاتك واقتراحاتك</label>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="أخبرنا عن تجربتك.. ما الذي أعجبك؟ وما الذي يمكننا تحسينه؟"
          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto px-10 py-3 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
      >
        {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
      </button>
    </form>
  );
};
