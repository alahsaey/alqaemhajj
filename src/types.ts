export interface Pilgrim {
  id: string;
  createdAt: string;
  termsAccepted: string; // "نعم"
  firstName: string;
  secondName: string; // الاب
  thirdName: string; // الجد
  lastName: string; // العائلة
  name?: string; // الاسم الرباعي الموحد (الاسم الكامل)
  packageType?: string; // الباقة المختارة
  hotelRoom?: string; // رقم الغرفة بالسكن
  englishFullName: string;
  gender: string; // "ذكر" | "أنثى"
  nationality: string;
  nationalId: string;
  idIssueDate: string;
  idExpiryDate: string;
  birthDate: string;
  mobile: string;
  whatsapp: string;
  email: string;
  iban: string;
  bankAccountName: string;
  bankName: string;
  transport: string; // "باص" | "طائرة"
  hajjType: string; // "مستحب" | "تمتع" | "قِران" | "إفراد" | "عمرة"
  seasonYear?: string; // حقل سنة الموسم الحصري (مثال: "1448")
  hajjYear?: string; // عام الحج للموسم المسجل فيه (مثال: "1448")
  season?: string; // مسمى الموسم (مثال: "موسم حج 1448هـ")
  lastHajjYear: string;
  currentMarji: string; // مرجع التقليد الحالي (مثل السيستاني، الخامنئي، الحكيم، الشيرازي، إلخ)
  previousMarji: string; // مرجع التقليد السابق
  status: 'قيد المراجعة' | 'تم القبول' | 'مكتمل' | 'مقبول ومؤكد' | 'مكتمل الدفع' | 'معتذر' | 'مرفوض' | 'محذوف';
  rejectionReason?: string; // سبب الرفض في حال اختيار حالة "مرفوض"
  applicationStatus?: 'قيد المراجعة' | 'تم القبول' | 'مكتمل';
  documentsReceived?: boolean;
  paymentReceived?: boolean;
  statusNotes?: string;
  isDeleted?: boolean;
  mobilityIndependence?: string;
  roomNumber?: string;
  roomNumberMakkah?: string; // رقم غرفة سكن مكة المكرمة
  roomNumberMadinah?: string; // رقم غرفة السكن بالمدينة المنورة
  roomNumberMina?: string; // تسكين منى (رقم المخيم / الخيمة / المقر)
  busNumber?: string; // رقم الباص / الحافلة
  busSeat?: string; // رقم المقعد في الباص (1 - 49)
  flightNumberOutbound?: string; // بيانات رحلة الطيران (الذهاب)
  flightNumberReturn?: string; // بيانات رحلة الطيران (العودة)
  flightTicketNumber?: string; // رقم الحجز / التذكرة (PNR)
  selectedPackage?: string; // الباقة المختارة
  registrationReference: string; // رقم مرجعي مشفر للاستعلام
  nationalIdImage?: string; // رابط خارجي (External / Cloudinary URL) لصورة الهوية الوطنية
  paymentReceipt?: string; // رابط خارجي (External / Cloudinary URL) لصورة إيصال التحويل البنكي
  paymentReceiptDate?: string; // تاريخ التحويل البنكي
  transferAmount?: string; // المبلغ المحول
  bankReferenceNumber?: string; // رقم الحوالة البنكية / المرجع
  totalPackagePrice?: string; // إجمالي سعر الباقة
  paidAmount?: string; // إجمالي المسدد
  remainingAmount?: string; // المبلغ المتبقي
  paymentInstallments?: PaymentRecord[]; // كشف الدفعات المالية المسددة
  membershipNumber?: string; // رقم العضوية في القافلة (مثال: QAEM-1448-1003)
  pilgrimSequenceNumber?: number; // رقم التسلسل في سجل الحجاج
  whatsappNotificationsEnabled?: boolean; // هل تم تفعيل إشعارات الواتساب
  whatsappNotificationMobile?: string; // رقم الواتساب المخصص للإشعارات
  whatsappNotificationTopics?: string[]; // أنواع التنبيهات المفعلة (مواعيد المغادرة، السكن، الإرشاد)
  pushNotificationsEnabled?: boolean; // تفعيل إشعارات المتصفح الفورية (Web Push)
  fcmTokens?: string[]; // معرّفات أجهزة ومتصفح الحاج لاستقبال الإشعارات
  // Health & Care
  healthConditions?: string[];
  otherHealthCondition?: string;
  hasBackPain?: boolean;
  needsAssistance?: boolean;
  isPregnant?: boolean; // For females
  hasSpeechDifficulty?: boolean;
  // Mahram/Companion
  hasMahram?: boolean;
  mahramDetails?: {
    name: string;
    relation: string;
  }[];
}

