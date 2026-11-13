import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  QrCode,
  Award,
  Library,
  MessageSquare,
  UserCheck,
  BarChart3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AdminUser, CampaignSettings, Pilgrim } from '../../types';
import {
  AssessmentQuestion,
  AwarenessProgram,
  FiqhSection,
  LessonAttendanceRecord,
  PilgrimEducationalProgress,
  ReligiousAssessment,
  ReligiousGuide,
  ReligiousLesson,
  ReligiousReferenceMaterial,
  ReligiousSubRole,
  ReligiousUnitKey,
  ShariaInquiry,
} from '../../types/religiousGuidance';
import { INITIAL_FIQH_SECTIONS } from '../../data/religiousGuidanceData';
import {
  assignPilgrimsToGuideBatch,
  buildOrMergePilgrimProgress,
  deleteFiqhSectionSafely,
  deleteReligiousItem,
  dispatchReligiousAwarenessNotification,
  restoreDefaultFiqhSections,
  saveFiqhSectionsBatch,
  savePilgrimGuideFollowUp,
  saveReligiousItem,
  unassignPilgrimFromGuide,
  useReligiousGuidanceStoreInit,
} from '../../lib/religiousGuidanceDb';
import { ReligiousDashboardAndProfiles } from './ReligiousDashboardAndProfiles';
import { ReligiousProgramsAndLessons } from './ReligiousProgramsAndLessons';
import { ReligiousAttendanceAndAssessments } from './ReligiousAttendanceAndAssessments';
import { ReligiousLibraryInquiriesGuides } from './ReligiousLibraryInquiriesGuides';
import { ReligiousReportsView } from './ReligiousReportsView';
import { GiftPrintModal } from '../gifts/GiftPrintModal';

export const RELIGIOUS_11_UNITS: {
  key: ReligiousUnitKey;
  title: string;
  shortDesc: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    key: 'dashboard',
    title: 'لوحة مؤشرات الإرشاد الديني',
    shortDesc: 'المؤشرات الفورية ونسبة إنجاز خطة التوعية',
    icon: LayoutDashboard,
  },
  {
    key: 'pilgrimProfiles',
    title: 'إدارة الحجاج والملفات التعليمية',
    shortDesc: 'الملف التعليمي والفقهي الشامل لكل حاج',
    icon: Users,
  },
  {
    key: 'preHajjPrograms',
    title: 'برامج التوعية قبل الحج',
    shortDesc: 'الأبواب الفقهية الـ 14 والتأهيل قبل السفر',
    icon: BookOpen,
  },
  {
    key: 'duringHajjPrograms',
    title: 'برامج التوعية أثناء الحج',
    shortDesc: 'مراحل المشاعر الـ 6 ودليل الحاج الزمني',
    icon: Compass,
  },
  {
    key: 'lessonsManagement',
    title: 'إدارة الدروس والمحاضرات',
    shortDesc: 'التقويم اليومي والأسبوعي والشهري ونسخ الدروس',
    icon: Calendar,
  },
  {
    key: 'attendanceTracking',
    title: 'تسجيل الحضور والغياب',
    shortDesc: 'التحضير برمز QR الفريد واليدوي والاستيراد',
    icon: QrCode,
  },
  {
    key: 'assessmentsAndMastery',
    title: 'الاختبارات وقياس التعلم',
    shortDesc: 'بنك الأسئلة وإتقان المسائل الفقهية',
    icon: Award,
  },
  {
    key: 'referencesAndContent',
    title: 'المراجع والمحتوى الشرعي',
    shortDesc: 'المكتبة المعتمدة وكشف مراجع التقليد',
    icon: Library,
  },
  {
    key: 'shariaInquiries',
    title: 'الاستفسارات الشرعية',
    shortDesc: 'الفتاوى واعتماد الإجابات وتحويلها لدروس',
    icon: MessageSquare,
  },
  {
    key: 'guidesManagement',
    title: 'إدارة المرشدين الدينيين',
    shortDesc: 'ملفات المرشدين والتكليفات والتقارير اليومية',
    icon: UserCheck,
  },
  {
    key: 'reportsAndImpact',
    title: 'التقارير وقياس الأثر',
    shortDesc: '11 تقريراً تفصيلياً بصيغة Excel و PDF',
    icon: BarChart3,
  },
];

