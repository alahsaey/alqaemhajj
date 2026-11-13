import {
  AdminRole,
  AdminUser,
  DetailedPermissionsMap,
  ModulePermissions,
  OfficialAdminRole,
  PermissionModuleId,
  PermissionOperation,
} from '../types';

export interface RoleDefinitionInfo {
  id: OfficialAdminRole;
  title: OfficialAdminRole;
  shortDesc: string;
  badgeColor: string;
  borderColor: string;
  bgAccent: string;
  textColor: string;
  iconName: 'ShieldCheck' | 'Briefcase' | 'Wallet' | 'BookOpen' | 'Compass';
  responsibilities: string[];
  restrictions: string;
}

export const OFFICIAL_ROLES: RoleDefinitionInfo[] = [
  {
    id: 'الإدارة العامة',
    title: 'الإدارة العامة',
    shortDesc: 'أعلى مستوى إداري في النظام مع صلاحيات التحكم الشامل والاعتماد النهائي وإدارة المشرفين.',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    borderColor: 'border-amber-500/50',
    bgAccent: 'from-amber-500/20 via-amber-500/5 to-transparent',
    textColor: 'text-amber-400',
    iconName: 'ShieldCheck',
    responsibilities: [
      'الوصول الشامل إلى جميع أقسام النظام ولوحات التحكم',
      'إنشاء حسابات المشرفين وتعديلها وإيقافها وتحديد أدوارهم',
      'إدارة بيانات الحجاج والقوافل والباقات والأسعار',
      'الاطلاع على التقارير الإدارية والمالية واعتماد التعديلات الحساسة',
      'إدارة إعدادات النظام والاطلاع على سجل العمليات والتغييرات (Audit Log)',
    ],
    restrictions: 'صلاحيات كاملة؛ يمنع النظام حذف أو إيقاف آخر حساب يمتلك صلاحية الإدارة العامة.',
  },
  {
    id: 'الإشراف المكتبي',
    title: 'الإشراف المكتبي',
    shortDesc: 'مسؤول عن العمليات الإدارية والتشغيلية للحجاج، التسجيل، التسكين، الرحلات، وتذاكر الطيران.',
    badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/40',
    borderColor: 'border-sky-500/50',
    bgAccent: 'from-sky-500/20 via-sky-500/5 to-transparent',
    textColor: 'text-sky-400',
    iconName: 'Briefcase',
    responsibilities: [
      'عرض بيانات الحجاج وتحديثها وإدارة طلبات التسجيل ومتابعة حالتها',
      'إدارة بيانات القوافل والمجموعات وتحديث السكن والغرف والتسكين',
      'إدارة بيانات الرحلات ومواعيد السفر وإدخال أرقام تذاكر الطيران',
      'متابعة بيانات التنقل والمواصلات وتوزيع الهدايا',
      'رفع المستندات وإصدار وطباعة الكشوف والقوائم الإدارية ومتابعة اكتمال الملفات',
    ],
    restrictions: 'لا يحق لهذا الدور تعديل البيانات المالية أو إعدادات النظام أو إدارة حسابات المشرفين إلا بصلاحية إضافية صريحة.',
  },
  {
    id: 'الإشراف المالي',
    title: 'الإشراف المالي',
    shortDesc: 'مسؤول عن الإدارة المالية للقافلة، المدفوعات، الفواتير، التسويات، والتقارير المالية.',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    borderColor: 'border-emerald-500/50',
    bgAccent: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    textColor: 'text-emerald-400',
    iconName: 'Wallet',
    responsibilities: [
      'الاطلاع على البيانات المالية للحجاج وتسجيل المدفوعات وتحديثها',
      'إدارة الفواتير والإيصالات ومتابعة المبالغ المستحقة والمتأخرة',
      'إدارة عمليات الاسترداد والتسويات وفق الصلاحيات المعتمدة',
      'إعداد التقارير المالية واستخراج كشوف الحسابات',
      'متابعة الإيرادات والمصروفات ومراجعة العمليات المالية وتوثيقها',
    ],
    restrictions: 'لا يمتلك صلاحية تغيير بيانات الحجاج الشخصية أو إدارة الصلاحيات أو إعدادات النظام.',
  },
  {
    id: 'الإشراف الثقافي',
    title: 'الإشراف الثقافي',
    shortDesc: 'مسؤول عن البرامج الثقافية والتوعوية، جدول المحاضرات، المحتوى التثقيفي، والإعلانات.',
    badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40',
    borderColor: 'border-indigo-500/50',
    bgAccent: 'from-indigo-500/20 via-indigo-500/5 to-transparent',
    textColor: 'text-indigo-400',
    iconName: 'BookOpen',
    responsibilities: [
      'إدارة البرامج والأنشطة الثقافية وإعداد ونشر المحتوى التوعوي',
      'إدارة جدول المحاضرات والفعاليات ومتابعة حضور الحجاج للبرامج',
      'رفع المواد التثقيفية والملفات وإدارة الإعلانات الثقافية',
      'متابعة تنفيذ البرامج والأنشطة وإعداد تقارير الأنشطة والمشاركات',
    ],
    restrictions: 'يقتصر وصوله على البرامج الثقافية والإعلانات والتوعية دون تعديل السجلات المالية أو الإدارية.',
  },
  {
    id: 'الإشراف الديني',
    title: 'الإشراف الديني',
    shortDesc: 'مسؤول عن خدمات الإرشاد والتوعية الدينية، استقبال الاستفسارات الشرعية، وكشف المراجع.',
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/40',
    borderColor: 'border-purple-500/50',
    bgAccent: 'from-purple-500/20 via-purple-500/5 to-transparent',
    textColor: 'text-purple-400',
    iconName: 'Compass',
    responsibilities: [
      'إدارة قسم الإرشاد الديني والاطلاع على استفسارات الحجاج الدينية',
      'استقبال الاستفسارات الشرعية وتصنيفها وإضافة الإجابات والتوجيهات الشرعية',
      'إدارة المحتوى الديني وبرامج المحاضرات والدروس الدينية وجدول المناسك',
      'إدارة بيانات المرشدين والمشرفين الدينيين واستخراج تقارير الإرشاد الديني',
      'الاطلاع على بيانات الحجاج الضرورية لأداء مهامه فقط (مثل مرجع التقليد والباص)',
    ],
    restrictions: 'يطلع على بيانات الحجاج الضرورية للإرشاد فقط دون تعديل البيانات المالية أو الإدارية الحساسة.',
  },
];

