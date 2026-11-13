import React, { useRef, useState, useEffect } from 'react';
import { Pilgrim, CampaignSettings, PaymentRecord } from '../types';
import { 
  Download, Printer, X, CheckCircle2, FileCheck, 
  Share2, Plus, Clock, Landmark, User, Award, Check
} from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import { numberToArabicWords } from '../lib/tafqeet';

interface PaymentReceiptModalProps {
  pilgrim: Pilgrim;
  campaignSettings?: CampaignSettings;
  onClose: () => void;
  onUpdatePilgrim?: (updated: Pilgrim) => void;
  isEditable?: boolean;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  pilgrim,
  campaignSettings = { phone: '0534717773' } as CampaignSettings,
  onClose,
  onUpdatePilgrim,
  isEditable = false
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);

  // Responsive scaling for mobile viewport preview
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 24;
        const docWidth = 820;
        if (availableWidth < docWidth) {
          setScale(Math.max(0.38, availableWidth / docWidth));
        } else {
          setScale(1);
        }
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Today dates
  const todayStr = new Date().toISOString().split('T')[0];
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentTitle, setNewPaymentTitle] = useState('دفعة تأكيد حجز مقعد الحج');
  const [newPaymentMethod, setNewPaymentMethod] = useState('حوالة بنكية');
  const [newPaymentBank, setNewPaymentBank] = useState(pilgrim.bankName || 'بنك الرياض');
  const [newPaymentRef, setNewPaymentRef] = useState(pilgrim.bankReferenceNumber || '');
  const [newPaymentDate, setNewPaymentDate] = useState(todayStr);
  const [formError, setFormError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Official IDs
  const receiptNumber = `VCH-1448-${pilgrim.registrationReference || '1001'}`;
  const membershipNumber = pilgrim.membershipNumber || `QAEM-1448-${pilgrim.registrationReference || '1001'}`;
  const sequenceNumber = pilgrim.pilgrimSequenceNumber 
    ? `#${pilgrim.pilgrimSequenceNumber}` 
    : (pilgrim.registrationReference ? `#${pilgrim.registrationReference}` : '#1');

  // Registration Date Formatting
  const formatArabicDate = (dateInput?: string) => {
    if (!dateInput) return 'غير محدد';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return dateInput;
      return d.toLocaleDateString('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateInput;
    }
  };

  const formatArabicTime = (dateInput?: string) => {
    if (!dateInput) return '';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const registrationDateGregorian = formatArabicDate(pilgrim.createdAt);
  const registrationTime = formatArabicTime(pilgrim.createdAt);

  const formattedDateGregorian = new Date().toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedDateHijri = '1448 هـ - موسم الحج المبارك';

  // Build installments list
  const installments: PaymentRecord[] = pilgrim.paymentInstallments && pilgrim.paymentInstallments.length > 0
    ? pilgrim.paymentInstallments
    : [
        {
          id: 'inst-1',
          title: 'الدفعة الأولى (تأكيد الحجز وتثبيت المقعد بالسكن)',
          amount: pilgrim.transferAmount || (pilgrim.selectedPackage?.includes('VIP') ? '18000' : '16800'),
          date: pilgrim.paymentReceiptDate || (pilgrim.createdAt ? pilgrim.createdAt.split('T')[0] : todayStr),
          paymentMethod: 'حوالة بنكية مصرفية',
          bankName: pilgrim.bankName || 'مصرف الراجحي / البنك المعتمد',
          referenceNumber: pilgrim.bankReferenceNumber || pilgrim.registrationReference,
          confirmedBy: 'الإدارة المالية والمحاسبة'
        }
      ];

  // Calculate totals
  const totalPaid = installments.reduce((acc, curr) => {
    const val = parseFloat(String(curr.amount).replace(/[^0-9.]/g, '')) || 0;
    return acc + val;
  }, 0);

  const estimatedPackagePrice = parseFloat(
    String(pilgrim.totalPackagePrice || (pilgrim.selectedPackage?.includes('VIP') ? '18000' : '16800')).replace(/[^0-9.]/g, '')
  ) || totalPaid;

  const remaining = Math.max(0, estimatedPackagePrice - totalPaid);
  const isFullyPaid = remaining <= 0 || pilgrim.status === 'مكتمل الدفع';
  const tafqeetWords = numberToArabicWords(totalPaid);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const element = receiptRef.current;

      // Capture at high-res with unwarped dimensions
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        skipFonts: true
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const a4WidthMm = 210;
      const a4HeightMm = 297;
      const marginMm = 8;
      const printableWidthMm = a4WidthMm - (marginMm * 2);
      const printableHeightMm = a4HeightMm - (marginMm * 2);

      const img = new window.Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(null);
        img.onerror = (e) => reject(e);
      });

      // EXACT proportional scaling preserving original aspect ratio
      const ratio = Math.min(printableWidthMm / img.width, printableHeightMm / img.height);
      const finalWidth = img.width * ratio;
      const finalHeight = img.height * ratio;

      // Centered on A4 page
      const xOffset = (a4WidthMm - finalWidth) / 2;
      const yOffset = (a4HeightMm - finalHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      pdf.save(`سند_قبض_قافلة_القائم_${pilgrim.firstName}_${pilgrim.lastName}_${receiptNumber}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF with toPng:', err);
      try {
        const element = receiptRef.current;
        if (!element) return;
        const dataUrl = await toJpeg(element, {
          quality: 0.95,
          backgroundColor: '#ffffff',
          pixelRatio: 2.2,
          skipFonts: true
        });
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        const a4WidthMm = 210;
        const a4HeightMm = 297;
        const marginMm = 8;
        const printableWidthMm = a4WidthMm - (marginMm * 2);
        const printableHeightMm = a4HeightMm - (marginMm * 2);

        const img = new window.Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = () => resolve(null);
        });
        const ratio = Math.min(printableWidthMm / img.width, printableHeightMm / img.height);
        const finalWidth = img.width * ratio;
        const finalHeight = img.height * ratio;
        const xOffset = (a4WidthMm - finalWidth) / 2;
        const yOffset = (a4HeightMm - finalHeight) / 2;

        pdf.addImage(dataUrl, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
        pdf.save(`سند_قبض_قافلة_القائم_${pilgrim.firstName}_${pilgrim.lastName}_${receiptNumber}.pdf`);
      } catch (fallbackErr) {
        console.error('Fallback generation also failed:', fallbackErr);
        setPdfError('حدث خطأ أثناء تصدير الـ PDF. يمكنك استخدام زر "طباعة السند" لحفظه كـ PDF بجودة تامة.');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = (pilgrim.whatsapp || pilgrim.mobile || '').replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('05')) {
      formattedPhone = '966' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('5')) {
      formattedPhone = '966' + formattedPhone;
    }

    const message = encodeURIComponent(
      `سلام الله عليك حاجنا الكريم/ة (${pilgrim.firstName} ${pilgrim.lastName}) 🕋✨\n\n` +
      `تم إصدار وتأكيد *سند القبض المالي والمخالصة الرسمية* لموسم حج 1448هـ بنجاح ✅\n\n` +
      `📄 *رقم السند المالي:* ${receiptNumber}\n` +
      `🏷️ *رقم العضوية بالقافلة:* ${membershipNumber}\n` +
      `📅 *تاريخ التسجيل:* ${registrationDateGregorian} ${registrationTime}\n` +
      `👤 *اسم الحاج:* ${pilgrim.firstName} ${pilgrim.lastName}\n` +
      `💳 *رقم الهوية:* ${pilgrim.nationalId}\n` +
      `📦 *الباقة:* ${pilgrim.selectedPackage || 'باقة الحج المميزة'}\n` +
      `💰 *المبلغ المقبوض:* ${totalPaid.toLocaleString()} ريال سعودي\n` +
      `📝 *التفقيط:* ${tafqeetWords}\n` +
      `✨ *حالة السداد:* ${isFullyPaid ? 'مكتمل ومؤكد بالكامل - خالص الذمة' : 'دفعة مسجلة'}\n\n` +
      `يمكنك معاينة وتحميل نسختك الرسمية المعتمدة عبر بوابة استعلام الحجاج برقم الهوية ورقم التسجيل (${pilgrim.registrationReference}).`
    );

    const waUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    const a = document.createElement('a');
    a.href = waUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAddInstallment = () => {
    if (!newPaymentAmount || isNaN(parseFloat(newPaymentAmount))) {
      setFormError('يرجى إدخال مبلغ صحيح للدفعة.');
      return;
    }
    setFormError(null);

    const newRecord: PaymentRecord = {
      id: 'inst-' + Date.now(),
      title: newPaymentTitle.trim() || `دفعة بتاريخ ${newPaymentDate}`,
      amount: newPaymentAmount.trim(),
      date: newPaymentDate,
      paymentMethod: newPaymentMethod,
      bankName: newPaymentBank.trim(),
      referenceNumber: newPaymentRef.trim() || undefined,
      confirmedBy: 'الإدارة المالية'
    };

    const updatedInstallments = [...installments, newRecord];
    const newTotalPaid = updatedInstallments.reduce((acc, curr) => {
      return acc + (parseFloat(String(curr.amount).replace(/[^0-9.]/g, '')) || 0);
    }, 0);

    const isNowFullyPaid = newTotalPaid >= estimatedPackagePrice;

    const updatedPilgrim: Pilgrim = {
      ...pilgrim,
      paymentInstallments: updatedInstallments,
      paidAmount: String(newTotalPaid),
      remainingAmount: String(Math.max(0, estimatedPackagePrice - newTotalPaid)),
      transferAmount: String(newTotalPaid),
      status: isNowFullyPaid ? 'مكتمل الدفع' : pilgrim.status
    };

    if (onUpdatePilgrim) {
      onUpdatePilgrim(updatedPilgrim);
    }

    setNewPaymentAmount('');
    setNewPaymentRef('');
    setShowAddPaymentForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-between overflow-hidden">
      
      {/* 1. SLIM & PROFESSIONAL TOP TOOLBAR */}
      <header className="bg-slate-900 border-b border-amber-500/30 text-white px-3 sm:px-6 py-2.5 sm:py-3 shrink-0 flex items-center justify-between gap-3 shadow-lg z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow">
            <FileCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 text-right">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-amber-400 truncate">سند قبض ومخالصة مالية رسمية</h3>
              <span className="hidden md:inline-block text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                معتمد محاسبياً
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              عضوية: <strong className="text-white font-mono">{membershipNumber}</strong> · سند: <strong className="text-amber-300 font-mono">{receiptNumber}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isEditable && (
            <button
              type="button"
              onClick={() => setShowAddPaymentForm(!showAddPaymentForm)}
              className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 font-bold px-2 sm:px-3 py-1.5 rounded-xl transition text-xs flex items-center gap-1 active:scale-95"
              title="إضافة دفعة مالية جديدة للحاج"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إضافة دفعة</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 sm:px-3.5 py-1.5 rounded-xl transition text-xs flex items-center gap-1 shadow active:scale-95"
            title="مشاركة إشعار السند مع الحاج عبر واتساب"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">واتساب الحاج</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 sm:px-4 py-1.5 rounded-xl transition text-xs flex items-center gap-1 shadow-md active:scale-95 disabled:opacity-50"
            title="تحميل السند كملف PDF عالي الجودة"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'جاري التصدير...' : 'تحميل PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 sm:px-3 py-1.5 rounded-xl transition text-xs flex items-center gap-1 border border-slate-700 active:scale-95"
            title="طباعة السند عبر الطابعة مباشرة"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">طباعة</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="إغلاق السند"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* PDF Generation Error Notice */}
      {pdfError && (
        <div className="bg-red-500/20 border-b border-red-500/40 text-red-200 text-xs px-4 py-2 flex items-center justify-between">
          <span>⚠️ {pdfError}</span>
          <button onClick={() => setPdfError(null)} className="text-red-400 hover:text-white font-bold text-xs">إغلاق</button>
        </div>
      )}

      {/* Add Payment Form (Collapsible) */}
      {showAddPaymentForm && (
        <div className="bg-slate-900 border-b border-amber-500/30 p-3 sm:p-4 space-y-3 shrink-0 text-right animate-fadeIn z-10 shadow-xl text-white">
          {formError && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-200 text-xs px-3 py-1.5 rounded-lg flex items-center justify-between">
              <span>⚠️ {formError}</span>
              <button onClick={() => setFormError(null)} className="text-red-400 hover:text-white font-bold">×</button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-500" />
              <span>إدراج دفعة مالية أو قسط جديد في السند الرسمي</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddPaymentForm(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              إلغاء
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">المبلغ (ريال) *</label>
              <input
                type="text"
                value={newPaymentAmount}
                onChange={(e) => setNewPaymentAmount(e.target.value)}
                placeholder="مثال: 5000"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-mono font-bold text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">بيان الدفعة</label>
              <input
                type="text"
                value={newPaymentTitle}
                onChange={(e) => setNewPaymentTitle(e.target.value)}
                placeholder="مثال: الدفعة الثانية"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">طريقة السداد</label>
              <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
              >
                <option value="حوالة بنكية مصرفية">حوالة بنكية مصرفية</option>
                <option value="بطاقة مدى / شبكة">بطاقة مدى / شبكة</option>
                <option value="إيداع مباشر">إيداع نقدي مباشر</option>
                <option value="نقدي (سند يدوي)">نقدي (سند يدوي)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">تاريخ السداد</label>
              <input
                type="date"
                value={newPaymentDate}
                onChange={(e) => setNewPaymentDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleAddInstallment}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs shadow"
            >
              حفظ وإدراج الدفعة فوراً
            </button>
          </div>
        </div>
      )}

      {/* 2. SCROLLABLE PREVIEW CONTAINER WITH FIXED-PROPORTION SCALED A4 CANVAS */}
      <main 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 flex flex-col items-center bg-slate-950/70"
      >
        <div 
          className="transition-transform duration-150 origin-top flex flex-col items-center my-auto"
          style={{ 
            width: '820px', 
            minWidth: '820px',
            transform: `scale(${scale})`,
            marginBottom: scale < 1 ? `-${Math.round((1 - scale) * 980)}px` : '0px'
          }}
        >
          {/* THE OFFICIAL A4 DOCUMENT PAPER */}
          <div
            ref={receiptRef}
            className="bg-white text-slate-900 rounded-2xl shadow-2xl relative text-right p-6 border-2 border-slate-300 outline outline-1 outline-amber-600/40"
            style={{ 
              width: '820px', 
              minWidth: '820px',
              maxWidth: '820px',
              backgroundColor: '#ffffff', 
              color: '#0f172a',
              fontFamily: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif",
              letterSpacing: '0px'
            }}
          >
            {/* Elegant Outer Border */}
            <div className="border border-amber-600/40 p-1 rounded-xl">
              <div 
                className="border-2 border-slate-900 rounded-lg p-5 space-y-3.5 relative overflow-hidden bg-white"
                style={{ letterSpacing: '0px' }}
              >
                
                {/* Subtle Official Watermark Background */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-[0.025] select-none">
                  <span className="text-[110px] font-black text-slate-900">الـقـائـم</span>
                  <span className="text-base font-bold text-slate-900 -mt-6">1448 هـ - سند مالي رسمي</span>
                </div>

                {/* A. TRIPARTITE OFFICIAL HEADER */}
                <div className="grid grid-cols-3 gap-3 items-center border-b-2 border-slate-900 pb-3">
                  
                  {/* Right: State & Campaign Official Credentials */}
                  <div className="space-y-0.5 text-right">
                    <span className="text-[11px] font-bold text-amber-800 block">المملكة العربية السعودية</span>
                    <span className="text-[9.5px] text-slate-600 block">وزارة الحج والعمرة · ترخيص رقم 1448-QAEM-07</span>
                    <h1 className="text-lg font-black text-slate-950 leading-tight pt-0.5">
                      قافلة القائم للحج والعمرة
                    </h1>
                    <p className="text-[10.5px] font-bold text-amber-700">خدمة حجاج بيت الله الحرام · موسم 1448هـ</p>
                    <p className="text-[9.5px] text-slate-500">
                      هاتف: {campaignSettings?.phone || '0534717773'} · {campaignSettings?.address || 'المملكة العربية السعودية - المنطقة الشرقية (الأحساء-المبرز)'}
                    </p>
                  </div>

                  {/* Center: Official Logo with Gold Emblem Frame */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-18 h-18 bg-white rounded-2xl p-1.5 shadow-md border-2 border-amber-500/60 flex items-center justify-center shrink-0 mb-1">
                      <img
                        src="/assets/aistudio/media_1794134676879_98f1e0ea.png"
                        alt="شعار قافلة القائم"
                        className="w-14 h-14 object-contain"
                      />
                    </div>
                    <h2 className="text-sm font-black text-slate-900">
                      سند قبض ومخالصة مالية رسمية
                    </h2>
                    <span className="text-[8.5px] font-sans font-bold text-slate-500 uppercase">
                      OFFICIAL PAYMENT & SETTLEMENT VOUCHER
                    </span>
                  </div>

                  {/* Left: Financial Voucher Audit Box */}
                  <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-right space-y-1 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <span className="text-[9.5px] text-slate-500 font-bold">رقم السند المالي:</span>
                      <strong className="text-xs font-sans font-black text-amber-700" dir="ltr">{receiptNumber}</strong>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <span className="text-[9.5px] text-slate-500 font-bold">رقم العضوية بالقافلة:</span>
                      <strong className="text-xs font-sans font-black text-slate-900" dir="ltr">{membershipNumber}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[9.5px] text-slate-600">
                      <span>تاريخ إصدار السند:</span>
                      <strong className="text-slate-900">{formattedDateGregorian}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[9.5px] text-slate-600">
                      <span>الموسم المعتمد:</span>
                      <strong className="text-slate-900">{formattedDateHijri}</strong>
                    </div>
                  </div>

                </div>

                {/* B. OFFICIAL AMOUNT & TAFQEET RIBBON */}
                <div className="grid grid-cols-3 gap-3 items-stretch bg-amber-500/10 border-2 border-amber-600/40 rounded-xl p-3">
                  <div className="col-span-2 space-y-1 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="text-xs font-bold text-slate-900">المبلغ المقبوض كتابةً (التفقيط المالي الرسمي):</span>
                    </div>
                    <div className="text-sm font-black text-amber-900 pr-5 leading-relaxed" style={{ letterSpacing: '0px' }}>
                      {tafqeetWords}
                    </div>
                    <div className="text-[10px] text-slate-600 pr-5 flex items-center gap-3 flex-wrap pt-0.5">
                      <span>سعر الباقة الإجمالي: <strong className="font-sans text-slate-900">{estimatedPackagePrice.toLocaleString()} ر.س</strong></span>
                      <span>·</span>
                      <span>إجمالي المدفوع: <strong className="font-sans text-emerald-800">{totalPaid.toLocaleString()} ر.س</strong></span>
                      <span>·</span>
                      <span>المتبقي في الذمة: <strong className="font-sans text-slate-900">{remaining.toLocaleString()} ر.س</strong></span>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-amber-500 rounded-xl p-2.5 text-center flex flex-col justify-center items-center shadow-xs">
                    <span className="text-[9.5px] font-bold text-slate-500 block">المبلغ المقبوض المسدد</span>
                    <div className="text-xl font-black text-amber-700 font-sans my-0.5" dir="ltr">
                      {totalPaid.toLocaleString()} <span className="text-xs font-bold font-sans">ريال سعودي</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9.5px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isFullyPaid ? 'سداد كامل ومخالصة معتمدة' : 'سداد دفعة مقيدة'}</span>
                    </span>
                  </div>
                </div>

                {/* C. DETAILED PILGRIM IDENTITY & MEMBERSHIP DOSSIER */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="bg-slate-900 text-white px-3.5 py-1.5 flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <User className="w-3.5 h-3.5" />
                      <span>سجل بيانات الحاج وتوثيق العضوية والتسجيل الرسمي</span>
                    </span>
                    <span className="font-sans text-[10.5px] text-slate-300">
                      تسلسل السجل: {sequenceNumber}
                    </span>
                  </div>

                  <div className="p-3 grid grid-cols-3 gap-3 text-xs divide-x divide-x-reverse divide-slate-200">
                    
                    {/* Column 1: Pilgrim Full Name & Membership */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">اسم الحاج الرباعي الكامل:</span>
                        <strong className="text-sm font-black text-slate-950 block leading-snug">
                          {pilgrim.firstName} {pilgrim.secondName} {pilgrim.thirdName} {pilgrim.lastName}
                        </strong>
                        <span className="text-[10.5px] text-slate-500 font-sans block" dir="ltr">
                          {pilgrim.englishFullName}
                        </span>
                      </div>

                      <div className="bg-amber-50/80 border border-amber-300 rounded-lg p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-amber-900 font-bold">رقم العضوية بالقافلة:</span>
                          <strong className="text-xs font-sans font-black text-amber-800" dir="ltr">{membershipNumber}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[9.5px]">
                          <span className="text-slate-600">تاريخ ووقت التسجيل:</span>
                          <strong className="text-slate-900 font-medium">
                            {registrationDateGregorian} {registrationTime && `(${registrationTime})`}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Official Identification & Demographics */}
                    <div className="space-y-1.5 pr-3">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[9.5px] text-slate-500 block">رقم الهوية / الإقامة:</span>
                          <strong className="text-xs font-sans text-slate-900 font-bold" dir="ltr">{pilgrim.nationalId}</strong>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-500 block">الرقم المرجعي للاستعلام:</span>
                          <strong className="text-xs font-sans text-amber-700 font-black" dir="ltr">#{pilgrim.registrationReference}</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-700">
                        <div>الجنسية: <strong className="text-slate-900">{pilgrim.nationality}</strong></div>
                        <div>الجنس: <strong className="text-slate-900">{pilgrim.gender}</strong></div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-700">
                        <div>رقم الجوال: <strong className="font-sans text-slate-900" dir="ltr">{pilgrim.mobile}</strong></div>
                        <div>تاريخ الميلاد: <strong className="font-sans text-slate-900" dir="ltr">{pilgrim.birthDate || '—'}</strong></div>
                      </div>
                    </div>

                    {/* Column 3: Trip & Accommodation Package */}
                    <div className="space-y-1.5 pr-3">
                      <div>
                        <span className="text-[9.5px] text-slate-500 block">الباقة المحجوزة:</span>
                        <strong className="text-xs text-amber-800 font-black">
                          {pilgrim.selectedPackage || 'باقة الحج المميزة'}
                        </strong>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-700">
                        <div>وسيلة السفر: <strong className="text-slate-900">{pilgrim.transport}</strong></div>
                        <div>نوع النسك: <strong className="text-slate-900">{pilgrim.hajjType}</strong></div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-700">
                        <div>مرجع التقليد: <strong className="text-slate-900">{pilgrim.currentMarji}</strong></div>
                        <div>رقم الغرفة: <strong className="text-slate-900 font-sans">{pilgrim.roomNumber || 'قيد التوزيع'}</strong></div>
                      </div>

                      {pilgrim.busSeat && (
                        <div className="text-[10.5px] text-slate-700">
                          مقعد الرحلة: <strong className="text-slate-900 font-sans">{pilgrim.busSeat}</strong>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* D. ITEMIZED PAYMENT TRANSACTIONS LEDGER */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>كشف الدفعات والأقساط المالية المحصلة في ذمة الحساب:</span>
                    </h4>
                    <span className="text-[10px] text-slate-500">إجمالي الدفعات: ({installments.length})</span>
                  </div>

                  <div className="border border-slate-300 rounded-xl overflow-hidden text-xs shadow-xs">
                    <table className="w-full text-right">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[10.5px]">
                        <tr>
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2">بيان الدفعة المحصلة</th>
                          <th className="p-2">تاريخ السداد</th>
                          <th className="p-2">طريقة الدفع</th>
                          <th className="p-2">رقم الحوالة / المرجع</th>
                          <th className="p-2 text-left">المبلغ المسدد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800 text-[10.5px]">
                        {installments.map((inst, idx) => (
                          <tr key={inst.id || idx} className="hover:bg-slate-50 transition">
                            <td className="p-2 text-center font-sans font-bold text-amber-800">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-950">{inst.title}</td>
                            <td className="p-2 font-sans">{inst.date}</td>
                            <td className="p-2">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9.5px] font-bold text-slate-700">
                                {inst.paymentMethod || 'حوالة مصرفية'}
                              </span>
                            </td>
                            <td className="p-2 font-sans text-[10px]" dir="ltr">
                              {inst.referenceNumber ? `#${inst.referenceNumber}` : (inst.bankName || 'البنك المعتمد')}
                            </td>
                            <td className="p-2 text-left font-black text-emerald-800 font-sans text-xs">
                              {parseFloat(String(inst.amount).replace(/[^0-9.]/g, '') || '0').toLocaleString()} ر.س
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-900 text-white font-bold text-[10.5px]">
                        <tr>
                          <td colSpan={3} className="p-2 text-slate-300">
                            إجمالي قيمة الباقة: <strong className="font-sans text-white text-xs">{estimatedPackagePrice.toLocaleString()} ر.س</strong>
                          </td>
                          <td colSpan={2} className="p-2 text-slate-300 text-center">
                            المتبقي: <strong className="font-sans text-amber-300 text-xs">{remaining.toLocaleString()} ر.س</strong>
                          </td>
                          <td className="p-2 text-left font-black text-emerald-400 text-xs font-sans">
                            المجموع: {totalPaid.toLocaleString()} ر.س
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* E. BANK REMITTANCE AUDIT TRAIL */}
                <div className="bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-800 font-bold border-b border-slate-200 pb-1">
                    <span className="flex items-center gap-1.5 text-amber-900 text-[11px]">
                      <Landmark className="w-3.5 h-3.5 text-amber-700" />
                      <span>بيانات الحساب البنكي والتحويل المصرفي المعتمد:</span>
                    </span>
                    <span className="text-[9.5px] text-emerald-700 font-bold">قيد السداد في حساب القافلة الرسمي</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10.5px] text-slate-700 pt-0.5">
                    <div>اسم صاحب الحساب: <strong className="text-slate-950">{pilgrim.bankAccountName || `${pilgrim.firstName} ${pilgrim.lastName}`}</strong></div>
                    <div>البنك المحول منه: <strong className="text-slate-950">{pilgrim.bankName || 'البنك المعتمد'}</strong></div>
                    <div>رقم الآيبان: <strong className="text-slate-950 font-sans text-[10px]" dir="ltr">{pilgrim.iban || 'SA8200004546839940'}</strong></div>
                  </div>
                </div>

                {/* F. LEGAL WARRANTY & CERTIFICATION */}
                <div className="text-[9.5px] text-slate-600 leading-relaxed bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/20">
                  <strong className="text-amber-900 block mb-0.5 font-bold">إقرار واعتماد الإدارة المالية لقافلة القائم:</strong>
                  تشهد الإدارة المالية بأن المبالغ المبيّنة في هذا السند قد قُبِضت وأُودِعت رسمياً في الحساب المعتمد للقافلة كرسوم حجز مقعد وسكن لحج موسم 1448هـ، ويُعتبر هذا السند وثيقة محاسبية وإدارية معتمدة وموثقة برقم العضوية والرقم المرجعي الفريد، وتُخلي ذمة الحاج بمقدار المبالغ المسددة أعلاه.
                </div>

                {/* G. OFFICIAL STAMPS, SIGNATURES & QR AUDIT */}
                <div className="pt-2 border-t-2 border-slate-900 grid grid-cols-4 gap-2 items-center text-center">
                  
                  {/* 1. Accountant Signature */}
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] text-slate-500 font-bold block">المحاسب المالي</span>
                    <div className="h-8 flex items-center justify-center font-bold text-[11px] text-slate-800">
                      أحمد الصالح
                    </div>
                    <span className="text-[8.5px] text-slate-400 block border-t border-slate-200 pt-0.5">التدقيق والاعتماد</span>
                  </div>

                  {/* 2. Official Luxury Golden Round Stamp */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-18 h-18 rounded-full border-2 border-dashed border-amber-600 p-0.5 flex items-center justify-center bg-amber-500/5 shadow-inner">
                      <div className="w-full h-full rounded-full border border-amber-600 flex flex-col items-center justify-center text-center p-0.5">
                        <span className="text-[7px] font-black text-amber-900 leading-none">قافلة القائم للحج</span>
                        <div className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[8px] my-0.5 shadow">
                          ✓
                        </div>
                        <span className="text-[7px] font-black text-amber-800 leading-none">مقبوض ومعتمد</span>
                        <span className="text-[6px] font-sans text-slate-600">1448 هـ</span>
                      </div>
                    </div>
                    <span className="text-[8.5px] font-bold text-amber-900 mt-0.5">الختم المالي الرسمي</span>
                  </div>

                  {/* 3. General Supervisor Signature */}
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] text-slate-500 font-bold block">المشرف العام</span>
                    <div className="h-8 flex items-center justify-center font-bold text-[11px] text-amber-800">
                      صالح الياسين
                    </div>
                    <span className="text-[8.5px] text-slate-400 block border-t border-slate-200 pt-0.5">الاعتماد النهائي</span>
                  </div>

                  {/* 4. Verification QR & Security Badge */}
                  <div className="flex flex-col items-center justify-center space-y-0.5">
                    <div className="w-14 h-14 bg-white border border-slate-300 rounded-lg p-1 flex items-center justify-center shadow-xs">
                      <svg viewBox="0 0 29 29" className="w-full h-full text-slate-900">
                        <rect width="29" height="29" fill="#ffffff" />
                        <rect x="2" y="2" width="7" height="7" fill="#0f172a" />
                        <rect x="3" y="3" width="5" height="5" fill="#ffffff" />
                        <rect x="4" y="4" width="3" height="3" fill="#0f172a" />
                        <rect x="20" y="2" width="7" height="7" fill="#0f172a" />
                        <rect x="21" y="3" width="5" height="5" fill="#ffffff" />
                        <rect x="22" y="4" width="3" height="3" fill="#0f172a" />
                        <rect x="2" y="20" width="7" height="7" fill="#0f172a" />
                        <rect x="3" y="21" width="5" height="5" fill="#ffffff" />
                        <rect x="4" y="22" width="3" height="3" fill="#0f172a" />
                        <rect x="11" y="3" width="2" height="2" fill="#0f172a" />
                        <rect x="15" y="3" width="2" height="2" fill="#0f172a" />
                        <rect x="11" y="7" width="2" height="2" fill="#0f172a" />
                        <rect x="13" y="9" width="3" height="3" fill="#0f172a" />
                        <rect x="3" y="11" width="2" height="2" fill="#0f172a" />
                        <rect x="7" y="11" width="2" height="2" fill="#0f172a" />
                        <rect x="11" y="13" width="7" height="3" fill="#0f172a" />
                        <rect x="20" y="11" width="2" height="2" fill="#0f172a" />
                        <rect x="24" y="13" width="2" height="2" fill="#0f172a" />
                        <rect x="11" y="20" width="2" height="2" fill="#0f172a" />
                        <rect x="15" y="22" width="3" height="2" fill="#0f172a" />
                        <rect x="20" y="20" width="7" height="2" fill="#0f172a" />
                        <rect x="22" y="24" width="4" height="3" fill="#0f172a" />
                      </svg>
                    </div>
                    <span className="text-[7.5px] font-sans text-slate-500 font-bold block" dir="ltr">
                      VERIFIED-1448
                    </span>
                  </div>

                </div>

                {/* H. SECURITY AUDIT BARCODE STRIP */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-500 font-sans">
                  <span>DOCUMENT SECURITY CODE: {pilgrim.nationalId.slice(0, 4)}***{pilgrim.nationalId.slice(-3)}</span>
                  <span className="text-amber-800 font-bold">قافلة القائم للحج والعمرة والزيارة · 1448هـ</span>
                  <span dir="ltr">AUDIT: {receiptNumber}</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
};
