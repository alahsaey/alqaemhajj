import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  Shield,
  Phone,
  UserCheck,
  Calendar,
  BookOpen,
  Sparkles,
  Home as HomeIcon,
  Package,
  Share2,
  ChevronDown,
  CornerDownLeft,
  Bus,
  Plane,
  Hotel,
  HeartPulse,
  CreditCard,
  Settings,
  BarChart3,
  Megaphone,
  Compass,
  CheckSquare,
  FileText,
  UserPlus,
  Lock,
  Check,
  LogOut,
  Bell,
} from 'lucide-react';
import { CampaignSettings, HajjPackage, AdminUser } from '../types';
import { PWAInstallButton } from './pwa/PWAInstallButton';
import { isGeneralAdminUser, canPerformOperation, normalizeOfficialRole } from '../utils/rbac';

export type GuideTabId = 'day1' | 'day2' | 'day3' | 'day4' | 'day5' | 'checklist';

interface SubMenuItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onSelect: () => void;
}

interface MainMenuItem {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onMainSelect: () => void;
  subItems?: SubMenuItem[];
}

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  adminLoggedIn: boolean;
  currentAdminUser?: AdminUser | null;
  campaignSettings: CampaignSettings;
  packages?: HajjPackage[];
  guideSubTab?: GuideTabId;
  onSelectGuideSubTab?: (tab: GuideTabId) => void;
  adminSubTab?: string;
  onSelectAdminSubTab?: (tab: string) => void;
  highlightedPackageId?: string | null;
  onSelectPackageHighlight?: (pkgId: string | null) => void;
  onLogout?: () => Promise<void> | void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  adminLoggedIn,
  currentAdminUser,
  campaignSettings,
  packages = [],
  guideSubTab = 'day1',
  onSelectGuideSubTab,
  adminSubTab = 'dashboard',
  onSelectAdminSubTab,
  highlightedPackageId = null,
  onSelectPackageHighlight,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileMenuId, setExpandedMobileMenuId] = useState<string | null>(null);
  const [openDesktopDropdownId, setOpenDesktopDropdownId] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const desktopNavRef = useRef<HTMLElement | null>(null);
  const closeDropdownTimerRef = useRef<number | null>(null);

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await onLogout?.();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirmModal(false);
      setMobileMenuOpen(false);
      setOpenDesktopDropdownId(null);
    }
  };

  const triggerCopyToast = () => {
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  };

  const handleShareSite = () => {
    const shareData = {
      title: campaignSettings.siteTexts?.brandName || 'قافلة القائم للحج والعمرة',
      text: campaignSettings.siteTexts?.heroDescription || 'نظام إدارة قافلة القائم لخدمة ضيوف الرحمن',
      url: window.location.origin,
    };
    if (navigator.share) {
      navigator.share(shareData).catch((err) => {
        if (err?.name !== 'AbortError' && !String(err?.message || '').toLowerCase().includes('cancel')) {
          console.error('Error sharing:', err);
        }
      });
    } else {
      navigator.clipboard.writeText(window.location.origin);
      triggerCopyToast();
    }
  };

  // Lock background page scroll when mobile navigation drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  // Automatically sync expanded mobile accordion with the active view when opening the drawer
  useEffect(() => {
    if (mobileMenuOpen) {
      if (['packages', 'portal', 'guide', 'admin'].includes(currentView)) {
        setExpandedMobileMenuId(currentView);
      } else {
        setExpandedMobileMenuId(null);
      }
    }
  }, [mobileMenuOpen, currentView]);

  // Close mobile menu and desktop dropdown on Escape key or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLogoutConfirmModal) {
          setShowLogoutConfirmModal(false);
          return;
        }
        setMobileMenuOpen(false);
        setOpenDesktopDropdownId(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (desktopNavRef.current && !desktopNavRef.current.contains(e.target as Node)) {
        setOpenDesktopDropdownId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogoutConfirmModal]);

  // Determine admin user permissions for dynamic admin sub-menus
  const roleTemplates = campaignSettings.rolePermissionTemplates;
  const isMasterAdmin = isGeneralAdminUser(currentAdminUser);
  const canManagePilgrims = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'pilgrims', 'view', roleTemplates) ||
      canPerformOperation(currentAdminUser, 'housing_transport', 'view', roleTemplates) ||
      currentAdminUser?.permissions?.managePilgrims
  );
  const canManageReligious = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'religious', 'view', roleTemplates) ||
      currentAdminUser?.permissions?.manageReligiousGuide ||
      normalizeOfficialRole(currentAdminUser?.role) === 'الإشراف الديني'
  );
  const canManageAnnouncements = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'cultural', 'view', roleTemplates) ||
      currentAdminUser?.permissions?.manageAnnouncements ||
      currentAdminUser?.permissions?.manageCultural ||
      normalizeOfficialRole(currentAdminUser?.role) === 'الإشراف الثقافي'
  );
  const canManageFinance = Boolean(
    isMasterAdmin ||
      canPerformOperation(currentAdminUser, 'finance', 'view', roleTemplates) ||
      canPerformOperation(currentAdminUser, 'packages', 'view', roleTemplates) ||
      currentAdminUser?.permissions?.manageFinance ||
      currentAdminUser?.permissions?.managePackages ||
      normalizeOfficialRole(currentAdminUser?.role) === 'الإشراف المالي'
  );

  // Build dynamic Admin sub-items strictly according to the logged-in supervisor's permissions
  const adminSubItems: SubMenuItem[] = [];
  if (adminLoggedIn) {
    adminSubItems.push({
      id: 'admin-dashboard',
      label: 'لوحة البيانات والإحصائيات',
      subtitle: 'الملخص العام والمؤشرات المباشرة',
      icon: BarChart3,
      isActive: currentView === 'admin' && adminSubTab === 'dashboard',
      onSelect: () => {
        onSelectAdminSubTab?.('dashboard');
        setCurrentView('admin');
      },
    });
    if (canManagePilgrims) {
      adminSubItems.push(
        {
          id: 'admin-pilgrims',
          label: 'سجل الحجاج',
          subtitle: 'كشف الحجاج المعتمدين والمستبعدين',
          icon: FileText,
          isActive: currentView === 'admin' && (adminSubTab === 'pilgrims' || adminSubTab === 'excluded'),
          onSelect: () => {
            onSelectAdminSubTab?.('pilgrims');
            setCurrentView('admin');
          },
        },
        {
          id: 'admin-buses',
          label: 'رحلات الحافلات',
          subtitle: 'إركاب الباصات وتوزيع المقاعد',
          icon: Bus,
          isActive: currentView === 'admin' && adminSubTab === 'busBoarding',
          onSelect: () => {
            onSelectAdminSubTab?.('busBoarding');
            setCurrentView('admin');
          },
        },
        {
          id: 'admin-flights',
          label: 'رحلات الطيران',
          subtitle: 'تذاكر السفر الجوي وأرقام الرحلات',
          icon: Plane,
          isActive: currentView === 'admin' && adminSubTab === 'flightsList',
          onSelect: () => {
            onSelectAdminSubTab?.('flightsList');
            setCurrentView('admin');
          },
        },
        {
          id: 'admin-housing',
          label: 'السكن والفنادق',
          subtitle: 'تسكين مكة والمدينة ومخيمات منى',
          icon: Hotel,
          isActive: currentView === 'admin' && adminSubTab === 'housingList',
          onSelect: () => {
            onSelectAdminSubTab?.('housingList');
            setCurrentView('admin');
          },
        },
        {
          id: 'admin-health',
          label: 'الحالات الصحية',
          subtitle: 'الرعاية الطبية والاحتياجات الخاصة',
          icon: HeartPulse,
          isActive: currentView === 'admin' && adminSubTab === 'healthList',
          onSelect: () => {
            onSelectAdminSubTab?.('healthList');
            setCurrentView('admin');
          },
        }
      );
    }
    if (canManageReligious) {
      adminSubItems.push({
        id: 'admin-religious',
        label: 'الإرشاد الديني',
        subtitle: 'كشف المراجع ودليل المناسك',
        icon: Compass,
        isActive: currentView === 'admin' && (adminSubTab === 'marjiList' || adminSubTab === 'hajjTimeline'),
        onSelect: () => {
          onSelectAdminSubTab?.('marjiList');
          setCurrentView('admin');
        },
      });
    }
    if (canManageAnnouncements || isMasterAdmin) {
      adminSubItems.push({
        id: 'admin-announcements',
        label: 'الإعلانات والدروس',
        subtitle: 'المستجدات والمرئيات وبث يوتيوب',
        icon: Megaphone,
        isActive: currentView === 'admin' && adminSubTab === 'announcements',
        onSelect: () => {
          onSelectAdminSubTab?.('announcements');
          setCurrentView('admin');
        },
      });
      adminSubItems.push({
        id: 'admin-notifications',
        label: 'إدارة الإشعارات',
        subtitle: 'بث الرسائل الفورية والمجدولة للحجاج',
        icon: Bell,
        isActive: currentView === 'admin' && adminSubTab === 'notifications',
        onSelect: () => {
          onSelectAdminSubTab?.('notifications');
          setCurrentView('admin');
        },
      });
    }
    if (canManageFinance) {
      adminSubItems.push({
        id: 'admin-finance',
        label: 'الإدارة المالية',
        subtitle: 'كشف المدفوعات وإدارة الباقات',
        icon: CreditCard,
        isActive: currentView === 'admin' && (adminSubTab === 'paymentsList' || adminSubTab === 'packages'),
        onSelect: () => {
          onSelectAdminSubTab?.('paymentsList');
          setCurrentView('admin');
        },
      });
    }
    adminSubItems.push({
      id: 'admin-settings',
      label: 'إعدادات القافلة',
      subtitle: isMasterAdmin ? 'الإعدادات والمشرفون وسجل النشاط' : 'إعدادات القافلة والتواصل',
      icon: Settings,
      isActive:
        currentView === 'admin' &&
        (adminSubTab === 'settings' || adminSubTab === 'staff' || adminSubTab === 'activityLog'),
      onSelect: () => {
        onSelectAdminSubTab?.('settings');
        setCurrentView('admin');
      },
    });
  }

  // Build Packages Sub-Items from real packages data
  const packageSubItems: SubMenuItem[] = [
    {
      id: 'pkg-all',
      label: 'جميع باقات الحج والعمرة',
      subtitle: 'استعراض كافة الباقات والأسعار المتاحة',
      icon: Package,
      isActive: currentView === 'packages' && !highlightedPackageId,
      onSelect: () => {
        onSelectPackageHighlight?.(null);
        setCurrentView('packages');
      },
    },
    ...packages.slice(0, 4).map((pkg) => {
      const isAir = (pkg.transport || '').includes('طيران') || (pkg.title || '').includes('طيران');
      return {
        id: `pkg-${pkg.id}`,
        label: pkg.title,
        subtitle: `${pkg.price} · ${pkg.transport}`,
        icon: isAir ? Plane : Bus,
        isActive: currentView === 'packages' && highlightedPackageId === pkg.id,
        onSelect: () => {
          onSelectPackageHighlight?.(pkg.id);
          setCurrentView('packages');
        },
      };
    }),
    {
      id: 'pkg-register',
      label: 'التسجيل والالتحاق بالقافلة',
      subtitle: 'تعبئة استمارة التسجيل الإلكتروني',
      icon: UserPlus,
      isActive: currentView === 'register',
      onSelect: () => {
        setCurrentView('register');
      },
    },
  ];

  // Build Pilgrim Portal Sub-Items
  const portalSubItems: SubMenuItem[] = [
    {
      id: 'portal-inquiry',
      label: 'الاستعلام عن حالة الطلب والقبول',
      subtitle: 'التحقق برقم الهوية ورقم التسجيل المرجعي',
      icon: UserCheck,
      isActive: currentView === 'portal',
      onSelect: () => setCurrentView('portal'),
    },
    {
      id: 'portal-receipt',
      label: 'رفع وإرفاق إيصال السداد',
      subtitle: 'تأكيد الدفعة المالية وإصدار العضوية',
      icon: CreditCard,
      isActive: false,
      onSelect: () => setCurrentView('portal'),
    },
    {
      id: 'portal-housing-transport',
      label: 'بيانات السكن والحافلة والطيران',
      subtitle: 'معرفة رقم الغرفة ومقعد الحافلة أو الرحلة',
      icon: Hotel,
      isActive: false,
      onSelect: () => setCurrentView('portal'),
    },
    {
      id: 'portal-new-register',
      label: 'تسجيل حاج جديد في القافلة',
      subtitle: 'الانتقال إلى نموذج التسجيل المباشر',
      icon: UserPlus,
      isActive: currentView === 'register',
      onSelect: () => setCurrentView('register'),
    },
  ];

  // Build Guide Sub-Items mapped to real GuideView tabs
  const guideSubItems: SubMenuItem[] = [
    {
      id: 'guide-day1',
      label: '8 ذو الحجة — يوم التروية',
      subtitle: 'الإحرام والتوجه إلى مشعر منى',
      icon: Calendar,
      isActive: currentView === 'guide' && guideSubTab === 'day1',
      onSelect: () => {
        onSelectGuideSubTab?.('day1');
        setCurrentView('guide');
      },
    },
    {
      id: 'guide-day2',
      label: '9 ذو الحجة — يوم عرفة',
      subtitle: 'الوقوف بعرفة والنفرة إلى مزدلفة',
      icon: Compass,
      isActive: currentView === 'guide' && guideSubTab === 'day2',
      onSelect: () => {
        onSelectGuideSubTab?.('day2');
        setCurrentView('guide');
      },
    },
    {
      id: 'guide-day3',
      label: '10 ذو الحجة — يوم العيد',
      subtitle: 'رمي جمرة العقبة وأعمال يوم النحر',
      icon: Calendar,
      isActive: currentView === 'guide' && guideSubTab === 'day3',
      onSelect: () => {
        onSelectGuideSubTab?.('day3');
        setCurrentView('guide');
      },
    },
    {
      id: 'guide-day4',
      label: 'أيام التشريق بمنى',
      subtitle: 'المبيت بمنى ورمي الجمرات الثلاث',
      icon: Calendar,
      isActive: currentView === 'guide' && guideSubTab === 'day4',
      onSelect: () => {
        onSelectGuideSubTab?.('day4');
        setCurrentView('guide');
      },
    },
    {
      id: 'guide-day5',
      label: 'طواف الوداع والختام',
      subtitle: 'ختام أعمال الحج والاستعداد للمغادرة',
      icon: BookOpen,
      isActive: currentView === 'guide' && guideSubTab === 'day5',
      onSelect: () => {
        onSelectGuideSubTab?.('day5');
        setCurrentView('guide');
      },
    },
    {
      id: 'guide-checklist',
      label: 'حقيبة وتجهيزات الحاج',
      subtitle: 'قائمة المستلزمات والوثائق والأدوية',
      icon: CheckSquare,
      isActive: currentView === 'guide' && guideSubTab === 'checklist',
      onSelect: () => {
        onSelectGuideSubTab?.('checklist');
        setCurrentView('guide');
      },
    },
  ];

  // Construct Main Navigation Items
  // Note: "لوحة التحكم (مدير)" is only shown as an administrative control panel item when adminLoggedIn is true
  const mainMenuItems: MainMenuItem[] = [
    {
      id: 'home',
      label: 'الرئيسية',
      subtitle: 'الصفحة الرئيسية ومستجدات القافلة',
      icon: HomeIcon,
      isActive: currentView === 'home',
      onMainSelect: () => setCurrentView('home'),
    },
    {
      id: 'packages',
      label: 'الباقات والرحلات',
      subtitle: 'باقات الطيران والحافلات والتسجيل',
      icon: Package,
      isActive: currentView === 'packages' || currentView === 'register',
      onMainSelect: () => {
        onSelectPackageHighlight?.(null);
        setCurrentView('packages');
      },
      subItems: packageSubItems,
    },
    {
      id: 'portal',
      label: 'بوابة الحاج',
      subtitle: 'الاستعلام عن الطلب والسكن والمقعد',
      icon: UserCheck,
      isActive: currentView === 'portal',
      onMainSelect: () => setCurrentView('portal'),
      subItems: portalSubItems,
    },
    {
      id: 'guide',
      label: 'دليل المناسك',
      subtitle: 'خطوات الحج اليومية وحقيبة الحاج',
      icon: BookOpen,
      isActive: currentView === 'guide',
      onMainSelect: () => setCurrentView('guide'),
      subItems: guideSubItems,
    },
    {
      id: 'ai-advisor',
      label: 'المرشد الذكي',
      subtitle: 'الإجابات الفورية عن استفسارات الحج',
      icon: Sparkles,
      isActive: currentView === 'ai-advisor',
      onMainSelect: () => setCurrentView('ai-advisor'),
    },
    {
      id: 'contact',
      label: 'تواصل معنا',
      subtitle: 'أرقام الهواتف وموقع مكتب القافلة',
      icon: Phone,
      isActive: currentView === 'contact',
      onMainSelect: () => setCurrentView('contact'),
    },
    ...(adminLoggedIn
      ? [
          {
            id: 'admin',
            label: 'لوحة التحكم (مدير)',
            subtitle: currentAdminUser?.fullName
              ? `${currentAdminUser.fullName} · ${currentAdminUser.role}`
              : 'إدارة الحجاج والعمليات التشغيلية',
            icon: Shield,
            isActive: currentView === 'admin',
            onMainSelect: () => setCurrentView('admin'),
            subItems: adminSubItems,
          },
        ]
      : []),
  ];

  const handleDesktopMouseEnter = (itemId: string, hasSub: boolean) => {
    if (closeDropdownTimerRef.current) {
      window.clearTimeout(closeDropdownTimerRef.current);
      closeDropdownTimerRef.current = null;
    }
    if (hasSub) {
      setOpenDesktopDropdownId(itemId);
    } else {
      setOpenDesktopDropdownId(null);
    }
  };

  const handleDesktopMouseLeave = () => {
    closeDropdownTimerRef.current = window.setTimeout(() => {
      setOpenDesktopDropdownId(null);
    }, 160);
  };

  const brandName = campaignSettings.siteTexts?.brandName || 'قافلة القائم';
  const brandSubtitle = campaignSettings.siteTexts?.brandSubtitle || 'للحج والعمرة والزيارة';

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0B1221]/95 backdrop-blur-xl border-b border-slate-800/90 text-white shadow-xl relative after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-amber-500/35 after:to-transparent">
        {/* Copy Link Toast */}
        {copyToast && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-4 text-center transition-all animate-fadeIn flex items-center justify-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>تم نسخ رابط الموقع بنجاح إلى الحافظة</span>
          </div>
        )}

        {/* Executive Top Utility Bar */}
        <div className="bg-gradient-to-r from-[#080D1A] via-[#0E172A] to-[#080D1A] border-b border-amber-500/20 text-slate-200 px-3 sm:px-4 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="font-bold text-amber-300 leading-snug">
                {campaignSettings.siteTexts?.topBarAnnouncement || 'قافلة القائم للحج والعمرة - موسم 1448هـ'}
              </span>
              <span className="hidden md:inline-block text-slate-500">·</span>
              <span className="hidden md:inline-block text-slate-300 font-medium">
                {campaignSettings.siteTexts?.topBarBadge || 'ترخيص رسمي معتمد'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href={`tel:${campaignSettings.phone}`}
                className="hover:text-amber-400 transition-colors flex items-center gap-1 font-mono tabular-nums font-bold text-amber-400"
                dir="ltr"
              >
                <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{campaignSettings.phone}</span>
              </a>
              <span className="hidden sm:inline text-slate-600">·</span>
              <span className="hidden sm:inline text-slate-400">
                {campaignSettings.siteTexts?.topBarSubtext || 'الأحساء - المبرز'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Header Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
            {/* Zone 1: Redesigned Brand Identity Lockup */}
            <button
              type="button"
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-3 text-right cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-2xl p-1 -mr-1 shrink-0"
            >
              <div className="w-11 h-11 sm:w-13 sm:h-13 bg-white rounded-xl sm:rounded-2xl p-1.5 shadow-md flex items-center justify-center border border-amber-500/45 group-hover:border-amber-400 group-hover:scale-[1.03] transition-all duration-200 overflow-hidden shrink-0">
                <img
                  src="/assets/aistudio/Screenshot_20261107_174409_com_instagram_android_InstagramMainActivity_441b738d.png"
                  alt="شعار قافلة القائم"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-amber-300 transition-colors block leading-snug">
                  {brandName}
                </span>
                <span className="text-[11px] sm:text-xs text-amber-400/90 font-semibold block">
                  {brandSubtitle}
                </span>
              </div>
            </button>

            {/* Zone 2: Desktop Horizontal Navigation with Nested Dropdown Menus */}
            <nav
              ref={desktopNavRef}
              aria-label="القائمة الرئيسية للموقع"
              className="hidden xl:flex items-center gap-1.5"
            >
              {mainMenuItems.map((item) => {
                const Icon = item.icon;
                const hasSub = Boolean(item.subItems && item.subItems.length > 0);
                const isDropdownOpen = openDesktopDropdownId === item.id;

                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => handleDesktopMouseEnter(item.id, hasSub)}
                    onMouseLeave={handleDesktopMouseLeave}
                  >
                    <div
                      className={`h-11 rounded-xl border transition-all duration-200 flex items-center relative overflow-hidden ${
                        item.isActive
                          ? 'bg-gradient-to-l from-amber-500/[0.16] via-[#131F38] to-[#0E172A] border-amber-500/50 text-amber-300 shadow-[0_0_20px_-6px_rgba(245,158,11,0.28)]'
                          : isDropdownOpen
                          ? 'bg-[#131F38] border-amber-500/35 text-white'
                          : 'bg-[#10192D]/70 hover:bg-[#142038] border-slate-800/80 hover:border-slate-700 text-slate-200 hover:text-white'
                      }`}
                    >
                      {/* Subtle bottom gold indicator bar for active desktop item */}
                      {item.isActive && (
                        <span className="absolute bottom-0 right-2.5 left-2.5 h-0.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 rounded-full" />
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          item.onMainSelect();
                          setOpenDesktopDropdownId(null);
                        }}
                        className="px-3 py-2 h-full flex items-center gap-2 text-xs sm:text-[13px] font-bold whitespace-nowrap cursor-pointer focus-visible:outline-none active:scale-[0.98] transition-transform"
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                            item.isActive
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-[#0B1221] text-amber-400/85 border-slate-800/90'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span>{item.label}</span>
                      </button>

                      {hasSub && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDesktopDropdownId((prev) => (prev === item.id ? null : item.id));
                          }}
                          aria-expanded={isDropdownOpen}
                          aria-label={`القوائم الفرعية لـ ${item.label}`}
                          className="pl-2.5 pr-1 h-full flex items-center justify-center text-slate-400 hover:text-amber-400 transition-colors cursor-pointer focus-visible:outline-none"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isDropdownOpen ? 'rotate-180 text-amber-400' : ''
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Desktop Dropdown Panel for Sub-Menus */}
                    {hasSub && (
                      <div
                        className={`absolute right-0 top-full pt-2 w-72 z-50 transition-all duration-200 origin-top-right ${
                          isDropdownOpen
                            ? 'opacity-100 translate-y-0 pointer-events-auto'
                            : 'opacity-0 -translate-y-1.5 pointer-events-none'
                        }`}
                      >
                        <div className="bg-[#0B1221]/98 backdrop-blur-2xl border border-amber-500/35 rounded-2xl p-2.5 shadow-2xl space-y-1.5 text-right">
                          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-800/90">
                            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                              <CornerDownLeft className="w-3 h-3" />
                              <span>{item.label}</span>
                            </span>
                            <span className="text-[10px] font-mono tabular-nums text-slate-400">
                              {item.subItems?.length} خيارات
                            </span>
                          </div>

                          <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
                            {item.subItems?.map((sub) => {
                              const SubIcon = sub.icon;
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => {
                                    sub.onSelect();
                                    setOpenDesktopDropdownId(null);
                                  }}
                                  className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5 relative overflow-hidden group cursor-pointer active:scale-[0.99] ${
                                    sub.isActive
                                      ? 'bg-gradient-to-l from-amber-500/[0.16] via-[#131F38] to-[#0D1628] border-amber-500/45 text-amber-300 shadow-sm'
                                      : 'bg-[#0E172A]/80 hover:bg-[#14223D] border-slate-800/70 hover:border-slate-700 text-slate-200 hover:text-white'
                                  }`}
                                >
                                  {sub.isActive && (
                                    <span className="absolute right-0 top-2 bottom-2 w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-orange-500 rounded-l-full" />
                                  )}
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                        sub.isActive
                                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                                          : 'bg-[#080D1A] text-amber-400/80 border-slate-800 group-hover:text-amber-300'
                                      }`}
                                    >
                                      <SubIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-bold block leading-snug">
                                        {sub.label}
                                      </span>
                                      {sub.subtitle && (
                                        <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">
                                          {sub.subtitle}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Account Management Logout Option inside Admin Desktop Dropdown */}
                          {item.id === 'admin' && adminLoggedIn && (
                            <div className="pt-2 mt-1.5 border-t border-slate-800/90 space-y-1.5">
                              <span className="px-2 text-[10px] font-bold text-slate-400 block">
                                إدارة الحساب
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenDesktopDropdownId(null);
                                  setShowLogoutConfirmModal(true);
                                }}
                                className="w-full text-right px-3 py-2.5 rounded-xl bg-gradient-to-l from-rose-500/[0.12] via-[#10192D] to-[#0D1526] hover:from-rose-500/[0.22] hover:via-[#161F36] border border-rose-500/30 hover:border-rose-400/50 transition-all duration-200 flex items-center justify-between gap-2.5 group cursor-pointer active:scale-[0.98]"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-400 group-hover:bg-rose-500/25 group-hover:text-rose-300 flex items-center justify-center shrink-0 transition-colors">
                                    <LogOut className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-bold text-rose-300 group-hover:text-rose-200 block leading-snug">
                                      تسجيل الخروج
                                    </span>
                                    <span className="text-[10px] text-rose-300/75 block mt-0.5 leading-normal">
                                      الخروج الآمن من حسابك
                                    </span>
                                  </div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Zone 3: Desktop Utility Actions & Discreet Staff Login / Account Logout */}
            <div className="hidden xl:flex items-center gap-2 shrink-0">
              {!adminLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setCurrentView('admin')}
                  className={`h-10 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-gradient-to-l from-amber-500/[0.16] to-[#10192D] border-amber-500/50 text-amber-300'
                      : 'bg-[#10192D] hover:bg-[#15223B] border-slate-800 hover:border-amber-500/30 text-slate-300 hover:text-amber-300'
                  }`}
                  title="دخول المشرفين والإدارة"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>دخول الإدارة</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirmModal(true)}
                  className="h-10 px-3.5 rounded-xl bg-gradient-to-l from-rose-500/[0.12] via-[#10192D] to-[#0D1526] hover:from-rose-500/[0.22] hover:via-[#161F36] border border-rose-500/30 hover:border-rose-400/50 text-rose-300 hover:text-rose-200 text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95"
                  title="الخروج الآمن من حسابك"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>تسجيل الخروج</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShareSite}
                className="h-10 px-3.5 rounded-xl bg-[#10192D] hover:bg-[#16233E] text-amber-400 hover:text-amber-300 transition-all duration-200 border border-slate-800 hover:border-amber-500/35 flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95"
                title="مشاركة الموقع"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة</span>
              </button>
              <PWAInstallButton />
            </div>

            {/* Mobile & Tablet Action Bar */}
            <div className="xl:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareSite}
                className="w-10 h-10 rounded-lg bg-[#10192D] hover:bg-[#16233E] text-amber-400 transition-all border border-slate-800 hover:border-amber-500/40 flex items-center justify-center cursor-pointer active:scale-95"
                title="مشاركة الموقع"
                aria-label="مشاركة الموقع"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <div>
                <PWAInstallButton />
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="w-10 h-10 sm:w-auto sm:px-3.5 rounded-lg bg-gradient-to-l from-amber-500/[0.18] to-[#10192D] text-amber-300 hover:text-white transition-all border border-amber-500/40 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
                aria-label="فتح القائمة الرئيسية"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold hidden sm:inline">القائمة</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Slide-Over Navigation Drawer + Dark Blurred Backdrop */}
      <div
        className={`xl:hidden fixed inset-0 z-[100] transition-all duration-300 ${
          mobileMenuOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        {/* Dark Translucent Backdrop */}
        <div
          onClick={() => setMobileMenuOpen(false)}
          className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Slide-Over RTL Drawer Panel */}
        <aside
          aria-label="لوحة التنقل الرئيسية"
          className={`fixed inset-y-0 right-0 w-full max-w-[365px] sm:max-w-[395px] bg-[#0B1221] border-l border-amber-500/25 shadow-2xl flex flex-col justify-between text-right transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* 1. Redesigned Drawer Header: Logo, Brand Name, Subtitle, Share Button & Close Button */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-[#101A30] to-[#0B1221] border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0">
            <div
              onClick={() => {
                setCurrentView('home');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
            >
              <div className="w-12 h-12 bg-white rounded-2xl p-1.5 shadow-md flex items-center justify-center border border-amber-500/45 shrink-0">
                <img
                  src="/assets/aistudio/Screenshot_20261107_174409_com_instagram_android_InstagramMainActivity_441b738d.png"
                  alt="شعار قافلة القائم"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-white leading-snug">
                  {brandName}
                </h2>
                <p className="text-xs text-amber-400 font-semibold mt-0.5">
                  {brandSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleShareSite}
                className="w-10 h-10 rounded-xl bg-[#111C33] hover:bg-[#172644] text-amber-400 border border-slate-800 hover:border-amber-500/40 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="مشاركة الموقع"
                aria-label="مشاركة الموقع"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-xl bg-[#111C33] hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="إغلاق القائمة"
                aria-label="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. Scrollable Main & Nested Navigation List */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-2">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[11px] font-bold text-slate-400">
                أقسام الموقع والخدمات الإلكترونية
              </span>
              <span className="text-[10px] text-amber-400/80 font-semibold">
                موسم 1448هـ
              </span>
            </div>

            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const hasSub = Boolean(item.subItems && item.subItems.length > 0);
              const isExpanded = expandedMobileMenuId === item.id;

              return (
                <div key={item.id} className="space-y-1.5">
                  {/* Main Menu Card */}
                  <div
                    className={`w-full min-h-[62px] rounded-2xl border transition-all duration-200 flex items-center justify-between relative overflow-hidden ${
                      item.isActive
                        ? 'bg-gradient-to-l from-amber-500/[0.16] via-[#131F38] to-[#0E172A] border-amber-500/55 text-white shadow-[0_0_20px_-6px_rgba(245,158,11,0.28)]'
                        : isExpanded
                        ? 'bg-[#131F38] border-amber-500/35 text-white'
                        : 'bg-[#10192D] hover:bg-[#15223B] border-slate-800/90 text-slate-200 hover:text-white'
                    }`}
                  >
                    {/* Refined Right-Side Gold Indicator Bar for Active State */}
                    {item.isActive && (
                      <span className="absolute right-0 top-2.5 bottom-2.5 w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-orange-500 rounded-l-full" />
                    )}

                    {/* Main Click Area (Navigates or toggles sub-menu) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (hasSub && !item.isActive && !isExpanded) {
                          item.onMainSelect();
                          setMobileMenuOpen(false);
                        } else {
                          item.onMainSelect();
                          setMobileMenuOpen(false);
                        }
                      }}
                      className="flex-1 text-right py-3 pr-3.5 pl-2 flex items-center gap-3 min-w-0 cursor-pointer active:scale-[0.99] transition-transform focus-visible:outline-none"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                          item.isActive
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/45 shadow-sm'
                            : 'bg-[#0B1221] text-amber-400/90 border-slate-800'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-sm font-bold block leading-snug ${
                            item.isActive ? 'text-amber-300' : 'text-white'
                          }`}
                        >
                          {item.label}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                          {item.subtitle}
                        </span>
                      </div>
                    </button>

                    {/* Dedicated Accordion Toggle Button for Items with Sub-Menus */}
                    {hasSub ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedMobileMenuId((prev) => (prev === item.id ? null : item.id));
                        }}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? `إغلاق القائمة الفرعية لـ ${item.label}` : `فتح القائمة الفرعية لـ ${item.label}`}
                        className="pl-3.5 pr-2 py-3 self-stretch flex items-center justify-center cursor-pointer focus-visible:outline-none"
                      >
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                            isExpanded
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                              : 'bg-[#0B1221]/90 border-slate-800 text-slate-400 hover:text-amber-300'
                          }`}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </span>
                      </button>
                    ) : (
                      item.isActive && (
                        <span className="ml-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35 shrink-0">
                          نشط
                        </span>
                      )
                    )}
                  </div>

                  {/* Nested Accordion Sub-Menu Drawer */}
                  {hasSub && (
                    <div
                      className={`grid transition-all duration-200 ease-out ${
                        isExpanded
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mr-4 pr-3 border-r-2 border-amber-500/35 pt-0.5 pb-1">
                          <div className="bg-[#070C18] border border-slate-800/90 rounded-2xl p-2 space-y-1.5 shadow-inner">
                            {item.subItems?.map((sub) => {
                              const SubIcon = sub.icon;
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => {
                                    sub.onSelect();
                                    setMobileMenuOpen(false);
                                  }}
                                  className={`w-full min-h-[46px] text-right px-3 py-2 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5 relative overflow-hidden group cursor-pointer active:scale-[0.98] ${
                                    sub.isActive
                                      ? 'bg-gradient-to-l from-amber-500/[0.16] via-[#131F38] to-[#0D1628] border-amber-500/50 text-amber-300 shadow-sm'
                                      : 'bg-[#0D1628] hover:bg-[#13203A] border-slate-800/80 text-slate-300 hover:text-white'
                                  }`}
                                >
                                  {sub.isActive && (
                                    <span className="absolute right-0 top-2 bottom-2 w-1 bg-amber-400 rounded-l-full" />
                                  )}
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                        sub.isActive
                                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                                          : 'bg-[#080D1A] text-amber-400/80 border-slate-800 group-hover:text-amber-300'
                                      }`}
                                    >
                                      <SubIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-bold block leading-snug">
                                        {sub.label}
                                      </span>
                                      {sub.subtitle && (
                                        <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">
                                          {sub.subtitle}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 3. Independent Account Management & Footer Section at Bottom of Main Menu */}
          <div className="bg-[#080D1A] border-t border-slate-800/90 p-4 space-y-3 shrink-0">
            {/* Independent Account Management & Logout Option — Only visible to logged-in users */}
            {adminLoggedIn && (
              <div className="space-y-2 pb-3 border-b border-slate-800/90">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-slate-400 tracking-wide">
                    إدارة الحساب
                  </span>
                  {currentAdminUser?.fullName && (
                    <span className="text-[10px] text-amber-400/90 font-semibold truncate max-w-[180px]">
                      {currentAdminUser.fullName}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowLogoutConfirmModal(true)}
                  className="w-full min-h-[60px] text-right py-3 px-3.5 rounded-2xl bg-gradient-to-l from-rose-500/[0.12] via-[#10192D] to-[#0D1526] hover:from-rose-500/[0.2] hover:via-[#152038] hover:to-[#0F182C] border border-rose-500/30 hover:border-rose-400/50 shadow-sm hover:shadow-[0_0_20px_-6px_rgba(244,63,94,0.3)] transition-all duration-200 flex items-center justify-between gap-3 group cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/15 group-hover:bg-rose-500/25 border border-rose-500/35 group-hover:border-rose-400/50 text-rose-400 group-hover:text-rose-300 flex items-center justify-center shrink-0 transition-all duration-200">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-rose-300 group-hover:text-rose-200 block leading-snug transition-colors">
                        تسجيل الخروج
                      </span>
                      <span className="text-[11px] text-rose-300/75 group-hover:text-rose-200/85 block mt-0.5 leading-relaxed transition-colors">
                        الخروج الآمن من حسابك
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 group-hover:bg-rose-500/25 transition-colors shrink-0">
                    خروج آمن
                  </span>
                </button>
              </div>
            )}

            {/* Quick Contact & Staff Login Access (if not logged in) */}
            <div className="flex items-center justify-between gap-2">
              <a
                href={`tel:${campaignSettings.phone}`}
                className="flex-1 h-10 px-3 rounded-xl bg-[#10192D] hover:bg-[#16233E] border border-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span dir="ltr">{campaignSettings.phone}</span>
              </a>

              {!adminLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('admin');
                    setMobileMenuOpen(false);
                  }}
                  className="h-10 px-3.5 rounded-xl bg-[#10192D] hover:bg-[#16233E] border border-slate-800 hover:border-amber-500/35 text-slate-300 hover:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>دخول الإدارة</span>
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Elegant Logout Confirmation Modal */}
      {showLogoutConfirmModal && adminLoggedIn && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
        >
          {/* Dark Blurred Backdrop */}
          <div
            onClick={() => !isLoggingOut && setShowLogoutConfirmModal(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fadeIn"
          />

          {/* Confirmation Dialog Card */}
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#111C33] to-[#0B1221] border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-right space-y-5 z-10 animate-fadeIn">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
                  <LogOut className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="logout-modal-title" className="text-lg font-black text-white leading-snug">
                    تسجيل الخروج
                  </h3>
                  <p className="text-xs text-amber-400/90 font-semibold mt-0.5">
                    إدارة الحساب · {brandName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutConfirmModal(false)}
                className="w-9 h-9 rounded-xl bg-[#0B1221] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="إغلاق نافذة التأكيد"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#080D1A]/90 border border-slate-800/90 rounded-2xl p-4">
              <p className="text-sm text-slate-200 font-medium leading-relaxed">
                هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟
              </p>
              {currentAdminUser?.fullName && (
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                  <span>الحساب الحالي:</span>
                  <span className="font-bold text-amber-300">{currentAdminUser.fullName}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutConfirmModal(false)}
                className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-[#131F38] hover:bg-[#192847] text-slate-100 hover:text-white border border-slate-700/80 hover:border-amber-500/40 text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-[0.98]"
              >
                البقاء في الحساب
              </button>

              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleConfirmLogout}
                className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/40 shadow-lg shadow-rose-950/50 text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60"
              >
                <LogOut className="w-4 h-4" />
                <span>{isLoggingOut ? 'جاري تسجيل الخروج...' : 'نعم، تسجيل الخروج'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
