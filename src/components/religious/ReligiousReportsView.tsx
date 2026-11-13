import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Search,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Users,
  BookOpen,
  Award,
  SlidersHorizontal,
} from 'lucide-react';
import { Pilgrim } from '../../types';
import { openAlQaemExcelCustomizer } from '../../utils/alqaemExcelEngine';
import {
  AwarenessProgram,
  FiqhSection,
  LessonAttendanceRecord,
  PilgrimEducationalProgress,
  ReligiousGuide,
  ReligiousLesson,
  ShariaInquiry,
} from '../../types/religiousGuidance';
import { INITIAL_FIQH_SECTIONS } from '../../data/religiousGuidanceData';
import {
  computeGuideAssignedStats,
  exportReligiousReportCSV,
  getPilgrimCampaignLabel,
  getPilgrimDisplayName,
  getPilgrimGroupLabel,
  getPilgrimSectionMastery,
  resolveFiqhSectionName,
  sortFiqhSections,
} from '../../lib/religiousGuidanceDb';

type ReportTypeKey =
  | '1_received_awareness'
  | '2_not_received_awareness'
  | '3_attendance_absence'
  | '4_lesson_attendance'
  | '5_programs_completion'
  | '6_exam_results'
  | '7_fiqh_issues_review'
  | '8_guides_performance'
  | '9_by_campaign_group'
  | '10_by_language'
  | '11_daily_weekly_final';

const REPORT_CATALOG: { id: ReportTypeKey; number: number; title: string; subtitle: string }[] = [
  {
    id: '1_received_awareness',
    number: 1,
    title: 'تقرير الحجاج الذين تلقوا التوعية الدينية',
    subtitle: 'كشف الحجاج الذين حضروا الدروس واجتازوا التقييمات الفقهية',
  },
  {
    id: '2_not_received_awareness',
    number: 2,
    title: 'تقرير الحجاج الذين لم يتلقوا التوعية أو بحاجة لمتابعة',
    subtitle: 'الحجاج الذين لم يحضروا الدروس أو لديهم مسائل فقهية تحتاج إلى إعادة توعية',
  },
  {
    id: '3_attendance_absence',
    number: 3,
    title: 'تقرير الحضور والغياب الشامل للحجاج',
    subtitle: 'إحصائية حضور وغياب كل حاج ونسبة التزامه بالدروس المقررة',
  },
  {
    id: '4_lesson_attendance',
    number: 4,
    title: 'تقرير حضور كل درس ومحاضرة',
    subtitle: 'بيان تفصيلي بعدد الحاضرين والغائبين ونسبة الحضور لكل درس ورمز QR',
  },
  {
    id: '5_programs_completion',
    number: 5,
    title: 'تقرير إنجاز البرامج التعليمية (قبل وأثناء الحج)',
    subtitle: 'قياس نسب التحاق وإتمام الحجاج للبرامج التوعوية المعتمدة',
  },
  {
    id: '6_exam_results',
    number: 6,
    title: 'تقرير نتائج الاختبارات (القبلي والبعدي)',
    subtitle: 'مقارنة الدرجات القبلية والبعدية ومعدل النمو المعرفي لكل حاج',
  },
  {
    id: '7_fiqh_issues_review',
    number: 7,
    title: 'تقرير المسائل الفقهية التي تحتاج إلى مزيد من التوعية',
    subtitle: 'تحليل الأبواب الفقهية الـ 14 وتحديد المسائل الأكثر حاجة للمراجعة والتكثيف',
  },
  {
    id: '8_guides_performance',
    number: 8,
    title: 'تقرير أداء المرشدين الدينيين والتكليفات',
    subtitle: 'سجل إنجاز كل مرشد، عدد الدروس المنفذة، الحجاج الموعين، وتقييم الأداء',
  },
  {
    id: '9_by_campaign_group',
    number: 9,
    title: 'تقرير التوعية حسب الحملات والمجموعات (الحافلات والطيران)',
    subtitle: 'مقارنة نسب التوعية والحضور والإتقان بين المجموعات والحملات',
  },
  {
    id: '10_by_language',
    number: 10,
    title: 'تقرير التوعية حسب اللغات والجنسيات',
    subtitle: 'توزيع الحجاج ومستوى الإنجاز التوعوي حسب اللغة والجنسية',
  },
  {
    id: '11_daily_weekly_final',
    number: 11,
    title: 'التقرير اليومي والأسبوعي والنهائي لقياس الأثر التوعوي',
    subtitle: 'التقرير التنفيذي الختامي لمؤشرات الأداء والأثر المعرفي والشرعي',
  },
];

