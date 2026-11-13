import React, { useState } from 'react';
import {
  ShieldCheck,
  Briefcase,
  Wallet,
  BookOpen,
  Compass,
  UserPlus,
  UserCheck,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Settings,
  Check,
  RefreshCw,
  Layers,
  Calendar,
  Bus,
  Info,
  FileSpreadsheet,
} from 'lucide-react';
import { exportAlQaemExcelReport } from '../utils/alqaemExcelEngine';
import {
  AdminUser,
  CampaignSettings,
  DetailedPermissionsMap,
  OfficialAdminRole,
  PermissionModuleId,
  PermissionOperation,
} from '../types';
import {
  DEFAULT_ROLE_PERMISSIONS,
  getEffectiveDetailedPermissions,
  getRoleDefinition,
  isGeneralAdminUser,
  isLastActiveGeneralAdmin,
  isLegacyRoleName,
  migrateAdminUserRecord,
  normalizeOfficialRole,
  OFFICIAL_ROLES,
  PERMISSION_MODULES,
  PERMISSION_OPERATIONS,
  summarizePermissionsForAudit,
  syncLegacyPermissionsFromDetailed,
} from '../utils/rbac';
import { recordActivityLog } from '../lib/db';

interface StaffManagementViewProps {
  adminUsers: AdminUser[];
  currentAdminUser: AdminUser | null;
  campaignSettings: CampaignSettings;
  onAddAdminUser: (user: AdminUser) => Promise<void> | void;
  onUpdateAdminUser: (user: AdminUser) => Promise<void> | void;
  onDeleteAdminUser: (id: string) => Promise<void> | void;
  onUpdateCampaignSettings: (settings: CampaignSettings) => Promise<void> | void;
}

const STAFF_DOMAIN_OPTIONS = [
  { value: '@alqaemhajj.com', label: '@alqaemhajj.com (النطاق الرسمي للقافلة)' },
  { value: '@alqaem.org', label: '@alqaem.org (نطاق الإدارة)' },
  { value: '@gmail.com', label: '@gmail.com (حساب Google للربط المباشر)' },
];

const SEASON_OPTIONS = [
  'موسم 1448هـ',
  'موسم 1449هـ',
  'عمرة رجب وشعبان 1448هـ',
  'جميع المواسم',
];

const CARAVAN_OPTIONS = [
  'جميع القوافل والأفواج',
  'قافلة الطيران (VIP والمميزة)',
  'قافلة الحافلات والبر',
  'الفوج الأول - مكة والمدينة',
  'الفوج الثاني - مكة والمدينة',
  'لجنة الاستقبال والتفويج الميداني',
];

