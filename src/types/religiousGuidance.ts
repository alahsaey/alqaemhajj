export type AwarenessPhase = 'قبل الحج' | 'أثناء الحج' | 'بعد الحج';

export type PreHajjTopicCategory =
  | 'أحكام الإحرام ومحظوراته'
  | 'المواقيت'
  | 'صفة العمرة'
  | 'صفة الحج'
  | 'الطواف والسعي'
  | 'الوقوف بعرفة'
  | 'المبيت بمزدلفة'
  | 'المبيت بمنى'
  | 'رمي الجمار'
  | 'الهدي والتحلل'
  | 'طواف الوداع'
  | 'الرخص الشرعية'
  | 'أحكام النساء في الحج'
  | 'الأخطاء الشائعة في المناسك';

export type DuringHajjStage =
  | 'اليوم الثامن (يوم التروية)'
  | 'اليوم التاسع (الوقوف بعرفة)'
  | 'مزدلفة'
  | 'يوم العيد (الرمي والهدي والحلق والتحلل)'
  | 'أيام التشريق'
  | 'طواف الوداع';

export type FiqhMasteryStatus =
  | 'لم يبدأ التعلم'
  | 'بدأ التعلم'
  | 'أكمل المادة التعليمية'
  | 'اجتاز التقييم'
  | 'يحتاج إلى مراجعة وإعادة توعية';

export type LessonStatus = 'مسودة' | 'مجدول' | 'جارٍ' | 'مكتمل' | 'ملغى';

export type LessonType = 'عام' | 'جماعي' | 'فردي' | 'نشاط ميداني';

export type ReligiousSubRole =
  | 'مدير الإرشاد الديني'
  | 'مشرف الإرشاد'
  | 'المرشد الديني'
  | 'مشرف الحملة'
  | 'مشرف المجموعة'
  | 'مستخدم التقارير';

export type ReligiousUnitKey =
  | 'dashboard'
  | 'pilgrimProfiles'
  | 'preHajjPrograms'
  | 'duringHajjPrograms'
  | 'lessonsManagement'
  | 'attendanceTracking'
  | 'assessmentsAndMastery'
  | 'referencesAndContent'
  | 'shariaInquiries'
  | 'guidesManagement'
  | 'reportsAndImpact';