export interface PermissionModuleMeta {
  id: PermissionModuleId;
  title: string;
  subtitle: string;
}

export const PERMISSION_MODULES: PermissionModuleMeta[] = [
  {
    id: 'pilgrims',
    title: 'سجل الحجاج وطلبات التسجيل',
    subtitle: 'بيانات الحجاج، حالة القبول، القوافل والمجموعات، واكتمال الملفات',
  },
  {
    id: 'housing_transport',
    title: 'السكن، الرحلات، وتذاكر الطيران',
    subtitle: 'تسكين الغرف (مكة/المدينة/منى)، الباصات، الرحلات الجوية، وأرقام التذاكر',
  },
  {
    id: 'finance',
    title: 'الإدارة المالية والمدفوعات',
    subtitle: 'الدفعات، الفواتير، الإيصالات، المتأخرات، الاسترداد، وكشوف الحسابات',
  },
  {
    id: 'packages',
    title: 'الباقات والأسعار',
    subtitle: 'إدارة باقات الحج والعمرة وتحديث الأسعار والمميزات',
  },
  {
    id: 'cultural',
    title: 'البرامج الثقافية والإعلانات',
    subtitle: 'الأنشطة الثقافية، المحاضرات، المحتوى التوعوي، الحضور، والإعلانات',
  },
  {
    id: 'religious',
    title: 'الإرشاد الديني والاستفسارات الشرعية',
    subtitle: 'الاستفسارات الفقهية، كشف المراجع، جدول أعمال المناسك، والمرشدين',
  },
  {
    id: 'gifts_kit',
    title: 'توزيع الهدايا وحقيبة السفر',
    subtitle: 'إدارة وتوثيق تسليم هدايا الحجاج وتجهيزات حقيبة السفر',
  },
  {
    id: 'staff_system',
    title: 'إدارة المشرفين وإعدادات النظام',
    subtitle: 'حسابات المشرفين، توزيع الصلاحيات، إعدادات القافلة، وسجل التدقيق',
  },
];