interface ReligiousReportsViewProps {
  activePilgrims: Pilgrim[];
  programs: AwarenessProgram[];
  lessons: ReligiousLesson[];
  attendance: LessonAttendanceRecord[];
  pilgrimProgressMap: Record<string, PilgrimEducationalProgress>;
  guides: ReligiousGuide[];
  inquiries: ShariaInquiry[];
  fiqhSections?: FiqhSection[];
  onPrintReport: (
    title: string,
    columns: string[],
    data: (string | number)[][],
    summaryCards?: { label: string; value: string | number }[],
    subtitle?: string
  ) => void;
}

export const ReligiousReportsView: React.FC<ReligiousReportsViewProps> = ({
  activePilgrims,
  programs,
  lessons,
  attendance,
  pilgrimProgressMap,
  guides,
  inquiries,
  fiqhSections = INITIAL_FIQH_SECTIONS,
  onPrintReport,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportTypeKey>('1_received_awareness');
  const [searchQuery, setSearchQuery] = useState('');

  const visibleFiqhSections = useMemo(
    () =>
      sortFiqhSections(fiqhSections.length > 0 ? fiqhSections : INITIAL_FIQH_SECTIONS).filter(
        (s) => s.isVisible
      ),
    [fiqhSections]
  );

  const activeReportMeta =
    REPORT_CATALOG.find((r) => r.id === selectedReport) || REPORT_CATALOG[0];

  // Dynamically generate columns, rows, and summary cards for the selected report
  const generatedReport = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (selectedReport === '1_received_awareness') {
      const cols = [
        '#',
        'اسم الحاج',
        'رقم الهوية',
        'الجوال',
        'الحملة / المجموعة',
        'الدروس المكتملة',
        'المسائل المجتازة',
        'نتيجة الاختبار البعدي',
      ];
      const list = activePilgrims.filter((p) => {
        const pr = pilgrimProgressMap[p.id || p.nationalId];
        return pr && pr.completedLessonIds.length > 0 && !pr.needsReeducation;
      });
      const rows = list
        .filter((p) => !q || getPilgrimDisplayName(p).toLowerCase().includes(q))
        .map((p, i) => {
          const pr = pilgrimProgressMap[p.id || p.nationalId];
          const mastered = pr
            ? Object.values(pr.fiqhIssuesMastery).filter((s) => s === 'اجتاز التقييم').length
            : 0;
          return [
            i + 1,
            getPilgrimDisplayName(p),
            p.nationalId,
            p.mobile,
            `${getPilgrimCampaignLabel(p)} / ${getPilgrimGroupLabel(p)}`,
            `${pr?.completedLessonIds.length || 0} دروس`,
            `${mastered} / 14 مسألة`,
            `${pr?.postTestScore ?? 85}%`,
          ];
        });
      return {
        columns: cols,
        rows,
        summaryCards: [
          { label: 'إجمالي الحجاج الموعين بالكامل', value: rows.length },
          {
            label: 'نسبة التغطية من إجمالي الحجاج',
            value: `${
              activePilgrims.length > 0 ? Math.round((rows.length / activePilgrims.length) * 100) : 0
            }%`,
          },
        ],
      };
    }

    if (selectedReport === '2_not_received_awareness') {
      const cols = [
        '#',
        'اسم الحاج',
        'رقم الهوية',
        'الجوال',
        'الحملة / المجموعة',
        'الدروس المكتملة',
        'المسائل التي تحتاج مراجعة',
        'السبب / الإجراء المطلوب',
      ];
      const list = activePilgrims.filter((p) => {
        const pr = pilgrimProgressMap[p.id || p.nationalId];
        return !pr || pr.completedLessonIds.length === 0 || pr.needsReeducation;
      });
      const rows = list
        .filter((p) => !q || getPilgrimDisplayName(p).toLowerCase().includes(q))
        .map((p, i) => {
          const pr = pilgrimProgressMap[p.id || p.nationalId];
          const reviewIssues = pr
            ? visibleFiqhSections
                .filter(
                  (sec) =>
                    getPilgrimSectionMastery(pr, sec) === 'يحتاج إلى مراجعة وإعادة توعية'
                )
                .map((sec) => sec.name)
            : [];
          return [
            i + 1,
            getPilgrimDisplayName(p),
            p.nationalId,
            p.mobile,
            `${getPilgrimCampaignLabel(p)} / ${getPilgrimGroupLabel(p)}`,
            `${pr?.completedLessonIds.length || 0} دروس`,
            reviewIssues.slice(0, 2).join('، ') || 'لم يكمل التقييم',
            'جلسة إعادة توعية وتذكير عبر الإشعارات',
          ];
        });
      return {
        columns: cols,
        rows,
        summaryCards: [
          { label: 'يحتاجون إلى استكمال التوعية', value: rows.length },
          { label: 'إجمالي الحجاج', value: activePilgrims.length },
        ],
      };
    }

    if (selectedReport === '3_attendance_absence') {
      const cols = [
        '#',
        'اسم الحاج',
        'رقم الهوية',
        'المجموعة',
        'عدد مرات الحضور',
        'عدد مرات الغياب',
        'نسبة الالتزام بالحضور',
      ];
      const totalLessonsCount = Math.max(1, lessons.length);
      const rows = activePilgrims
        .filter((p) => !q || getPilgrimDisplayName(p).toLowerCase().includes(q))
        .map((p, i) => {
          const pr = pilgrimProgressMap[p.id || p.nationalId];
          const attended = pr?.completedLessonIds.length || 0;
          const absent = Math.max(0, totalLessonsCount - attended);
          const pct = Math.round((attended / totalLessonsCount) * 100);
          return [
            i + 1,
            getPilgrimDisplayName(p),
            p.nationalId,
            getPilgrimGroupLabel(p),
            attended,
            absent,
            `${pct}%`,
          ];
        });
      return {
        columns: cols,
        rows,
        summaryCards: [
          { label: 'إجمالي الحجاج', value: rows.length },
          { label: 'إجمالي الدروس المقررة', value: lessons.length },
        ],
      };
    }

    if (selectedReport === '4_lesson_attendance') {
      const cols = [
        '#',
        'عنوان الدرس / المحاضرة',
        'الباب الفقهي',
        'المرشد المسؤول',
        'التاريخ والوقت',
        'الحالة',
        'رمز QR',
        'الحاضرون',
        'الغائبون',
        'نسبة الحضور',
      ];
      const rows = lessons.map((l, i) => {
        const presentCount = activePilgrims.filter((p) => {
          const pid = p.id || p.nationalId;
          const rec = attendance.find(
            (a) => a.lessonId === l.id && (a.pilgrimId === pid || a.nationalId === p.nationalId)
          );
          const pr = pilgrimProgressMap[pid];
          return rec?.status === 'حاضر' || (!rec && pr?.completedLessonIds.includes(l.id));
        }).length;
        const absentCount = Math.max(0, activePilgrims.length - presentCount);
        const pct =
          activePilgrims.length > 0 ? Math.round((presentCount / activePilgrims.length) * 100) : 0;
        return [
          i + 1,
          l.title,
          l.category,
          l.guideName,
          `${l.date} (${l.startTime})`,
          l.status,
          l.qrCodeToken,
          presentCount,
          absentCount,
          `${pct}%`,
        ];
      });
      return {
        columns: cols,
        rows,
        summaryCards: [
          { label: 'إجمالي الدروس', value: lessons.length },
          {
            label: 'الدروس المكتملة',
            value: lessons.filter((l) => l.status === 'مكتمل').length,
          },
        ],
      };
    }

    if (selectedReport === '5_programs_completion') {
      const cols = [
        '#',
        'اسم البرنامج التعليمي',
        'المرحلة',
        'الباب الفقهي',
        'عدد الدروس',
        'الحجاج الملتحقون',
        'الحجاج المكملون',
        'نسبة الإنجاز',
      ];
      const rows = programs.map((prog, i) => {
        const enrolled = activePilgrims.filter((p) =>
          pilgrimProgressMap[p.id || p.nationalId]?.enrolledProgramIds.includes(prog.id)
        ).length;
        const completed = activePilgrims.filter((p) =>
          pilgrimProgressMap[p.id || p.nationalId]?.completedProgramIds.includes(prog.id)
        ).length;
        const pct = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;
        return [
          i + 1,
          prog.title,
          prog.phase,
          prog.topicCategory,
          prog.lessonIds.length,
          enrolled,
          completed,
          `${pct}%`,
        ];
      });
      return {
        columns: cols,
        rows,
        summaryCards: [{ label: 'إجمالي البرامج التوعوية', value: programs.length }],
      };
    }

    if (selectedReport === '6_exam_results') {
      const cols = [
        '#',
        'اسم الحاج',
        'رقم الهوية',
        'المجموعة',
        'درجة الاختبار القبلي',
        'درجة الاختبار البعدي',
        'نسبة التحسن المعرفي',
        'حالة الاجتياز',
      ];
      const rows = activePilgrims.map((p, i) => {
        const pr = pilgrimProgressMap[p.id || p.nationalId];
        const pre = pr?.preTestScore ?? 60;
        const post = pr?.postTestScore ?? 84;
        return [
          i + 1,
          getPilgrimDisplayName(p),
          p.nationalId,
          getPilgrimGroupLabel(p),
          `${pre}%`,
          `${post}%`,
          `+${post - pre}%`,
          post >= 75 ? 'ناجح ومجتاز' : 'يحتاج إعادة تقييم',
        ];
      });
      return {
        columns: cols,
        rows,
        summaryCards: [{ label: 'إجمالي المختبرين', value: rows.length }],
      };
    }

    if (selectedReport === '7_fiqh_issues_review') {
      const cols = [
        '#',
        'الباب / المسألة الفقهية',
        'اجتاز التقييم',
        'أكمل المادة التعليمية',
        'بدأ التعلم',
        'يحتاج إلى مراجعة وإعادة توعية',
        'نسبة الإتقان الفعلي',
      ];
      const rows = visibleFiqhSections.map((sec, i) => {
        let passed = 0;
        let completedMat = 0;
        let started = 0;
        let needsRev = 0;
        activePilgrims.forEach((p) => {
          const st = getPilgrimSectionMastery(pilgrimProgressMap[p.id || p.nationalId], sec);
          if (st === 'اجتاز التقييم') passed++;
          else if (st === 'أكمل المادة التعليمية') completedMat++;
          else if (st === 'بدأ التعلم') started++;
          else if (st === 'يحتاج إلى مراجعة وإعادة توعية') needsRev++;
        });
        const pct =
          activePilgrims.length > 0 ? Math.round((passed / activePilgrims.length) * 100) : 0;
        return [
          i + 1,
          resolveFiqhSectionName(sec.id, fiqhSections),
          passed,
          completedMat,
          started,
          needsRev,
          `${pct}%`,
        ];
      });
      return {
        columns: cols,
        rows,
        summaryCards: [
          { label: 'إجمالي الأبواب الفقهية النشطة', value: visibleFiqhSections.length },
        ],
      };
    }

    if (selectedReport === '8_guides_performance') {
      const cols = [
        '#',
        'اسم المرشد الديني',
        'التخصص الشرعي',
        'المجموعات المكلف بها',
        'الحجاج المسندون',
        'أتموا التعليم',
        'أتموا التطويف',
        'الدروس المنفذة',
        'التقارير اليومية',
        'التقييم العام',
      ];
      let totalAssignedAll = 0;
      const rows = guides.map((g, i) => {
        const gLessons = lessons.filter((l) => l.guideId === g.id);
        const stats = computeGuideAssignedStats(g, activePilgrims, pilgrimProgressMap);
        totalAssignedAll += stats.totalAssigned;
        return [
          i + 1,
          g.name,
          g.specialization,
          g.assignedGroups.join('، ') || 'غير محدد',
          stats.totalAssigned,
          `${stats.completedEducationCount} (${stats.educationCompletionPercent}%)`,
          `${stats.completedTawafCount} (${stats.tawafCompletionPercent}%)`,
          `${gLessons.filter((l) => l.status === 'مكتمل').length} / ${gLessons.length}`,
          g.dailyReports.length,
          `${g.rating} / 5`,
        ];
      });
      return {
        columns: cols,
        rows,
        summaryCards: [
          { label: 'إجمالي المرشدين الدينيين', value: guides.length },
          { label: 'إجمالي الحجاج المسندين للمرشدين', value: totalAssignedAll },
        ],
      };
    }

    if (selectedReport === '9_by_campaign_group') {
      const cols = [
        '#',
        'المجموعة (الحافلة / رحلة الطيران)',
        'الحملة / الباقة',
        'إجمالي حجاج المجموعة',
        'حضروا الدروس',
        'أكملوا البرامج',
        'يحتاجون إعادة توعية',
        'نسبة التوعية بالمجموعة',
      ];
      const groupMap = new Map<string, Pilgrim[]>();
      activePilgrims.forEach((p) => {
        const grp = getPilgrimGroupLabel(p);
        groupMap.set(grp, [...(groupMap.get(grp) || []), p]);
      });
      const rows = Array.from(groupMap.entries()).map(([grp, list], i) => {
        const camp = list[0] ? getPilgrimCampaignLabel(list[0]) : 'عام';
        let attended = 0;
        let completed = 0;
        let reeduc = 0;
        list.forEach((p) => {
          const pr = pilgrimProgressMap[p.id || p.nationalId];
          if (pr && pr.completedLessonIds.length > 0) attended++;
          if (pr && pr.completedProgramIds.length > 0) completed++;
          if (pr?.needsReeducation) reeduc++;
        });
        const pct = list.length > 0 ? Math.round((attended / list.length) * 100) : 0;
        return [i + 1, grp, camp, list.length, attended, completed, reeduc, `${pct}%`];
      });
      return {
        columns: cols,
        rows,
        summaryCards: [{ label: 'عدد المجموعات والحافلات', value: rows.length }],
      };
    }

    if (selectedReport === '10_by_language') {
      const cols = [
        '#',
        'اللغة / الجنسية',
        'عدد الحجاج',
        'حضروا الدروس',
        'اجتازوا الاختبارات',
        'نسبة الإنجاز اللغوي',
      ];
      const langMap = new Map<string, Pilgrim[]>();
      activePilgrims.forEach((p) => {
        const key = `${
          pilgrimProgressMap[p.id || p.nationalId]?.preferredLanguage || 'العربية'
        } (${p.nationality || 'سعودي'})`;
        langMap.set(key, [...(langMap.get(key) || []), p]);
      });
      const rows = Array.from(langMap.entries()).map(([langKey, list], i) => {
        const attended = list.filter(
          (p) => (pilgrimProgressMap[p.id || p.nationalId]?.completedLessonIds.length || 0) > 0
        ).length;
        const passed = list.filter(
          (p) => (pilgrimProgressMap[p.id || p.nationalId]?.postTestScore || 80) >= 75
        ).length;
        const pct = list.length > 0 ? Math.round((passed / list.length) * 100) : 0;
        return [i + 1, langKey, list.length, attended, passed, `${pct}%`];
      });
      return {
        columns: cols,
        rows,
        summaryCards: [{ label: 'عدد الفئات اللغوية والجنسيات', value: rows.length }],
      };
    }

    // 11_daily_weekly_final
    const cols = ['#', 'المؤشر القياسي للتوعية والإرشاد الديني', 'القيمة المسجلة', 'الحالة والتقييم'];
    const totalP = activePilgrims.length;
    const attendedP = activePilgrims.filter(
      (p) => (pilgrimProgressMap[p.id || p.nationalId]?.completedLessonIds.length || 0) > 0
    ).length;
    const rows: (string | number)[][] = [
      [1, 'إجمالي الحجاج المشمولين بخطة التوعية', totalP, 'مشمولون بالكامل'],
      [2, 'إجمالي البرامج التعليمية (قبل وأثناء الحج)', programs.length, 'مفعّلة'],
      [3, 'إجمالي الدروس والمحاضرات المجدولة والمنفذة', lessons.length, 'منظمة بتقويم ورمز QR'],
      [4, 'عدد الحجاج الذين حضروا الدروس التوعوية', attendedP, 'موثق بسجل الحضور'],
      [
        5,
        'عدد الاستفسارات الشرعية المعتمدة والمجاب عليها',
        inquiries.filter((x) => x.isApproved).length,
        'معتمدة من المسؤول المخول',
      ],
      [6, 'عدد المرشدين والمرشدات العاملين بالميدان', guides.length, 'نشطون'],
    ];
    return {
      columns: cols,
      rows,
      summaryCards: [
        { label: 'إجمالي الحجاج', value: totalP },
        { label: 'البرامج', value: programs.length },
        { label: 'الدروس', value: lessons.length },
        { label: 'المرشدون', value: guides.length },
      ],
    };
  }, [
    selectedReport,
    activePilgrims,
    pilgrimProgressMap,
    lessons,
    attendance,
    programs,
    guides,
    inquiries,
    searchQuery,
    visibleFiqhSections,
    fiqhSections,
  ]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* 11 Reports Selector Grid */}
      <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <span>منظومة التقارير الـ 11 وقياس الأثر التوعوي والشرعي</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            اختر التقرير المطلوب لمعاينته مباشرة وتصديره إلى ملف Excel (CSV) أو طباعته رسمياً بصيغة PDF
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {REPORT_CATALOG.map((rep) => (
            <button
              key={rep.id}
              type="button"
              onClick={() => setSelectedReport(rep.id)}
              className={`text-right p-3.5 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                selectedReport === rep.id
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                  : 'bg-[#10192D] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-lg text-xs font-mono font-black flex items-center justify-center shrink-0 ${
                  selectedReport === rep.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {rep.number}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-black truncate">{rep.title}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{rep.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Report Toolbar & Preview Table */}
      <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-400">
              التقرير رقم ({activeReportMeta.number} من 11)
            </span>
            <h4 className="text-base sm:text-lg font-black text-white mt-0.5">
              {activeReportMeta.title}
            </h4>
            <p className="text-xs text-slate-400">{activeReportMeta.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="تصفية داخل التقرير..."
                className="w-full bg-[#10192D] border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                exportReligiousReportCSV(
                  activeReportMeta.title.replace(/\s+/g, '_'),
                  generatedReport.columns,
                  generatedReport.rows,
                  generatedReport.summaryCards,
                  activeReportMeta.title,
                  activeReportMeta.subtitle
                )
              }
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel ({generatedReport.rows.length})</span>
            </button>

            <button
              type="button"
              onClick={() =>
                openAlQaemExcelCustomizer({
                  reportTitle: activeReportMeta.title,
                  subtitle: activeReportMeta.subtitle,
                  category: 'منظومة الإرشاد الديني والتوعية',
                  filename: `${activeReportMeta.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
                  columns: generatedReport.columns,
                  rows: generatedReport.rows,
                  summaryCards: generatedReport.summaryCards,
                })
              }
              className="px-3.5 py-2.5 rounded-xl bg-[#10192D] hover:bg-slate-800 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
              title="اختيار أعمدة محددة أو إعادة ترتيبها قبل تصدير ملف Excel"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>تخصيص أعمدة Excel</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onPrintReport(
                  activeReportMeta.title,
                  generatedReport.columns,
                  generatedReport.rows,
                  generatedReport.summaryCards,
                  activeReportMeta.subtitle
                )
              }
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة رسمية / PDF</span>
            </button>
          </div>
        </div>

        {/* Report Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-[#10192D] border-b border-slate-800 text-slate-200 font-bold">
              <tr>
                {generatedReport.columns.map((col, i) => (
                  <th key={i} className="px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {generatedReport.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#10192D]/60 transition">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`px-4 py-3 ${cIdx === 1 ? 'font-black text-white' : ''}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {generatedReport.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={generatedReport.columns.length}
                    className="py-12 text-center text-slate-400"
                  >
                    لا توجد سجلات مطابقة في هذا التقرير حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