export interface FiqhSection {
  id: string;
  name: string;
  originalDefaultName?: string;
  order: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ReligiousGuideDailyReport {
  id: string;
  date: string;
  summary: string;
  lessonsDelivered: number;
  inquiriesAnswered: number;
  fieldNotes?: string;
}

export interface ReligiousGuide {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  languages: string[];
  assignedCampaigns: string[]; // Package titles or 'جميع الحملات'
  assignedGroups: string[]; // Bus numbers or flight numbers
  assignedPilgrimIds?: string[]; // Explicit IDs of pilgrims assigned to this guide
  status: 'نشط' | 'في مهمة ميدانية' | 'إجازة';
  rating: number; // 1 - 5
  pilgrimsEducatedCount: number; // Dynamically synchronized from real assigned pilgrims
  bio?: string;
  dailyReports: ReligiousGuideDailyReport[];
  createdAt: string;
  updatedAt?: string;
}

export type PilgrimEducationStatus =
  | 'أتم التعليم'
  | 'قيد التعليم'
  | 'لم يتم تعليمه بعد';

export type PilgrimTawafStatus =
  | 'أتم التطويف'
  | 'قيد التطويف'
  | 'لم يتم تطويفه بعد';

export interface PilgrimGuideFollowUpAuditEntry {
  id: string;
  timestamp: string;
  authorName: string;
  guideId: string;
  guideName: string;
  actionSummary: string;
  notes?: string;
}

export interface PilgrimGuideFollowUp {
  manasikEducated: boolean; // هل تم تعليم الحاج بالمناسك؟
  manasikEducatedAt?: string;
  ihramExplained: boolean; // هل تم شرح أحكام الإحرام؟
  ihramExplainedAt?: string;
  tawafSaiExplained: boolean; // هل تم شرح أحكام الطواف والسعي؟
  tawafSaiExplainedAt?: string;
  followedUpDuringManasik: boolean; // هل تمت متابعة الحاج أثناء أداء المناسك؟
  followedUpDuringManasikAt?: string;
  tawafCompleted: boolean; // هل تم تطويف الحاج؟
  tawafCompletedAt?: string;
  educationStatus: PilgrimEducationStatus;
  tawafStatus: PilgrimTawafStatus;
  guideNotes: string; // ملاحظات المرشد
  lastUpdatedAt?: string;
  updatedBy?: string;
  historyLog: PilgrimGuideFollowUpAuditEntry[];
}

export interface ProgramMaterialItem {
  id: string;
  title: string;
  type: 'فيديو' | 'صوتي' | 'ملف PDF / مكتوب' | 'انفوجرافيك';
  url: string;
  durationMinutes?: number;
}

export interface AwarenessProgram {
  id: string;
  title: string;
  phase: AwarenessPhase;
  sectionId?: string; // ID of FiqhSection
  topicCategory: PreHajjTopicCategory | string;
  hajjStage?: DuringHajjStage;
  description: string;
  objectives: string[];
  targetType: 'all' | 'package' | 'bus' | 'flight';
  targetValue?: string;
  language: string;
  startDate: string;
  endDate: string;
  lessonIds: string[]; // Ordered lesson IDs
  materials: ProgramMaterialItem[];
  assessmentId?: string;
  fieldActivityDescription?: string;
  benefitScoreAverage?: number; // 0 - 100
  notificationsEnabled: boolean;
  lastNotificationId?: string;
  lastNotificationSentAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ReligiousLesson {
  id: string;
  title: string;
  sectionId?: string; // ID of FiqhSection
  category: PreHajjTopicCategory | string;
  phase: AwarenessPhase;
  hajjStage?: DuringHajjStage;
  lessonType: LessonType;
  programId?: string;
  description: string;
  guideId: string;
  guideName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  targetCampaign: string; // 'جميع الحملات' or package name
  targetGroup: string; // 'جميع المجموعات' or bus/flight
  targetPilgrimsCount: number;
  language: string;
  scientificMaterial: string;
  attachments: { title: string; url: string; type: string }[];
  status: LessonStatus;
  qrCodeToken: string;
  notificationsEnabled: boolean;
  lastNotificationId?: string;
  lastNotificationSentAt?: string;
  clonedFromLessonId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceAuditEntry {
  timestamp: string;
  changedBy: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
}

export interface LessonAttendanceRecord {
  id: string;
  lessonId: string;
  lessonTitle: string;
  pilgrimId: string;
  nationalId: string;
  pilgrimName: string;
  campaignName: string;
  groupName: string;
  status: 'حاضر' | 'غائب' | 'مستأذن';
  method: 'QR' | 'يدوي' | 'استيراد';
  approvedBy: string;
  timestamp: string;
  notes?: string;
  benefitRating?: number; // 1 - 5 evaluation of pilgrim benefit
  auditLogs?: AttendanceAuditEntry[];
}

export type QuestionType = 'اختيار من متعدد' | 'صح وخطأ' | 'مواقف عملية';

export interface AssessmentQuestion {
  id: string;
  sectionId?: string; // Linked by FiqhSection.id so renaming a section never breaks the link
  chapter: PreHajjTopicCategory | string;
  questionType: QuestionType;
  questionText: string;
  options: string[];
  correctAnswer: string;
  points: number;
  explanation: string;
  difficulty: 'سهل' | 'متوسط' | 'متقدم';
}

export interface ReligiousAssessment {
  id: string;
  title: string;
  assessmentPhaseType: 'اختبار قبلي' | 'اختبار بعدي' | 'تقييم مرحلي';
  sectionId?: string; // Linked by FiqhSection.id
  chapter: PreHajjTopicCategory | string;
  programId?: string;
  lessonId?: string;
  passingScore: number; // e.g. 70
  maxAttempts: number;
  questionIds: string[];
  isActive: boolean;
  createdAt: string;
}

export interface PilgrimAssessmentAttempt {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentPhaseType: 'اختبار قبلي' | 'اختبار بعدي' | 'تقييم مرحلي';
  sectionId?: string;
  chapter: string;
  score: number; // 0 - 100
  passed: boolean;
  attemptNumber: number;
  completedAt: string;
  evaluatedBy?: string;
}

export interface PilgrimFollowUpNote {
  id: string;
  date: string;
  authorName: string;
  note: string;
  actionTaken: string;
  notificationId?: string;
}

export interface PilgrimEducationalProgress {
  id: string; // matches pilgrimId or nationalId
  pilgrimId: string;
  nationalId: string;
  preferredLanguage: string;
  assignedGuideId?: string; // معرف المرشد الديني المسؤول عن تعليم وتطويف الحاج
  assignedGuideName?: string;
  assignedGuideAt?: string; // تاريخ إسناد الحاج للمرشد
  guideFollowUp?: PilgrimGuideFollowUp; // سجل المتابعة والإنجاز مع المرشد الديني
  enrolledProgramIds: string[];
  completedProgramIds: string[];
  completedLessonIds: string[];
  preTestScore?: number;
  postTestScore?: number;
  fiqhIssuesMastery: Record<string, FiqhMasteryStatus>; // Keyed by FiqhSection.id (with backward compatibility for legacy section names)
  assessmentAttempts: PilgrimAssessmentAttempt[];
  followUpLog: PilgrimFollowUpNote[];
  needsReeducation: boolean;
  lastUpdated: string;
}

export interface ReferenceVersionEntry {
  version: string;
  date: string;
  updatedBy: string;
  changeNotes: string;
}

export interface ReligiousReferenceMaterial {
  id: string;
  title: string;
  sectionId?: string; // Linked by FiqhSection.id
  category: PreHajjTopicCategory | string;
  materialType: 'كتاب شرعي' | 'ملف PDF' | 'مقطع مرئي' | 'مقطع صوتي' | 'دليل مصور';
  relatedFiqhIssue: string;
  relatedProgramId?: string;
  relatedLessonId?: string;
  language: string;
  summary: string;
  contentOrUrl: string;
  approvedByAuthority: string; // الجهة التي اعتمدت المادة
  approvedByPerson: string;
  isApproved: boolean; // عدم إظهار أي محتوى غير معتمد للحجاج
  version: string;
  versionHistory: ReferenceVersionEntry[];
  createdAt: string;
  updatedAt?: string;
}

export interface ShariaInquiry {
  id: string;
  pilgrimId: string;
  nationalId: string;
  pilgrimName: string;
  pilgrimMobile: string;
  campaignName: string;
  groupName: string;
  marjiName?: string;
  sectionId?: string; // Linked by FiqhSection.id
  category: PreHajjTopicCategory | string;
  phase: AwarenessPhase;
  question: string;
  assignedGuideId?: string;
  assignedGuideName?: string;
  answer?: string;
  status: 'جديد' | 'قيد الإجابة' | 'بانتظار الاعتماد' | 'معتمد ومنشور' | 'مؤرشف';
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  isFrequentQuestion: boolean;
  convertedToLessonId?: string;
  notificationSentId?: string;
  notificationSentAt?: string;
  createdAt: string;
  updatedAt?: string;
}