export interface PermissionOperationMeta {
  id: PermissionOperation;
  label: string;
  shortLabel: string;
}

export const PERMISSION_OPERATIONS: PermissionOperationMeta[] = [
  { id: 'view', label: 'مشاهدة البيانات', shortLabel: 'مشاهدة' },
  { id: 'create', label: 'إضافة بيانات جديدة', shortLabel: 'إضافة' },
  { id: 'edit', label: 'تعديل البيانات', shortLabel: 'تعديل' },
  { id: 'delete', label: 'حذف البيانات', shortLabel: 'حذف' },
  { id: 'approve', label: 'اعتماد البيانات', shortLabel: 'اعتماد' },
  { id: 'print', label: 'طباعة البيانات', shortLabel: 'طباعة' },
  { id: 'export', label: 'تصدير التقارير', shortLabel: 'تصدير' },
  { id: 'manage', label: 'إدارة شاملة للقسم', shortLabel: 'إدارة' },
];

export function createModulePerms(
  overrides: Partial<ModulePermissions> = {},
  defaultAll = false
): ModulePermissions {
  return {
    view: overrides.view ?? defaultAll,
    create: overrides.create ?? defaultAll,
    edit: overrides.edit ?? defaultAll,
    delete: overrides.delete ?? defaultAll,
    approve: overrides.approve ?? defaultAll,
    print: overrides.print ?? defaultAll,
    export: overrides.export ?? defaultAll,
    manage: overrides.manage ?? defaultAll,
  };
}

export function createEmptyDetailedPermissions(): DetailedPermissionsMap {
  return {
    pilgrims: createModulePerms({}, false),
    housing_transport: createModulePerms({}, false),
    finance: createModulePerms({}, false),
    packages: createModulePerms({}, false),
    cultural: createModulePerms({}, false),
    religious: createModulePerms({}, false),
    gifts_kit: createModulePerms({}, false),
    staff_system: createModulePerms({}, false),
  };
}

