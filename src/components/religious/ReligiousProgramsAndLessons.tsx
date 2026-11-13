import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  Copy,
  Edit3,
  FileSpreadsheet,
  Plus,
  Send,
  Trash2,
  Video,
  FileText,
  CheckCircle2,
  QrCode,
  Sparkles,
  MapPin,
  Users,
  Bell,
  BellOff,
  Compass,
} from 'lucide-react';
import { CampaignSettings, HajjTimelineDay, Pilgrim } from '../../types';
import {
  AwarenessPhase,
  AwarenessProgram,
  DuringHajjStage,
  LessonStatus,
  LessonType,
  PilgrimEducationalProgress,
  ReligiousGuide,
  ReligiousLesson,
} from '../../types/religiousGuidance';
import {
  DURING_HAJJ_6_STAGES,
  PRE_HAJJ_14_TOPICS,
  SUPPORTED_LANGUAGES,
} from '../../data/religiousGuidanceData';
import {
  exportReligiousReportCSV,
  getPilgrimCampaignLabel,
  getPilgrimDisplayName,
  getPilgrimGroupLabel,
} from '../../lib/religiousGuidanceDb';

interface ProgramsAndLessonsProps {
  mode: 'preHajjPrograms' | 'duringHajjPrograms' | 'lessonsManagement';
  activePilgrims: Pilgrim[];
  programs: AwarenessProgram[];
  lessons: ReligiousLesson[];
  guides: ReligiousGuide[];
  pilgrimProgressMap: Record<string, PilgrimEducationalProgress>;
  campaignSettings: CampaignSettings;
  canEdit: boolean;
  onSaveProgram: (prog: AwarenessProgram) => Promise<void>;
  onDeleteProgram: (id: string) => Promise<void>;
  onSaveLesson: (lesson: ReligiousLesson) => Promise<void>;
  onDeleteLesson: (id: string) => Promise<void>;
  onUpdateCampaignSettings: (settings: CampaignSettings) => void;
  onSendNotification: (params: {
    title: string;
    body: string;
    targetType: 'all' | 'package' | 'bus' | 'flight' | 'gender' | 'individual';
    targetValue?: string;
    auditActionLabel: string;
  }) => Promise<string>;
  onOpenLessonQr: (lesson: ReligiousLesson) => void;
}