export interface PaymentRecord {
  id: string;
  title: string; // مثال: "الدفعة الأولى (تأكيد الحجز)"، "الدفعة النهائية"، "سداد كامل الرسوم"
  amount: string; // المبلغ بالريال
  date: string; // تاريخ السداد
  paymentMethod: string; // "حوالة بنكية" | "بطاقة مدى / شبكة" | "إيداع مباشر" | "نقدي"
  bankName?: string; // اسم البنك
  referenceNumber?: string; // رقم العملية / الحوالة
  notes?: string;
  confirmedBy?: string; // اسم المحاسب أو المشرف
  receiptImage?: string; // رابط خارجي (External / Cloudinary URL) لصورة الإيصال
  receiptId?: string; // unique identifier
}

export interface HajjPackage {
  id: string;
  title: string;
  type: string;
  price: string;
  transport: string;
  accommodationMakkah: string;
  accommodationMadinah: string;
  campMina: string;
  features: string[];
  image: string; // رابط خارجي (External / Cloudinary URL) لصورة الباقة
}

export interface AnnouncementDisplaySettings {
  showImage?: boolean;
  showVideo?: boolean;
  enableLightbox?: boolean;
  highlightCard?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  content: string;
  category: 'هام' | 'توجيهات' | 'مواعيد';
  fontSize?: 'sm' | 'normal' | 'lg' | 'xl' | '2xl';
  isBold?: boolean;
  textAlign?: 'right' | 'center' | 'justify';
  imageUrl?: string; // رابط خارجي أو سحابي (Cloudinary / External URL) للصورة
  videoUrl?: string; // رابط خارجي أو سحابي (Cloudinary / YouTube / External MP4 URL) للفيديو
  mediaProvider?: 'cloudinary' | 'external' | 'youtube';
  displaySettings?: AnnouncementDisplaySettings;
}

export type OfficialAdminRole =
  | 'الإدارة العامة'
  | 'الإشراف المكتبي'
  | 'الإشراف المالي'
  | 'الإشراف الثقافي'
  | 'الإشراف الديني';

export type LegacyAdminRole =
  | 'مدير عام (Master Admin)'
  | 'مشرف إداري'
  | 'مشرف إرشاد وديني'
  | 'محاسب القافلة';

export type AdminRole = OfficialAdminRole | LegacyAdminRole;

export type PermissionOperation =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'print'
  | 'export'
  | 'manage';

export type PermissionModuleId =
  | 'pilgrims'
  | 'housing_transport'
  | 'finance'
  | 'packages'
  | 'cultural'
  | 'religious'
  | 'gifts_kit'
  | 'staff_system';

export type ModulePermissions = Record<PermissionOperation, boolean>;

export type DetailedPermissionsMap = Record<PermissionModuleId, ModulePermissions>;