export const DEFAULT_ROLE_PERMISSIONS: Record<OfficialAdminRole, DetailedPermissionsMap> = {
  'الإدارة العامة': {
    pilgrims: createModulePerms({}, true),
    housing_transport: createModulePerms({}, true),
    finance: createModulePerms({}, true),
    packages: createModulePerms({}, true),
    cultural: createModulePerms({}, true),
    religious: createModulePerms({}, true),
    gifts_kit: createModulePerms({}, true),
    staff_system: createModulePerms({}, true),
  },
  'الإشراف المكتبي': {
    pilgrims: createModulePerms({
      view: true,
      create: true,
      edit: true,
      delete: false,
      approve: true,
      print: true,
      export: true,
      manage: true,
    }),
    housing_transport: createModulePerms({
      view: true,
      create: true,
      edit: true,
      delete: false,
      approve: true,
      print: true,
      export: true,
      manage: true,
    }),
    finance: createModulePerms({}, false),
    packages: createModulePerms({ view: true }),
    cultural: createModulePerms({ view: true, print: true }),
    religious: createModulePerms({ view: true, print: true }),
    gifts_kit: createModulePerms({
      view: true,
      create: true,
      edit: true,
      delete: false,
      approve: true,
      print: true,
      export: true,
      manage: true,
    }),
    staff_system: createModulePerms({}, false),
  },
  'الإشراف المالي': {
    pilgrims: createModulePerms({
      view: true,
      print: true,
    }),
    housing_transport: createModulePerms({
      view: true,
    }),
    finance: createModulePerms({
      view: true,
      create: true,
      edit: true,
      delete: false,
      approve: true,
      print: true,
      export: true,
      manage: true,
    }),
    packages: createModulePerms({
      view: true,
      create: true,
      edit: true,
      delete: false,
      approve: true,
      print: true,
      export: true,
      manage: true,
    }),
    cultural: createModulePerms({}, false),
    religious: createModulePerms({}, false),
    gifts_kit: createModulePerms({ view: true }),
    staff_system: createModulePerms({}, false),
  },
  'الإشراف الثقافي': {
    pilgrims: createModulePerms({
      view: true,
      print: true,
    }),
    housing_transport: createModulePerms({
      view: true,
    }),
    finance: createModulePerms({}, false),
    packages: createModulePerms({ view: true }),
    cultural: createModulePerms({
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
      print: true,
      export: true,
      manage: true,
    }),
    religious: createModulePerms({
      view: true,
      print: true,
    }),
    gifts_kit: createModulePerms({
      view: true,
      create: true,
      edit: true,
      print: true,
      export: true,
    }),
    staff_system: createModulePerms({}, false),
  },
  'الإشراف الديني': {
    pilgrims: createModulePerms({
      view: true,
      print: true,
    }),
    housing_transport: createModulePerms({
      view: true,
    }),
    finance: createModulePerms({}, false),
    packages: createModulePerms({ view: true }),
    cultural: createModulePerms({
      view: true,
      create: true,
      edit: true,
      print: true,
    }),
    religious: createModulePerms({
      view: true,
      create: true,
      edit: true,
      delete: false,
      approve: true,
      print: true,
      export: true,
      manage: true,
    }),
    gifts_kit: createModulePerms({ view: true }),
    staff_system: createModulePerms({}, false),
  },
};

/**
 * Safely maps any legacy role string to one of the 5 official roles.
 * Strictly ensures a former 'مشرف إداري' is migrated to 'الإشراف المكتبي' and NEVER to 'الإدارة العامة'.
 */
export function normalizeOfficialRole(role?: string, username?: string): OfficialAdminRole {
  const cleanUser = (username || '').trim().toLowerCase();
  if (
    role === 'الإدارة العامة' ||
    role === 'مدير عام (Master Admin)' ||
    cleanUser === 'admin' ||
    cleanUser === 'admin@alqaemhajj.com' ||
    cleanUser === 'alahsaey@gmail.com'
  ) {
    return 'الإدارة العامة';
  }
  if (role === 'الإشراف المالي' || role === 'محاسب القافلة') {
    return 'الإشراف المالي';
  }
  if (role === 'الإشراف الديني' || role === 'مشرف إرشاد وديني') {
    return 'الإشراف الديني';
  }
  if (role === 'الإشراف الثقافي') {
    return 'الإشراف الثقافي';
  }
  // Default 'مشرف إداري' or any other operational role -> 'الإشراف المكتبي'
  return 'الإشراف المكتبي';
}

export function isLegacyRoleName(role?: string): boolean {
  return (
    role === 'مدير عام (Master Admin)' ||
    role === 'مشرف إداري' ||
    role === 'مشرف إرشاد وديني' ||
    role === 'محاسب القافلة'
  );
}

export function getRoleDefinition(role?: string, username?: string): RoleDefinitionInfo {
  const official = normalizeOfficialRole(role, username);
  return OFFICIAL_ROLES.find((r) => r.id === official) || OFFICIAL_ROLES[1];
}

export function isGeneralAdminUser(user?: AdminUser | null): boolean {
  if (!user) return false;
  if (user.status === 'suspended') return false;
  const official = normalizeOfficialRole(user.role, user.username);
  return official === 'الإدارة العامة';
}

export function isSupervisorAccountActive(user?: AdminUser | null): boolean {
  if (!user) return false;
  return user.status !== 'suspended';
}