const hashPIN = async (pin: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const splitUsernameAndDomain = (rawUsername?: string): { localPart: string; domain: string } => {
  const clean = (rawUsername || '').trim().toLowerCase();
  if (!clean.includes('@')) {
    return { localPart: clean, domain: '@alqaemhajj.com' };
  }
  const [localPart, domPart] = clean.split('@');
  const fullDom = `@${domPart || 'alqaemhajj.com'}`;
  return { localPart: localPart || '', domain: fullDom };
};

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  adminUsers,
  currentAdminUser,
  campaignSettings,
  onAddAdminUser,
  onUpdateAdminUser,
  onDeleteAdminUser,
  onUpdateCampaignSettings,
}) => {
  const roleTemplates = campaignSettings.rolePermissionTemplates || {};

  // Modal state for Adding / Editing a supervisor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AdminUser | null>(null);
  const [formError, setFormError] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [usernameLocal, setUsernameLocal] = useState('');
  const [staffDomain, setStaffDomain] = useState('@alqaemhajj.com');
  const [pin, setPin] = useState('');
  const [selectedRole, setSelectedRole] = useState<OfficialAdminRole>('الإشراف المكتبي');
  const [accountStatus, setAccountStatus] = useState<'active' | 'suspended'>('active');
  const [assignedSeason, setAssignedSeason] = useState('موسم 1448هـ');
  const [assignedCaravan, setAssignedCaravan] = useState('جميع القوافل والأفواج');
  const [customOverride, setCustomOverride] = useState(false);
  const [detailedPerms, setDetailedPerms] = useState<DetailedPermissionsMap>(
    DEFAULT_ROLE_PERMISSIONS['الإشراف المكتبي']
  );

  // Role Template Editor Modal state
  const [editingTemplateRole, setEditingTemplateRole] = useState<OfficialAdminRole | null>(null);
  const [templatePermsDraft, setTemplatePermsDraft] = useState<DetailedPermissionsMap>(
    DEFAULT_ROLE_PERMISSIONS['الإشراف المكتبي']
  );
  const [applyTemplateToAllRoleUsers, setApplyTemplateToAllRoleUsers] = useState(true);

  // Delete confirmation modal
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AdminUser | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const renderRoleIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'Briefcase':
        return <Briefcase className={className} />;
      case 'Wallet':
        return <Wallet className={className} />;
      case 'BookOpen':
        return <BookOpen className={className} />;
      case 'Compass':
        return <Compass className={className} />;
      default:
        return <UserCheck className={className} />;
    }
  };

  const getTemplateForRole = (role: OfficialAdminRole): DetailedPermissionsMap => {
    const template = roleTemplates[role] || DEFAULT_ROLE_PERMISSIONS[role];
    return JSON.parse(JSON.stringify(template));
  };

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setFullName('');
    setUsernameLocal('');
    setStaffDomain('@alqaemhajj.com');
    setPin('');
    setSelectedRole('الإشراف المكتبي');
    setAccountStatus('active');
    setAssignedSeason(
      campaignSettings.pilgrimStatsConfig?.activeSeasonYear
        ? `موسم ${campaignSettings.pilgrimStatsConfig.activeSeasonYear}هـ`
        : 'موسم 1448هـ'
    );
    setAssignedCaravan('جميع القوافل والأفواج');
    setCustomOverride(false);
    setDetailedPerms(getTemplateForRole('الإشراف المكتبي'));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (usr: AdminUser) => {
    const { localPart, domain } = splitUsernameAndDomain(usr.username);
    const officialRole = normalizeOfficialRole(usr.role, usr.username);
    const effectiveDetailed = getEffectiveDetailedPermissions(usr, roleTemplates);

    setEditingStaff(usr);
    setFullName(usr.fullName);
    setUsernameLocal(localPart);
    setStaffDomain(
      STAFF_DOMAIN_OPTIONS.some((o) => o.value === domain) ? domain : '@alqaemhajj.com'
    );
    setPin('');
    setSelectedRole(officialRole);
    setAccountStatus(usr.status === 'suspended' ? 'suspended' : 'active');
    setAssignedSeason(usr.assignedSeason || 'موسم 1448هـ');
    setAssignedCaravan(usr.assignedCaravan || 'جميع القوافل والأفواج');
    setCustomOverride(Boolean(usr.customPermissionsOverride));
    setDetailedPerms(JSON.parse(JSON.stringify(effectiveDetailed)));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleRoleChangeInForm = (nextRole: OfficialAdminRole) => {
    if (
      editingStaff &&
      nextRole !== 'الإدارة العامة' &&
      isLastActiveGeneralAdmin(editingStaff.id, adminUsers)
    ) {
      setFormError(
        'لا يمكن تغيير دور هذا المشرف لأنه الحساب النشط الوحيد الذي يمتلك صلاحيات "الإدارة العامة" في النظام.'
      );
      return;
    }
    setFormError('');
    setSelectedRole(nextRole);
    setDetailedPerms(getTemplateForRole(nextRole));
  };

  const toggleOperationPermission = (
    modId: PermissionModuleId,
    opId: PermissionOperation,
    isTemplateEditor = false
  ) => {
    if (isTemplateEditor) {
      setTemplatePermsDraft((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as DetailedPermissionsMap;
        const newVal = !next[modId][opId];
        next[modId][opId] = newVal;
        if (newVal && opId !== 'view') {
          next[modId].view = true;
        }
        if (!newVal && opId === 'view') {
          PERMISSION_OPERATIONS.forEach((op) => {
            next[modId][op.id] = false;
          });
        }
        return next;
      });
    } else {
      setCustomOverride(true);
      setDetailedPerms((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as DetailedPermissionsMap;
        const newVal = !next[modId][opId];
        next[modId][opId] = newVal;
        // Enabling any action automatically enables 'view'
        if (newVal && opId !== 'view') {
          next[modId].view = true;
        }
        // Disabling 'view' disables other operations in that module
        if (!newVal && opId === 'view') {
          PERMISSION_OPERATIONS.forEach((op) => {
            next[modId][op.id] = false;
          });
        }
        return next;
      });
    }
  };

  const toggleEntireModule = (
    modId: PermissionModuleId,
    enable: boolean,
    isTemplateEditor = false
  ) => {
    if (isTemplateEditor) {
      setTemplatePermsDraft((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as DetailedPermissionsMap;
        PERMISSION_OPERATIONS.forEach((op) => {
          next[modId][op.id] = enable;
        });
        return next;
      });
    } else {
      setCustomOverride(true);
      setDetailedPerms((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as DetailedPermissionsMap;
        PERMISSION_OPERATIONS.forEach((op) => {
          next[modId][op.id] = enable;
        });
        return next;
      });
    }
  };

  // Toggle Account Active / Suspended immediately from the table
  const handleQuickToggleStatus = async (usr: AdminUser) => {
    const nextStatus = usr.status === 'suspended' ? 'active' : 'suspended';
    if (nextStatus === 'suspended' && isLastActiveGeneralAdmin(usr.id, adminUsers)) {
      showToast(
        'error',
        'منع أمني: لا يمكن إيقاف الحساب الوحيد النشط الذي يمتلك صلاحية الإدارة العامة.'
      );
      return;
    }

    const updated: AdminUser = {
      ...usr,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateAdminUser(updated);
    await recordActivityLog({
      adminId: currentAdminUser?.id || 'usr-1',
      adminName: currentAdminUser?.fullName || 'الإدارة العامة',
      username: currentAdminUser?.username || 'admin',
      userRole: currentAdminUser?.role || 'الإدارة العامة',
      category: 'المشرفين والإعدادات',
      action:
        nextStatus === 'suspended'
          ? 'إيقاف حساب مشرف وإلغاء جلساته النشطة'
          : 'إعادة تفعيل حساب مشرف',
      target: `${usr.fullName} (${usr.username})`,
      previousValue: usr.status === 'suspended' ? 'موقوف' : 'نشط',
      newValue: nextStatus === 'suspended' ? 'موقوف' : 'نشط',
      details: `الدور الوظيفي: ${normalizeOfficialRole(usr.role, usr.username)} | الحالة الجديدة: ${
        nextStatus === 'suspended' ? 'موقوف' : 'نشط'
      }`,
    });

    showToast(
      'success',
      nextStatus === 'suspended'
        ? `تم إيقاف حساب المشرف "${usr.fullName}" ومنعه من الدخول فوراً.`
        : `تم تفعيل حساب المشرف "${usr.fullName}" بنجاح.`
    );
  };

  // Migrate any legacy roles in the database after admin review
  const legacyUsers = adminUsers.filter((u) => isLegacyRoleName(u.role));
  const handleMigrateLegacyRoles = async () => {
    setIsSaving(true);
    try {
      for (const usr of legacyUsers) {
        const prevRole = usr.role;
        const migrated = migrateAdminUserRecord(usr, roleTemplates);
        await onUpdateAdminUser(migrated);
        await recordActivityLog({
          adminId: currentAdminUser?.id || 'usr-1',
          adminName: currentAdminUser?.fullName || 'الإدارة العامة',
          username: currentAdminUser?.username || 'admin',
          userRole: currentAdminUser?.role || 'الإدارة العامة',
          category: 'المشرفين والإعدادات',
          action: 'ترحيل واعتماد الدور الوظيفي إلى هيكل الأدوار الخمسة الجديد',
          target: `${usr.fullName} (${usr.username})`,
          previousValue: prevRole,
          newValue: migrated.role,
          details: `تم الترحيل الآمن من (${prevRole}) إلى (${migrated.role}) مع ضبط الصلاحيات التفصيلية.`,
        });
      }
      showToast('success', 'تم ترحيل واعتماد جميع الأدوار إلى الهيكل الخماسي الجديد بنجاح.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Role Permission Template & Propagate to Supervisors of that Role
  const handleSaveRoleTemplate = async () => {
    if (!editingTemplateRole) return;
    setIsSaving(true);
    try {
      const prevTemplate = getTemplateForRole(editingTemplateRole);
      const nextTemplates = {
        ...(campaignSettings.rolePermissionTemplates || {}),
        [editingTemplateRole]: templatePermsDraft,
      };

      await onUpdateCampaignSettings({
        ...campaignSettings,
        rolePermissionTemplates: nextTemplates,
      });

      // Propagate to users of this role so changing a role's permissions immediately reflects on concerned users
      const matchingUsers = adminUsers.filter(
        (u) => normalizeOfficialRole(u.role, u.username) === editingTemplateRole
      );
      let updatedCount = 0;
      for (const u of matchingUsers) {
        if (applyTemplateToAllRoleUsers || !u.customPermissionsOverride) {
          const syncedLegacy = syncLegacyPermissionsFromDetailed(
            templatePermsDraft,
            editingTemplateRole
          );
          await onUpdateAdminUser({
            ...u,
            role: editingTemplateRole,
            detailedPermissions: templatePermsDraft,
            permissions: syncedLegacy,
            customPermissionsOverride: false,
            updatedAt: new Date().toISOString(),
          });
          updatedCount++;
        }
      }

      await recordActivityLog({
        adminId: currentAdminUser?.id || 'usr-1',
        adminName: currentAdminUser?.fullName || 'الإدارة العامة',
        username: currentAdminUser?.username || 'admin',
        userRole: currentAdminUser?.role || 'الإدارة العامة',
        category: 'المشرفين والإعدادات',
        action: `تحديث قالب الصلاحيات الافتراضية لدور (${editingTemplateRole})`,
        target: `دور: ${editingTemplateRole} (تأثر ${updatedCount} مشرفين)`,
        previousValue: summarizePermissionsForAudit(prevTemplate),
        newValue: summarizePermissionsForAudit(templatePermsDraft),
        details: `تم تحديث مصفوفة الصلاحيات لدور ${editingTemplateRole} وتطبيقها على ${updatedCount} حساب.`,
      });

      setEditingTemplateRole(null);
      showToast(
        'success',
        `تم حفظ صلاحيات دور "${editingTemplateRole}" وتحديث ${updatedCount} مشرفين مرتبطين به بنجاح.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Save Add / Edit Supervisor
  const handleSaveSupervisor = async () => {
    const cleanLocalUser = usernameLocal.trim().toLowerCase().split('@')[0].replace(/\s+/g, '');
    const cleanUsername =
      cleanLocalUser === 'admin' ? 'admin' : `${cleanLocalUser}${staffDomain}`;
    const cleanFullName = fullName.trim().replace(/\s+/g, ' ');

    if (!cleanFullName) {
      setFormError('يرجى إدخال اسم المشرف الكامل.');
      return;
    }
    if (!cleanLocalUser) {
      setFormError('يرجى إدخال اسم المستخدم (اليوزر).');
      return;
    }
    if (!editingStaff && !pin.trim()) {
      setFormError('يرجى إدخال الرقم السري (PIN) للمشرف الجديد.');
      return;
    }

    // Security Guard: Prevent suspending or demoting the last active General Admin
    if (
      editingStaff &&
      isLastActiveGeneralAdmin(editingStaff.id, adminUsers) &&
      (accountStatus === 'suspended' || selectedRole !== 'الإدارة العامة')
    ) {
      setFormError(
        'منع أمني: لا يمكن إيقاف أو خفض صلاحيات المشرف الوحيد الذي يمتلك دور الإدارة العامة.'
      );
      return;
    }

    // Duplicate username check
    const isMasterAlias = (val: string) =>
      val === 'admin' ||
      val === 'alahsaey@gmail.com' ||
      val === 'admin@alqaemhajj.com' ||
      val === 'alahsaey';

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
      setFormError(
        `عفواً، اسم المستخدم (${cleanLocalUser}) مسجل مسبقاً للمشرف "${usernameConflict.fullName}".`
      );
      return;
    }

    // Duplicate full name check
    const nameConflict = adminUsers.find((u) => {
      if (editingStaff && u.id === editingStaff.id) return false;
      const existingName = (u.fullName || '').trim().replace(/\s+/g, ' ').toLowerCase();
      return existingName === cleanFullName.toLowerCase();
    });

    if (nameConflict) {
      setFormError(`عفواً، الاسم "${cleanFullName}" مسجل مسبقاً لمشرف آخر.`);
      return;
    }

    setIsSaving(true);
    try {
      let finalPin = '';
      if (editingStaff) {
        finalPin = pin.trim() ? await hashPIN(pin.trim()) : editingStaff.pin;
      } else {
        finalPin = await hashPIN(pin.trim());
      }

      const finalDetailed =
        selectedRole === 'الإدارة العامة'
          ? DEFAULT_ROLE_PERMISSIONS['الإدارة العامة']
          : detailedPerms;
      const syncedBooleanPerms = syncLegacyPermissionsFromDetailed(finalDetailed, selectedRole);

      if (editingStaff) {
        const prevSummary = `الدور: ${editingStaff.role} | الحالة: ${
          editingStaff.status === 'suspended' ? 'موقوف' : 'نشط'
        } | ${summarizePermissionsForAudit(
          getEffectiveDetailedPermissions(editingStaff, roleTemplates)
        )}`;
        const newSummary = `الدور: ${selectedRole} | الحالة: ${
          accountStatus === 'suspended' ? 'موقوف' : 'نشط'
        } | ${summarizePermissionsForAudit(finalDetailed)}`;

        const updatedUser: AdminUser = {
          ...editingStaff,
          username: cleanUsername,
          pin: finalPin,
          fullName: cleanFullName,
          role: selectedRole,
          status: accountStatus,
          assignedSeason,
          assignedCaravan,
          customPermissionsOverride: customOverride,
          detailedPermissions: finalDetailed,
          permissions: syncedBooleanPerms,
          updatedAt: new Date().toISOString(),
        };

        await onUpdateAdminUser(updatedUser);
        await recordActivityLog({
          adminId: currentAdminUser?.id || 'usr-1',
          adminName: currentAdminUser?.fullName || 'الإدارة العامة',
          username: currentAdminUser?.username || 'admin',
          userRole: currentAdminUser?.role || 'الإدارة العامة',
          category: 'المشرفين والإعدادات',
          action: 'تعديل بيانات وصلاحيات مشرف',
          target: `${cleanFullName} (${cleanUsername})`,
          previousValue: prevSummary,
          newValue: newSummary,
          details: `الدور: ${selectedRole} | القافلة/الموسم: ${assignedSeason} - ${assignedCaravan}`,
        });
        showToast('success', `تم حفظ تعديلات المشرف "${cleanFullName}" بنجاح.`);
      } else {
        const safeSlug = cleanUsername.replace(/[^a-z0-9]/g, '_');
        const deterministicId = `usr-${safeSlug || Date.now()}`;
        const newUser: AdminUser = {
          id: deterministicId,
          username: cleanUsername,
          pin: finalPin,
          fullName: cleanFullName,
          role: selectedRole,
          status: accountStatus,
          assignedSeason,
          assignedCaravan,
          customPermissionsOverride: customOverride,
          detailedPermissions: finalDetailed,
          permissions: syncedBooleanPerms,
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
        };

        await onAddAdminUser(newUser);
        await recordActivityLog({
          adminId: currentAdminUser?.id || 'usr-1',
          adminName: currentAdminUser?.fullName || 'الإدارة العامة',
          username: currentAdminUser?.username || 'admin',
          userRole: currentAdminUser?.role || 'الإدارة العامة',
          category: 'المشرفين والإعدادات',
          action: 'إنشاء حساب مشرف جديد وتخصيص صلاحياته',
          target: `${cleanFullName} (${cleanUsername})`,
          previousValue: 'غير موجود',
          newValue: `الدور: ${selectedRole} | الحالة: ${
            accountStatus === 'suspended' ? 'موقوف' : 'نشط'
          } | ${summarizePermissionsForAudit(finalDetailed)}`,
          details: `الدور: ${selectedRole} | القافلة/الموسم: ${assignedSeason} - ${assignedCaravan}`,
        });
        showToast('success', `تم إنشاء حساب المشرف "${cleanFullName}" بدور "${selectedRole}" بنجاح.`);
      }

      setIsModalOpen(false);
      setEditingStaff(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Status Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-lg animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0E1726] via-[#10192D] to-[#0B1221] border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950">
                منظومة الأدوار الخمسة والصلاحيات التفصيلية
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                حماية RBAC نشطة
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              إدارة المشرفين والأدوار الوظيفية ومصفوفة الصلاحيات
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-2xl">
              تحكم مرن وشامل في الأدوار الخمسة المعتمدة (الإدارة العامة، الإشراف المكتبي، الإشراف المالي، الإشراف الثقافي، الإشراف الديني) مع تخصيص العمليات الـ 8 لكل قسم.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => {
              const columns = [
                'م',
                'الاسم الكامل للمشرف',
                'اسم المستخدم / المعرف',
                'الدور الوظيفي المعتمد',
                'حالة الحساب',
                'الموسم المكلف به',
                'القافلة / المجموعة',
                'نوع الصلاحيات',
                'تاريخ الإنشاء',
              ];
              const rows = adminUsers.map((u, idx) => [
                idx + 1,
                u.fullName || u.username,
                u.username,
                normalizeOfficialRole(u.role),
                u.status === 'suspended' ? 'موقوف' : 'نشط',
                u.assignedSeason || 'موسم 1448هـ',
                u.assignedCaravan || 'جميع القوافل',
                u.customPermissionsOverride ? 'مخصصة استثنائياً' : 'قالب الدور القياسي',
                u.createdAt || '—',
              ]);
              const activeCount = adminUsers.filter((u) => u.status !== 'suspended').length;
              void exportAlQaemExcelReport({
                reportTitle: 'كشف المشرفين والأدوار الوظيفية والصلاحيات المعتمدة',
                subtitle: 'منظومة إدارة المشرفين والأدوار الخمسة — قافلة القائم للحج والعمرة والزيارة',
                category: 'تقارير المشرفين والإشراف والرقابة',
                filename: `كشف_المشرفين_والأدوار_قافلة_القائم_${new Date().toISOString().split('T')[0]}`,
                columns,
                rows,
                generatedBy: currentAdminUser?.fullName || 'الإدارة العامة',
                summaryCards: [
                  { label: 'إجمالي المشرفين', value: adminUsers.length },
                  { label: 'الحسابات النشطة', value: activeCount },
                  { label: 'الحسابات الموقوفة', value: adminUsers.length - activeCount },
                ],
              });
              showToast('success', 'تم تصدير كشف المشرفين والأدوار بصيغة Excel (.xlsx) بالهوية الرسمية.');
            }}
            className="w-full sm:w-auto bg-[#12192C] hover:bg-slate-800 text-[#F4C84A] border border-[#C5A45D] font-black px-4 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-md text-xs sm:text-sm cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#20B995]" />
            <span>تصدير كشف المشرفين Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-5 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 text-xs sm:text-sm cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مشرف جديد</span>
          </button>
        </div>
      </div>

      {/* Safe Legacy Roles Migration Banner (if any legacy role names exist) */}
      {legacyUsers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-black text-amber-300">
                مراجعة وترحيل الأدوار السابقة إلى الهيكل الخماسي الجديد ({legacyUsers.length} حساب)
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                تم رصد مشرفين بمسميات الأدوار القديمة (مثل &quot;مشرف إداري&quot;). يقوم النظام تلقائياً بمعاملتهم وفق الدور المكافئ الآمن (&quot;الإشراف المكتبي&quot;) دون منح أي صلاحيات إدارة عامة تلقائياً. يمكنك اعتماد حفظ المسميات الجديدة في قاعدة البيانات بضغطة زر.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleMigrateLegacyRoles}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>اعتماد ترحيل المسميات</span>
          </button>
        </div>
      )}

      {/* The 5 Official Roles Cards & Role Permission Template Customizer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>الأدوار الوظيفية الخمسة المعتمدة وقوالب صلاحياتها</span>
          </h4>
          <span className="text-xs text-slate-400 hidden sm:inline">
            تغيير صلاحيات أي دور ينعكس مباشرة على المشرفين المرتبطين به
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3.5">
          {OFFICIAL_ROLES.map((role) => {
            const count = adminUsers.filter(
              (u) => normalizeOfficialRole(u.role, u.username) === role.id
            ).length;
            const activeCount = adminUsers.filter(
              (u) =>
                normalizeOfficialRole(u.role, u.username) === role.id && u.status !== 'suspended'
            ).length;

            return (
              <div
                key={role.id}
                className={`bg-[#0B1221] border ${role.borderColor} rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md hover:shadow-lg transition relative overflow-hidden`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border ${role.badgeColor}`}
                    >
                      {renderRoleIcon(role.iconName, 'w-5 h-5')}
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#10192D] border border-slate-800 text-xs font-mono font-bold text-white">
                      {activeCount} / {count} مشرف
                    </span>
                  </div>

                  <div>
                    <h5 className={`text-sm font-black ${role.textColor}`}>{role.title}</h5>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-3">
                      {role.shortDesc}
                    </p>
                  </div>

                  <ul className="space-y-1 pt-1 border-t border-slate-800/80">
                    {role.responsibilities.slice(0, 3).map((resp, idx) => (
                      <li key={idx} className="text-[10px] text-slate-400 flex items-start gap-1.5">
                        <span className={`mt-1 w-1 h-1 rounded-full shrink-0 bg-current ${role.textColor}`} />
                        <span className="line-clamp-1">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {role.id !== 'الإدارة العامة' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateRole(role.id);
                      setTemplatePermsDraft(getTemplateForRole(role.id));
                      setApplyTemplateToAllRoleUsers(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#10192D] hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-xs font-bold text-slate-200 hover:text-amber-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-amber-400" />
                    <span>تخصيص صلاحيات الدور</span>
                  </button>
                ) : (
                  <div className="w-full py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300 text-center">
                    صلاحيات الإدارة الشاملة (كاملة)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Supervisors Table */}
      <div className="bg-[#0B1221] border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#0F172A]">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm sm:text-base font-black text-white">
              سجل حسابات المشرفين وصلاحياتهم ({adminUsers.length})
            </h4>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              نشط: {adminUsers.filter((u) => u.status !== 'suspended').length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              موقوف: {adminUsers.filter((u) => u.status === 'suspended').length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-slate-300">
            <thead className="bg-[#070C18] text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">اسم المشرف والنطاق</th>
                <th className="px-4 py-3.5">اسم المستخدم</th>
                <th className="px-4 py-3.5">الدور الوظيفي</th>
                <th className="px-4 py-3.5">حالة الحساب</th>
                <th className="px-4 py-3.5">الصلاحيات التفصيلية المفعلة</th>
                <th className="px-4 py-3.5">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {adminUsers.map((usr) => {
                const officialRole = normalizeOfficialRole(usr.role, usr.username);
                const rDef = getRoleDefinition(officialRole, usr.username);
                const usrDetailed = getEffectiveDetailedPermissions(usr, roleTemplates);
                const isSuspended = usr.status === 'suspended';
                const isLastAdmin = isLastActiveGeneralAdmin(usr.id, adminUsers);

                return (
                  <tr
                    key={usr.id}
                    className={`transition ${
                      isSuspended
                        ? 'bg-red-950/10 opacity-75 hover:bg-red-950/20'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="font-black text-white text-sm">{usr.fullName}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                          {usr.assignedSeason || 'موسم 1448هـ'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/70 text-slate-300 border border-slate-700/70">
                          {usr.assignedCaravan || 'جميع القوافل'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-mono text-xs text-slate-300" dir="ltr">
                      {usr.username}
                    </td>

                    <td className="px-4 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${rDef.badgeColor}">
                        <span className={rDef.textColor}>
                          {renderRoleIcon(rDef.iconName, 'w-3.5 h-3.5')}
                        </span>
                        <span className={rDef.textColor}>{officialRole}</span>
                      </div>
                      {usr.customPermissionsOverride && officialRole !== 'الإدارة العامة' && (
                        <div className="text-[10px] text-amber-400 mt-1 font-bold">
                          • صلاحيات مخصصة فردياً
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-bold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>موقوف</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>نشط</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 max-w-md">
                      {officialRole === 'الإدارة العامة' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>كامل الصلاحيات على جميع الأقسام والعمليات الـ 8</span>
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {PERMISSION_MODULES.map((mod) => {
                            const mPerm = usrDetailed[mod.id];
                            if (!mPerm?.view) return null;
                            const enabledOps = PERMISSION_OPERATIONS.filter(
                              (op) => mPerm[op.id]
                            ).map((op) => op.shortLabel);
                            return (
                              <span
                                key={mod.id}
                                className="px-2 py-0.5 rounded-md bg-[#10192D] border border-slate-700/80 text-[10px] text-slate-200"
                              >
                                <strong className="text-amber-300">
                                  {mod.title.split(' ')[0]} {mod.title.split(' ')[1]}:
                                </strong>{' '}
                                {enabledOps.join('، ')}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(usr)}
                          className="p-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-xl transition cursor-pointer"
                          title="تعديل بيانات المشرف وتخصيص الصلاحيات"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          disabled={isLastAdmin && !isSuspended}
                          onClick={() => handleQuickToggleStatus(usr)}
                          className={`p-2 rounded-xl transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            isSuspended
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                          }`}
                          title={
                            isLastAdmin && !isSuspended
                              ? 'لا يمكن إيقاف الحساب الوحيد للإدارة العامة'
                              : isSuspended
                              ? 'إعادة تفعيل الحساب'
                              : 'إيقاف الحساب فوراً وإلغاء جلسته'
                          }
                        >
                          {isSuspended ? (
                            <Unlock className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </button>

                        {!isLastAdmin && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUser(usr)}
                            className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition cursor-pointer"
                            title="حذف حساب المشرف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add / Edit Supervisor & Granular Permissions Matrix */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-amber-500/35 rounded-3xl w-full max-w-4xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0F172A] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {editingStaff ? 'تعديل حساب المشرف والصلاحيات التفصيلية' : 'إضافة مشرف جديد وتحديد دوره وصلاحياته'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    اختر الدور الوظيفي من الأدوار الخمسة، ثم خصص الصلاحيات التفصيلية حسب الحاجة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 text-sm">
              {formError && (
                <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section 1: Basic Identity, Account Status, and Assigned Caravan/Season */}
              <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <h4 className="text-xs sm:text-sm font-black text-amber-400 border-b border-slate-800 pb-2">
                  أولاً: البيانات الأساسية وحالة الحساب والنطاق التشغيلي
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      اسم المشرف الكامل *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (formError) setFormError('');
                      }}
                      className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-none"
                      placeholder="مثال: صالح الياسين"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      حالة الحساب *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAccountStatus('active')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          accountStatus === 'active'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-[#070C18] border-slate-800 text-slate-400'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>نشط</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountStatus('suspended')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          accountStatus === 'suspended'
                            ? 'bg-red-500/20 border-red-500 text-red-300'
                            : 'bg-[#070C18] border-slate-800 text-slate-400'
                        }`}
                      >
                        <Lock className="w-4 h-4" />
                        <span>موقوف</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      رمز المرور السري (PIN) {editingStaff ? '(اتركه فارغاً للإبقاء عليه)' : '*'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs sm:text-sm focus:border-amber-400 focus:outline-none"
                        placeholder="1234"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute left-3 top-2.5 text-slate-400 hover:text-amber-400 cursor-pointer"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      اسم المستخدم (اليوزر) *
                    </label>
                    <input
                      type="text"
                      value={usernameLocal}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw.includes('@')) {
                          const { localPart, domain } = splitUsernameAndDomain(raw);
                          setUsernameLocal(localPart);
                          if (STAFF_DOMAIN_OPTIONS.some((o) => o.value === domain)) {
                            setStaffDomain(domain);
                          }
                        } else {
                          setUsernameLocal(raw.replace(/\s+/g, ''));
                        }
                        if (formError) setFormError('');
                      }}
                      className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                      placeholder="supervisor"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      النطاق المعتمد *
                    </label>
                    <select
                      value={staffDomain}
                      onChange={(e) => setStaffDomain(e.target.value)}
                      className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold text-xs"
                      dir="ltr"
                    >
                      {STAFF_DOMAIN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      موسم الحج المخصص
                    </label>
                    <select
                      value={assignedSeason}
                      onChange={(e) => setAssignedSeason(e.target.value)}
                      className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold"
                    >
                      {SEASON_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      القافلة أو الفوج المخصص
                    </label>
                    <select
                      value={assignedCaravan}
                      onChange={(e) => setAssignedCaravan(e.target.value)}
                      className="w-full bg-[#070C18] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold"
                    >
                      {CARAVAN_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Elegant 5-Role Selector with Icons & Descriptions */}
              <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs sm:text-sm font-black text-amber-400">
                    ثانياً: اختيار الدور الوظيفي (الأدوار الخمسة المعتمدة) *
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    يتم تحميل الصلاحيات المعيارية للدور تلقائياً عند اختياره
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {OFFICIAL_ROLES.map((role) => {
                    const isSelected = selectedRole === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleChangeInForm(role.id)}
                        className={`p-3 rounded-2xl border text-right transition flex flex-col justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? `bg-gradient-to-b ${role.bgAccent} ${role.borderColor} ring-2 ring-amber-400/50 shadow-lg`
                            : 'bg-[#070C18] border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${role.badgeColor}`}
                            >
                              {renderRoleIcon(role.iconName, 'w-4 h-4')}
                            </div>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                                محدد
                              </span>
                            )}
                          </div>
                          <div className={`text-xs font-black ${role.textColor}`}>{role.title}</div>
                          <p className="text-[10px] text-slate-300 leading-relaxed">
                            {role.shortDesc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Role Responsibilities Box */}
                {(() => {
                  const activeRoleInfo = getRoleDefinition(selectedRole);
                  return (
                    <div className="bg-[#070C18] border border-slate-800 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black ${activeRoleInfo.textColor}`}>
                          مسؤوليات وصلاحيات دور: {activeRoleInfo.title}
                        </span>
                        {selectedRole !== 'الإدارة العامة' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomOverride(false);
                              setDetailedPerms(getTemplateForRole(selectedRole));
                            }}
                            className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                          >
                            إعادة ضبط لصلاحيات الدور الافتراضية
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {activeRoleInfo.responsibilities.map((item, i) => (
                          <div key={i} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-amber-300/90 pt-1 border-t border-slate-800/80">
                        <strong>ضابط الصلاحيات:</strong> {activeRoleInfo.restrictions}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Section 3: Granular 8-Operation × 8-Module Permissions Matrix */}
              <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-400">
                      ثالثاً: مصفوفة الصلاحيات التفصيلية (مشاهدة، إضافة، تعديل، حذف، اعتماد، طباعة، تصدير، إدارة)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      يمكن للإدارة العامة تفعيل أو إلغاء أي عملية بشكل مستقل لهذا المشرف
                    </p>
                  </div>
                  {selectedRole === 'الإدارة العامة' && (
                    <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                      الإدارة العامة تمتلك جميع الصلاحيات تلقائياً
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {PERMISSION_MODULES.map((mod) => {
                    const modPerms = detailedPerms[mod.id];
                    const allChecked = PERMISSION_OPERATIONS.every((op) => modPerms?.[op.id]);
                    const isLockedMaster = selectedRole === 'الإدارة العامة';

                    return (
                      <div
                        key={mod.id}
                        className="bg-[#070C18] border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-xs sm:text-sm font-black text-white">
                              {mod.title}
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-400">
                              {mod.subtitle}
                            </div>
                          </div>

                          {!isLockedMaster && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleEntireModule(mod.id, !allChecked, false)}
                                className="px-2.5 py-1 rounded-lg bg-[#10192D] hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-amber-400 cursor-pointer"
                              >
                                {allChecked ? 'إلغاء تحديد القسم' : 'تفعيل كامل القسم'}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
                          {PERMISSION_OPERATIONS.map((op) => {
                            const checked = isLockedMaster ? true : Boolean(modPerms?.[op.id]);
                            return (
                              <label
                                key={op.id}
                                className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition select-none ${
                                  isLockedMaster
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 opacity-80 cursor-not-allowed'
                                    : checked
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 cursor-pointer'
                                    : 'bg-[#10192D]/70 border-slate-800 text-slate-400 hover:border-slate-700 cursor-pointer'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={isLockedMaster}
                                  checked={checked}
                                  onChange={() => toggleOperationPermission(mod.id, op.id, false)}
                                  className="w-3.5 h-3.5 accent-amber-500 rounded"
                                />
                                <span className="truncate">{op.shortLabel}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-800 bg-[#0F172A] shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveSupervisor}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
              >
                {isSaving
                  ? 'جاري الحفظ والتوثيق...'
                  : editingStaff
                  ? 'حفظ تعديلات المشرف والصلاحيات'
                  : 'إنشاء حساب المشرف واعتماد الصلاحيات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Role Default Permissions Template Customizer */}
      {editingTemplateRole && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0F172A] shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  تخصيص الصلاحيات المعيارية لدور: <span className="text-amber-400">{editingTemplateRole}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  أي تعديل هنا يُحفظ كقالب رسمي للدور وينعكس فوراً على جميع المشرفين الحاملين لهذا الدور
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplateRole(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyTemplateToAllRoleUsers}
                  onChange={(e) => setApplyTemplateToAllRoleUsers(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <span>
                  تطبيق الصلاحيات المحدثة فوراً على جميع المشرفين المسجلين تحت دور &quot;{editingTemplateRole}&quot;
                </span>
              </label>

              {PERMISSION_MODULES.map((mod) => {
                const modPerms = templatePermsDraft[mod.id];
                const allChecked = PERMISSION_OPERATIONS.every((op) => modPerms?.[op.id]);
                return (
                  <div
                    key={mod.id}
                    className="bg-[#070C18] border border-slate-800 rounded-2xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs sm:text-sm font-black text-white">{mod.title}</div>
                        <div className="text-[11px] text-slate-400">{mod.subtitle}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleEntireModule(mod.id, !allChecked, true)}
                        className="px-2.5 py-1 rounded-lg bg-[#10192D] border border-slate-700 text-[10px] font-bold text-amber-400 cursor-pointer"
                      >
                        {allChecked ? 'إلغاء الكل' : 'تحديد الكل'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                      {PERMISSION_OPERATIONS.map((op) => {
                        const checked = Boolean(modPerms?.[op.id]);
                        return (
                          <label
                            key={op.id}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer ${
                              checked
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                : 'bg-[#10192D]/70 border-slate-800 text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOperationPermission(mod.id, op.id, true)}
                              className="w-3.5 h-3.5 accent-amber-500 rounded"
                            />
                            <span>{op.shortLabel}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-800 bg-[#0F172A] shrink-0">
              <button
                type="button"
                onClick={() =>
                  setTemplatePermsDraft(
                    JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS[editingTemplateRole]))
                  )
                }
                className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
              >
                استعادة الضبط الافتراضي الأصلي للدور
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTemplateRole(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveRoleTemplate}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ قالب الدور وتحديث المشرفين'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation */}
      {confirmDeleteUser && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-red-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-black text-white">تأكيد حذف حساب المشرف</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف حساب المشرف{' '}
              <strong className="text-amber-400">{confirmDeleteUser.fullName}</strong> (
              <span className="font-mono">{confirmDeleteUser.username}</span>)؟ سيتم تسجيل العملية في سجل التدقيق.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (isLastActiveGeneralAdmin(confirmDeleteUser.id, adminUsers)) {
                    showToast(
                      'error',
                      'منع أمني: لا يمكن حذف المشرف الوحيد الذي يملك صلاحية الإدارة العامة.'
                    );
                    setConfirmDeleteUser(null);
                    return;
                  }
                  await onDeleteAdminUser(confirmDeleteUser.id);
                  setConfirmDeleteUser(null);
                  showToast('success', 'تم حذف حساب المشرف بنجاح.');
                }}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs cursor-pointer"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