interface ReligiousGuidanceManagerProps {
  activePilgrims: Pilgrim[];
  currentAdminUser: AdminUser | null;
  campaignSettings: CampaignSettings;
  onUpdateCampaignSettings: (settings: CampaignSettings) => void;
  initialUnit?: ReligiousUnitKey;
  initialRefSubTab?: 'library' | 'marjiRoster';
  onActiveUnitChange?: (unit: ReligiousUnitKey) => void;
}

export const ReligiousGuidanceManager: React.FC<ReligiousGuidanceManagerProps> = ({
  activePilgrims,
  currentAdminUser,
  campaignSettings,
  onUpdateCampaignSettings,
  initialUnit = 'dashboard',
  initialRefSubTab = 'library',
  onActiveUnitChange,
}) => {
  const [activeUnit, setActiveUnit] = useState<ReligiousUnitKey>(initialUnit);
  const [selectedLessonForQr, setSelectedLessonForQr] = useState<string | undefined>(undefined);

  // Sync external initialUnit when user clicks a sub-menu in AdminDashboard
  useEffect(() => {
    setActiveUnit(initialUnit);
  }, [initialUnit]);

  // Sub-role simulation / assignment derived from currentAdminUser
  const defaultSubRole: ReligiousSubRole = useMemo(() => {
    const roleStr = currentAdminUser?.role || '';
    if (roleStr.includes('الإدارة العامة') || roleStr.includes('مدير عام')) {
      return 'مدير الإرشاد الديني';
    }
    if (roleStr.includes('الديني')) {
      return 'مشرف الإرشاد';
    }
    if (roleStr.includes('المكتبي')) {
      return 'مشرف الحملة';
    }
    return 'مدير الإرشاد الديني';
  }, [currentAdminUser]);

  const [activeSubRole, setActiveSubRole] = useState<ReligiousSubRole>(defaultSubRole);

  const canEdit = activeSubRole !== 'مستخدم التقارير';
  const canApproveSharia =
    activeSubRole === 'مدير الإرشاد الديني' || activeSubRole === 'مشرف الإرشاد';
  const canManageSections =
    activeSubRole === 'مدير الإرشاد الديني' || activeSubRole === 'مشرف الإرشاد';

  // Persistent State for All Religious Guidance Collections + Dynamic Fiqh Sections
  const [guides, setGuides] = useState<ReligiousGuide[]>([]);
  const [programs, setPrograms] = useState<AwarenessProgram[]>([]);
  const [lessons, setLessons] = useState<ReligiousLesson[]>([]);
  const [attendance, setAttendance] = useState<LessonAttendanceRecord[]>([]);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [assessments, setAssessments] = useState<ReligiousAssessment[]>([]);
  const [storedProgressList, setStoredProgressList] = useState<PilgrimEducationalProgress[]>([]);
  const [references, setReferences] = useState<ReligiousReferenceMaterial[]>([]);
  const [inquiries, setInquiries] = useState<ShariaInquiry[]>([]);
  const [fiqhSections, setFiqhSections] = useState<FiqhSection[]>(INITIAL_FIQH_SECTIONS);

  // Print Modal State
  const [printConfig, setPrintConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    columns: string[];
    data: (string | number)[][];
    summaryCards?: { label: string; value: string | number }[];
  }>({
    isOpen: false,
    title: '',
    columns: [],
    data: [],
  });

  useEffect(() => {
    const unsub = useReligiousGuidanceStoreInit({
      onGuides: setGuides,
      onPrograms: setPrograms,
      onLessons: setLessons,
      onAttendance: setAttendance,
      onQuestions: setQuestions,
      onAssessments: setAssessments,
      onProgress: setStoredProgressList,
      onReferences: setReferences,
      onInquiries: setInquiries,
      onFiqhSections: setFiqhSections,
    });
    return unsub;
  }, []);

  // Build map of PilgrimEducationalProgress linked directly to activePilgrims without duplicating Pilgrim records
  const pilgrimProgressMap = useMemo(() => {
    const map: Record<string, PilgrimEducationalProgress> = {};
    activePilgrims.forEach((p) => {
      const pid = p.id || p.nationalId;
      const merged = buildOrMergePilgrimProgress(
        p,
        storedProgressList,
        attendance,
        lessons,
        programs,
        fiqhSections
      );
      map[pid] = merged;
      if (p.nationalId) {
        map[p.nationalId] = merged;
      }
    });
    return map;
  }, [activePilgrims, storedProgressList, attendance, lessons, programs, fiqhSections]);

  const currentStaffName =
    currentAdminUser?.fullName || currentAdminUser?.username || 'مشرف الإرشاد الديني';

  const handleNavigateUnit = (unit: ReligiousUnitKey) => {
    setActiveUnit(unit);
    if (onActiveUnitChange) {
      onActiveUnitChange(unit);
    }
  };

  const handleSendNotification = async (params: {
    title: string;
    body: string;
    targetType: 'all' | 'package' | 'bus' | 'flight' | 'gender' | 'individual';
    targetValue?: string;
    auditActionLabel: string;
  }): Promise<string> => {
    const item = await dispatchReligiousAwarenessNotification({
      ...params,
      senderName: currentStaffName,
      activePilgrims,
    });
    return item.id;
  };

  const handlePrintReport = (
    title: string,
    columns: string[],
    data: (string | number)[][],
    summaryCards?: { label: string; value: string | number }[],
    subtitle?: string
  ) => {
    setPrintConfig({
      isOpen: true,
      title,
      subtitle:
        subtitle ||
        'منظومة الإرشاد والتوعية الدينية المعتمدة — قافلة القائم للحج والعمرة (موسم 1448هـ)',
      columns,
      data,
      summaryCards,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-[#0E1726] via-[#10192D] to-[#0A0F1D] border border-amber-500/35 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 border border-amber-300/40">
              <Compass className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold">
                  منظومة الإرشاد الديني المتكاملة
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  مرتبطة بقاعدة بيانات الحجاج ونظام الإشعارات الموحد
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                إدارة التوعية والتعليم الديني للحجاج (قبل الحج • أثناء الحج • بعد الحج)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                متابعة الملفات التعليمية للحجاج، برامج التوعية للأبواب الـ 14 ومراحل المشاعر الـ 6، التحضير برمز QR، قياس إتقان المسائل الفقهية، اعتماد الفتاوى، وإصدار التقارير الـ 11.
              </p>
            </div>
          </div>

          {/* Sub-Role Governance Selector */}
          <div className="bg-[#0B1221]/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-1.5 w-full lg:w-auto shrink-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>مستوى صلاحية الإرشاد الديني:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{currentStaffName}</span>
            </div>
            <select
              value={activeSubRole}
              onChange={(e) => setActiveSubRole(e.target.value as ReligiousSubRole)}
              className="bg-[#10192D] border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black text-white focus:outline-none focus:border-amber-400"
            >
              <option value="مدير الإرشاد الديني">مدير الإرشاد الديني (صلاحية كاملة واعتماد)</option>
              <option value="مشرف الإرشاد">مشرف الإرشاد (إدارة البرامج واعتماد الفتاوى)</option>
              <option value="المرشد الديني">المرشد الديني (تنفيذ الدروس والتحضير والإجابة)</option>
              <option value="مشرف الحملة">مشرف الحملة (متابعة حجاج الحملة والتقارير)</option>
              <option value="مشرف المجموعة">مشرف المجموعة (تحضير ومتابعة حجاج المجموعة)</option>
              <option value="مستخدم التقارير">مستخدم التقارير (عرض وتصدير التقارير فقط)</option>
            </select>
          </div>
        </div>

        {/* 11 Units Navigation Bar (`ثانياً: القائمة الرئيسية المقترحة`) */}
        <div className="relative mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {RELIGIOUS_11_UNITS.map((unit) => {
            const Icon = unit.icon;
            const isActive = activeUnit === unit.key;
            return (
              <button
                key={unit.key}
                type="button"
                onClick={() => handleNavigateUnit(unit.key)}
                className={`text-right p-2.5 sm:p-3 rounded-2xl border transition flex items-center gap-2.5 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 font-black'
                    : 'bg-[#0B1221]/90 hover:bg-[#142038] text-slate-200 border-slate-800 hover:border-amber-500/40 font-bold'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-slate-950/15 text-slate-950'
                      : 'bg-[#10192D] text-amber-400 border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs leading-snug truncate">{unit.title}</div>
                  <div
                    className={`text-[10px] truncate hidden sm:block ${
                      isActive ? 'text-slate-900 font-semibold' : 'text-slate-400 font-normal'
                    }`}
                  >
                    {unit.shortDesc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Unit Content */}
      {(activeUnit === 'dashboard' || activeUnit === 'pilgrimProfiles') && (
        <ReligiousDashboardAndProfiles
          mode={activeUnit}
          activePilgrims={activePilgrims}
          programs={programs}
          lessons={lessons}
          attendance={attendance}
          assessments={assessments}
          pilgrimProgressMap={pilgrimProgressMap}
          guides={guides}
          inquiries={inquiries}
          fiqhSections={fiqhSections}
          currentStaffName={currentStaffName}
          canEdit={canEdit}
          onNavigateUnit={handleNavigateUnit}
          onSavePilgrimProgress={(prog) =>
            saveReligiousItem(
              'religious_pilgrim_progress',
              'progress',
              prog,
              storedProgressList,
              setStoredProgressList
            )
          }
          onSendNotification={handleSendNotification}
          onPrintReport={handlePrintReport}
        />
      )}

      {(activeUnit === 'preHajjPrograms' ||
        activeUnit === 'duringHajjPrograms' ||
        activeUnit === 'lessonsManagement') && (
        <ReligiousProgramsAndLessons
          mode={activeUnit}
          activePilgrims={activePilgrims}
          programs={programs}
          lessons={lessons}
          guides={guides}
          pilgrimProgressMap={pilgrimProgressMap}
          campaignSettings={campaignSettings}
          canEdit={canEdit}
          onSaveProgram={(prog) =>
            saveReligiousItem('religious_programs', 'programs', prog, programs, setPrograms)
          }
          onDeleteProgram={(id) =>
            deleteReligiousItem('religious_programs', 'programs', id, programs, setPrograms)
          }
          onSaveLesson={(lesson) =>
            saveReligiousItem('religious_lessons', 'lessons', lesson, lessons, setLessons)
          }
          onDeleteLesson={(id) =>
            deleteReligiousItem('religious_lessons', 'lessons', id, lessons, setLessons)
          }
          onUpdateCampaignSettings={onUpdateCampaignSettings}
          onSendNotification={handleSendNotification}
          onOpenLessonQr={(lesson) => {
            setSelectedLessonForQr(lesson.id);
            handleNavigateUnit('attendanceTracking');
          }}
        />
      )}

      {(activeUnit === 'attendanceTracking' || activeUnit === 'assessmentsAndMastery') && (
        <ReligiousAttendanceAndAssessments
          mode={activeUnit}
          activePilgrims={activePilgrims}
          lessons={lessons}
          attendance={attendance}
          questions={questions}
          assessments={assessments}
          pilgrimProgressMap={pilgrimProgressMap}
          fiqhSections={fiqhSections}
          currentStaffName={currentStaffName}
          canEdit={canEdit}
          canManageSections={canManageSections}
          initialLessonId={selectedLessonForQr}
          onSaveAttendance={(rec) =>
            saveReligiousItem('religious_attendance', 'attendance', rec, attendance, setAttendance)
          }
          onSaveQuestion={(q) =>
            saveReligiousItem('religious_questions', 'questions', q, questions, setQuestions)
          }
          onSaveAssessment={(a) =>
            saveReligiousItem(
              'religious_assessments',
              'assessments',
              a,
              assessments,
              setAssessments
            )
          }
          onSavePilgrimProgress={(prog) =>
            saveReligiousItem(
              'religious_pilgrim_progress',
              'progress',
              prog,
              storedProgressList,
              setStoredProgressList
            )
          }
          onSaveFiqhSection={(sec) =>
            saveReligiousItem(
              'religious_fiqh_sections',
              'fiqhSections',
              sec,
              fiqhSections,
              setFiqhSections
            )
          }
          onReorderFiqhSections={(secs) => saveFiqhSectionsBatch(secs, setFiqhSections)}
          onDeleteFiqhSectionSafely={(sectionToDelete, fallbackSection) =>
            deleteFiqhSectionSafely({
              sectionToDelete,
              fallbackSection,
              currentSections: fiqhSections,
              setSections: setFiqhSections,
              questions,
              setQuestions,
              programs,
              setPrograms,
              lessons,
              setLessons,
              references,
              setReferences,
              inquiries,
              setInquiries,
              storedProgressList,
              setStoredProgressList,
            })
          }
          onRestoreDefaultFiqhSections={() =>
            restoreDefaultFiqhSections(fiqhSections, setFiqhSections)
          }
          onSendNotification={handleSendNotification}
          onPrintReport={handlePrintReport}
        />
      )}

      {(activeUnit === 'referencesAndContent' ||
        activeUnit === 'shariaInquiries' ||
        activeUnit === 'guidesManagement') && (
        <ReligiousLibraryInquiriesGuides
          mode={activeUnit}
          activePilgrims={activePilgrims}
          references={references}
          inquiries={inquiries}
          guides={guides}
          lessons={lessons}
          pilgrimProgressMap={pilgrimProgressMap}
          fiqhSections={fiqhSections}
          currentStaffName={currentStaffName}
          canEdit={canEdit}
          canApproveSharia={canApproveSharia}
          initialRefSubTab={initialRefSubTab}
          onSaveReference={(ref) =>
            saveReligiousItem(
              'religious_references',
              'references',
              ref,
              references,
              setReferences
            )
          }
          onSaveInquiry={(inq) =>
            saveReligiousItem('religious_inquiries', 'inquiries', inq, inquiries, setInquiries)
          }
          onSaveGuide={(guide) =>
            saveReligiousItem('religious_guides', 'guides', guide, guides, setGuides)
          }
          onDeleteGuide={(id) =>
            deleteReligiousItem('religious_guides', 'guides', id, guides, setGuides)
          }
          onSaveLesson={(lesson) =>
            saveReligiousItem('religious_lessons', 'lessons', lesson, lessons, setLessons)
          }
          onSavePilgrimProgress={(prog) =>
            saveReligiousItem(
              'religious_pilgrim_progress',
              'progress',
              prog,
              storedProgressList,
              setStoredProgressList
            )
          }
          onAssignPilgrimsToGuide={(targetGuide, pilgrimsToAssign) =>
            assignPilgrimsToGuideBatch({
              targetGuide,
              pilgrimsToAssign,
              activePilgrims,
              guides,
              setGuides,
              storedProgressList,
              setStoredProgressList,
              pilgrimProgressMap,
              actorName: currentStaffName,
            })
          }
          onUnassignPilgrimFromGuide={(pilgrim, guide) =>
            unassignPilgrimFromGuide({
              pilgrim,
              guide,
              activePilgrims,
              guides,
              setGuides,
              storedProgressList,
              setStoredProgressList,
              pilgrimProgressMap,
              actorName: currentStaffName,
            })
          }
          onSavePilgrimGuideFollowUp={(pilgrim, guide, nextFollowUp, actionSummary) =>
            savePilgrimGuideFollowUp({
              pilgrim,
              guide,
              nextFollowUp,
              actionSummary,
              pilgrimProgressMap,
              storedProgressList,
              setStoredProgressList,
              actorName: currentStaffName,
            })
          }
          onSendNotification={handleSendNotification}
        />
      )}

      {activeUnit === 'reportsAndImpact' && (
        <ReligiousReportsView
          activePilgrims={activePilgrims}
          programs={programs}
          lessons={lessons}
          attendance={attendance}
          pilgrimProgressMap={pilgrimProgressMap}
          guides={guides}
          inquiries={inquiries}
          fiqhSections={fiqhSections}
          onPrintReport={handlePrintReport}
        />
      )}

      {/* Official Print & PDF Modal */}
      {printConfig.isOpen && (
        <GiftPrintModal
          title={printConfig.title}
          subtitle={printConfig.subtitle}
          generatedBy={currentStaffName}
          columns={printConfig.columns}
          data={printConfig.data}
          summaryCards={printConfig.summaryCards}
          onClose={() => setPrintConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
};