export const ReligiousProgramsAndLessons: React.FC<ProgramsAndLessonsProps> = ({
  mode,
  activePilgrims,
  programs,
  lessons,
  guides,
  pilgrimProgressMap,
  campaignSettings,
  canEdit,
  onSaveProgram,
  onDeleteProgram,
  onSaveLesson,
  onDeleteLesson,
  onUpdateCampaignSettings,
  onSendNotification,
  onOpenLessonQr,
}) => {
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [duringSubView, setDuringSubView] = useState<'programs' | 'hajjTimeline'>('programs');

  // Calendar View Mode for Lessons Management
  const [calendarViewMode, setCalendarViewMode] = useState<'list' | 'daily' | 'weekly' | 'monthly'>(
    'list'
  );
  const [lessonStatusFilter, setLessonStatusFilter] = useState<string>('all');

  // Program Form Modal State
  const [editingProgram, setEditingProgram] = useState<AwarenessProgram | null>(null);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);

  // Lesson Form Modal State
  const [editingLesson, setEditingLesson] = useState<ReligiousLesson | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  // Hajj Timeline Editor State (preserved from existing system)
  const [timelineDays, setTimelineDays] = useState<HajjTimelineDay[]>(
    campaignSettings.hajjDaysTimeline || []
  );
  const [timelineSavedBanner, setTimelineSavedBanner] = useState(false);

  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeBanner(msg);
    setTimeout(() => setNoticeBanner(null), 4000);
  };

  // Filtered Programs
  const displayedPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (mode === 'preHajjPrograms' && p.phase !== 'قبل الحج') return false;
      if (mode === 'duringHajjPrograms' && p.phase === 'قبل الحج') return false;
      if (
        mode === 'preHajjPrograms' &&
        selectedTopicFilter !== 'all' &&
        p.topicCategory !== selectedTopicFilter
      ) {
        return false;
      }
      if (
        mode === 'duringHajjPrograms' &&
        selectedStageFilter !== 'all' &&
        p.hajjStage !== selectedStageFilter
      ) {
        return false;
      }
      return true;
    });
  }, [programs, mode, selectedTopicFilter, selectedStageFilter]);

  // Filtered Lessons
  const displayedLessons = useMemo(() => {
    return lessons.filter((l) => {
      if (lessonStatusFilter !== 'all' && l.status !== lessonStatusFilter) return false;
      return true;
    });
  }, [lessons, lessonStatusFilter]);

  const handleOpenNewProgram = (phase: AwarenessPhase) => {
    const newProg: AwarenessProgram = {
      id: `prog-${Date.now()}`,
      title: '',
      phase,
      topicCategory: PRE_HAJJ_14_TOPICS[0],
      hajjStage: phase === 'أثناء الحج' ? DURING_HAJJ_6_STAGES[0] : undefined,
      description: '',
      objectives: ['إتقان الأحكام الشرعية المرتبطة بالمنسك وتطبيقها عملياً.'],
      targetType: 'all',
      targetValue: 'جميع الحجاج',
      language: 'العربية',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      lessonIds: [],
      materials: [],
      fieldActivityDescription: phase === 'أثناء الحج' ? 'جولة إرشادية ميدانية ومرافقة للحجاج' : '',
      benefitScoreAverage: 95,
      notificationsEnabled: true,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setEditingProgram(newProg);
    setIsProgramModalOpen(true);
  };

  const handleOpenNewLesson = () => {
    const firstGuide = guides[0];
    const newLesson: ReligiousLesson = {
      id: `lesson-${Date.now()}`,
      title: '',
      category: PRE_HAJJ_14_TOPICS[0],
      phase: 'قبل الحج',
      lessonType: 'عام',
      description: '',
      guideId: firstGuide?.id || 'guide-1',
      guideName: firstGuide?.name || 'المرشد الديني',
      date: new Date().toISOString().split('T')[0],
      startTime: '19:30',
      endTime: '21:00',
      location: 'القاعة الكبرى بمقر القافلة',
      targetCampaign: 'جميع الحملات',
      targetGroup: 'جميع المجموعات',
      targetPilgrimsCount: activePilgrims.length || 150,
      language: 'العربية',
      scientificMaterial: '',
      attachments: [],
      status: 'مجدول',
      qrCodeToken: `QR-QAEM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      notificationsEnabled: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setEditingLesson(newLesson);
    setIsLessonModalOpen(true);
  };

  const handleCloneLesson = async (source: ReligiousLesson) => {
    const cloned: ReligiousLesson = {
      ...source,
      id: `lesson-${Date.now()}`,
      title: `${source.title} (نسخة مستنسخة)`,
      status: 'مسودة',
      qrCodeToken: `QR-QAEM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      clonedFromLessonId: source.id,
      lastNotificationId: undefined,
      lastNotificationSentAt: undefined,
      createdAt: new Date().toISOString().split('T')[0],
    };
    await onSaveLesson(cloned);
    showNotice(`تم نسخ الدرس "${source.title}" وإنشاء مسودة جديدة برمز QR مستقل.`);
  };

  const handleDispatchProgramNotification = async (prog: AwarenessProgram) => {
    if (!prog.notificationsEnabled) {
      showNotice('الإشعارات معطلة لهذا البرنامج. يرجى تفعيل خيار الإشعارات أولاً.');
      return;
    }
    const notifId = await onSendNotification({
      title: `تذكير ببرنامج التوعية الدينية: ${prog.title}`,
      body: `ندعوكم لمتابعة برنامج "${prog.title}" (${prog.topicCategory}) والاطلاع على المواد العلمية والدروس المقررة عبر بوابة الحاج.`,
      targetType: prog.targetType === 'all' ? 'all' : prog.targetType,
      targetValue: prog.targetValue,
      auditActionLabel: 'إرسال إشعار برنامج توعوي عبر نظام الإشعارات الموحد',
    });
    await onSaveProgram({
      ...prog,
      lastNotificationId: notifId,
      lastNotificationSentAt: new Date().toLocaleString('ar-SA'),
    });
    showNotice(`تم إرسال إشعار البرنامج عبر نظام الإشعارات الحالي (رقم الإشعار: ${notifId}).`);
  };

  const handleDispatchLessonNotification = async (lesson: ReligiousLesson) => {
    if (!lesson.notificationsEnabled) {
      showNotice('الإشعارات معطلة لهذا الدرس. يمكنك تفعيلها من إعدادات الدرس.');
      return;
    }
    const notifId = await onSendNotification({
      title: `تذكير بموعد درس فقهي: ${lesson.title}`,
      body: `يقدم ${lesson.guideName} درس "${lesson.title}" بتاريخ ${lesson.date} الساعة ${lesson.startTime} في (${lesson.location}). رمز التحضير: ${lesson.qrCodeToken}`,
      targetType: 'all',
      targetValue: lesson.targetGroup,
      auditActionLabel: 'إرسال تذكير بموعد درس توعوي عبر نظام الإشعارات الموحد',
    });
    await onSaveLesson({
      ...lesson,
      lastNotificationId: notifId,
      lastNotificationSentAt: new Date().toLocaleString('ar-SA'),
    });
    showNotice(`تم إرسال تذكير الدرس للحجاج المستهدفين عبر نظام الإشعارات الحالي.`);
  };

  const handleExportProgramCompletionReport = (prog: AwarenessProgram) => {
    const headers = [
      '#',
      'اسم الحاج',
      'رقم الهوية',
      'الجوال',
      'الحملة',
      'المجموعة',
      'حالة الالتحاق بالبرنامج',
      'الدروس المنجزة من البرنامج',
      'نسبة الإنجاز',
      'حالة إتمام البرنامج',
    ];
    const rows = activePilgrims.map((p, idx) => {
      const pid = p.id || p.nationalId;
      const pr = pilgrimProgressMap[pid];
      const isEnrolled = pr?.enrolledProgramIds.includes(prog.id);
      const completedLessonsInProg = prog.lessonIds.filter((lid) =>
        pr?.completedLessonIds.includes(lid)
      ).length;
      const totalInProg = Math.max(1, prog.lessonIds.length);
      const pct = Math.round((completedLessonsInProg / totalInProg) * 100);
      const isDone = pr?.completedProgramIds.includes(prog.id) || pct === 100;

      return [
        idx + 1,
        getPilgrimDisplayName(p),
        p.nationalId,
        p.mobile,
        getPilgrimCampaignLabel(p),
        getPilgrimGroupLabel(p),
        isEnrolled ? 'ملتحق' : 'غير ملتحق',
        `${completedLessonsInProg} / ${prog.lessonIds.length}`,
        `${pct}%`,
        isDone ? 'مكتمل' : 'غير مكتمل',
      ];
    });
    exportReligiousReportCSV(`تقرير_إنجاز_برنامج_${prog.title.slice(0, 25)}`, headers, rows);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {noticeBanner && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{noticeBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeBanner(null)}
            className="text-emerald-300 hover:text-white"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* UNIT 3: PRE-HAJJ AWARENESS PROGRAMS */}
      {mode === 'preHajjPrograms' && (
        <div className="space-y-5">
          {/* Header & 14 Topics Chips */}
          <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span>برامج التوعية قبل الحج (الأبواب الفقهية الـ 14 المقررة)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  إدارة البرامج التعليمية قبل السفر، المواد المرئية والصوتية والمكتوبة، تتبع نسبة الإنجاز لكل حاج، وإرسال التذكيرات عبر نظام الإشعارات الحالي
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleOpenNewProgram('قبل الحج')}
                  className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إنشاء برنامج توعوي قبل الحج</span>
                </button>
              )}
            </div>

            {/* 14 Core Pre-Hajj Topics Filter Bar */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setSelectedTopicFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  selectedTopicFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-[#10192D] text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                جميع الأبواب الـ 14 ({programs.filter((p) => p.phase === 'قبل الحج').length})
              </button>
              {PRE_HAJJ_14_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopicFilter(topic)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                    selectedTopicFilter === topic
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-[#10192D] text-slate-300 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Pre-Hajj Programs Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {displayedPrograms.map((prog) => {
              const linkedLessons = lessons.filter((l) => prog.lessonIds.includes(l.id));
              const completedPilgrimsCount = activePilgrims.filter((p) => {
                const pr = pilgrimProgressMap[p.id || p.nationalId];
                return pr?.completedProgramIds.includes(prog.id);
              }).length;
              const completionPct =
                activePilgrims.length > 0
                  ? Math.round((completedPilgrimsCount / activePilgrims.length) * 100)
                  : 0;

              return (
                <div
                  key={prog.id}
                  className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-lg hover:border-amber-500/40 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                        {prog.topicCategory}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>
                          {prog.startDate} → {prog.endDate}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {prog.language}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-base font-black text-white">{prog.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{prog.description}</p>

                    {/* Objectives */}
                    {prog.objectives.length > 0 && (
                      <div className="bg-[#10192D] border border-slate-800/80 rounded-2xl p-3 space-y-1">
                        <span className="text-[11px] font-bold text-amber-400 block">
                          أهداف البرنامج:
                        </span>
                        <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                          {prog.objectives.map((obj, i) => (
                            <li key={i}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Ordered Lessons & Materials */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3 space-y-1.5">
                        <span className="text-[11px] font-bold text-sky-400 block">
                          الدروس المندرجة بالترتيب ({linkedLessons.length}):
                        </span>
                        {linkedLessons.length === 0 ? (
                          <p className="text-[11px] text-slate-500">لا توجد دروس مرتبطة حالياً</p>
                        ) : (
                          linkedLessons.map((l, idx) => (
                            <div
                              key={l.id}
                              className="text-xs text-slate-200 flex items-center gap-1.5 truncate"
                            >
                              <span className="w-4 h-4 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate">{l.title}</span>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3 space-y-1.5">
                        <span className="text-[11px] font-bold text-emerald-400 block">
                          المواد التعليمية ({prog.materials.length}):
                        </span>
                        {prog.materials.map((m) => (
                          <div
                            key={m.id}
                            className="text-xs text-slate-200 flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{m.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 shrink-0">
                              {m.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Completion Bar */}
                    <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-bold">
                          نسبة إتمام الحجاج للبرنامج ({completedPilgrimsCount} / {activePilgrims.length})
                        </span>
                        <span className="font-mono font-black text-amber-400">{completionPct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full"
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleExportProgramCompletionReport(prog)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>تصدير تقرير الملتحقين والمكتملين</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDispatchProgramNotification(prog)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال تذكير عبر نظام الإشعارات</span>
                      </button>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProgram(prog);
                            setIsProgramModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
                          title="تعديل البرنامج"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProgram(prog.id)}
                          className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs cursor-pointer"
                          title="حذف البرنامج"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* UNIT 4: DURING-HAJJ & POST-HAJJ PROGRAMS + EXISTING HAJJ TIMELINE EDITOR */}
      {mode === 'duringHajjPrograms' && (
        <div className="space-y-5">
          {/* Sub-View Switcher: Field Stage Programs vs Existing Hajj Days Timeline Editor */}
          <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                <span>برامج التوعية الميدانية أثناء الحج وخطة سير أيام المناسك</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                تنظيم التوعية حسب مراحل المشاعر الست (يوم التروية، عرفة، مزدلفة، يوم العيد، أيام التشريق، طواف الوداع) مع الحفاظ الكامل على محرر دليل الحاج الزمني
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDuringSubView('programs')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer ${
                  duringSubView === 'programs'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-[#10192D] text-slate-300 border border-slate-800'
                }`}
              >
                البرامج الميدانية لمراحل الحج (6 مراحل)
              </button>
              <button
                type="button"
                onClick={() => setDuringSubView('hajjTimeline')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer ${
                  duringSubView === 'hajjTimeline'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-[#10192D] text-slate-300 border border-slate-800'
                }`}
              >
                دليل الحاج وخطة سير الرحلة ({timelineDays.length} أيام)
              </button>
              {canEdit && duringSubView === 'programs' && (
                <button
                  type="button"
                  onClick={() => handleOpenNewProgram('أثناء الحج')}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة برنامج مرحلة ميدانية</span>
                </button>
              )}
            </div>
          </div>

          {duringSubView === 'programs' ? (
            <div className="space-y-4">
              {/* 6 Hajj Stages Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStageFilter('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    selectedStageFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-[#0B1221] text-slate-300 border-slate-800'
                  }`}
                >
                  جميع مراحل المناسك الست
                </button>
                {DURING_HAJJ_6_STAGES.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setSelectedStageFilter(stage)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      selectedStageFilter === stage
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-[#0B1221] text-slate-300 border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {displayedPrograms.map((prog) => (
                  <div
                    key={prog.id}
                    className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-black">
                          {prog.hajjStage || prog.phase}
                        </span>
                        <span className="text-xs font-mono text-amber-400 font-bold">
                          تقييم استفادة الحجاج: {prog.benefitScoreAverage || 95}%
                        </span>
                      </div>

                      <h4 className="text-base font-black text-white">{prog.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{prog.description}</p>

                      {prog.fieldActivityDescription && (
                        <div className="bg-[#10192D] border border-amber-500/25 rounded-2xl p-3 text-xs text-amber-200">
                          <strong className="block text-amber-400 mb-0.5">
                            النشاط الميداني المعتمد:
                          </strong>
                          {prog.fieldActivityDescription}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleDispatchProgramNotification(prog)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال رسالة المرحلة التوعوية للحجاج</span>
                      </button>

                      {canEdit && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProgram(prog);
                              setIsProgramModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProgram(prog.id)}
                            className="p-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Preserved Hajj Timeline Editor (دليل الحاج وخطة سير الرحلة) */
            <div className="space-y-4">
              <div className="bg-[#0B1221] border border-amber-500/30 rounded-3xl p-5 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="text-sm sm:text-base font-black text-white">
                    محرر دليل الحاج التفاعلي وخطة سير الرحلة (مرتبط مباشرة بصفحة دليل الحاج العامة)
                  </h4>
                  <p className="text-xs text-slate-400">
                    جميع التعديلات هنا تنعكس فوراً في صفحة (دليل الحاج) للحجاج المسجلين دون فقدان أي بيانات سابقة
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {timelineSavedBanner && (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                      تم الحفظ والنشر ✓
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateCampaignSettings({
                        ...campaignSettings,
                        hajjDaysTimeline: timelineDays,
                      });
                      setTimelineSavedBanner(true);
                      setTimeout(() => setTimelineSavedBanner(false), 3000);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow cursor-pointer"
                  >
                    حفظ التغييرات ونشرها في دليل الحاج
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {timelineDays.map((day, dIdx) => (
                  <div
                    key={day.id}
                    className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm">
                        {dIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={day.dayTitle}
                        onChange={(e) => {
                          const next = [...timelineDays];
                          next[dIdx].dayTitle = e.target.value;
                          setTimelineDays(next);
                        }}
                        className="flex-1 bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-black text-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <textarea
                        rows={2}
                        value={day.summary}
                        onChange={(e) => {
                          const next = [...timelineDays];
                          next[dIdx].summary = e.target.value;
                          setTimelineDays(next);
                        }}
                        placeholder="ملخص اليوم"
                        className="w-full bg-[#10192D] border border-slate-700 rounded-xl p-3 text-xs text-white"
                      />
                      <textarea
                        rows={2}
                        value={day.campaignTip}
                        onChange={(e) => {
                          const next = [...timelineDays];
                          next[dIdx].campaignTip = e.target.value;
                          setTimelineDays(next);
                        }}
                        placeholder="توجيهات القافلة"
                        className="w-full bg-[#10192D] border border-slate-700 rounded-xl p-3 text-xs text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* UNIT 5: LESSONS & LECTURES MANAGEMENT (WITH CLONE & DAILY/WEEKLY/MONTHLY CALENDAR) */}
      {mode === 'lessonsManagement' && (
        <div className="space-y-5">
          {/* Header & View Switcher */}
          <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span>إدارة الدروس والمحاضرات والجدول الزمني (يومي / أسبوعي / شهري)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                جدولة الدروس الفردية والجماعية والعامة، نسخ الدروس السابقة، توليد رمز QR لكل درس، وإرسال التذكيرات عبر نظام الإشعارات
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'list', label: 'عرض البطاقات' },
                { id: 'daily', label: 'تقويم يومي' },
                { id: 'weekly', label: 'تقويم أسبوعي' },
                { id: 'monthly', label: 'تقويم شهري' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setCalendarViewMode(v.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    calendarViewMode === v.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-[#10192D] text-slate-300 border-slate-800'
                  }`}
                >
                  {v.label}
                </button>
              ))}

              {canEdit && (
                <button
                  type="button"
                  onClick={handleOpenNewLesson}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة درس / محاضرة</span>
                </button>
              )}
            </div>
          </div>

          {/* Lesson Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'مسودة', 'مجدول', 'جارٍ', 'مكتمل', 'ملغى'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setLessonStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  lessonStatusFilter === st
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-[#0B1221] text-slate-300 border-slate-800'
                }`}
              >
                {st === 'all' ? `جميع الحالات (${lessons.length})` : st}
              </button>
            ))}
          </div>

          {/* Calendar Views (Daily / Weekly / Monthly) */}
          {calendarViewMode !== 'list' && (
            <div className="bg-[#0B1221] border border-amber-500/30 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-amber-400">
                  {calendarViewMode === 'daily'
                    ? 'التقويم اليومي للدروس والمحاضرات مرتبة بالساعة'
                    : calendarViewMode === 'weekly'
                    ? 'التقويم الأسبوعي لتوزيع الدروس والمجالس الفقهية'
                    : 'التقويم الشهري الشامل لخطة الدروس (ذو القعدة وذو الحجة 1448هـ)'}
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  إجمالي الدروس المعروضة: {displayedLessons.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {displayedLessons
                  .slice()
                  .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
                  .map((l) => (
                    <div
                      key={l.id}
                      className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-amber-400 font-bold">{l.date}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                          {l.startTime} - {l.endTime}
                        </span>
                      </div>
                      <div className="font-black text-white text-xs">{l.title}</div>
                      <div className="text-[11px] text-slate-400">
                        المرشد: {l.guideName} • المكان: {l.location}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Lessons Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayedLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black ${
                          lesson.status === 'مكتمل'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : lesson.status === 'جارٍ'
                            ? 'bg-amber-500 text-slate-950'
                            : lesson.status === 'مجدول'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : lesson.status === 'ملغى'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {lesson.status}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 text-[11px] font-bold">
                        {lesson.lessonType} • {lesson.phase}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 text-[11px] font-bold">
                        {lesson.category}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-slate-400">
                      {lesson.date} | {lesson.startTime} - {lesson.endTime}
                    </span>
                  </div>

                  <h4 className="text-base font-black text-white">{lesson.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{lesson.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#10192D] border border-slate-800 rounded-2xl p-3">
                    <div className="text-slate-300">
                      <strong className="text-slate-400">المرشد:</strong> {lesson.guideName}
                    </div>
                    <div className="text-slate-300">
                      <strong className="text-slate-400">المكان:</strong> {lesson.location}
                    </div>
                    <div className="text-slate-300">
                      <strong className="text-slate-400">المستهدفون:</strong> {lesson.targetGroup} (
                      {lesson.targetPilgrimsCount} حاج)
                    </div>
                    <div className="text-amber-300 font-mono">
                      <strong className="text-slate-400 font-sans">رمز QR:</strong>{' '}
                      {lesson.qrCodeToken}
                    </div>
                  </div>
                </div>

                {/* Lesson Footer Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onOpenLessonQr(lesson)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>رمز QR والتحضير</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDispatchLessonNotification(lesson)}
                      className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال تذكير للحجاج</span>
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleCloneLesson(lesson)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="نسخ درس سابق"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الدرس</span>
                      </button>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLesson(lesson);
                          setIsLessonModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteLesson(lesson.id)}
                        className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROGRAM CREATE / EDIT MODAL */}
      {isProgramModalOpen && editingProgram && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-amber-500/40 rounded-3xl w-full max-w-2xl p-5 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">
                {editingProgram.title ? 'تعديل البرنامج التوعوي' : 'إنشاء برنامج توعوي جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProgramModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                إغلاق ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم البرنامج:</label>
                <input
                  type="text"
                  value={editingProgram.title}
                  onChange={(e) =>
                    setEditingProgram({ ...editingProgram, title: e.target.value })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المرحلة:</label>
                <select
                  value={editingProgram.phase}
                  onChange={(e) =>
                    setEditingProgram({
                      ...editingProgram,
                      phase: e.target.value as AwarenessPhase,
                    })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="قبل الحج">قبل الحج</option>
                  <option value="أثناء الحج">أثناء الحج</option>
                  <option value="بعد الحج">بعد الحج</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الباب الفقهي المقرر:
                </label>
                <select
                  value={editingProgram.topicCategory}
                  onChange={(e) =>
                    setEditingProgram({ ...editingProgram, topicCategory: e.target.value })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {PRE_HAJJ_14_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {editingProgram.phase === 'أثناء الحج' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    مرحلة المشاعر المقدسة (أثناء الحج):
                  </label>
                  <select
                    value={editingProgram.hajjStage || DURING_HAJJ_6_STAGES[0]}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        hajjStage: e.target.value as DuringHajjStage,
                      })
                    }
                    className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {DURING_HAJJ_6_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ البداية:</label>
                <input
                  type="date"
                  value={editingProgram.startDate}
                  onChange={(e) =>
                    setEditingProgram({ ...editingProgram, startDate: e.target.value })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ النهاية:</label>
                <input
                  type="date"
                  value={editingProgram.endDate}
                  onChange={(e) =>
                    setEditingProgram({ ...editingProgram, endDate: e.target.value })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">وصف البرنامج:</label>
                <textarea
                  rows={3}
                  value={editingProgram.description}
                  onChange={(e) =>
                    setEditingProgram({ ...editingProgram, description: e.target.value })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProgram.notificationsEnabled}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        notificationsEnabled: e.target.checked,
                      })
                    }
                  />
                  <span>تفعيل إرسال الإشعارات التوعوية لهذا البرنامج عبر نظام الإشعارات الموحد</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsProgramModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editingProgram.title.trim()) return;
                  await onSaveProgram(editingProgram);
                  setIsProgramModalOpen(false);
                  showNotice('تم حفظ بيانات البرنامج التوعوي بنجاح.');
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
              >
                حفظ البرنامج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LESSON CREATE / EDIT MODAL */}
      {isLessonModalOpen && editingLesson && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-amber-500/40 rounded-3xl w-full max-w-2xl p-5 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">
                {editingLesson.title ? 'تعديل بيانات الدرس / المحاضرة' : 'إضافة درس أو محاضرة جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLessonModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                إغلاق ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">عنوان الدرس:</label>
                <input
                  type="text"
                  value={editingLesson.title}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, title: e.target.value })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">التصنيف الفقهي:</label>
                <select
                  value={editingLesson.category}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, category: e.target.value })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {PRE_HAJJ_14_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">حالة الدرس:</label>
                <select
                  value={editingLesson.status}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      status: e.target.value as LessonStatus,
                    })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {(['مسودة', 'مجدول', 'جارٍ', 'مكتمل', 'ملغى'] as LessonStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المرشد المسؤول:</label>
                <select
                  value={editingLesson.guideId}
                  onChange={(e) => {
                    const g = guides.find((x) => x.id === e.target.value);
                    setEditingLesson({
                      ...editingLesson,
                      guideId: e.target.value,
                      guideName: g?.name || editingLesson.guideName,
                    });
                  }}
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {guides.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">نوع الدرس:</label>
                <select
                  value={editingLesson.lessonType}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      lessonType: e.target.value as LessonType,
                    })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="عام">عام</option>
                  <option value="جماعي">جماعي</option>
                  <option value="فردي">فردي</option>
                  <option value="نشاط ميداني">نشاط ميداني</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">التاريخ:</label>
                <input
                  type="date"
                  value={editingLesson.date}
                  onChange={(e) => setEditingLesson({ ...editingLesson, date: e.target.value })}
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">من الساعة:</label>
                  <input
                    type="time"
                    value={editingLesson.startTime}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, startTime: e.target.value })
                    }
                    className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">إلى الساعة:</label>
                  <input
                    type="time"
                    value={editingLesson.endTime}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, endTime: e.target.value })
                    }
                    className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المكان:</label>
                <input
                  type="text"
                  value={editingLesson.location}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, location: e.target.value })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  المجموعة المستهدفة:
                </label>
                <input
                  type="text"
                  value={editingLesson.targetGroup}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, targetGroup: e.target.value })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">وصف الدرس والمادة العلمية:</label>
                <textarea
                  rows={2}
                  value={editingLesson.description}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, description: e.target.value })
                  }
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsLessonModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editingLesson.title.trim()) return;
                  await onSaveLesson(editingLesson);
                  setIsLessonModalOpen(false);
                  showNotice('تم حفظ بيانات الدرس وتوليد رمز QR الفريد بنجاح.');
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
              >
                حفظ الدرس
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
