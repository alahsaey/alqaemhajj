import React, { useState, useMemo } from 'react';
import {
  Bell,
  Send,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Filter,
  Sparkles,
  Plane,
  Bus,
  Package,
  Eye,
  CheckCheck,
  RefreshCw,
  Plus,
  X,
  Search,
  AlertCircle,
  FileText,
  Shield,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import {
  Pilgrim,
  HajjPackage,
  NotificationItem,
  NotificationPriority,
  NotificationTargetType,
  NotificationDeliveryType,
  AdminUser,
} from '../types';
import {
  resolveTargetPilgrims,
  createAndDispatchNotification,
  triggerBrowserNotification,
} from '../lib/notifications';

interface AdminNotificationCenterProps {
  pilgrims: Pilgrim[];
  packages: HajjPackage[];
  notifications: NotificationItem[];
  currentAdminUser: AdminUser | null;
  onRefreshNotifications?: () => Promise<void> | void;
}

export const AdminNotificationCenter: React.FC<AdminNotificationCenterProps> = ({
  pilgrims,
  packages,
  notifications,
  currentAdminUser,
  onRefreshNotifications,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [targetType, setTargetType] = useState<NotificationTargetType>('all');
  const [targetValue, setTargetValue] = useState('');
  const [deliveryType, setDeliveryType] = useState<NotificationDeliveryType>('instant');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('12:00');

  // UI & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | NotificationPriority>('all');
  const [selectedNotificationForDetails, setSelectedNotificationForDetails] =
    useState<NotificationItem | null>(null);

  // Active pilgrims list
  const activePilgrims = useMemo(
    () =>
      pilgrims.filter(
        (p) =>
          !p.isDeleted &&
          p.status !== 'محذوف' &&
          p.status !== 'معتذر' &&
          p.status !== 'مرفوض'
      ),
    [pilgrims]
  );

  // Available unique buses
  const availableBuses = useMemo(() => {
    const set = new Set<string>();
    activePilgrims.forEach((p) => {
      if (p.busNumber && p.busNumber.trim()) set.add(p.busNumber.trim());
    });
    return Array.from(set).sort();
  }, [activePilgrims]);

  // Available unique flight numbers
  const availableFlights = useMemo(() => {
    const set = new Set<string>();
    activePilgrims.forEach((p) => {
      if (p.flightNumberOutbound) set.add(p.flightNumberOutbound.trim());
      if (p.flightNumberReturn) set.add(p.flightNumberReturn.trim());
    });
    return Array.from(set).sort();
  }, [activePilgrims]);

  // Dynamically calculate matching recipients for the current form selection
  const matchingRecipients = useMemo(() => {
    return resolveTargetPilgrims(targetType, targetValue, activePilgrims);
  }, [targetType, targetValue, activePilgrims]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'يرجى كتابة عنوان الإشعار ومحتواه بشكل كامل.',
      });
      return;
    }

    if (targetType === 'individual' && !targetValue.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'يرجى تحديد الحاج المستهدف أو رقم هويته.',
      });
      return;
    }

    if (deliveryType === 'scheduled' && !scheduledDate) {
      setStatusMessage({
        type: 'error',
        text: 'يرجى تحديد تاريخ ووقت الجدولة بتوقيت مكة المكرمة.',
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const scheduledIso =
        deliveryType === 'scheduled' && scheduledDate
          ? new Date(`${scheduledDate}T${scheduledTime || '12:00'}:00+03:00`).toISOString()
          : undefined;

      const newNotificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const result = await createAndDispatchNotification(
        {
          id: newNotificationId,
          title: title.trim(),
          body: body.trim(),
          priority,
          targetType,
          targetValue: targetValue ? targetValue.trim() : undefined,
          deliveryType,
          scheduledAt: scheduledIso,
          createdBy: {
            adminId: currentAdminUser?.id || 'admin',
            adminName: currentAdminUser?.fullName || 'المدير العام',
            role: currentAdminUser?.role || 'Master Admin',
          },
          createdAt: new Date().toISOString(),
        },
        activePilgrims
      );

      if (result.success) {
        setStatusMessage({
          type: 'success',
          text:
            deliveryType === 'instant'
              ? `تم إرسال الإشعار بنجاح إلى ${result.targetCount} حاج مستهدف.`
              : `تمت جدولة الإشعار بنجاح ليتم إرساله في الموعد المحدد (${result.targetCount} حاج مستهدف).`,
        });

        // Trigger local push preview if allowed
        triggerBrowserNotification(title.trim(), body.trim());

        // Reset Form
        setTitle('');
        setBody('');
        setTargetType('all');
        setTargetValue('');
        setDeliveryType('instant');
        setScheduledDate('');
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'تعذّر إرسال الإشعار.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'حدث خطأ غير متوقع أثناء إرسال الإشعار.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Notifications Log
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      const matchesSearch =
        searchFilter === '' ||
        notif.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        notif.body.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesPriority =
        priorityFilter === 'all' || notif.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [notifications, searchFilter, priorityFilter]);

  // Overall Statistics Summary
  const statsSummary = useMemo(() => {
    const totalSent = notifications.filter((n) => n.status === 'sent').length;
    const totalScheduled = notifications.filter((n) => n.status === 'scheduled').length;
    const totalRecipients = notifications.reduce(
      (sum, n) => sum + (n.stats?.sentCount || 0),
      0
    );
    const totalReads = notifications.reduce(
      (sum, n) => sum + (n.stats?.readCount || 0),
      0
    );
    const readRate = totalRecipients > 0 ? Math.round((totalReads / totalRecipients) * 100) : 0;

    return { totalSent, totalScheduled, totalRecipients, totalReads, readRate };
  }, [notifications]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn text-right" dir="rtl">
      {/* Top Banner — Notifications Executive Control */}
      <section className="bg-gradient-to-l from-[#0B1221] via-[#10192D] to-[#1C160C] border border-amber-500/35 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/20 via-amber-400 to-amber-500/20"
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/35 px-3 py-1 rounded-full text-amber-300 text-xs font-bold shadow-sm">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>نظام البث والإشعارات الموجهة للحجاج</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              إدارة إشعارات القافلة وحجاج موسم 1448هـ
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              إرسال التنبيهات الفورية والمجدولة إلى الحجاج باستهداف دقيق حسب وسيلة السفر، الباقة، الحافلة، أو الجنس، مع تتبع لحظي لنسب القراءة والوصول.
            </p>
          </div>

          {onRefreshNotifications && (
            <button
              type="button"
              onClick={onRefreshNotifications}
              className="px-3.5 py-2 rounded-xl bg-[#131F38] hover:bg-[#1A2A4A] text-amber-400 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث السجل</span>
            </button>
          )}
        </div>

        {/* 4 Quick Stat KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="bg-[#070C18]/80 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي المرسل</span>
            <span className="text-lg sm:text-xl font-mono font-black text-white mt-0.5 block">
              {statsSummary.totalSent}
            </span>
            <span className="text-[10px] text-emerald-400">إشعار مكتمل</span>
          </div>

          <div className="bg-[#070C18]/80 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-slate-400 block">الإشعارات المجدولة</span>
            <span className="text-lg sm:text-xl font-mono font-black text-amber-400 mt-0.5 block">
              {statsSummary.totalScheduled}
            </span>
            <span className="text-[10px] text-amber-300">بانتظار الموعد</span>
          </div>

          <div className="bg-[#070C18]/80 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-slate-400 block">وصول الإشعارات</span>
            <span className="text-lg sm:text-xl font-mono font-black text-blue-400 mt-0.5 block">
              {statsSummary.totalRecipients.toLocaleString('en-US')}
            </span>
            <span className="text-[10px] text-slate-400">صندوق وارد للحاج</span>
          </div>

          <div className="bg-[#070C18]/80 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-slate-400 block">نسبة القراءة والتفاعل</span>
            <span className="text-lg sm:text-xl font-mono font-black text-emerald-400 mt-0.5 block">
              {statsSummary.readRate}%
            </span>
            <span className="text-[10px] text-slate-400">
              ({statsSummary.totalReads} قراءة مؤكدة)
            </span>
          </div>
        </div>
      </section>

      {/* Main Grid: Create Notification Form (Right) & Send History / Details (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Form Column (Col 5) */}
        <div className="lg:col-span-5 bg-[#0B1221] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Plus className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-white">إنشاء إشعار جديد للحجاج</h3>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                عنوان الإشعار <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: موعد التجمع للانطلاق إلى مطار الأحساء"
                className="w-full bg-[#070C18] border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-500"
                maxLength={150}
                required
              />
            </div>

            {/* Content / Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                نص وتفاصيل الإشعار <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="اكتب التوجيهات أو التعليمات بالتفصيل هنا..."
                rows={4}
                className="w-full bg-[#070C18] border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-500 resize-none"
                maxLength={2000}
                required
              />
              <span className="text-[10px] text-slate-400 block text-left font-mono">
                {body.length} / 2000 حرف
              </span>
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                درجة الأهمية والأولوية
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    priority === 'urgent'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-sm'
                      : 'bg-[#070C18] text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>عاجل جداً</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    priority === 'high'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                      : 'bg-[#070C18] text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>هام</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    priority === 'normal'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/60 shadow-sm'
                      : 'bg-[#070C18] text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>عادي</span>
                </button>
              </div>
            </div>

            {/* Target Audience Filter */}
            <div className="space-y-2 p-3 bg-[#070C18] border border-slate-800 rounded-xl">
              <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>الفئة المستهدفة واستلام الإشعار</span>
              </label>

              <select
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value as NotificationTargetType);
                  setTargetValue('');
                }}
                className="w-full bg-[#0B1221] border border-slate-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                <option value="all">كافة الحجاج المسجلين بالقافلة</option>
                <option value="transport">حسب وسيلة السفر (طيران / باص)</option>
                <option value="package">حسب باقة الحج</option>
                <option value="bus">حسب رقم الحافلة</option>
                <option value="flight">حسب رقم رحلة الطيران</option>
                <option value="gender">حسب الجنس (رجال / نساء)</option>
                <option value="individual">حاج محدد بشكل فردي</option>
              </select>

              {/* Dynamic Value Picker Based on Target Type */}
              {targetType === 'transport' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTargetValue('طائرة')}
                    className={`p-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                      targetValue === 'طائرة'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-[#0B1221] text-slate-400 border-slate-800'
                    }`}
                  >
                    <Plane className="w-3.5 h-3.5 text-amber-400" />
                    <span>مسافرو الطيران</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetValue('باص')}
                    className={`p-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                      targetValue === 'باص'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                        : 'bg-[#0B1221] text-slate-400 border-slate-800'
                    }`}
                  >
                    <Bus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>مسافرو الحافلات</span>
                  </button>
                </div>
              )}

              {targetType === 'package' && (
                <select
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full bg-[#0B1221] border border-slate-700 text-xs text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-amber-500"
                >
                  <option value="">اختر الباقة المستهدفة...</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.title}>
                      {pkg.title} ({pkg.type})
                    </option>
                  ))}
                </select>
              )}

              {targetType === 'bus' && (
                <div className="space-y-1">
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full bg-[#0B1221] border border-slate-700 text-xs text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">اختر الحافلة...</option>
                    {availableBuses.map((bus) => (
                      <option key={bus} value={bus}>
                        {bus}
                      </option>
                    ))}
                  </select>
                  {availableBuses.length === 0 && (
                    <span className="text-[10px] text-slate-400">
                      لم يتم تعيين أرقام حافلات بعد في كشف ركاب الباصات.
                    </span>
                  )}
                </div>
              )}

              {targetType === 'flight' && (
                <div className="space-y-1">
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full bg-[#0B1221] border border-slate-700 text-xs text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">اختر رقم الرحلة...</option>
                    {availableFlights.map((fl) => (
                      <option key={fl} value={fl}>
                        رحلة: {fl}
                      </option>
                    ))}
                  </select>
                  {availableFlights.length === 0 && (
                    <span className="text-[10px] text-slate-400">
                      لم يتم تسجيل أرقام رحلات طيران بعد في كشف الطيران.
                    </span>
                  )}
                </div>
              )}

              {targetType === 'gender' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTargetValue('ذكر')}
                    className={`p-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                      targetValue === 'ذكر'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                        : 'bg-[#0B1221] text-slate-400 border-slate-800'
                    }`}
                  >
                    <span>حجاج (رجال)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetValue('أنثى')}
                    className={`p-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                      targetValue === 'أنثى'
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/50'
                        : 'bg-[#0B1221] text-slate-400 border-slate-800'
                    }`}
                  >
                    <span>حاجات (نساء)</span>
                  </button>
                </div>
              )}

              {targetType === 'individual' && (
                <div className="space-y-1 pt-1">
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full bg-[#0B1221] border border-slate-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">اختر الحاج بالاسم والهوية...</option>
                    {activePilgrims.map((p) => (
                      <option key={p.id} value={p.nationalId}>
                        {p.firstName} {p.lastName} — ({p.nationalId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Live Target Summary Pill */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">عدد المستلمين المستهدفين:</span>
                <span className="font-mono font-bold text-amber-400">
                  {matchingRecipients.length} حاج
                </span>
              </div>
            </div>

            {/* Delivery Mode: Instant vs Scheduled */}
            <div className="space-y-2 p-3 bg-[#070C18] border border-slate-800 rounded-xl">
              <label className="text-xs font-bold text-slate-300 block">
                نمط ووقت الإرسال
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('instant')}
                  className={`p-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    deliveryType === 'instant'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                      : 'bg-[#0B1221] text-slate-400 border-slate-800'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>إرسال فوري الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType('scheduled')}
                  className={`p-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    deliveryType === 'scheduled'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                      : 'bg-[#0B1221] text-slate-400 border-slate-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>جدولة لوقت لاحق</span>
                </button>
              </div>

              {deliveryType === 'scheduled' && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeIn">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">التاريخ</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-[#0B1221] border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                      required={deliveryType === 'scheduled'}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">الوقت (مكة المكرمة)</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-[#0B1221] border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                      required={deliveryType === 'scheduled'}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || matchingRecipients.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري المعالجة والبث...</span>
                </>
              ) : deliveryType === 'instant' ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال الإشعار فوراً ({matchingRecipients.length} حاج)</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>حفظ وجدولة الإشعار ({matchingRecipients.length} حاج)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History & Statistics Column (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#0B1221] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="بحث في سجل الإشعارات..."
                className="w-full bg-[#070C18] border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-[11px] text-slate-400">الأولوية:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="bg-[#070C18] border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              >
                <option value="all">كافة الأولويات</option>
                <option value="urgent">عاجل</option>
                <option value="high">هام</option>
                <option value="normal">عادي</option>
              </select>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="bg-[#0B1221] border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">لا توجد إشعارات مسجلة بعد</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  استخدم النموذج المقابل لإنشاء وبث أول إشعار للحجاج أو لجدولته في وقت لاحق.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const readPercent =
                  notif.stats && notif.stats.sentCount > 0
                    ? Math.round((notif.stats.readCount / notif.stats.sentCount) * 100)
                    : 0;

                return (
                  <div
                    key={notif.id}
                    className="bg-[#0B1221] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-3 transition shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {notif.priority === 'urgent' && (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            عاجل جداً
                          </span>
                        )}
                        {notif.priority === 'high' && (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            هام
                          </span>
                        )}
                        {notif.priority === 'normal' && (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            عادي
                          </span>
                        )}

                        <h4 className="text-sm sm:text-base font-bold text-white">
                          {notif.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {notif.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>تم البث</span>
                          </span>
                        ) : notif.status === 'scheduled' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5" />
                            <span>مجدول</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">{notif.status}</span>
                        )}

                        <span className="font-mono">
                          {new Date(notif.sentAt || notif.createdAt).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-[#070C18] p-3 rounded-xl border border-slate-800/80">
                      {notif.body}
                    </p>

                    {/* Meta & Live Statistics Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                      <div className="flex items-center gap-3 text-slate-400 text-[11px] flex-wrap">
                        <span>
                          المستهدف:{' '}
                          <strong className="text-amber-400">
                            {notif.targetType === 'all'
                              ? 'الكل'
                              : `${notif.targetType}: ${notif.targetValue || ''}`}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          بواسطة:{' '}
                          <span className="text-slate-300 font-medium">
                            {notif.createdBy?.adminName || 'المدير'}
                          </span>
                        </span>
                        {notif.scheduledAt && notif.status === 'scheduled' && (
                          <>
                            <span>•</span>
                            <span className="text-amber-300">
                              موعد الإرسال: {new Date(notif.scheduledAt).toLocaleString('ar-SA')}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Delivery & Read Counter */}
                      <div className="flex items-center gap-2">
                        <div className="bg-[#070C18] px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-2 text-[11px]">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-mono font-bold text-white">
                            {notif.stats?.sentCount || notif.stats?.targetCount || 0}
                          </span>
                          <span className="text-slate-400">مستلم</span>
                        </div>

                        <div className="bg-[#070C18] px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-2 text-[11px]">
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-mono font-bold text-emerald-400">
                            {notif.stats?.readCount || 0} ({readPercent}%)
                          </span>
                          <span className="text-slate-400">قراءة</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