/**
 * Returns the effective DetailedPermissionsMap for a given user,
 * respecting custom overrides or dynamic role templates stored in settings.
 */
export function getEffectiveDetailedPermissions(
  user?: AdminUser | null,
  roleTemplates?: Partial<Record<OfficialAdminRole, DetailedPermissionsMap>>
): DetailedPermissionsMap {
  if (!user || user.status === 'suspended') {
    return createEmptyDetailedPermissions();
  }

  const officialRole = normalizeOfficialRole(user.role, user.username);
  if (officialRole === 'الإدارة العامة') {
    return DEFAULT_ROLE_PERMISSIONS['الإدارة العامة'];
  }

  // If the user has explicit detailedPermissions and either customPermissionsOverride is true or no role template overrides it
  if (user.detailedPermissions && user.customPermissionsOverride) {
    return user.detailedPermissions;
  }

  // Check if there is a customized role template in campaign settings
  if (roleTemplates && roleTemplates[officialRole]) {
    return roleTemplates[officialRole]!;
  }

  if (user.detailedPermissions) {
    return user.detailedPermissions;
  }

  // Construct from role defaults + legacy boolean flags
  const base = JSON.parse(
    JSON.stringify(DEFAULT_ROLE_PERMISSIONS[officialRole] || DEFAULT_ROLE_PERMISSIONS['الإشراف المكتبي'])
  ) as DetailedPermissionsMap;

  if (user.permissions) {
    if (user.permissions.manageFinance) {
      base.finance = createModulePerms({
        view: true,
        create: true,
        edit: true,
        approve: true,
        print: true,
        export: true,
        manage: true,
      });
    }
    if (user.permissions.managePackages) {
      base.packages = createModulePerms({
        view: true,
        create: true,
        edit: true,
        approve: true,
        print: true,
        export: true,
        manage: true,
      });
    }
    if (user.permissions.manageReligiousGuide) {
      base.religious = createModulePerms({
        view: true,
        create: true,
        edit: true,
        approve: true,
        print: true,
        export: true,
        manage: true,
      });
    }
    if (user.permissions.manageAnnouncements || user.permissions.manageCultural) {
      base.cultural = createModulePerms({
        view: true,
        create: true,
        edit: true,
        delete: true,
        approve: true,
        print: true,
        export: true,
        manage: true,
      });
    }
    if (user.permissions.manageGifts || user.permissions.manageTravelKit) {
      base.gifts_kit = createModulePerms({
        view: true,
        create: true,
        edit: true,
        approve: true,
        print: true,
        export: true,
        manage: true,
      });
    }
  }

  return base;
}

/**
 * Checks whether a user has permission for a specific module and operation.
 */
export function canPerformOperation(
  user: AdminUser | null | undefined,
  moduleId: PermissionModuleId,
  operation: PermissionOperation,
  roleTemplates?: Partial<Record<OfficialAdminRole, DetailedPermissionsMap>>
): boolean {
  if (!user || user.status === 'suspended') return false;
  if (isGeneralAdminUser(user)) return true;

  const detailed = getEffectiveDetailedPermissions(user, roleTemplates);
  const mod = detailed[moduleId];
  if (!mod) return false;
  if (mod.manage && operation !== 'delete') return true;
  return Boolean(mod[operation]);
}

/**
 * Derives legacy boolean permissions from a DetailedPermissionsMap so all existing
 * components in the app remain 100% synchronized.
 */
