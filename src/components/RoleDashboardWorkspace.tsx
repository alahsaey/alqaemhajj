import React, { useState } from 'react';
import {
  ShieldCheck,
  Briefcase,
  Wallet,
  BookOpen,
  Compass,
  Users,
  CheckCircle2,
  Clock,
  Plane,
  Bus,
  Hotel,
  Receipt,
  Package,
  Megaphone,
  Calendar,
  Gift,
  UserCheck,
  MessageSquare,
  Plus,
  FileText,
  Sparkles,
  Lock,
  ArrowUpLeft,
  Check,
  Search,
} from 'lucide-react';
import {
  AdminUser,
  Announcement,
  CampaignSettings,
  HajjPackage,
  OfficialAdminRole,
  Pilgrim,
} from '../types';
import {
  canPerformOperation,
  getEffectiveDetailedPermissions,
  getRoleDefinition,
  normalizeOfficialRole,
  PERMISSION_MODULES,
  PERMISSION_OPERATIONS,
} from '../utils/rbac';

interface ReligiousInquiryItem {
  id: string;
  pilgrimName: string;
  marji: string;
  category: 'أحكام الإحرام' | 'الطواف والسعي' | 'الوقوف بعرفات ومزدلفة' | 'رمي الجمرات والهدي' | 'مسائل عامة';
  question: string;
  answer: string;
  status: 'تمت الإجابة' | 'قيد المراجعة الشرعية';
  answeredBy?: string;
  date: string;
}

interface CulturalProgramItem {
  id: string;
  title: string;
  type: 'محاضرة توعوية' | 'لقاء تعريفي' | 'برنامج ثقافي' | 'مسابقة معرفية';
  date: string;
  time: string;
  location: string;
  attendeesCount: number;
  status: 'مجدول' | 'منفذ' | 'قيد التنفيذ';
}

interface RoleDashboardWorkspaceProps {
  currentAdminUser: AdminUser;
  activePilgrims: Pilgrim[];
  packages: HajjPackage[];
  announcements: Announcement[];
  adminUsers: AdminUser[];
  campaignSettings: CampaignSettings;
  onNavigateTab: (tab: string) => void;
}

