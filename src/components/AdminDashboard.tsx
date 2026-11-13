import React, { useState, useEffect } from 'react';
import { Pilgrim, HajjPackage, Announcement, AdminUser, CampaignSettings, ActivityLog, PilgrimFeedback, HajjTimelineDay, NotificationItem } from '../types';
import { defaultCampaignSettings } from '../data/initialData';
import { Shield, Lock, Search, Download, Trash2, Edit3, CheckCircle2, UserPlus, Users, Bus, Plane, Hotel, Building2, FileSpreadsheet, LogOut, Plus, BookOpen, Package, UserCheck, Key, Settings, Phone, BarChart3, ShieldCheck, Eye, EyeOff, Star, Receipt, UploadCloud, FileCheck, Sparkles, Loader2, AlertCircle, RotateCw, Clock, CreditCard, FileText, CheckCircle, XCircle, Image as ImageIcon, Video, Type, Bold, AlignRight, AlignCenter, Share2, HeartPulse, ChevronDown, Megaphone, Compass, CornerDownLeft, Bell, Gift } from 'lucide-react';
import { FONT_SIZE_OPTIONS, getAnnouncementTypographyClasses, getEmbeddedVideoInfo, compressAnnouncementImage, uploadMediaAsReference, extractMediaId } from '../utils/announcementMedia';
import { AnnouncementImageView, AnnouncementVideoView } from './AnnouncementMediaView';
import { shareAnnouncementItem, sharePackageItem } from '../utils/shareItem';
import { ConfirmModal } from './ConfirmModal';
import { AdminAnalyticsDashboard } from './AdminAnalyticsDashboard';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { YouTubeAdminControl } from './YouTubeAdminControl';
import { AdminNotificationCenter } from './AdminNotificationCenter';
import { GiftDistributionManager } from './gifts/GiftDistributionManager';
import { ReligiousGuidanceManager, RELIGIOUS_11_UNITS } from './religious/ReligiousGuidanceManager';
import { ReligiousUnitKey } from '../types/religiousGuidance';
import { RoleDashboardWorkspace } from './RoleDashboardWorkspace';
import { StaffManagementView } from './StaffManagementView';
import { ExcelReportCustomizerModal } from './ExcelReportCustomizerModal';
import {
  exportAlQaemExcelReport,
  openAlQaemExcelCustomizer,
  getLastExportedAlQaemReport,
} from '../utils/alqaemExcelEngine';
import {
  isGeneralAdminUser,
  canPerformOperation,
  normalizeOfficialRole,
  DEFAULT_ROLE_PERMISSIONS,
  migrateAdminUserRecord,
} from '../utils/rbac';
import { auditReceiptWithAI, ReceiptAuditResult } from '../lib/receiptAudit';
import { subscribeToCollection, recordActivityLog, getCachedActivityLogs, getDocuments, getSeasonPilgrims } from '../lib/db';
import {
  calculatePilgrimStatsBreakdown,
  getEffectivePilgrimStatsConfig,
  formatPilgrimsCountWithPlus,
  isPilgrimInSeason,
} from '../utils/pilgrimStats';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip
} from 'recharts';

interface AdminDashboardProps {
  pilgrims: Pilgrim[];
  packages: HajjPackage[];
  announcements: Announcement[];
  notifications?: NotificationItem[];
  adminUsers: AdminUser[];
  feedback: PilgrimFeedback[];
  currentAdminUser: AdminUser | null;
  campaignSettings: CampaignSettings;
  onUpdatePilgrim: (pilgrim: Pilgrim) => void;
  onDeletePilgrim: (id: string) => void;
  onAddPackage: (pkg: HajjPackage) => void;
  onUpdatePackage: (pkg: HajjPackage) => void;
  onDeletePackage: (id: string) => void;
  onAddAnnouncement: (ann: Announcement) => void;
  onUpdateAnnouncement: (ann: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onAddAdminUser: (user: AdminUser) => void;
  onUpdateAdminUser: (user: AdminUser) => void;
  onDeleteAdminUser: (id: string) => void;
  onUpdateCampaignSettings: (settings: CampaignSettings) => void;
  adminLoggedIn: boolean;
  setAdminLoggedIn: (val: boolean) => void;
  setCurrentAdminUser: (user: AdminUser | null) => void;
  externalActiveTab?: string;
  onActiveTabChange?: (tab: string) => void;
  onRefreshData?: () => Promise<void> | void;
}

const hashPIN = async (pin: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

interface HousingTableRowProps {
  pilgrim: Pilgrim;
  index: number;
  onUpdate: (updated: Pilgrim) => void;
}

const HousingTableRow: React.FC<HousingTableRowProps> = ({
  pilgrim,
  index,
  onUpdate,
}) => {
  const [madinahRoom, setMadinahRoom] = useState(pilgrim.roomNumberMadinah || '');
  const [makkahRoom, setMakkahRoom] = useState(pilgrim.roomNumberMakkah || pilgrim.roomNumber || '');
  const [minaRoom, setMinaRoom] = useState(pilgrim.roomNumberMina || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setMadinahRoom(pilgrim.roomNumberMadinah || '');
    setMakkahRoom(pilgrim.roomNumberMakkah || pilgrim.roomNumber || '');
    setMinaRoom(pilgrim.roomNumberMina || '');
  }, [pilgrim.roomNumberMadinah, pilgrim.roomNumberMakkah, pilgrim.roomNumber, pilgrim.roomNumberMina]);

  const isChanged =
    madinahRoom.trim() !== (pilgrim.roomNumberMadinah || '').trim() ||
    makkahRoom.trim() !== (pilgrim.roomNumberMakkah || pilgrim.roomNumber || '').trim() ||
    minaRoom.trim() !== (pilgrim.roomNumberMina || '').trim();

  const handleSave = () => {
    const cleanMadinah = madinahRoom.trim();
    const cleanMakkah = makkahRoom.trim();
    const cleanMina = minaRoom.trim();
    onUpdate({
      ...pilgrim,
      roomNumberMadinah: cleanMadinah,
      roomNumberMakkah: cleanMakkah,
      roomNumberMina: cleanMina,
      roomNumber: cleanMakkah || pilgrim.roomNumber,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const cleanPhone = (pilgrim.mobile || '').replace(/[^\d+]/g, '');
  const waLink = cleanPhone.startsWith('05')
    ? `https://wa.me/966${cleanPhone.slice(1)}`
    : cleanPhone.startsWith('+')
    ? `https://wa.me/${cleanPhone.slice(1)}`
    : `https://wa.me/${cleanPhone}`;

  return (
    <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition">
      <td className="px-4 py-4 text-center font-mono font-black text-blue-500 text-xs bg-blue-500/5">
        {index + 1}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="font-bold text-slate-900 dark:text-white text-sm">
          {pilgrim.firstName} {pilgrim.secondName} {pilgrim.thirdName} {pilgrim.lastName}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
            {pilgrim.nationalId}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
            {pilgrim.selectedPackage || 'التسجيل العام'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 font-mono text-xs whitespace-nowrap" dir="ltr">
        <div className="flex items-center gap-2">
          <a
            href={`tel:${pilgrim.mobile}`}
            className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 hover:text-blue-500 font-bold transition"
            title="اتصال هاتفياً"
          >
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{pilgrim.mobile}</span>
          </a>
          {cleanPhone && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition"
              title="مراسلة واتساب"
            >
              <Phone className="w-3 h-3" />
            </a>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="relative min-w-[170px]">
          <input
            type="text"
            value={madinahRoom}
            onChange={(e) => setMadinahRoom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder="مثال: غرفة 102 - فندق أنوار المدينة"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition placeholder:font-normal placeholder:text-slate-400"
          />
          {madinahRoom && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500" title="تم تحديد غرفة المدينة" />
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="relative min-w-[170px]">
          <input
            type="text"
            value={makkahRoom}
            onChange={(e) => setMakkahRoom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder="مثال: غرفة 304 - برج مكة"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-amber-300 dark:border-amber-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition placeholder:font-normal placeholder:text-slate-400"
          />
          {makkahRoom && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500" title="تم تحديد غرفة مكة" />
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="relative min-w-[170px]">
          <input
            type="text"
            value={minaRoom}
            onChange={(e) => setMinaRoom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder="مثال: مخيم 4 - صالة أ - مقعد 12"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-purple-300 dark:border-purple-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition placeholder:font-normal placeholder:text-slate-400"
          />
          {minaRoom && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-500" title="تم تحديد تسكين منى" />
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          {savedSuccess ? (
            <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow animate-fadeIn">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>تم الحفظ ✓</span>
            </span>
          ) : (
            <button
              onClick={handleSave}
              disabled={!isChanged}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                isChanged
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              title="حفظ رقم الغرفة بالمدينة ومكة"
            >
              <span>حفظ السكن</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

interface FlightTableRowProps {
  pilgrim: Pilgrim;
  index: number;
  onUpdate: (updated: Pilgrim) => void;
  onOpenEditModal: (pilgrim: Pilgrim) => void;
}

const FlightTableRow: React.FC<FlightTableRowProps> = ({
  pilgrim,
  index,
  onUpdate,
  onOpenEditModal,
}) => {
  const [outbound, setOutbound] = useState(pilgrim.flightNumberOutbound || '');
  const [returnFlight, setReturnFlight] = useState(pilgrim.flightNumberReturn || '');
  const [ticketNo, setTicketNo] = useState(pilgrim.flightTicketNumber || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setOutbound(pilgrim.flightNumberOutbound || '');
    setReturnFlight(pilgrim.flightNumberReturn || '');
    setTicketNo(pilgrim.flightTicketNumber || '');
  }, [pilgrim.flightNumberOutbound, pilgrim.flightNumberReturn, pilgrim.flightTicketNumber]);

  const isChanged =
    outbound.trim() !== (pilgrim.flightNumberOutbound || '').trim() ||
    returnFlight.trim() !== (pilgrim.flightNumberReturn || '').trim() ||
    ticketNo.trim() !== (pilgrim.flightTicketNumber || '').trim();

  const handleSave = () => {
    const cleanOutbound = outbound.trim();
    const cleanReturn = returnFlight.trim();
    const cleanTicket = ticketNo.trim();
    onUpdate({
      ...pilgrim,
      transport: (cleanOutbound || cleanReturn || cleanTicket) ? 'طائرة' : pilgrim.transport,
      flightNumberOutbound: cleanOutbound,
      flightNumberReturn: cleanReturn,
      flightTicketNumber: cleanTicket,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const cleanPhone = (pilgrim.mobile || '').replace(/[^\d+]/g, '');
  const waLink = cleanPhone.startsWith('05')
    ? `https://wa.me/966${cleanPhone.slice(1)}`
    : cleanPhone.startsWith('+')
    ? `https://wa.me/${cleanPhone.slice(1)}`
    : `https://wa.me/${cleanPhone}`;

  return (
    <tr className="hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition">
      <td className="px-4 py-4 text-center font-mono font-black text-sky-500 text-xs bg-sky-500/5">
        {index + 1}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="font-bold text-slate-900 dark:text-white text-sm">
          {pilgrim.firstName} {pilgrim.secondName} {pilgrim.thirdName} {pilgrim.lastName}
        </div>
        {pilgrim.englishFullName && (
          <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-bold mt-0.5" dir="ltr">
            {pilgrim.englishFullName}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
            {pilgrim.nationalId}
          </span>
          {pilgrim.birthDate && (
            <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
              • ميلاد: {pilgrim.birthDate}
            </span>
          )}
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
            {pilgrim.selectedPackage || 'التسجيل العام'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 font-mono text-xs whitespace-nowrap" dir="ltr">
        <div className="flex items-center gap-2">
          <a
            href={`tel:${pilgrim.mobile}`}
            className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 hover:text-sky-500 font-bold transition"
            title="اتصال هاتفياً"
          >
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{pilgrim.mobile}</span>
          </a>
          {cleanPhone && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition"
              title="مراسلة واتساب"
            >
              <Phone className="w-3 h-3" />
            </a>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="relative min-w-[175px]">
          <input
            type="text"
            value={outbound}
            onChange={(e) => setOutbound(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder="مثال: SV 1422 - الدمام 08:30 ص"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-sky-300 dark:border-sky-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition placeholder:font-normal placeholder:text-slate-400"
          />
          {outbound && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-sky-500" title="تم تحديد رحلة الذهاب" />
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="relative min-w-[175px]">
          <input
            type="text"
            value={returnFlight}
            onChange={(e) => setReturnFlight(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder="مثال: SV 1435 - جدة 09:15 م"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition placeholder:font-normal placeholder:text-slate-400"
          />
          {returnFlight && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500" title="تم تحديد رحلة العودة" />
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="relative min-w-[155px]">
          <input
            type="text"
            value={ticketNo}
            onChange={(e) => setTicketNo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder="مثال: PNR: 8XK92M"
            dir="ltr"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-amber-300 dark:border-amber-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition placeholder:font-normal placeholder:text-slate-400"
          />
          {ticketNo && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500" title="تم تحديد رقم التذكرة / الحجز" />
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          {savedSuccess ? (
            <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow animate-fadeIn">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>تم الحفظ ✓</span>
            </span>
          ) : (
            <button
              onClick={handleSave}
              disabled={!isChanged}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                isChanged
                  ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              title="حفظ بيانات رحلة الطيران"
            >
              <span>حفظ الرحلة</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenEditModal(pilgrim)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition"
            title="تعديل ملف الحاج الكامل"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};


const isPilgrimPaymentConfirmed = (pilgrim: Pilgrim): boolean => {
  return (
    pilgrim.status === 'مكتمل الدفع' ||
    pilgrim.status === 'مكتمل' ||
    pilgrim.status === 'مقبول ومؤكد' ||
    pilgrim.paymentReceived === true
  );
};

const getPilgrimPaidAmount = (pilgrim: Pilgrim, packages: HajjPackage[]): number => {
  if (!isPilgrimPaymentConfirmed(pilgrim)) {
    return 0;
  }
  if (pilgrim.paidAmount) {
    const parsedPaid = parseFloat(String(pilgrim.paidAmount).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsedPaid) && parsedPaid > 0) return parsedPaid;
  }
  if (pilgrim.paymentInstallments && pilgrim.paymentInstallments.length > 0) {
    const sumInst = pilgrim.paymentInstallments.reduce((acc, inst) => {
      const val = parseFloat(String(inst.amount).replace(/[^0-9.]/g, '')) || 0;
      return acc + val;
    }, 0);
    if (sumInst > 0) return sumInst;
  }
  if (pilgrim.transferAmount) {
    const parsedTransfer = parseFloat(String(pilgrim.transferAmount).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsedTransfer) && parsedTransfer > 0) return parsedTransfer;
  }
  if (pilgrim.totalPackagePrice) {
    const parsedPkgTotal = parseFloat(String(pilgrim.totalPackagePrice).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsedPkgTotal) && parsedPkgTotal > 0) return parsedPkgTotal;
  }
  const matchedPkg = packages.find(pkg => pkg.title === pilgrim.selectedPackage);
  if (matchedPkg?.price) {
    const parsedMatched = parseFloat(String(matchedPkg.price).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsedMatched) && parsedMatched > 0) return parsedMatched;
  }
  return 0;
};

interface FinancialStatementRowProps {
  pilgrim: Pilgrim;
  index: number;
  packages: HajjPackage[];
  onUpdate: (updated: Pilgrim) => void;
  onOpenReceipt: (pilgrim: Pilgrim) => void;
}

const FinancialStatementRow: React.FC<FinancialStatementRowProps> = ({
  pilgrim,
  index,
  packages,
  onUpdate,
  onOpenReceipt,
}) => {
  const computedPaid = getPilgrimPaidAmount(pilgrim, packages);
  const isConfirmed = isPilgrimPaymentConfirmed(pilgrim);
  const [paidInput, setPaidInput] = useState<string>(computedPaid > 0 ? String(computedPaid) : '');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    const nextVal = getPilgrimPaidAmount(pilgrim, packages);
    setPaidInput(nextVal > 0 ? String(nextVal) : '');
  }, [
    pilgrim.paidAmount,
    pilgrim.transferAmount,
    pilgrim.status,
    pilgrim.paymentReceived,
    pilgrim.selectedPackage,
    pilgrim.totalPackagePrice,
    packages,
  ]);

  const parsedInputAmount = parseFloat(String(paidInput).replace(/[^0-9.]/g, '')) || 0;
  const isAmountChanged = parsedInputAmount !== computedPaid;

  const handleSavePaidAmount = () => {
    const formattedAmount = parsedInputAmount > 0 ? `${parsedInputAmount.toLocaleString('en-US')} ريال` : '';
    onUpdate({
      ...pilgrim,
      paidAmount: formattedAmount,
      transferAmount: parsedInputAmount > 0 ? String(parsedInputAmount) : pilgrim.transferAmount,
      paymentReceived: parsedInputAmount > 0 ? true : pilgrim.paymentReceived,
      status:
        parsedInputAmount > 0 && pilgrim.status === 'قيد المراجعة'
          ? 'مكتمل الدفع'
          : pilgrim.status,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleToggleConfirm = () => {
    const nextConfirmed = !isConfirmed;
    const defaultAmount =
      computedPaid > 0
        ? computedPaid
        : (() => {
            const matchedPkg = packages.find(pkg => pkg.title === pilgrim.selectedPackage);
            if (matchedPkg?.price) {
              const p = parseFloat(String(matchedPkg.price).replace(/[^0-9.]/g, ''));
              if (!isNaN(p) && p > 0) return p;
            }
            return pilgrim.selectedPackage?.includes('طيران') || pilgrim.selectedPackage?.includes('VIP')
              ? 28500
              : 16800;
          })();

    onUpdate({
      ...pilgrim,
      paymentReceived: nextConfirmed,
      status: nextConfirmed ? 'مكتمل الدفع' : 'قيد المراجعة',
      paidAmount: nextConfirmed ? `${defaultAmount.toLocaleString('en-US')} ريال` : pilgrim.paidAmount,
    });
  };

  return (
    <tr className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition">
      <td className="px-4 py-4 text-center font-mono font-black text-emerald-500 text-xs bg-emerald-500/5">
        {index + 1}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="font-bold text-slate-900 dark:text-white text-sm">
          {pilgrim.firstName} {pilgrim.secondName} {pilgrim.thirdName} {pilgrim.lastName}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
            الهوية: {pilgrim.nationalId}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
            {pilgrim.selectedPackage || 'التسجيل العام'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          type="button"
          onClick={handleToggleConfirm}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition inline-flex items-center gap-1.5 border ${
            isConfirmed
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
          }`}
          title="اضغط لتأكيد أو إلغاء تأكيد الدفع"
        >
          {isConfirmed ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>مؤكد الدفع ({pilgrim.status})</span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5" />
              <span>غير مؤكد ({pilgrim.status})</span>
            </>
          )}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="relative w-36">
            <input
              type="text"
              value={paidInput}
              onChange={(e) => setPaidInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSavePaidAmount();
              }}
              placeholder="أدخل المبلغ..."
              dir="ltr"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono font-black focus:outline-none focus:border-emerald-500"
            />
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-black text-xs">
            {computedPaid.toLocaleString('en-US')} ر.س
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center justify-center gap-2">
          {savedNotice ? (
            <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow animate-fadeIn">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>تم الحفظ ✓</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSavePaidAmount}
              disabled={!isAmountChanged}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                isAmountChanged
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span>حفظ المبلغ</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenReceipt(pilgrim)}
            className="px-2.5 py-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-slate-950 rounded-xl transition text-xs font-bold flex items-center gap-1"
            title="عرض وطباعة سند القبض المالي"
          >
            <img
              src="/assets/aistudio/Saudi_Riyal_Symbol-1_96cf3a0c.png"
              alt="ريال سعودي"
              className="w-3.5 h-3.5 object-contain opacity-90 filter brightness-0 saturate-100 invert-[.4] sepia-[.8] hue-rotate-[10deg]"
            />
            <span className="hidden lg:inline">سند قبض</span>
          </button>
        </div>
      </td>
    </tr>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  pilgrims,
  packages,
  announcements,
  notifications = [],
  adminUsers,
  feedback,
  currentAdminUser,
  campaignSettings,
  onUpdatePilgrim,
  onDeletePilgrim,
  onAddPackage,
  onUpdatePackage,
  onDeletePackage,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onAddAdminUser,
  onUpdateAdminUser,
  onDeleteAdminUser,
  onUpdateCampaignSettings,
  adminLoggedIn,
  setAdminLoggedIn,
  setCurrentAdminUser,
  externalActiveTab,
  onActiveTabChange,
  onRefreshData
}) => {
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const handleManualSync = async () => {
    if (!onRefreshData || isSyncingData) return;
    setIsSyncingData(true);
    try {
      await onRefreshData();
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error during manual sync:', err);
    } finally {
      setIsSyncingData(false);
    }
  };

  useEffect(() => {
    if (adminLoggedIn && pilgrims.length === 0 && onRefreshData) {
      handleManualSync();
    }
  }, [adminLoggedIn, pilgrims.length, onRefreshData]);

  const [usernameInput, setUsernameInput] = useState('');
  const [loginDomain, setLoginDomain] = useState<string>('');
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [showStaffPin, setShowStaffPin] = useState(false);
  const [showOwnPin, setShowOwnPin] = useState(false);

  const STAFF_DOMAIN_OPTIONS = [
    { value: '@alqaemhajj.com', label: '@alqaemhajj.com (نطاق القافلة الرسمي)' },
    { value: '@gmail.com', label: '@gmail.com (نطاق Google المعتمد)' },
    { value: '@alqaem.org', label: '@alqaem.org (نطاق القافلة البديل)' },
    { value: '', label: 'بدون نطاق (اسم مستخدم مباشر)' },
  ];
  const ALLOWED_GOOGLE_DOMAINS = ['alqaemhajj.com', 'alqaem.org', 'gmail.com'];

  const splitUsernameAndDomain = (rawUsername?: string): { localPart: string; domain: string } => {
    const clean = (rawUsername || '').trim().toLowerCase();
    if (!clean.includes('@')) {
      return { localPart: clean, domain: '' };
    }
    const [localPart, domPart] = clean.split('@');
    const fullDom = `@${domPart || 'alqaemhajj.com'}`;
    return { localPart: localPart || '', domain: fullDom };
  };

  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'pilgrims'
    | 'busBoarding'
    | 'flightsList'
    | 'housingList'
    | 'healthList'
    | 'excluded'
    | 'religiousGuidance'
    | 'marjiList'
    | 'hajjTimeline'
    | 'announcements'
    | 'notifications'
    | 'packages'
    | 'paymentsList'
    | 'giftDashboard'
    | 'giftRegistry'
    | 'giftFollowUp'
    | 'giftReports'
    | 'staff'
    | 'settings'
    | 'activityLog'
    | 'feedback'
  >((externalActiveTab as any) || 'dashboard');
  const [selectedReligiousUnit, setSelectedReligiousUnit] = useState<ReligiousUnitKey>('dashboard');
  const [expandedMainMenu, setExpandedMainMenu] = useState<
    'pilgrimsGroup' | 'religiousGroup' | 'financeGroup' | 'giftsGroup' | 'settingsGroup' | null
  >(null);

  useEffect(() => {
    if (externalActiveTab && externalActiveTab !== activeTab) {
      setActiveTab(externalActiveTab as any);
    }
  }, [externalActiveTab]);

  useEffect(() => {
    if (onActiveTabChange) {
      onActiveTabChange(activeTab);
    }
    if (
      activeTab === 'pilgrims' ||
      activeTab === 'busBoarding' ||
      activeTab === 'flightsList' ||
      activeTab === 'housingList' ||
      activeTab === 'healthList' ||
      activeTab === 'excluded'
    ) {
      setExpandedMainMenu('pilgrimsGroup');
    } else if (
      activeTab === 'religiousGuidance' ||
      activeTab === 'marjiList' ||
      activeTab === 'hajjTimeline'
    ) {
      setExpandedMainMenu('religiousGroup');
    } else if (activeTab === 'paymentsList' || activeTab === 'packages') {
      setExpandedMainMenu('financeGroup');
    } else if (
      activeTab === 'giftDashboard' ||
      activeTab === 'giftRegistry' ||
      activeTab === 'giftFollowUp' ||
      activeTab === 'giftReports'
    ) {
      setExpandedMainMenu('giftsGroup');
    } else if (activeTab === 'settings' || activeTab === 'staff' || activeTab === 'activityLog') {
      setExpandedMainMenu('settingsGroup');
    } else {
      setExpandedMainMenu(null);
    }
  }, [activeTab]);

  const [timelineDays, setTimelineDays] = useState<HajjTimelineDay[]>(
    campaignSettings.hajjDaysTimeline || defaultCampaignSettings.hajjDaysTimeline || []
  );
  const [timelineSavedNotice, setTimelineSavedNotice] = useState(false);

  useEffect(() => {
    if (campaignSettings.hajjDaysTimeline) {
      setTimelineDays(campaignSettings.hajjDaysTimeline);
    }
  }, [campaignSettings.hajjDaysTimeline]);

  // Search & Filter for Pilgrims
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [seasonFilter, setSeasonFilter] = useState<'all' | '1448' | 'previous'>('all');
  const [marjiFilter, setMarjiFilter] = useState('all');
  const [busFilter, setBusFilter] = useState('all');
  const [flightFilter, setFlightFilter] = useState<'flight_pilgrims' | 'assigned' | 'unassigned'>('flight_pilgrims');
  const [housingFilter, setHousingFilter] = useState<'all' | 'both_assigned' | 'makkah_unassigned' | 'madinah_unassigned' | 'mina_unassigned' | 'unassigned'>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'with_conditions' | 'mobility_aid' | 'chronic_disease' | 'speech_difficulty' | 'healthy'>('with_conditions');
  const [financeFilter, setFinanceFilter] = useState<'confirmed' | 'all'>('confirmed');
  const [housingQuickSaveSuccessId, setHousingQuickSaveSuccessId] = useState<string | null>(null);
  const [busCapacityWarning, setBusCapacityWarning] = useState<string | null>(null);
  const [editModalBusError, setEditModalBusError] = useState<string | null>(null);
  const [editingPilgrim, setEditingPilgrim] = useState<Pilgrim | null>(null);

  // Announcement modal / form state
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isNewAnnouncement, setIsNewAnnouncement] = useState(false);
  const [annForm, setAnnForm] = useState<{
    title: string;
    category: 'هام' | 'توجيهات' | 'مواعيد';
    date: string;
    content: string;
    fontSize: NonNullable<Announcement['fontSize']>;
    isBold: boolean;
    textAlign: NonNullable<Announcement['textAlign']>;
    imageUrl: string;
    videoUrl: string;
    displaySettings: {
      showImage: boolean;
      showVideo: boolean;
      enableLightbox: boolean;
      highlightCard: boolean;
    };
  }>({
    title: '',
    category: 'هام',
    date: new Date().toISOString().split('T')[0],
    content: '',
    fontSize: 'normal',
    isBold: false,
    textAlign: 'right',
    imageUrl: '',
    videoUrl: '',
    displaySettings: {
      showImage: true,
      showVideo: true,
      enableLightbox: true,
      highlightCard: false,
    },
  });
  const [activeAnnToolTab, setActiveAnnToolTab] = useState<'none' | 'image' | 'video'>('none');
  const [isUploadingAnnImage, setIsUploadingAnnImage] = useState(false);
  const [isUploadingAnnVideo, setIsUploadingAnnVideo] = useState(false);
  const [annMediaProgress, setAnnMediaProgress] = useState(0);
  const [annMediaError, setAnnMediaError] = useState('');

  // Package modal / form state
  const [editingPackage, setEditingPackage] = useState<HajjPackage | null>(null);
  const [isNewPackage, setIsNewPackage] = useState(false);
  const [pkgForm, setPkgForm] = useState({
    title: '',
    type: 'VIP طيران',
    price: '18,000 ريال',
    transport: 'طيران + باصات VIP',
    accommodationMakkah: 'فندق مكة المكرمة',
    accommodationMadinah: 'فندق المدينة المنورة',
    campMina: 'مخيم منى المطور',
    featuresStr: 'إقامة فاخرة, إشراف ديني, وجبات بوفيه',
    image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&q=80&w=800'
  });

  // Staff User Modal / Form state
  const [isNewStaff, setIsNewStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AdminUser | null>(null);
  const [staffFormError, setStaffFormError] = useState('');
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [staffDomain, setStaffDomain] = useState<string>('@alqaemhajj.com');
  const [staffForm, setStaffForm] = useState<{
    username: string;
    pin: string;
    fullName: string;
    role: 'مدير عام (Master Admin)' | 'مشرف إداري' | 'مشرف إرشاد وديني' | 'محاسب القافلة';
    permissions: {
      managePilgrims: boolean;
      manageAnnouncements: boolean;
      managePackages: boolean;
      manageStaff: boolean;
      manageFinance: boolean;
      manageReligiousGuide: boolean;
      manageTravelKit: boolean;
      manageGifts?: boolean;
    }
  }>({
    username: '',
    pin: '',
    fullName: '',
    role: 'مشرف إداري',
    permissions: {
      managePilgrims: true,
      manageAnnouncements: true,
      managePackages: false,
      manageStaff: false,
      manageFinance: false,
      manageReligiousGuide: false,
      manageTravelKit: false,
      manageGifts: true,
    }
  });

  // Campaign settings form state
  const [settingsForm, setSettingsForm] = useState<CampaignSettings>(() => {
    return {
      phone: campaignSettings.phone,
      whatsapp: campaignSettings.whatsapp,
      email: campaignSettings.email,
      address: campaignSettings.address,
      siteTexts: {
        topBarAnnouncement: campaignSettings.siteTexts?.topBarAnnouncement || 'قافلة القائم للحج والعمرة - موسم 1448هـ',
        topBarBadge: campaignSettings.siteTexts?.topBarBadge || 'ترخيص رسمي معتمد',
        topBarSubtext: campaignSettings.siteTexts?.topBarSubtext || 'القطيف / السعودية',
        brandName: campaignSettings.siteTexts?.brandName || 'قافلة القائم',
        brandSubtitle: campaignSettings.siteTexts?.brandSubtitle || 'للحج والعمرة والزيارة',
        heroBadge: campaignSettings.siteTexts?.heroBadge || 'فتح باب التسجيل لحج موسم 1448 هـ - المقاعد محدودة',
        heroTitlePrefix: campaignSettings.siteTexts?.heroTitlePrefix || 'رفيقكم الموثوق في رحلة العمر',
        heroTitleHighlight: campaignSettings.siteTexts?.heroTitleHighlight || 'قافلة القائم',
        heroDescription: campaignSettings.siteTexts?.heroDescription || 'نقدم خدمات متكاملة وراقية لحجاج بيت الله الحرام والمعتمرين. إشراف ديني وإداري بخبرة سنوية طويلة، مخيمات مطورة في منى وعرفات، وسكن فندقي يليق بضيوف الرحمن.',
        registerButtonText: campaignSettings.siteTexts?.registerButtonText || 'استعراض باقات الحج والعمرة',
        portalButtonText: campaignSettings.siteTexts?.portalButtonText || 'بوابة الاستعلام للحاج',
        cardSeasonBadge: campaignSettings.siteTexts?.cardSeasonBadge || 'موسم 1448هـ',
        cardTitle: campaignSettings.siteTexts?.cardTitle || 'قافلة القائم للحج والعمرة',
        cardSubtitle: campaignSettings.siteTexts?.cardSubtitle || 'خدمة ضيوف الرحمن شرف وفخر لنا منذ سنوات طويلة',
        cardFeatures: campaignSettings.siteTexts?.cardFeatures || [
          'سكن فندقي فاخر في مكة المكرمة والمدينة المنورة',
          'مخيمات منى وعرفات المكيفة والمجهزة',
          'إشراف فقهي وإداري وطبي متكامل'
        ]
      },
      marjiList: campaignSettings.marjiList || [],
      busList: campaignSettings.busList,
      youtubeConfig: campaignSettings.youtubeConfig,
      cloudinaryConfig: campaignSettings.cloudinaryConfig,
      operationalCostTarget: campaignSettings.operationalCostTarget,
      pilgrimStatsConfig: getEffectivePilgrimStatsConfig(campaignSettings),
      hajjDaysTimeline: campaignSettings.hajjDaysTimeline
    };
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [pilgrimStatsSavedNotice, setPilgrimStatsSavedNotice] = useState(false);
  const [newHistYearInput, setNewHistYearInput] = useState('');
  const [newHistCountInput, setNewHistCountInput] = useState('');
  const [newHistNotesInput, setNewHistNotesInput] = useState('');

  // Keep settingsForm.pilgrimStatsConfig synchronized when campaignSettings updates from Firestore
  useEffect(() => {
    if (campaignSettings.pilgrimStatsConfig) {
      setSettingsForm((prev) => ({
        ...prev,
        pilgrimStatsConfig: getEffectivePilgrimStatsConfig(campaignSettings),
      }));
    }
  }, [campaignSettings.pilgrimStatsConfig]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => getCachedActivityLogs());
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>('all');
  const [activityUserFilter, setActivityUserFilter] = useState<string>('all');

  useEffect(() => {
    const mergeAndSortLogs = (remoteLogs: ActivityLog[]) => {
      const localLogs = getCachedActivityLogs();
      const map = new Map<string, ActivityLog>();
      for (const item of [...localLogs, ...remoteLogs]) {
        if (item && item.id) {
          map.set(item.id, item);
        }
      }
      const merged = Array.from(map.values()).sort((a, b) =>
        String(b.timestamp || b.date || '').localeCompare(String(a.timestamp || a.date || ''))
      );
      setActivityLogs(merged);
    };

    const unsub = subscribeToCollection<ActivityLog>('activityLogs', (data) => {
      mergeAndSortLogs(data);
    });

    const handleLocalLogEvent = () => {
      mergeAndSortLogs(activityLogs);
    };
    window.addEventListener('qaem-activity-logged', handleLocalLogEvent);

    return () => {
      unsub();
      window.removeEventListener('qaem-activity-logged', handleLocalLogEvent);
    };
  }, []);

  // Change own password state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Viewing payment receipt modal state
  const [viewingReceiptPilgrim, setViewingReceiptPilgrim] = useState<Pilgrim | null>(null);
  const [officialReceiptPilgrim, setOfficialReceiptPilgrim] = useState<Pilgrim | null>(null);
  const [receiptAuditResult, setReceiptAuditResult] = useState<ReceiptAuditResult | null>(null);
  const [isAuditingReceipt, setIsAuditingReceipt] = useState(false);

  const handleAuditReceipt = async (targetPilgrim: Pilgrim) => {
    if (!targetPilgrim.paymentReceipt) return;
    setIsAuditingReceipt(true);
    setReceiptAuditResult(null);
    const expected = parseFloat(
      String(targetPilgrim.totalPackagePrice || (targetPilgrim.selectedPackage?.includes('VIP') ? '18000' : '16800')).replace(/[^0-9.]/g, '')
    ) || 16800;
    const pilgrimName = `${targetPilgrim.firstName} ${targetPilgrim.lastName}`;
    const result = await auditReceiptWithAI(targetPilgrim.paymentReceipt, expected, pilgrimName);
    setReceiptAuditResult(result);
    setIsAuditingReceipt(false);

    recordActivityLog({
      adminId: currentAdminUser?.id || 'admin',
      adminName: currentAdminUser?.fullName || 'المدير العام',
      username: currentAdminUser?.username || 'admin',
      userRole: currentAdminUser?.role || 'مدير عام (Master Admin)',
      category: 'المالية والإيصالات',
      action: 'فحص وتدقيق قسيمة تحويل بنكي بالذكاء الاصطناعي',
      target: `الحاج: ${pilgrimName} (${targetPilgrim.nationalId})`,
      details: `نتيجة التدقيق: ${result.status} | المبلغ المكتشف: ${result.transferAmount || '—'} ريال`,
    }).catch(() => {});
  };

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Mobile Hardware Back Button Guard: Close open modals instead of exiting the app
  const isAnyAdminModalOpen = Boolean(
    isNewStaff ||
      editingStaff ||
      editingPilgrim ||
      isNewAnnouncement ||
      editingAnnouncement ||
      isNewPackage ||
      editingPackage ||
      showChangePasswordModal ||
      viewingReceiptPilgrim ||
      officialReceiptPilgrim ||
      confirmModal.isOpen
  );

  useEffect(() => {
    if (!isAnyAdminModalOpen) return;

    window.history.pushState({ qaemAdminModal: true }, '');

    const handlePopState = () => {
      setIsNewStaff(false);
      setEditingStaff(null);
      setStaffFormError('');
      setEditingPilgrim(null);
      setEditModalBusError(null);
      setIsNewAnnouncement(false);
      setEditingAnnouncement(null);
      setAnnMediaError('');
      setIsNewPackage(false);
      setEditingPackage(null);
      setShowChangePasswordModal(false);
      setViewingReceiptPilgrim(null);
      setOfficialReceiptPilgrim(null);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAnyAdminModalOpen]);

  const handleLogin = async () => {
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('../lib/firebase');
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      setLoginError('');

      const normEmail = (cred.user.email || '').trim().toLowerCase();
      const [emailLocalPart, emailDomain] = normEmail.split('@');

      // 1. Domain Whitelisting Check (التحقق من النطاق المعتمد للقافلة)
      if (!emailDomain || !ALLOWED_GOOGLE_DOMAINS.includes(emailDomain)) {
        await auth.signOut();
        setAdminLoggedIn(false);
        setCurrentAdminUser(null);
        await recordActivityLog({
          adminId: 'blocked-domain',
          adminName: cred.user.displayName || normEmail || 'مستخدم غير مصرح',
          username: normEmail || 'unknown',
          userRole: 'حظر نطاق غير معتمد',
          category: 'تسجيل دخول / خروج',
          action: `رفض دخول عبر Google: النطاق (@${emailDomain || 'غير معروف'}) غير مدرج في قائمة النطاقات البيضاء`,
          target: `الحساب المرفوض: ${normEmail}`,
        });
        setLoginError(
          `تم رفض الدخول أمنياً: النطاق (@${emailDomain}) غير مدرج ضمن النطاقات المعتمدة للقافلة (${ALLOWED_GOOGLE_DOMAINS.map(d => '@' + d).join(' ، ')}).`
        );
        return;
      }

      const dbAdmins = await getDocuments<AdminUser>('adminUsers');
      const combinedAdmins = [...adminUsers, ...dbAdmins];

      const matchedAdmin = combinedAdmins.find((u) => {
        const uNorm = (u.username || '').trim().toLowerCase();
        const uLocal = uNorm.split('@')[0] || '';
        return (
          u.id === cred.user.uid ||
          uNorm === normEmail ||
          (emailLocalPart && uLocal === emailLocalPart && uNorm.includes('@')) ||
          (normEmail === 'alahsaey@gmail.com' &&
            (uNorm === 'admin' ||
              uNorm === 'admin@alqaemhajj.com' ||
              u.id === 'usr-1' ||
              u.role === 'الإدارة العامة' ||
              u.role === 'مدير عام (Master Admin)'))
        );
      });

      if (matchedAdmin?.status === 'suspended') {
        await auth.signOut();
        setAdminLoggedIn(false);
        setCurrentAdminUser(null);
        await recordActivityLog({
          adminId: matchedAdmin.id,
          adminName: matchedAdmin.fullName,
          username: matchedAdmin.username,
          userRole: matchedAdmin.role,
          category: 'تسجيل دخول / خروج',
          action: 'رفض دخول لحساب مشرف موقوف (Google Auth)',
          target: `الحساب الموقوف: ${matchedAdmin.fullName} (${normEmail})`,
          details: 'حالة الحساب: موقوف (Suspended)',
        });
        setLoginError('عفواً، تم إيقاف حساب المشرف هذا من قِبل الإدارة العامة. يرجى مراجعة مدير النظام.');
        return;
      }

      if (!matchedAdmin && normEmail !== 'alahsaey@gmail.com') {
        await auth.signOut();
        setAdminLoggedIn(false);
        setCurrentAdminUser(null);
        await recordActivityLog({
          adminId: 'unregistered-google-user',
          adminName: cred.user.displayName || normEmail,
          username: normEmail,
          userRole: 'محاولة دخول غير مصرحة',
          category: 'تسجيل دخول / خروج',
          action: 'رفض دخول عبر Google: البريد غير مسجل في قائمة المشرفين المعتمدين',
          target: `البريد: ${normEmail}`,
        });
        setLoginError('عفواً، حساب Google هذا غير مسجل ضمن قائمة المشرفين المصرح لهم. يجب إضافة اسم المستخدم والنطاق أولاً من قِبل الإدارة العامة.');
        return;
      }

      await recordActivityLog({
        adminId: matchedAdmin?.id || cred.user.uid,
        adminName: matchedAdmin?.fullName || cred.user.displayName || 'الإدارة العامة للقافلة',
        username: matchedAdmin?.username || cred.user.email || 'google-auth',
        userRole: matchedAdmin?.role || 'الإدارة العامة',
        category: 'تسجيل دخول / خروج',
        action: 'تسجيل دخول ناجح إلى لوحة التحكم (عبر حساب Google والتحقق من النطاق)',
        target: `الحساب: ${cred.user.email || cred.user.displayName || 'مدير النظام'}`,
        details: `النطاق المعتمد: @${emailDomain}`,
      });
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User closed the popup or cancelled authentication intentionally
        setLoginError('تم إلغاء نافذة تسجيل الدخول. يمكنك المحاولة مجدداً أو استخدام الدخول اليدوي برمز المرور (PIN).');
        return;
      }
      console.error("Google Auth Error:", err);
      if (err?.code === 'auth/unauthorized-domain') {
        setLoginError('هذا النطاق (Domain) غير مصرح به في إعدادات Firebase. يرجى استخدام الدخول اليدوي بالرمز السري (PIN) أو إضافة النطاق في لوحة تحكم Firebase.');
      } else if (err?.code === 'auth/popup-blocked') {
        setLoginError('تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة للموقع.');
      } else {
        setLoginError('فشل تسجيل الدخول عبر Google. يرجى التأكد من صلاحيات حسابك أو استخدام الدخول اليدوي.');
      }
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const rawTyped = usernameInput.trim().toLowerCase();
    const localTyped = rawTyped.split('@')[0] || '';
    const combinedWithSelectedDomain = loginDomain
      ? `${localTyped}${loginDomain.toLowerCase()}`
      : rawTyped;

    const inputHash = await hashPIN(pinInput);
    // SHA-256 of "1448" is "3f03b51688d048d0870949d2110c9d784762391696a40a50f00f07f90f230589"
    const masterHash = "3f03b51688d048d0870949d2110c9d784762391696a40a50f00f07f90f230589";

    const isMasterUsername =
      localTyped === 'admin' ||
      localTyped === 'alahsaey' ||
      rawTyped === 'alahsaey@gmail.com' ||
      combinedWithSelectedDomain === 'alahsaey@gmail.com' ||
      combinedWithSelectedDomain === 'admin@alqaemhajj.com';

    // Fallback for Master Admin (admin / 1448)
    if (isMasterUsername && (pinInput === '1448' || inputHash === masterHash)) {
      try {
        const { signInAnonymously } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (authErr) {
        console.warn("Anonymous auth notice:", authErr);
      }
      const existingMaster = adminUsers.find(
        (u) =>
          u.id === 'usr-1' ||
          (u.username || '').trim().toLowerCase() === 'admin' ||
          u.role === 'الإدارة العامة' ||
          u.role === 'مدير عام (Master Admin)'
      );
      const masterAdmin: AdminUser = existingMaster
        ? migrateAdminUserRecord(existingMaster, campaignSettings.rolePermissionTemplates)
        : {
            id: 'usr-1',
            username: 'admin',
            pin: masterHash,
            fullName: 'الإدارة العامة للقافلة',
            role: 'الإدارة العامة',
            status: 'active',
            detailedPermissions: DEFAULT_ROLE_PERMISSIONS['الإدارة العامة'],
            permissions: {
              managePilgrims: true,
              manageAnnouncements: true,
              managePackages: true,
              manageStaff: true,
              manageFinance: true,
              manageReligiousGuide: true,
              manageTravelKit: true,
              manageGifts: true,
              manageNotifications: true,
              manageCultural: true,
            },
            createdAt: new Date().toISOString().split('T')[0],
          };
      setAdminLoggedIn(true);
      setCurrentAdminUser(masterAdmin);
      await recordActivityLog({
        adminId: masterAdmin.id,
        adminName: masterAdmin.fullName,
        username: masterAdmin.username,
        userRole: masterAdmin.role,
        category: 'تسجيل دخول / خروج',
        action: 'تسجيل دخول ناجح إلى لوحة التحكم (الرمز السري PIN)',
        target: `المستخدم: ${masterAdmin.fullName} (${combinedWithSelectedDomain || masterAdmin.username})`,
        details: 'الدور الوظيفي: الإدارة العامة',
      });
      return;
    }

    // Check Firestore Admin Users (both in-memory and live DB fetch)
    const dbAdmins = await getDocuments<AdminUser>('adminUsers');
    const allAdmins = [...adminUsers, ...dbAdmins];
    const foundUser = allAdmins.find((u) => {
      const uNorm = (u.username || '').trim().toLowerCase();
      const uLocal = uNorm.split('@')[0] || '';
      if (loginDomain) {
        // When a domain is explicitly selected, match exact user@domain OR if user was stored without domain
        return uNorm === combinedWithSelectedDomain || (!uNorm.includes('@') && uNorm === localTyped);
      }
      return uNorm === rawTyped || uLocal === localTyped;
    });

    if (foundUser && (foundUser.pin === inputHash || foundUser.pin === pinInput)) {
      if (foundUser.status === 'suspended') {
        await recordActivityLog({
          adminId: foundUser.id,
          adminName: foundUser.fullName,
          username: foundUser.username,
          userRole: foundUser.role,
          category: 'تسجيل دخول / خروج',
          action: 'رفض محاولة دخول لحساب مشرف موقوف (PIN)',
          target: `الحساب الموقوف: ${foundUser.fullName} (${foundUser.username})`,
          details: 'حالة الحساب: موقوف (Suspended)',
        });
        setLoginError('عفواً، تم إيقاف حساب المشرف هذا من قِبل الإدارة العامة. يرجى مراجعة مدير النظام.');
        return;
      }

      try {
        const { signInAnonymously } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (authErr) {
        console.warn("Anonymous auth notice:", authErr);
      }
      const normalizedFoundUser = migrateAdminUserRecord(foundUser, campaignSettings.rolePermissionTemplates);
      setAdminLoggedIn(true);
      setCurrentAdminUser(normalizedFoundUser);
      await recordActivityLog({
        adminId: normalizedFoundUser.id,
        adminName: normalizedFoundUser.fullName,
        username: normalizedFoundUser.username,
        userRole: normalizedFoundUser.role,
        category: 'تسجيل دخول / خروج',
        action: 'تسجيل دخول ناجح إلى لوحة التحكم (الرمز السري PIN)',
        target: `المستخدم: ${normalizedFoundUser.fullName} (${normalizedFoundUser.username})`,
        details: `الدور الوظيفي: ${normalizedFoundUser.role}`,
      });
      return;
    }

    await recordActivityLog({
      adminId: 'unauthenticated',
      adminName: usernameInput || 'مستخدم غير معروف',
      username: usernameInput || 'unknown',
      userRole: 'محاولة دخول مرفوضة',
      category: 'تسجيل دخول / خروج',
      action: 'محاولة تسجيل دخول فاشلة (رمز سري أو اسم مستخدم خاطئ)',
      target: `المعرف المدخل: ${usernameInput || 'فارغ'}`,
    });
    setLoginError('اسم المستخدم أو الرمز السري غير صحيح.');
  };

  const handleLogout = async () => {
    if (currentAdminUser) {
      await recordActivityLog({
        adminId: currentAdminUser.id,
        adminName: currentAdminUser.fullName,
        username: currentAdminUser.username,
        userRole: currentAdminUser.role,
        category: 'تسجيل دخول / خروج',
        action: 'تسجيل خروج من لوحة التحكم',
        target: `المستخدم: ${currentAdminUser.fullName} (${currentAdminUser.username})`,
      });
    }
    const { auth } = await import('../lib/firebase');
    await auth.signOut();
    setAdminLoggedIn(false);
    setCurrentAdminUser(null);
  };

  const [csvExportSuccess, setCsvExportSuccess] = useState<string | null>(null);

  const handleExportCSV = (targetList: Pilgrim[] = pilgrims, customLabel = 'كافة_الحجاج') => {
    const canExport =
      isGeneralAdminUser(currentAdminUser) ||
      canPerformOperation(currentAdminUser, 'pilgrims', 'export', campaignSettings.rolePermissionTemplates) ||
      canPerformOperation(currentAdminUser, 'finance', 'export', campaignSettings.rolePermissionTemplates) ||
      canPerformOperation(currentAdminUser, 'religious', 'export', campaignSettings.rolePermissionTemplates) ||
      canPerformOperation(currentAdminUser, 'housing_transport', 'export', campaignSettings.rolePermissionTemplates);

    if (!canExport) {
      setCsvExportSuccess('تنبيه أمني: لا يمتلك دورك الوظيفي الحالي صلاحية تصدير التقارير (Export).');
      setTimeout(() => setCsvExportSuccess(null), 4000);
      return;
    }

    if (!targetList || targetList.length === 0) {
      setCsvExportSuccess('تنبيه: لا توجد بيانات حجاج مسجلين لتصديرها حالياً.');
      setTimeout(() => setCsvExportSuccess(null), 4000);
      return;
    }

    const headers = [
      '# (التسلسل)',
      'الرقم التسلسلي المرجعي',
      'رقم التسلسل بالحملة',
      'رقم العضوية',
      'تاريخ التسجيل',
      'حالة الطلب',
      'استلام المستندات',
      'تأكيد استلام الدفع',
      'الباقة المختارة',
      'إجمالي سعر الباقة',
      'المبلغ المسدد / المدفوع',
      'المبلغ المحول',
      'المبلغ المتبقي',
      'رقم الحوالة البنكية / المرجع',
      'تاريخ التحويل البنكي',
      'الاسم الكامل',
      'الاسم الأول',
      'اسم الأب',
      'اسم الجد',
      'اسم العائلة',
      'الاسم الكامل بالإنجليزية',
      'الجنس',
      'الجنسية',
      'رقم الهوية الوطنية / الإقامة',
      'تاريخ إصدار الهوية',
      'تاريخ انتهاء الهوية',
      'تاريخ الميلاد',
      'رقم الجوال',
      'رقم الواتساب',
      'البريد الإلكتروني',
      'رقم الآيبان (IBAN)',
      'اسم صاحب الحساب البنكي',
      'اسم البنك',
      'وسيلة المواصلات',
      'نوع الحج',
      'سنة آخر حجة',
      'مرجع التقليد الحالي',
      'مرجع التقليد السابق',
      'القدرة على الحركة دون مساعدة',
      'يحتاج مساعدة خاصة',
      'يعاني من آلام بالظهر',
      'صعوبة في النطق',
      'حالة الحمل (للإناث)',
      'الأمراض المزمنة / الحالات الصحية',
      'ملاحظات صحية أخرى',
      'وجود محرم / مرافق',
      'بيانات المحرم / المرافقين',
      'رقم غرفة سكن مكة المكرمة',
      'رقم غرفة السكن بالمدينة المنورة',
      'تسكين منى (المخيم / المقعد)',
      'رقم الباص / الحافلة',
      'رقم المقعد بالباص',
      'رحلة الطيران (الذهاب)',
      'رحلة الطيران (العودة)',
      'رقم التذكرة / الحجز (PNR)',
      'إشعارات الواتساب مفعلة',
      'رقم الواتساب المخصص للإشعارات',
      'سبب الرفض / ملاحظات الحالة',
      'الموافقة على الشروط'
    ];

    const escapeCSV = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = targetList.map((p, index) => [
      index + 1,
      p.registrationReference || (1001 + index),
      p.pilgrimSequenceNumber || (index + 1),
      p.membershipNumber || `QAEM-1448-${1001 + index}`,
      p.createdAt || '',
      p.status || 'قيد المراجعة',
      p.documentsReceived ? 'نعم' : 'لا',
      p.paymentReceived ? 'نعم (مؤكد)' : 'غير مؤكد',
      p.selectedPackage || 'غير محدد',
      p.totalPackagePrice || '',
      p.paidAmount || (isPilgrimPaymentConfirmed(p) ? `${getPilgrimPaidAmount(p, packages).toLocaleString('en-US')} ريال` : '0 ريال'),
      p.transferAmount || '',
      p.remainingAmount || '',
      p.bankReferenceNumber || '',
      p.paymentReceiptDate || '',
      `${p.firstName || ''} ${p.secondName || ''} ${p.thirdName || ''} ${p.lastName || ''}`.replace(/\s+/g, ' ').trim(),
      p.firstName || '',
      p.secondName || '',
      p.thirdName || '',
      p.lastName || '',
      p.englishFullName || '',
      p.gender || '',
      p.nationality || '',
      p.nationalId || '',
      p.idIssueDate || '',
      p.idExpiryDate || '',
      p.birthDate || '',
      p.mobile || '',
      p.whatsapp || '',
      p.email || '',
      p.iban || '',
      p.bankAccountName || '',
      p.bankName || '',
      p.transport || '',
      p.hajjType || '',
      p.lastHajjYear || '',
      p.currentMarji || '',
      p.previousMarji || '',
      p.mobilityIndependence || '',
      p.needsAssistance ? 'نعم' : 'لا',
      p.hasBackPain ? 'نعم' : 'لا',
      p.hasSpeechDifficulty ? 'نعم' : 'لا',
      p.isPregnant ? 'نعم' : 'لا',
      (p.healthConditions || []).join(' - ') || 'سليم ولله الحمد',
      p.otherHealthCondition || '',
      p.hasMahram ? 'نعم' : 'لا',
      (p.mahramDetails || []).map(m => `${m.name} (${m.relation})`).join(' - ') || '',
      p.roomNumberMakkah || p.roomNumber || 'غير محدد',
      p.roomNumberMadinah || 'غير محدد',
      p.roomNumberMina || 'غير محدد',
      p.busNumber || 'غير محدد',
      p.busSeat || 'غير محدد',
      p.flightNumberOutbound || 'غير محدد',
      p.flightNumberReturn || 'غير محدد',
      p.flightTicketNumber || 'غير محدد',
      p.whatsappNotificationsEnabled ? 'مفعلة' : 'غير مفعلة',
      p.whatsappNotificationMobile || '',
      p.rejectionReason || p.statusNotes || '',
      p.termsAccepted || 'نعم'
    ]);

    const confirmedCount = targetList.filter((p) => isPilgrimPaymentConfirmed(p)).length;
    const busCountInList = targetList.filter((p) => p.transport === 'باص').length;
    const flightCountInList = targetList.filter((p) => p.transport === 'طائرة').length;
    const dateStr = new Date().toISOString().split('T')[0];
    const cleanLabel = customLabel.replace(/_/g, ' ');

    void exportAlQaemExcelReport({
      reportTitle: `كشف بيانات الحجاج — ${cleanLabel}`,
      subtitle: `السجل الشامل لبيانات الحجاج والتواصل والباقات والسكن والمواصلات (${targetList.length} حاج)`,
      category: 'كشوف وسجلات الحجاج المعتمدة',
      filename: `قافلة_القائم_${customLabel}_${dateStr}`,
      columns: headers,
      rows,
      generatedBy: currentAdminUser?.fullName || 'الإدارة العامة',
      summaryCards: [
        { label: 'إجمالي السجلات في الكشف', value: `${targetList.length} حاج` },
        { label: 'المؤكد دفعهم', value: `${confirmedCount} حاج` },
        { label: 'حجاج الحافلات (البر)', value: `${busCountInList} حاج` },
        { label: 'حجاج الطيران (الجو)', value: `${flightCountInList} حاج` },
      ],
    });

    setCsvExportSuccess(
      `تم تصدير ملف Excel (.xlsx) الرسمي بالهوية البصرية لنظام قافلة القائم (${targetList.length} سجل)!`
    );
    setTimeout(() => setCsvExportSuccess(null), 5000);

    recordActivityLog({
      adminId: currentAdminUser?.id || 'admin',
      adminName: currentAdminUser?.fullName || 'المدير العام',
      username: currentAdminUser?.username || 'admin',
      userRole: currentAdminUser?.role || 'مدير عام (Master Admin)',
      category: 'إدارة الحجاج',
      action: `تصدير كشف بيانات الحجاج بصيغة CSV (${customLabel})`,
      target: `عدد السجلات المصدرة: ${targetList.length} حاج`,
    }).catch(() => {});
  };

  // Quick Status & Document / Payment Update Handlers
  const handleQuickStatusChange = (pilgrim: Pilgrim, newStatus: Pilgrim['status']) => {
    const seq = pilgrims.findIndex(p => p.nationalId === pilgrim.nationalId) + 1;
    const isPaid = newStatus === 'مكتمل' || newStatus === 'مكتمل الدفع';
    const isAccepted = newStatus === 'تم القبول' || newStatus === 'مقبول ومؤكد' || isPaid;

    const updated: Pilgrim = {
      ...pilgrim,
      status: newStatus,
      applicationStatus: isPaid ? 'مكتمل' : isAccepted ? 'تم القبول' : 'قيد المراجعة',
      documentsReceived: isAccepted ? true : (pilgrim.documentsReceived ?? false),
      paymentReceived: isPaid ? true : (pilgrim.paymentReceived ?? false),
      membershipNumber: pilgrim.membershipNumber || `QAEM-1448-${pilgrim.registrationReference || '1001'}`,
      pilgrimSequenceNumber: pilgrim.pilgrimSequenceNumber || (seq > 0 ? seq : undefined),
      paymentReceiptDate: isPaid ? (pilgrim.paymentReceiptDate || new Date().toISOString()) : pilgrim.paymentReceiptDate
    };
    onUpdatePilgrim(updated);
  };

  const handleToggleDocuments = (pilgrim: Pilgrim) => {
    const nextReceived = !pilgrim.documentsReceived;
    let nextStatus = pilgrim.status;
    if (nextReceived && (pilgrim.status === 'قيد المراجعة' || !pilgrim.status)) {
      nextStatus = 'تم القبول';
    } else if (!nextReceived && pilgrim.status === 'تم القبول') {
      nextStatus = 'قيد المراجعة';
    }
    const updated: Pilgrim = {
      ...pilgrim,
      documentsReceived: nextReceived,
      status: nextStatus,
      applicationStatus: (nextStatus === 'مكتمل' || nextStatus === 'مكتمل الدفع') ? 'مكتمل' : (nextStatus === 'تم القبول' || nextStatus === 'مقبول ومؤكد') ? 'تم القبول' : 'قيد المراجعة'
    };
    onUpdatePilgrim(updated);
  };

  const handleTogglePayment = (pilgrim: Pilgrim) => {
    const isCurrentlyPaid = pilgrim.status === 'مكتمل' || pilgrim.status === 'مكتمل الدفع' || pilgrim.paymentReceived === true;
    const nextPaid = !isCurrentlyPaid;
    const seq = pilgrims.findIndex(p => p.nationalId === pilgrim.nationalId) + 1;
    const nextStatus: Pilgrim['status'] = nextPaid ? 'مكتمل' : (pilgrim.documentsReceived ? 'تم القبول' : 'قيد المراجعة');

    const updated: Pilgrim = {
      ...pilgrim,
      paymentReceived: nextPaid,
      status: nextStatus,
      applicationStatus: nextPaid ? 'مكتمل' : (pilgrim.documentsReceived ? 'تم القبول' : 'قيد المراجعة'),
      paymentReceiptDate: nextPaid ? (pilgrim.paymentReceiptDate || new Date().toISOString()) : undefined,
      membershipNumber: pilgrim.membershipNumber || `QAEM-1448-${pilgrim.registrationReference || '1001'}`,
      pilgrimSequenceNumber: pilgrim.pilgrimSequenceNumber || (seq > 0 ? seq : undefined)
    };
    onUpdatePilgrim(updated);
  };

  // Lists separation: المعتذر والمرفوض والمحذوف ترحل بياناتهم إلى إدارة المستبعدين وتزال من سجل الحجاج المسجلين النشط
  const activePilgrims = pilgrims.filter(
    p => p.status !== 'معتذر' && p.status !== 'مرفوض' && p.status !== 'محذوف' && !p.isDeleted
  );
  const excludedPilgrimsList = pilgrims.filter(
    p => p.status === 'معتذر' || p.status === 'مرفوض' || p.status === 'محذوف' || p.isDeleted
  );

  // Recharts Dashboard Cards metrics & dataset (focused on active pilgrims)
  const totalPilgrimsCount = activePilgrims.length;
  const confirmedPaymentsCount = activePilgrims.filter(
    p => p.status === 'مكتمل' || p.status === 'مكتمل الدفع' || p.paymentReceived === true
  ).length;
  const pendingReviewCount = activePilgrims.filter(
    p => p.status === 'قيد المراجعة' || (!p.status && !p.paymentReceived)
  ).length;
  const acceptedCount = activePilgrims.filter(
    p => p.status === 'تم القبول' || p.status === 'مقبول ومؤكد' || p.documentsReceived === true
  ).length;
  const apologizedCount = excludedPilgrimsList.filter(p => p.status === 'معتذر').length;
  const rejectedCount = excludedPilgrimsList.filter(p => p.status === 'مرفوض').length;
  const deletedCount = excludedPilgrimsList.filter(p => p.status === 'محذوف' || (p.isDeleted && p.status !== 'معتذر' && p.status !== 'مرفوض')).length;

  const confirmedPct = totalPilgrimsCount > 0 ? Math.round((confirmedPaymentsCount / totalPilgrimsCount) * 100) : 0;
  const pendingPct = totalPilgrimsCount > 0 ? Math.round((pendingReviewCount / totalPilgrimsCount) * 100) : 0;
  const acceptedPct = totalPilgrimsCount > 0 ? Math.round((acceptedCount / totalPilgrimsCount) * 100) : 0;

  // Mini Sparkline dataset for Total Pilgrims Card
  const totalChartData = [
    { name: 'فترة 1', count: Math.max(1, Math.floor(totalPilgrimsCount * 0.2)) },
    { name: 'فترة 2', count: Math.max(1, Math.floor(totalPilgrimsCount * 0.45)) },
    { name: 'فترة 3', count: Math.max(1, Math.floor(totalPilgrimsCount * 0.75)) },
    { name: 'فترة 4', count: Math.max(1, Math.floor(totalPilgrimsCount * 0.9)) },
    { name: 'المسجلين', count: Math.max(1, totalPilgrimsCount) }
  ];

  // Mini Bar dataset for Confirmed Payments Card
  const paymentBarData = [
    { name: 'مؤكد', value: confirmedPaymentsCount, fill: '#10b981' },
    { name: 'بانتظار السداد', value: Math.max(0, totalPilgrimsCount - confirmedPaymentsCount), fill: '#f59e0b' }
  ];

  // Mini Donut dataset for Pending Review Card
  const pendingPieData = [
    { name: 'قيد المراجعة', value: Math.max(0.01, pendingReviewCount), fill: '#3b82f6' },
    { name: 'مكتمل أو مقبول', value: Math.max(0.01, totalPilgrimsCount - pendingReviewCount), fill: '#334155' }
  ];

  // Mini Bar dataset for Accepted Documents Card
  const acceptedBarData = [
    { name: 'مستندات مقبولة', value: acceptedCount, fill: '#8b5cf6' },
    { name: 'بانتظار المستندات', value: Math.max(0, totalPilgrimsCount - acceptedCount), fill: '#475569' }
  ];

  const baseListForFiltering = activeTab === 'excluded' ? excludedPilgrimsList : activePilgrims;

  const filteredPilgrims = baseListForFiltering.filter(p => {
    const query = searchQuery.trim().toLowerCase();
    const fullName = `${p.firstName} ${p.secondName} ${p.thirdName} ${p.lastName}`.toLowerCase();
    const matchesSearch = !query ||
      fullName.includes(query) ||
      p.firstName.toLowerCase().includes(query) ||
      p.secondName.toLowerCase().includes(query) ||
      p.thirdName.toLowerCase().includes(query) ||
      p.lastName.toLowerCase().includes(query) ||
      p.nationalId.toLowerCase().includes(query) ||
      p.mobile.toLowerCase().includes(query) ||
      (p.pilgrimSequenceNumber !== undefined && String(p.pilgrimSequenceNumber).includes(query)) ||
      (p.membershipNumber && p.membershipNumber.toLowerCase().includes(query)) ||
      (p.registrationReference && p.registrationReference.toLowerCase().includes(query)) ||
      (p.englishFullName && p.englishFullName.toLowerCase().includes(query)) ||
      (p.rejectionReason && p.rejectionReason.toLowerCase().includes(query)) ||
      (p.statusNotes && p.statusNotes.toLowerCase().includes(query));

    let matchesStatus = true;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'مكتمل' || statusFilter === 'مكتمل الدفع') {
      matchesStatus = p.status === 'مكتمل' || p.status === 'مكتمل الدفع' || p.paymentReceived === true;
    } else if (statusFilter === 'تم القبول' || statusFilter === 'مقبول ومؤكد') {
      matchesStatus = p.status === 'تم القبول' || p.status === 'مقبول ومؤكد' || p.documentsReceived === true;
    } else if (statusFilter === 'قيد المراجعة') {
      matchesStatus = p.status === 'قيد المراجعة' || (!p.status && !p.paymentReceived);
    } else if (statusFilter === 'محذوف') {
      matchesStatus = p.status === 'محذوف' || Boolean(p.isDeleted && p.status !== 'معتذر' && p.status !== 'مرفوض');
    } else {
      matchesStatus = p.status === statusFilter;
    }

    let matchesSeason = true;
    if (seasonFilter === '1448') {
      matchesSeason = !p.hajjYear || p.hajjYear === '1448' || (p.season || '').includes('1448');
    } else if (seasonFilter === 'previous') {
      matchesSeason = Boolean(p.hajjYear && p.hajjYear !== '1448' && !(p.season || '').includes('1448'));
    }

    return matchesSearch && matchesStatus && matchesSeason;
  });

  const roleTemplates = campaignSettings.rolePermissionTemplates;
  const isMasterAdmin = isGeneralAdminUser(currentAdminUser);
  const canManageStaffAndRoles = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'staff_system', 'manage', roleTemplates) ||
      canPerformOperation(currentAdminUser, 'staff_system', 'view', roleTemplates)
  );
  const hasReligiousSupervisionPermission = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'religious', 'view', roleTemplates) ||
      currentAdminUser?.permissions?.manageReligiousGuide ||
      normalizeOfficialRole(currentAdminUser?.role) === 'الإشراف الديني'
  );
  const canViewPilgrimsModule = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'pilgrims', 'view', roleTemplates) ||
      currentAdminUser?.permissions?.managePilgrims
  );
  const canAccessPilgrimsMenu = Boolean(
    canViewPilgrimsModule ||
      canPerformOperation(currentAdminUser, 'housing_transport', 'view', roleTemplates) ||
      hasReligiousSupervisionPermission
  );
  const hasFinancePermission = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'finance', 'view', roleTemplates) ||
      currentAdminUser?.permissions?.manageFinance ||
      normalizeOfficialRole(currentAdminUser?.role) === 'الإشراف المالي'
  );
  const canAccessPackagesModule = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'packages', 'view', roleTemplates) ||
      currentAdminUser?.permissions?.managePackages
  );
  const canAccessFinanceMenu = Boolean(
    hasFinancePermission || canAccessPackagesModule
  );
  const canManageNotifications = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'cultural', 'view', roleTemplates) ||
      currentAdminUser?.permissions?.manageNotifications ||
      currentAdminUser?.permissions?.manageAnnouncements ||
      currentAdminUser?.permissions?.manageCultural ||
      normalizeOfficialRole(currentAdminUser?.role) === 'الإشراف الثقافي'
  );
  const canManageGifts = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'gifts_kit', 'view', roleTemplates) ||
      currentAdminUser?.permissions?.manageGifts ||
      currentAdminUser?.permissions?.managePilgrims
  );
  const canExportPilgrimsData = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'pilgrims', 'export', roleTemplates) ||
      canPerformOperation(currentAdminUser, 'finance', 'export', roleTemplates)
  );

  const MAX_BUS_CAPACITY = 49;

  // Helper to check if a pilgrim has any recorded medical condition or special care need
  const hasPilgrimHealthCondition = (p: Pilgrim): boolean => {
    const validDiseases = (p.healthConditions || []).filter(
      (c) => c && c.trim() !== '' && c !== 'لا شيء مما ذكر'
    );
    const hasOther = Boolean(p.otherHealthCondition && p.otherHealthCondition.trim() !== '');
    const needsMobility =
      Boolean(p.needsAssistance) ||
      Boolean(p.hasBackPain) ||
      p.mobilityIndependence === 'لا' ||
      validDiseases.includes('صعوبة في الحركة');
    return (
      validDiseases.length > 0 ||
      hasOther ||
      needsMobility ||
      Boolean(p.isPregnant) ||
      Boolean(p.hasSpeechDifficulty)
    );
  };

  const pilgrimsWithHealthConditionsCount = activePilgrims.filter(hasPilgrimHealthCondition).length;

  // Authoritative helper to distinguish Air Travel (طيران) vs Bus Travel (حافلات)
  // Prevents any overlap between Flights and Buses unless modified from the Pilgrim Registry
  const isPilgrimAirTravel = (p: Pilgrim): boolean => {
    const pkg = (p.selectedPackage || '').trim();
    const trans = (p.transport || '').trim();
    if (pkg.includes('طيران') || trans === 'طائرة' || trans.includes('طيران')) {
      return true;
    }
    if (
      Boolean(p.flightNumberOutbound?.trim()) ||
      Boolean(p.flightNumberReturn?.trim()) ||
      Boolean(p.flightTicketNumber?.trim())
    ) {
      return true;
    }
    return false;
  };

  const isPilgrimBusTravel = (p: Pilgrim): boolean => !isPilgrimAirTravel(p);

  const airPilgrimsList = React.useMemo(
    () => activePilgrims.filter(p => isPilgrimInSeason(p, '1448') && isPilgrimAirTravel(p)),
    [activePilgrims]
  );

  const busPilgrimsList = React.useMemo(
    () => activePilgrims.filter(p => isPilgrimInSeason(p, '1448') && isPilgrimBusTravel(p)),
    [activePilgrims]
  );

  // Automatic Data Sanitization: If an Air-Travel pilgrim (e.g. باقة الحج المميزة (طيران))
  // accidentally had a busNumber or busSeat assigned or transport !== 'طائرة', clean it automatically
  useEffect(() => {
    if (!adminLoggedIn) return;
    activePilgrims.forEach((p) => {
      if (isPilgrimAirTravel(p)) {
        const hasAccidentalBus = Boolean((p.busNumber || '').trim()) || Boolean((p.busSeat || '').trim());
        const needsTransportSync = p.transport !== 'طائرة';
        if (hasAccidentalBus || needsTransportSync) {
          onUpdatePilgrim({
            ...p,
            transport: 'طائرة',
            busNumber: '',
            busSeat: '',
          });
        }
      }
    });
  }, [adminLoggedIn, activePilgrims]);

  // Dynamic Bus Fleet List: managed by supervisors instead of hardcoded 10 buses
  const BUS_OPTIONS = React.useMemo(() => {
    const savedBuses =
      Array.isArray(campaignSettings?.busList) && campaignSettings.busList.length > 0
        ? campaignSettings.busList
        : ['حافلة 1', 'حافلة 2'];
    const merged = [...savedBuses];
    busPilgrimsList.forEach((p) => {
      const b = (p.busNumber || '').trim();
      if (b && !merged.includes(b)) {
        merged.push(b);
      }
    });
    return merged;
  }, [campaignSettings?.busList, busPilgrimsList]);

  const getBusPassengersCount = (busName: string, excludePilgrimId?: string) => {
    const cleanBus = (busName || '').trim();
    if (!cleanBus) return 0;
    return busPilgrimsList.filter(
      (p) =>
        (p.busNumber || '').trim() === cleanBus &&
        p.id !== excludePilgrimId &&
        p.nationalId !== excludePilgrimId
    ).length;
  };

  const getNextBusName = () => {
    let nextNum = BUS_OPTIONS.length + 1;
    while (BUS_OPTIONS.includes(`حافلة ${nextNum}`)) {
      nextNum++;
    }
    return `حافلة ${nextNum}`;
  };

  const handleAddNewBus = () => {
    const newBusName = getNextBusName();
    const updatedList = [...BUS_OPTIONS, newBusName];
    onUpdateCampaignSettings({
      ...campaignSettings,
      busList: updatedList,
    });
    if (currentAdminUser) {
      recordActivityLog({
        adminId: currentAdminUser.id,
        adminName: currentAdminUser.fullName,
        username: currentAdminUser.username,
        userRole: currentAdminUser.role,
        category: 'إدارة الحجاج',
        action: 'إضافة حافلة جديدة للأسطول',
        target: newBusName,
        details: `تمت إضافة (${newBusName}) إلى قائمة حافلات القافلة (إجمالي الحافلات: ${updatedList.length})`,
      });
    }
    return newBusName;
  };

  const handleRemoveEmptyBus = (busName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const count = getBusPassengersCount(busName);
    if (count > 0 || BUS_OPTIONS.length <= 1) return;
    const updatedList = BUS_OPTIONS.filter((b) => b !== busName);
    if (busFilter === busName) {
      setBusFilter('all');
    }
    onUpdateCampaignSettings({
      ...campaignSettings,
      busList: updatedList,
    });
  };

  if (!adminLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-[#0B1221] border border-slate-800/90 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500/15 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/35">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">دخول لوحة تحكم الإدارة</h2>
            <p className="text-xs text-slate-400 mt-1">
              الدخول محمي بصلاحيات معينة لمنع المتطفلين.
            </p>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-red-400 text-xs leading-relaxed text-right" dir="rtl">
              <p className="font-bold mb-1">{loginError}</p>
              {loginError.includes('Domain') && (
                <div className="mt-2 p-2 bg-white/5 rounded border border-red-500/20 text-[10px]">
                  <strong>لحل المشكلة:</strong> اذهب إلى وحدة تحكم Firebase {'>'} Authentication {'>'} Settings {'>'} Authorized domains {'>'} وأضف النطاق <strong>alqaemhajj.netlify.app</strong>
                </div>
              )}
            </div>
          )}

          <div className="space-y-6">
            {/* Google Login Section */}
            <div className="space-y-3">
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 bg-[#10192D] text-white border border-slate-700 hover:bg-[#16233E] hover:border-amber-500/40 py-3.5 px-6 rounded-xl font-bold transition shadow-sm hover:shadow active:scale-95 cursor-pointer"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>تسجيل الدخول باستخدام Google</span>
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800"></span></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#0B1221] px-2 text-slate-400">أو الولوج السريع بالمعرّف والرمز السري</span></div>
            </div>

            {/* Manual Login Form with Username + Domain Selector */}
            <form onSubmit={handleManualLogin} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 mr-1 block">
                  اسم المستخدم + اختيار النطاق المعتمد
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" dir="ltr">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes('@')) {
                        const { localPart, domain } = splitUsernameAndDomain(val);
                        setUsernameInput(localPart);
                        if (STAFF_DOMAIN_OPTIONS.some((o) => o.value === domain)) {
                          setLoginDomain(domain);
                        }
                      } else {
                        setUsernameInput(val);
                      }
                    }}
                    className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    placeholder="اليوزر (مثال: admin)"
                  />
                  <select
                    value={loginDomain}
                    onChange={(e) => setLoginDomain(e.target.value)}
                    className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-2.5 py-2.5 text-xs font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="">بدون نطاق (مباشر)</option>
                    <option value="@alqaemhajj.com">@alqaemhajj.com</option>
                    <option value="@gmail.com">@gmail.com</option>
                    <option value="@alqaem.org">@alqaem.org</option>
                  </select>
                </div>
                {usernameInput.trim() && (
                  <div className="text-[10px] text-slate-400 font-mono text-left px-1" dir="ltr">
                    معرّف الدخول: <span className="text-amber-400 font-bold">{usernameInput.trim().toLowerCase().split('@')[0]}{loginDomain}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 mr-1 block">الرمز السري (PIN)</label>
                <div className="relative">
                  <input
                    type={showLoginPin ? "text" : "password"}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                    placeholder="1448"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPin(!showLoginPin)}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-amber-400 transition"
                  >
                    {showLoginPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition shadow-md cursor-pointer"
              >
                دخول لوحة التحكم
              </button>
            </form>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              * ملاحظة: الدخول عبر Google مطلوب للقيام بعمليات الحذف والتعديل على قاعدة البيانات بشكل آمن.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-3.5 sm:space-y-6 text-right">
      {/* Admin Header — Compact Executive Profile Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 bg-[#0B1221] p-3.5 sm:p-5 rounded-2xl border border-slate-800/90 shadow-md">
        <div className="flex items-center gap-3 w-full md:w-auto min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 rounded-xl flex items-center justify-center font-bold shadow-sm border border-amber-300/60 shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight">لوحة تحكم قافلة القائم</h1>
              <span className="whitespace-nowrap text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full shadow-sm shrink-0 inline-flex items-center gap-1">
                {currentAdminUser?.fullName || 'الإدارة العامة للقافلة'} • {normalizeOfficialRole(currentAdminUser?.role)}
              </span>
              {currentAdminUser?.assignedSeason && (
                <span className="whitespace-nowrap text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  {currentAdminUser.assignedSeason}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
              نظام الإدارة والتشغيل المعتمد — إشراف لحجاج موسم 1448هـ
            </p>
          </div>
        </div>

        {/* Streamlined Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end shrink-0">
          {onRefreshData && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncingData}
              className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold py-2 px-2.5 sm:px-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 border border-amber-500/35 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer active:scale-95 whitespace-nowrap disabled:opacity-50"
              title={lastSyncTime ? `آخر مزامنة: ${lastSyncTime} — اضغط لتحديث البيانات` : 'تحديث ومزامنة البيانات من السيرفر'}
            >
              <RotateCw className={`w-3.5 h-3.5 shrink-0 text-amber-400 ${isSyncingData ? 'animate-spin' : ''}`} />
              <span className="truncate">{isSyncingData ? 'جارِ المزامنة...' : 'مزامنة البيانات'}</span>
            </button>
          )}
          {canExportPilgrimsData && (
            <button
              type="button"
              onClick={() => handleExportCSV(pilgrims, 'كافة_الحجاج')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-2 sm:px-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 border border-emerald-500/40 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 cursor-pointer active:scale-95 whitespace-nowrap"
              title="تصدير بيانات الحجاج إلى ملف CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">تصدير CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setNewPasswordInput(currentAdminUser?.pin || '');
              setShowChangePasswordModal(true);
            }}
            className="bg-[#111C33] hover:bg-[#172542] text-amber-400 text-xs font-bold py-2 px-2 sm:px-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 border border-amber-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer active:scale-95 whitespace-nowrap"
            title="تعديل الرمز السري الخاص بي"
          >
            <Key className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">تعديل الرمز</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="bg-[#111C33] hover:bg-rose-950/60 text-slate-200 hover:text-rose-200 text-xs font-bold py-2 px-2 sm:px-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 border border-slate-800 hover:border-rose-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer active:scale-95 whitespace-nowrap"
            title="تسجيل الخروج من الحساب"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span className="truncate">تسجيل خروج</span>
          </button>
        </div>
      </div>

      {/* Quick Glance KPI Strip — Compact 3-Column Mini-Stats Bar */}
      {(() => {
        const dashboardStatsConfig = getEffectivePilgrimStatsConfig({
          ...campaignSettings,
          pilgrimStatsConfig: settingsForm.pilgrimStatsConfig || campaignSettings.pilgrimStatsConfig,
        });
        const dashboardPilgrimStats = calculatePilgrimStatsBreakdown(pilgrims, {
          ...campaignSettings,
          pilgrimStatsConfig: dashboardStatsConfig,
        });
        const currentSeasonCount = airPilgrimsList.length + busPilgrimsList.length;

        return (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-[#0B1221] border border-amber-500/25 p-2 sm:p-3 rounded-2xl shadow-sm text-center">
            {/* KPI 1: حجاج الموسم (الطيران والباصات) */}
            <div className="bg-[#10192D]/90 border border-slate-800/90 rounded-xl py-2 px-1.5 sm:p-3 flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold text-amber-300">
                <Users className="w-3.5 h-3.5 text-amber-400 shrink-0 hidden xs:inline" />
                <span>حجاج الموسم</span>
              </div>
              <div className="text-base sm:text-xl font-black text-white font-mono tabular-nums mt-0.5">
                {currentSeasonCount.toLocaleString('en-US')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate max-w-full">
                طيران {airPilgrimsList.length} · باص {busPilgrimsList.length}
              </div>
            </div>

            {/* KPI 2: سجل الأعوام السابقة */}
            <div className="bg-[#10192D]/90 border border-slate-800/90 rounded-xl py-2 px-1.5 sm:p-3 flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold text-slate-300">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 hidden xs:inline" />
                <span>سجل الأعوام السابقة</span>
              </div>
              <div className="text-base sm:text-xl font-black text-amber-400 font-mono tabular-nums mt-0.5">
                {dashboardPilgrimStats.pastYearsPilgrimsTotal.toLocaleString('en-US')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate max-w-full">
                {dashboardPilgrimStats.historicalRecords.length} مواسم مؤرشفة
              </div>
            </div>

            {/* KPI 3: الإجمالي العام بالموقع */}
            <div className="bg-gradient-to-br from-amber-500/15 via-[#10192D] to-[#0D1526] border border-amber-500/40 rounded-xl py-2 px-1.5 sm:p-3 flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 hidden xs:inline" />
                <span>الإجمالي العام بالموقع</span>
              </div>
              <div className="text-base sm:text-xl font-black text-amber-400 font-mono tabular-nums mt-0.5" dir="ltr">
                {formatPilgrimsCountWithPlus(dashboardPilgrimStats.totalPilgrims)}
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5 font-medium truncate max-w-full">
                عداد الصفحة الرئيسية
              </div>
            </div>
          </div>
        );
      })()}

      {/* Unified Executive Navigation System — Compact 2-Column Mobile Grid */}
      {(() => {
        const isPilgrimsGroupActive =
          activeTab === 'pilgrims' ||
          activeTab === 'busBoarding' ||
          activeTab === 'flightsList' ||
          activeTab === 'housingList' ||
          activeTab === 'healthList' ||
          activeTab === 'excluded';
        const isReligiousGroupActive =
          activeTab === 'religiousGuidance' ||
          activeTab === 'marjiList' ||
          activeTab === 'hajjTimeline';
        const isFinanceGroupActive = activeTab === 'paymentsList' || activeTab === 'packages';
        const isGiftsGroupActive =
          activeTab === 'giftDashboard' ||
          activeTab === 'giftRegistry' ||
          activeTab === 'giftFollowUp' ||
          activeTab === 'giftReports';
        const isSettingsGroupActive = activeTab === 'settings' || activeTab === 'staff' || activeTab === 'activityLog';

        const mainCardBaseClass =
          'w-full min-h-[58px] sm:min-h-[64px] text-right p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 relative overflow-hidden group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1221] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99]';
        const mainCardActiveClass =
          'bg-amber-500/10 border-amber-500/60 text-white shadow-md shadow-amber-500/5';
        const mainCardExpandedClass =
          'bg-[#131F38] border-amber-500/35 text-white shadow-sm';
        const mainCardDefaultClass =
          'bg-[#10192D] hover:bg-[#15223B] border-slate-800/90 hover:border-slate-700 text-slate-200 hover:text-white shadow-sm';

        const subCardBaseClass =
          'w-full min-h-[44px] sm:min-h-[50px] text-right px-3 sm:px-4 py-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5 relative overflow-hidden group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#070C18] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99]';
        const subCardActiveClass =
          'bg-gradient-to-l from-amber-500/[0.18] via-amber-500/[0.08] to-[#0D1628] border-amber-500/55 text-amber-300 shadow-sm';
        const subCardDefaultClass =
          'bg-[#0D1628] hover:bg-[#13203A] border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white';

        return (
          <nav
            aria-label="القوائم الرئيسية والفرعية للوحة التحكم"
            className="bg-[#0B1221] border border-slate-800/90 p-3.5 sm:p-5 rounded-2xl shadow-md space-y-3.5"
          >
            {/* Header Bar of Navigation */}
            <div className="flex items-center justify-between gap-2 px-1 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-amber-400" />
                <span className="text-xs sm:text-sm font-bold text-slate-200">
                  نظام التنقل والأقسام الإدارية
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                اضغط على أي قسم رئيسي لفتح أو إغلاق القوائم الفرعية المرتبطة به أسفله مباشرة
              </span>
            </div>

            {/* Stacked Vertical Navigation System — All main items stacked vertically with sub-menus directly underneath */}
            <div className="flex flex-col gap-2.5">
              {/* 1. لوحة البيانات والإحصائيات */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    setExpandedMainMenu(null);
                  }}
                  aria-current={activeTab === 'dashboard' ? 'page' : undefined}
                  className={`${mainCardBaseClass} ${
                    activeTab === 'dashboard' ? mainCardActiveClass : mainCardDefaultClass
                  }`}
                >
                  {activeTab === 'dashboard' && (
                    <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                  )}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                        activeTab === 'dashboard'
                          ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-[#0B1221] text-amber-400/90 border-slate-800 group-hover:border-amber-500/40 group-hover:text-amber-300'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-[15px] font-bold leading-snug block text-white truncate">
                        لوحة البيانات والإحصائيات
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-relaxed mt-0.5 hidden xs:block sm:block truncate">
                        ملخص ومؤشرات مباشرة
                      </span>
                    </div>
                  </div>
                  {activeTab === 'dashboard' && (
                    <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                      نشط
                    </span>
                  )}
                </button>
              </div>

              {/* 2. إدارة الحجاج (Main Menu with 5 Sub-Menus) */}
              {canAccessPilgrimsMenu && (
                <div className="space-y-2">
                  <div>
                    <button
                      type="button"
                      aria-expanded={expandedMainMenu === 'pilgrimsGroup'}
                      onClick={() => {
                        if (!isPilgrimsGroupActive) {
                          if (currentAdminUser?.permissions?.managePilgrims) {
                            setActiveTab('pilgrims');
                          } else {
                            setActiveTab('marjiList');
                          }
                          setStatusFilter('all');
                          setExpandedMainMenu('pilgrimsGroup');
                        } else {
                          setExpandedMainMenu((prev) => (prev === 'pilgrimsGroup' ? null : 'pilgrimsGroup'));
                        }
                      }}
                      className={`${mainCardBaseClass} ${
                        isPilgrimsGroupActive
                          ? mainCardActiveClass
                          : expandedMainMenu === 'pilgrimsGroup'
                          ? mainCardExpandedClass
                          : mainCardDefaultClass
                      }`}
                    >
                      {isPilgrimsGroupActive && (
                        <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                      )}
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                            isPilgrimsGroupActive
                              ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-sm'
                              : 'bg-[#0B1221] text-amber-400/90 border-slate-800 group-hover:border-amber-500/40 group-hover:text-amber-300'
                          }`}
                        >
                          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-[15px] font-bold leading-snug block text-white truncate">
                            إدارة الحجاج
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-relaxed mt-0.5 hidden xs:block sm:block truncate">
                            السجل، الحافلات، الطيران، السكن
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {isPilgrimsGroupActive ? (
                          <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            نشط
                          </span>
                        ) : (
                          <span
                            className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono tabular-nums font-bold border bg-[#0B1221] text-slate-200 border-slate-800"
                            title="الحجاج المسجلون النشطون"
                          >
                            {activePilgrims.length}
                          </span>
                        )}
                        <span
                          className={`w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center border transition-all duration-200 ${
                            expandedMainMenu === 'pilgrimsGroup'
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                              : 'bg-[#0B1221]/80 border-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:border-slate-700'
                          }`}
                          title="يحتوي على 5 قوائم فرعية"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              expandedMainMenu === 'pilgrimsGroup' ? 'rotate-180' : ''
                            }`}
                          />
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Accordion Sub-Menu for إدارة الحجاج directly underneath */}
                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      expandedMainMenu === 'pilgrimsGroup'
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="mr-1 sm:mr-6 pr-2 sm:pr-4 border-r-2 border-amber-500/40 pt-1 pb-1">
                        <div className="bg-[#070C18] border border-slate-800/90 rounded-2xl p-2.5 sm:p-4 space-y-2.5 shadow-inner">
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80 px-1">
                            <div className="flex items-center gap-2">
                              <CornerDownLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-xs font-bold text-amber-400">
                                القوائم الفرعية — إدارة الحجاج
                              </span>
                            </div>
                            <span className="text-[11px] font-mono tabular-nums text-slate-400">
                              5 أقسام فرعية
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                            {/* Sub 1: سجل الحجاج */}
                            {currentAdminUser?.permissions.managePilgrims && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('pilgrims');
                                  setStatusFilter('all');
                                }}
                                className={`${subCardBaseClass} ${
                                  activeTab === 'pilgrims' || activeTab === 'excluded'
                                    ? subCardActiveClass
                                    : subCardDefaultClass
                                }`}
                              >
                                {(activeTab === 'pilgrims' || activeTab === 'excluded') && (
                                  <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                                )}
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                      activeTab === 'pilgrims' || activeTab === 'excluded'
                                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                                        : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                    }`}
                                  >
                                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                      سجل الحجاج
                                    </span>
                                    <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                      السجل والمستبعدين
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span
                                    className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border ${
                                      activeTab === 'pilgrims' || activeTab === 'excluded'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        : 'bg-[#090F1D] text-slate-400 border-slate-800'
                                    }`}
                                  >
                                    {activePilgrims.length}
                                  </span>
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                      activeTab === 'pilgrims' || activeTab === 'excluded'
                                        ? 'rotate-180 text-amber-400'
                                        : 'text-slate-500'
                                    }`}
                                  />
                                </div>
                              </button>
                            )}

                            {/* Sub 2: رحلات الحافلات */}
                            {currentAdminUser?.permissions.managePilgrims && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('busBoarding');
                                  setBusFilter('all');
                                  setBusCapacityWarning(null);
                                }}
                                className={`${subCardBaseClass} ${
                                  activeTab === 'busBoarding' ? subCardActiveClass : subCardDefaultClass
                                }`}
                              >
                                {activeTab === 'busBoarding' && (
                                  <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                                )}
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                      activeTab === 'busBoarding'
                                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                                        : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                    }`}
                                  >
                                    <Bus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                      رحلات الحافلات
                                    </span>
                                    <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                      النقل البري والمقاعد
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                                    activeTab === 'busBoarding'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800'
                                  }`}
                                >
                                  {busPilgrimsList.length}
                                </span>
                              </button>
                            )}

                            {/* Sub 3: رحلات الطيران */}
                            {currentAdminUser?.permissions.managePilgrims && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('flightsList');
                                  setFlightFilter('flight_pilgrims');
                                }}
                                className={`${subCardBaseClass} ${
                                  activeTab === 'flightsList' ? subCardActiveClass : subCardDefaultClass
                                }`}
                              >
                                {activeTab === 'flightsList' && (
                                  <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                                )}
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                      activeTab === 'flightsList'
                                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                                        : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                    }`}
                                  >
                                    <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                      رحلات الطيران
                                    </span>
                                    <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                      النقل الجوي والتذاكر
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                                    activeTab === 'flightsList'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800'
                                  }`}
                                >
                                  {airPilgrimsList.length}
                                </span>
                              </button>
                            )}

                            {/* Sub 4: السكن والفنادق */}
                            {currentAdminUser?.permissions.managePilgrims && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('housingList');
                                  setHousingFilter('all');
                                }}
                                className={`${subCardBaseClass} ${
                                  activeTab === 'housingList' ? subCardActiveClass : subCardDefaultClass
                                }`}
                              >
                                {activeTab === 'housingList' && (
                                  <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                                )}
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                      activeTab === 'housingList'
                                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                                        : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                    }`}
                                  >
                                    <Hotel className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                      السكن والفنادق
                                    </span>
                                    <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                      مكة والمدينة ومنى
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                                    activeTab === 'housingList'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800'
                                  }`}
                                >
                                  {activePilgrims.length}
                                </span>
                              </button>
                            )}

                            {/* Sub 5: الحالات الصحية */}
                            {currentAdminUser?.permissions.managePilgrims && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('healthList');
                                  setHealthFilter('all');
                                }}
                                className={`${subCardBaseClass} ${
                                  activeTab === 'healthList' ? subCardActiveClass : subCardDefaultClass
                                }`}
                              >
                                {activeTab === 'healthList' && (
                                  <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                                )}
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                      activeTab === 'healthList'
                                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                                        : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                    }`}
                                  >
                                    <HeartPulse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                      الحالات الصحية
                                    </span>
                                    <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                      الرعاية والمتابعة الطبية
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                                    activeTab === 'healthList'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800'
                                  }`}
                                >
                                  {pilgrimsWithHealthConditionsCount}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Level-3 Nested Sub-Menu inside سجل الحجاج (Active Pilgrims vs Excluded List) */}
                          <div
                            className={`grid transition-all duration-200 ease-out ${
                              (activeTab === 'pilgrims' || activeTab === 'excluded') &&
                              currentAdminUser?.permissions.managePilgrims
                                ? 'grid-rows-[1fr] opacity-100 pt-2 border-t border-slate-800/80'
                                : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="mr-1 sm:mr-5 pr-2 sm:pr-4 border-r-2 border-amber-500/30 space-y-2">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                  <CornerDownLeft className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>أقسام سجل الحجاج:</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('pilgrims');
                                      setStatusFilter('all');
                                    }}
                                    className={`w-full min-h-[42px] sm:min-h-[44px] text-right px-3 py-2 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2 relative overflow-hidden group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                                      activeTab === 'pilgrims'
                                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-bold'
                                        : 'bg-[#0A1120] hover:bg-[#101B30] border-slate-800/80 text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    {activeTab === 'pilgrims' && (
                                      <span className="absolute right-0 top-1.5 bottom-1.5 w-1 bg-amber-400 rounded-l-full" />
                                    )}
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div
                                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                          activeTab === 'pilgrims'
                                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                                            : 'bg-[#070C18] text-slate-400 border-slate-800'
                                        }`}
                                      >
                                        <UserCheck className="w-3.5 h-3.5" />
                                      </div>
                                      <span className="text-xs font-bold leading-snug truncate">
                                        الحجاج المسجلين (النشطين)
                                      </span>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[11px] font-mono tabular-nums font-bold ${
                                        activeTab === 'pilgrims'
                                          ? 'bg-amber-500 text-slate-950'
                                          : 'bg-[#070C18] text-slate-400 border border-slate-800'
                                      }`}
                                    >
                                      {activePilgrims.length}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('excluded');
                                      setStatusFilter('all');
                                    }}
                                    className={`w-full min-h-[42px] sm:min-h-[44px] text-right px-3 py-2 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2 relative overflow-hidden group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                                      activeTab === 'excluded'
                                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-bold'
                                        : 'bg-[#0A1120] hover:bg-[#101B30] border-slate-800/80 text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    {activeTab === 'excluded' && (
                                      <span className="absolute right-0 top-1.5 bottom-1.5 w-1 bg-amber-400 rounded-l-full" />
                                    )}
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div
                                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                          activeTab === 'excluded'
                                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                                            : 'bg-[#070C18] text-slate-400 border-slate-800'
                                        }`}
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                      </div>
                                      <span className="text-xs font-bold leading-snug truncate">
                                        قائمة المستبعدين
                                      </span>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[11px] font-mono tabular-nums font-bold ${
                                        activeTab === 'excluded'
                                          ? 'bg-amber-500 text-slate-950'
                                          : 'bg-[#070C18] text-slate-400 border border-slate-800'
                                      }`}
                                    >
                                      {excludedPilgrimsList.length}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. الإرشاد الديني (Main Menu with 11 Integrated Units + Legacy Quick Links) */}
              {hasReligiousSupervisionPermission && (
                <div className="space-y-2">
                  <div>
                    <button
                      type="button"
                      aria-expanded={expandedMainMenu === 'religiousGroup'}
                      onClick={() => {
                        if (!isReligiousGroupActive) {
                          setActiveTab('religiousGuidance');
                          setSelectedReligiousUnit('dashboard');
                          setExpandedMainMenu('religiousGroup');
                        } else {
                          setExpandedMainMenu((prev) => (prev === 'religiousGroup' ? null : 'religiousGroup'));
                        }
                      }}
                      className={`${mainCardBaseClass} ${
                        isReligiousGroupActive
                          ? mainCardActiveClass
                          : expandedMainMenu === 'religiousGroup'
                          ? mainCardExpandedClass
                          : mainCardDefaultClass
                      }`}
                    >
                      {isReligiousGroupActive && (
                        <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                      )}
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                            isReligiousGroupActive
                              ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-sm'
                              : 'bg-[#0B1221] text-amber-400/90 border-slate-800 group-hover:border-amber-500/40 group-hover:text-amber-300'
                          }`}
                        >
                          <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-[15px] font-bold leading-snug block text-white truncate">
                            منظومة الإرشاد الديني
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-relaxed mt-0.5 hidden xs:block sm:block truncate">
                            التوعية والملفات التعليمية والدروس والفتاوى (11 وحدة)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {isReligiousGroupActive ? (
                          <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            نشط
                          </span>
                        ) : (
                          <span
                            className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono tabular-nums font-bold border bg-[#0B1221] text-slate-200 border-slate-800"
                          >
                            11 وحدة
                          </span>
                        )}
                        <span
                          className={`w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center border transition-all duration-200 ${
                            expandedMainMenu === 'religiousGroup'
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                              : 'bg-[#0B1221]/80 border-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:border-slate-700'
                          }`}
                          title="يحتوي على وحدات منظومة الإرشاد الديني"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              expandedMainMenu === 'religiousGroup' ? 'rotate-180' : ''
                            }`}
                          />
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Accordion Sub-Menu for الإرشاد الديني directly underneath */}
                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      expandedMainMenu === 'religiousGroup'
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="mr-1 sm:mr-6 pr-2 sm:pr-4 border-r-2 border-amber-500/40 pt-1 pb-1">
                        <div className="bg-[#070C18] border border-slate-800/90 rounded-2xl p-2.5 sm:p-4 space-y-2.5 shadow-inner">
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80 px-1">
                            <div className="flex items-center gap-2">
                              <CornerDownLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-xs font-bold text-amber-400">
                                وحدات منظومة الإرشاد الديني المتكاملة (قبل وأثناء وبعد الحج)
                              </span>
                            </div>
                            <span className="text-[11px] font-mono tabular-nums text-slate-400">
                              11 وحدة تخصصية + قسمان سريعان
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {RELIGIOUS_11_UNITS.map((unit) => {
                              const UnitIcon = unit.icon;
                              const isUnitActive =
                                activeTab === 'religiousGuidance' &&
                                selectedReligiousUnit === unit.key;
                              return (
                                <button
                                  key={unit.key}
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('religiousGuidance');
                                    setSelectedReligiousUnit(unit.key);
                                  }}
                                  className={`${subCardBaseClass} ${
                                    isUnitActive ? subCardActiveClass : subCardDefaultClass
                                  }`}
                                >
                                  {isUnitActive && (
                                    <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                                  )}
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div
                                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                        isUnitActive
                                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                                          : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                      }`}
                                    >
                                      <UnitIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                        {unit.title}
                                      </span>
                                      <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                        {unit.shortDesc}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}

                            {/* Preserved Direct Quick Links for marjiList & hajjTimeline */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('marjiList');
                                setMarjiFilter('all');
                              }}
                              className={`${subCardBaseClass} ${
                                activeTab === 'marjiList' ? subCardActiveClass : subCardDefaultClass
                              }`}
                            >
                              {activeTab === 'marjiList' && (
                                <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                              )}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                    activeTab === 'marjiList'
                                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                  }`}
                                >
                                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                    كشف المراجع الدينية (سريع)
                                  </span>
                                  <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                    توزيع الحجاج حسب مرجع التقليد
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                                  activeTab === 'marjiList'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-[#090F1D] text-slate-400 border-slate-800'
                                }`}
                              >
                                {activePilgrims.length}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveTab('hajjTimeline')}
                              className={`${subCardBaseClass} ${
                                activeTab === 'hajjTimeline' ? subCardActiveClass : subCardDefaultClass
                              }`}
                            >
                              {activeTab === 'hajjTimeline' && (
                                <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                              )}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                    activeTab === 'hajjTimeline'
                                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                    دليل الحاج وخطة سير الرحلة (سريع)
                                  </span>
                                  <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                    جدول أيام المناسك والتوجيهات
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                                  activeTab === 'hajjTimeline'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-[#090F1D] text-slate-400 border-slate-800'
                                }`}
                              >
                                {timelineDays.length}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. الإعلانات والدروس */}
              {currentAdminUser?.permissions.manageAnnouncements && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('announcements');
                      setExpandedMainMenu(null);
                    }}
                    aria-current={activeTab === 'announcements' ? 'page' : undefined}
                    className={`${mainCardBaseClass} ${
                      activeTab === 'announcements' ? mainCardActiveClass : mainCardDefaultClass
                    }`}
                  >
                    {activeTab === 'announcements' && (
                      <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                    )}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                          activeTab === 'announcements'
                            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-sm'
                            : 'bg-[#0B1221] text-amber-400/90 border-slate-800 group-hover:border-amber-500/40 group-hover:text-amber-300'
                        }`}
                      >
                        <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs sm:text-[15px] font-bold leading-snug block text-white truncate">
                          الإعلانات والدروس
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-relaxed mt-0.5 hidden xs:block sm:block truncate">
                          المستجدات والمرئيات وبث يوتيوب
                        </span>
                      </div>
                    </div>
                    {activeTab === 'announcements' ? (
                      <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                        نشط
                      </span>
                    ) : (
                      <span
                        className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono tabular-nums font-bold border bg-[#0B1221] text-slate-200 border-slate-800 shrink-0"
                      >
                        {announcements.length}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* 5. إدارة وبث الإشعارات */}
              {canManageNotifications && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('notifications');
                      setExpandedMainMenu(null);
                    }}
                    aria-current={activeTab === 'notifications' ? 'page' : undefined}
                    className={`${mainCardBaseClass} ${
                      activeTab === 'notifications' ? mainCardActiveClass : mainCardDefaultClass
                    }`}
                  >
                    {activeTab === 'notifications' && (
                      <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                    )}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                          activeTab === 'notifications'
                            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-sm'
                            : 'bg-[#0B1221] text-amber-400/90 border-slate-800 group-hover:border-amber-500/40 group-hover:text-amber-300'
                        }`}
                      >
                        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs sm:text-[15px] font-bold leading-snug block text-white truncate">
                          مركز إدارة وبث الإشعارات
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-relaxed mt-0.5 hidden xs:block sm:block truncate">
                          بث فوري ومجدول حسب الباقات والمجموعات
                        </span>
                      </div>
                    </div>
                    {activeTab === 'notifications' ? (
                      <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                        نشط
                      </span>
                    ) : (
                      <span
                        className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono tabular-nums font-bold border bg-[#0B1221] text-slate-200 border-slate-800 shrink-0"
                      >
                        {notifications.length}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* 6. الإدارة المالية (Main Menu with 2 Sub-Menus) */}
              {canAccessFinanceMenu && (
                <div className="space-y-2">
                  <div>
                    <button
                      type="button"
                      aria-expanded={expandedMainMenu === 'financeGroup'}
                      onClick={() => {
                        if (!isFinanceGroupActive) {
                          setActiveTab('paymentsList');
                          setExpandedMainMenu('financeGroup');
                        } else {
                          setExpandedMainMenu((prev) => (prev === 'financeGroup' ? null : 'financeGroup'));
                        }
                      }}
                      className={`${mainCardBaseClass} ${
                        isFinanceGroupActive
                          ? mainCardActiveClass
                          : expandedMainMenu === 'financeGroup'
                          ? mainCardExpandedClass
                          : mainCardDefaultClass
                      }`}
                    >
                      {isFinanceGroupActive && (
                        <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                      )}
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                            isFinanceGroupActive
                              ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-sm'
                              : 'bg-[#0B1221] text-amber-400/90 border-slate-800 group-hover:border-amber-500/40 group-hover:text-amber-300'
                          }`}
                        >
                          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-[15px] font-bold leading-snug block text-white truncate">
                            الإدارة المالية
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-relaxed mt-0.5 hidden xs:block sm:block truncate">
                            كشف المدفوعات وإدارة الباقات
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {isFinanceGroupActive ? (
                          <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            نشط
                          </span>
                        ) : (
                          <span
                            className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono tabular-nums font-bold border bg-[#0B1221] text-emerald-400 border-emerald-500/30"
                            title="عدد الحجاج المؤكد دفعهم"
                          >
                            {activePilgrims.filter((p) => isPilgrimPaymentConfirmed(p)).length}
                          </span>
                        )}
                        <span
                          className={`w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center border transition-all duration-200 ${
                            expandedMainMenu === 'financeGroup'
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                              : 'bg-[#0B1221]/80 border-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:border-slate-700'
                          }`}
                          title="يحتوي على قائمتين فرعيتين"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              expandedMainMenu === 'financeGroup' ? 'rotate-180' : ''
                            }`}
                          />
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Accordion Sub-Menu for الإدارة المالية directly underneath */}
                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      expandedMainMenu === 'financeGroup'
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="mr-1 sm:mr-6 pr-2 sm:pr-4 border-r-2 border-amber-500/40 pt-1 pb-1">
                        <div className="bg-[#070C18] border border-slate-800/90 rounded-2xl p-2.5 sm:p-4 space-y-2.5 shadow-inner">
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80 px-1">
                            <div className="flex items-center gap-2">
                              <CornerDownLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-xs font-bold text-amber-400">
                                القوائم الفرعية — الإدارة المالية
                              </span>
                            </div>
                            <span className="text-[11px] font-mono tabular-nums text-slate-400">
                              قسمان فرعيان
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveTab('paymentsList')}
                              className={`${subCardBaseClass} ${
                                activeTab === 'paymentsList' ? subCardActiveClass : subCardDefaultClass
                              }`}
                            >
                              {activeTab === 'paymentsList' && (
                                <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                              )}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                    activeTab === 'paymentsList'
                                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                  }`}
                                >
                                  <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                    كشف المبالغ المدفوعة
                                  </span>
                                  <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                    سجل الدفعات المؤكدة
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                                  activeTab === 'paymentsList'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-[#090F1D] text-slate-400 border-slate-800'
                                }`}
                              >
                                {activePilgrims.filter((p) => isPilgrimPaymentConfirmed(p)).length}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveTab('packages')}
                              className={`${subCardBaseClass} ${
                                activeTab === 'packages' ? subCardActiveClass : subCardDefaultClass
                              }`}
                            >
                              {activeTab === 'packages' && (
                                <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                              )}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                    activeTab === 'packages'
                                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                  }`}
                                >
                                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                    إدارة الباقات والأسعار
                                  </span>
                                  <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                    تعديل الأسعار والمواصفات
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                                  activeTab === 'packages'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-[#090F1D] text-slate-400 border-slate-800'
                                }`}
                              >
                                {packages.length}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* إدارة وتوزيع هدايا الحجاج */}
              {canManageGifts && (
                <div className="space-y-2">
                  <div>
                    <button
                      type="button"
                      aria-expanded={expandedMainMenu === 'giftsGroup'}
                      onClick={() => {
                        if (!isGiftsGroupActive) {
                          setActiveTab('giftDashboard');
                          setExpandedMainMenu('giftsGroup');
                        } else {
                          setExpandedMainMenu((prev) => (prev === 'giftsGroup' ? null : 'giftsGroup'));
                        }
                      }}
                      className={`${mainCardBaseClass} ${
                        isGiftsGroupActive
                          ? mainCardActiveClass
                          : expandedMainMenu === 'giftsGroup'
                          ? mainCardExpandedClass
                          : mainCardDefaultClass
                      }`}
                    >
                      {isGiftsGroupActive && (
                        <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                      )}
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                            isGiftsGroupActive
                              ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-sm'
                              : 'bg-[#0B1221] text-amber-400/90 border-slate-800 group-hover:border-amber-500/40 group-hover:text-amber-300'
                          }`}
                        >
                          <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-[15px] font-bold leading-snug block text-white truncate">
                            إدارة توزيع هدايا الحجاج
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-relaxed mt-0.5 hidden xs:block sm:block truncate">
                            توثيق الاستلام، متابعة غير المستلمين، والتقارير
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {isGiftsGroupActive ? (
                          <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            نشط
                          </span>
                        ) : (
                          <span
                            className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono tabular-nums font-bold border bg-[#0B1221] text-amber-400 border-amber-500/30"
                            title="إجمالي الحجاج المخصص لهم هدايا"
                          >
                            {activePilgrims.length}
                          </span>
                        )}
                        <span
                          className={`w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center border transition-all duration-200 ${
                            expandedMainMenu === 'giftsGroup'
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                              : 'bg-[#0B1221]/80 border-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:border-slate-700'
                          }`}
                          title="يحتوي على 4 أقسام فرعية"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              expandedMainMenu === 'giftsGroup' ? 'rotate-180' : ''
                            }`}
                          />
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Accordion Sub-Menu for توزيع الهدايا directly underneath */}
                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      expandedMainMenu === 'giftsGroup'
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="mr-1 sm:mr-6 pr-2 sm:pr-4 border-r-2 border-amber-500/40 pt-1 pb-1">
                        <div className="bg-[#070C18] border border-slate-800/90 rounded-2xl p-2.5 sm:p-4 space-y-2.5 shadow-inner">
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80 px-1">
                            <div className="flex items-center gap-2">
                              <CornerDownLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-xs font-bold text-amber-400">
                                القوائم الفرعية — توزيع هدايا الحجاج
                              </span>
                            </div>
                            <span className="text-[11px] font-mono tabular-nums text-slate-400">
                              4 أقسام رئيسية
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* 1. لوحة التحكم */}
                            <button
                              type="button"
                              onClick={() => setActiveTab('giftDashboard')}
                              className={`${subCardBaseClass} ${
                                activeTab === 'giftDashboard' ? subCardActiveClass : subCardDefaultClass
                              }`}
                            >
                              {activeTab === 'giftDashboard' && (
                                <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                              )}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                    activeTab === 'giftDashboard'
                                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                  }`}
                                >
                                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                    لوحة التحكم والإحصائيات
                                  </span>
                                  <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                    مؤشرات الإنجاز والرسوم البيانية
                                  </span>
                                </div>
                              </div>
                            </button>

                            {/* 2. سجل توزيع الهدايا */}
                            <button
                              type="button"
                              onClick={() => setActiveTab('giftRegistry')}
                              className={`${subCardBaseClass} ${
                                activeTab === 'giftRegistry' ? subCardActiveClass : subCardDefaultClass
                              }`}
                            >
                              {activeTab === 'giftRegistry' && (
                                <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                              )}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                    activeTab === 'giftRegistry'
                                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                  }`}
                                >
                                  <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                    سجل توزيع الهدايا
                                  </span>
                                  <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                    كافة الحجاج والبحث والتسليم
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                                  activeTab === 'giftRegistry'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-[#090F1D] text-slate-400 border-slate-800'
                                }`}
                              >
                                {activePilgrims.length}
                              </span>
                            </button>

                            {/* 3. متابعة غير المستلمين */}
                            <button
                              type="button"
                              onClick={() => setActiveTab('giftFollowUp')}
                              className={`${subCardBaseClass} ${
                                activeTab === 'giftFollowUp' ? subCardActiveClass : subCardDefaultClass
                              }`}
                            >
                              {activeTab === 'giftFollowUp' && (
                                <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                              )}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                    activeTab === 'giftFollowUp'
                                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                    متابعة غير المستلمين
                                  </span>
                                  <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                    سجل الاتصالات والمواعيد القادمة
                                  </span>
                                </div>
                              </div>
                            </button>

                            {/* 4. منظومة التقارير */}
                            <button
                              type="button"
                              onClick={() => setActiveTab('giftReports')}
                              className={`${subCardBaseClass} ${
                                activeTab === 'giftReports' ? subCardActiveClass : subCardDefaultClass
                              }`}
                            >
                              {activeTab === 'giftReports' && (
                                <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                              )}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                    activeTab === 'giftReports'
                                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                                      : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                  }`}
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                    منظومة التقارير الشاملة
                                  </span>
                                  <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                    13 تقريراً مع الطباعة و Excel
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border shrink-0 ${
                                  activeTab === 'giftReports'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-[#090F1D] text-amber-400 border-amber-500/30'
                                }`}
                              >
                                13
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. تقييمات وملاحظات الحجاج */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('feedback');
                    setExpandedMainMenu(null);
                  }}
                  aria-current={activeTab === 'feedback' ? 'page' : undefined}
                  className={`${mainCardBaseClass} ${
                    activeTab === 'feedback' ? mainCardActiveClass : mainCardDefaultClass
                  }`}
                >
                  {activeTab === 'feedback' && (
                    <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                  )}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                        activeTab === 'feedback'
                          ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-[#0B1221] text-amber-400/90 border-slate-800 group-hover:border-amber-500/40 group-hover:text-amber-300'
                      }`}
                    >
                      <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-[15px] font-bold leading-snug block text-white truncate">
                        تقييمات الحجاج
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-relaxed mt-0.5 hidden xs:block sm:block truncate">
                        آراء ومقترحات التطوير
                      </span>
                    </div>
                  </div>
                  {activeTab === 'feedback' ? (
                    <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                      نشط
                    </span>
                  ) : (
                    <span
                      className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono tabular-nums font-bold border bg-[#0B1221] text-slate-200 border-slate-800 shrink-0"
                    >
                      {feedback.length}
                    </span>
                  )}
                </button>
              </div>

              {/* 7. إعدادات القافلة (Main Menu with 3 Sub-Menus) */}
              <div className="space-y-2">
                <div>
                  <button
                    type="button"
                    aria-expanded={expandedMainMenu === 'settingsGroup'}
                    onClick={() => {
                      if (!isSettingsGroupActive) {
                        setActiveTab('settings');
                        setExpandedMainMenu('settingsGroup');
                      } else {
                        setExpandedMainMenu((prev) => (prev === 'settingsGroup' ? null : 'settingsGroup'));
                      }
                    }}
                    className={`${mainCardBaseClass} ${
                      isSettingsGroupActive
                        ? mainCardActiveClass
                        : expandedMainMenu === 'settingsGroup'
                        ? mainCardExpandedClass
                        : mainCardDefaultClass
                    }`}
                  >
                    {isSettingsGroupActive && (
                      <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                    )}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                          isSettingsGroupActive
                            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-sm'
                            : 'bg-[#0B1221] text-amber-400/90 border-slate-800 group-hover:border-amber-500/40 group-hover:text-amber-300'
                        }`}
                      >
                        <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs sm:text-[15px] font-bold leading-snug block text-white truncate">
                          إعدادات القافلة
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-relaxed mt-0.5 hidden xs:block sm:block truncate">
                          الإعدادات والمشرفون وسجل النشاط
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      {isSettingsGroupActive ? (
                        <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                          نشط
                        </span>
                      ) : isMasterAdmin ? (
                        <span
                          className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono tabular-nums font-bold border bg-[#0B1221] text-slate-200 border-slate-800"
                          title="عدد المشرفين"
                        >
                          {adminUsers.length}
                        </span>
                      ) : null}
                      <span
                        className={`w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center border transition-all duration-200 ${
                          expandedMainMenu === 'settingsGroup'
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                            : 'bg-[#0B1221]/80 border-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:border-slate-700'
                        }`}
                        title="يحتوي على قوائم فرعية"
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            expandedMainMenu === 'settingsGroup' ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                    </div>
                  </button>
                </div>

                {/* Accordion Sub-Menu for إعدادات القافلة directly underneath */}
                <div
                  className={`grid transition-all duration-200 ease-out ${
                    expandedMainMenu === 'settingsGroup'
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                <div className="overflow-hidden">
                  <div className="mr-1 sm:mr-6 pr-2 sm:pr-4 border-r-2 border-amber-500/40 pt-1 pb-1">
                    <div className="bg-[#070C18] border border-slate-800/90 rounded-2xl p-2.5 sm:p-4 space-y-2.5 shadow-inner">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80 px-1">
                        <div className="flex items-center gap-2">
                          <CornerDownLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-xs font-bold text-amber-400">
                            القوائم الفرعية — إعدادات القافلة
                          </span>
                        </div>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">
                          {canManageStaffAndRoles ? '3 أقسام فرعية' : 'قسم فرعي'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('settings')}
                          className={`${subCardBaseClass} ${
                            activeTab === 'settings' ? subCardActiveClass : subCardDefaultClass
                          }`}
                        >
                          {activeTab === 'settings' && (
                            <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                          )}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                activeTab === 'settings'
                                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                                  : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                              }`}
                            >
                              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                إعدادات القافلة والتواصل
                              </span>
                              <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                بيانات التواصل والتصدير
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                              activeTab === 'settings'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-[#090F1D] text-slate-400 border-slate-800'
                            }`}
                          >
                            {pilgrims.length}
                          </span>
                        </button>

                        {canManageStaffAndRoles && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('staff')}
                            className={`${subCardBaseClass} ${
                              activeTab === 'staff' ? subCardActiveClass : subCardDefaultClass
                            }`}
                          >
                            {activeTab === 'staff' && (
                              <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                            )}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                  activeTab === 'staff'
                                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                                    : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                }`}
                              >
                                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                  المشرفون والصلاحيات
                                </span>
                                <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                  نظام الأدوار الـ 5 والصلاحيات التفصيلية
                                </span>
                              </div>
                            </div>
                            <span
                              className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                                activeTab === 'staff'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-[#090F1D] text-slate-400 border-slate-800'
                              }`}
                            >
                              {adminUsers.length}
                            </span>
                          </button>
                        )}

                        {canManageStaffAndRoles && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('activityLog')}
                            className={`${subCardBaseClass} ${
                              activeTab === 'activityLog' ? subCardActiveClass : subCardDefaultClass
                            }`}
                          >
                            {activeTab === 'activityLog' && (
                              <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                            )}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                  activeTab === 'activityLog'
                                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                                    : 'bg-[#090F1D] text-slate-400 border-slate-800 group-hover:text-amber-400'
                                }`}
                              >
                                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs sm:text-[13px] font-bold leading-snug block truncate">
                                  سجل النشاطات والرقابة
                                </span>
                                <span className="text-[10px] text-slate-400 hidden xs:block truncate">
                                  توثيق دخول وعمليات النظام
                                </span>
                              </div>
                            </div>
                            <span
                              className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono tabular-nums font-bold border shrink-0 ${
                                activeTab === 'activityLog'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-[#090F1D] text-slate-400 border-slate-800'
                              }`}
                            >
                              {activityLogs.length}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
        );
      })()}

      {/* TAB 0: ROLE-SPECIFIC WORKSPACE & ANALYTICS DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {currentAdminUser && (
            <RoleDashboardWorkspace
              currentAdminUser={currentAdminUser}
              activePilgrims={activePilgrims}
              packages={packages}
              announcements={announcements}
              adminUsers={adminUsers}
              campaignSettings={campaignSettings}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />
          )}

          {(isMasterAdmin || canViewPilgrimsModule || hasFinancePermission) && (
            <AdminAnalyticsDashboard
              pilgrims={activePilgrims}
              packages={packages}
              announcements={announcements}
              feedback={feedback}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onExportCSV={() => handleExportCSV(activePilgrims, 'الحجاج_المسجلين')}
            />
          )}
        </div>
      )}

      {/* TAB 1: PILGRIMS MANAGEMENT */}
      {activeTab === 'pilgrims' && canViewPilgrimsModule && (
        <div className="space-y-6">
          {/* Unified Header & Segmented Stats Banner (Matches Housing Manifest Style) */}
          <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-blue-500/30 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>سجل الحجاج المسجلين ومراجعة الطلبات</span>
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950">
                    موسم 1448هـ
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
                  السجل الشامل لكافة الحجاج المسجلين في القافلة، تدقيق الهويات الوطنية، مراجعة إيصالات السداد، وتعديل بيانات الحاج والباقة ووسيلة المواصلات.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-auto flex items-center justify-end">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-around sm:justify-start gap-3 sm:gap-4 shadow-sm w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`text-right transition cursor-pointer ${statusFilter === 'all' ? 'opacity-100 underline decoration-amber-500 decoration-2 underline-offset-4' : 'opacity-85 hover:opacity-100'}`}
                >
                  <span className="text-[11px] text-slate-400 block font-bold">إجمالي الحجاج</span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white">{totalPilgrimsCount} حاج</strong>
                </button>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <button
                  type="button"
                  onClick={() => setStatusFilter('مكتمل')}
                  className={`text-right transition cursor-pointer ${statusFilter === 'مكتمل' || statusFilter === 'مكتمل الدفع' ? 'opacity-100 underline decoration-emerald-500 decoration-2 underline-offset-4' : 'opacity-85 hover:opacity-100'}`}
                >
                  <span className="text-[11px] text-emerald-500 block font-bold">مؤكد الدفع</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{confirmedPaymentsCount}</strong>
                </button>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <button
                  type="button"
                  onClick={() => setStatusFilter('قيد المراجعة')}
                  className={`text-right transition cursor-pointer ${statusFilter === 'قيد المراجعة' ? 'opacity-100 underline decoration-amber-500 decoration-2 underline-offset-4' : 'opacity-85 hover:opacity-100'}`}
                >
                  <span className="text-[11px] text-amber-500 block font-bold">قيد المراجعة</span>
                  <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{pendingReviewCount}</strong>
                </button>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <button
                  type="button"
                  onClick={() => setStatusFilter('تم القبول')}
                  className={`text-right transition cursor-pointer ${statusFilter === 'تم القبول' || statusFilter === 'مقبول ومؤكد' ? 'opacity-100 underline decoration-purple-500 decoration-2 underline-offset-4' : 'opacity-85 hover:opacity-100'}`}
                >
                  <span className="text-[11px] text-purple-500 block font-bold">تم القبول</span>
                  <strong className="text-sm font-black text-purple-600 dark:text-purple-400">{acceptedCount}</strong>
                </button>
              </div>
            </div>
          </div>

          {csvExportSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-emerald-500 text-sm flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-bold">{csvExportSuccess}</span>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">الملف جاهز للاستخدام في Excel و Google Sheets</span>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center flex-1">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم الحاج، رقم الهوية، أو رقم التسلسل..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">الموسم:</span>
                <select
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">كافة المواسم ({totalPilgrimsCount})</option>
                  <option value="1448">موسم 1448هـ</option>
                  <option value="previous">المواسم السابقة</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">تصفية بالحالة:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">جميع الحالات النشطة ({totalPilgrimsCount})</option>
                  <option value="قيد المراجعة">قيد المراجعة ({pendingReviewCount})</option>
                  <option value="تم القبول">تم القبول ({acceptedCount})</option>
                  <option value="مكتمل">مكتمل / الدفع مؤكد ({confirmedPaymentsCount})</option>
                </select>
              </div>
            </div>

            {/* CSV Export Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleExportCSV(activePilgrims, 'الحجاج_المسجلين')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs flex items-center gap-2 shadow"
                title="تصدير كافة الحجاج المسجلين النشطين إلى ملف CSV"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير الحجاج المسجلين CSV ({activePilgrims.length})</span>
              </button>

              {(statusFilter !== 'all' || searchQuery.trim() !== '') && filteredPilgrims.length !== activePilgrims.length && (
                <button
                  onClick={() => handleExportCSV(filteredPilgrims, `المفلتر_${statusFilter !== 'all' ? statusFilter : 'بحث'}`)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition text-xs flex items-center gap-2 shadow"
                  title="تصدير نتائج البحث والتصفية فقط"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير المفلتر ({filteredPilgrims.length})</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-slate-900 dark:text-white text-sm">سجل الحجاج المسجلين</span>
                <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold px-3 py-1 rounded-xl text-xs border border-amber-500/30">
                  إجمالي الحجاج في السجل: {activePilgrims.length} حاج
                </span>
              </div>
              {filteredPilgrims.length !== activePilgrims.length && (
                <span className="bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-bold px-3 py-1 rounded-xl text-xs border border-blue-500/30">
                  عدد حجاج نتيجة التصفية: {filteredPilgrims.length} حاج
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-4 text-center font-black text-amber-500 w-12"># (م)</th>
                    <th className="px-6 py-4">اسم الحاج الكامل</th>
                    <th className="px-6 py-4">رقم الهوية</th>
                    <th className="px-6 py-4">الباقة المختارة</th>
                    <th className="px-6 py-4">رقم الجوال</th>
                    <th className="px-6 py-4">المواصلات</th>
                    <th className="px-6 py-4">وصل الدفع</th>
                    <th className="px-6 py-4">الحالة</th>
                    <th className="px-6 py-4">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredPilgrims.map((pilgrim, index) => (
                    <tr key={pilgrim.id || `${pilgrim.nationalId}_${pilgrim.hajjYear || index}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-4 text-center font-mono font-black text-amber-500 text-xs bg-amber-500/5">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{pilgrim.firstName} {pilgrim.secondName} {pilgrim.lastName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25">
                            {pilgrim.hajjYear ? `${pilgrim.hajjYear}هـ` : '1448هـ'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs" dir="ltr">
                        <div className="flex items-center gap-2">
                          <span>{pilgrim.nationalId}</span>
                          {pilgrim.nationalIdImage && (
                            <button
                              onClick={() => setEditingPilgrim(pilgrim)}
                              className="px-2 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-md text-[10px] font-sans font-bold hover:bg-amber-500/25 transition"
                              title="عرض صورة بطاقة الأحوال المرفقة"
                            >
                              بطاقة مرفقة
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-amber-500">{pilgrim.selectedPackage || 'التسجيل العام'}</td>
                      <td className="px-6 py-4 font-mono text-xs" dir="ltr">{pilgrim.mobile}</td>
                      <td className="px-6 py-4">
                        {isPilgrimAirTravel(pilgrim) ? (
                          <span className="inline-flex items-center gap-1.5 bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-lg text-xs font-black whitespace-nowrap">
                            <Plane className="w-3.5 h-3.5" />
                            <span>طائرة</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-black whitespace-nowrap">
                            <Bus className="w-3.5 h-3.5" />
                            <span>باص</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {pilgrim.paymentReceipt ? (
                          <button
                            onClick={() => setViewingReceiptPilgrim(pilgrim)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs transition border border-emerald-500/30 shrink-0"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>عرض قسيمة الدفع</span>
                          </button>
                        ) : pilgrim.bankReferenceNumber ? (
                          <button
                            onClick={() => setViewingReceiptPilgrim(pilgrim)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] rounded-lg"
                            dir="ltr"
                          >
                            #{pilgrim.bankReferenceNumber}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">غير المرفق</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                            pilgrim.status === 'مقبول ومؤكد' || pilgrim.status === 'مكتمل الدفع' || pilgrim.status === 'مكتمل' || pilgrim.status === 'تم القبول'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : pilgrim.status === 'مرفوض'
                              ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                              : pilgrim.status === 'معتذر'
                              ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                              : 'bg-amber-500/15 text-amber-500'
                          }`}>
                            {pilgrim.status}
                          </span>
                          {pilgrim.status === 'مرفوض' && (pilgrim.rejectionReason || pilgrim.statusNotes) && (
                            <span className="text-[11px] text-red-500 dark:text-red-400 font-medium bg-red-500/5 border border-red-500/20 rounded-lg px-2 py-0.5 max-w-[220px] break-words leading-snug">
                              سبب الرفض: {pilgrim.rejectionReason || pilgrim.statusNotes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        {pilgrim.status === 'مكتمل الدفع' ? (
                          <button
                            onClick={() => {
                              const seq = pilgrims.findIndex(p => p.nationalId === pilgrim.nationalId) + 1;
                              setOfficialReceiptPilgrim({
                                ...pilgrim,
                                pilgrimSequenceNumber: seq > 0 ? seq : undefined,
                                membershipNumber: pilgrim.membershipNumber || `QAEM-1448-${pilgrim.registrationReference || '1001'}`
                              });
                            }}
                            className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition cursor-pointer"
                            title="عرض وتحميل سند القبض والدفع المالي الرسمي PDF"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 rounded-xl transition cursor-not-allowed opacity-40"
                            title="سند الدفع غير متاح - يمنع إصدار السند قبل تأكيد الدفع"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingPilgrim(pilgrim)}
                          className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 rounded-xl transition"
                          title="تعديل البيانات"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'تحذير: استبعاد الحاج',
                              message: `هل أنت متأكد من رغبتك في استبعاد الحاج ${pilgrim.firstName} ${pilgrim.lastName} ونقله لكشف المستبعدين؟`,
                              onConfirm: () => {
                                onUpdatePilgrim({ ...pilgrim, status: 'محذوف', isDeleted: true });
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              }
                            });
                          }}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition"
                          title="استبعاد ونقل لكشف المستبعدين"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1.5: EXCLUDED PILGRIMS MANAGEMENT */}
      {activeTab === 'excluded' && currentAdminUser?.permissions.managePilgrims && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-blue-500/30 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0 shadow-sm">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>قائمة المستبعدين (المعتذرين والمرفوضين والمحذوفين)</span>
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-red-600 text-white">
                    الأرشيف
                  </span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
                  يتم ترحيل بيانات الحاج المعتذر أو المرفوض أو المستبعد تلقائياً إلى هذا الكشف مع حفظ أسباب الرفض أو الاعتذار وإمكانية استعادته للسجل النشط.
                </p>
              </div>
            </div>
            <div className="w-full lg:w-auto flex items-center justify-end">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-around sm:justify-start gap-3 sm:gap-4 shadow-sm w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="text-right transition cursor-pointer"
                >
                  <span className="text-[11px] text-slate-400 block font-bold">إجمالي المستبعدين</span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white">{excludedPilgrimsList.length} حاج</strong>
                </button>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <button
                  type="button"
                  onClick={() => setStatusFilter('معتذر')}
                  className="text-right transition cursor-pointer"
                >
                  <span className="text-[11px] text-emerald-500 block font-bold">معتذر</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{apologizedCount}</strong>
                </button>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <button
                  type="button"
                  onClick={() => setStatusFilter('مرفوض')}
                  className="text-right transition cursor-pointer"
                >
                  <span className="text-[11px] text-amber-500 block font-bold">مرفوض</span>
                  <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{rejectedCount}</strong>
                </button>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <button
                  type="button"
                  onClick={() => setStatusFilter('محذوف')}
                  className="text-right transition cursor-pointer"
                >
                  <span className="text-[11px] text-purple-500 block font-bold">محذوف</span>
                  <strong className="text-sm font-black text-purple-600 dark:text-purple-400">{deletedCount}</strong>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center flex-1">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في المستبعدين بالاسم أو الهوية أو سبب الرفض..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">تصفية بالحالة:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                >
                  <option value="all">جميع المستبعدين ({excludedPilgrimsList.length})</option>
                  <option value="مرفوض">مرفوض ({rejectedCount})</option>
                  <option value="معتذر">معتذر ({apologizedCount})</option>
                  <option value="محذوف">محذوف ({deletedCount})</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => handleExportCSV(excludedPilgrimsList, 'المستبعدين')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition text-xs flex items-center gap-2 shadow"
            >
              <Download className="w-4 h-4" />
              <span>تصدير كشف المستبعدين CSV ({excludedPilgrimsList.length})</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-4 text-center font-black text-red-500 w-12">#</th>
                    <th className="px-6 py-4">اسم الحاج</th>
                    <th className="px-6 py-4">رقم الهوية</th>
                    <th className="px-6 py-4">حالة الاستبعاد والسبب</th>
                    <th className="px-6 py-4">رقم الجوال</th>
                    <th className="px-6 py-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredPilgrims.map((pilgrim, index) => (
                    <tr key={pilgrim.nationalId} className="hover:bg-red-50/30 dark:hover:bg-red-900/10 transition">
                      <td className="px-4 py-4 text-center font-mono font-black text-red-500 text-xs bg-red-500/5">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {pilgrim.firstName} {pilgrim.secondName} {pilgrim.lastName}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs" dir="ltr">{pilgrim.nationalId}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wider shadow-sm border w-fit ${
                            pilgrim.status === 'معتذر' 
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                              : pilgrim.status === 'مرفوض'
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                              : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
                          }`}>
                            {pilgrim.status === 'معتذر'
                              ? 'معتذر عن الحج'
                              : pilgrim.status === 'مرفوض'
                              ? 'مرفوض'
                              : 'محذوف من الكشف'}
                          </span>
                          {(pilgrim.rejectionReason || pilgrim.statusNotes) && (
                            <div className="text-xs text-red-500 dark:text-red-400 font-medium bg-red-500/5 border border-red-500/20 rounded-xl px-2.5 py-1.5 max-w-xs break-words leading-relaxed">
                              {pilgrim.status === 'مرفوض'
                                ? `سبب الرفض: ${pilgrim.rejectionReason || pilgrim.statusNotes}`
                                : `ملاحظات: ${pilgrim.statusNotes || pilgrim.rejectionReason}`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs" dir="ltr">{pilgrim.mobile}</td>
                      <td className="px-6 py-4 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingPilgrim(pilgrim)}
                          className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 rounded-xl transition"
                          title="تعديل الحالة أو سبب الرفض"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'استعادة الحاج',
                              message: `هل تريد استعادة الحاج ${pilgrim.firstName} ${pilgrim.lastName} وإعادته لسجل الحجاج المسجلين النشط؟`,
                              onConfirm: () => {
                                onUpdatePilgrim({ ...pilgrim, status: 'قيد المراجعة', rejectionReason: '', isDeleted: false });
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              }
                            });
                          }}
                          className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-xl text-[10px] font-black transition border border-emerald-500/20 flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>إعادة تنشيط</span>
                        </button>
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'حذف نهائي',
                              message: `سيتم حذف الحاج ${pilgrim.firstName} نهائياً من قاعدة البيانات. لا يمكن التراجع!`,
                              onConfirm: () => {
                                onDeletePilgrim(pilgrim.id || pilgrim.nationalId);
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              }
                            });
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 transition"
                          title="حذف نهائي"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPilgrims.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                        لا يوجد حجاج مستبعدون حالياً
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1.75: INTEGRATED RELIGIOUS GUIDANCE SYSTEM (منظومة الإرشاد الديني المتكاملة - 11 وحدة) */}
      {activeTab === 'religiousGuidance' && hasReligiousSupervisionPermission && (
        <ReligiousGuidanceManager
          activePilgrims={activePilgrims}
          currentAdminUser={currentAdminUser}
          campaignSettings={campaignSettings}
          onUpdateCampaignSettings={onUpdateCampaignSettings}
          initialUnit={selectedReligiousUnit}
          onActiveUnitChange={(unit) => setSelectedReligiousUnit(unit)}
        />
      )}

      {/* TAB 1.8: MARJI LIST (كشف المراجع - ضمن صلاحيات الإشراف الديني) */}
      {activeTab === 'marjiList' && hasReligiousSupervisionPermission && (() => {
        const uniqueMarjis = Array.from(
          new Set(
            activePilgrims.map(p => (p.currentMarji || 'غير محدد').trim()).filter(Boolean)
          )
        );

        const marjiFilteredPilgrims = activePilgrims.filter(p => {
          const currentM = (p.currentMarji || 'غير محدد').trim();
          const matchesMarji = marjiFilter === 'all' || currentM === marjiFilter;
          const q = searchQuery.trim().toLowerCase();
          const fullName = `${p.firstName || ''} ${p.secondName || ''} ${p.thirdName || ''} ${p.lastName || ''}`.toLowerCase();
          const matchesQuery =
            !q ||
            fullName.includes(q) ||
            (p.mobile || '').toLowerCase().includes(q) ||
            currentM.toLowerCase().includes(q) ||
            (p.previousMarji || '').toLowerCase().includes(q);
          return matchesMarji && matchesQuery;
        });

        const handleExportMarjiCSV = () => {
          if (marjiFilteredPilgrims.length === 0) return;
          const headers = ['# (م)', 'اسم الحاج', 'رقم الجوال', 'اسم المرجع'];
          const rows = marjiFilteredPilgrims.map((p, i) => [
            i + 1,
            `${p.firstName || ''} ${p.secondName || ''} ${p.thirdName || ''} ${p.lastName || ''}`.replace(/\s+/g, ' ').trim(),
            p.mobile || '',
            p.currentMarji || 'غير محدد',
          ]);
          const dateStr = new Date().toISOString().split('T')[0];
          void exportAlQaemExcelReport({
            reportTitle: 'كشف مراجع التقليد للحجاج المسجلين',
            subtitle: 'توزيع الحجاج حسب مرجع التقليد المعتمد للإرشاد والتوعية الفقهية',
            category: 'منظومة الإرشاد الديني والتوعية',
            filename: `كشف_المراجع_قافلة_القائم_${dateStr}`,
            columns: headers,
            rows,
            generatedBy: currentAdminUser?.fullName || 'الإدارة العامة',
            summaryCards: [
              { label: 'إجمالي الحجاج في الكشف', value: `${marjiFilteredPilgrims.length} حاج` },
              { label: 'التصفية الحالية', value: marjiFilter === 'all' ? 'جميع المراجع' : marjiFilter },
            ],
          });
        };

        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-blue-500/30 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-500 shrink-0 shadow-sm">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">كشف المراجع للحجاج المسجلين</h2>
                    <span className="bg-purple-600 text-white px-2.5 py-0.5 rounded-lg text-[11px] font-bold">
                      الإشراف الديني
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
                    كشف مخصص للجنة الإشراف والإرشاد الديني يتضمن اسم الحاج ورقم جواله واسم مرجع التقليد.
                  </p>
                </div>
              </div>
              <div className="w-full lg:w-auto flex items-center justify-end">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-around sm:justify-start gap-3 sm:gap-4 shadow-sm w-full sm:w-auto">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-bold">إجمالي الحجاج</span>
                    <strong className="text-sm font-black text-slate-900 dark:text-white">{activePilgrims.length} حاج</strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-500 block font-bold">بالكشف الحالي</span>
                    <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{marjiFilteredPilgrims.length}</strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-amber-500 block font-bold">عدد المراجع</span>
                    <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{uniqueMarjis.length}</strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-purple-500 block font-bold">حج التمتع</span>
                    <strong className="text-sm font-black text-purple-600 dark:text-purple-400">
                      {activePilgrims.filter(p => (p.hajjType || '').includes('تمتع') || (p.hajjType || '').includes('أول مرة')).length}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {uniqueMarjis.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMarjiFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                    marjiFilter === 'all'
                      ? 'bg-purple-600 text-white border-purple-600 shadow'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-500/40'
                  }`}
                >
                  جميع المراجع ({activePilgrims.length})
                </button>
                {uniqueMarjis.map(marji => {
                  const count = activePilgrims.filter(p => (p.currentMarji || 'غير محدد').trim() === marji).length;
                  return (
                    <button
                      key={marji}
                      type="button"
                      onClick={() => setMarjiFilter(marji)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                        marjiFilter === marji
                          ? 'bg-purple-600 text-white border-purple-600 shadow'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-500/40'
                      }`}
                    >
                      {marji} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center flex-1">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث باسم الحاج، رقم الجوال، أو اسم المرجع..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap">تصفية بالمرجع:</span>
                  <select
                    value={marjiFilter}
                    onChange={(e) => setMarjiFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">جميع المراجع ({activePilgrims.length})</option>
                    {uniqueMarjis.map(marji => (
                      <option key={marji} value={marji}>
                        {marji} ({activePilgrims.filter(p => (p.currentMarji || 'غير محدد').trim() === marji).length})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleExportMarjiCSV}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 shadow"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير كشف المراجع CSV ({marjiFilteredPilgrims.length})</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-4 text-center font-black text-purple-500 w-14"># (م)</th>
                      <th className="px-6 py-4">اسم الحاج</th>
                      <th className="px-6 py-4">رقم الجوال</th>
                      <th className="px-6 py-4">اسم المرجع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {marjiFilteredPilgrims.map((pilgrim, index) => (
                      <tr key={pilgrim.id || pilgrim.nationalId} className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition">
                        <td className="px-4 py-4 text-center font-mono font-black text-purple-500 text-xs bg-purple-500/5">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {pilgrim.firstName} {pilgrim.secondName} {pilgrim.thirdName} {pilgrim.lastName}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs whitespace-nowrap" dir="ltr">
                          <a
                            href={`tel:${pilgrim.mobile}`}
                            className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 hover:text-purple-500 font-bold transition"
                          >
                            <span>{pilgrim.mobile}</span>
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                              {pilgrim.currentMarji || 'غير محدد'}
                            </span>
                            {pilgrim.previousMarji && pilgrim.previousMarji !== 'لا يوجد' && (
                              <span className="text-[11px] text-slate-400">
                                المرجع السابق: {pilgrim.previousMarji}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {marjiFilteredPilgrims.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                          لا توجد سجلات مطابقة في كشف المراجع حالياً
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 1.9: HAJJ TIMELINE & ITINERARY EDITOR (دليل الحاج وخطة سير الرحلة) */}
      {activeTab === 'hajjTimeline' && hasReligiousSupervisionPermission && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-blue-500/30 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>تعديل خطة سير الرحلة وأوقات أيام الحج (دليل الحاج)</span>
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950">
                    موسم 1448هـ
                  </span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
                  تعديل وتحديث جدول أيام المناسك، الأوقات، تفاصيل الخطوات، والتوجيهات لتظهر مباشرة في دليل الحاج التفاعلي للحجاج.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-around sm:justify-start gap-3 sm:gap-4 shadow-sm">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-bold">أيام المناسك</span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white">{timelineDays.length} أيام</strong>
                </div>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="text-right">
                  <span className="text-[11px] text-emerald-500 block font-bold">الخطوات الزمنية</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {timelineDays.reduce((acc, d) => acc + (d.steps?.length || 0), 0)}
                  </strong>
                </div>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="text-right">
                  <span className="text-[11px] text-amber-500 block font-bold">حجاج القافلة</span>
                  <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{activePilgrims.length}</strong>
                </div>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="text-right">
                  <span className="text-[11px] text-purple-500 block font-bold">حالة الدليل</span>
                  <strong className="text-sm font-black text-purple-600 dark:text-purple-400">مفعّل</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {timelineSavedNotice && (
                  <span className="px-3.5 py-2 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 rounded-xl text-xs font-black flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle className="w-4 h-4" />
                    <span>تم الحفظ ✓</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const updatedSettings: CampaignSettings = {
                      ...campaignSettings,
                      hajjDaysTimeline: timelineDays,
                    };
                    onUpdateCampaignSettings(updatedSettings);
                    setTimelineSavedNotice(true);
                    setTimeout(() => setTimelineSavedNotice(false), 3000);
                  }}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl shadow transition flex items-center justify-center gap-2 text-xs whitespace-nowrap"
                >
                  <span>حفظ التغييرات ونشرها</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {timelineDays.map((day, dayIndex) => (
              <div key={day.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 text-right">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="space-y-2 flex-1 w-full">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                        {dayIndex + 1}
                      </span>
                      <input
                        type="text"
                        value={day.dayTitle}
                        onChange={(e) => {
                          const next = [...timelineDays];
                          next[dayIndex].dayTitle = e.target.value;
                          setTimelineDays(next);
                        }}
                        placeholder="عنوان اليوم (مثال: اليوم الثامن: يوم التروية)"
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <input
                      type="text"
                      value={day.subtitle}
                      onChange={(e) => {
                        const next = [...timelineDays];
                        next[dayIndex].subtitle = e.target.value;
                        setTimelineDays(next);
                      }}
                      placeholder="العنوان الفرعي للיום"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ملخص اليوم:</label>
                    <textarea
                      rows={2}
                      value={day.summary}
                      onChange={(e) => {
                        const next = [...timelineDays];
                        next[dayIndex].summary = e.target.value;
                        setTimelineDays(next);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">توجيهات وإرشادات القافلة:</label>
                    <textarea
                      rows={2}
                      value={day.campaignTip}
                      onChange={(e) => {
                        const next = [...timelineDays];
                        next[dayIndex].campaignTip = e.target.value;
                        setTimelineDays(next);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">خطوات وأوقات اليوم:</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...timelineDays];
                        next[dayIndex].steps.push({ time: '00:00 ص', title: 'خطوة جديدة', desc: 'تفاصيل الخطوة...' });
                        setTimelineDays(next);
                      }}
                      className="px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة خطوة زمنية</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {day.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="w-full sm:w-48 shrink-0">
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">الوقت:</label>
                          <input
                            type="text"
                            value={step.time}
                            onChange={(e) => {
                              const next = [...timelineDays];
                              next[dayIndex].steps[stepIndex].time = e.target.value;
                              setTimelineDays(next);
                            }}
                            placeholder="مثال: 08:00 ص - 10:00 ص"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => {
                                const next = [...timelineDays];
                                next[dayIndex].steps[stepIndex].title = e.target.value;
                                setTimelineDays(next);
                              }}
                              placeholder="عنوان الخطوة"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...timelineDays];
                                next[dayIndex].steps = next[dayIndex].steps.filter((_, i) => i !== stepIndex);
                                setTimelineDays(next);
                              }}
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition shrink-0 ml-2"
                              title="حذف هذه الخطوة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={step.desc}
                            onChange={(e) => {
                              const next = [...timelineDays];
                              next[dayIndex].steps[stepIndex].desc = e.target.value;
                              setTimelineDays(next);
                            }}
                            placeholder="وصف وتفاصيل الخطوة"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1.6: BUS BOARDING (رحلات الحافلات) */}
      {activeTab === 'busBoarding' && currentAdminUser?.permissions.managePilgrims && (() => {
        const busFilteredPilgrims = busPilgrimsList.filter((p) => {
          const fullName = `${p.firstName} ${p.secondName} ${p.thirdName} ${p.lastName}`;
          const busLabel = (p.busNumber || 'غير مخصص').trim();
          const seatLabel = (p.busSeat || '').trim();
          const matchesSearch =
            fullName.includes(searchQuery) ||
            (p.nationalId || '').includes(searchQuery) ||
            busLabel.includes(searchQuery) ||
            seatLabel.includes(searchQuery);
          const matchesBus =
            busFilter === 'all'
              ? true
              : busFilter === 'unassigned'
              ? !(p.busNumber || '').trim()
              : busLabel === busFilter;
          return matchesSearch && matchesBus;
        });

        const assignedBusPilgrimsCount = busPilgrimsList.filter(p => Boolean((p.busNumber || '').trim())).length;
        const unassignedBusPilgrimsCount = busPilgrimsList.length - assignedBusPilgrimsCount;

        const handleAssignBusAndSeat = (pilgrim: Pilgrim, nextBus: string, nextSeat: string) => {
          if (isPilgrimAirTravel(pilgrim)) {
            setBusCapacityWarning(
              `تنبيه: الحاج (${pilgrim.firstName} ${pilgrim.lastName}) مسجل في رحلات الطيران ولا يمكن تسكينه في الحافلات إلا بعد تعديل طلبه من (سجل الحجاج).`
            );
            return;
          }
          const cleanBus = nextBus.trim();
          const cleanSeat = nextSeat.trim();

          if (cleanBus) {
            const currentCountExcludingThis = getBusPassengersCount(cleanBus, pilgrim.id);
            if (currentCountExcludingThis >= MAX_BUS_CAPACITY) {
              setBusCapacityWarning(
                `تنبيه: العدد أكبر من المقاعد! (${cleanBus}) وصلت للحد الأقصى المسموح به وهو ${MAX_BUS_CAPACITY} راكب في الحافلة الواحدة. يرجى اختيار حافلة أخرى.`
              );
              return;
            }
          }

          if (cleanSeat) {
            const numericSeat = parseInt(cleanSeat.replace(/[^\d]/g, ''), 10);
            if (!isNaN(numericSeat) && (numericSeat > MAX_BUS_CAPACITY || numericSeat < 1)) {
              setBusCapacityWarning(
                `تنبيه: العدد أكبر من المقاعد! رقم المقعد (${numericSeat}) يتجاوز سعة الحافلة المحددة بـ ${MAX_BUS_CAPACITY} مقعداً (من 1 إلى 49).`
              );
              return;
            }
            if (cleanBus) {
              const duplicateSeatHolder = busPilgrimsList.find(
                p =>
                  p.id !== pilgrim.id &&
                  (p.busNumber || '').trim() === cleanBus &&
                  (p.busSeat || '').trim() === cleanSeat
              );
              if (duplicateSeatHolder) {
                setBusCapacityWarning(
                  `تنبيه: المقعد رقم (${cleanSeat}) في (${cleanBus}) محجوز مسبقاً للحاج: ${duplicateSeatHolder.firstName} ${duplicateSeatHolder.lastName}.`
                );
                return;
              }
            }
          }

          setBusCapacityWarning(null);
          onUpdatePilgrim({
            ...pilgrim,
            transport: 'باص',
            busNumber: cleanBus,
            busSeat: cleanSeat,
          });
        };

        const handleExportBusBoardingCSV = () => {
          const headers = ['#', 'اسم الحاج', 'رقم البطاقة (الهوية)', 'رقم الباص', 'رقم المقعد', 'رقم الجوال', 'الباقة'];
          const rows = busFilteredPilgrims.map((p, idx) => [
            idx + 1,
            `${p.firstName} ${p.secondName} ${p.thirdName} ${p.lastName}`.replace(/\s+/g, ' ').trim(),
            p.nationalId || '',
            p.busNumber || 'غير مخصص',
            p.busSeat || 'غير مخصص',
            p.mobile || '',
            p.selectedPackage || 'التسجيل العام',
          ]);
          void exportAlQaemExcelReport({
            reportTitle: 'كشف المجموعات وإركاب الباصات وتوزيع المقاعد',
            subtitle: 'كشف رسمي لحجاج رحلات البر وتوزيع الحافلات والمقاعد المعتمدة',
            category: 'كشوف المجموعات وإركاب الحافلات',
            filename: `كشف_اركاب_الباصات_${new Date().toISOString().split('T')[0]}`,
            columns: headers,
            rows,
            generatedBy: currentAdminUser?.fullName || 'الإدارة العامة',
            summaryCards: [
              { label: 'إجمالي حجاج الحافلات', value: `${busPilgrimsList.length} حاج` },
              { label: 'تم إركابهم', value: `${assignedBusPilgrimsCount} حاج` },
              { label: 'بانتظار الباص', value: `${unassignedBusPilgrimsCount} حاج` },
              { label: 'عدد الحافلات المعتمدة', value: `${BUS_OPTIONS.length} حافلات` },
            ],
          });
        };

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Header & Unified Segmented Stats (Matches Housing Manifest Style) */}
            <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-blue-500/30 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-500 shrink-0 shadow-sm">
                  <Bus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>رحلات الحافلات وتوزيع المقاعد (حجاج البر فقط)</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-sky-500 text-white">
                      الحد الأقصى: {MAX_BUS_CAPACITY} راكب لكل حافلة
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
                    يعرض هذا الكشف <strong>حجاج رحلات الحافلات (الباص) فقط</strong> لمنع التداخل مع حجاج الطيران. لتغيير وسيلة سفر أي حاج من طيران إلى باص (أو العكس)، يرجى تعديل الطلب من <strong>سجل الحجاج</strong> أولاً.
                  </p>
                </div>
              </div>

              <div className="w-full lg:w-auto flex items-center justify-end">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-around sm:justify-start gap-3 sm:gap-4 shadow-sm w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setBusFilter('all')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-slate-400 block font-bold">حجاج الحافلات</span>
                    <strong className="text-sm font-black text-slate-900 dark:text-white">{busPilgrimsList.length} حاج</strong>
                  </button>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => setBusFilter('all')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-emerald-500 block font-bold">تم إركابهم</span>
                    <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{assignedBusPilgrimsCount}</strong>
                  </button>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => setBusFilter('unassigned')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-amber-500 block font-bold">بانتظار الباص</span>
                    <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{unassignedBusPilgrimsCount}</strong>
                  </button>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-purple-500 block font-bold">عدد الحافلات</span>
                    <strong className="text-sm font-black text-purple-600 dark:text-purple-400">{BUS_OPTIONS.length}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity Warning Alert Banner */}
            {busCapacityWarning && (
              <div className="bg-red-500/15 border-2 border-red-500 rounded-2xl p-4 flex items-center justify-between gap-3 text-red-600 dark:text-red-300 shadow-lg animate-fadeIn">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-black">تنبيه إركاب الحافلات!</h4>
                    <p className="text-xs font-bold mt-0.5">{busCapacityWarning}</p>
                  </div>
                </div>
                <button
                  onClick={() => setBusCapacityWarning(null)}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition shrink-0"
                >
                  إغلاق التنبيه
                </button>
              </div>
            )}

            {/* Bus Fleet Capacity Cards */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Bus className="w-4 h-4 text-sky-500" />
                  <span>عداد ركاب الحافلات (الحد الأقصى {MAX_BUS_CAPACITY} مقعداً لكل حافلة):</span>
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {busFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setBusFilter('all')}
                      className="text-xs font-bold text-sky-500 hover:underline px-2 py-1"
                    >
                      عرض جميع حجاج الحافلات ({busPilgrimsList.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddNewBus}
                    className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
                    title="إضافة حافلة جديدة عند الحاجة"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة حافلة جديدة ({getNextBusName()})</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {BUS_OPTIONS.map((busName) => {
                  const count = getBusPassengersCount(busName);
                  const isFull = count >= MAX_BUS_CAPACITY;
                  const isSelected = busFilter === busName;
                  const canRemoveEmpty = count === 0 && BUS_OPTIONS.length > 1;
                  return (
                    <div
                      key={busName}
                      onClick={() => setBusFilter(isSelected ? 'all' : busName)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setBusFilter(isSelected ? 'all' : busName);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-right transition flex flex-col justify-between gap-1.5 cursor-pointer relative ${
                        isSelected
                          ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                          : isFull
                          ? 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400'
                          : count > 0
                          ? 'bg-sky-500/5 border-sky-500/30 text-slate-800 dark:text-slate-200 hover:bg-sky-500/10'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full gap-1">
                        <span className="text-xs font-black">{busName}</span>
                        <div className="flex items-center gap-1">
                          {canRemoveEmpty && (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveEmptyBus(busName, e)}
                              title={`حذف ${busName} (فارغة)`}
                              className={`p-1 rounded-lg transition ${
                                isSelected
                                  ? 'hover:bg-white/20 text-white'
                                  : 'hover:bg-red-500/15 text-slate-400 hover:text-red-500'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <Bus className="w-3.5 h-3.5 opacity-80" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full text-[11px] font-bold">
                        <span>{count} / {MAX_BUS_CAPACITY}</span>
                        {isFull && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${isSelected ? 'bg-white text-red-600' : 'bg-red-500 text-white'}`}>
                            ممتلئة
                          </span>
                        )}
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isFull ? 'bg-red-500' : isSelected ? 'bg-white' : 'bg-sky-500'
                          }`}
                          style={{ width: `${Math.min(100, (count / MAX_BUS_CAPACITY) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter & Export Bar */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث باسم الحاج، رقم البطاقة، رقم الباص، أو المقعد..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap">تصفية بالحافلة:</span>
                  <select
                    value={busFilter}
                    onChange={(e) => setBusFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-bold"
                  >
                    <option value="all">جميع حجاج الحافلات ({busPilgrimsList.length})</option>
                    <option value="unassigned">غير مخصص لهم باص ({unassignedBusPilgrimsCount})</option>
                    {BUS_OPTIONS.map((busName) => {
                      const cnt = getBusPassengersCount(busName);
                      return (
                        <option key={busName} value={busName}>
                          {busName} ({cnt} / {MAX_BUS_CAPACITY} راكب){cnt >= MAX_BUS_CAPACITY ? ' - ممتلئة' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <button
                onClick={handleExportBusBoardingCSV}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 shadow"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير كشف إركاب الباصات CSV ({busFilteredPilgrims.length})</span>
              </button>
            </div>

            {/* Bus Boarding Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-4 text-center font-black text-sky-500 w-14"># (م)</th>
                      <th className="px-6 py-4">اسم الحاج</th>
                      <th className="px-6 py-4">رقم بطاقته (الهوية)</th>
                      <th className="px-6 py-4">رقم الباص</th>
                      <th className="px-6 py-4">رقم المقعد</th>
                      <th className="px-6 py-4 text-center">إجراءات (تخصيص الباص والمقعد)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {busFilteredPilgrims.map((pilgrim, index) => {
                      const currentBus = (pilgrim.busNumber || '').trim();
                      const currentSeat = (pilgrim.busSeat || '').trim();
                      const currentBusCount = currentBus ? getBusPassengersCount(currentBus) : 0;

                      return (
                        <tr key={pilgrim.id || pilgrim.nationalId} className="hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition">
                          <td className="px-4 py-4 text-center font-mono font-black text-sky-500 text-xs bg-sky-500/5">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <div>
                              {pilgrim.firstName} {pilgrim.secondName} {pilgrim.thirdName} {pilgrim.lastName}
                            </div>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {pilgrim.selectedPackage || 'التسجيل العام'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap" dir="ltr">
                            {pilgrim.nationalId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {currentBus ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                                <Bus className="w-3.5 h-3.5" />
                                <span>{currentBus}</span>
                                <span className="text-[10px] opacity-80">({currentBusCount}/{MAX_BUS_CAPACITY})</span>
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">
                                غير مخصص
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {currentSeat ? (
                              <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">
                                مقعد {currentSeat}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">
                                غير محدد
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2 flex-wrap sm:flex-nowrap">
                              {/* Inline Multi-Bus Selector */}
                              <select
                                value={currentBus}
                                onChange={(e) => handleAssignBusAndSeat(pilgrim, e.target.value, currentSeat)}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                                title="اختيار رقم الباص للحاج (حد أقصى 49 راكب)"
                              >
                                <option value="">-- اختر الباص --</option>
                                {BUS_OPTIONS.map((busOpt) => {
                                  const countExcl = getBusPassengersCount(busOpt, pilgrim.id);
                                  const isBusFull = countExcl >= MAX_BUS_CAPACITY;
                                  return (
                                    <option key={busOpt} value={busOpt}>
                                      {busOpt} ({countExcl}/{MAX_BUS_CAPACITY}){isBusFull ? ' [ممتلئة - 49 راكب]' : ''}
                                    </option>
                                  );
                                })}
                              </select>

                              {/* Inline Seat Selector (1 to 49) */}
                              <select
                                value={currentSeat}
                                onChange={(e) => handleAssignBusAndSeat(pilgrim, currentBus, e.target.value)}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
                                title="اختيار رقم المقعد (من 1 إلى 49)"
                              >
                                <option value="">-- المقعد (1-49) --</option>
                                {Array.from({ length: MAX_BUS_CAPACITY }, (_, i) => String(i + 1)).map((seatNum) => {
                                  const takenBy = currentBus
                                    ? busPilgrimsList.find(
                                        p =>
                                          p.id !== pilgrim.id &&
                                          (p.busNumber || '').trim() === currentBus &&
                                          (p.busSeat || '').trim() === seatNum
                                      )
                                    : undefined;
                                  return (
                                    <option key={seatNum} value={seatNum}>
                                      مقعد {seatNum}{takenBy ? ` (محجوز: ${takenBy.firstName} ${takenBy.lastName})` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {busFilteredPilgrims.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                          <div className="flex flex-col items-center gap-2">
                            <Bus className="w-8 h-8 text-slate-500/40" />
                            <span>لا يوجد حجاج مسجلون في رحلات الحافلات حالياً</span>
                            {airPilgrimsList.length > 0 && (
                              <span className="text-xs text-sky-500 font-bold not-italic">
                                ملاحظة: يوجد ({airPilgrimsList.length}) من الحجاج مسجلين في باقة الطيران وقد تم عزلهم تلقائياً في قسم (رحلات الطيران) لمنع التداخل.
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 1.85: FLIGHTS LIST (رحلات الطيران) */}
      {activeTab === 'flightsList' && currentAdminUser?.permissions.managePilgrims && (() => {
        const assignedFlightsCount = airPilgrimsList.filter(
          (p) => Boolean(p.flightNumberOutbound?.trim()) || Boolean(p.flightNumberReturn?.trim())
        ).length;
        const unassignedFlightsCount = Math.max(0, airPilgrimsList.length - assignedFlightsCount);

        const flightsFilteredPilgrims = airPilgrimsList.filter((p) => {
          const fullName = `${p.firstName} ${p.secondName} ${p.thirdName} ${p.lastName}`;
          const englishName = (p.englishFullName || '').trim().toLowerCase();
          const outbound = (p.flightNumberOutbound || '').trim().toLowerCase();
          const retFlight = (p.flightNumberReturn || '').trim().toLowerCase();
          const ticket = (p.flightTicketNumber || '').trim().toLowerCase();
          const mobile = (p.mobile || '').trim();
          const nationalId = (p.nationalId || '').trim();
          const query = searchQuery.trim().toLowerCase();

          const matchesSearch =
            !query ||
            fullName.toLowerCase().includes(query) ||
            englishName.includes(query) ||
            outbound.includes(query) ||
            retFlight.includes(query) ||
            ticket.includes(query) ||
            mobile.includes(query) ||
            nationalId.includes(query);

          if (!matchesSearch) return false;

          if (flightFilter === 'assigned') return Boolean(outbound || retFlight);
          if (flightFilter === 'unassigned') return !outbound && !retFlight;
          return true;
        });

        const handleExportFlightsCSV = () => {
          const headers = [
            'م',
            'الاسم الرباعي (عربي)',
            'الاسم الكامل بالإنجليزية (Passport / ID)',
            'رقم الهوية الوطنية',
            'تاريخ الميلاد',
            'تاريخ انتهاء الهوية',
            'الجنس',
            'الجنسية',
            'رقم الجوال',
            'الباقة المختارة',
            'رحلة الذهاب / الوصول (Outbound)',
            'رحلة العودة / المغادرة (Return)',
            'رقم التذكرة / الحجز (PNR)'
          ];
          const rows = flightsFilteredPilgrims.map((p, idx) => [
            idx + 1,
            `${p.firstName} ${p.secondName} ${p.thirdName} ${p.lastName}`.replace(/\s+/g, ' ').trim(),
            p.englishFullName || '',
            p.nationalId || '',
            p.birthDate || '',
            p.idExpiryDate || '',
            p.gender || '',
            p.nationality || '',
            p.mobile || '',
            p.selectedPackage || 'التسجيل العام',
            p.flightNumberOutbound || 'غير محدد',
            p.flightNumberReturn || 'غير محدد',
            p.flightTicketNumber || 'غير محدد'
          ]);
          const dateStr = new Date().toISOString().split('T')[0];
          void exportAlQaemExcelReport({
            reportTitle: 'كشف رحلات الطيران والتذاكر والوصول والمغادرة (حجاج الجو)',
            subtitle: 'بيان رسمي برحلات الذهاب والعودة وأرقام التذاكر والحجوزات (PNR) لحجاج الطيران',
            category: 'تقارير الطيران والتذاكر والوصول والمغادرة',
            filename: `كشف_رحلات_الطيران_قافلة_القائم_${dateStr}`,
            columns: headers,
            rows,
            generatedBy: currentAdminUser?.fullName || 'الإدارة العامة',
            summaryCards: [
              { label: 'إجمالي حجاج الطيران', value: `${airPilgrimsList.length} حاج` },
              { label: 'مكتمل تحديد الرحلة', value: `${assignedFlightsCount} حاج` },
              { label: 'بانتظار تحديد الرحلة', value: `${unassignedFlightsCount} حاج` },
              {
                label: 'تذاكر PNR الصادرة',
                value: `${airPilgrimsList.filter((p) => Boolean(p.flightTicketNumber?.trim())).length} تذكرة`,
              },
            ],
          });
        };

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Flight Management Header & Unified Segmented Stats (Matches Housing Manifest Style) */}
            <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-blue-500/30 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-500 shrink-0 shadow-sm">
                  <Plane className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>رحلات الطيران وتذاكر السفر (حجاج الجو فقط)</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-sky-600 text-white">
                      موسم 1448هـ
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
                    يعرض هذا الكشف <strong>حجاج رحلات الطيران فقط</strong> مع عزل تام عن كشف الحافلات. لتحويل حاج من حافلة إلى طيران، يتم تعديل طلبه من <strong>سجل الحجاج</strong> أولاً.
                  </p>
                </div>
              </div>

              <div className="w-full lg:w-auto flex items-center justify-end">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-around sm:justify-start gap-3 sm:gap-4 shadow-sm w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setFlightFilter('flight_pilgrims')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-slate-400 block font-bold">حجاج الطيران</span>
                    <strong className="text-sm font-black text-slate-900 dark:text-white">{airPilgrimsList.length} حاج</strong>
                  </button>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => setFlightFilter('assigned')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-emerald-500 block font-bold">تم تحديد الرحلة</span>
                    <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{assignedFlightsCount}</strong>
                  </button>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => setFlightFilter('unassigned')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-amber-500 block font-bold">بانتظار الرحلة</span>
                    <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{unassignedFlightsCount}</strong>
                  </button>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-purple-500 block font-bold">تذاكر PNR</span>
                    <strong className="text-sm font-black text-purple-600 dark:text-purple-400">
                      {airPilgrimsList.filter(p => Boolean(p.flightTicketNumber?.trim())).length}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Search, Filter & Export Controls */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم العربي أو الإنجليزي، رقم الهوية، رقم الرحلة، أو رقم الحجز PNR..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap">تصفية الرحلات:</span>
                  <select
                    value={flightFilter}
                    onChange={(e) => setFlightFilter(e.target.value as any)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="flight_pilgrims">جميع حجاج الطيران ({airPilgrimsList.length})</option>
                    <option value="assigned">مكتمل تحديد الرحلة ({assignedFlightsCount})</option>
                    <option value="unassigned">بانتظار رقم الرحلة ({unassignedFlightsCount})</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleExportFlightsCSV}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow text-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير كشف الطيران والتذاكر CSV ({flightsFilteredPilgrims.length})</span>
              </button>
            </div>

            {/* Flights Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-4 font-bold text-center w-14">#</th>
                      <th className="px-6 py-4 font-bold">اسم الحاج (عربي / إنجليزي) والهوية</th>
                      <th className="px-6 py-4 font-bold">رقم الهاتف</th>
                      <th className="px-6 py-4 font-bold">رحلة الذهاب (المدينة / الموعد)</th>
                      <th className="px-6 py-4 font-bold">رحلة العودة (المدينة / الموعد)</th>
                      <th className="px-6 py-4 font-bold">رقم التذكرة / الحجز (PNR)</th>
                      <th className="px-6 py-4 font-bold text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70 text-sm">
                    {flightsFilteredPilgrims.map((pilgrim, idx) => (
                      <FlightTableRow
                        key={pilgrim.id}
                        pilgrim={pilgrim}
                        index={idx}
                        onUpdate={(updated) => {
                          onUpdatePilgrim({
                            ...updated,
                            transport: 'طائرة',
                            busNumber: '',
                            busSeat: '',
                          });
                        }}
                        onOpenEditModal={(p) => {
                          setEditModalBusError(null);
                          setEditingPilgrim(p);
                        }}
                      />
                    ))}
                    {flightsFilteredPilgrims.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <Plane className="w-8 h-8 text-slate-500/50" />
                            <p className="font-bold text-sm">لا توجد سجلات مطابقة في كشف رحلات الطيران حالياً</p>
                            <p className="text-xs text-slate-500">
                              لإضافة حاج إلى رحلات الطيران، قم بتعديل وسيلة المواصلات أو الباقة من <strong>سجل الحجاج</strong>.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 1.9: HOUSING LIST (كشف السكن) */}
      {activeTab === 'housingList' && currentAdminUser?.permissions.managePilgrims && (() => {
        const housingFilteredPilgrims = activePilgrims.filter((p) => {
          const fullName = `${p.firstName} ${p.secondName} ${p.thirdName} ${p.lastName}`;
          const makkahRoom = (p.roomNumberMakkah || p.roomNumber || '').trim();
          const madinahRoom = (p.roomNumberMadinah || '').trim();
          const minaRoom = (p.roomNumberMina || '').trim();
          const mobile = (p.mobile || '').trim();
          const nationalId = (p.nationalId || '').trim();
          const query = searchQuery.trim().toLowerCase();

          const matchesSearch =
            !query ||
            fullName.toLowerCase().includes(query) ||
            mobile.includes(query) ||
            nationalId.includes(query) ||
            makkahRoom.toLowerCase().includes(query) ||
            madinahRoom.toLowerCase().includes(query) ||
            minaRoom.toLowerCase().includes(query);

          const matchesFilter =
            housingFilter === 'all'
              ? true
              : housingFilter === 'both_assigned'
              ? Boolean(makkahRoom && madinahRoom && minaRoom)
              : housingFilter === 'makkah_unassigned'
              ? !makkahRoom
              : housingFilter === 'madinah_unassigned'
              ? !madinahRoom
              : housingFilter === 'mina_unassigned'
              ? !minaRoom
              : housingFilter === 'unassigned'
              ? (!makkahRoom && !madinahRoom && !minaRoom)
              : true;

          return matchesSearch && matchesFilter;
        });

        const totalActive = activePilgrims.length;
        const makkahAssignedCount = activePilgrims.filter(p => Boolean((p.roomNumberMakkah || p.roomNumber)?.trim())).length;
        const madinahAssignedCount = activePilgrims.filter(p => Boolean((p.roomNumberMadinah || '')?.trim())).length;
        const minaAssignedCount = activePilgrims.filter(p => Boolean((p.roomNumberMina || '')?.trim())).length;
        const bothAssignedCount = activePilgrims.filter(p => Boolean((p.roomNumberMakkah || p.roomNumber)?.trim()) && Boolean((p.roomNumberMadinah || '')?.trim()) && Boolean((p.roomNumberMina || '')?.trim())).length;
        const unassignedHousingCount = activePilgrims.filter(p => !Boolean((p.roomNumberMakkah || p.roomNumber)?.trim()) && !Boolean((p.roomNumberMadinah || '')?.trim()) && !Boolean((p.roomNumberMina || '')?.trim())).length;

        const handleExportHousingCSV = () => {
          const headers = ['#', 'اسم الحاج', 'رقم الجوال', 'رقم غرفة السكن بالمدينة المنورة', 'رقم غرفة سكن مكة المكرمة', 'تسكين منى (المخيم / المقعد)', 'رقم الهوية الوطنية', 'الباقة المختارة'];
          const rows = housingFilteredPilgrims.map((p, idx) => [
            idx + 1,
            `${p.firstName} ${p.secondName} ${p.thirdName} ${p.lastName}`.replace(/\s+/g, ' ').trim(),
            p.mobile || '',
            p.roomNumberMadinah || 'غير محدد',
            p.roomNumberMakkah || p.roomNumber || 'غير محدد',
            p.roomNumberMina || 'غير محدد',
            p.nationalId || '',
            p.selectedPackage || 'التسجيل العام',
          ]);
          void exportAlQaemExcelReport({
            reportTitle: 'كشف السكن والوصول والمغادرة (المدينة المنورة • مكة المكرمة • مشعر منى)',
            subtitle: 'بيان تسكين الغرف والفنادق والمخيمات المعتمد لحجاج القافلة',
            category: 'تقارير السكن والوصول والمغادرة',
            filename: `كشف_سكن_الحجاج_المدينة_ومكة_ومنى_${new Date().toISOString().split('T')[0]}`,
            columns: headers,
            rows,
            generatedBy: currentAdminUser?.fullName || 'الإدارة العامة',
            summaryCards: [
              { label: 'إجمالي الحجاج', value: `${totalActive} حاج` },
              { label: 'سكن المدينة المنورة', value: `${madinahAssignedCount} مسكّن` },
              { label: 'سكن مكة المكرمة', value: `${makkahAssignedCount} مسكّن` },
              { label: 'تسكين مشعر منى', value: `${minaAssignedCount} مسكّن` },
            ],
          });
        };

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Header & Stats Banner */}
            <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-blue-500/30 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
                  <Hotel className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>كشف السكن وتوزيع الغرف (المدينة المنورة، مكة المكرمة، وتسكين منى)</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white">
                      موسم 1448هـ
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
                    كشف رسمي لتوزيع وتسكين الحجاج في فنادق المدينة المنورة، مكة المكرمة، ومخيمات مشعر منى يشتمل على: <strong>اسم الحاج، رقم جواله، سكن المدينة المنورة، سكن مكة المكرمة، وتسكين منى</strong>، مع إمكانية التعديل السريع المباشر وحفظ التعديلات بضغطة زر.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-bold">إجمالي الحجاج</span>
                    <strong className="text-sm font-black text-slate-900 dark:text-white">{totalActive} حاج</strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-500 block font-bold">سكن المدينة</span>
                    <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{madinahAssignedCount}</strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-amber-500 block font-bold">سكن مكة</span>
                    <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{makkahAssignedCount}</strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-purple-500 block font-bold">تسكين منى</span>
                    <strong className="text-sm font-black text-purple-600 dark:text-purple-400">{minaAssignedCount}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Export Controls */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث باسم الحاج، رقم الجوال، رقم الغرفة، أو مخيم منى..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap">تصفية التسكين:</span>
                  <select
                    value={housingFilter}
                    onChange={(e) => setHousingFilter(e.target.value as any)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="all">جميع الحجاج ({totalActive})</option>
                    <option value="both_assigned">مكتمل التسكين (المدينة ومكة ومنى) ({bothAssignedCount})</option>
                    <option value="madinah_unassigned">بانتظار سكن المدينة المنورة ({totalActive - madinahAssignedCount})</option>
                    <option value="makkah_unassigned">بانتظار سكن مكة المكرمة ({totalActive - makkahAssignedCount})</option>
                    <option value="mina_unassigned">بانتظار تسكين منى ({totalActive - minaAssignedCount})</option>
                    <option value="unassigned">غير مسكن بالكامل ({unassignedHousingCount})</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleExportHousingCSV}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 shadow"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير كشف السكن CSV ({housingFilteredPilgrims.length})</span>
              </button>
            </div>

            {/* Housing Manifest Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-4 text-center font-black text-blue-500 w-14"># (م)</th>
                      <th className="px-6 py-4">اسم الحاج</th>
                      <th className="px-6 py-4">رقم الجوال</th>
                      <th className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black">
                          <Hotel className="w-4 h-4" />
                          <span>رقم غرفة السكن بالمدينة المنورة</span>
                        </div>
                      </th>
                      <th className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black">
                          <Building2 className="w-4 h-4" />
                          <span>رقم غرفة سكن مكة المكرمة</span>
                        </div>
                      </th>
                      <th className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-black">
                          <Hotel className="w-4 h-4" />
                          <span>تسكين منى (المخيم / المقعد)</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center">إجراءات (تعديل السكن)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {housingFilteredPilgrims.map((pilgrim, index) => (
                      <HousingTableRow
                        key={pilgrim.id || pilgrim.nationalId}
                        pilgrim={pilgrim}
                        index={index}
                        onUpdate={onUpdatePilgrim}
                      />
                    ))}
                    {housingFilteredPilgrims.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                          لا توجد سجلات مطابقة في كشف السكن حالياً
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 1.95: HEALTH CONDITIONS ROSTER (كشف الحالات الصحية) */}
      {activeTab === 'healthList' && currentAdminUser?.permissions.managePilgrims && (() => {
        const getCleanDiseases = (p: Pilgrim): string[] =>
          (p.healthConditions || []).filter((c) => c && c.trim() !== '' && c !== 'لا شيء مما ذكر');

        const needsMobilityCare = (p: Pilgrim): boolean =>
          Boolean(p.needsAssistance) ||
          Boolean(p.hasBackPain) ||
          p.mobilityIndependence === 'لا' ||
          getCleanDiseases(p).includes('صعوبة في الحركة');

        const hasChronicDisease = (p: Pilgrim): boolean => {
          const diseases = getCleanDiseases(p);
          const hasOther = Boolean(p.otherHealthCondition && p.otherHealthCondition.trim() !== '');
          return diseases.some((d) => d !== 'صعوبة في الحركة') || hasOther;
        };

        const healthFilteredPilgrims = activePilgrims.filter((p) => {
          const fullName = `${p.firstName} ${p.secondName} ${p.thirdName} ${p.lastName}`;
          const diseasesStr = getCleanDiseases(p).join(' ');
          const otherStr = (p.otherHealthCondition || '').trim();
          const mobile = (p.mobile || '').trim();
          const nationalId = (p.nationalId || '').trim();
          const busStr = (p.busNumber || '').trim();
          const roomStr = `${p.roomNumberMakkah || p.roomNumber || ''} ${p.roomNumberMadinah || ''}`;
          const query = searchQuery.trim().toLowerCase();

          const matchesSearch =
            !query ||
            fullName.toLowerCase().includes(query) ||
            mobile.includes(query) ||
            nationalId.includes(query) ||
            diseasesStr.toLowerCase().includes(query) ||
            otherStr.toLowerCase().includes(query) ||
            busStr.toLowerCase().includes(query) ||
            roomStr.toLowerCase().includes(query);

          const hasCondition = hasPilgrimHealthCondition(p);

          const matchesFilter =
            healthFilter === 'all'
              ? true
              : healthFilter === 'with_conditions'
              ? hasCondition
              : healthFilter === 'mobility_aid'
              ? needsMobilityCare(p)
              : healthFilter === 'chronic_disease'
              ? hasChronicDisease(p)
              : healthFilter === 'speech_difficulty'
              ? Boolean(p.hasSpeechDifficulty)
              : healthFilter === 'healthy'
              ? !hasCondition
              : true;

          return matchesSearch && matchesFilter;
        });

        const totalActive = activePilgrims.length;
        const withConditionsCount = activePilgrims.filter(hasPilgrimHealthCondition).length;
        const mobilityAidCount = activePilgrims.filter(needsMobilityCare).length;
        const chronicDiseaseCount = activePilgrims.filter(hasChronicDisease).length;
        const speechDifficultyCount = activePilgrims.filter((p) => Boolean(p.hasSpeechDifficulty)).length;
        const healthyCount = totalActive - withConditionsCount;

        const handleExportHealthCSV = () => {
          const headers = [
            '#',
            'اسم الحاج',
            'الجنس',
            'رقم الجوال',
            'رقم الهوية',
            'الأمراض المزمنة المسجلة',
            'أمراض وملاحظات صحية أخرى',
            'يحتاج كرسي متحرك / وسيلة مساعدة',
            'آلام بالظهر أو صعوبة بالحركة',
            'القدرة على الحركة دون مساعدة',
            'صعوبة في نطق بعض الحروف',
            'يوجد حمل (للنساء)',
            'رقم الباص والمقعد',
            'غرفة مكة المكرمة',
            'غرفة المدينة المنورة',
          ];
          const rows = healthFilteredPilgrims.map((p, idx) => {
            const cleanDiseases = getCleanDiseases(p);
            return [
              idx + 1,
              `${p.firstName} ${p.secondName} ${p.thirdName} ${p.lastName}`.replace(/\s+/g, ' ').trim(),
              p.gender || '',
              p.mobile || '',
              p.nationalId || '',
              cleanDiseases.length > 0 ? cleanDiseases.join(' - ') : 'سليم ولله الحمد',
              p.otherHealthCondition || 'لا يوجد',
              p.needsAssistance ? 'نعم (يحتاج كرسي متحرك/مساعدة)' : 'لا',
              p.hasBackPain ? 'نعم' : 'لا',
              p.mobilityIndependence || 'نعم',
              p.hasSpeechDifficulty ? 'نعم' : 'لا',
              p.gender === 'أنثى' ? (p.isPregnant ? 'نعم' : 'لا') : 'غير منطبق',
              p.busNumber ? `${p.busNumber}${p.busSeat ? ` (مقعد ${p.busSeat})` : ''}` : 'غير محدد',
              p.roomNumberMakkah || p.roomNumber || 'غير محدد',
              p.roomNumberMadinah || 'غير محدد',
            ];
          });
          void exportAlQaemExcelReport({
            reportTitle: 'كشف الحالات الصحية والرعاية الطبية للحجاج',
            subtitle: 'بيان اللجنة الطبية والإدارية للأمراض المزمنة والاحتياجات الحركية والغرف',
            category: 'تقارير الرعاية الطبية والحالات الصحية',
            filename: `كشف_الحالات_الصحية_للحجاج_${new Date().toISOString().split('T')[0]}`,
            columns: headers,
            rows,
            generatedBy: currentAdminUser?.fullName || 'اللجنة الطبية والإدارية',
            summaryCards: [
              { label: 'إجمالي الحجاج', value: `${totalActive} حاج` },
              { label: 'أصحاب حالات صحية', value: `${withConditionsCount} حالة` },
              { label: 'يحتاجون كرسي / مساعدة', value: `${mobilityAidCount} حاج` },
              { label: 'أمراض مزمنة', value: `${chronicDiseaseCount} حالة` },
            ],
          });
        };

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Header & Unified Segmented Medical Stats Banner (Matches Housing Manifest Style) */}
            <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-blue-500/30 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0 shadow-sm">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>كشف الحالات الصحية والرعاية الطبية للحجاج</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-600 text-white">
                      اللجنة الطبية والإدارية
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
                    بيان تفصيلي بالحالة الصحية للحجاج المسجلين، يشمل <strong>الأمراض المزمنة (الضغط، السكري، القلب، الدم)، الحاجة لكرسي متحرك أو مساعدة حركية، آلام الظهر، وصعوبات النطق</strong>، مرتبطاً بأرقام الغرف والحافلات لسرعة المتابعة الميدانية.
                  </p>
                </div>
              </div>

              <div className="w-full lg:w-auto flex items-center justify-end">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-around sm:justify-start gap-3 sm:gap-4 shadow-sm w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setHealthFilter('all')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-slate-400 block font-bold">إجمالي الحجاج</span>
                    <strong className="text-sm font-black text-slate-900 dark:text-white">{totalActive} حاج</strong>
                  </button>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => setHealthFilter('with_conditions')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-emerald-500 block font-bold">حالات صحية</span>
                    <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{withConditionsCount}</strong>
                  </button>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => setHealthFilter('mobility_aid')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-amber-500 block font-bold">كرسي / حركة</span>
                    <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{mobilityAidCount}</strong>
                  </button>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => setHealthFilter('chronic_disease')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-purple-500 block font-bold">أمراض مزمنة</span>
                    <strong className="text-sm font-black text-purple-600 dark:text-purple-400">{chronicDiseaseCount}</strong>
                  </button>
                </div>
              </div>
            </div>

            {/* Search, Filter & Export Controls */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث باسم الحاج، الجوال، المرض (سكري، ضغط...)، الباص، أو الغرفة..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap">تصنيف الكشف:</span>
                  <select
                    value={healthFilter}
                    onChange={(e) => setHealthFilter(e.target.value as any)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-bold"
                  >
                    <option value="all">جميع الحجاج ({totalActive})</option>
                    <option value="with_conditions">أصحاب الحالات الصحية والاحتياجات فقط ({withConditionsCount})</option>
                    <option value="mobility_aid">يحتاجون كرسي متحرك / مساعدة حركية ({mobilityAidCount})</option>
                    <option value="chronic_disease">أصحاب الأمراض المزمنة ({chronicDiseaseCount})</option>
                    <option value="speech_difficulty">لديهم صعوبة في نطق الحروف ({speechDifficultyCount})</option>
                    <option value="healthy">الأصحاء بدون ملاحظات صحية ({healthyCount})</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportHealthCSV}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 shadow"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير كشف الحالات الصحية CSV ({healthFilteredPilgrims.length})</span>
              </button>
            </div>

            {/* Health Conditions Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-4 text-center font-black text-rose-500 w-14"># (م)</th>
                      <th className="px-5 py-4">اسم الحاج والتواصل</th>
                      <th className="px-5 py-4">الأمراض المزمنة والحالة الصحية</th>
                      <th className="px-5 py-4">الحركة والاحتياجات الخاصة</th>
                      <th className="px-5 py-4">السكن والحافلة</th>
                      <th className="px-5 py-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {healthFilteredPilgrims.map((pilgrim, index) => {
                      const cleanDiseases = getCleanDiseases(pilgrim);
                      const otherCond = (pilgrim.otherHealthCondition || '').trim();
                      const hasAnyCond = hasPilgrimHealthCondition(pilgrim);

                      return (
                        <tr
                          key={pilgrim.id || pilgrim.nationalId}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="px-4 py-4 text-center font-mono font-bold text-slate-400">
                            {index + 1}
                          </td>

                          {/* Pilgrim Name & Contact */}
                          <td className="px-5 py-4">
                            <div className="font-black text-slate-900 dark:text-white text-sm">
                              {pilgrim.firstName} {pilgrim.secondName} {pilgrim.thirdName} {pilgrim.lastName}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                              <span dir="ltr">{pilgrim.mobile}</span>
                              <span aria-hidden="true">·</span>
                              <span>{pilgrim.gender}</span>
                              <span aria-hidden="true">·</span>
                              <span>هوية: {pilgrim.nationalId}</span>
                            </div>
                          </td>

                          {/* Chronic Diseases & Other Conditions */}
                          <td className="px-5 py-4">
                            {cleanDiseases.length > 0 || otherCond ? (
                              <div className="space-y-1.5">
                                {cleanDiseases.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {cleanDiseases.map((d, i) => (
                                      <span
                                        key={i}
                                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold"
                                      >
                                        {d}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {otherCond && (
                                  <div className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1 inline-block">
                                    ملاحظة صحية: {otherCond}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                سليم ولله الحمد (لا توجد أمراض مسجلة)
                              </span>
                            )}
                          </td>

                          {/* Mobility & Special Care Indicators */}
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {(pilgrim.needsAssistance || pilgrim.mobilityIndependence === 'لا') && (
                                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-black">
                                  يحتاج كرسي متحرك / مساعدة
                                </span>
                              )}
                              {pilgrim.hasBackPain && (
                                <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-bold">
                                  آلام بالظهر / صعوبة حركة
                                </span>
                              )}
                              {pilgrim.isPregnant && pilgrim.gender === 'أنثى' && (
                                <span className="px-2.5 py-1 rounded-lg bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30 text-xs font-bold">
                                  حامل (رعاية خاصة)
                                </span>
                              )}
                              {pilgrim.hasSpeechDifficulty && (
                                <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold">
                                  صعوبة نطق الحروف (تنبيه للإرشاد)
                                </span>
                              )}
                              {!hasAnyCond && (
                                <span className="text-xs text-slate-400">قادر على الحركة دون مساعدة</span>
                              )}
                            </div>
                          </td>

                          {/* Housing & Bus Info */}
                          <td className="px-5 py-4 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                              <Bus className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              <span>
                                {pilgrim.busNumber
                                  ? `${pilgrim.busNumber}${pilgrim.busSeat ? ` - مقعد ${pilgrim.busSeat}` : ''}`
                                  : 'لم يحدد الباص'}
                              </span>
                            </div>
                            <div className="text-slate-500 dark:text-slate-400">
                              مكة: {pilgrim.roomNumberMakkah || pilgrim.roomNumber || '—'} | المدينة: {pilgrim.roomNumberMadinah || '—'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditModalBusError(null);
                                setEditingPilgrim(pilgrim);
                              }}
                              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-xs transition inline-flex items-center gap-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل الحالة الصحية</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {healthFilteredPilgrims.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                          لا توجد حالات صحية مطابقة لمعايير التصفية الحالية
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: ANNOUNCEMENTS, MEETINGS & LESSONS */}
      {activeTab === 'announcements' && currentAdminUser?.permissions.manageAnnouncements && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">إدارة إعلانات اللقاءات والدروس والمقالات</h3>
              <p className="text-xs text-slate-500 mt-1">إضافة، تعديل، أو حذف التعاميم وإعلانات اللقاءات التعريفية والدروس الفقهية</p>
            </div>
            <button
              onClick={() => {
                setAnnForm({
                  title: '',
                  category: 'هام',
                  date: new Date().toISOString().split('T')[0],
                  content: '',
                  fontSize: 'normal',
                  isBold: false,
                  textAlign: 'right',
                  imageUrl: '',
                  videoUrl: '',
                  displaySettings: {
                    showImage: true,
                    showVideo: true,
                    enableLightbox: true,
                    highlightCard: false,
                  },
                });
                setActiveAnnToolTab('none');
                setAnnMediaError('');
                setIsNewAnnouncement(true);
                setEditingAnnouncement(null);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-3 rounded-xl transition flex items-center gap-2 shadow text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة إعلان أو درس جديد</span>
            </button>
          </div>

          {/* YouTube Channel Latest Video & Live Stream Quick Control */}
          <YouTubeAdminControl
            campaignSettings={campaignSettings}
            onUpdateCampaignSettings={onUpdateCampaignSettings}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {announcements.map((ann) => {
              const showImg = Boolean(ann.imageUrl && ann.displaySettings?.showImage !== false);
              const showVid = Boolean(ann.videoUrl && ann.displaySettings?.showVideo !== false);
              const videoInfo = showVid ? getEmbeddedVideoInfo(ann.videoUrl) : { type: 'none' as const, src: '' };
              const typographyClasses = getAnnouncementTypographyClasses(ann);
              const fontSizeLabel = FONT_SIZE_OPTIONS.find((f) => f.value === (ann.fontSize || 'normal'))?.label || 'عادي';

              return (
                <div
                  key={ann.id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between transition ${
                    ann.displaySettings?.highlightCard
                      ? 'border-2 border-amber-500 ring-1 ring-amber-500/30'
                      : 'border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    {showImg && ann.imageUrl && (
                      <AnnouncementImageView
                        imageUrl={ann.imageUrl}
                        alt={ann.title}
                        containerClassName="relative h-44 w-full bg-slate-950 overflow-hidden"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="p-6 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {ann.category}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            الخط: {fontSizeLabel}
                          </span>
                          {ann.imageUrl && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              <span>
                                {ann.displaySettings?.showImage === false
                                  ? 'صورة (مخفية)'
                                  : extractMediaId(ann.imageUrl)
                                  ? `#${extractMediaId(ann.imageUrl)}`
                                  : 'صورة مفعلة'}
                              </span>
                            </span>
                          )}
                          {ann.videoUrl && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              <span>
                                {ann.displaySettings?.showVideo === false
                                  ? 'فيديو (مخفي)'
                                  : extractMediaId(ann.videoUrl)
                                  ? `#${extractMediaId(ann.videoUrl)}`
                                  : 'فيديو مفعل'}
                              </span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{ann.date}</span>
                      </div>

                      <h4 className={`text-lg font-bold text-slate-900 dark:text-white ${ann.textAlign === 'center' ? 'text-center' : 'text-right'}`}>
                        {ann.title}
                      </h4>
                      <p className={`text-slate-600 dark:text-slate-300 ${typographyClasses}`}>{ann.content}</p>

                      {showVid && videoInfo.type !== 'none' && (
                        <div className="pt-2">
                          <AnnouncementVideoView
                            videoUrl={ann.videoUrl}
                            title={ann.title}
                            videoClassName="w-full max-h-48 object-contain bg-black"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Display Feature Toggles & Actions */}
                  <div className="px-6 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {(ann.imageUrl || ann.videoUrl) && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {ann.imageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateAnnouncement({
                                ...ann,
                                displaySettings: {
                                  ...ann.displaySettings,
                                  showImage: ann.displaySettings?.showImage === false ? true : false,
                                },
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg font-bold border transition flex items-center gap-1 ${
                              ann.displaySettings?.showImage !== false
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {ann.displaySettings?.showImage !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{ann.displaySettings?.showImage !== false ? 'الصورة معروضة' : 'الصورة مخفية'}</span>
                          </button>
                        )}
                        {ann.videoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateAnnouncement({
                                ...ann,
                                displaySettings: {
                                  ...ann.displaySettings,
                                  showVideo: ann.displaySettings?.showVideo === false ? true : false,
                                },
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg font-bold border transition flex items-center gap-1 ${
                              ann.displaySettings?.showVideo !== false
                                ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {ann.displaySettings?.showVideo !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{ann.displaySettings?.showVideo !== false ? 'الفيديو معروض' : 'الفيديو مخفي'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => shareAnnouncementItem(ann)}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-amber-500/20 hover:text-amber-500 transition text-xs font-bold flex items-center gap-1.5"
                        title="مشاركة رابط الموضوع مباشرة"
                      >
                        <Share2 className="w-4 h-4" /> مشاركة
                      </button>
                      <button
                        onClick={() => {
                          setEditingAnnouncement(ann);
                          setAnnForm({
                            title: ann.title,
                            category: ann.category,
                            date: ann.date,
                            content: ann.content,
                            fontSize: ann.fontSize || 'normal',
                            isBold: Boolean(ann.isBold),
                            textAlign: ann.textAlign || 'right',
                            imageUrl: ann.imageUrl || '',
                            videoUrl: ann.videoUrl || '',
                            displaySettings: {
                              showImage: ann.displaySettings?.showImage !== false,
                              showVideo: ann.displaySettings?.showVideo !== false,
                              enableLightbox: ann.displaySettings?.enableLightbox !== false,
                              highlightCard: Boolean(ann.displaySettings?.highlightCard),
                            },
                          });
                          setActiveAnnToolTab(ann.imageUrl ? 'image' : ann.videoUrl ? 'video' : 'none');
                          setAnnMediaError('');
                          setIsNewAnnouncement(false);
                        }}
                        className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-500/20 transition text-xs font-bold flex items-center gap-1.5"
                      >
                        <Edit3 className="w-4 h-4" /> تعديل
                      </button>
                      <button
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: 'تأكيد حذف الإعلان أو الدرس',
                            message: `هل أنت متأكد من حذف "${ann.title}" نهائياً من قائمة الإعلانات؟`,
                            onConfirm: () => {
                              onDeleteAnnouncement(ann.id);
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }}
                        className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition text-xs font-bold flex items-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" /> حذف
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Financial Management Sub-Menus are now integrated in the top Navigation System */}

      {/* TAB 3.5: FINANCIAL PAYMENTS STATEMENT (كشف المبالغ المدفوعة) */}
      {activeTab === 'paymentsList' && canAccessFinanceMenu && (() => {
        const statementPilgrims = activePilgrims.filter((p) => {
          const fullName = `${p.firstName} ${p.secondName} ${p.thirdName} ${p.lastName}`;
          const query = searchQuery.trim().toLowerCase();
          const paidVal = getPilgrimPaidAmount(p, packages);
          const matchesSearch =
            !query ||
            fullName.toLowerCase().includes(query) ||
            (p.nationalId || '').includes(query) ||
            (p.mobile || '').includes(query) ||
            String(paidVal).includes(query);

          const isConfirmed = isPilgrimPaymentConfirmed(p);
          const matchesFinanceFilter =
            financeFilter === 'confirmed' ? isConfirmed : true;

          return matchesSearch && matchesFinanceFilter;
        });

        const confirmedInStatement = statementPilgrims.filter((p) =>
          isPilgrimPaymentConfirmed(p)
        );

        const totalConfirmedPaidAmount = confirmedInStatement.reduce(
          (sum, p) => sum + getPilgrimPaidAmount(p, packages),
          0
        );

        const allConfirmedCount = activePilgrims.filter((p) =>
          isPilgrimPaymentConfirmed(p)
        ).length;

        const handleExportPaymentsCSV = () => {
          const headers = ['#', 'اسم الحاج', 'رقم الهوية', 'الباقة', 'حالة الدفع', 'المبلغ المدفوع (ريال)'];
          const rows: (string | number)[][] = statementPilgrims.map((p, idx) => {
            const isConf = isPilgrimPaymentConfirmed(p);
            const paid = getPilgrimPaidAmount(p, packages);
            return [
              idx + 1,
              `${p.firstName} ${p.secondName} ${p.thirdName} ${p.lastName}`.replace(/\s+/g, ' ').trim(),
              p.nationalId || '',
              p.selectedPackage || 'التسجيل العام',
              isConf ? `مؤكد الدفع (${p.status})` : `غير مؤكد (${p.status})`,
              `${paid.toLocaleString('en-US')} ريال`,
            ];
          });

          // Append grand total row at the end of the Excel statement
          rows.push([
            '',
            'إجمالي المبالغ المدفوعة لكافة الحجاج المؤكد دفعهم في هذا الكشف',
            `عدد المؤكد دفعهم: ${confirmedInStatement.length} حاج`,
            '',
            'الإجمالي الكلي المؤكد',
            `${totalConfirmedPaidAmount.toLocaleString('en-US')} ريال سعودي`,
          ]);

          void exportAlQaemExcelReport({
            reportTitle: 'الكشف المالي للمبالغ المدفوعة والتحصيلات المعتمدة',
            subtitle: 'تقرير التدقيق المالي لحالات السداد وإجمالي المبالغ المحصلة من الحجاج',
            category: 'التقارير المالية والتحصيلات',
            filename: `كشف_المبالغ_المدفوعة_${new Date().toISOString().split('T')[0]}`,
            columns: headers,
            rows,
            generatedBy: currentAdminUser?.fullName || 'الإشراف المالي',
            summaryCards: [
              { label: 'عدد الحجاج في الكشف', value: `${statementPilgrims.length} حاج` },
              { label: 'الحجاج المؤكد دفعهم', value: `${confirmedInStatement.length} حاج` },
              {
                label: 'الإجمالي الكلي المحصل',
                value: `${totalConfirmedPaidAmount.toLocaleString('en-US')} ريال سعودي`,
              },
            ],
          });
        };

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Header & Unified Segmented Summary (Matches Housing Manifest Style) */}
            <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-blue-500/30 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 shrink-0 shadow-sm">
                  <img
                    src="/assets/aistudio/Saudi_Riyal_Symbol-1_96cf3a0c.png"
                    alt="ريال سعودي"
                    className="w-6 h-6 object-contain opacity-95 filter brightness-0 saturate-100 invert-[.5] sepia-[.8] hue-rotate-[90deg]"
                  />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>كشف الحجاج والمبالغ المدفوعة</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white">
                      الإدارة المالية - موسم 1448هـ
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
                    يعرض هذا الكشف <strong>اسم الحاج والمبلغ المدفوع</strong> لكل حاج مع إمكانية تعديل أو حفظ المبلغ مباشرة، وفي نهاية الكشف يظهر <strong>إجمالي المبالغ المدفوعة لكافة الحجاج المؤكد دفعهم في هذا الكشف</strong>.
                  </p>
                </div>
              </div>

              <div className="w-full lg:w-auto flex items-center justify-end">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-around sm:justify-start gap-3 sm:gap-4 shadow-sm w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setFinanceFilter('all')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-slate-400 block font-bold">إجمالي الحجاج</span>
                    <strong className="text-sm font-black text-slate-900 dark:text-white">{activePilgrims.length} حاج</strong>
                  </button>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => setFinanceFilter('confirmed')}
                    className="text-right transition cursor-pointer"
                  >
                    <span className="text-[11px] text-emerald-500 block font-bold">مؤكد دفعهم</span>
                    <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{confirmedInStatement.length}</strong>
                  </button>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-amber-500 block font-bold">قيد المراجعة</span>
                    <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{Math.max(0, activePilgrims.length - allConfirmedCount)}</strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-purple-500 block font-bold">إجمالي المحصّل</span>
                    <strong className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">
                      {totalConfirmedPaidAmount.toLocaleString('en-US')} ر.س
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* FINANCIAL RECHARTS & OPERATIONAL COST THRESHOLD ALERT */}
            {(() => {
              const getPilgrimExpectedPrice = (p: Pilgrim, pkgs: HajjPackage[]): number => {
                if (p.totalPackagePrice) {
                  const num = Number(String(p.totalPackagePrice).replace(/[^\d.]/g, ''));
                  if (!isNaN(num) && num > 0) return num;
                }
                if (p.selectedPackage) {
                  const matched = pkgs.find(pkg => pkg.title === p.selectedPackage);
                  if (matched && matched.price) {
                    const num = Number(String(matched.price).replace(/[^\d.]/g, ''));
                    if (!isNaN(num) && num > 0) return num;
                  }
                }
                return 0;
              };

              const activePilgrimsForTarget = pilgrims.filter(p => !p.isDeleted && p.status !== 'محذوف' && p.status !== 'معتذر' && p.status !== 'مرفوض');
              const OPERATIONAL_COST_TARGET = activePilgrimsForTarget.reduce((sum, p) => sum + getPilgrimExpectedPrice(p, packages), 0);

              const percentageOfTarget = OPERATIONAL_COST_TARGET > 0
                ? Math.min(100, Math.round((totalConfirmedPaidAmount / OPERATIONAL_COST_TARGET) * 100))
                : 0;
              const isNearOrExceeded = OPERATIONAL_COST_TARGET > 0 && totalConfirmedPaidAmount >= OPERATIONAL_COST_TARGET * 0.85;

              // Compute distribution by package for confirmed payments
              const packageRevenueMap: Record<string, { count: number; totalPaid: number }> = {};
              packages.forEach(pkg => {
                packageRevenueMap[pkg.title] = { count: 0, totalPaid: 0 };
              });
              packageRevenueMap['التسجيل العام (بدون باقة محددة)'] = { count: 0, totalPaid: 0 };

              confirmedInStatement.forEach(p => {
                const pkgTitle = p.selectedPackage && packageRevenueMap[p.selectedPackage] ? p.selectedPackage : 'التسجيل العام (بدون باقة محددة)';
                packageRevenueMap[pkgTitle].count += 1;
                packageRevenueMap[pkgTitle].totalPaid += getPilgrimPaidAmount(p, packages);
              });

              const chartData = Object.entries(packageRevenueMap).map(([name, data]) => ({
                name: name.length > 22 ? name.substring(0, 20) + '...' : name,
                fullName: name,
                'المحصّل': data.totalPaid,
                'عدد الحجاج': data.count,
              }));

              return (
                <div className="space-y-6">
                  {/* Visual Operational Cost Alert Banner */}
                  <div className={`border-2 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg transition animate-fadeIn ${
                    totalConfirmedPaidAmount >= OPERATIONAL_COST_TARGET
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                      : isNearOrExceeded
                      ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300'
                      : 'bg-blue-500/10 border-blue-500/40 text-blue-800 dark:text-blue-300'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow font-black text-lg ${
                        totalConfirmedPaidAmount >= OPERATIONAL_COST_TARGET
                          ? 'bg-emerald-500 text-white'
                          : isNearOrExceeded
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {totalConfirmedPaidAmount >= OPERATIONAL_COST_TARGET ? '✓' : '⚠️'}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm sm:text-base font-black flex items-center gap-2">
                          <span>مؤشر التكلفة التشغيلية للرحلة ومستهدف الميزانية</span>
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-white/40 dark:bg-slate-900/40">
                            {percentageOfTarget}% من المستهدف
                          </span>
                        </h4>
                        <p className="text-xs sm:text-sm font-bold leading-relaxed opacity-90">
                          {totalConfirmedPaidAmount >= OPERATIONAL_COST_TARGET
                            ? `تهانينا! تجاوز إجمالي التحصيل المؤكد (${totalConfirmedPaidAmount.toLocaleString('en-US')} ريال) التكلفة التشغيلية المستهدفة (${OPERATIONAL_COST_TARGET.toLocaleString('en-US')} ريال).`
                            : isNearOrExceeded
                            ? `تنبيه مرئي هام: اقترب إجمالي التحصيل المؤكد (${totalConfirmedPaidAmount.toLocaleString('en-US')} ريال) من تغطية التكلفة التشغيلية المتوقعة (${OPERATIONAL_COST_TARGET.toLocaleString('en-US')} ريال)! متبقي القليل لاكتمال المستهدف.`
                            : `إجمالي التحصيل الحالي (${totalConfirmedPaidAmount.toLocaleString('en-US')} ريال) جارٍ رصده نحو تغطية التكلفة التشغيلية المتوقعة للرحلة البالغة (${OPERATIONAL_COST_TARGET.toLocaleString('en-US')} ريال).`}
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-64 space-y-1.5 shrink-0">
                      <div className="flex justify-between text-xs font-black">
                        <span>التحصيل المؤكد</span>
                        <span className="font-mono">{percentageOfTarget}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            totalConfirmedPaidAmount >= OPERATIONAL_COST_TARGET
                              ? 'bg-emerald-500'
                              : isNearOrExceeded
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${percentageOfTarget}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] opacity-75 font-mono">
                        <span>0 ريال</span>
                        <span>المستهدف: {OPERATIONAL_COST_TARGET.toLocaleString('en-US')} ريال</span>
                      </div>
                    </div>
                  </div>

                  {/* Recharts Bar Chart: Distribution of Collected Revenue by Package */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-emerald-500" />
                          <span>توزيع المبالغ المحصلة المؤكدة حسب الباقة</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">رسم بياني تفاعلي يوضح حجم الإيرادات المحصلة لكل باقة حج وعمرة</p>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                        إجمالي المحصّل: {totalConfirmedPaidAmount.toLocaleString('en-US')} ريال
                      </span>
                    </div>

                    <div className="h-72 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 35 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis
                            dataKey="name"
                            angle={-20}
                            textAnchor="end"
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            height={40}
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '12px',
                              color: '#f8fafc',
                              fontSize: '12px',
                              textAlign: 'right'
                            }}
                            formatter={(value: any) => [`${Number(value || 0).toLocaleString('en-US')} ريال`, 'المبلغ المحصّل']}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                          />
                          <Bar dataKey="المحصّل" fill="#10b981" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Search, Filter & Export Bar */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث باسم الحاج، رقم الهوية، أو المبلغ المدفوع..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap">عرض في الكشف:</span>
                  <select
                    value={financeFilter}
                    onChange={(e) => setFinanceFilter(e.target.value as 'confirmed' | 'all')}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="confirmed">الحجاج المؤكد دفعهم ({allConfirmedCount})</option>
                    <option value="all">جميع الحجاج المسجلين ({activePilgrims.length})</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportPaymentsCSV}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 shadow"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير كشف المبالغ المدفوعة CSV ({statementPilgrims.length})</span>
              </button>
            </div>

            {/* Financial Statement Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-4 text-center font-black text-emerald-500 w-14"># (م)</th>
                      <th className="px-6 py-4">اسم الحاج</th>
                      <th className="px-6 py-4">حالة تأكيد الدفع</th>
                      <th className="px-6 py-4">المبلغ المدفوع</th>
                      <th className="px-6 py-4 text-center">إجراءات مالية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {statementPilgrims.map((pilgrim, index) => (
                      <FinancialStatementRow
                        key={pilgrim.id || pilgrim.nationalId}
                        pilgrim={pilgrim}
                        index={index}
                        packages={packages}
                        onUpdate={onUpdatePilgrim}
                        onOpenReceipt={(p) => setOfficialReceiptPilgrim(p)}
                      />
                    ))}
                    {statementPilgrims.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                          لا توجد سجلات مطابقة في كشف المبالغ المدفوعة حالياً
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* Table Footer: Grand Total at the End of the Statement */}
                  <tfoot className="bg-emerald-500/10 dark:bg-emerald-950/40 border-t-2 border-emerald-500/40">
                    <tr>
                      <td colSpan={3} className="px-6 py-5 text-right">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                            ∑
                          </div>
                          <div>
                            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block">
                              إجمالي المبالغ المدفوعة لكافة الحجاج المؤكد دفعهم في هذا الكشف
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              إجمالي عدد الحجاج المؤكد دفعهم في هذا الكشف: <strong>{confirmedInStatement.length} حاج</strong>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td colSpan={2} className="px-6 py-5 text-left sm:text-right">
                        <div className="inline-flex flex-col items-start sm:items-end bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-lg">
                          <span className="text-[10px] font-bold uppercase opacity-90">
                            الإجمالي النهائي للمبالغ المدفوعة المؤكدة
                          </span>
                          <span className="text-lg sm:text-xl font-black font-mono tracking-tight">
                            {totalConfirmedPaidAmount.toLocaleString('en-US')} ريال سعودي
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB: NOTIFICATIONS MANAGEMENT CENTER */}
      {activeTab === 'notifications' && canManageNotifications && (
        <AdminNotificationCenter
          pilgrims={activePilgrims}
          packages={packages}
          notifications={notifications}
          currentAdminUser={currentAdminUser}
        />
      )}

      {/* TAB 3: PACKAGES & PRICING MANAGEMENT */}
      {activeTab === 'packages' && canAccessFinanceMenu && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-blue-500/30 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>إدارة الباقات وتعديل الأسعار</span>
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950">
                    موسم 1448هـ
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  تعديل أسعار الباقات، إضافة باقات جديدة، أو حذف الباقات الحالية
                </p>
              </div>
            </div>

            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-around sm:justify-start gap-3 sm:gap-4 shadow-sm">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-bold">إجمالي الباقات</span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white">{packages.length} باقات</strong>
                </div>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="text-right">
                  <span className="text-[11px] text-emerald-500 block font-bold">حجاج الطيران</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{airPilgrimsList.length}</strong>
                </div>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="text-right">
                  <span className="text-[11px] text-amber-500 block font-bold">حجاج الحافلات</span>
                  <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{busPilgrimsList.length}</strong>
                </div>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="text-right">
                  <span className="text-[11px] text-purple-500 block font-bold">إجمالي الحجاج</span>
                  <strong className="text-sm font-black text-purple-600 dark:text-purple-400">{activePilgrims.length}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const headers = [
                    'م',
                    'اسم الباقة',
                    'تصنيف الباقة',
                    'سعر الباقة المعتمد',
                    'المدة الزمنية',
                    'عدد الحجاج المسجلين',
                    'المؤكد دفعهم في الباقة',
                    'إجمالي الإيرادات التقديرية',
                    'المميزات والخدمات المشمولة',
                  ];
                  let totalRevenueAll = 0;
                  const rows: (string | number)[][] = packages.map((pkg, idx) => {
                    const pkgPilgrims = activePilgrims.filter((p) => p.selectedPackage === pkg.title);
                    const pkgConfirmed = pkgPilgrims.filter((p) => isPilgrimPaymentConfirmed(p));
                    const numericPrice = parseInt(pkg.price.replace(/[^\d]/g, ''), 10) || 0;
                    const estRev = pkgPilgrims.length * numericPrice;
                    totalRevenueAll += estRev;
                    return [
                      idx + 1,
                      pkg.title,
                      pkg.type || 'حج',
                      pkg.price,
                      'موسم 1448هـ',
                      pkgPilgrims.length,
                      pkgConfirmed.length,
                      `${estRev.toLocaleString('en-US')} ريال`,
                      (pkg.features || []).join(' • '),
                    ];
                  });
                  void exportAlQaemExcelReport({
                    reportTitle: 'تقرير الحجوزات والباقات وتوزيع الحجاج والإيرادات',
                    subtitle: 'بيان تفصيلي بباقات الحج والعمرة المعتمدة وأعداد الحجاج المسجلين في كل باقة',
                    category: 'تقارير الحجوزات والباقات',
                    filename: `تقرير_الحجوزات_والباقات_قافلة_القائم_${new Date().toISOString().split('T')[0]}`,
                    columns: headers,
                    rows,
                    generatedBy: currentAdminUser?.fullName || 'الإدارة العامة',
                    summaryCards: [
                      { label: 'إجمالي الباقات المعتمدة', value: `${packages.length} باقات` },
                      { label: 'إجمالي الحجاج النشطين', value: `${activePilgrims.length} حاج` },
                      {
                        label: 'إجمالي الإيرادات التقديرية',
                        value: `${totalRevenueAll.toLocaleString('en-US')} ريال`,
                      },
                    ],
                  });
                }}
                className="bg-[#12192C] hover:bg-slate-800 text-[#F4C84A] border border-[#C5A45D] font-bold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow text-xs sm:text-sm whitespace-nowrap cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#20B995]" />
                <span>تصدير تقرير الباقات Excel</span>
              </button>

              <button
                onClick={() => {
                  setPkgForm({
                    title: '',
                    type: 'VIP طيران',
                    price: '18,000 ريال',
                    transport: 'طيران + باصات VIP',
                    accommodationMakkah: 'فندق مكة المكرمة',
                    accommodationMadinah: 'فندق المدينة المنورة',
                    campMina: 'مخيم منى المطور',
                    featuresStr: 'إقامة فاخرة, إشراف ديني, وجبات بوفيه',
                    image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&q=80&w=800'
                  });
                  setIsNewPackage(true);
                  setEditingPackage(null);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow text-xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة باقة جديدة</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                  <div className="relative h-48 overflow-hidden">
                    <img src={pkg.image} alt={pkg.title} className="w-full h-full object-cover" />
                    <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md text-amber-400 px-3 py-1.5 rounded-xl text-sm font-black border border-amber-500/30">
                      {pkg.price}
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                      {pkg.type}
                    </span>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">{pkg.title}</h4>
                    <p className="text-xs text-slate-500">{pkg.accommodationMakkah}</p>
                  </div>
                </div>
                <div className="p-6 pt-3 flex justify-end gap-2 flex-wrap border-t border-slate-100 dark:border-slate-800 mt-4">
                  <button
                    type="button"
                    onClick={() => sharePackageItem(pkg)}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-amber-500/20 hover:text-amber-500 transition text-xs font-bold flex items-center gap-1.5"
                    title="مشاركة رابط الباقة مباشرة"
                  >
                    <Share2 className="w-4 h-4" /> مشاركة
                  </button>
                  <button
                    onClick={() => {
                      setEditingPackage(pkg);
                      setPkgForm({
                        title: pkg.title,
                        type: pkg.type,
                        price: pkg.price,
                        transport: pkg.transport,
                        accommodationMakkah: pkg.accommodationMakkah,
                        accommodationMadinah: pkg.accommodationMadinah,
                        campMina: pkg.campMina,
                        featuresStr: pkg.features.join(', '),
                        image: pkg.image
                      });
                      setIsNewPackage(false);
                    }}
                    className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-500/20 transition text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" /> تعديل السعر والباقة
                  </button>
                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'تأكيد حذف الباقة',
                        message: `هل أنت متأكد من حذف باقة "${pkg.title}"؟`,
                        onConfirm: () => {
                          onDeletePackage(pkg.id);
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        }
                      });
                    }}
                    className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition text-xs font-bold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: PILGRIM GIFT DISTRIBUTION MANAGEMENT (إدارة وتوزيع هدايا الحجاج) */}
      {(activeTab === 'giftDashboard' ||
        activeTab === 'giftRegistry' ||
        activeTab === 'giftFollowUp' ||
        activeTab === 'giftReports') &&
        canManageGifts && (
          <GiftDistributionManager
            activePilgrims={activePilgrims}
            currentStaffName={currentAdminUser?.fullName || 'مشرف القافلة'}
            seasonYear={campaignSettings?.pilgrimStatsConfig?.activeSeasonYear || '1448'}
            initialSubTab={
              activeTab === 'giftRegistry'
                ? 'registry'
                : activeTab === 'giftFollowUp'
                ? 'followup'
                : activeTab === 'giftReports'
                ? 'reports'
                : 'dashboard'
            }
            onNavigateTab={(tab) => {
              if (
                tab === 'giftDashboard' ||
                tab === 'giftRegistry' ||
                tab === 'giftFollowUp' ||
                tab === 'giftReports'
              ) {
                setActiveTab(tab as any);
              }
            }}
          />
        )}

      {/* Campaign Settings Sub-Menus are now integrated in the top Navigation System */}

      {/* TAB 4: STAFF & ROLES MANAGEMENT (5 ROLES & GRANULAR PERMISSIONS SYSTEM) */}
      {activeTab === 'staff' && canManageStaffAndRoles && (
        <StaffManagementView
          adminUsers={adminUsers}
          currentAdminUser={currentAdminUser}
          campaignSettings={campaignSettings}
          onAddAdminUser={onAddAdminUser}
          onUpdateAdminUser={onUpdateAdminUser}
          onDeleteAdminUser={onDeleteAdminUser}
          onUpdateCampaignSettings={onUpdateCampaignSettings}
        />
      )}

      {/* TAB 5: CAMPAIGN CONTACT SETTINGS & CSV EXPORT */}
      {activeTab === 'settings' && (
        <div className="space-y-8 max-w-4xl mx-auto animate-fadeIn">
          {/* CARD 1: EXPORT PILGRIMS CSV CARD (تصدير بيانات الحجاج إلى ملف CSV) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center font-bold border border-emerald-500/20 shadow-sm shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>تصدير قائمة بيانات الحجاج الحالية (CSV)</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      قاعدة بيانات كاملة والتقارير الخارجية
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    تصدير قائمة الحجاج الحالية بجميع البيانات المسجلة لتسهيل المعالجة الخارجية، التحليلات، وإعداد التقارير في Excel و Google Sheets.
                  </p>
                </div>
              </div>
            </div>

            {/* إحصائيات موحدة للبيانات الجاهزة للتصدير (بنفس تنسيق كشف التسكين) */}
            <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-around gap-3 shadow-sm">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-bold">إجمالي الحجاج</span>
                <strong className="text-sm font-black text-slate-900 dark:text-white">{pilgrims.length} حاج</strong>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="text-right">
                <span className="text-[11px] text-emerald-500 block font-bold">المؤكد دفعهم</span>
                <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {activePilgrims.filter(p => isPilgrimPaymentConfirmed(p)).length}
                </strong>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="text-right">
                <span className="text-[11px] text-amber-500 block font-bold">الحجاج النشطين</span>
                <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{activePilgrims.length}</strong>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="text-right">
                <span className="text-[11px] text-purple-500 block font-bold">قائمة المستبعدين</span>
                <strong className="text-sm font-black text-purple-600 dark:text-purple-400">{excludedPilgrimsList.length}</strong>
              </div>
            </div>

            {/* تنبيه نجاح التصدير */}
            {csvExportSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                  <span className="font-bold">{csvExportSuccess}</span>
                </div>
                <span className="text-[11px] font-mono opacity-80 hidden sm:inline">UTF-8 BOM جاهز للاستخدام المباشر</span>
              </div>
            )}

            {/* أزرار وخيارات التصدير المتعددة */}
            <div className="space-y-3">
              {/* الزر الرئيسي الشامل */}
              <button
                type="button"
                onClick={() => handleExportCSV(pilgrims, 'كافة_بيانات_الحجاج_الشاملة')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-between gap-4 cursor-pointer active:scale-[0.99] border border-emerald-400/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-black">تصدير قائمة الحجاج الحالية بالكامل (Excel .xlsx بالهوية الرسمية)</span>
                    <span className="block text-[11px] text-emerald-100 font-normal">
                      يتضمن كافة الحقول والبيانات المسجلة لجميع الحجاج ({pilgrims.length} حاج) بتصميم وهوية قافلة القائم المعتمدة
                    </span>
                  </div>
                </div>
                <Download className="w-5 h-5 shrink-0" />
              </button>

              {/* زر فتح نافذة إعداد وتخصيص أعمدة التقرير وترتيبها */}
              <button
                type="button"
                onClick={() => {
                  const lastRep = getLastExportedAlQaemReport();
                  if (lastRep) {
                    openAlQaemExcelCustomizer(lastRep);
                  } else {
                    handleExportCSV(activePilgrims, 'الحجاج_النشطين_المقبولين');
                    setTimeout(() => {
                      const generated = getLastExportedAlQaemReport();
                      if (generated) openAlQaemExcelCustomizer(generated);
                    }, 100);
                  }
                }}
                className="w-full p-3.5 rounded-2xl bg-[#0C1220] hover:bg-[#12192C] text-[#F4C84A] border border-[#C5A45D] font-black text-xs sm:text-sm shadow transition-all flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#12192C] border border-[#C5A45D]/40 flex items-center justify-center shrink-0 text-[#F4C84A]">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <span className="block text-xs sm:text-sm font-black text-[#F4C84A]">
                      نافذة إعداد التقرير وتخصيص وترتيب الأعمدة (محرك Excel المركزي)
                    </span>
                    <span className="block text-[11px] text-[#D6DCE8] font-normal">
                      اختيار أعمدة محددة أو إعادة ترتيبها ومعاينة الهوية البصرية لنظام قافلة القائم قبل التصدير
                    </span>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-[#20B995] shrink-0" />
              </button>

              {/* أزرار تصدير فرعية حسب الحالة */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleExportCSV(activePilgrims, 'الحجاج_النشطين_المقبولين')}
                  className="p-3.5 bg-slate-50 dark:bg-slate-950 hover:bg-amber-500/10 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 rounded-2xl text-right transition cursor-pointer flex items-center gap-3"
                >
                  <div className="p-2 bg-amber-500/15 text-amber-500 rounded-xl shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">الحجاج النشطين فقط</span>
                    <span className="text-[10px] text-slate-400 font-mono">{activePilgrims.length} حاج مسجل</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const conf = activePilgrims.filter(p => isPilgrimPaymentConfirmed(p));
                    handleExportCSV(conf, 'الحجاج_المؤكد_دفعهم');
                  }}
                  className="p-3.5 bg-slate-50 dark:bg-slate-950 hover:bg-emerald-500/10 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl text-right transition cursor-pointer flex items-center gap-3"
                >
                  <div className="p-2 bg-emerald-500/15 text-emerald-500 rounded-xl shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">المؤكد دفعهم فقط</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {activePilgrims.filter(p => isPilgrimPaymentConfirmed(p)).length} حاج مؤكد
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportCSV(excludedPilgrimsList, 'المستبعدين')}
                  className="p-3.5 bg-slate-50 dark:bg-slate-950 hover:bg-red-500/10 border border-slate-200 dark:border-slate-800 hover:border-red-500/50 rounded-2xl text-right transition cursor-pointer flex items-center gap-3"
                >
                  <div className="p-2 bg-red-500/15 text-red-500 rounded-xl shrink-0">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">قائمة المستبعدين</span>
                    <span className="text-[10px] text-slate-400 font-mono">{excludedPilgrimsList.length} مستبعد</span>
                  </div>
                </button>
              </div>
            </div>

            {/* تفاصيل الحقول المضمنة بالملف */}
            <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>البيانات الشاملة المتضمنة في ملف الـ CSV المصدر:</span>
              </span>
              <p className="leading-relaxed">
                الرقم التسلسلي، رقم العضوية، الاسم الرباعي الكامل، الاسم بالإنجليزية، رقم الهوية الوطنية/الإقامة، تواريخ الإصدار والانتهاء والميلاد، الجنس والجنسية، بيانات التواصل (الجوال، الواتساب، البريد)، رقم الآيبان والبنك واسم الحساب، الباقة المختارة، إجمالي السعر، المبالغ المسددة والمحولة والمتبقية، رقم العملية البنكية وتاريخها، وسيلة النقل، رقم الباص والمقعد، رقم غرفة سكن مكة وسكن المدينة، مرجع التقليد الحالي والسابق، القدرة على الحركة، الحالات الصحية والاحتياجات الخاصة، وبيانات المحرم والمرافقين.
              </p>
            </div>
          </div>

          {/* CARD 1.5: PILGRIMS & HISTORICAL STATISTICS (إحصائيات الحجاج والأعوام السابقة) */}
          {(() => {
            const currentStatsConfig = getEffectivePilgrimStatsConfig({
              ...campaignSettings,
              pilgrimStatsConfig: settingsForm.pilgrimStatsConfig || campaignSettings.pilgrimStatsConfig,
            });
            const liveStats = calculatePilgrimStatsBreakdown(pilgrims, {
              ...campaignSettings,
              pilgrimStatsConfig: currentStatsConfig,
            });

            const persistPilgrimStatsConfig = (nextConfig: typeof currentStatsConfig) => {
              const updatedSettings: CampaignSettings = {
                ...campaignSettings,
                ...settingsForm,
                pilgrimStatsConfig: nextConfig,
                youtubeConfig: campaignSettings.youtubeConfig || settingsForm.youtubeConfig,
              };
              setSettingsForm(updatedSettings);
              onUpdateCampaignSettings(updatedSettings);
              setPilgrimStatsSavedNotice(true);
              setTimeout(() => setPilgrimStatsSavedNotice(false), 3500);
            };

            const handleAddHistoricalRecord = () => {
              const cleanYear = newHistYearInput.trim();
              const parsedCount = Math.max(0, parseInt(newHistCountInput.replace(/[^\d]/g, ''), 10) || 0);
              if (!cleanYear || parsedCount <= 0) return;

              const formattedYear = cleanYear.endsWith('هـ') ? cleanYear : `${cleanYear}هـ`;
              const newRecord = {
                id: `hist-${Date.now()}`,
                hijriYear: formattedYear,
                pilgrimsCount: parsedCount,
                notes: newHistNotesInput.trim() || `موسم حج ${formattedYear}`,
              };

              const nextConfig = {
                ...currentStatsConfig,
                historicalRecords: [newRecord, ...(currentStatsConfig.historicalRecords || [])],
              };
              persistPilgrimStatsConfig(nextConfig);
              setNewHistYearInput('');
              setNewHistCountInput('');
              setNewHistNotesInput('');
            };

            const handleRemoveHistoricalRecord = (recordId: string) => {
              const nextConfig = {
                ...currentStatsConfig,
                historicalRecords: (currentStatsConfig.historicalRecords || []).filter(
                  (r) => r.id !== recordId
                ),
              };
              persistPilgrimStatsConfig(nextConfig);
            };

            const handleUpdateHistoricalRecordCount = (recordId: string, newCountVal: string) => {
              const parsed = Math.max(0, parseInt(newCountVal.replace(/[^\d]/g, ''), 10) || 0);
              const nextRecords = (currentStatsConfig.historicalRecords || []).map((r) =>
                r.id === recordId ? { ...r, pilgrimsCount: parsed } : r
              );
              setSettingsForm((prev) => ({
                ...prev,
                pilgrimStatsConfig: {
                  ...currentStatsConfig,
                  historicalRecords: nextRecords,
                },
              }));
            };

            return (
              <div className="bg-[#0B1221] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-right">
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/90 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-amber-500/15 text-amber-400 rounded-2xl flex items-center justify-center font-bold border border-amber-500/35 shadow-sm shrink-0">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 flex-wrap">
                        <span>إحصائيات الحجاج والأعوام السابقة</span>
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          عداد الصفحة الرئيسية المباشر
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        إدارة أعداد حجاج الأعوام السابقة وربطها التلقائي بمسافري الطيران والباصات الفعليين لتحديث عداد «حاج مسجل ومنضم» في الصفحة الرئيسية لحظياً.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => persistPilgrimStatsConfig(currentStatsConfig)}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ وتحديث العداد فوراً</span>
                  </button>
                </div>

                {pilgrimStatsSavedNotice && (
                  <div className="bg-emerald-500/15 border border-emerald-500/35 p-3.5 rounded-2xl text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>تم حفظ إحصائيات الحجاج وتحديث الرقم المعروض في الصفحة الرئيسية بنجاح!</span>
                  </div>
                )}

                {/* Live Equation Breakdown Box: إجمالي السنوات السابقة + مسافري الطيران الفعليين + مسافري الباصات الفعليين = الرقم المعروض في الصفحة الرئيسية */}
                <div className="bg-gradient-to-l from-amber-500/[0.12] via-[#10192D] to-[#080D1A] border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>معادلة الاحتساب الحي لعداد الصفحة الرئيسية («حاج مسجل ومنضم»):</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                      تحديث تلقائي متزامن
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-2.5 text-center">
                    {/* 1. Past Years Total */}
                    <div className="bg-[#0B1221]/90 border border-slate-800 rounded-xl p-3">
                      <span className="text-[11px] text-slate-400 font-bold block">إجمالي السنوات السابقة</span>
                      <strong className="text-lg font-black text-white font-mono tabular-nums mt-0.5 block">
                        {liveStats.pastYearsPilgrimsTotal.toLocaleString('en-US')}
                      </strong>
                    </div>

                    <div className="text-amber-400 font-black text-lg">+</div>

                    {/* 2. Active Flight Passengers */}
                    <div className={`bg-[#0B1221]/90 border rounded-xl p-3 transition-opacity ${liveStats.autoIncludeCurrentPassengers ? 'border-sky-500/30' : 'border-slate-800 opacity-50'}`}>
                      <span className="text-[11px] text-sky-400 font-bold flex items-center justify-center gap-1">
                        <Plane className="w-3.5 h-3.5" />
                        <span>مسافري الطيران الفعليين</span>
                      </span>
                      <strong className="text-lg font-black text-sky-300 font-mono tabular-nums mt-0.5 block">
                        {liveStats.autoIncludeCurrentPassengers ? liveStats.activeFlightPassengersCount.toLocaleString('en-US') : 0}
                      </strong>
                    </div>

                    <div className="text-amber-400 font-black text-lg">+</div>

                    {/* 3. Active Bus Passengers */}
                    <div className={`bg-[#0B1221]/90 border rounded-xl p-3 transition-opacity ${liveStats.autoIncludeCurrentPassengers ? 'border-emerald-500/30' : 'border-slate-800 opacity-50'}`}>
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                        <Bus className="w-3.5 h-3.5" />
                        <span>مسافري الباصات الفعليين</span>
                      </span>
                      <strong className="text-lg font-black text-emerald-300 font-mono tabular-nums mt-0.5 block">
                        {liveStats.autoIncludeCurrentPassengers ? liveStats.activeBusPassengersCount.toLocaleString('en-US') : 0}
                      </strong>
                    </div>

                    <div className="text-amber-400 font-black text-lg">=</div>

                    {/* 4. Final Displayed Number on Homepage */}
                    <div className="bg-amber-500/20 border-2 border-amber-500/60 rounded-xl p-3 shadow-md">
                      <span className="text-[11px] text-amber-300 font-bold block">الرقم المعروض في الرئيسية</span>
                      <strong dir="ltr" className="text-xl font-black text-amber-400 font-mono tabular-nums mt-0.5 inline-block">
                        {formatPilgrimsCountWithPlus(liveStats.totalPilgrims)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Toggle Option: Auto-include current active passengers from Flights & Buses */}
                <div className="bg-[#10192D] border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <span>الاحتساب التلقائي لمسافري الطيران والباصات الفعليين للموسم الحالي</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          currentStatsConfig.autoIncludeCurrentPassengers
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {currentStatsConfig.autoIncludeCurrentPassengers ? 'مفعّل تلقائياً' : 'متوقف'}
                      </span>
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      عند التفعيل، يتم إضافة عدد حجاج رحلات الطيران النشطين ({liveStats.activeFlightPassengersCount}) وحجاج رحلات الحافلات النشطين ({liveStats.activeBusPassengersCount}) تلقائياً وبشكل فوري إلى إجمالي السنوات السابقة.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={currentStatsConfig.autoIncludeCurrentPassengers}
                    onClick={() => {
                      const nextConfig = {
                        ...currentStatsConfig,
                        autoIncludeCurrentPassengers: !currentStatsConfig.autoIncludeCurrentPassengers,
                      };
                      persistPilgrimStatsConfig(nextConfig);
                    }}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      currentStatsConfig.autoIncludeCurrentPassengers
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40 shadow'
                        : 'bg-[#080D1A] hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {currentStatsConfig.autoIncludeCurrentPassengers
                        ? 'مفعّل: يشمل الطيران والباصات'
                        : 'تفعيل دمج الطيران والباصات'}
                    </span>
                  </button>
                </div>

                {/* Active Season Year Setting */}
                <div className="bg-[#10192D] border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>العام الهجري لموسم الحج النشط</span>
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      يحدد هذا العام أي حجاج يعتبرون ضمن الموسم الحالي النشط لعزل إحصائياتهم عن مواسم الأعوام السابقة ومنع التضارب.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={currentStatsConfig.activeSeasonYear || '1448'}
                      onChange={(e) => {
                        const cleanYear = e.target.value.replace(/[^\d]/g, '');
                        const nextConfig = {
                          ...currentStatsConfig,
                          activeSeasonYear: cleanYear || '1448',
                        };
                        setSettingsForm((prev) => ({
                          ...prev,
                          pilgrimStatsConfig: nextConfig,
                        }));
                      }}
                      className="w-24 bg-[#080D1A] border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-center text-amber-300 font-mono font-bold text-sm focus:outline-none"
                      placeholder="1448"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => persistPilgrimStatsConfig(currentStatsConfig)}
                      className="px-4 py-2 bg-[#16233E] hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/35 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                    >
                      تثبيت العام
                    </button>
                  </div>
                </div>

                {/* Base Historical Total + Add New Hijri Year Record */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Base Historical Pilgrim Count Input */}
                  <div className="lg:col-span-5 bg-[#10192D]/80 border border-slate-800/90 rounded-2xl p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-amber-300 mb-1">
                        الرصيد التأسيسي للأعوام السابقة (إجمالي عام اختياري)
                      </label>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        يمكنك إدخال رصيد تأسيسي تراكمي للأعوام السابقة (أو الاكتفاء بجدول الأعوام الهجرية أدناه، حيث يتم جمعهما معاً):
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={currentStatsConfig.baseHistoricalCount || 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setSettingsForm((prev) => ({
                            ...prev,
                            pilgrimStatsConfig: {
                              ...currentStatsConfig,
                              baseHistoricalCount: val,
                            },
                          }));
                        }}
                        className="w-full bg-[#080D1A] border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none"
                        dir="ltr"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => persistPilgrimStatsConfig(currentStatsConfig)}
                        className="px-4 py-2.5 bg-[#16233E] hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/35 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                      >
                        تطبيق
                      </button>
                    </div>
                  </div>

                  {/* Add Historical Hijri Year Record Form */}
                  <div className="lg:col-span-7 bg-[#10192D]/80 border border-slate-800/90 rounded-2xl p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-amber-300 mb-1">
                        إضافة سجل عام هجري سابق إلى الأرشيف الإحصائي
                      </label>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        أدخل السنة الهجرية وعدد الحجاج ليتم إضافتها إلى إجمالي السنوات السابقة وتحديث العداد تلقائياً:
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        value={newHistYearInput}
                        onChange={(e) => setNewHistYearInput(e.target.value)}
                        className="bg-[#080D1A] border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
                        placeholder="السنة الهجرية (مثال: 1447هـ)"
                      />
                      <input
                        type="number"
                        min={1}
                        value={newHistCountInput}
                        onChange={(e) => setNewHistCountInput(e.target.value)}
                        className="bg-[#080D1A] border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none"
                        dir="ltr"
                        placeholder="عدد الحجاج (مثال: 280)"
                      />
                      <button
                        type="button"
                        onClick={handleAddHistoricalRecord}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة عام سابق</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Historical Years Records Table / List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-300">
                      سجل أعداد الحجاج للأعوام الهجرية السابقة ({currentStatsConfig.historicalRecords.length} أعوام مسجلة)
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      مجموع السجلات السنوية: {liveStats.historicalRecordsTotal.toLocaleString('en-US')} حاج
                    </span>
                  </div>

                  {currentStatsConfig.historicalRecords.length === 0 ? (
                    <div className="bg-[#080D1A] border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                      لا توجد سجلات أعوام سابقة مضافة حالياً. يمكنك إضافة أعوام هجرية من الحقل أعلاه أو تحديد الرصيد التأسيسي.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {currentStatsConfig.historicalRecords.map((rec) => (
                        <div
                          key={rec.id}
                          className="bg-[#080D1A] border border-slate-800/90 hover:border-amber-500/35 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-black text-amber-300 block">
                              عام {rec.hijriYear}
                            </span>
                            {rec.notes && (
                              <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                                {rec.notes}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1.5 bg-[#10192D] border border-slate-700 rounded-xl px-2.5 py-1.5">
                              <input
                                type="number"
                                min={0}
                                value={rec.pilgrimsCount}
                                onChange={(e) => handleUpdateHistoricalRecordCount(rec.id, e.target.value)}
                                onBlur={() => persistPilgrimStatsConfig(currentStatsConfig)}
                                className="w-20 bg-transparent text-white font-mono font-bold text-xs text-center focus:outline-none"
                                dir="ltr"
                                aria-label={`عدد حجاج عام ${rec.hijriYear}`}
                              />
                              <span className="text-[10px] text-slate-400 font-bold">حاج</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveHistoricalRecord(rec.id)}
                              className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 flex items-center justify-center transition cursor-pointer"
                              title="حذف هذا العام من السجل"
                              aria-label={`حذف سجل عام ${rec.hijriYear}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* CARD 2: CAMPAIGN CONTACT SETTINGS & SITE TEXTS */}
          <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center font-bold">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">إعدادات التواصل ومعلومات القافلة</h3>
                <p className="text-xs text-slate-500 mt-0.5">تعديل أرقام الهواتف، الواتساب، البريد الإلكتروني، وعنوان المقر لتظهر في كافة صفحات الموقع</p>
              </div>
            </div>

            <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">أي تعديل في هذه الحقول يظهر فوراً للزوار عند الحفظ</span>
            <button
              type="button"
              onClick={() => {
                onUpdateCampaignSettings(settingsForm);
                setSettingsSaved(true);
                setTimeout(() => setSettingsSaved(false), 4000);
              }}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow flex items-center gap-2 transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ ونشر التعديلات فوراً</span>
            </button>
          </div>

          {settingsSaved && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-emerald-500 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>تم حفظ ونشر التعديلات بنجاح وتطبيقها في الموقع فوراً!</span>
            </div>
          )}

          {/* YouTube Channel & Live Stream Control inside Settings Tab */}
          <YouTubeAdminControl
            campaignSettings={campaignSettings}
            onUpdateCampaignSettings={(updated) => {
              setSettingsForm((prev) => ({
                ...prev,
                youtubeConfig: updated.youtubeConfig,
              }));
              onUpdateCampaignSettings(updated);
            }}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateCampaignSettings({
                ...campaignSettings,
                ...settingsForm,
                youtubeConfig: campaignSettings.youtubeConfig || settingsForm.youtubeConfig,
              });
              setSettingsSaved(true);
              setTimeout(() => setSettingsSaved(false), 4000);
            }}
            className="space-y-5 text-right text-sm"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم هاتف القافلة الرئيسي *</label>
              <input
                type="text"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الواتساب الرسمي *</label>
              <input
                type="text"
                value={settingsForm.whatsapp}
                onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني للقافلة *</label>
              <input
                type="email"
                value={settingsForm.email}
                onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان مقر القافلة الرئيسي *</label>
              <input
                type="text"
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white"
                required
              />
            </div>

            {/* Editable Site Texts Section */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-base">
                <span>تحرير وتعديل نصوص وكتابات الواجهة الرئيسية</span>
              </div>
              <p className="text-xs text-slate-400">
                يمكنك تخصيص وتعديل جميع العناوين والنصوص المعروضة في الصفحة الرئيسية لتناسب إعلانات ومواسم القافلة:
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نص شريط الإعلان العلوي (الشريط البرتقالي أعلى الموقع) *</label>
                <input
                  type="text"
                  value={settingsForm.siteTexts?.topBarAnnouncement || ''}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    siteTexts: {
                      ...(settingsForm.siteTexts || {} as any),
                      topBarAnnouncement: e.target.value
                    }
                  })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                  placeholder="قافلة القائم للحج والعمرة - موسم 1448هـ"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم القافلة في الترويسة *</label>
                  <input
                    type="text"
                    value={settingsForm.siteTexts?.brandName || ''}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      siteTexts: {
                        ...(settingsForm.siteTexts || {} as any),
                        brandName: e.target.value
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                    placeholder="قافلة القائم"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">النص الفرعي للاسم *</label>
                  <input
                    type="text"
                    value={settingsForm.siteTexts?.brandSubtitle || ''}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      siteTexts: {
                        ...(settingsForm.siteTexts || {} as any),
                        brandSubtitle: e.target.value
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                    placeholder="للحج والعمرة والزيارة"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نص الشارة العلوية (Badge الإعلان) *</label>
                <input
                  type="text"
                  value={settingsForm.siteTexts?.heroBadge || ''}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    siteTexts: {
                      ...(settingsForm.siteTexts || {} as any),
                      heroBadge: e.target.value
                    }
                  })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                  placeholder="فتح باب التسجيل لحج موسم 1448 هـ - المقاعد محدودة"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">بداية العنوان الرئيسي *</label>
                  <input
                    type="text"
                    value={settingsForm.siteTexts?.heroTitlePrefix || ''}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      siteTexts: {
                        ...(settingsForm.siteTexts || {} as any),
                        heroTitlePrefix: e.target.value
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                    placeholder="رفيقكم الموثوق في رحلة العمر"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الكلمة المميزة باللون الذهبي *</label>
                  <input
                    type="text"
                    value={settingsForm.siteTexts?.heroTitleHighlight || ''}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      siteTexts: {
                        ...(settingsForm.siteTexts || {} as any),
                        heroTitleHighlight: e.target.value
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm font-bold text-amber-500"
                    placeholder="قافلة القائم"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">النص الوصفي الترحيبي *</label>
                <textarea
                  rows={3}
                  value={settingsForm.siteTexts?.heroDescription || ''}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    siteTexts: {
                      ...(settingsForm.siteTexts || {} as any),
                      heroDescription: e.target.value
                    }
                  })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                  placeholder="نقدم خدمات متكاملة وراقية لحجاج بيت الله الحرام والمعتمرين..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نص زر استعراض الباقات في الصفحة الرئيسية (البرتقالي) *</label>
                  <input
                    type="text"
                    value={settingsForm.siteTexts?.registerButtonText || ''}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      siteTexts: {
                        ...(settingsForm.siteTexts || {} as any),
                        registerButtonText: e.target.value
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                    placeholder="استعراض باقات الحج والعمرة"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نص زر بوابة الاستعلام *</label>
                  <input
                    type="text"
                    value={settingsForm.siteTexts?.portalButtonText || ''}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      siteTexts: {
                        ...(settingsForm.siteTexts || {} as any),
                        portalButtonText: e.target.value
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                    placeholder="بوابة الاستعلام للحاج"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">شارة موسم الكرت الجانبي *</label>
                  <input
                    type="text"
                    value={settingsForm.siteTexts?.cardSeasonBadge || ''}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      siteTexts: {
                        ...(settingsForm.siteTexts || {} as any),
                        cardSeasonBadge: e.target.value
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                    placeholder="موسم 1448هـ"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان كرت الشعار *</label>
                  <input
                    type="text"
                    value={settingsForm.siteTexts?.cardTitle || ''}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      siteTexts: {
                        ...(settingsForm.siteTexts || {} as any),
                        cardTitle: e.target.value
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                    placeholder="قافلة القائم للحج والعمرة"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">وصف كرت الشعار *</label>
                <input
                  type="text"
                  value={settingsForm.siteTexts?.cardSubtitle || ''}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    siteTexts: {
                      ...(settingsForm.siteTexts || {} as any),
                      cardSubtitle: e.target.value
                    }
                  })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                  placeholder="خدمة ضيوف الرحمن شرف وفخر لنا منذ سنوات طويلة"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">شارة الشريط العلوي (الترخيص) *</label>
                  <input
                    type="text"
                    value={settingsForm.siteTexts?.topBarBadge || ''}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      siteTexts: {
                        ...(settingsForm.siteTexts || {} as any),
                        topBarBadge: e.target.value
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                    placeholder="ترخيص رسمي معتمد"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الموقع الجغرافي بالشريط العلوي *</label>
                  <input
                    type="text"
                    value={settingsForm.siteTexts?.topBarSubtext || ''}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      siteTexts: {
                        ...(settingsForm.siteTexts || {} as any),
                        topBarSubtext: e.target.value
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm"
                    placeholder="القطيف / السعودية"
                  />
                </div>
              </div>
            </div>

            {/* Editable Marji List Section */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-indigo-500 font-bold text-base">
                <span>تعديل قائمة مراجع التقليد في الاستمارة</span>
              </div>
              <p className="text-xs text-slate-400">
                إضافة أو تعديل أسماء مراجع التقليد التي تظهر للحاج عند التسجيل:
              </p>
              
              <div className="space-y-2">
                {settingsForm.marjiList.map((marji, idx) => (
                    <div key={idx} className="flex gap-2">
                        <input
                            type="text"
                            value={marji}
                            onChange={(e) => {
                                const updated = [...settingsForm.marjiList];
                                updated[idx] = e.target.value;
                                setSettingsForm({...settingsForm, marjiList: updated});
                            }}
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const updated = settingsForm.marjiList.filter((_, i) => i !== idx);
                                setSettingsForm({...settingsForm, marjiList: updated});
                            }}
                            className="p-2 bg-red-500/10 text-red-500 rounded-xl"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => {
                        setSettingsForm({...settingsForm, marjiList: [...settingsForm.marjiList, '']});
                    }}
                    className="w-full py-2 bg-indigo-500/10 text-indigo-500 rounded-xl text-xs font-bold"
                >
                    + إضافة مرجع جديد
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl text-base shadow-xl flex items-center justify-center gap-3 transition active:scale-95"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>حفظ ونشر التعديلات فوراً في الموقع</span>
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* TAB 6: FEEDBACK & RATINGS */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-xs text-slate-400 block">إجمالي التقييمات</span>
              <div className="text-3xl font-black text-amber-500">{feedback.length}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-xs text-slate-400 block">متوسط التقييم العام</span>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-black text-emerald-500">
                  {feedback.length > 0 
                    ? (feedback.reduce((acc, curr) => acc + curr.rating, 0) / feedback.length).toFixed(1) 
                    : '0.0'}
                </div>
                <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 sm:col-span-2">
              <span className="text-xs text-slate-400 block mb-2">أبرز مجالات التميز / التحسين (بالتصنيف)</span>
              <div className="flex flex-wrap gap-2">
                {['عام', 'التنظيم', 'السكن', 'الإعاشة', 'الإرشاد الديني', 'المواصلات'].map(cat => {
                  const count = feedback.filter(f => f.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <span key={cat} className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300">
                      {cat}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            {/* عرض البطاقات الكاملة للجوال لضمان ظهور كامل التعليق والملاحظة بوضوح تام */}
            <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
              {feedback.map((f) => {
                const formattedDate =
                  typeof f.createdAt === 'string'
                    ? f.createdAt
                    : typeof (f.createdAt as any)?.toDate === 'function'
                    ? (f.createdAt as any).toDate().toLocaleDateString('ar-SA')
                    : typeof (f.createdAt as any)?.seconds === 'number'
                    ? new Date((f.createdAt as any).seconds * 1000).toLocaleDateString('ar-SA')
                    : '—';

                return (
                  <div key={f.id} className="p-5 space-y-3 text-right">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {f.pilgrimName || 'حاج مسجل'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                          {f.pilgrimId}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg text-xs font-bold">
                          {f.category}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                          {formattedDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= f.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200 dark:text-slate-800'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5">
                      <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                        الملاحظات والاقتراحات الكاملة:
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                        {f.comment || 'لا توجد ملاحظات مكتوبة'}
                      </p>
                    </div>
                  </div>
                );
              })}
              {feedback.length === 0 && (
                <div className="px-6 py-12 text-center text-slate-400 text-sm">
                  لا توجد تقييمات مقدمة حتى الآن
                </div>
              )}
            </div>

            {/* عرض الجدول الكامل للشاشات الكبيرة بدون أي اقتصاص للتعليق */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">اسم الحاج</th>
                    <th className="px-6 py-4 whitespace-nowrap">التصنيف</th>
                    <th className="px-6 py-4 whitespace-nowrap">التقييم</th>
                    <th className="px-6 py-4 min-w-[340px]">الملاحظات والاقتراحات</th>
                    <th className="px-6 py-4 whitespace-nowrap">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {feedback.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition align-top">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {f.pilgrimName || 'حاج مسجل'}
                        <div className="text-[10px] text-slate-400 font-mono" dir="ltr">{f.pilgrimId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg text-xs font-bold">
                          {f.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-3.5 h-3.5 ${star <= f.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200 dark:text-slate-800'}`} 
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 min-w-[340px]">
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                          {f.comment || 'لا توجد ملاحظات مكتوبة'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-[10px] text-slate-400 whitespace-nowrap">
                         {typeof f.createdAt === 'string'
                            ? f.createdAt
                            : typeof (f.createdAt as any)?.toDate === 'function'
                            ? (f.createdAt as any).toDate().toLocaleDateString('ar-SA')
                            : typeof (f.createdAt as any)?.seconds === 'number'
                            ? new Date((f.createdAt as any).seconds * 1000).toLocaleDateString('ar-SA')
                            : '—'}
                      </td>
                    </tr>
                  ))}
                  {feedback.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        لا توجد تقييمات مقدمة حتى الآن
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: ACTIVITY & AUDIT LOG (سجل النشاطات والرقابة) */}
      {activeTab === 'activityLog' && (() => {
        const todayDateStr = new Date().toLocaleDateString('en-CA');
        const uniqueUsers = Array.from(
          new Set(activityLogs.map(l => l.adminName).filter(Boolean))
        );

        const filteredLogs = activityLogs.filter(log => {
          const q = activitySearchQuery.trim().toLowerCase();
          const matchesQuery =
            !q ||
            (log.adminName && log.adminName.toLowerCase().includes(q)) ||
            (log.username && log.username.toLowerCase().includes(q)) ||
            (log.action && log.action.toLowerCase().includes(q)) ||
            (log.target && log.target.toLowerCase().includes(q)) ||
            (log.details && log.details.toLowerCase().includes(q));

          const matchesCategory =
            activityCategoryFilter === 'all' || log.category === activityCategoryFilter;

          const matchesUser =
            activityUserFilter === 'all' || log.adminName === activityUserFilter;

          return matchesQuery && matchesCategory && matchesUser;
        });

        const loginsCount = activityLogs.filter(
          l => l.category === 'تسجيل دخول / خروج' || l.action?.includes('دخول')
        ).length;

        const todayLogsCount = activityLogs.filter(
          l => (l.date || l.timestamp?.split('T')[0]) === todayDateStr
        ).length;

        const getCategoryBadgeStyle = (cat?: string) => {
          switch (cat) {
            case 'تسجيل دخول / خروج':
              return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
            case 'المالية والإيصالات':
              return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
            case 'إدارة الحجاج':
              return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
            case 'الباقات والإعلانات':
              return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
            case 'المشرفين والإعدادات':
              return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
            default:
              return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
          }
        };

        const handleExportActivityLogCSV = () => {
          if (filteredLogs.length === 0) return;
          const headers = [
            'التسلسل',
            'اسم المستخدم / المشرف',
            'المعرف / البريد',
            'الدور الوظيفي',
            'تصنيف العملية',
            'النشاط الذي قام به',
            'الهدف / السجل المتأثر',
            'تفاصيل إضافية',
            'تاريخ العملية',
            'وقت الدخول / التنفيذ'
          ];
          const rows = filteredLogs.map((l, idx) => {
            const d = l.date || (l.timestamp ? l.timestamp.split('T')[0] : '—');
            const t =
              l.time ||
              (l.timestamp && l.timestamp.includes('T')
                ? new Date(l.timestamp).toLocaleTimeString('ar-SA')
                : '—');
            return [
              idx + 1,
              l.adminName || '—',
              l.username || l.adminId || '—',
              l.userRole || 'مشرف',
              l.category || 'عام',
              l.action || '—',
              l.target || '—',
              l.details || '—',
              d,
              t,
            ];
          });
          void exportAlQaemExcelReport({
            reportTitle: 'تقرير الإشراف والمتابعة وسجل النشاطات والرقابة',
            subtitle: 'السجل الرقابي الموحد لعمليات المشرفين والتعديلات والاعتمادات في النظام',
            category: 'تقارير المشرفين والإشراف والرقابة',
            filename: `سجل_النشاطات_والرقابة_${todayDateStr}`,
            columns: headers,
            rows,
            generatedBy: currentAdminUser?.fullName || 'الإدارة العامة',
            summaryCards: [
              { label: 'إجمالي العمليات المسجلة', value: `${filteredLogs.length} عملية` },
              { label: 'تاريخ التقرير', value: todayDateStr },
            ],
          });
        };

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* رأس سجل الرقابة مع شريط الإحصائيات الموحد (بنفس تنسيق كشف التسكين) */}
            <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-amber-500/10 border border-blue-500/30 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>سجل النشاطات والرقابة الإدارية</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950">
                      توثيق فوري
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
                    يرصد جميع أنشطة المستخدمين والمشرفين، وقت وتاريخ دخولهم، والعمليات التي قاموا بها بالتفصيل.
                  </p>
                </div>
              </div>

              <div className="w-full lg:w-auto flex items-center justify-end">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-around sm:justify-start gap-3 sm:gap-4 shadow-sm w-full sm:w-auto">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-bold">إجمالي الأنشطة</span>
                    <strong className="text-sm font-black text-slate-900 dark:text-white">{activityLogs.length} نشاط</strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-500 block font-bold">دخول وخروج</span>
                    <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{loginsCount}</strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-amber-500 block font-bold">نشاطات اليوم</span>
                    <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{todayLogsCount}</strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[11px] text-purple-500 block font-bold">المستخدمون</span>
                    <strong className="text-sm font-black text-purple-600 dark:text-purple-400">{uniqueUsers.length}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* شريط البحث والفلترة وتصدير سجل الرقابة */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <span>سجل النشاطات والرقابة الشامل (Audit & Activity Log)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    يرصد جميع أنشطة المستخدمين والمشرفين، وقت وتاريخ دخولهم، والعمليات التي قاموا بها بالتفصيل
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportActivityLogCSV}
                  disabled={filteredLogs.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow transition shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير سجل الرقابة (CSV)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  <input
                    type="text"
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    placeholder="ابحث باسم المستخدم، النشاط، أو اسم الحاج..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pr-10 pl-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={activityCategoryFilter}
                  onChange={(e) => setActivityCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold"
                >
                  <option value="all">جميع التصنيفات والأنشطة</option>
                  <option value="تسجيل دخول / خروج">تسجيل دخول / خروج المستخدمين</option>
                  <option value="إدارة الحجاج">إدارة الحجاج والتسكين</option>
                  <option value="المالية والإيصالات">المالية وتدقيق الإيصالات</option>
                  <option value="الباقات والإعلانات">الباقات والإعلانات</option>
                  <option value="المشرفين والإعدادات">المشرفين وإعدادات القافلة</option>
                  <option value="بوابة الحاج والتسجيل">بوابة الحاج والتسجيل</option>
                </select>

                <select
                  value={activityUserFilter}
                  onChange={(e) => setActivityUserFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold"
                >
                  <option value="all">جميع المستخدمين والمشرفين</option>
                  {uniqueUsers.map((uName) => (
                    <option key={uName} value={uName}>
                      {uName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* قائمة سجل النشاطات والرقابة (بطاقات للجوال + جدول تفصيلي لسطح المكتب) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
              {/* عرض البطاقات المتجاوب للجوال */}
              <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLogs.map((log) => {
                  const dateDisplay =
                    log.date || (log.timestamp ? log.timestamp.split('T')[0] : '—');
                  const timeDisplay =
                    log.time ||
                    (log.timestamp && log.timestamp.includes('T')
                      ? new Date(log.timestamp).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '—');

                  return (
                    <div key={log.id} className="p-5 space-y-3 text-right">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            <span>{log.adminName || 'مستخدم النظام'}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5" dir="ltr">
                            {log.username || log.adminId}
                          </div>
                          {log.userRole && (
                            <span className="inline-block mt-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                              {log.userRole}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${getCategoryBadgeStyle(log.category)}`}>
                            {log.category || 'نشاط إداري'}
                          </span>
                          <div className="text-[11px] font-mono font-bold text-amber-500 mt-1" dir="ltr">
                            {dateDisplay}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1" dir="ltr">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            <span>{timeDisplay}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                        <div className="text-xs font-black text-slate-900 dark:text-white leading-relaxed">
                          النشاط: {log.action}
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-bold break-words">
                          {log.target}
                        </div>
                        {(log.previousValue || log.newValue) && (
                          <div className="grid grid-cols-1 gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                            {log.previousValue && (
                              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 px-2.5 py-1.5 rounded-lg break-words">
                                <span className="font-black">القيمة السابقة: </span>
                                {log.previousValue}
                              </div>
                            )}
                            {log.newValue && (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-2.5 py-1.5 rounded-lg break-words">
                                <span className="font-black">القيمة الجديدة: </span>
                                {log.newValue}
                              </div>
                            )}
                          </div>
                        )}
                        {log.details && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-words pt-1 border-t border-slate-200/60 dark:border-slate-800">
                            {log.details}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <div className="px-6 py-12 text-center text-slate-400 text-sm">
                    لا توجد نشاطات مطابقة للبحث الحالي
                  </div>
                )}
              </div>

              {/* عرض الجدول الكامل للشاشات الكبيرة */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-4 whitespace-nowrap">المستخدم / المشرف</th>
                      <th className="px-5 py-4 whitespace-nowrap">الدور الوظيفي</th>
                      <th className="px-5 py-4 whitespace-nowrap">التصنيف</th>
                      <th className="px-5 py-4 min-w-[280px]">النشاط الذي قام به</th>
                      <th className="px-5 py-4 min-w-[220px]">الهدف / التفاصيل</th>
                      <th className="px-5 py-4 whitespace-nowrap">التاريخ</th>
                      <th className="px-5 py-4 whitespace-nowrap">وقت الدخول / التنفيذ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredLogs.map((log) => {
                      const dateDisplay =
                        log.date || (log.timestamp ? log.timestamp.split('T')[0] : '—');
                      const timeDisplay =
                        log.time ||
                        (log.timestamp && log.timestamp.includes('T')
                          ? new Date(log.timestamp).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : '—');

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition align-top">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                              {log.adminName || 'مستخدم النظام'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                              {log.username || log.adminId}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                              {log.userRole || 'مشرف'}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getCategoryBadgeStyle(log.category)}`}>
                              {log.category || 'إداري'}
                            </span>
                          </td>
                          <td className="px-5 py-4 min-w-[280px]">
                            <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {log.action}
                            </p>
                          </td>
                          <td className="px-5 py-4 min-w-[220px]">
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 break-words">
                              {log.target}
                            </p>
                            {(log.previousValue || log.newValue) && (
                              <div className="mt-1.5 space-y-1 text-[11px]">
                                {log.previousValue && (
                                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 px-2 py-1 rounded-md break-words">
                                    <span className="font-black">القيمة السابقة: </span>
                                    {log.previousValue}
                                  </div>
                                )}
                                {log.newValue && (
                                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-2 py-1 rounded-md break-words">
                                    <span className="font-black">القيمة الجديدة: </span>
                                    {log.newValue}
                                  </div>
                                )}
                              </div>
                            )}
                            {log.details && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-wrap break-words">
                                {log.details}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-700 dark:text-slate-200" dir="ltr">
                            {dateDisplay}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold" dir="ltr">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {timeDisplay}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          لا توجد نشاطات مسجلة تطابق معايير البحث الحالية
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 1: EDIT PILGRIM (FULL APPLICATION & DATA EDITOR) */}

      {editingPilgrim && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 max-w-4xl w-full max-h-[92vh] overflow-y-auto space-y-6 text-right shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 sticky top-0 bg-white dark:bg-slate-900 z-10 pt-1">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  تعديل طلب وبيانات الحاج: {editingPilgrim.firstName} {editingPilgrim.secondName} {editingPilgrim.lastName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  يمكنك تعديل الباقة المحجوزة، حالة التسجيل، البيانات الشخصية، الهوية، الجوال، السكن، أو أي معلومة أخرى
                </p>
              </div>
              <button
                onClick={() => setEditingPilgrim(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                title="إغلاق"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 text-sm">
              {/* SECTION 1: PACKAGE, STATUS & TRIP DETAILS */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 sm:p-5 space-y-4">
                <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>1. حالة الطلب والباقة والرحلة والتسكين</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">حالة التسجيل</label>
                    <select
                      value={editingPilgrim.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value as Pilgrim['status'];
                        setEditingPilgrim({
                          ...editingPilgrim,
                          status: nextStatus,
                        });
                      }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="قيد المراجعة">قيد المراجعة</option>
                      <option value="مقبول ومؤكد">مقبول ومؤكد</option>
                      <option value="مكتمل الدفع">مكتمل الدفع</option>
                      <option value="معتذر">معتذر</option>
                      <option value="مرفوض">مرفوض</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1 lg:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الباقة المختارة</label>
                    <select
                      value={editingPilgrim.selectedPackage || ''}
                      onChange={(e) => {
                        const selectedTitle = e.target.value;
                        const matchedPkg = packages.find(pkg => pkg.title === selectedTitle);
                        const isAirPkg =
                          selectedTitle.includes('طيران') ||
                          matchedPkg?.transport === 'طائرة' ||
                          (matchedPkg?.transport || '').includes('طيران');
                        const nextTransport = selectedTitle
                          ? isAirPkg
                            ? 'طائرة'
                            : 'باص'
                          : editingPilgrim.transport || 'باص';
                        setEditModalBusError(null);
                        setEditingPilgrim({
                          ...editingPilgrim,
                          selectedPackage: selectedTitle,
                          transport: nextTransport,
                          totalPackagePrice: matchedPkg?.price || editingPilgrim.totalPackagePrice,
                          ...(nextTransport === 'طائرة'
                            ? { busNumber: '', busSeat: '' }
                            : { flightNumberOutbound: '', flightNumberReturn: '', flightTicketNumber: '' }),
                        });
                      }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="">التسجيل العام (بدون باقة محددة)</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.title}>
                          {pkg.title} — ({pkg.price})
                        </option>
                      ))}
                      {editingPilgrim.selectedPackage &&
                        !packages.some((pkg) => pkg.title === editingPilgrim.selectedPackage) && (
                          <option value={editingPilgrim.selectedPackage}>
                            {editingPilgrim.selectedPackage}
                          </option>
                        )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      وسيلة المواصلات (تتحكم في ظهور الحاج بالطيران أو الباصات)
                    </label>
                    <select
                      value={isPilgrimAirTravel(editingPilgrim) ? 'طائرة' : 'باص'}
                      onChange={(e) => {
                        const nextTransport = e.target.value;
                        setEditModalBusError(null);
                        if (nextTransport === 'طائرة') {
                          const airPkg = packages.find(
                            (pkg) => pkg.title.includes('طيران') || pkg.transport === 'طائرة'
                          );
                          const currentPkgIsBus =
                            Boolean(editingPilgrim.selectedPackage) &&
                            !editingPilgrim.selectedPackage!.includes('طيران');
                          setEditingPilgrim({
                            ...editingPilgrim,
                            transport: 'طائرة',
                            selectedPackage:
                              currentPkgIsBus && airPkg ? airPkg.title : editingPilgrim.selectedPackage,
                            totalPackagePrice:
                              currentPkgIsBus && airPkg ? airPkg.price : editingPilgrim.totalPackagePrice,
                            busNumber: '',
                            busSeat: '',
                          });
                        } else {
                          const busPkg = packages.find(
                            (pkg) => !pkg.title.includes('طيران') && pkg.transport !== 'طائرة'
                          );
                          const currentPkgIsAir = (editingPilgrim.selectedPackage || '').includes('طيران');
                          setEditingPilgrim({
                            ...editingPilgrim,
                            transport: 'باص',
                            selectedPackage: currentPkgIsAir
                              ? busPkg?.title || ''
                              : editingPilgrim.selectedPackage,
                            totalPackagePrice:
                              currentPkgIsAir && busPkg ? busPkg.price : editingPilgrim.totalPackagePrice,
                            flightNumberOutbound: '',
                            flightNumberReturn: '',
                            flightTicketNumber: '',
                          });
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="باص">باص (يُدرج في كشف رحلات الحافلات فقط)</option>
                      <option value="طائرة">طائرة (يُدرج في كشف رحلات الطيران فقط)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نوع الحج / النسك</label>
                    <select
                      value={editingPilgrim.hajjType || 'تمتع'}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, hajjType: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="تمتع">تمتع</option>
                      <option value="مستحب">مستحب</option>
                      <option value="قِران">قِران</option>
                      <option value="إفراد">إفراد</option>
                      <option value="عمرة">عمرة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الرقم المرجعي للطلب</label>
                    <input
                      type="text"
                      value={editingPilgrim.registrationReference || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, registrationReference: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم غرفة سكن مكة المكرمة
                    </label>
                    <input
                      type="text"
                      value={editingPilgrim.roomNumberMakkah || editingPilgrim.roomNumber || ''}
                      onChange={(e) => setEditingPilgrim({
                        ...editingPilgrim,
                        roomNumberMakkah: e.target.value,
                        roomNumber: e.target.value
                      })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                      placeholder="مثال: غرفة 304 - برج مكة"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم غرفة السكن بالمدينة المنورة
                    </label>
                    <input
                      type="text"
                      value={editingPilgrim.roomNumberMadinah || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, roomNumberMadinah: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                      placeholder="مثال: غرفة 102 - فندق أنوار المدينة"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      تسكين منى (المخيم / المقعد)
                    </label>
                    <input
                      type="text"
                      value={editingPilgrim.roomNumberMina || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, roomNumberMina: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                      placeholder="مثال: مخيم 4 - صالة أ - مقعد 12"
                    />
                  </div>

                  {!isPilgrimAirTravel(editingPilgrim) ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            رقم الباص / الحافلة (الحد الأقصى {MAX_BUS_CAPACITY} راكب)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const newBus = handleAddNewBus();
                              setEditModalBusError(null);
                              setEditingPilgrim({ ...editingPilgrim, busNumber: newBus });
                            }}
                            className="text-[11px] font-bold text-sky-500 hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ إضافة حافلة جديدة ({getNextBusName()})</span>
                          </button>
                        </div>
                        <select
                          value={editingPilgrim.busNumber || ''}
                          onChange={(e) => {
                            const chosenBus = e.target.value;
                            if (chosenBus) {
                              const countInChosenBus = getBusPassengersCount(chosenBus, editingPilgrim.id);
                              if (countInChosenBus >= MAX_BUS_CAPACITY) {
                                setEditModalBusError(
                                  `تنبيه: العدد أكبر من المقاعد! (${chosenBus}) مكتملة العدد (${MAX_BUS_CAPACITY}/${MAX_BUS_CAPACITY} راكب). لا يمكن إضافة أكثر من 49 راكباً في الحافلة الواحدة.`
                                );
                                return;
                              }
                            }
                            setEditModalBusError(null);
                            setEditingPilgrim({ ...editingPilgrim, busNumber: chosenBus });
                          }}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-sky-500"
                        >
                          <option value="">غير مخصص بعد</option>
                          {BUS_OPTIONS.map((busOpt) => {
                            const countExcl = getBusPassengersCount(busOpt, editingPilgrim.id);
                            const isFull = countExcl >= MAX_BUS_CAPACITY;
                            return (
                              <option key={busOpt} value={busOpt}>
                                {busOpt} — ({countExcl} / {MAX_BUS_CAPACITY} راكب){isFull ? ' [مكتملة العدد]' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                          رقم المقعد في الباص (من 1 إلى {MAX_BUS_CAPACITY})
                        </label>
                        <select
                          value={editingPilgrim.busSeat || ''}
                          onChange={(e) => {
                            const nextSeat = e.target.value;
                            setEditModalBusError(null);
                            setEditingPilgrim({ ...editingPilgrim, busSeat: nextSeat });
                          }}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-bold font-mono focus:outline-none focus:border-amber-500"
                        >
                          <option value="">غير محدد</option>
                          {Array.from({ length: MAX_BUS_CAPACITY }, (_, i) => String(i + 1)).map((seatNo) => {
                            const chosenBus = (editingPilgrim.busNumber || '').trim();
                            const holder = chosenBus
                              ? busPilgrimsList.find(
                                  p =>
                                    p.id !== editingPilgrim.id &&
                                    (p.busNumber || '').trim() === chosenBus &&
                                    (p.busSeat || '').trim() === seatNo
                                )
                              : undefined;
                            return (
                              <option key={seatNo} value={seatNo}>
                                مقعد {seatNo}{holder ? ` (محجوز: ${holder.firstName} ${holder.lastName})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2 bg-sky-500/10 border border-sky-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-sky-700 dark:text-sky-300">
                      <Plane className="w-5 h-5 text-sky-500 shrink-0" />
                      <div>
                        <strong className="font-black block">هذا الحاج مسجل في (رحلات الطيران) ومعزول عن كشف الباصات</strong>
                        <span className="text-[11px] opacity-90">
                          تم إخفاء حقول الحافلة والمقعد لمنع التداخل. لتحويل الحاج إلى الباصات، قم بتغيير "وسيلة المواصلات" أو "الباقة المختارة" أعلاه إلى باص.
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم العضوية بالقافلة</label>
                    <input
                      type="text"
                      value={editingPilgrim.membershipNumber || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, membershipNumber: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      placeholder="مثال: QAEM-1448-1001"
                      dir="ltr"
                    />
                  </div>

                  {isPilgrimAirTravel(editingPilgrim) ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-sky-700 dark:text-sky-400 mb-1">
                          رحلة الطيران — الذهاب
                        </label>
                        <input
                          type="text"
                          value={editingPilgrim.flightNumberOutbound || ''}
                          onChange={(e) => setEditingPilgrim({ ...editingPilgrim, flightNumberOutbound: e.target.value })}
                          className="w-full bg-white dark:bg-slate-950 border border-sky-300 dark:border-sky-700/60 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                          placeholder="مثال: SV 1422 - الدمام 08:30 ص"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-1">
                          رحلة الطيران — العودة
                        </label>
                        <input
                          type="text"
                          value={editingPilgrim.flightNumberReturn || ''}
                          onChange={(e) => setEditingPilgrim({ ...editingPilgrim, flightNumberReturn: e.target.value })}
                          className="w-full bg-white dark:bg-slate-950 border border-indigo-300 dark:border-indigo-700/60 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                          placeholder="مثال: SV 1435 - جدة 09:15 م"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
                          رقم التذكرة / الحجز PNR
                        </label>
                        <input
                          type="text"
                          value={editingPilgrim.flightTicketNumber || ''}
                          onChange={(e) => setEditingPilgrim({ ...editingPilgrim, flightTicketNumber: e.target.value })}
                          className="w-full bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700/60 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                          placeholder="مثال: PNR: 8XK92M"
                          dir="ltr"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-300">
                      <Bus className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <strong className="font-black block">هذا الحاج مسجل في (رحلات الحافلات) ومعزول عن كشف الطيران</strong>
                        <span className="text-[11px] opacity-90">
                          لتحويل الحاج إلى رحلات الطيران وتخصيص تذكرة سفر له، قم بتغيير "وسيلة المواصلات" أو "الباقة المختارة" أعلاه إلى طائرة أولاً.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {editingPilgrim.status === 'مرفوض' && (
                  <div className="bg-red-500/5 border border-red-500/30 rounded-2xl p-4 space-y-2 animate-fadeIn">
                    <label className="block text-xs font-black text-red-600 dark:text-red-400">
                      سبب الرفض *
                    </label>
                    <textarea
                      rows={3}
                      value={editingPilgrim.rejectionReason ?? editingPilgrim.statusNotes ?? ''}
                      onChange={(e) =>
                        setEditingPilgrim({
                          ...editingPilgrim,
                          rejectionReason: e.target.value,
                          statusNotes: e.target.value,
                        })
                      }
                      className="w-full bg-white dark:bg-slate-950 border border-red-300 dark:border-red-500/40 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500 leading-relaxed"
                      placeholder="اكتب سبب رفض تسجيل الحاج هنا (مثال: عدم استيفاء شروط التصريح، نقص الوثائق، اكتمال العدد...)"
                    />
                    <p className="text-[11px] text-red-500/80">
                      سيتم حفظ سبب الرفض وترحيل الحاج إلى كشف المستبعدين مع إظهار السبب عند استعلام الحاج.
                    </p>
                  </div>
                )}

                {editingPilgrim.status === 'معتذر' && (
                  <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4 space-y-2 animate-fadeIn">
                    <label className="block text-xs font-bold text-amber-600 dark:text-amber-400">
                      سبب الاعتذار / ملاحظات (اختياري)
                    </label>
                    <textarea
                      rows={2}
                      value={editingPilgrim.statusNotes ?? ''}
                      onChange={(e) =>
                        setEditingPilgrim({
                          ...editingPilgrim,
                          statusNotes: e.target.value,
                        })
                      }
                      className="w-full bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-500/40 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      placeholder="ملاحظات حول اعتذار الحاج..."
                    />
                  </div>
                )}
              </div>

              {/* SECTION 2: PERSONAL & NATIONAL ID DETAILS */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>2. البيانات الشخصية وبيانات الهوية الوطنية</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم الأول</label>
                    <input
                      type="text"
                      value={editingPilgrim.firstName || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, firstName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الأب</label>
                    <input
                      type="text"
                      value={editingPilgrim.secondName || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, secondName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الجد</label>
                    <input
                      type="text"
                      value={editingPilgrim.thirdName || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, thirdName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم العائلة / اللقب</label>
                    <input
                      type="text"
                      value={editingPilgrim.lastName || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, lastName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل بالإنجليزية</label>
                    <input
                      type="text"
                      value={editingPilgrim.englishFullName || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, englishFullName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                      placeholder="FULL NAME IN ENGLISH"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهوية الوطنية / الإقامة</label>
                    <input
                      type="text"
                      value={editingPilgrim.nationalId || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, nationalId: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الجنس</label>
                    <select
                      value={editingPilgrim.gender || 'ذكر'}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, gender: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                    >
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الجنسية</label>
                    <input
                      type="text"
                      value={editingPilgrim.nationality || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, nationality: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ الميلاد</label>
                    <input
                      type="text"
                      value={editingPilgrim.birthDate || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, birthDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                      placeholder="YYYY-MM-DD / هـ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ إصدار الهوية</label>
                    <input
                      type="text"
                      value={editingPilgrim.idIssueDate || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, idIssueDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ انتهاء الهوية</label>
                    <input
                      type="text"
                      value={editingPilgrim.idExpiryDate || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, idExpiryDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: CONTACT & BANKING DETAILS */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>3. بيانات التواصل والحساب البنكي والمالية</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الجوال</label>
                    <input
                      type="text"
                      value={editingPilgrim.mobile || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, mobile: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الواتساب</label>
                    <input
                      type="text"
                      value={editingPilgrim.whatsapp || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, whatsapp: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={editingPilgrim.email || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, email: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم البنك</label>
                    <input
                      type="text"
                      value={editingPilgrim.bankName || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, bankName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم صاحب الحساب البنكي</label>
                    <input
                      type="text"
                      value={editingPilgrim.bankAccountName || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, bankAccountName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الآيبان (IBAN)</label>
                    <input
                      type="text"
                      value={editingPilgrim.iban || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, iban: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">إجمالي سعر الباقة</label>
                    <input
                      type="text"
                      value={editingPilgrim.totalPackagePrice || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, totalPackagePrice: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                      placeholder="مثال: 12,500 ريال"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">إجمالي المبلغ المسدد</label>
                    <input
                      type="text"
                      value={editingPilgrim.paidAmount || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, paidAmount: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                      placeholder="مثال: 6,000 ريال"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المبلغ المتبقي</label>
                    <input
                      type="text"
                      value={editingPilgrim.remainingAmount || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, remainingAmount: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                      placeholder="مثال: 6,500 ريال"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: FIQH & HEALTH DETAILS */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  <span>4. البيانات الفقهية والصحية</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">مرجع التقليد الحالي</label>
                    <input
                      type="text"
                      value={editingPilgrim.currentMarji || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, currentMarji: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                      placeholder="مثال: السيد السيستاني"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">مرجع التقليد السابق</label>
                    <input
                      type="text"
                      value={editingPilgrim.previousMarji || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, previousMarji: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سنة آخر حجة</label>
                    <input
                      type="text"
                      value={editingPilgrim.lastHajjYear || ''}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, lastHajjYear: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                      placeholder="مثال: لم يسبق / 1442هـ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">القدرة على الحركة دون مساعدة</label>
                    <select
                      value={editingPilgrim.mobilityIndependence || 'نعم'}
                      onChange={(e) => setEditingPilgrim({ ...editingPilgrim, mobilityIndependence: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                    >
                      <option value="نعم">نعم (قادر على المشي والحركة)</option>
                      <option value="لا">لا (يحتاج كرسي متحرك أو مساعدة)</option>
                    </select>
                  </div>
                </div>

                {/* Health Conditions & Medical Care Editor inside Pilgrim Modal */}
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-rose-500 font-black text-xs">
                    <HeartPulse className="w-4 h-4" />
                    <span>البيانات الصحية والاحتياجات الطبية الخاصة بالحاج:</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      الأمراض المزمنة المسجلة:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {['الضغط', 'السكري', 'أمراض القلب', 'تكسر الدم', 'فقر الدم', 'صعوبة في الحركة'].map((cond) => {
                        const checked = (editingPilgrim.healthConditions || []).includes(cond);
                        return (
                          <label
                            key={cond}
                            className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const current = (editingPilgrim.healthConditions || []).filter(
                                  (c) => c !== 'لا شيء مما ذكر'
                                );
                                const next = e.target.checked
                                  ? [...current, cond]
                                  : current.filter((c) => c !== cond);
                                setEditingPilgrim({
                                  ...editingPilgrim,
                                  healthConditions: next,
                                });
                              }}
                              className="w-4 h-4 accent-rose-600 rounded"
                            />
                            <span>{cond}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      أمراض أو ملاحظات صحية أخرى (اختياري):
                    </label>
                    <input
                      type="text"
                      value={editingPilgrim.otherHealthCondition || ''}
                      onChange={(e) =>
                        setEditingPilgrim({ ...editingPilgrim, otherHealthCondition: e.target.value })
                      }
                      placeholder="مثال: حساسية صدر، ربو، أدوية خاصة..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingPilgrim.needsAssistance)}
                        onChange={(e) =>
                          setEditingPilgrim({
                            ...editingPilgrim,
                            needsAssistance: e.target.checked,
                            mobilityIndependence: e.target.checked ? 'لا' : editingPilgrim.mobilityIndependence,
                          })
                        }
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        يحتاج وسيلة مساعدة للحركة (كرسي متحرك)
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingPilgrim.hasBackPain)}
                        onChange={(e) =>
                          setEditingPilgrim({ ...editingPilgrim, hasBackPain: e.target.checked })
                        }
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        يشكو من آلام بالظهر أو صعوبة بالحركة
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingPilgrim.hasSpeechDifficulty)}
                        onChange={(e) =>
                          setEditingPilgrim({ ...editingPilgrim, hasSpeechDifficulty: e.target.checked })
                        }
                        className="w-4 h-4 accent-purple-500 rounded"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        لديه صعوبة في نطق بعض الحروف
                      </span>
                    </label>

                    {editingPilgrim.gender === 'أنثى' && (
                      <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editingPilgrim.isPregnant)}
                          onChange={(e) =>
                            setEditingPilgrim({ ...editingPilgrim, isPregnant: e.target.checked })
                          }
                          className="w-4 h-4 accent-pink-500 rounded"
                        />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          يوجد حمل (للنساء)
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {editingPilgrim.nationalIdImage && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-600 dark:text-amber-400">
                      صورة بطاقة الأحوال / الهوية الوطنية المرفقة ({editingPilgrim.nationalId})
                    </label>
                    <a
                      href={editingPilgrim.nationalIdImage}
                      download={`بطاقة-الهوية-${editingPilgrim.nationalId}.jpg`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>حفظ البطاقة</span>
                    </a>
                  </div>
                  <img
                    src={editingPilgrim.nationalIdImage}
                    alt="صورة بطاقة الأحوال"
                    className="w-full max-h-56 object-contain rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-950/40 p-2"
                  />
                </div>
              )}
            </div>

            {editModalBusError && (
              <div className="bg-red-500/15 border-2 border-red-500 rounded-2xl p-3.5 flex items-center gap-2.5 text-red-600 dark:text-red-300 text-xs font-black animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span>{editModalBusError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 pb-1">
              <button
                onClick={() => {
                  setEditModalBusError(null);
                  setEditingPilgrim(null);
                }}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  const isAir = isPilgrimAirTravel(editingPilgrim);
                  const chosenBus = isAir ? '' : (editingPilgrim.busNumber || '').trim();
                  const chosenSeat = isAir ? '' : (editingPilgrim.busSeat || '').trim();
                  if (!isAir && chosenBus) {
                    const countInBus = getBusPassengersCount(chosenBus, editingPilgrim.id);
                    if (countInBus >= MAX_BUS_CAPACITY) {
                      setEditModalBusError(
                        `تنبيه: العدد أكبر من المقاعد! (${chosenBus}) وصلت للحد الأقصى المسموح به وهو ${MAX_BUS_CAPACITY} راكباً في الحافلة الواحدة.`
                      );
                      return;
                    }
                  }
                  if (!isAir && chosenSeat) {
                    const numericSeat = parseInt(chosenSeat.replace(/[^\d]/g, ''), 10);
                    if (!isNaN(numericSeat) && (numericSeat > MAX_BUS_CAPACITY || numericSeat < 1)) {
                      setEditModalBusError(
                        `تنبيه: العدد أكبر من المقاعد! رقم المقعد (${numericSeat}) أكبر من عدد مقاعد الحافلة (${MAX_BUS_CAPACITY} مقعداً).`
                      );
                      return;
                    }
                  }

                  const normalizedPilgrim: Pilgrim = {
                    ...editingPilgrim,
                    transport: isAir ? 'طائرة' : 'باص',
                    roomNumberMakkah: (editingPilgrim.roomNumberMakkah || editingPilgrim.roomNumber || '').trim(),
                    roomNumberMadinah: (editingPilgrim.roomNumberMadinah || '').trim(),
                    roomNumberMina: (editingPilgrim.roomNumberMina || '').trim(),
                    roomNumber: (editingPilgrim.roomNumberMakkah || editingPilgrim.roomNumber || '').trim(),
                    busNumber: chosenBus,
                    busSeat: chosenSeat,
                    flightNumberOutbound: isAir ? (editingPilgrim.flightNumberOutbound || '').trim() : '',
                    flightNumberReturn: isAir ? (editingPilgrim.flightNumberReturn || '').trim() : '',
                    flightTicketNumber: isAir ? (editingPilgrim.flightTicketNumber || '').trim() : '',
                    rejectionReason:
                      editingPilgrim.status === 'مرفوض'
                        ? (editingPilgrim.rejectionReason || editingPilgrim.statusNotes || '').trim()
                        : '',
                    statusNotes:
                      editingPilgrim.status === 'مرفوض'
                        ? (editingPilgrim.rejectionReason || editingPilgrim.statusNotes || '').trim()
                        : editingPilgrim.status === 'معتذر'
                        ? (editingPilgrim.statusNotes || '').trim()
                        : editingPilgrim.statusNotes,
                  };
                  setEditModalBusError(null);
                  onUpdatePilgrim(normalizedPilgrim);
                  setEditingPilgrim(null);
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow"
              >
                حفظ كافة التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT ANNOUNCEMENT OR LESSON */}
      {(isNewAnnouncement || editingAnnouncement) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 max-w-2xl w-full space-y-5 text-right shadow-2xl max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10 pt-1">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {isNewAnnouncement ? 'إضافة إعلان، لقاء أو درس جديد' : 'تعديل الإعلان أو الدرس'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewAnnouncement(false);
                  setEditingAnnouncement(null);
                  setAnnMediaError('');
                }}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                title="إغلاق"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان الإعلان أو الدرس *</label>
                <input
                  type="text"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white"
                  placeholder="مثال: اللقاء التعريفي الثاني لأحكام الحج"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">التصنيف *</label>
                  <select
                    value={annForm.category}
                    onChange={(e) => setAnnForm({ ...annForm, category: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="هام">هام</option>
                    <option value="مواعيد">مواعيد اللقاءات</option>
                    <option value="توجيهات">دروس وتوجيهات</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">التاريخ *</label>
                  <input
                    type="date"
                    value={annForm.date}
                    onChange={(e) => setAnnForm({ ...annForm, date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* TOPIC EDITOR BOX WITH RICH TOOLBAR (تكبير الخط + إرفاق صورة + إرفاق فيديو) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    محتوى الإعلان أو المقال *
                  </label>
                  <span className="text-[11px] text-amber-500 font-bold">
                    حجم الخط الحالي: {FONT_SIZE_OPTIONS.find((f) => f.value === annForm.fontSize)?.label || 'عادي'}
                  </span>
                </div>

                <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950">
                  {/* Toolbar */}
                  <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-2">
                    {/* Font Size & Formatting Controls */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 ml-1">
                        <Type className="w-3.5 h-3.5 text-amber-500" />
                        <span>تكبير الخط:</span>
                      </span>

                      {FONT_SIZE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAnnForm({ ...annForm, fontSize: opt.value })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            annForm.fontSize === opt.value
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                          }`}
                          title={`حجم الخط: ${opt.label}`}
                        >
                          {opt.label}
                        </button>
                      ))}

                      <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

                      <button
                        type="button"
                        onClick={() => setAnnForm({ ...annForm, isBold: !annForm.isBold })}
                        className={`p-1.5 rounded-lg text-xs font-bold transition border ${
                          annForm.isBold
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                        title="خط عريض (غامق)"
                      >
                        <Bold className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setAnnForm({
                            ...annForm,
                            textAlign: annForm.textAlign === 'center' ? 'right' : 'center',
                          })
                        }
                        className={`p-1.5 rounded-lg text-xs font-bold transition border ${
                          annForm.textAlign === 'center'
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                        title={annForm.textAlign === 'center' ? 'محاذاة لليمين' : 'توسيط النص'}
                      >
                        {annForm.textAlign === 'center' ? (
                          <AlignCenter className="w-4 h-4" />
                        ) : (
                          <AlignRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Media Attachment Buttons (إرفاق صورة / إرفاق فيديو) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveAnnToolTab(activeAnnToolTab === 'image' ? 'none' : 'image')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                          activeAnnToolTab === 'image' || annForm.imageUrl
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50'
                        }`}
                      >
                        <ImageIcon className="w-4 h-4 text-emerald-500" />
                        <span>{annForm.imageUrl ? 'تعديل الصورة المرفقة ✓' : 'إرفاق صورة'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveAnnToolTab(activeAnnToolTab === 'video' ? 'none' : 'video')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                          activeAnnToolTab === 'video' || annForm.videoUrl
                            ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-sky-500/50'
                        }`}
                      >
                        <Video className="w-4 h-4 text-sky-400" />
                        <span>{annForm.videoUrl ? 'تعديل الفيديو المرفق ✓' : 'إرفاق فيديو'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Textarea with live font size, weight, and alignment preview */}
                  <textarea
                    value={annForm.content}
                    onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                    rows={5}
                    className={`w-full bg-transparent px-4 py-3 text-slate-900 dark:text-white focus:outline-none ${getAnnouncementTypographyClasses(
                      annForm
                    )}`}
                    placeholder="اكتب تفاصيل الإعلان أو الدرس أو اللقاء هنا..."
                  />
                </div>
              </div>

              {annMediaError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{annMediaError}</span>
                </div>
              )}

              {/* Image Attachment Panel */}
              {(activeAnnToolTab === 'image' || annForm.imageUrl) && (
                <div className="bg-slate-50 dark:bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>إرفاق صورة للموضوع (رابط سحابي Cloudinary أو رابط خارجي مباشر)</span>
                    </span>
                    {annForm.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setAnnForm({ ...annForm, imageUrl: '' })}
                        className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف الصورة</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-dashed border-emerald-500/40 text-emerald-400 font-bold py-2.5 px-4 rounded-xl cursor-pointer transition text-xs">
                      <UploadCloud className="w-4 h-4" />
                      <span>
                        {isUploadingAnnImage
                          ? `جاري الرفع للسحابة الخارجية (${annMediaProgress}%)...`
                          : 'رفع صورة وتوليد رابط سحابي خارجي (URL)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingAnnImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setAnnMediaError('');
                          setIsUploadingAnnImage(true);
                          setAnnMediaProgress(5);
                          try {
                            const { refUrl } = await uploadMediaAsReference(
                              file,
                              'image',
                              setAnnMediaProgress,
                              campaignSettings?.cloudinaryConfig
                            );
                            setAnnForm((prev) => ({
                              ...prev,
                              imageUrl: refUrl,
                              displaySettings: { ...prev.displaySettings, showImage: true },
                            }));
                          } catch (err: any) {
                            setAnnMediaError(err?.message || 'تعذر رفع الصورة إلى السحابة الخارجية');
                          } finally {
                            setIsUploadingAnnImage(false);
                            setAnnMediaProgress(0);
                          }
                        }}
                      />
                    </label>

                    <input
                      type="text"
                      value={annForm.imageUrl}
                      onChange={(e) =>
                        setAnnForm((prev) => ({
                          ...prev,
                          imageUrl: e.target.value,
                          displaySettings: { ...prev.displaySettings, showImage: true },
                        }))
                      }
                      placeholder="الصق رابط صورة خارجي أو Cloudinary (https://...)"
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                    />
                  </div>

                  {annForm.imageUrl && (
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-[11px] text-emerald-400 font-bold">
                      <span>✓ محفوظ كرابط خارجي فقط ({extractMediaId(annForm.imageUrl) || 'External URL'})</span>
                      <span>بدون تخزين ملفات ثنائية (Blobs) في قاعدة البيانات</span>
                    </div>
                  )}

                  {annForm.imageUrl && (
                    <AnnouncementImageView
                      imageUrl={annForm.imageUrl}
                      alt="معاينة الصورة"
                      containerClassName="relative h-40 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              )}

              {/* Video Attachment Panel */}
              {(activeAnnToolTab === 'video' || annForm.videoUrl) && (
                <div className="bg-slate-50 dark:bg-slate-950 border border-sky-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Video className="w-4 h-4" />
                      <span>إرفاق فيديو للموضوع (رابط Cloudinary / يوتيوب / رابط خارجي مباشر)</span>
                    </span>
                    {annForm.videoUrl && (
                      <button
                        type="button"
                        onClick={() => setAnnForm({ ...annForm, videoUrl: '' })}
                        className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف الفيديو</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={annForm.videoUrl}
                      onChange={(e) =>
                        setAnnForm((prev) => ({
                          ...prev,
                          videoUrl: e.target.value,
                          displaySettings: { ...prev.displaySettings, showVideo: true },
                        }))
                      }
                      placeholder="رابط Cloudinary أو YouTube أو MP4 خارجي (https://...)"
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-mono"
                      dir="ltr"
                    />

                    <label className="flex items-center justify-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 border border-dashed border-sky-500/40 text-sky-400 font-bold py-2.5 px-4 rounded-xl cursor-pointer transition text-xs">
                      <UploadCloud className="w-4 h-4" />
                      <span>
                        {isUploadingAnnVideo
                          ? `جاري الرفع للسحابة الخارجية (${annMediaProgress}%)...`
                          : 'رفع فيديو وتوليد رابط سحابي خارجي (URL)'}
                      </span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/*"
                        className="hidden"
                        disabled={isUploadingAnnVideo}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setAnnMediaError('');
                          setIsUploadingAnnVideo(true);
                          setAnnMediaProgress(5);
                          try {
                            const { refUrl } = await uploadMediaAsReference(
                              file,
                              'video',
                              setAnnMediaProgress,
                              campaignSettings?.cloudinaryConfig
                            );
                            setAnnForm((prev) => ({
                              ...prev,
                              videoUrl: refUrl,
                              displaySettings: { ...prev.displaySettings, showVideo: true },
                            }));
                          } catch (err: any) {
                            setAnnMediaError(err?.message || 'تعذر رفع الفيديو إلى السحابة الخارجية');
                          } finally {
                            setIsUploadingAnnVideo(false);
                            setAnnMediaProgress(0);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {isUploadingAnnVideo && (
                    <div className="space-y-1.5">
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 transition-all duration-300"
                          style={{ width: `${annMediaProgress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-sky-400 text-center font-bold">
                        جاري رفع الفيديو للسحابة الخارجية وتوليد رابط مباشر ({annMediaProgress}%)...
                      </p>
                    </div>
                  )}

                  {annForm.videoUrl && (
                    <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/30 rounded-xl px-3 py-2 text-[11px] text-sky-400 font-bold">
                      <span>✓ محفوظ كرابط خارجي فقط ({extractMediaId(annForm.videoUrl) || 'External URL'})</span>
                      <span>بدون تخزين ملفات ثنائية (Blobs) في قاعدة البيانات</span>
                    </div>
                  )}

                  {annForm.videoUrl && (
                    <AnnouncementVideoView
                      videoUrl={annForm.videoUrl}
                      title="معاينة الفيديو"
                      videoClassName="w-full max-h-48 object-contain bg-black"
                    />
                  )}
                </div>
              )}

              {/* Optional Cloudinary Settings Panel */}
              {(activeAnnToolTab === 'image' || activeAnnToolTab === 'video') && (
                <details className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 text-xs">
                  <summary className="cursor-pointer font-bold text-slate-300 flex items-center justify-between">
                    <span>إعدادات الربط السحابي (Cloudinary) — اختياري</span>
                    <span className="text-[10px] text-amber-400">
                      {campaignSettings?.cloudinaryConfig?.cloudName
                        ? `مربوط بـ Cloudinary (${campaignSettings.cloudinaryConfig.cloudName})`
                        : 'يعمل تلقائياً عبر السحابة الخارجية'}
                    </span>
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 mt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Cloudinary Cloud Name</label>
                      <input
                        type="text"
                        defaultValue={campaignSettings?.cloudinaryConfig?.cloudName || ''}
                        onBlur={(e) => {
                          if (!campaignSettings) return;
                          onUpdateCampaignSettings({
                            ...campaignSettings,
                            cloudinaryConfig: {
                              cloudName: e.target.value.trim(),
                              uploadPreset: campaignSettings.cloudinaryConfig?.uploadPreset || '',
                            },
                          });
                        }}
                        placeholder="مثال: dxyz12345"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Unsigned Upload Preset</label>
                      <input
                        type="text"
                        defaultValue={campaignSettings?.cloudinaryConfig?.uploadPreset || ''}
                        onBlur={(e) => {
                          if (!campaignSettings) return;
                          onUpdateCampaignSettings({
                            ...campaignSettings,
                            cloudinaryConfig: {
                              cloudName: campaignSettings.cloudinaryConfig?.cloudName || '',
                              uploadPreset: e.target.value.trim(),
                            },
                          });
                        }}
                        placeholder="مثال: alqaem_unsigned"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </details>
              )}

              {/* DISPLAY PROPERTIES ACTIVATION PANEL (تفعيل الخصائص في صفحة العرض) */}
              <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-500 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>خصائص العرض في الصفحة الرئيسية للموقع:</span>
                  </span>
                  <span className="text-[11px] text-slate-400">تحكم بظهور وتفعيل المرفقات والتنسيق</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annForm.displaySettings.showImage}
                      onChange={(e) =>
                        setAnnForm({
                          ...annForm,
                          displaySettings: { ...annForm.displaySettings, showImage: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">تفعيل عرض الصورة في صفحة العرض</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annForm.displaySettings.showVideo}
                      onChange={(e) =>
                        setAnnForm({
                          ...annForm,
                          displaySettings: { ...annForm.displaySettings, showVideo: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">تفعيل عرض وتشغيل الفيديو في العرض</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annForm.displaySettings.enableLightbox}
                      onChange={(e) =>
                        setAnnForm({
                          ...annForm,
                          displaySettings: { ...annForm.displaySettings, enableLightbox: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">تفعيل تكبير الصورة بالضغط عليها</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annForm.displaySettings.highlightCard}
                      onChange={(e) =>
                        setAnnForm({
                          ...annForm,
                          displaySettings: { ...annForm.displaySettings, highlightCard: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">تمييز الموضوع بإطار ذهبي في العرض</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 pb-1">
              <button
                onClick={() => {
                  setIsNewAnnouncement(false);
                  setEditingAnnouncement(null);
                  setAnnMediaError('');
                }}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (!annForm.title || !annForm.content) return;
                  const payload: Announcement = {
                    id: isNewAnnouncement ? 'ann-' + Date.now() : editingAnnouncement!.id,
                    title: annForm.title,
                    category: annForm.category as any,
                    date: annForm.date,
                    content: annForm.content,
                    fontSize: annForm.fontSize,
                    isBold: annForm.isBold,
                    textAlign: annForm.textAlign,
                    imageUrl: annForm.imageUrl.trim(),
                    videoUrl: annForm.videoUrl.trim(),
                    displaySettings: annForm.displaySettings,
                  };
                  if (isNewAnnouncement) {
                    onAddAnnouncement(payload);
                  } else if (editingAnnouncement) {
                    onUpdateAnnouncement(payload);
                  }
                  setIsNewAnnouncement(false);
                  setEditingAnnouncement(null);
                  setAnnMediaError('');
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow"
              >
                حفظ الإعلان
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT PACKAGE & PRICING */}
      {(isNewPackage || editingPackage) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 max-w-xl w-full space-y-6 text-right shadow-2xl max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10 pt-1">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {isNewPackage ? 'إضافة باقة جديدة' : `تعديل الباقة والأسعار: ${editingPackage?.title}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewPackage(false);
                  setEditingPackage(null);
                }}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                title="إغلاق"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الباقة *</label>
                <input
                  type="text"
                  value={pkgForm.title}
                  onChange={(e) => setPkgForm({ ...pkgForm, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white"
                  placeholder="مثال: باقة الحج الاقتصادية"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نوع الباقة *</label>
                  <input
                    type="text"
                    value={pkgForm.type}
                    onChange={(e) => setPkgForm({ ...pkgForm, type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                    placeholder="VIP / باصات حديثة"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">السعر (مع العملة) *</label>
                  <input
                    type="text"
                    value={pkgForm.price}
                    onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-bold text-amber-500"
                    placeholder="16,800 ريال"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">وسيلة المواصلات *</label>
                <input
                  type="text"
                  value={pkgForm.transport}
                  onChange={(e) => setPkgForm({ ...pkgForm, transport: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">السكن في مكة المكرمة *</label>
                <input
                  type="text"
                  value={pkgForm.accommodationMakkah}
                  onChange={(e) => setPkgForm({ ...pkgForm, accommodationMakkah: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">السكن في المدينة المنورة *</label>
                <input
                  type="text"
                  value={pkgForm.accommodationMadinah}
                  onChange={(e) => setPkgForm({ ...pkgForm, accommodationMadinah: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">مميزات الباقة (افصل بينها بفواصل) *</label>
                <input
                  type="text"
                  value={pkgForm.featuresStr}
                  onChange={(e) => setPkgForm({ ...pkgForm, featuresStr: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                  placeholder="ميزة 1, ميزة 2, ميزة 3"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">صورة الباقة (رابط URL أو إرفاق ملف صورة) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pkgForm.image}
                    onChange={(e) => setPkgForm({ ...pkgForm, image: e.target.value })}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                    placeholder="رابط الصورة أو ارفع صورة..."
                    dir="ltr"
                  />
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-amber-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                    <span>إرفاق صورة</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (uploadEvent) => {
                            if (uploadEvent.target?.result) {
                              setPkgForm({ ...pkgForm, image: uploadEvent.target.result as string });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {pkgForm.image && (
                  <div className="mt-3 relative h-36 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                    <img src={pkgForm.image} alt="معاينة الصورة" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 pb-1">
              <button
                onClick={() => { setIsNewPackage(false); setEditingPackage(null); }}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (!pkgForm.title || !pkgForm.price) return;
                  const featuresArray = pkgForm.featuresStr.split(',').map(s => s.trim()).filter(Boolean);
                  if (isNewPackage) {
                    onAddPackage({
                      id: 'pkg-' + Date.now(),
                      title: pkgForm.title,
                      type: pkgForm.type,
                      price: pkgForm.price,
                      transport: pkgForm.transport,
                      accommodationMakkah: pkgForm.accommodationMakkah,
                      accommodationMadinah: pkgForm.accommodationMadinah,
                      campMina: pkgForm.campMina,
                      features: featuresArray,
                      image: pkgForm.image
                    });
                  } else if (editingPackage) {
                    onUpdatePackage({
                      ...editingPackage,
                      title: pkgForm.title,
                      type: pkgForm.type,
                      price: pkgForm.price,
                      transport: pkgForm.transport,
                      accommodationMakkah: pkgForm.accommodationMakkah,
                      accommodationMadinah: pkgForm.accommodationMadinah,
                      campMina: pkgForm.campMina,
                      features: featuresArray,
                      image: pkgForm.image
                    });
                  }
                  setIsNewPackage(false);
                  setEditingPackage(null);
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE OR EDIT STAFF USER (MASTER ADMIN ONLY) */}
      {(isNewStaff || editingStaff) && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsNewStaff(false);
              setEditingStaff(null);
              setStaffFormError('');
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full max-h-[90dvh] flex flex-col text-right shadow-2xl overflow-hidden my-auto">
            {/* Sticky Header with Title & Close (X) Button */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                {editingStaff ? 'تعديل بيانات المشرف وصلاحياته' : 'إنشاء حساب مشرف إداري جديد'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewStaff(false);
                  setEditingStaff(null);
                  setStaffFormError('');
                }}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition flex items-center gap-1 text-xs font-bold"
                title="إغلاق النافذة"
              >
                <XCircle className="w-5 h-5" />
                <span className="sm:hidden">إغلاق</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-4 text-sm overflow-y-auto flex-1">
              {staffFormError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{staffFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المشرف الكامل *</label>
                <input
                  type="text"
                  value={staffForm.fullName}
                  onChange={(e) => {
                    setStaffForm({ ...staffForm, fullName: e.target.value });
                    if (staffFormError) setStaffFormError('');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white"
                  placeholder="مثال: صالح الياسين"
                />
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      1. كتابة اسم المستخدم (اليوزر) *
                    </label>
                    <input
                      type="text"
                      value={staffForm.username}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw.includes('@')) {
                          const { localPart, domain } = splitUsernameAndDomain(raw);
                          setStaffForm({ ...staffForm, username: localPart });
                          if (STAFF_DOMAIN_OPTIONS.some((o) => o.value === domain)) {
                            setStaffDomain(domain);
                          }
                        } else {
                          setStaffForm({ ...staffForm, username: raw.replace(/\s+/g, '') });
                        }
                        if (staffFormError) setStaffFormError('');
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono text-xs"
                      placeholder="مثال: saleh أو supervisor"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      2. اختيار النطاق المعتمد *
                    </label>
                    <select
                      value={staffDomain}
                      onChange={(e) => {
                        setStaffDomain(e.target.value);
                        if (staffFormError) setStaffFormError('');
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs"
                      dir="ltr"
                    >
                      {STAFF_DOMAIN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Preview of Resulting Identifier */}
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-bold">المعرّف المعتمد للدخول:</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400" dir="ltr">
                    {staffForm.username.trim()
                      ? `${staffForm.username.trim().toLowerCase().split('@')[0]}${staffDomain}`
                      : `username${staffDomain}`}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رمز المرور السري (PIN) {editingStaff ? '(اتركه فارغاً للإبقاء على الرمز الحالي)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showStaffPin ? "text" : "password"}
                      value={staffForm.pin}
                      onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono"
                      placeholder="1234"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffPin(!showStaffPin)}
                      className="absolute left-2.5 top-2 text-slate-400 hover:text-amber-500 transition"
                    >
                      {showStaffPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الدور الوظيفي *</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => {
                    const nextRole = e.target.value as any;
                    setStaffForm({
                      ...staffForm,
                      role: nextRole,
                      permissions: {
                        ...staffForm.permissions,
                        manageReligiousGuide:
                          nextRole === 'مشرف إرشاد وديني' ? true : staffForm.permissions.manageReligiousGuide,
                      },
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white"
                >
                  <option value="مشرف إداري">مشرف إداري</option>
                  <option value="مشرف إرشاد وديني">مشرف إرشاد وديني</option>
                  <option value="محاسب القافلة">محاسب القافلة</option>
                </select>
              </div>

              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">صلاحيات الوصول:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={staffForm.permissions.managePilgrims}
                    onChange={(e) => setStaffForm({
                      ...staffForm,
                      permissions: { ...staffForm.permissions, managePilgrims: e.target.checked }
                    })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">إدارة الحجاج والاطلاع على السجلات وتصدير البيانات</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={staffForm.permissions.manageAnnouncements}
                    onChange={(e) => setStaffForm({
                      ...staffForm,
                      permissions: { ...staffForm.permissions, manageAnnouncements: e.target.checked }
                    })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">إدارة الإعلانات، اللقاءات والدروس</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={staffForm.permissions.manageFinance}
                    onChange={(e) => setStaffForm({
                      ...staffForm,
                      permissions: { ...staffForm.permissions, manageFinance: e.target.checked }
                    })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">إدارة الأمور المالية وقبول الطلبات</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={staffForm.permissions.manageReligiousGuide}
                    onChange={(e) => setStaffForm({
                      ...staffForm,
                      permissions: { ...staffForm.permissions, manageReligiousGuide: e.target.checked }
                    })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">صلاحيات الإشراف الديني (الوصول إلى كشف المراجع وإدارة الإرشاد الديني)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={staffForm.permissions.managePackages}
                    onChange={(e) => setStaffForm({
                      ...staffForm,
                      permissions: { ...staffForm.permissions, managePackages: e.target.checked }
                    })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">إدارة الباقات والأسعار</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={staffForm.permissions.manageTravelKit}
                    onChange={(e) => setStaffForm({
                      ...staffForm,
                      permissions: { ...staffForm.permissions, manageTravelKit: e.target.checked }
                    })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">إدارة حقيبة السفر والتجهيزات</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(staffForm.permissions.manageGifts)}
                    onChange={(e) => setStaffForm({
                      ...staffForm,
                      permissions: { ...staffForm.permissions, manageGifts: e.target.checked }
                    })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">إدارة وتوزيع هدايا الحجاج وتوثيق الاستلام والتقارير</span>
                </label>
              </div>
            </div>

            {/* Sticky Footer with Save & Cancel Buttons (Always visible on mobile) */}
            <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsNewStaff(false);
                  setEditingStaff(null);
                  setStaffFormError('');
                }}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSavingStaff}
                onClick={async () => {
                  const cleanLocalUser = staffForm.username.trim().toLowerCase().split('@')[0].replace(/\s+/g, '');
                  const cleanUsername = `${cleanLocalUser}${staffDomain}`;
                  const cleanFullName = staffForm.fullName.trim().replace(/\s+/g, ' ');

                  if (!cleanFullName) {
                    setStaffFormError('يرجى إدخال اسم المشرف الكامل.');
                    return;
                  }
                  if (!cleanLocalUser) {
                    setStaffFormError('يرجى كتابة اسم المستخدم (اليوزر) في الحقل الأول.');
                    return;
                  }
                  if (!editingStaff && !staffForm.pin.trim()) {
                    setStaffFormError('يرجى إدخال رمز المرور (PIN) للمشرف الجديد.');
                    return;
                  }

                  // Check for duplicate username (either exact user@domain OR same local username part)
                  const isMasterAlias = (val: string) =>
                    val === 'admin' || val === 'alahsaey@gmail.com' || val === 'admin@alqaemhajj.com' || val === 'alahsaey';
                  const usernameConflict = adminUsers.find((u) => {
                    if (editingStaff && u.id === editingStaff.id) return false;
                    const existingUser = (u.username || '').trim().toLowerCase();
                    const existingLocal = existingUser.split('@')[0] || '';
                    return (
                      existingUser === cleanUsername ||
                      existingLocal === cleanLocalUser ||
                      (isMasterAlias(cleanLocalUser) && isMasterAlias(existingLocal))
                    );
                  });

                  if (usernameConflict) {
                    setStaffFormError(
                      `عفواً، اسم المستخدم (${cleanLocalUser}) مسجل مسبقاً للمشرف "${usernameConflict.fullName}" بالحساب (${usernameConflict.username}) ولا يمكن تكراره.`
                    );
                    return;
                  }

                  // Check for duplicate full name
                  const nameConflict = adminUsers.find((u) => {
                    if (editingStaff && u.id === editingStaff.id) return false;
                    const existingName = (u.fullName || '').trim().replace(/\s+/g, ' ').toLowerCase();
                    return existingName === cleanFullName.toLowerCase();
                  });

                  if (nameConflict) {
                    setStaffFormError(
                      `عفواً، المشرف "${cleanFullName}" موجود مسبقاً في القائمة برقم/حساب (${nameConflict.username}) ولا يمكن إضافة نفس المشرف مرتين.`
                    );
                    return;
                  }

                  setIsSavingStaff(true);
                  try {
                    // If editing and PIN is empty, keep existing. If new or not empty, hash it.
                    let finalPin = '';
                    if (editingStaff) {
                      if (!staffForm.pin.trim()) {
                        finalPin = editingStaff.pin;
                      } else {
                        finalPin = await hashPIN(staffForm.pin.trim());
                      }
                    } else {
                      finalPin = await hashPIN(staffForm.pin.trim());
                    }

                    if (editingStaff) {
                      await onUpdateAdminUser({
                        ...editingStaff,
                        username: cleanUsername,
                        pin: finalPin,
                        fullName: cleanFullName,
                        role: staffForm.role,
                        permissions: staffForm.permissions,
                      });
                    } else {
                      // Deterministic ID based on normalized username so the same user can never be created twice
                      const safeSlug = cleanUsername.replace(/[^a-z0-9]/g, '_');
                      const deterministicId = `usr-${safeSlug || Date.now()}`;
                      await onAddAdminUser({
                        id: deterministicId,
                        username: cleanUsername,
                        pin: finalPin,
                        fullName: cleanFullName,
                        role: staffForm.role,
                        permissions: staffForm.permissions,
                        createdAt: new Date().toISOString().split('T')[0],
                      });
                    }
                    setIsNewStaff(false);
                    setEditingStaff(null);
                    setStaffFormError('');
                  } finally {
                    setIsSavingStaff(false);
                  }
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow"
              >
                {isSavingStaff ? 'جاري الحفظ...' : editingStaff ? 'حفظ التعديلات' : 'إنشاء حساب المشرف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CHANGE OWN PASSWORD */}
      {showChangePasswordModal && currentAdminUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 text-right shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                <span>تعديل الرقم السري الخاص بي</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                title="إغلاق"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المستخدم الحالي</label>
                <input
                  type="text"
                  value={currentAdminUser.username}
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-500 cursor-not-allowed font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الرقم السري الجديد / PIN *</label>
                <div className="relative">
                  <input
                    type={showOwnPin ? "text" : "password"}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono text-center text-lg"
                    dir="ltr"
                    placeholder="أدخل الرقم السري الجديد"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnPin(!showOwnPin)}
                    className="absolute left-3 top-3 text-slate-400 hover:text-amber-500 transition"
                  >
                    {showOwnPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  if (!newPasswordInput.trim()) return;
                  const hashed = await hashPIN(newPasswordInput.trim());
                  const updatedUser = { ...currentAdminUser, pin: hashed };
                  onUpdateAdminUser(updatedUser);
                  setCurrentAdminUser(updatedUser);
                  setShowChangePasswordModal(false);
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow"
              >
                حفظ الرقم السري الجديد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* MODAL 6: VIEW PAYMENT RECEIPT / BANK VOUCHER */}
      {viewingReceiptPilgrim && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 text-right shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">قسيمة التحويل البنكي للحاج</h3>
                  <p className="text-xs text-slate-400">
                    {viewingReceiptPilgrim.firstName} {viewingReceiptPilgrim.lastName} - رقم الهوية: <span dir="ltr" className="font-mono">{viewingReceiptPilgrim.nationalId}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingReceiptPilgrim(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            {/* Receipt Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block mb-1">رقم المرجع / الحوالة</span>
                <strong className="text-slate-900 dark:text-white font-mono text-sm" dir="ltr">
                  #{viewingReceiptPilgrim.bankReferenceNumber || 'غير مدخل'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">المبلغ المحول</span>
                <strong className="text-emerald-500 font-black text-sm">
                  {viewingReceiptPilgrim.transferAmount ? `${viewingReceiptPilgrim.transferAmount} ريال` : 'غير محدد'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">تاريخ التحويل</span>
                <strong className="text-slate-900 dark:text-white">
                  {viewingReceiptPilgrim.paymentReceiptDate || viewingReceiptPilgrim.createdAt}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">الباقة المحجوزة</span>
                <strong className="text-amber-500">{viewingReceiptPilgrim.selectedPackage || 'عادي'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">اسم الحساب البنكي</span>
                <strong className="text-slate-900 dark:text-white">{viewingReceiptPilgrim.bankAccountName || 'مطابق للحاج'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">اسم البنك</span>
                <strong className="text-slate-900 dark:text-white">{viewingReceiptPilgrim.bankName || 'بنك مالي'}</strong>
              </div>
            </div>

            {/* Receipt Image Display */}
            {viewingReceiptPilgrim.paymentReceipt ? (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 block">صورة قسيمة التحويل البنكي المرفقة:</span>
                <div className="rounded-2xl overflow-hidden border-2 border-amber-500/30 bg-black flex items-center justify-center max-h-[350px]">
                  <img
                    src={viewingReceiptPilgrim.paymentReceipt}
                    alt="صورة قسيمة التحويل"
                    className="max-h-[350px] w-auto object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                لم يتم إرفاق صورة قسيمة تحويل لهذا الطلب (مرفق برقم المرجع فقط).
              </div>
            )}

            {/* AI Receipt Audit Section */}
            {viewingReceiptPilgrim.paymentReceipt && (
              <div className="bg-slate-50 dark:bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">التدقيق الذكي ومطابقة الوصل (AI Receipt Audit)</h4>
                      <p className="text-[10px] text-slate-400">فحص صورة الإيصال واستخراج المبلغ والبنك ومقارنته بسعر الباقة المطلوبة</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isAuditingReceipt}
                    onClick={() => handleAuditReceipt(viewingReceiptPilgrim)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isAuditingReceipt ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري فحص الوصل ومطابقة المبلغ...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{receiptAuditResult ? 'إعادة الفحص الذكي' : 'تدقيق ومطابقة الوصل بالذكاء الاصطناعي'}</span>
                      </>
                    )}
                  </button>
                </div>

                {receiptAuditResult && (
                  <div className={`p-3.5 rounded-xl border text-xs space-y-2 animate-fadeIn ${
                    receiptAuditResult.isAmountMatched 
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200' 
                      : receiptAuditResult.status === 'دفعة جزئية (أقل من المطلوب)'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
                        : 'bg-red-500/10 border-red-500/40 text-red-900 dark:text-red-200'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        {receiptAuditResult.isAmountMatched ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        )}
                        <span>حالة المطابقة: {receiptAuditResult.status}</span>
                      </span>
                      <span className="text-[10px] opacity-80 font-mono">دقة التحليل: {receiptAuditResult.confidence}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="opacity-70 block">المبلغ بالإيصال:</span>
                        <strong className="font-mono text-xs">{receiptAuditResult.transferAmount.toLocaleString()} ر.س</strong>
                      </div>
                      <div>
                        <span className="opacity-70 block">سعر الباقة المطلوب:</span>
                        <strong className="font-mono text-xs">{receiptAuditResult.expectedAmount.toLocaleString()} ر.س</strong>
                      </div>
                      <div>
                        <span className="opacity-70 block">البنك المستخرج:</span>
                        <strong>{receiptAuditResult.bankName}</strong>
                      </div>
                      <div>
                        <span className="opacity-70 block">رقم العملية:</span>
                        <strong className="font-mono" dir="ltr">{receiptAuditResult.referenceNumber}</strong>
                      </div>
                    </div>

                    <p className="text-[10px] leading-relaxed pt-1.5 border-t border-current/20 opacity-90">
                      💡 {receiptAuditResult.notes}
                    </p>
                  </div>
                )}

                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    <strong>ضمان حق القافلة:</strong> التحليل الذكي وسيلة تدقيق ومطابقة مساندة للمحاسب، ولا يتم اعتماد السداد أو إخلاء طرف الحاج إلا بعد تأكيد الإدارة لاستلام المبلغ الفعلي في الحساب البنكي.
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">تحديث حالة الدفع:</span>
                {currentAdminUser?.permissions.manageFinance && (
                  <button
                    onClick={() => {
                      const seq = pilgrims.findIndex(p => p.nationalId === viewingReceiptPilgrim.nationalId) + 1;
                      const updated = { 
                        ...viewingReceiptPilgrim, 
                        status: 'مكتمل الدفع' as const,
                        paymentReceiptDate: viewingReceiptPilgrim.paymentReceiptDate || new Date().toISOString(),
                        pilgrimSequenceNumber: seq > 0 ? seq : undefined,
                        membershipNumber: viewingReceiptPilgrim.membershipNumber || `QAEM-1448-${viewingReceiptPilgrim.registrationReference || '1001'}`
                      };
                      onUpdatePilgrim(updated);
                      setViewingReceiptPilgrim(null);
                      setOfficialReceiptPilgrim(updated);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد الدفع واستخراج السند الرسمي فوراً</span>
                  </button>
                )}
                {viewingReceiptPilgrim.status === 'مكتمل الدفع' ? (
                  <button
                    onClick={() => {
                      const seq = pilgrims.findIndex(p => p.nationalId === viewingReceiptPilgrim.nationalId) + 1;
                      const pilgrimToUse = {
                        ...viewingReceiptPilgrim,
                        pilgrimSequenceNumber: seq > 0 ? seq : undefined,
                        membershipNumber: viewingReceiptPilgrim.membershipNumber || `QAEM-1448-${viewingReceiptPilgrim.registrationReference || '1001'}`
                      };
                      setViewingReceiptPilgrim(null);
                      setOfficialReceiptPilgrim(pilgrimToUse);
                    }}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>عرض سند الوصل والدفع PDF</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>السند مغلق حتى تأكيد الدفع 🔒</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-700 transition"
                >
                  طباعة القسيمة
                </button>
                <button
                  onClick={() => {
                    setViewingReceiptPilgrim(null);
                    setReceiptAuditResult(null);
                  }}
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official PDF Payment Receipt Modal */}
      {officialReceiptPilgrim && (
        <PaymentReceiptModal
          pilgrim={officialReceiptPilgrim}
          campaignSettings={campaignSettings}
          onClose={() => setOfficialReceiptPilgrim(null)}
          onUpdatePilgrim={(updated) => {
            onUpdatePilgrim(updated);
            setOfficialReceiptPilgrim(updated);
          }}
          isEditable={true}
        />
      )}

      {/* Central Al-Qaem Excel Report Customizer & Identity Preview Modal */}
      <ExcelReportCustomizerModal />
    </div>
  );
};
