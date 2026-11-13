import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Pilgrim, HajjPackage, Announcement, AdminUser, CampaignSettings, PilgrimFeedback, NotificationItem } from './types';
import { initialPilgrims, hajjPackages as defaultPackages, announcements as defaultAnnouncements, initialAdminUsers, defaultCampaignSettings, defaultSiteTexts } from './data/initialData';
import { Navbar, GuideTabId } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './components/Home';
import { RegistrationForm } from './components/RegistrationForm';
import { PilgrimPortal } from './components/PilgrimPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { PackagesView } from './components/PackagesView';
import { GuideView } from './components/GuideView';
import { AiAdvisor } from './components/AiAdvisor';
import { ContactView } from './components/ContactView';
import { Share2 } from 'lucide-react';
import { auth } from './lib/firebase';
import { PWAInstallButton } from './components/pwa/PWAInstallButton';
import { 
  getDocuments, getDocument, setDocument, updateDocument, removeDocument, 
  subscribeToCollection, subscribeToDocument, testFirestoreConnection, recordActivityLog,
  getSeasonPilgrims, subscribeToSeasonPilgrims
} from './lib/db';
import { calculatePilgrimStatsBreakdown } from './utils/pilgrimStats';
import { processDueScheduledNotifications } from './lib/notifications';
import { DEFAULT_ROLE_PERMISSIONS, isGeneralAdminUser, migrateAdminUserRecord } from './utils/rbac';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [packages, setPackages] = useState<HajjPackage[]>(defaultPackages);
  const [announcements, setAnnouncements] = useState<Announcement[]>(defaultAnnouncements);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(initialAdminUsers);
  const [feedback, setFeedback] = useState<PilgrimFeedback[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettings>(defaultCampaignSettings);
  const [selectedPackageForReg, setSelectedPackageForReg] = useState<string>('');
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [guideSubTab, setGuideSubTab] = useState<GuideTabId>('day1');
  const [adminSubTab, setAdminSubTab] = useState<string>('dashboard');
  const [highlightedPackageId, setHighlightedPackageId] = useState<string | null>(null);

  // Prevent mobile hardware Back button from exiting the app when on a sub-view
  useEffect(() => {
    if (currentView !== 'home') {
      window.history.pushState({ appView: currentView }, '');
    }
  }, [currentView]);

  useEffect(() => {
    const handleViewPopState = (e: PopStateEvent) => {
      // Prevent returning to protected admin views after logout via browser Back button
      if (!adminLoggedIn && (currentView === 'admin' || e.state?.appView === 'admin')) {
        window.history.replaceState({ appView: 'home', loggedOut: true }, '', window.location.pathname);
        setCurrentView('home');
        return;
      }
      // If an admin modal was just closed via popstate, do not also exit the admin view
      if (e.state && e.state.appView) {
        return;
      }
      if (currentView !== 'home') {
        setCurrentView('home');
      }
    };
    window.addEventListener('popstate', handleViewPopState);
    return () => window.removeEventListener('popstate', handleViewPopState);
  }, [currentView, adminLoggedIn]);

  // Helper to normalize usernames/emails and detect Master Admin aliases
  const ALLOWED_ADMIN_DOMAINS = ['alqaemhajj.com', 'alqaem.org', 'gmail.com'];
  const normalizeAdminKey = (val?: string) => (val || '').trim().toLowerCase();
  const isMasterAdminAlias = (username?: string) => {
    const norm = normalizeAdminKey(username);
    return norm === 'admin' || norm === 'alahsaey@gmail.com' || norm === 'admin@alqaemhajj.com';
  };
  const isWhitelistedEmailDomain = (email?: string) => {
    const norm = normalizeAdminKey(email);
    if (!norm.includes('@')) return false;
    const domain = norm.split('@')[1] || '';
    return ALLOWED_ADMIN_DOMAINS.includes(domain);
  };

  // Deduplicate adminUsers list and automatically remove redundant duplicate docs from Firestore
  const deduplicateAndSyncAdmins = (rawList: AdminUser[]): AdminUser[] => {
    const seenByKey = new Map<string, AdminUser>();
    const seenByName = new Map<string, AdminUser>();
    const duplicateIdsToDelete: string[] = [];

    // Sort so canonical IDs ('usr-1', 'usr-2') come first and are preserved over random/UID duplicates
    const sorted = [...rawList].sort((a, b) => {
      const aCanonical = a.id === 'usr-1' || a.id === 'usr-2' ? 0 : 1;
      const bCanonical = b.id === 'usr-1' || b.id === 'usr-2' ? 0 : 1;
      return aCanonical - bCanonical;
    });

    for (const item of sorted) {
      const normUser = normalizeAdminKey(item.username);
      const normName = (item.fullName || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const canonicalKey =
        isMasterAdminAlias(normUser) ||
        ((item.role === 'مدير عام (Master Admin)' || item.role === 'الإدارة العامة') &&
          normName === 'المدير العام للقافلة')
          ? '__master_admin__'
          : normUser;

      if (!canonicalKey) continue;

      if (seenByKey.has(canonicalKey) || (normName && seenByName.has(normName))) {
        duplicateIdsToDelete.push(item.id);
      } else {
        const migrated = migrateAdminUserRecord(item, campaignSettings.rolePermissionTemplates);
        seenByKey.set(canonicalKey, migrated);
        if (normName) seenByName.set(normName, migrated);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      duplicateIdsToDelete.forEach((dupId) => {
        removeDocument('adminUsers', dupId).catch(() => {});
      });
    }

    return Array.from(seenByKey.values());
  };

  // Initialize and Test Connection
  useEffect(() => {
    testFirestoreConnection();
    
    // Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const rawAdmins = await getDocuments<AdminUser>('adminUsers');
          const admins = deduplicateAndSyncAdmins(rawAdmins);
          if (admins.length > 0) setAdminUsers(admins);

          const normEmail = normalizeAdminKey(user.email || '');
          const normLocalPart = normEmail.split('@')[0] || '';

          // Enforce Domain Whitelisting for non-anonymous Google Auth sessions
          if (!user.isAnonymous && normEmail && !isWhitelistedEmailDomain(normEmail)) {
            await auth.signOut();
            setAdminLoggedIn(false);
            setCurrentAdminUser(null);
            return;
          }

          const found = admins.find((a) => {
            const adminUserNorm = normalizeAdminKey(a.username);
            const adminLocalPart = adminUserNorm.split('@')[0] || '';
            return (
              a.id === user.uid ||
              adminUserNorm === normEmail ||
              (normLocalPart && adminLocalPart === normLocalPart && isWhitelistedEmailDomain(normEmail) && adminUserNorm.includes('@')) ||
              (normEmail === 'alahsaey@gmail.com' &&
                (isMasterAdminAlias(a.username) || a.id === 'usr-1' || a.role === 'مدير عام (Master Admin)' || a.role === 'الإدارة العامة'))
            );
          });

          if (found) {
            if (found.status === 'suspended') {
              await auth.signOut();
              setAdminLoggedIn(false);
              setCurrentAdminUser(null);
              return;
            }
            setAdminLoggedIn(true);
            setCurrentAdminUser(found);
          } else if (normEmail === 'alahsaey@gmail.com') {
            // Bootstrap Master Admin using canonical ID 'usr-1' so it never duplicates
            const masterAdmin: AdminUser = {
              id: 'usr-1',
              username: 'admin',
              pin: '3f03b51688d048d0870949d2110c9d784762391696a40a50f00f07f90f230589',
              fullName: 'المدير العام للقافلة',
              role: 'الإدارة العامة',
              status: 'active',
              assignedSeason: 'موسم 1448هـ',
              assignedCaravan: 'جميع القوافل والأفواج',
              detailedPermissions: DEFAULT_ROLE_PERMISSIONS['الإدارة العامة'],
              permissions: {
                managePilgrims: true,
                manageAnnouncements: true,
                managePackages: true,
                manageStaff: true,
                manageFinance: true,
                manageReligiousGuide: true,
                manageTravelKit: true,
                manageNotifications: true,
                manageGifts: true,
                manageCultural: true,
              },
              createdAt: new Date().toISOString().split('T')[0]
            };
            await setDocument('adminUsers', 'usr-1', masterAdmin);
            setAdminLoggedIn(true);
            setCurrentAdminUser(masterAdmin);
          } else if (user.isAnonymous) {
            // Anonymous auth is used by manual PIN login; keep state managed by manual login handler
            setAdminLoggedIn(true);
          } else {
            // Unauthorized Google email that is not registered in adminUsers
            await auth.signOut();
            setAdminLoggedIn(false);
            setCurrentAdminUser(null);
          }
        } catch (e) {
          console.warn("Auth-related data fetch notice:", e);
        }
      } else {
        setAdminLoggedIn(false);
        setCurrentAdminUser(null);
      }
    });

    // Immediate direct data fetch conditioned strictly on active season 1448
    const loadInitialPilgrims = async () => {
      try {
        const directPilgrims = await getSeasonPilgrims<Pilgrim>('1448');
        if (directPilgrims.length > 0) {
          setPilgrims(directPilgrims);
        }
      } catch (e) {
        console.warn('Initial pilgrims direct fetch notice:', e);
      }
    };
    loadInitialPilgrims();

    // Real-time Subscriptions (Packages, Announcements, Campaign Settings, and Season 1448 Pilgrims)
    const unsubPackages = subscribeToCollection<HajjPackage>('packages', (data) => {
      if (data.length > 0) setPackages(data);
    });
    const unsubAnnouncements = subscribeToCollection<Announcement>('announcements', (data) => {
      if (data.length > 0) setAnnouncements(data);
    });
    const unsubSettings = subscribeToDocument<CampaignSettings>('settings', 'campaign', (data) => {
      if (data) setCampaignSettings(data);
    });
    const unsubPilgrims = subscribeToSeasonPilgrims<Pilgrim>('1448', (data) => {
      setPilgrims(data);
    });

    return () => {
      unsubscribeAuth();
      unsubPackages();
      unsubAnnouncements();
      unsubSettings();
      unsubPilgrims();
    };
  }, []);

  const refreshAllData = async () => {
    try {
      const freshPilgrims = await getSeasonPilgrims<Pilgrim>('1448');
      setPilgrims(freshPilgrims);
    } catch (e) {
      console.warn('Manual refresh notice:', e);
    }
  };

  // Privileged Real-time Subscriptions (Admin Users, Feedback, Notifications)
  // Strictly attached ONLY when an administrative session is authenticated
  useEffect(() => {
    if (!adminLoggedIn) {
      setFeedback([]);
      setNotifications([]);
      return;
    }

    const unsubAdmins = subscribeToCollection<AdminUser>('adminUsers', (data) => {
      if (data.length > 0) {
        const uniqueAdmins = deduplicateAndSyncAdmins(data);
        setAdminUsers(uniqueAdmins);
        // Live session sync: update currentAdminUser permissions or revoke session if suspended
        setCurrentAdminUser((prevUser) => {
          if (!prevUser) return null;
          const updatedSelf = uniqueAdmins.find(
            (u) =>
              u.id === prevUser.id ||
              normalizeAdminKey(u.username) === normalizeAdminKey(prevUser.username)
          );
          if (!updatedSelf) return prevUser;
          if (updatedSelf.status === 'suspended') {
            auth.signOut().catch(() => {});
            setAdminLoggedIn(false);
            return null;
          }
          return updatedSelf;
        });
      }
    });
    const unsubFeedback = subscribeToCollection<PilgrimFeedback>('feedback', (data) => {
      setFeedback(
        data.sort((a, b) =>
          String(typeof b.createdAt === 'string' ? b.createdAt : '').localeCompare(
            String(typeof a.createdAt === 'string' ? a.createdAt : '')
          )
        )
      );
    });
    const unsubNotifications = subscribeToCollection<NotificationItem>('notifications', (data) => {
      setNotifications(
        data.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    });

    return () => {
      unsubAdmins();
      unsubFeedback();
      unsubNotifications();
    };
  }, [adminLoggedIn]);

  // Periodic background dispatcher for scheduled notifications when admin is active
  useEffect(() => {
    if (!adminLoggedIn || notifications.length === 0 || pilgrims.length === 0) return;

    const checkScheduled = () => {
      processDueScheduledNotifications(notifications, pilgrims).catch(() => {});
    };
    checkScheduled();
    const timer = setInterval(checkScheduled, 30000);
    return () => clearInterval(timer);
  }, [adminLoggedIn, notifications, pilgrims]);

  // Initial Data Migration / Seeding (Only run by Master Admin)
  useEffect(() => {
    const isMaster = isGeneralAdminUser(currentAdminUser) || isMasterAdminAlias(currentAdminUser?.username);
    
    // If we've determined the user is NOT a master admin, we can stop loading
    if (adminLoggedIn && currentAdminUser && !isMaster) {
      setLoading(false);
      return;
    }

    // If we've determined there is NO user, we can stop loading (after a brief delay for safety)
    if (!adminLoggedIn) {
      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }

    if (!isMaster) return;

    const migrateData = async () => {
      try {
        const existingPackages = await getDocuments<HajjPackage>('packages');
        if (existingPackages.length === 0) {
          // Seed initial data
          for (const pkg of defaultPackages) await setDocument('packages', pkg.id, pkg);
          for (const ann of defaultAnnouncements) await setDocument('announcements', ann.id, ann);
          await setDocument('settings', 'campaign', defaultCampaignSettings);
          
          const existingAdmins = await getDocuments<AdminUser>('adminUsers');
          if (existingAdmins.length === 0) {
            for (const admin of initialAdminUsers) {
              await setDocument('adminUsers', admin.id, admin);
            }
          }
        } else {
          // Deduplicate any existing admin users without re-seeding deleted users
          const existingAdmins = await getDocuments<AdminUser>('adminUsers');
          if (existingAdmins.length === 0) {
            for (const admin of initialAdminUsers) {
              await setDocument('adminUsers', admin.id, admin);
            }
          } else {
            deduplicateAndSyncAdmins(existingAdmins);
          }

          // Rename Migration
          const campaignDoc = await getDocument<CampaignSettings>('settings', 'campaign');
          if (campaignDoc) {
             const siteTexts = campaignDoc.siteTexts;
          if (siteTexts && (siteTexts.brandName.includes('حملة') || siteTexts.topBarAnnouncement.includes('حملة'))) {
             const updatedSettings = JSON.parse(JSON.stringify(campaignDoc).replace(/حملة القائم/g, 'قافلة القائم').replace(/الحملة/g, 'القافلة'));
             await setDocument('settings', 'campaign', updatedSettings);
          }
          }
          
          for (const pkg of existingPackages) {
            if (pkg.title.includes('حملة') || pkg.type.includes('حملة')) {
               const updatedPkg = JSON.parse(JSON.stringify(pkg).replace(/حملة القائم/g, 'قافلة القائم').replace(/الحملة/g, 'القافلة'));
               await setDocument('packages', pkg.id, updatedPkg);
            }
          }
        }
      } catch (e) {
        console.error("Migration error:", e);
      } finally {
        setLoading(false);
      }
    };
    migrateData();
  }, [adminLoggedIn, currentAdminUser]);

  const getActorMeta = () => ({
    adminId: currentAdminUser?.id || auth.currentUser?.uid || 'admin',
    adminName: currentAdminUser?.fullName || auth.currentUser?.displayName || 'المدير العام',
    username: currentAdminUser?.username || auth.currentUser?.email || 'admin',
    userRole: currentAdminUser?.role || 'مدير عام (Master Admin)',
  });

  const handleAddPilgrim = async (newPilgrim: Pilgrim) => {
    const enriched: Pilgrim = {
      ...newPilgrim,
      seasonYear: newPilgrim.seasonYear || '1448',
      hajjYear: newPilgrim.hajjYear || '1448',
      season: newPilgrim.season || 'موسم حج 1448هـ',
    };
    await setDocument('pilgrims', enriched.id, enriched);
    await recordActivityLog({
      adminId: enriched.nationalId || enriched.id,
      adminName: `${enriched.firstName} ${enriched.secondName || ''} ${enriched.lastName}`.replace(/\s+/g, ' ').trim(),
      username: enriched.mobile || enriched.nationalId,
      userRole: 'حاج (تسجيل جديد)',
      category: 'بوابة الحاج والتسجيل',
      action: 'تسجيل طلب التحاق جديد بالقافلة',
      target: `الحاج: ${enriched.firstName} ${enriched.lastName} — الهوية: ${enriched.nationalId}`,
      details: `الباقة: ${enriched.selectedPackage || 'غير محدد'} | رقم المرجع: #${enriched.registrationReference}`,
    });
  };

  const handleUpdatePilgrim = async (updated: Pilgrim) => {
    const prev = pilgrims.find(p => p.id === updated.id);
    const enriched: Pilgrim = {
      ...updated,
      seasonYear: updated.seasonYear || '1448',
      hajjYear: updated.hajjYear || '1448',
      season: updated.season || 'موسم حج 1448هـ',
    };
    await updateDocument('pilgrims', enriched.id, enriched);

    const changes: string[] = [];
    if (prev && prev.status !== updated.status) {
      if (updated.status === 'مرفوض') {
        const reason = updated.rejectionReason || updated.statusNotes;
        changes.push(`رفض طلب التسجيل${reason ? ` (السبب: ${reason})` : ''}`);
      } else {
        changes.push(`تغيير الحالة من (${prev.status}) إلى (${updated.status})`);
      }
    } else if (updated.status === 'مرفوض' && prev && (prev.rejectionReason || '') !== (updated.rejectionReason || '')) {
      changes.push(`تحديث سبب الرفض: ${updated.rejectionReason || 'غير محدد'}`);
    }
    if (prev && Boolean(prev.documentsReceived) !== Boolean(updated.documentsReceived)) {
      changes.push(updated.documentsReceived ? 'تأكيد استلام المستندات ✓' : 'إلغاء استلام المستندات');
    }
    if (prev && Boolean(prev.paymentReceived) !== Boolean(updated.paymentReceived)) {
      changes.push(updated.paymentReceived ? 'تأكيد استلام الدفعة المالية وإصدار العضوية ✓' : 'إلغاء تأكيد السداد');
    }
    if (prev && (prev.selectedPackage || '') !== (updated.selectedPackage || '')) {
      changes.push(`تعديل الباقة إلى (${updated.selectedPackage || 'التسجيل العام'})`);
    }
    if (prev && prev.transport !== updated.transport) {
      changes.push(`تعديل المواصلات إلى (${updated.transport})`);
    }
    if (prev && prev.hajjType !== updated.hajjType) {
      changes.push(`تعديل نوع النسك إلى (${updated.hajjType})`);
    }
    if (
      prev &&
      (`${prev.firstName} ${prev.secondName} ${prev.thirdName} ${prev.lastName}` !==
        `${updated.firstName} ${updated.secondName} ${updated.thirdName} ${updated.lastName}` ||
        prev.nationalId !== updated.nationalId ||
        prev.mobile !== updated.mobile)
    ) {
      changes.push('تعديل البيانات الشخصية/الهوية/الجوال');
    }
    if (prev && ((prev.roomNumberMakkah || prev.roomNumber || '') !== (updated.roomNumberMakkah || updated.roomNumber || ''))) {
      changes.push(`سكن مكة: ${updated.roomNumberMakkah || updated.roomNumber || 'غير محدد'}`);
    }
    if (prev && ((prev.roomNumberMadinah || '') !== (updated.roomNumberMadinah || ''))) {
      changes.push(`سكن المدينة: ${updated.roomNumberMadinah || 'غير محدد'}`);
    }
    if (prev && ((prev.roomNumberMina || '') !== (updated.roomNumberMina || ''))) {
      changes.push(`تسكين منى: ${updated.roomNumberMina || 'غير محدد'}`);
    }
    if (prev && (prev.busNumber || '') !== (updated.busNumber || '')) {
      changes.push(`تخصيص الباص: ${updated.busNumber || 'غير مخصص'}`);
    }
    if (prev && prev.busSeat !== updated.busSeat) {
      changes.push(`مقعد الباص/الرحلة: ${updated.busSeat || 'غير محدد'}`);
    }
    if (
      prev &&
      ((prev.flightNumberOutbound || '') !== (updated.flightNumberOutbound || '') ||
        (prev.flightNumberReturn || '') !== (updated.flightNumberReturn || '') ||
        (prev.flightTicketNumber || '') !== (updated.flightTicketNumber || ''))
    ) {
      changes.push(`تحديث بيانات رحلة الطيران (${updated.flightNumberOutbound || '—'} / ${updated.flightNumberReturn || '—'})`);
    }

    const rejectionSummary =
      updated.status === 'مرفوض' && (updated.rejectionReason || updated.statusNotes)
        ? ` | سبب الرفض: ${updated.rejectionReason || updated.statusNotes}`
        : '';

    await recordActivityLog({
      ...getActorMeta(),
      category: changes.some(c => c.includes('المالية')) ? 'المالية والإيصالات' : 'إدارة الحجاج',
      action: changes.length > 0 ? changes.join(' + ') : 'تحديث بيانات وطلب حاج مسجل',
      target: `الحاج: ${updated.firstName} ${updated.lastName} (${updated.nationalId})`,
      details: `الحالة: ${updated.status}${rejectionSummary} | الباقة: ${updated.selectedPackage || 'التسجيل العام'} | سكن مكة: ${updated.roomNumberMakkah || updated.roomNumber || '—'} | سكن المدينة: ${updated.roomNumberMadinah || '—'} | تسكين منى: ${updated.roomNumberMina || '—'} | الباص: ${updated.busNumber || '—'} | الطيران: ${updated.flightNumberOutbound || '—'}`,
    });
  };

  const handleDeletePilgrim = async (id: string) => {
    const target = pilgrims.find(p => p.id === id);
    await removeDocument('pilgrims', id);
    await recordActivityLog({
      ...getActorMeta(),
      category: 'إدارة الحجاج',
      action: 'حذف نهائي لسجل حاج من النظام',
      target: target ? `الحاج: ${target.firstName} ${target.lastName} (${target.nationalId})` : `معرف السجل: ${id}`,
    });
  };

  const handleAddPackage = async (pkg: HajjPackage) => {
    await setDocument('packages', pkg.id, pkg);
    await recordActivityLog({
      ...getActorMeta(),
      category: 'الباقات والإعلانات',
      action: 'إضافة باقة حج/عمرة جديدة',
      target: `${pkg.title} (${pkg.price})`,
      details: `النوع: ${pkg.type} | المواصلات: ${pkg.transport}`,
    });
  };

  const handleUpdatePackage = async (updated: HajjPackage) => {
    await updateDocument('packages', updated.id, updated);
    await recordActivityLog({
      ...getActorMeta(),
      category: 'الباقات والإعلانات',
      action: 'تعديل تفاصيل أو سعر باقة',
      target: `${updated.title} — السعر: ${updated.price}`,
      details: `النوع: ${updated.type} | السكن بمكة: ${updated.accommodationMakkah}`,
    });
  };

  const handleDeletePackage = async (id: string) => {
    const pkg = packages.find(p => p.id === id);
    await removeDocument('packages', id);
    await recordActivityLog({
      ...getActorMeta(),
      category: 'الباقات والإعلانات',
      action: 'حذف باقة من قائمة الباقات',
      target: pkg ? pkg.title : id,
    });
  };

  const handleAddAnnouncement = async (ann: Announcement) => {
    await setDocument('announcements', ann.id, ann);
    await recordActivityLog({
      ...getActorMeta(),
      category: 'الباقات والإعلانات',
      action: `نشر إعلان أو درس جديد (${ann.category})`,
      target: ann.title,
      details: ann.content.slice(0, 120),
    });
  };

  const handleUpdateAnnouncement = async (updated: Announcement) => {
    await updateDocument('announcements', updated.id, updated);
    await recordActivityLog({
      ...getActorMeta(),
      category: 'الباقات والإعلانات',
      action: `تعديل إعلان أو درس (${updated.category})`,
      target: updated.title,
    });
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const ann = announcements.find(a => a.id === id);
    await removeDocument('announcements', id);
    await recordActivityLog({
      ...getActorMeta(),
      category: 'الباقات والإعلانات',
      action: 'حذف إعلان أو درس',
      target: ann ? ann.title : id,
    });
  };

  const handleAddAdminUser = async (user: AdminUser) => {
    const cleanUsername = normalizeAdminKey(user.username);
    const cleanName = (user.fullName || '').trim().replace(/\s+/g, ' ');

    // Check against both local state and Firestore to guarantee zero duplicates
    const currentDbAdmins = await getDocuments<AdminUser>('adminUsers');
    const allKnown = [...adminUsers, ...currentDbAdmins];
    const duplicate = allKnown.find(
      (existing) =>
        normalizeAdminKey(existing.username) === cleanUsername ||
        (isMasterAdminAlias(cleanUsername) && isMasterAdminAlias(existing.username)) ||
        existing.fullName.trim().replace(/\s+/g, ' ').toLowerCase() === cleanName.toLowerCase()
    );

    if (duplicate) {
      // Do not create a second user document; update the existing one instead
      const merged: AdminUser = {
        ...duplicate,
        ...user,
        id: duplicate.id,
        username: duplicate.username,
        fullName: cleanName || duplicate.fullName,
      };
      await updateDocument('adminUsers', duplicate.id, merged);
      return;
    }

    const sanitizedUser: AdminUser = {
      ...user,
      username: cleanUsername,
      fullName: cleanName,
    };

    await setDocument('adminUsers', sanitizedUser.id, sanitizedUser);
    await recordActivityLog({
      ...getActorMeta(),
      category: 'المشرفين والإعدادات',
      action: 'إنشاء حساب مشرف إداري جديد',
      target: `${sanitizedUser.fullName} (${sanitizedUser.username})`,
      details: `الدور الوظيفي: ${sanitizedUser.role}`,
    });
  };

  const handleUpdateAdminUser = async (updated: AdminUser) => {
    const cleanUsername = normalizeAdminKey(updated.username);
    const cleanName = (updated.fullName || '').trim().replace(/\s+/g, ' ');

    // Prevent updating a user to collide with another existing user's username or name
    const conflict = adminUsers.find(
      (u) =>
        u.id !== updated.id &&
        (normalizeAdminKey(u.username) === cleanUsername ||
          u.fullName.trim().replace(/\s+/g, ' ').toLowerCase() === cleanName.toLowerCase())
    );
    if (conflict) return;

    const sanitizedUpdate: AdminUser = {
      ...updated,
      username: cleanUsername,
      fullName: cleanName,
    };

    await updateDocument('adminUsers', sanitizedUpdate.id, sanitizedUpdate);
    await recordActivityLog({
      ...getActorMeta(),
      category: 'المشرفين والإعدادات',
      action: 'تعديل بيانات أو صلاحيات مشرف',
      target: `${sanitizedUpdate.fullName} (${sanitizedUpdate.username})`,
      details: `الدور الوظيفي: ${sanitizedUpdate.role}`,
    });
  };

  const handleDeleteAdminUser = async (id: string) => {
    const targetUser = adminUsers.find(u => u.id === id);
    await removeDocument('adminUsers', id);
    await recordActivityLog({
      ...getActorMeta(),
      category: 'المشرفين والإعدادات',
      action: 'حذف حساب مشرف من النظام',
      target: targetUser ? `${targetUser.fullName} (${targetUser.username})` : id,
    });
  };

  const handleUpdateSettings = async (settings: CampaignSettings) => {
    await setDocument('settings', 'campaign', settings);
    await recordActivityLog({
      ...getActorMeta(),
      category: 'المشرفين والإعدادات',
      action: 'تحديث إعدادات القافلة ونصوص الواجهة الرئيسية',
      target: `هاتف التواصل: ${settings.phone} | العنوان: ${settings.address}`,
    });
  };

  const handleAdminLogout = async () => {
    if (currentAdminUser) {
      await recordActivityLog({
        ...getActorMeta(),
        category: 'تسجيل دخول / خروج',
        action: 'تسجيل خروج من الحساب (القائمة الرئيسية)',
        target: `${currentAdminUser.fullName} (${currentAdminUser.username})`,
      });
    }
    try {
      await auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    // Clear sensitive admin session states immediately
    setFeedback([]);
    setAdminLoggedIn(false);
    setCurrentAdminUser(null);
    setAdminSubTab('dashboard');
    setCurrentView('home');
    // Replace history state so pressing Back cannot re-enter protected admin pages
    window.history.replaceState({ appView: 'home', loggedOut: true }, '', window.location.pathname);
  };

  const pilgrimStatsBreakdown = calculatePilgrimStatsBreakdown(pilgrims, campaignSettings);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        adminLoggedIn={adminLoggedIn}
        currentAdminUser={currentAdminUser}
        campaignSettings={campaignSettings}
        packages={packages}
        guideSubTab={guideSubTab}
        onSelectGuideSubTab={(tab) => setGuideSubTab(tab)}
        adminSubTab={adminSubTab}
        onSelectAdminSubTab={(tab) => setAdminSubTab(tab)}
        highlightedPackageId={highlightedPackageId}
        onSelectPackageHighlight={(pkgId) => setHighlightedPackageId(pkgId)}
        onLogout={handleAdminLogout}
      />

      <main className="flex-1">
        {currentView === 'home' && (
          <Home
            setCurrentView={setCurrentView}
            pilgrimCount={pilgrimStatsBreakdown.totalPilgrims}
            announcements={announcements}
            packages={packages}
            campaignSettings={campaignSettings}
            onSelectPackageForRegistration={(pkgTitle) => setSelectedPackageForReg(pkgTitle)}
          />
        )}
        {currentView === 'register' && (
          <RegistrationForm
            onAddPilgrim={handleAddPilgrim}
            onSuccessNavigate={() => setCurrentView('portal')}
            selectedPackage={selectedPackageForReg}
            onSelectPackage={(pkgTitle) => setSelectedPackageForReg(pkgTitle)}
            onNavigateToPackages={() => setCurrentView('packages')}
            packages={packages}
            campaignSettings={campaignSettings}
            pilgrims={pilgrims}
          />
        )}
        {currentView === 'portal' && <PilgrimPortal pilgrims={pilgrims} campaignSettings={campaignSettings} />}
        {currentView === 'packages' && (
          <PackagesView
            setCurrentView={setCurrentView}
            packages={packages}
            onSelectPackageForRegistration={(pkgTitle) => setSelectedPackageForReg(pkgTitle)}
            externalHighlightedPkgId={highlightedPackageId}
          />
        )}
        {currentView === 'guide' && <GuideView campaignSettings={campaignSettings} initialTab={guideSubTab} />}
        {currentView === 'ai-advisor' && (
          <AiAdvisor
            announcements={announcements}
            packages={packages}
            campaignSettings={campaignSettings}
          />
        )}
        {currentView === 'contact' && <ContactView campaignSettings={campaignSettings} />}
        {currentView === 'admin' && (
          <AdminDashboard
            pilgrims={pilgrims}
            packages={packages}
            announcements={announcements}
            notifications={notifications}
            adminUsers={adminUsers}
            feedback={feedback}
            currentAdminUser={currentAdminUser}
            campaignSettings={campaignSettings}
            onUpdatePilgrim={handleUpdatePilgrim}
            onDeletePilgrim={handleDeletePilgrim}
            onAddPackage={handleAddPackage}
            onUpdatePackage={handleUpdatePackage}
            onDeletePackage={handleDeletePackage}
            onAddAnnouncement={handleAddAnnouncement}
            onUpdateAnnouncement={handleUpdateAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            onAddAdminUser={handleAddAdminUser}
            onUpdateAdminUser={handleUpdateAdminUser}
            onDeleteAdminUser={handleDeleteAdminUser}
            onUpdateCampaignSettings={handleUpdateSettings}
            adminLoggedIn={adminLoggedIn}
            setAdminLoggedIn={setAdminLoggedIn}
            setCurrentAdminUser={setCurrentAdminUser}
            externalActiveTab={adminSubTab}
            onActiveTabChange={(tab) => setAdminSubTab(tab)}
            onRefreshData={refreshAllData}
          />
        )}

        <PWAInstallButton variant="floating" />
      </main>

      {/* Public Footer - Hidden inside the Admin Dashboard to keep admin workspace clean */}
      {currentView !== 'admin' && (
        <Footer setCurrentView={setCurrentView} campaignSettings={campaignSettings} />
      )}
    </div>
  );
}