export const RoleDashboardWorkspace: React.FC<RoleDashboardWorkspaceProps> = ({
  currentAdminUser,
  activePilgrims,
  packages,
  announcements,
  adminUsers,
  campaignSettings,
  onNavigateTab,
}) => {
  const officialRole: OfficialAdminRole = normalizeOfficialRole(
    currentAdminUser.role,
    currentAdminUser.username
  );
  const roleInfo = getRoleDefinition(officialRole, currentAdminUser.username);
  const detailedPerms = getEffectiveDetailedPermissions(
    currentAdminUser,
    campaignSettings.rolePermissionTemplates
  );

  // Interactive Religious Inquiries state for الإشراف الديني & الإدارة العامة
  const [inquiries, setInquiries] = useState<ReligiousInquiryItem[]>(() => {
    try {
      const saved = localStorage.getItem('alqaem_religious_inquiries_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'inq-1',
        pilgrimName: 'صالح حجي الياسين',
        marji: 'السيد السيستاني',
        category: 'أحكام الإحرام',
        question: 'ما حكم لبس الحزام الطبي أثناء الإحرام للضرورة الصحية؟',
        answer: 'يجوز لبسه للضرورة مع مراعاة الأحكام الشرعية الخاصة بالمحظورات، وتم إبلاغ المرشد المرافق.',
        status: 'تمت الإجابة',
        answeredBy: 'لجنة الإرشاد الديني',
        date: '1448هـ',
      },
      {
        id: 'inq-2',
        pilgrimName: 'محمد علي الناصر',
        marji: 'الإمام الخامنئي',
        category: 'الطواف والسعي',
        question: 'استفسار حول حكم الاستنابة في طواف النساء لمن يعاني من إجهاد شديد في الركبة.',
        answer: '',
        status: 'قيد المراجعة الشرعية',
        date: '1448هـ',
      },
    ];
  });

  const [newInquiryQuestion, setNewInquiryQuestion] = useState('');
  const [newInquiryPilgrim, setNewInquiryPilgrim] = useState('');
  const [newInquiryCategory, setNewInquiryCategory] =
    useState<ReligiousInquiryItem['category']>('أحكام الإحرام');
  const [newInquiryAnswer, setNewInquiryAnswer] = useState('');
  const [editingInquiryId, setEditingInquiryId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Interactive Cultural Programs state for الإشراف الثقافي & الإدارة العامة
  const [culturalPrograms, setCulturalPrograms] = useState<CulturalProgramItem[]>(() => {
    try {
      const saved = localStorage.getItem('alqaem_cultural_programs_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'prog-1',
        title: 'اللقاء الثقافي والتعريفي الشامل بآداب رحلة الحج',
        type: 'لقاء تعريفي',
        date: '2026-11-15',
        time: '08:00 مساءً',
        location: 'القاعة الكبرى بمقر القافلة',
        attendeesCount: Math.max(12, activePilgrims.length),
        status: 'منفذ',
      },
      {
        id: 'prog-2',
        title: 'ندوة الوعي الصحي والتنظيمي في المشاعر المقدسة',
        type: 'محاضرة توعوية',
        date: '2026-11-22',
        time: '07:30 مساءً',
        location: 'مقر التجمع الرئيسي + بث مباشر',
        attendeesCount: Math.max(8, activePilgrims.length),
        status: 'مجدول',
      },
    ];
  });

  const [newProgTitle, setNewProgTitle] = useState('');
  const [newProgType, setNewProgType] = useState<CulturalProgramItem['type']>('محاضرة توعوية');
  const [newProgLocation, setNewProgLocation] = useState('مقر القافلة');

  const saveInquiries = (updated: ReligiousInquiryItem[]) => {
    setInquiries(updated);
    try {
      localStorage.setItem('alqaem_religious_inquiries_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const saveCulturalPrograms = (updated: CulturalProgramItem[]) => {
    setCulturalPrograms(updated);
    try {
      localStorage.setItem('alqaem_cultural_programs_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Computed metrics
  const confirmedPilgrims = activePilgrims.filter(
    (p) => p.status === 'مقبول ومؤكد' || p.status === 'مكتمل الدفع' || p.status === 'مكتمل' || p.status === 'تم القبول'
  );
  const pendingReviewPilgrims = activePilgrims.filter((p) => p.status === 'قيد المراجعة');
  const housedPilgrims = activePilgrims.filter(
    (p) => (p.roomNumberMakkah && p.roomNumberMakkah.trim()) || (p.roomNumberMadinah && p.roomNumberMadinah.trim())
  );
  const transportAssignedPilgrims = activePilgrims.filter(
    (p) => (p.busNumber && p.busNumber.trim()) || (p.flightTicketNumber && p.flightTicketNumber.trim()) || (p.flightNumberOutbound && p.flightNumberOutbound.trim())
  );
  const paidPilgrims = activePilgrims.filter(
    (p) => p.paymentReceived || p.status === 'مكتمل الدفع' || (p.paidAmount && Number(String(p.paidAmount).replace(/[^\d.]/g, '')) > 0)
  );
  const totalCollectedMoney = activePilgrims.reduce((sum, p) => {
    const val = Number(String(p.paidAmount || p.transferAmount || '0').replace(/[^\d.]/g, ''));
    return sum + (Number.isFinite(val) ? val : 0);
  }, 0);

  const renderRoleIcon = () => {
    switch (roleInfo.iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-6 h-6" />;
      case 'Briefcase':
        return <Briefcase className="w-6 h-6" />;
      case 'Wallet':
        return <Wallet className="w-6 h-6" />;
      case 'BookOpen':
        return <BookOpen className="w-6 h-6" />;
      case 'Compass':
        return <Compass className="w-6 h-6" />;
    }
  };

  // Count enabled operations for the logged-in user
  const enabledModulesCount = PERMISSION_MODULES.filter((m) => detailedPerms[m.id]?.view).length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Role Identity & Permissions Summary Banner */}
      <div
        className={`bg-gradient-to-l ${roleInfo.bgAccent} bg-[#0B1221] border ${roleInfo.borderColor} rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-md ${roleInfo.badgeColor}`}
            >
              {renderRoleIcon()}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-0.5 rounded-full text-xs font-black border ${roleInfo.badgeColor}`}>
                  لوحة تحكم: {officialRole}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  حساب نشط ومفعل
                </span>
                {currentAdminUser.assignedSeason && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                    {currentAdminUser.assignedSeason}
                  </span>
                )}
                {currentAdminUser.assignedCaravan && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {currentAdminUser.assignedCaravan}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-xl font-black text-white">
                مرحباً بك، {currentAdminUser.fullName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                {roleInfo.shortDesc}
              </p>
            </div>
          </div>

          {/* Active Permissions Matrix Pill Summary */}
          <div className="w-full lg:w-auto bg-[#070C18]/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shrink-0">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                نطاق الصلاحيات الممنوحة لحسابك
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-400">
                {enabledModulesCount} / {PERMISSION_MODULES.length} أقسام
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-w-md">
              {PERMISSION_MODULES.map((mod) => {
                const modPerm = detailedPerms[mod.id];
                if (!modPerm?.view) return null;
                const activeOps = PERMISSION_OPERATIONS.filter((op) => modPerm[op.id]).map(
                  (op) => op.shortLabel
                );
                return (
                  <span
                    key={mod.id}
                    className="px-2 py-1 rounded-lg bg-[#10192D] border border-slate-800 text-[10px] text-slate-200 font-bold"
                    title={`العمليات المسموحة: ${activeOps.join('، ')}`}
                  >
                    {mod.title.split(' ')[0]} {mod.title.split(' ')[1]}:{' '}
                    <span className="text-amber-400 font-normal">
                      ({activeOps.length === 8 ? 'كاملة' : activeOps.slice(0, 3).join('، ')})
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Role Specific KPIs & Quick Launchers */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          {/* 1. الإدارة العامة */}
          {officialRole === 'الإدارة العامة' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => onNavigateTab('pilgrims')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-sky-500/40 rounded-2xl p-3.5 text-right transition group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-sky-400">الإشراف المكتبي والحجاج</span>
                  <Briefcase className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
                </div>
                <div className="text-xl font-black text-white font-mono">{activePilgrims.length}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {confirmedPilgrims.length} مؤكد • {housedPilgrims.length} مسكّن
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('paymentsList')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-3.5 text-right transition group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-emerald-400">الإشراف المالي</span>
                  <Wallet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {paidPilgrims.length} <span className="text-xs font-normal text-slate-400">مسدد</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {packages.length} باقات معتمدة
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('announcements')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-3.5 text-right transition group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-indigo-400">الإشراف الثقافي</span>
                  <BookOpen className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {announcements.length + culturalPrograms.length}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {announcements.length} إعلانات • {culturalPrograms.length} برامج
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('religiousGuidance')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-purple-500/40 rounded-2xl p-3.5 text-right transition group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-purple-400">الإشراف الديني</span>
                  <Compass className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
                </div>
                <div className="text-xl font-black text-white font-mono">11 وحدة</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  منظومة التوعية والفتاوى والدروس
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('staff')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-amber-500/30 hover:border-amber-400 rounded-2xl p-3.5 text-right transition group cursor-pointer col-span-2 sm:col-span-1"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-amber-400">المشرفين والصلاحيات</span>
                  <UserCheck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {adminUsers.length} <span className="text-xs font-normal text-slate-400">مشرف</span>
                </div>
                <div className="text-[11px] text-amber-300/90 mt-0.5">
                  إدارة الأدوار الـ 5 والصلاحيات ←
                </div>
              </button>
            </div>
          )}

          {/* 2. الإشراف المكتبي */}
          {officialRole === 'الإشراف المكتبي' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => onNavigateTab('pilgrims')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-sky-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-sky-400">سجل وطلبات الحجاج</span>
                  <Users className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl font-black text-white font-mono">{activePilgrims.length}</div>
                <div className="text-[11px] text-slate-400">
                  {pendingReviewPilgrims.length} طلب قيد المراجعة
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('housingList')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-400">السكن والتسكين</span>
                  <Hotel className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {housedPilgrims.length} / {activePilgrims.length}
                </div>
                <div className="text-[11px] text-slate-400">تحديث غرف مكة والمدينة ومنى</div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('flightsList')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-400">الرحلات وتذاكر الطيران</span>
                  <Plane className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {transportAssignedPilgrims.length}
                </div>
                <div className="text-[11px] text-slate-400">إدخال التذاكر والحافلات والمقاعد</div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('giftDashboard')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-purple-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-purple-400">توزيع الهدايا والكشوف</span>
                  <Gift className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl font-black text-white font-mono">{activePilgrims.length}</div>
                <div className="text-[11px] text-slate-400">توثيق التسليم وإصدار القوائم</div>
              </button>
            </div>
          )}

          {/* 3. الإشراف المالي */}
          {officialRole === 'الإشراف المالي' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => onNavigateTab('paymentsList')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-400">إجمالي الإيرادات المسجلة</span>
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-lg sm:text-xl font-black text-white font-mono">
                  {totalCollectedMoney.toLocaleString('en-US')} ر.س
                </div>
                <div className="text-[11px] text-slate-400">كشف الحسابات والمدفوعات</div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('paymentsList')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-sky-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-sky-400">الحجاج المسددون</span>
                  <Receipt className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {paidPilgrims.length} / {activePilgrims.length}
                </div>
                <div className="text-[11px] text-slate-400">إدارة الفواتير والإيصالات</div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('paymentsList')}
                className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-400">المبالغ المستحقة والمتأخرة</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {Math.max(0, activePilgrims.length - paidPilgrims.length)}
                </div>
                <div className="text-[11px] text-slate-400">متابعة المتأخرات والتسويات</div>
              </button>

              {canPerformOperation(currentAdminUser, 'packages', 'view', campaignSettings.rolePermissionTemplates) && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('packages')}
                  className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-purple-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-400">الباقات والأسعار</span>
                    <Package className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">{packages.length}</div>
                  <div className="text-[11px] text-slate-400">مراجعة أسعار فئات الباقات</div>
                </button>
              )}
            </div>
          )}

          {/* 4. الإشراف الثقافي */}
          {officialRole === 'الإشراف الثقافي' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateTab('announcements')}
                  className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-400">الإعلانات والمحتوى التوعوي</span>
                    <Megaphone className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">{announcements.length}</div>
                  <div className="text-[11px] text-slate-400">نشر المواد التثقيفية والملفات</div>
                </button>

                <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5 text-right">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-400">البرامج والمحاضرات</span>
                    <Calendar className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">{culturalPrograms.length}</div>
                  <div className="text-[11px] text-slate-400">جدول المحاضرات والفعاليات</div>
                </div>

                <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5 text-right">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-400">متابعة حضور الحجاج</span>
                    <Users className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">
                    {culturalPrograms.reduce((acc, c) => acc + c.attendeesCount, 0)}
                  </div>
                  <div className="text-[11px] text-slate-400">إجمالي المشاركات المسجلة</div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateTab('giftDashboard')}
                  className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-purple-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-400">الهدايا والمطبوعات</span>
                    <Gift className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">{activePilgrims.length}</div>
                  <div className="text-[11px] text-slate-400">متابعة الحقائب التثقيفية والهدايا</div>
                </button>
              </div>

              {/* Cultural Programs & Attendance Quick Manager */}
              <div className="bg-[#070C18] border border-indigo-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      جدول البرامج الثقافية والمحاضرات ومتابعة الحضور
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newProgTitle}
                      onChange={(e) => setNewProgTitle(e.target.value)}
                      placeholder="عنوان برنامج ثقافي أو محاضرة جديدة..."
                      className="bg-[#10192D] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 w-56"
                    />
                    <select
                      value={newProgType}
                      onChange={(e) => setNewProgType(e.target.value as any)}
                      className="bg-[#10192D] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-indigo-300 font-bold"
                    >
                      <option value="محاضرة توعوية">محاضرة توعوية</option>
                      <option value="لقاء تعريفي">لقاء تعريفي</option>
                      <option value="برنامج ثقافي">برنامج ثقافي</option>
                      <option value="مسابقة معرفية">مسابقة معرفية</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newProgTitle.trim()) return;
                        const item: CulturalProgramItem = {
                          id: `prog-${Date.now()}`,
                          title: newProgTitle.trim(),
                          type: newProgType,
                          date: new Date().toISOString().split('T')[0],
                          time: '08:00 مساءً',
                          location: newProgLocation,
                          attendeesCount: activePilgrims.length,
                          status: 'مجدول',
                        };
                        saveCulturalPrograms([item, ...culturalPrograms]);
                        setNewProgTitle('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة برنامج</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {culturalPrograms.map((prog) => (
                    <div
                      key={prog.id}
                      className="bg-[#10192D] border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                            {prog.type}
                          </span>
                          <span className="text-xs font-bold text-white">{prog.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          التاريخ: {prog.date} • {prog.time} • الحضور المسجل: {prog.attendeesCount} حاج
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = culturalPrograms.map((c) =>
                            c.id === prog.id
                              ? { ...c, status: (c.status === 'منفذ' ? 'مجدول' : 'منفذ') as CulturalProgramItem['status'] }
                              : c
                          );
                          saveCulturalPrograms(updated);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                          prog.status === 'منفذ'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {prog.status}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. الإشراف الديني */}
          {officialRole === 'الإشراف الديني' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateTab('marjiList')}
                  className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-purple-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-400">كشف مراجع التقليد</span>
                    <Compass className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">{activePilgrims.length}</div>
                  <div className="text-[11px] text-slate-400">توزيع الحجاج حسب المرجع الديني</div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('hajjTimeline')}
                  className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-400">جدول أعمال ومناسك الحج</span>
                    <Calendar className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">
                    {campaignSettings.hajjDaysTimeline?.length || 6} أيام
                  </div>
                  <div className="text-[11px] text-slate-400">إدارة خطوات المناسك والتوجيهات</div>
                </button>

                <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5 text-right">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-400">الاستفسارات الشرعية</span>
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">{inquiries.length}</div>
                  <div className="text-[11px] text-slate-400">
                    {inquiries.filter((i) => i.status === 'تمت الإجابة').length} مجاب عليها
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateTab('announcements')}
                  className="bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-sky-500/40 rounded-2xl p-3.5 text-right transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-sky-400">الدروس والمحاضرات الدينية</span>
                    <BookOpen className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">{announcements.length}</div>
                  <div className="text-[11px] text-slate-400">إدارة المحتوى الإرشادي والدروس</div>
                </button>
              </div>

              {/* Religious Inquiries & Guidance Panel */}
              <div className="bg-[#070C18] border border-purple-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      وحدة استقبال الاستفسارات الشرعية وتصنيفها وإضافة الإجابات
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={newInquiryPilgrim}
                      onChange={(e) => setNewInquiryPilgrim(e.target.value)}
                      placeholder="اسم الحاج المستفسر..."
                      className="bg-[#10192D] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 w-36"
                    />
                    <select
                      value={newInquiryCategory}
                      onChange={(e) => setNewInquiryCategory(e.target.value as any)}
                      className="bg-[#10192D] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-purple-300 font-bold"
                    >
                      <option value="أحكام الإحرام">أحكام الإحرام</option>
                      <option value="الطواف والسعي">الطواف والسعي</option>
                      <option value="الوقوف بعرفات ومزدلفة">الوقوف بعرفات ومزدلفة</option>
                      <option value="رمي الجمرات والهدي">رمي الجمرات والهدي</option>
                      <option value="مسائل عامة">مسائل عامة</option>
                    </select>
                    <input
                      type="text"
                      value={newInquiryQuestion}
                      onChange={(e) => setNewInquiryQuestion(e.target.value)}
                      placeholder="نص الاستفسار الشرعي..."
                      className="bg-[#10192D] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 w-52"
                    />
                    <input
                      type="text"
                      value={newInquiryAnswer}
                      onChange={(e) => setNewInquiryAnswer(e.target.value)}
                      placeholder="الإجابة الشرعية المعتمدة (اختياري)..."
                      className="bg-[#10192D] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 w-52"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newInquiryQuestion.trim()) return;
                        const item: ReligiousInquiryItem = {
                          id: `inq-${Date.now()}`,
                          pilgrimName: newInquiryPilgrim.trim() || 'حاج مسجل بالقافلة',
                          marji: 'عام',
                          category: newInquiryCategory,
                          question: newInquiryQuestion.trim(),
                          answer: newInquiryAnswer.trim(),
                          status: newInquiryAnswer.trim() ? 'تمت الإجابة' : 'قيد المراجعة الشرعية',
                          answeredBy: currentAdminUser.fullName,
                          date: '1448هـ',
                        };
                        saveInquiries([item, ...inquiries]);
                        setNewInquiryQuestion('');
                        setNewInquiryPilgrim('');
                        setNewInquiryAnswer('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>تسجيل الاستفسار</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {inquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="bg-[#10192D] border border-slate-800 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                            {inq.category}
                          </span>
                          <span className="text-xs font-bold text-amber-400">{inq.pilgrimName}</span>
                          <span className="text-[11px] text-slate-400">({inq.marji})</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inq.status === 'تمت الإجابة'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {inq.status}
                        </span>
                      </div>
                      <p className="text-xs text-white font-semibold">س: {inq.question}</p>
                      {inq.answer ? (
                        <p className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2">
                          ج: {inq.answer}
                        </p>
                      ) : editingInquiryId === inq.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="اكتب الجواب والتوجيه الشرعي المعتمد..."
                            className="flex-1 bg-[#070C18] border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!replyText.trim()) return;
                              saveInquiries(
                                inquiries.map((item) =>
                                  item.id === inq.id
                                    ? {
                                        ...item,
                                        answer: replyText.trim(),
                                        status: 'تمت الإجابة',
                                        answeredBy: currentAdminUser.fullName,
                                      }
                                    : item
                                )
                              );
                              setEditingInquiryId(null);
                              setReplyText('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs cursor-pointer"
                          >
                            اعتماد الإجابة
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInquiryId(inq.id);
                            setReplyText('');
                          }}
                          className="text-[11px] font-bold text-purple-400 hover:text-purple-300 underline cursor-pointer"
                        >
                          + إضافة إجابة وتوجيه شرعي
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