export interface AdminUser {
  id: string;
  username: string;
  pin: string;
  fullName: string;
  role: AdminRole;
  legacyRole?: string;
  status?: 'active' | 'suspended';
  assignedSeason?: string;
  assignedCaravan?: string;
  customPermissionsOverride?: boolean;
  detailedPermissions?: DetailedPermissionsMap;
  permissions: {
    managePilgrims: boolean;
    manageAnnouncements: boolean;
    managePackages: boolean;
    manageStaff: boolean;
    manageFinance: boolean;
    manageReligiousGuide: boolean;
    manageTravelKit: boolean;
    manageNotifications?: boolean;
    manageGifts?: boolean;
    manageCultural?: boolean;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface HajjGuideStep {
  id: string;
  order: number;
  title: string;
  description: string;
}

export interface TravelKitItem {
  id: string;
  category: string;
  item: string;
  isEssential: boolean;
}

export interface SiteTexts {
  topBarAnnouncement: string;
  topBarBadge: string;
  topBarSubtext: string;
  brandName: string;
  brandSubtitle: string;
  heroBadge: string;
  heroTitlePrefix: string;
  heroTitleHighlight: string;
  heroDescription: string;
  registerButtonText: string;
  portalButtonText: string;
  cardSeasonBadge: string;
  cardTitle: string;
  cardSubtitle: string;
  cardFeatures: string[];
}

export interface HajjTimelineStep {
  time: string;
  title: string;
  desc: string;
}

export interface HajjTimelineDay {
  id: string;
  dayTitle: string;
  subtitle: string;
  summary: string;
  steps: HajjTimelineStep[];
  campaignTip: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

export interface YouTubeConfig {
  enabled: boolean;
  channelUrl: string;
  channelId: string;
  channelHandle?: string;
  isLiveActive: boolean;
  liveStreamUrl?: string;
  liveTitle?: string;
  cachedLatestVideoId?: string;
  cachedLatestVideoTitle?: string;
  cachedLatestVideoDate?: string;
}

export interface HistoricalYearRecord {
  id: string;
  hijriYear: string; // مثال: "1447هـ"
  pilgrimsCount: number; // عدد الحجاج في ذلك العام
  notes?: string; // ملاحظة اختيارية (مثال: موسم حج 1447هـ)
}

export interface PilgrimStatsConfig {
  activeSeasonYear?: string; // العام الهجري للموسم النشط (مثال: 1448)
  baseHistoricalCount: number; // رصيد تأسيسي للأعوام السابقة (اختياري)
  historicalRecords: HistoricalYearRecord[]; // سجلات الحجاج حسب الأعوام الهجرية
  autoIncludeCurrentPassengers: boolean; // احتساب مسافري الطيران والباصات الفعليين تلقائياً
}

export interface CampaignSettings {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  siteTexts?: SiteTexts;
  marjiList: string[];
  busList?: string[];
  operationalCostTarget?: number;
  pilgrimStatsConfig?: PilgrimStatsConfig;
  hajjDaysTimeline?: HajjTimelineDay[];
  cloudinaryConfig?: CloudinaryConfig;
  youtubeConfig?: YouTubeConfig;
  rolePermissionTemplates?: Partial<Record<OfficialAdminRole, DetailedPermissionsMap>>;
}

export interface ActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  username?: string;
  userRole?: string;
  category?:
    | 'تسجيل دخول / خروج'
    | 'إدارة الحجاج'
    | 'المالية والإيصالات'
    | 'الباقات والإعلانات'
    | 'المشرفين والإعدادات'
    | 'بوابة الحاج والتسجيل';
  action: string;
  target: string;
  details?: string;
  previousValue?: string;
  newValue?: string;
  date?: string;
  time?: string;
  timestamp: string;
}

export interface PilgrimFeedback {
  id: string;
  pilgrimId: string; // nationalId
  pilgrimName: string;
  rating: number; // 1-5
  comment: string;
  category: 'التنظيم' | 'السكن' | 'الإعاشة' | 'الإرشاد الديني' | 'المواصلات' | 'عام';
  createdAt: string;
}

export type NotificationPriority = 'urgent' | 'high' | 'normal';
export type NotificationTargetType = 'all' | 'transport' | 'package' | 'bus' | 'flight' | 'gender' | 'individual';
export type NotificationDeliveryType = 'instant' | 'scheduled';
export type NotificationStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled';

export interface NotificationStats {
  targetCount: number;
  sentCount: number;
  readCount: number;
  failureCount: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  targetType: NotificationTargetType;
  targetValue?: string; // e.g. "طائرة", "باقة الحج المميزة", "حافلة 1", "ذكر", or pilgrim nationalId
  deliveryType: NotificationDeliveryType;
  scheduledAt?: string; // ISO string / Asia/Riyadh local representation
  status: NotificationStatus;
  stats: NotificationStats;
  createdBy: {
    adminId: string;
    adminName: string;
    role: string;
  };
  createdAt: string;
  sentAt?: string;
  scheduledSendError?: string;
}

export interface PilgrimNotification {
  id: string;
  notificationId: string;
  pilgrimId: string; // nationalId
  title: string;
  body: string;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// إدارة توزيع هدايا الحجاج (Pilgrim Gift Distribution Management)
// -------------------------------------------------------------
export type GiftDeliveryStatus =
  | 'delivered_direct' // تم التسليم مباشرة للحاج
  | 'delivered_proxy'  // تم التسليم لشخص ينوب عن الحاج
  | 'not_delivered'    // لم يتم التسليم
  | 'contacted_no_show'// تم التواصل مع الحاج ولم يحضر
  | 'unable_to_deliver'// تعذر التسليم
  | 'postponed';       // مؤجل لموعد آخر

export type GiftFollowUpStatus =
  | 'not_contacted'     // لم يتم التواصل معه
  | 'contacted_no_show' // تم التواصل ولم يحضر
  | 'unable_to_contact' // تعذر التواصل معه
  | 'new_date_set'      // تم تحديد موعد جديد
  | 'unable_other';     // تعذر التسليم لسبب آخر

export interface GiftOperationLog {
  id: string;
  timestamp: string;
  staffName: string;
  action: 'تسجيل تسليم مباشر' | 'تسجيل تسليم بالإنابة' | 'تعديل حالة' | 'تسجيل تواصل' | 'إلغاء تسليم' | 'إعادة فتح';
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  details?: string;
}

export interface GiftDistribution {
  id: string; // `${pilgrimId}_gift`
  pilgrimId: string;
  nationalId: string;
  pilgrimName: string;
  membershipNumber?: string;
  mobile: string;
  busNumber?: string;
  flightNumber?: string;
  seasonYear: string; // e.g. '1448'
  status: GiftDeliveryStatus;
  recipientType?: 'pilgrim' | 'proxy';
  recipientName?: string;
  recipientIdNumber?: string;
  recipientMobile?: string;
  recipientRelation?: string;
  proxyType?: 'قريب' | 'مرافق' | 'مشرف مجموعة' | 'مندوب' | 'أخرى';
  deliveryDate?: string;
  deliveryTime?: string;
  deliveredBy?: string;
  deliveryLocation?: string;
  notes?: string;
  reasonUnable?: string;
  postponedDate?: string;
  followUpStatus?: GiftFollowUpStatus;
  nextFollowUpDate?: string;
  lastContactDate?: string;
  lastContactStaff?: string;
  contactAttemptsCount?: number;
  history?: GiftOperationLog[];
  auditLogs?: GiftOperationLog[];
  gender?: string;
  packageType?: string;
  roomNumber?: string;
  allocatedGiftsCount?: number;
  updatedAt?: string;
  createdAt?: string;
}

export interface GiftCommunication {
  id: string;
  pilgrimId: string;
  nationalId: string;
  pilgrimName: string;
  mobile: string;
  busNumber?: string;
  flightNumber?: string;
  contactDate: string;
  contactTime: string;
  contactMethod: 'اتصال هاتفي' | 'واتساب' | 'رسالة نصية' | 'مقابلة مباشرة' | 'أخرى';
  contactStaff: string;
  result: 'تم التواصل ولم يحضر' | 'تعذر التواصل معه' | 'تم تحديد موعد جديد' | 'تم الاتفاق على الاستلام' | 'تعذر التسليم لسبب آخر' | 'أخرى';
  nextFollowUpDate?: string;
  notes?: string;
  createdAt: string;
}