export function syncLegacyPermissionsFromDetailed(
  detailed: DetailedPermissionsMap,
  role?: AdminRole
): AdminUser['permissions'] {
  const isGeneral = role === 'الإدارة العامة' || role === 'مدير عام (Master Admin)';
  if (isGeneral) {
    return {
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
    };
  }

  const hasPilgrimsAccess =
    detailed.pilgrims.view ||
    detailed.pilgrims.edit ||
    detailed.pilgrims.create ||
    detailed.pilgrims.manage ||
    detailed.housing_transport.view ||
    detailed.housing_transport.edit ||
    detailed.housing_transport.manage;

  const hasCulturalAccess =
    detailed.cultural.view ||
    detailed.cultural.create ||
    detailed.cultural.edit ||
    detailed.cultural.manage;

  const hasPackagesAccess =
    detailed.packages.create ||
    detailed.packages.edit ||
    detailed.packages.manage;

  const hasStaffAccess =
    detailed.staff_system.view ||
    detailed.staff_system.create ||
    detailed.staff_system.edit ||
    detailed.staff_system.manage;

  const hasFinanceAccess =
    detailed.finance.view ||
    detailed.finance.create ||
    detailed.finance.edit ||
    detailed.finance.approve ||
    detailed.finance.manage;

  const hasReligiousAccess =
    detailed.religious.view ||
    detailed.religious.create ||
    detailed.religious.edit ||
    detailed.religious.manage;

  const hasGiftsAccess =
    detailed.gifts_kit.view ||
    detailed.gifts_kit.create ||
    detailed.gifts_kit.edit ||
    detailed.gifts_kit.manage;

  return {
    managePilgrims: Boolean(hasPilgrimsAccess),
    manageAnnouncements: Boolean(hasCulturalAccess),
    managePackages: Boolean(hasPackagesAccess),
    manageStaff: Boolean(hasStaffAccess),
    manageFinance: Boolean(hasFinanceAccess),
    manageReligiousGuide: Boolean(hasReligiousAccess),
    manageTravelKit: Boolean(hasGiftsAccess),
    manageNotifications: Boolean(hasCulturalAccess || hasPilgrimsAccess),
    manageGifts: Boolean(hasGiftsAccess),
    manageCultural: Boolean(hasCulturalAccess),
  };
}

/**
 * Safely migrates an AdminUser record to the new 5-role structure while preserving
 * legacyRole for auditability and ensuring no privilege escalation occurs.
 */
export function migrateAdminUserRecord(
  user: AdminUser,
  roleTemplates?: Partial<Record<OfficialAdminRole, DetailedPermissionsMap>>
): AdminUser {
  const officialRole = normalizeOfficialRole(user.role, user.username);
  const wasLegacy = isLegacyRoleName(user.role);
  const detailed = getEffectiveDetailedPermissions(
    { ...user, role: officialRole },
    roleTemplates
  );
  const syncedPerms = syncLegacyPermissionsFromDetailed(detailed, officialRole);

  return {
    ...user,
    role: officialRole,
    legacyRole: user.legacyRole || (wasLegacy ? user.role : undefined),
    status: user.status || 'active',
    assignedSeason: user.assignedSeason || 'موسم 1448هـ',
    assignedCaravan: user.assignedCaravan || 'جميع القوافل والأفواج',
    detailedPermissions: detailed,
    permissions: syncedPerms,
  };
}

/**
 * Checks if the target user is the last active General Admin in the system.
 */
export function isLastActiveGeneralAdmin(targetUserId: string, allUsers: AdminUser[]): boolean {
  const activeGeneralAdmins = allUsers.filter(
    (u) => u.status !== 'suspended' && normalizeOfficialRole(u.role, u.username) === 'الإدارة العامة'
  );
  if (activeGeneralAdmins.length <= 1 && activeGeneralAdmins.some((u) => u.id === targetUserId)) {
    return true;
  }
  return false;
}

/**
 * Summarizes detailed permissions in Arabic for audit logs and badges.
 */
export function summarizePermissionsForAudit(detailed: DetailedPermissionsMap): string {
  const parts: string[] = [];
  for (const mod of PERMISSION_MODULES) {
    const p = detailed[mod.id];
    if (!p) continue;
    const ops = PERMISSION_OPERATIONS.filter((op) => p[op.id]).map((op) => op.shortLabel);
    if (ops.length > 0) {
      parts.push(`${mod.title}: [${ops.join('، ')}]`);
    }
  }
  return parts.length > 0 ? parts.join(' | ') : 'لا توجد صلاحيات مفعلة';
}
