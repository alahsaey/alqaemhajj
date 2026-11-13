import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  ShieldCheck,
  EyeOff,
  Plus,
  CheckCircle2,
  Send,
  FileSpreadsheet,
  Search,
  MessageSquare,
  Sparkles,
  Users,
  Phone,
  Mail,
  Star,
  History,
  Archive,
  ArrowUpRight,
  Trash2,
  Edit3,
  AlertTriangle,
  FileText,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  ClipboardCheck,
  Eye,
  ChevronRight,
  CheckSquare,
  Calendar,
} from 'lucide-react';
import { Pilgrim } from '../../types';
import {
  FiqhMasteryStatus,
  FiqhSection,
  PilgrimEducationStatus,
  PilgrimEducationalProgress,
  PilgrimGuideFollowUp,
  PilgrimTawafStatus,
  ReligiousGuide,
  ReligiousLesson,
  ReligiousReferenceMaterial,
  ShariaInquiry,
} from '../../types/religiousGuidance';
import {
  FIQH_MASTERY_STATUSES,
  INITIAL_FIQH_SECTIONS,
  PRE_HAJJ_14_TOPICS,
} from '../../data/religiousGuidanceData';
import {
  computeGuideAssignedStats,
  exportReligiousReportCSV,
  getDefaultGuideFollowUp,
  getPilgrimCampaignLabel,
  getPilgrimDisplayName,
  getPilgrimFileNumber,
  getPilgrimGroupLabel,
  getPilgrimSectionMastery,
  setPilgrimSectionMastery,
  sortFiqhSections,
} from '../../lib/religiousGuidanceDb';
import { GuidePilgrimsPdfModal } from './GuidePilgrimsPdfModal';

interface LibraryInquiriesGuidesProps {
  mode: 'referencesAndContent' | 'shariaInquiries' | 'guidesManagement';
  activePilgrims: Pilgrim[];
  pilgrimProgressMap: Record<string, PilgrimEducationalProgress>;
  fiqhSections?: FiqhSection[];
  references: ReligiousReferenceMaterial[];
  inquiries: ShariaInquiry[];
  guides: ReligiousGuide[];
  lessons: ReligiousLesson[];
  currentStaffName: string;
  canEdit: boolean;
  canApproveSharia: boolean;
  initialRefSubTab?: 'library' | 'marjiRoster';
  onSaveReference: (ref: ReligiousReferenceMaterial) => Promise<void>;
  onSaveInquiry: (inq: ShariaInquiry) => Promise<void>;
  onSaveGuide: (guide: ReligiousGuide) => Promise<void>;
  onDeleteGuide: (id: string) => Promise<void>;
  onSaveLesson: (lesson: ReligiousLesson) => Promise<void>;
  onSavePilgrimProgress: (progress: PilgrimEducationalProgress) => Promise<void>;
  onAssignPilgrimsToGuide: (
    targetGuide: ReligiousGuide,
    pilgrimsToAssign: Pilgrim[]
  ) => Promise<{ assignedCount: number; transferredCount: number }>;
  onUnassignPilgrimFromGuide: (pilgrim: Pilgrim, guide: ReligiousGuide) => Promise<void>;
  onSavePilgrimGuideFollowUp: (
    pilgrim: Pilgrim,
    guide: ReligiousGuide,
    nextFollowUp: PilgrimGuideFollowUp,
    actionSummary: string
  ) => Promise<void>;
  onSendNotification: (params: {
    title: string;
    body: string;
    targetType: 'all' | 'package' | 'bus' | 'flight' | 'gender' | 'individual';
    targetValue?: string;
    auditActionLabel: string;
  }) => Promise<string>;
}

export const ReligiousLibraryInquiriesGuides: React.FC<LibraryInquiriesGuidesProps> = ({
  mode,
  activePilgrims,
  pilgrimProgressMap,
  fiqhSections = INITIAL_FIQH_SECTIONS,
  references,
  inquiries,
  guides,
  lessons,
  currentStaffName,
  canEdit,
  canApproveSharia,
  initialRefSubTab = 'library',
  onSaveReference,
  onSaveInquiry,
  onSaveGuide,
  onDeleteGuide,
  onSaveLesson,
  onSavePilgrimProgress,
  onAssignPilgrimsToGuide,
  onUnassignPilgrimFromGuide,
  onSavePilgrimGuideFollowUp,
  onSendNotification,
}) => {
  const visibleFiqhSections = useMemo(
    () =>
      sortFiqhSections(fiqhSections.length > 0 ? fiqhSections : INITIAL_FIQH_SECTIONS).filter(
        (s) => s.isVisible
      ),
    [fiqhSections]
  );

  // Unit 8 State (Sharia Library + Preserved Marji Roster)
  const [refSubTab, setRefSubTab] = useState<'library' | 'marjiRoster'>(initialRefSubTab);
  const [marjiFilter, setMarjiFilter] = useState<string>('all');
  const [marjiSearch, setMarjiSearch] = useState<string>('');
  const [isNewRefModalOpen, setIsNewRefModalOpen] = useState(false);
  const [refForm, setRefForm] = useState<ReligiousReferenceMaterial>({
    id: '',
    title: '',
    category: PRE_HAJJ_14_TOPICS[0],
    materialType: 'كتاب شرعي',
    relatedFiqhIssue: '',
    language: 'العربية',
    summary: '',
    contentOrUrl: '',
    approvedByAuthority: 'اللجنة الشرعية العليا - قافلة القائم',
    approvedByPerson: currentStaffName,
    isApproved: false,
    version: 'v1.0',
    versionHistory: [],
    createdAt: new Date().toISOString().split('T')[0],
  });

  // Unit 9 State (Sharia Inquiries)
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<string>('all');
  const [isNewInquiryModalOpen, setIsNewInquiryModalOpen] = useState(false);
  const [selectedPilgrimIdForInq, setSelectedPilgrimIdForInq] = useState<string>(
    activePilgrims[0]?.id || activePilgrims[0]?.nationalId || ''
  );
  const [newInqQuestion, setNewInqQuestion] = useState('');
  const [newInqCategory, setNewInqCategory] = useState<string>(PRE_HAJJ_14_TOPICS[0]);
  const [newInqGuideId, setNewInqGuideId] = useState<string>(guides[0]?.id || 'guide-1');
  const [answerDraftMap, setAnswerDraftMap] = useState<Record<string, string>>({});

  // Unit 10 State (Guides Management & Pilgrim Assignments)
  const [selectedGuideIdForDetails, setSelectedGuideIdForDetails] = useState<string | null>(null);
  const [pdfModalGuideId, setPdfModalGuideId] = useState<string | null>(null);
  const [isNewGuideModalOpen, setIsNewGuideModalOpen] = useState(false);
  const [isEditingGuide, setIsEditingGuide] = useState(false);
  const [guideToDelete, setGuideToDelete] = useState<ReligiousGuide | null>(null);
  const [guideForm, setGuideForm] = useState<ReligiousGuide>({
    id: '',
    name: '',
    phone: '',
    email: '',
    specialization: '',
    languages: ['العربية'],
    assignedCampaigns: ['جميع الحملات'],
    assignedGroups: ['جميع المجموعات'],
    assignedPilgrimIds: [],
    status: 'نشط',
    rating: 5.0,
    pilgrimsEducatedCount: 0,
    dailyReports: [],
    createdAt: new Date().toISOString().split('T')[0],
  });
  const [dailyReportGuideId, setDailyReportGuideId] = useState<string | null>(null);
  const [dailyReportText, setDailyReportText] = useState('');

  // Guide Details Assigned Pilgrims Search & Filter State
  const [guidePilgrimNameSearch, setGuidePilgrimNameSearch] = useState('');
  const [guidePilgrimFileSearch, setGuidePilgrimFileSearch] = useState('');
  const [guidePilgrimGroupFilter, setGuidePilgrimGroupFilter] = useState('all');
  const [guidePilgrimEduFilter, setGuidePilgrimEduFilter] = useState('all');

  // Bulk / Individual Pilgrim Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetGuideId, setAssignTargetGuideId] = useState<string>('');
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [assignGroupFilter, setAssignGroupFilter] = useState('all');
  const [assignStateFilter, setAssignStateFilter] = useState<'all' | 'unassigned' | 'other_guide'>(
    'unassigned'
  );
  const [selectedPilgrimKeysToAssign, setSelectedPilgrimKeysToAssign] = useState<string[]>([]);
  const [allowTransferFromOtherGuide, setAllowTransferFromOtherGuide] = useState(false);

  // Transfer Single Pilgrim Modal State
  const [pilgrimToTransfer, setPilgrimToTransfer] = useState<{
    pilgrim: Pilgrim;
    fromGuide: ReligiousGuide;
  } | null>(null);
  const [transferTargetGuideId, setTransferTargetGuideId] = useState<string>('');

  // Unassign Single Pilgrim Confirmation Modal State
  const [pilgrimToUnassign, setPilgrimToUnassign] = useState<{
    pilgrim: Pilgrim;
    guide: ReligiousGuide;
  } | null>(null);

  // Follow-up & Achievement Checklist Modal State (`سادساً: سجل المتابعة والإنجاز`)
  const [followUpModalTarget, setFollowUpModalTarget] = useState<{
    pilgrim: Pilgrim;
    guide: ReligiousGuide;
  } | null>(null);
  const [followUpDraft, setFollowUpDraft] = useState<PilgrimGuideFollowUp>(
    getDefaultGuideFollowUp()
  );

  // Direct Pilgrim Profile Preview Modal State (`فتح ملف الحاج مباشرة`)
  const [viewingPilgrimProfile, setViewingPilgrimProfile] = useState<Pilgrim | null>(null);

  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const showMsg = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(null), 4500);
  };

  // Compute Real-Time Stats Map for All Guides strictly from database records
  const guideStatsMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeGuideAssignedStats>> = {};
    guides.forEach((g) => {
      map[g.id] = computeGuideAssignedStats(g, activePilgrims, pilgrimProgressMap);
    });
    return map;
  }, [guides, activePilgrims, pilgrimProgressMap]);

  // Overall Assignment Summary across all activePilgrims
  const overallAssignmentSummary = useMemo(() => {
    let assignedCount = 0;
    const validGuideIds = new Set(guides.map((g) => g.id));
    activePilgrims.forEach((p) => {
      const pid = p.id || p.nationalId;
      const pr =
        pilgrimProgressMap[pid] || (p.nationalId ? pilgrimProgressMap[p.nationalId] : undefined);
      if (pr?.assignedGuideId && validGuideIds.has(pr.assignedGuideId)) {
        assignedCount++;
      }
    });
    const unassignedCount = Math.max(0, activePilgrims.length - assignedCount);
    const coveragePercent =
      activePilgrims.length > 0 ? Math.round((assignedCount / activePilgrims.length) * 100) : 0;
    return {
      totalPilgrims: activePilgrims.length,
      assignedCount,
      unassignedCount,
      coveragePercent,
    };
  }, [activePilgrims, pilgrimProgressMap, guides]);

  // Unique Groups / Campaigns for Filters
  const allGroupsList = useMemo(() => {
    const s = new Set<string>();
    activePilgrims.forEach((p) => {
      s.add(getPilgrimGroupLabel(p));
      s.add(getPilgrimCampaignLabel(p));
    });
    return Array.from(s).filter(Boolean);
  }, [activePilgrims]);

  // Unique Marjis from activePilgrims
  const uniqueMarjis = useMemo(() => {
    return Array.from(
      new Set(activePilgrims.map((p) => (p.currentMarji || 'غير محدد').trim()).filter(Boolean))
    );
  }, [activePilgrims]);

  const marjiFilteredPilgrims = useMemo(() => {
    return activePilgrims.filter((p) => {
      const m = (p.currentMarji || 'غير محدد').trim();
      if (marjiFilter !== 'all' && m !== marjiFilter) return false;
      if (marjiSearch.trim()) {
        const q = marjiSearch.trim().toLowerCase();
        const name = getPilgrimDisplayName(p).toLowerCase();
        if (
          !name.includes(q) &&
          !(p.mobile || '').includes(q) &&
          !m.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activePilgrims, marjiFilter, marjiSearch]);

  // Selected Guide for Details View
  const selectedGuideForDetails = useMemo(
    () => guides.find((g) => g.id === selectedGuideIdForDetails) || null,
    [guides, selectedGuideIdForDetails]
  );

  const selectedGuideStats = useMemo(() => {
    if (!selectedGuideForDetails) return null;
    return guideStatsMap[selectedGuideForDetails.id] || null;
  }, [selectedGuideForDetails, guideStatsMap]);

  // Filtered Assigned Pilgrims inside Selected Guide Details View
  const filteredAssignedItemsForGuide = useMemo(() => {
    if (!selectedGuideStats) return [];
    return selectedGuideStats.assignedItems.filter((item) => {
      const p = item.pilgrim;
      const flw = item.followUp;
      const nameStr = getPilgrimDisplayName(p).toLowerCase();
      const fileNoStr = getPilgrimFileNumber(p).toLowerCase();
      const natIdStr = (p.nationalId || '').toLowerCase();
      const grp = getPilgrimGroupLabel(p);
      const camp = getPilgrimCampaignLabel(p);

      if (
        guidePilgrimNameSearch.trim() &&
        !nameStr.includes(guidePilgrimNameSearch.trim().toLowerCase())
      ) {
        return false;
      }

      if (guidePilgrimFileSearch.trim()) {
        const qf = guidePilgrimFileSearch.trim().toLowerCase();
        if (!fileNoStr.includes(qf) && !natIdStr.includes(qf) && !(p.mobile || '').includes(qf)) {
          return false;
        }
      }

      if (
        guidePilgrimGroupFilter !== 'all' &&
        grp !== guidePilgrimGroupFilter &&
        camp !== guidePilgrimGroupFilter
      ) {
        return false;
      }

      if (guidePilgrimEduFilter === 'edu_done' && flw.educationStatus !== 'أتم التعليم') {
        return false;
      }
      if (guidePilgrimEduFilter === 'edu_remaining' && flw.educationStatus === 'أتم التعليم') {
        return false;
      }
      if (
        guidePilgrimEduFilter === 'tawaf_done' &&
        !flw.tawafCompleted &&
        flw.tawafStatus !== 'أتم التطويف'
      ) {
        return false;
      }
      if (
        guidePilgrimEduFilter === 'tawaf_remaining' &&
        (flw.tawafCompleted || flw.tawafStatus === 'أتم التطويف')
      ) {
        return false;
      }

      return true;
    });
  }, [
    selectedGuideStats,
    guidePilgrimNameSearch,
    guidePilgrimFileSearch,
    guidePilgrimGroupFilter,
    guidePilgrimEduFilter,
  ]);

  // Candidates for Bulk / Individual Assignment Modal
  const candidatePilgrimsForAssign = useMemo(() => {
    const validGuideIds = new Set(guides.map((g) => g.id));
    return activePilgrims.filter((p) => {
      const pid = p.id || p.nationalId;
      const pr =
        pilgrimProgressMap[pid] || (p.nationalId ? pilgrimProgressMap[p.nationalId] : undefined);
      const currentAssignedGuideId =
        pr?.assignedGuideId && validGuideIds.has(pr.assignedGuideId)
          ? pr.assignedGuideId
          : undefined;

      // Never list pilgrims already assigned to the target guide (prevents duplicate assignment)
      if (currentAssignedGuideId && currentAssignedGuideId === assignTargetGuideId) {
        return false;
      }

      if (assignStateFilter === 'unassigned' && currentAssignedGuideId) {
        return false;
      }
      if (assignStateFilter === 'other_guide' && !currentAssignedGuideId) {
        return false;
      }

      const grp = getPilgrimGroupLabel(p);
      const camp = getPilgrimCampaignLabel(p);
      if (assignGroupFilter !== 'all' && grp !== assignGroupFilter && camp !== assignGroupFilter) {
        return false;
      }

      if (assignSearchQuery.trim()) {
        const q = assignSearchQuery.trim().toLowerCase();
        const name = getPilgrimDisplayName(p).toLowerCase();
        const fileNo = getPilgrimFileNumber(p).toLowerCase();
        const nid = (p.nationalId || '').toLowerCase();
        const mob = (p.mobile || '').toLowerCase();
        if (!name.includes(q) && !fileNo.includes(q) && !nid.includes(q) && !mob.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [
    activePilgrims,
    pilgrimProgressMap,
    guides,
    assignTargetGuideId,
    assignStateFilter,
    assignGroupFilter,
    assignSearchQuery,
  ]);

  const openAssignModalForGuide = (guideId?: string) => {
    const targetId = guideId || selectedGuideIdForDetails || guides[0]?.id || '';
    setAssignTargetGuideId(targetId);
    setSelectedPilgrimKeysToAssign([]);
    setAssignSearchQuery('');
    setAssignGroupFilter('all');
    setAssignStateFilter('unassigned');
    setAllowTransferFromOtherGuide(false);
    setIsAssignModalOpen(true);
  };

  const openFollowUpModal = (pilgrim: Pilgrim, guide: ReligiousGuide) => {
    const pid = pilgrim.id || pilgrim.nationalId;
    const pr =
      pilgrimProgressMap[pid] ||
      (pilgrim.nationalId ? pilgrimProgressMap[pilgrim.nationalId] : undefined);
    setFollowUpDraft(getDefaultGuideFollowUp(pr?.guideFollowUp));
    setFollowUpModalTarget({ pilgrim, guide });
  };

  const handleToggleChecklistField = (
    fieldKey:
      | 'manasikEducated'
      | 'ihramExplained'
      | 'tawafSaiExplained'
      | 'followedUpDuringManasik'
      | 'tawafCompleted',
    dateKey:
      | 'manasikEducatedAt'
      | 'ihramExplainedAt'
      | 'tawafSaiExplainedAt'
      | 'followedUpDuringManasikAt'
      | 'tawafCompletedAt',
    checked: boolean
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const next: PilgrimGuideFollowUp = {
      ...followUpDraft,
      [fieldKey]: checked,
      [dateKey]: checked ? followUpDraft[dateKey] || today : undefined,
    };

    // Automatically synchronize educationStatus & tawafStatus from checklist items
    if (next.manasikEducated && next.ihramExplained && next.tawafSaiExplained) {
      next.educationStatus = 'أتم التعليم';
    } else if (
      next.manasikEducated ||
      next.ihramExplained ||
      next.tawafSaiExplained ||
      next.followedUpDuringManasik
    ) {
      next.educationStatus = 'قيد التعليم';
    } else {
      next.educationStatus = 'لم يتم تعليمه بعد';
    }

    if (fieldKey === 'tawafCompleted') {
      next.tawafStatus = checked ? 'أتم التطويف' : 'لم يتم تطويفه بعد';
    }

    setFollowUpDraft(next);
  };

  // Convert Recurring Question to Awareness Lesson
  const handleConvertInquiryToLesson = async (inq: ShariaInquiry) => {
    const newLesson: ReligiousLesson = {
      id: `lesson-from-inq-${Date.now()}`,
      title: `درس توعوي مستفاد من الأسئلة المتكررة: ${inq.category}`,
      category: inq.category,
      phase: inq.phase,
      lessonType: 'عام',
      description: `سؤال متكرر من الحجاج: "${inq.question}" — الجواب المعتمد: "${inq.answer || ''}"`,
      guideId: inq.assignedGuideId || guides[0]?.id || 'guide-1',
      guideName: inq.assignedGuideName || guides[0]?.name || 'المرشد الديني',
      date: new Date().toISOString().split('T')[0],
      startTime: '20:00',
      endTime: '21:00',
      location: 'القاعة الكبرى / بث توعوي',
      targetCampaign: inq.campaignName || 'جميع الحملات',
      targetGroup: inq.groupName || 'جميع المجموعات',
      targetPilgrimsCount: activePilgrims.length || 150,
      language: 'العربية',
      scientificMaterial: inq.answer || '',
      attachments: [],
      status: 'مجدول',
      qrCodeToken: `QR-INQ-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      notificationsEnabled: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    await onSaveLesson(newLesson);
    await onSaveInquiry({
      ...inq,
      isFrequentQuestion: true,
      convertedToLessonId: newLesson.id,
    });
    showMsg(`تم تحويل السؤال المتكرر إلى درس توعوي مجدول برمز QR (${newLesson.qrCodeToken}) بنجاح.`);
  };

  const pdfGuide = useMemo(
    () => (pdfModalGuideId ? guides.find((g) => g.id === pdfModalGuideId) || null : null),
    [guides, pdfModalGuideId]
  );

  return (
    <div className="space-y-6" dir="rtl">
      {bannerMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bannerMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            className="text-xs underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* UNIT 8: SHARIA REFERENCES & APPROVED CONTENT LIBRARY + MARJI ROSTER */}
      {mode === 'referencesAndContent' && (
        <div className="space-y-5">
          <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>المراجع والمحتوى الشرعي المعتمد وكشف مراجع التقليد</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                حوكمة المواد العلمية وحفظ سجل النسخ والاعتماد الرسمي (يُمنع إظهار أي محتوى غير معتمد للحجاج) + كشف مراجع التقليد للحجاج
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRefSubTab('library')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  refSubTab === 'library'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-[#10192D] text-slate-300 border border-slate-800'
                }`}
              >
                المكتبة الشرعية والمحتوى المعتمد ({references.length})
              </button>
              <button
                type="button"
                onClick={() => setRefSubTab('marjiRoster')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  refSubTab === 'marjiRoster'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-[#10192D] text-slate-300 border border-slate-800'
                }`}
              >
                كشف مراجع التقليد للحجاج ({activePilgrims.length})
              </button>

              {canEdit && refSubTab === 'library' && (
                <button
                  type="button"
                  onClick={() => {
                    setRefForm({
                      id: `ref-${Date.now()}`,
                      title: '',
                      category: visibleFiqhSections[0]?.name || PRE_HAJJ_14_TOPICS[0],
                      materialType: 'ملف PDF',
                      relatedFiqhIssue: '',
                      language: 'العربية',
                      summary: '',
                      contentOrUrl: '',
                      approvedByAuthority: 'اللجنة الشرعية العليا - قافلة القائم',
                      approvedByPerson: currentStaffName,
                      isApproved: false,
                      version: 'v1.0',
                      versionHistory: [
                        {
                          version: 'v1.0',
                          date: new Date().toISOString().split('T')[0],
                          updatedBy: currentStaffName,
                          changeNotes: 'إضافة المادة الأولية للمراجعة والاعتماد',
                        },
                      ],
                      createdAt: new Date().toISOString().split('T')[0],
                    });
                    setIsNewRefModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مرجع / مادة شرعية</span>
                </button>
              )}
            </div>
          </div>

          {refSubTab === 'library' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className={`bg-[#0B1221] border rounded-3xl p-5 flex flex-col justify-between space-y-4 ${
                    ref.isApproved ? 'border-slate-800' : 'border-amber-500/40 bg-amber-950/5'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold">
                        {ref.category} • {ref.materialType}
                      </span>
                      {ref.isApproved ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>معتمد ومتاح للحجاج ({ref.version})</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 text-xs font-black flex items-center gap-1">
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>مسودة غير معتمدة (محجوبة عن الحجاج)</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-black text-white">{ref.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{ref.summary}</p>

                    <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3 text-xs space-y-1">
                      <div>
                        <strong className="text-slate-400">المسألة الفقهية المرتبطة:</strong>{' '}
                        <span className="text-white">{ref.relatedFiqhIssue}</span>
                      </div>
                      <div>
                        <strong className="text-slate-400">جهة الاعتماد:</strong>{' '}
                        <span className="text-emerald-300">{ref.approvedByAuthority}</span>
                      </div>
                      <div>
                        <strong className="text-slate-400">اللغة:</strong>{' '}
                        <span className="text-amber-300">{ref.language}</span>
                      </div>
                    </div>

                    {ref.versionHistory.length > 0 && (
                      <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3 space-y-1">
                        <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                          <History className="w-3.5 h-3.5" />
                          <span>سجل النسخ والتحديثات:</span>
                        </span>
                        {ref.versionHistory.map((vh, i) => (
                          <div key={i} className="text-[11px] text-slate-300">
                            <span className="font-mono text-amber-300 font-bold">{vh.version}</span>{' '}
                            ({vh.date}): {vh.changeNotes}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <a
                      href={ref.contentOrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <span>فتح المادة العلمية / الرابط</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>

                    {canApproveSharia && (
                      <button
                        type="button"
                        onClick={async () => {
                          const nextApproved = !ref.isApproved;
                          await onSaveReference({
                            ...ref,
                            isApproved: nextApproved,
                            approvedByPerson: currentStaffName,
                            approvedByAuthority: nextApproved
                              ? 'اللجنة الشرعية العليا - قافلة القائم'
                              : 'قيد المراجعة الشرعية',
                          });
                          showMsg(
                            nextApproved
                              ? `تم اعتماد المادة "${ref.title}" وإتاحتها رسمياً للحجاج.`
                              : `تم إيقاف نشر المادة "${ref.title}" وحجبها عن الحجاج للمراجعة.`
                          );
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                          ref.isApproved
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-emerald-500 text-slate-950 shadow'
                        }`}
                      >
                        {ref.isApproved ? 'إلغاء الاعتماد وحجب المادة' : 'اعتماد المادة ونشرها للحجاج ✓'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMarjiFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    marjiFilter === 'all'
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-[#0B1221] text-slate-300 border-slate-800'
                  }`}
                >
                  جميع المراجع ({activePilgrims.length})
                </button>
                {uniqueMarjis.map((m) => {
                  const cnt = activePilgrims.filter(
                    (p) => (p.currentMarji || 'غير محدد').trim() === m
                  ).length;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMarjiFilter(m)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        marjiFilter === m
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-[#0B1221] text-slate-300 border-slate-800'
                      }`}
                    >
                      {m} ({cnt})
                    </button>
                  );
                })}
              </div>

              <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={marjiSearch}
                    onChange={(e) => setMarjiSearch(e.target.value)}
                    placeholder="بحث باسم الحاج، رقم الجوال، أو اسم المرجع..."
                    className="w-full bg-[#10192D] border border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const headers = ['# (م)', 'اسم الحاج', 'رقم الجوال', 'اسم المرجع'];
                    const rows = marjiFilteredPilgrims.map((p, i) => [
                      i + 1,
                      getPilgrimDisplayName(p),
                      p.mobile || '',
                      p.currentMarji || 'غير محدد',
                    ]);
                    exportReligiousReportCSV('كشف_المراجع_قافلة_القائم', headers, rows);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير كشف المراجع CSV ({marjiFilteredPilgrims.length})</span>
                </button>
              </div>

              <div className="bg-[#0B1221] border border-slate-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs text-slate-300">
                    <thead className="bg-[#10192D] border-b border-slate-800 font-bold">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">#</th>
                        <th className="px-5 py-3">اسم الحاج</th>
                        <th className="px-5 py-3">رقم الجوال</th>
                        <th className="px-5 py-3">مرجع التقليد الحالي</th>
                        <th className="px-5 py-3">المرجع السابق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {marjiFilteredPilgrims.map((p, idx) => (
                        <tr key={p.id || p.nationalId} className="hover:bg-[#10192D]/60">
                          <td className="px-4 py-3 text-center font-mono text-purple-400">
                            {idx + 1}
                          </td>
                          <td className="px-5 py-3 font-black text-white">
                            {getPilgrimDisplayName(p)}
                          </td>
                          <td className="px-5 py-3 font-mono" dir="ltr">
                            {p.mobile}
                          </td>
                          <td className="px-5 py-3">
                            <span className="px-3 py-1 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                              {p.currentMarji || 'غير محدد'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-400">
                            {p.previousMarji || 'لا يوجد'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UNIT 9: SHARIA INQUIRIES & FATWA WORKFLOW */}
      {mode === 'shariaInquiries' && (
        <div className="space-y-5">
          <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                <span>وحدة الاستفسارات الشرعية والفتاوى المعتمدة</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                استقبال أسئلة الحجاج، إحالتها للمرشد المختص، اعتماد الإجابة من المسؤول المخول، إرسالها عبر نظام الإشعارات، وتحويل الأسئلة المتكررة لدروس
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['all', 'جديد', 'بانتظار الاعتماد', 'معتمد ومنشور', 'مؤرشف'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setInquiryStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    inquiryStatusFilter === st
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-[#10192D] text-slate-300 border-slate-800'
                  }`}
                >
                  {st === 'all' ? `الكل (${inquiries.length})` : st}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsNewInquiryModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل استفسار شرعي جديد</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {inquiries
              .filter((i) => inquiryStatusFilter === 'all' || i.status === inquiryStatusFilter)
              .map((inq) => {
                const draftAns =
                  answerDraftMap[inq.id] !== undefined
                    ? answerDraftMap[inq.id]
                    : inq.answer || '';

                return (
                  <div
                    key={inq.id}
                    className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            inq.isApproved
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {inq.status}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs font-bold">
                          الباب: {inq.category}
                        </span>
                        <span className="text-xs font-black text-white">
                          السائل: {inq.pilgrimName} ({inq.groupName})
                        </span>
                        {inq.marjiName && (
                          <span className="text-[11px] text-slate-400">
                            • المرجع: {inq.marjiName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-400">{inq.createdAt}</span>
                    </div>

                    <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5">
                      <span className="text-[11px] font-bold text-amber-400 block mb-1">
                        نص الاستفسار الشرعي:
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                        {inq.question}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300">
                          إجابة المرشد المختص ({inq.assignedGuideName || 'لم يحدد'}):
                        </span>
                        {inq.isApproved && inq.approvedBy && (
                          <span className="text-emerald-400 font-bold">
                            ✓ معتمدة رسمياً من: {inq.approvedBy} ({inq.approvedAt})
                          </span>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        disabled={!canEdit}
                        value={draftAns}
                        onChange={(e) =>
                          setAnswerDraftMap({ ...answerDraftMap, [inq.id]: e.target.value })
                        }
                        placeholder="اكتب الإجابة الشرعية التفصيلية هنا ليتم عرضها على المسؤول المخول لاعتمادها..."
                        className="w-full bg-[#10192D] border border-slate-700 rounded-2xl p-3 text-xs text-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={async () => {
                              await onSaveInquiry({
                                ...inq,
                                answer: draftAns,
                                status: inq.isApproved ? 'معتمد ومنشور' : 'بانتظار الاعتماد',
                              });
                              showMsg('تم حفظ إجابة المرشد المختص (بانتظار الاعتماد الرسمي قبل النشر).');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                          >
                            حفظ مسودة الإجابة
                          </button>
                        )}

                        {canApproveSharia && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!draftAns.trim()) {
                                showMsg('يرجى كتابة نص الإجابة الشرعية أولاً قبل اعتمادها.');
                                return;
                              }
                              const notifId = await onSendNotification({
                                title: `الرد الشرعي المعتمد على استفساركم (${inq.category})`,
                                body: `السؤال: ${inq.question}\nالجواب المعتمد من لجنة الإرشاد الديني: ${draftAns}`,
                                targetType: 'individual',
                                targetValue: inq.nationalId,
                                auditActionLabel:
                                  'اعتماد إجابة استفسار شرعي وإرسالها للحاج عبر نظام الإشعارات',
                              });

                              await onSaveInquiry({
                                ...inq,
                                answer: draftAns,
                                isApproved: true,
                                status: 'معتمد ومنشور',
                                approvedBy: currentStaffName,
                                approvedAt: new Date().toISOString().split('T')[0],
                                notificationSentId: notifId,
                                notificationSentAt: new Date().toLocaleString('ar-SA'),
                              });

                              showMsg(
                                `تم اعتماد الإجابة الشرعية رسمياً وإرسالها للحاج (${inq.pilgrimName}) عبر نظام الإشعارات الحالي.`
                              );
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>اعتماد الإجابة وإرسالها للحاج عبر الإشعارات ✓</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleConvertInquiryToLesson(inq)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>تحويل السؤال المتكرر إلى درس توعوي</span>
                          </button>
                        )}
                        {canEdit && inq.status !== 'مؤرشف' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await onSaveInquiry({ ...inq, status: 'مؤرشف' });
                              showMsg('تمت أرشفة الاستفسار الشرعي وإجابته.');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>أرشفة</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* UNIT 10: RELIGIOUS GUIDES MANAGEMENT & PILGRIM ASSIGNMENT SYSTEM */}
      {mode === 'guidesManagement' && (
        <div className="space-y-6">
          {/* Top Executive Bar & Overall Pilgrim Assignment Summary */}
          <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>إدارة المرشدين الدينيين وإسناد الحجاج ومتابعة التعليم والتطويف</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ربط فعلي مباشر بقاعدة بيانات الحجاج المسجلين — احتساب تلقائي لأعداد الحجاج المسندين، متابعة التعليم والتطويف، وإصدار كشوف PDF الرسمية لكل مرشد
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {canEdit && guides.length > 0 && (
                  <button
                    type="button"
                    onClick={() => openAssignModalForGuide(selectedGuideIdForDetails || guides[0]?.id)}
                    className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-1.5 shadow cursor-pointer transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>إسناد وتوزيع الحجاج على المرشدين</span>
                  </button>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingGuide(false);
                      setGuideForm({
                        id: `guide-${Date.now()}`,
                        name: '',
                        phone: '',
                        email: '',
                        specialization: 'فقه المناسك والإرشاد الميداني',
                        languages: ['العربية'],
                        assignedCampaigns: ['جميع الحملات'],
                        assignedGroups: ['جميع المجموعات'],
                        assignedPilgrimIds: [],
                        status: 'نشط',
                        rating: 5.0,
                        pilgrimsEducatedCount: 0,
                        dailyReports: [],
                        createdAt: new Date().toISOString().split('T')[0],
                      });
                      setIsNewGuideModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة مرشد ديني جديد</span>
                  </button>
                )}
              </div>
            </div>

            {/* Real Database Assignment Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
              <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5">
                <span className="text-[11px] text-slate-400 font-bold block">
                  إجمالي المرشدين الدينيين
                </span>
                <strong className="text-xl font-black text-amber-400 font-mono mt-0.5 block">
                  {guides.length} مرشد
                </strong>
              </div>
              <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5">
                <span className="text-[11px] text-slate-400 font-bold block">
                  إجمالي الحجاج الفعليين بالنظام
                </span>
                <strong className="text-xl font-black text-white font-mono mt-0.5 block">
                  {overallAssignmentSummary.totalPilgrims} حاج
                </strong>
              </div>
              <div className="bg-[#10192D] border border-emerald-500/30 rounded-2xl p-3.5">
                <span className="text-[11px] text-emerald-300 font-bold block">
                  الحجاج المسندون لمرشدين فعلياً
                </span>
                <strong className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                  {overallAssignmentSummary.assignedCount} حاج ({overallAssignmentSummary.coveragePercent}%)
                </strong>
              </div>
              <div className="bg-[#10192D] border border-orange-500/30 rounded-2xl p-3.5">
                <span className="text-[11px] text-orange-300 font-bold block">
                  الحجاج بانتظار الإسناد لمرشد
                </span>
                <strong className="text-xl font-black text-orange-400 font-mono mt-0.5 block">
                  {overallAssignmentSummary.unassignedCount} حاج
                </strong>
              </div>
            </div>
          </div>

          {/* VIEW A: DETAILED SINGLE GUIDE PAGE (`صفحة تفاصيل المرشد — الحجاج المسؤول عن تعليمهم وتطويفهم`) */}
          {selectedGuideForDetails && selectedGuideStats ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Guide Profile & Dashboard Header */}
              <div className="bg-[#0B1221] border border-amber-500/40 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedGuideIdForDetails(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 mb-1 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>العودة إلى قائمة جميع المرشدين الدينيين</span>
                    </button>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        {selectedGuideForDetails.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                        {selectedGuideForDetails.status}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {selectedGuideForDetails.rating} / 5
                      </span>
                    </div>
                    <p className="text-xs font-bold text-amber-300">
                      {selectedGuideForDetails.specialization}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                      <span className="font-mono" dir="ltr">
                        📞 {selectedGuideForDetails.phone}
                      </span>
                      <span className="font-mono" dir="ltr">
                        ✉️ {selectedGuideForDetails.email}
                      </span>
                      <span>
                        اللغات: <strong>{selectedGuideForDetails.languages.join('، ')}</strong>
                      </span>
                      <span>
                        المجموعات المكلف بها:{' '}
                        <strong>{selectedGuideForDetails.assignedGroups.join('، ')}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Guide Page Primary Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openAssignModalForGuide(selectedGuideForDetails.id)}
                        className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-1.5 shadow cursor-pointer transition"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>إضافة / إسناد حجاج للمرشد</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setPdfModalGuideId(selectedGuideForDetails.id)}
                      className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow cursor-pointer transition"
                    >
                      <FileText className="w-4 h-4" />
                      <span>تصدير كشف الحجاج PDF ({selectedGuideStats.totalAssigned})</span>
                    </button>
                  </div>
                </div>

                {/* خامساً: لوحة معلومات المرشد الديني (7 Real-Time Statistical Indicators) */}
                <div>
                  <h4 className="text-xs font-black text-amber-400 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>
                      لوحة معلومات المرشد الديني (محتسبة تلقائياً من سجلات الحجاج الفعلية المسندين للمرشد)
                    </span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
                    <div className="bg-[#10192D] border border-amber-500/40 rounded-2xl p-3">
                      <span className="text-[10px] text-slate-400 font-bold block">
                        إجمالي الحجاج المسندين
                      </span>
                      <strong className="text-xl font-black text-amber-400 font-mono mt-1 block">
                        {selectedGuideStats.totalAssigned}
                      </strong>
                    </div>

                    <div className="bg-[#10192D] border border-emerald-500/30 rounded-2xl p-3">
                      <span className="text-[10px] text-slate-400 font-bold block">
                        أتموا التعليم
                      </span>
                      <strong className="text-xl font-black text-emerald-400 font-mono mt-1 block">
                        {selectedGuideStats.completedEducationCount}
                      </strong>
                    </div>

                    <div className="bg-[#10192D] border border-orange-500/30 rounded-2xl p-3">
                      <span className="text-[10px] text-slate-400 font-bold block">
                        المتبقي تعليمهم
                      </span>
                      <strong className="text-xl font-black text-orange-400 font-mono mt-1 block">
                        {selectedGuideStats.remainingEducationCount}
                      </strong>
                    </div>

                    <div className="bg-[#10192D] border border-sky-500/30 rounded-2xl p-3">
                      <span className="text-[10px] text-slate-400 font-bold block">
                        أتموا التطويف
                      </span>
                      <strong className="text-xl font-black text-sky-400 font-mono mt-1 block">
                        {selectedGuideStats.completedTawafCount}
                      </strong>
                    </div>

                    <div className="bg-[#10192D] border border-rose-500/30 rounded-2xl p-3">
                      <span className="text-[10px] text-slate-400 font-bold block">
                        المتبقي تطويفهم
                      </span>
                      <strong className="text-xl font-black text-rose-400 font-mono mt-1 block">
                        {selectedGuideStats.remainingTawafCount}
                      </strong>
                    </div>

                    <div className="bg-[#10192D] border border-emerald-500/40 rounded-2xl p-3">
                      <span className="text-[10px] text-slate-400 font-bold block">
                        نسبة الإنجاز في التعليم
                      </span>
                      <strong className="text-xl font-black text-emerald-300 font-mono mt-1 block">
                        {selectedGuideStats.educationCompletionPercent}%
                      </strong>
                    </div>

                    <div className="bg-[#10192D] border border-sky-500/40 rounded-2xl p-3 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 font-bold block">
                        نسبة الإنجاز في التطويف
                      </span>
                      <strong className="text-xl font-black text-sky-300 font-mono mt-1 block">
                        {selectedGuideStats.tawafCompletionPercent}%
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ثانياً: قسم الحجاج المسؤول عن تعليمهم وتطويفهم */}
              <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-amber-400 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <span>الحجاج المسؤول عن تعليمهم وتطويفهم ({selectedGuideStats.totalAssigned})</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      قائمة الحجاج المرتبطين فعلياً بالمرشد ({selectedGuideForDetails.name}) مع إمكانية البحث والفلترة ومتابعة الإنجاز ونقل أو إلغاء الإسناد
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openAssignModalForGuide(selectedGuideForDetails.id)}
                        className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>إضافة حاج إلى قائمة المرشد</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setPdfModalGuideId(selectedGuideForDetails.id)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>تصدير كشف الحجاج PDF</span>
                    </button>
                  </div>
                </div>

                {/* Search & Filter Bar for Guide's Pilgrims */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={guidePilgrimNameSearch}
                      onChange={(e) => setGuidePilgrimNameSearch(e.target.value)}
                      placeholder="البحث باسم الحاج..."
                      className="w-full bg-[#10192D] border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={guidePilgrimFileSearch}
                      onChange={(e) => setGuidePilgrimFileSearch(e.target.value)}
                      placeholder="البحث برقم الملف أو الهوية أو الجوال..."
                      className="w-full bg-[#10192D] border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <select
                      value={guidePilgrimGroupFilter}
                      onChange={(e) => setGuidePilgrimGroupFilter(e.target.value)}
                      className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    >
                      <option value="all">جميع المجموعات والقوافل</option>
                      {allGroupsList.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={guidePilgrimEduFilter}
                      onChange={(e) => setGuidePilgrimEduFilter(e.target.value)}
                      className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    >
                      <option value="all">جميع حالات التعليم والتطويف</option>
                      <option value="edu_done">أتموا التعليم</option>
                      <option value="edu_remaining">متبقي تعليمهم</option>
                      <option value="tawaf_done">أتموا التطويف</option>
                      <option value="tawaf_remaining">متبقي تطويفهم</option>
                    </select>
                  </div>
                </div>

                {/* Assigned Pilgrims Table */}
                <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                  <table className="w-full text-right text-xs text-slate-300">
                    <thead className="bg-[#10192D] border-b border-slate-800 text-slate-200 font-bold">
                      <tr>
                        <th className="px-3 py-3 text-center w-10">م</th>
                        <th className="px-4 py-3">اسم الحاج كاملاً</th>
                        <th className="px-3 py-3 text-center">رقم الحاج / الملف</th>
                        <th className="px-3 py-3 text-center">رقم الجوال</th>
                        <th className="px-3 py-3 text-center">المجموعة / القافلة</th>
                        <th className="px-3 py-3 text-center">حالة الحاج</th>
                        <th className="px-3 py-3 text-center">حالة إتمام التعليم</th>
                        <th className="px-3 py-3 text-center">حالة التطويف</th>
                        <th className="px-3 py-3 text-center">تاريخ الإسناد</th>
                        <th className="px-4 py-3 text-center">الإجراءات والمتابعة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredAssignedItemsForGuide.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-10 text-center text-slate-400 space-y-2">
                            <p className="font-bold text-white">
                              {selectedGuideStats.totalAssigned === 0
                                ? 'لم يتم إسناد أي حاج لهذا المرشد الديني بعد (العدد الفعلي: 0)'
                                : 'لا توجد سجلات مطابقة لمعايير البحث أو الفلترة الحالية'}
                            </p>
                            {canEdit && selectedGuideStats.totalAssigned === 0 && (
                              <button
                                type="button"
                                onClick={() => openAssignModalForGuide(selectedGuideForDetails.id)}
                                className="mt-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <UserPlus className="w-4 h-4" />
                                <span>إسناد حجاج من قاعدة البيانات لهذا المرشد الآن</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredAssignedItemsForGuide.map((item, idx) => {
                          const p = item.pilgrim;
                          const flw = item.followUp;
                          const pid = p.id || p.nationalId;
                          const isEduDone = flw.educationStatus === 'أتم التعليم';
                          const isTawafDone =
                            flw.tawafCompleted || flw.tawafStatus === 'أتم التطويف';

                          return (
                            <tr key={pid} className="hover:bg-[#10192D]/70 transition">
                              <td className="px-3 py-3 text-center font-mono text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-black text-white text-sm">
                                  {getPilgrimDisplayName(p)}
                                </div>
                                {flw.guideNotes && (
                                  <div className="text-[10px] text-amber-300 mt-0.5 truncate max-w-xs">
                                    ملاحظة المرشد: {flw.guideNotes}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center font-mono text-amber-300 font-bold">
                                {getPilgrimFileNumber(p)}
                              </td>
                              <td
                                className="px-3 py-3 text-center font-mono text-slate-200"
                                dir="ltr"
                              >
                                {p.mobile || '—'}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="font-bold text-slate-200 block">
                                  {getPilgrimGroupLabel(p)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {getPilgrimCampaignLabel(p)}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-bold">
                                  {p.status || 'مقبول ومؤكد'}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black border inline-block ${
                                    isEduDone
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : flw.educationStatus === 'قيد التعليم'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {flw.educationStatus}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black border inline-block ${
                                    isTawafDone
                                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                      : flw.tawafStatus === 'قيد التطويف'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {isTawafDone ? 'أتم التطويف' : flw.tawafStatus}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center font-mono text-slate-400">
                                {item.assignedAt}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => openFollowUpModal(p, selectedGuideForDetails)}
                                    className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 cursor-pointer"
                                    title="تسجيل متابعة التعليم والمناسك والتطويف"
                                  >
                                    <ClipboardCheck className="w-3.5 h-3.5" />
                                    <span>متابعة الإنجاز</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setViewingPilgrimProfile(p)}
                                    className="px-2.5 py-1.5 rounded-xl bg-[#10192D] hover:bg-slate-800 text-sky-300 border border-sky-500/30 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                    title="فتح الملف التعليمي الشامل للحاج"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>ملف الحاج</span>
                                  </button>

                                  {canEdit && guides.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const otherG = guides.find(
                                          (g) => g.id !== selectedGuideForDetails.id
                                        );
                                        setTransferTargetGuideId(otherG?.id || '');
                                        setPilgrimToTransfer({
                                          pilgrim: p,
                                          fromGuide: selectedGuideForDetails,
                                        });
                                      }}
                                      className="p-1.5 rounded-xl bg-[#10192D] hover:bg-slate-800 text-purple-300 border border-purple-500/30 cursor-pointer"
                                      title="نقل الحاج إلى مرشد ديني آخر"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPilgrimToUnassign({
                                          pilgrim: p,
                                          guide: selectedGuideForDetails,
                                        })
                                      }
                                      className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 cursor-pointer"
                                      title="إزالة الحاج من مسؤولية المرشد"
                                    >
                                      <UserMinus className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW B: ALL RELIGIOUS GUIDES CARDS GRID */
            <>
              {guides.length === 0 ? (
                <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-8 text-center space-y-3">
                  <Users className="w-10 h-10 text-amber-400 mx-auto opacity-80" />
                  <p className="text-sm font-black text-white">
                    لا يوجد مرشدون دينيون مسجلون حالياً
                  </p>
                  <p className="text-xs text-slate-400">
                    يمكنك إضافة مرشد ديني جديد عبر زر &quot;إضافة مرشد ديني جديد&quot; في الأعلى.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {guides.map((guide) => {
                    const guideLessons = lessons.filter((l) => l.guideId === guide.id);
                    const executedCount = guideLessons.filter((l) => l.status === 'مكتمل').length;
                    const gStats =
                      guideStatsMap[guide.id] ||
                      computeGuideAssignedStats(guide, activePilgrims, pilgrimProgressMap);

                    return (
                      <div
                        key={guide.id}
                        className="bg-[#0B1221] border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-lg transition"
                      >
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                              {guide.status}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              {guide.rating} / 5
                            </span>
                          </div>

                          <div>
                            <h4 className="text-base font-black text-white">{guide.name}</h4>
                            <p className="text-xs text-amber-300 font-bold mt-0.5">
                              {guide.specialization}
                            </p>
                            {guide.bio && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                {guide.bio}
                              </p>
                            )}
                          </div>

                          <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3 text-xs space-y-1.5">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Phone className="w-3.5 h-3.5 text-amber-400" />
                              <span className="font-mono" dir="ltr">
                                {guide.phone}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <Mail className="w-3.5 h-3.5 text-sky-400" />
                              <span className="font-mono">{guide.email}</span>
                            </div>
                            <div>
                              <strong className="text-slate-400">اللغات:</strong>{' '}
                              {guide.languages.join('، ')}
                            </div>
                            <div>
                              <strong className="text-slate-400">المجموعات المكلف بها:</strong>{' '}
                              {guide.assignedGroups.join('، ')}
                            </div>
                          </div>

                          {/* Real-Time Statistical Dashboard on Card (`أولاً` & `خامساً`) */}
                          <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3 space-y-2.5">
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div className="bg-[#0B1221] border border-slate-800 rounded-xl p-2">
                                <span className="text-[10px] text-slate-400 block">
                                  الدروس المنفذة
                                </span>
                                <strong className="text-sm font-black text-emerald-400 font-mono">
                                  {executedCount} / {guideLessons.length}
                                </strong>
                              </div>
                              <div className="bg-[#0B1221] border border-amber-500/30 rounded-xl p-2">
                                <span className="text-[10px] text-slate-400 block">
                                  الحجاج المسندون فعلياً
                                </span>
                                <strong className="text-sm font-black text-amber-400 font-mono">
                                  {gStats.totalAssigned} حاج
                                </strong>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="bg-[#0B1221] border border-slate-800/80 rounded-xl p-2 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">إنجاز التعليم:</span>
                                  <strong className="font-mono text-emerald-400">
                                    {gStats.educationCompletionPercent}%
                                  </strong>
                                </div>
                                <div className="text-[10px] text-slate-400 flex justify-between">
                                  <span>أتموا: {gStats.completedEducationCount}</span>
                                  <span>متبقي: {gStats.remainingEducationCount}</span>
                                </div>
                              </div>

                              <div className="bg-[#0B1221] border border-slate-800/80 rounded-xl p-2 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">إنجاز التطويف:</span>
                                  <strong className="font-mono text-sky-400">
                                    {gStats.tawafCompletionPercent}%
                                  </strong>
                                </div>
                                <div className="text-[10px] text-slate-400 flex justify-between">
                                  <span>أتموا: {gStats.completedTawafCount}</span>
                                  <span>متبقي: {gStats.remainingTawafCount}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Preview of Assigned Pilgrims Names */}
                          {gStats.assignedItems.length > 0 && (
                            <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-2.5">
                              <span className="text-[10px] font-bold text-amber-300 block mb-1">
                                من الحجاج المسندين للمرشد ({gStats.totalAssigned}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {gStats.assignedItems.slice(0, 4).map((it) => (
                                  <span
                                    key={it.pilgrim.id || it.pilgrim.nationalId}
                                    className="px-2 py-0.5 rounded-lg bg-[#0B1221] border border-slate-800 text-[10px] text-slate-200 font-bold"
                                  >
                                    {getPilgrimDisplayName(it.pilgrim)}
                                  </span>
                                ))}
                                {gStats.assignedItems.length > 4 && (
                                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                                    +{gStats.assignedItems.length - 4} آخرين
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Daily Reports Log */}
                          {guide.dailyReports.length > 0 && (
                            <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3 space-y-1.5 max-h-28 overflow-y-auto">
                              <span className="text-[11px] font-bold text-sky-400 block">
                                التقارير اليومية المرفوعة ({guide.dailyReports.length}):
                              </span>
                              {guide.dailyReports.map((rep) => (
                                <div
                                  key={rep.id}
                                  className="text-[11px] text-slate-300 border-b border-slate-800/80 pb-1"
                                >
                                  <span className="font-mono text-amber-300 font-bold">
                                    {rep.date}:
                                  </span>{' '}
                                  {rep.summary}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Guide Card Action Buttons */}
                        <div className="space-y-2 pt-3 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => setSelectedGuideIdForDetails(guide.id)}
                            className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
                          >
                            <Users className="w-4 h-4" />
                            <span>
                              الحجاج المسؤول عن تعليمهم وتطويفهم ({gStats.totalAssigned})
                            </span>
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setPdfModalGuideId(guide.id)}
                              className="py-2 px-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>تصدير كشف الحجاج PDF</span>
                            </button>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => openAssignModalForGuide(guide.id)}
                                className="py-2 px-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>إسناد حجاج للمرشد</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setDailyReportGuideId(guide.id);
                              setDailyReportText('');
                            }}
                            className="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                          >
                            + رفع تقرير يومي للمرشد
                          </button>

                          {canEdit && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingGuide(true);
                                  setGuideForm({
                                    ...guide,
                                    pilgrimsEducatedCount: gStats.totalAssigned,
                                  });
                                  setIsNewGuideModalOpen(true);
                                }}
                                className="py-2 px-3 rounded-xl bg-[#10192D] hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                                <span>تعديل المرشد</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setGuideToDelete(guide)}
                                className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                <span>حذف المرشد</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODAL 1: STANDALONE GUIDE PILGRIMS PDF REPORT (`رابعاً: إنشاء تقرير مستقل لكل مرشد ديني بصيغة PDF`) */}
      {pdfGuide && (
        <GuidePilgrimsPdfModal
          guide={pdfGuide}
          stats={
            guideStatsMap[pdfGuide.id] ||
            computeGuideAssignedStats(pdfGuide, activePilgrims, pilgrimProgressMap)
          }
          generatedBy={currentStaffName}
          onClose={() => setPdfModalGuideId(null)}
        />
      )}

      {/* MODAL 2: BULK & INDIVIDUAL PILGRIM ASSIGNMENT TO GUIDE (`ثالثاً: تطوير آلية إسناد الحجاج للمرشدين`) */}
      {isAssignModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-sky-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="p-5 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-black">
                  آلية إسناد وتوزيع الحجاج الفعليين على المرشدين الدينيين
                </span>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">
                  تحديد الحجاج المسجلين بالنظام وإسنادهم للمرشد الديني المختار
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Step 1: Select Target Guide */}
              <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-black text-amber-400 mb-1.5">
                    1. اختر المرشد الديني المراد إسناد الحجاج إليه:
                  </label>
                  <select
                    value={assignTargetGuideId}
                    onChange={(e) => {
                      setAssignTargetGuideId(e.target.value);
                      setSelectedPilgrimKeysToAssign([]);
                    }}
                    className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-black text-white focus:border-amber-400"
                  >
                    {guides.map((g) => {
                      const cnt = guideStatsMap[g.id]?.totalAssigned ?? 0;
                      return (
                        <option key={g.id} value={g.id}>
                          {g.name} — (المسندون حالياً: {cnt} حاج)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Quick Auto-Distribute Unassigned Pilgrims across Active Guides */}
                <div className="bg-[#0B1221] border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
                  <div className="text-[11px] text-slate-300">
                    <strong className="text-amber-300 block">
                      توزيع سريع للحجاج غير المسندين ({overallAssignmentSummary.unassignedCount} حاج):
                    </strong>
                    يمكنك إسناد الحجاج المحددين أدناه للمرشد المختار، أو توزيع الحجاج غير المسندين بالتساوي على جميع المرشدين النشطين.
                  </div>
                  {overallAssignmentSummary.unassignedCount > 0 && guides.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        const activeGuidesList = guides.filter((g) => g.status !== 'إجازة');
                        const targetGuides =
                          activeGuidesList.length > 0 ? activeGuidesList : guides;
                        const validGuideIds = new Set(guides.map((g) => g.id));
                        const unassignedPilgrims = activePilgrims.filter((p) => {
                          const pid = p.id || p.nationalId;
                          const pr =
                            pilgrimProgressMap[pid] ||
                            (p.nationalId ? pilgrimProgressMap[p.nationalId] : undefined);
                          return !(pr?.assignedGuideId && validGuideIds.has(pr.assignedGuideId));
                        });

                        for (let i = 0; i < targetGuides.length; i++) {
                          const g = targetGuides[i];
                          const slice = unassignedPilgrims.filter(
                            (_, pIdx) => pIdx % targetGuides.length === i
                          );
                          if (slice.length > 0) {
                            await onAssignPilgrimsToGuide(g, slice);
                          }
                        }

                        setIsAssignModalOpen(false);
                        showMsg(
                          `تم توزيع (${unassignedPilgrims.length}) حاجاً غير مسندين على (${targetGuides.length}) مرشدين دينيين وتحديث أعدادهم في قاعدة البيانات بنجاح.`
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-black self-start cursor-pointer"
                    >
                      توزيع الحجاج غير المسندين بالتساوي على المرشدين ({overallAssignmentSummary.unassignedCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2: Filter & Search Registered Pilgrims */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={assignSearchQuery}
                    onChange={(e) => setAssignSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، رقم الملف، الهوية، أو الجوال..."
                    className="w-full bg-[#10192D] border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white"
                  />
                </div>

                <select
                  value={assignGroupFilter}
                  onChange={(e) => setAssignGroupFilter(e.target.value)}
                  className="bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="all">جميع المجموعات والقوافل</option>
                  {allGroupsList.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>

                <select
                  value={assignStateFilter}
                  onChange={(e) => {
                    const val = e.target.value as 'all' | 'unassigned' | 'other_guide';
                    setAssignStateFilter(val);
                    if (val === 'other_guide') setAllowTransferFromOtherGuide(true);
                  }}
                  className="bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="unassigned">
                    الحجاج غير المسندين لأي مرشد ({overallAssignmentSummary.unassignedCount})
                  </option>
                  <option value="all">جميع الحجاج غير المسندين لهذا المرشد</option>
                  <option value="other_guide">الحجاج المسندون لمرشد آخر (للنقل)</option>
                </select>
              </div>

              {/* Select All & Transfer Governance Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#10192D] border border-slate-800 rounded-2xl px-4 py-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const selectable = candidatePilgrimsForAssign.filter((p) => {
                        const pid = p.id || p.nationalId;
                        const pr =
                          pilgrimProgressMap[pid] ||
                          (p.nationalId ? pilgrimProgressMap[p.nationalId] : undefined);
                        const hasOtherGuide = Boolean(
                          pr?.assignedGuideId &&
                            pr.assignedGuideId !== assignTargetGuideId &&
                            guides.some((g) => g.id === pr.assignedGuideId)
                        );
                        return !hasOtherGuide || allowTransferFromOtherGuide;
                      });
                      const allKeys = selectable.map((p) => p.id || p.nationalId);
                      if (
                        selectedPilgrimKeysToAssign.length === allKeys.length &&
                        allKeys.length > 0
                      ) {
                        setSelectedPilgrimKeysToAssign([]);
                      } else {
                        setSelectedPilgrimKeysToAssign(allKeys);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>
                      تحديد / إلغاء تحديد الكل ({selectedPilgrimKeysToAssign.length} محدد من{' '}
                      {candidatePilgrimsForAssign.length})
                    </span>
                  </button>
                </div>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowTransferFromOtherGuide}
                    onChange={(e) => setAllowTransferFromOtherGuide(e.target.checked)}
                    className="rounded border-slate-600 text-amber-500"
                  />
                  <span>
                    السماح بنقل الحاج إذا كان مسنداً لمرشد آخر (منع الازدواجية وإبقاء مرشد واحد لكل حاج)
                  </span>
                </label>
              </div>

              {/* Candidate Pilgrims Selection Table */}
              <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-[#10192D] border-b border-slate-800 sticky top-0 font-bold">
                    <tr>
                      <th className="p-2.5 text-center w-10">تحديد</th>
                      <th className="p-2.5">اسم الحاج</th>
                      <th className="p-2.5 text-center">رقم الملف</th>
                      <th className="p-2.5 text-center">الجوال</th>
                      <th className="p-2.5 text-center">المجموعة / القافلة</th>
                      <th className="p-2.5 text-center">المرشد الحالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {candidatePilgrimsForAssign.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          لا يوجد حجاج مطابقون للنطاق المحدد حالياً.
                        </td>
                      </tr>
                    ) : (
                      candidatePilgrimsForAssign.map((p) => {
                        const key = p.id || p.nationalId;
                        const pr =
                          pilgrimProgressMap[key] ||
                          (p.nationalId ? pilgrimProgressMap[p.nationalId] : undefined);
                        const currentGuide = guides.find((g) => g.id === pr?.assignedGuideId);
                        const isAssignedToOther = Boolean(
                          currentGuide && currentGuide.id !== assignTargetGuideId
                        );
                        const isChecked = selectedPilgrimKeysToAssign.includes(key);
                        const isDisabled = isAssignedToOther && !allowTransferFromOtherGuide;

                        return (
                          <tr
                            key={key}
                            onClick={() => {
                              if (isDisabled) return;
                              setSelectedPilgrimKeysToAssign((prev) =>
                                prev.includes(key)
                                  ? prev.filter((k) => k !== key)
                                  : [...prev, key]
                              );
                            }}
                            className={`transition cursor-pointer ${
                              isChecked
                                ? 'bg-sky-500/15'
                                : isDisabled
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-[#10192D]/60'
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => {}}
                                className="rounded border-slate-600 text-sky-500"
                              />
                            </td>
                            <td className="p-2.5 font-black text-white">
                              {getPilgrimDisplayName(p)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-amber-300">
                              {getPilgrimFileNumber(p)}
                            </td>
                            <td className="p-2.5 text-center font-mono" dir="ltr">
                              {p.mobile}
                            </td>
                            <td className="p-2.5 text-center">{getPilgrimGroupLabel(p)}</td>
                            <td className="p-2.5 text-center">
                              {currentGuide ? (
                                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                                  مسند إلى: {currentGuide.name}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                                  غير مسند
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0F172A] flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-300">
                عدد الحجاج المحددين للإسناد:{' '}
                <strong className="text-amber-400 font-mono">
                  {selectedPilgrimKeysToAssign.length}
                </strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={selectedPilgrimKeysToAssign.length === 0 || !assignTargetGuideId}
                  onClick={async () => {
                    const targetG = guides.find((g) => g.id === assignTargetGuideId);
                    if (!targetG) return;
                    const pilgrimsToAssign = activePilgrims.filter((p) =>
                      selectedPilgrimKeysToAssign.includes(p.id || p.nationalId)
                    );
                    const res = await onAssignPilgrimsToGuide(targetG, pilgrimsToAssign);
                    setIsAssignModalOpen(false);
                    showMsg(
                      `تم حفظ الإسناد في قاعدة البيانات للمرشد (${targetG.name}): إسناد جديد (${res.assignedCount}) • نقل إسناد (${res.transferredCount}).`
                    );
                  }}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>حفظ الإسناد في قاعدة البيانات ({selectedPilgrimKeysToAssign.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PILGRIM FOLLOW-UP & ACHIEVEMENT CHECKLIST (`سادساً: سجل المتابعة والإنجاز`) */}
      {followUpModalTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-amber-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="p-5 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black">
                  سجل المتابعة والإنجاز الفقهي والميداني للحاج
                </span>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">
                  {getPilgrimDisplayName(followUpModalTarget.pilgrim)} — رقم الملف:{' '}
                  {getPilgrimFileNumber(followUpModalTarget.pilgrim)}
                </h3>
                <p className="text-xs text-slate-400">
                  المرشد المسؤول: {followUpModalTarget.guide.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpModalTarget(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* 5 Structured Checklist Items with Execution Dates */}
              <div className="space-y-2.5">
                {[
                  {
                    label: '1. هل تم تعليم الحاج بالمناسك؟',
                    boolKey: 'manasikEducated' as const,
                    dateKey: 'manasikEducatedAt' as const,
                  },
                  {
                    label: '2. هل تم شرح أحكام الإحرام؟',
                    boolKey: 'ihramExplained' as const,
                    dateKey: 'ihramExplainedAt' as const,
                  },
                  {
                    label: '3. هل تم شرح أحكام الطواف والسعي؟',
                    boolKey: 'tawafSaiExplained' as const,
                    dateKey: 'tawafSaiExplainedAt' as const,
                  },
                  {
                    label: '4. هل تمت متابعة الحاج أثناء أداء المناسك؟',
                    boolKey: 'followedUpDuringManasik' as const,
                    dateKey: 'followedUpDuringManasikAt' as const,
                  },
                  {
                    label: '5. هل تم تطويف الحاج؟',
                    boolKey: 'tawafCompleted' as const,
                    dateKey: 'tawafCompletedAt' as const,
                  },
                ].map((row) => {
                  const isChecked = Boolean(followUpDraft[row.boolKey]);
                  const dateVal =
                    followUpDraft[row.dateKey] || new Date().toISOString().split('T')[0];

                  return (
                    <div
                      key={row.boolKey}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-[#10192D] border-slate-800'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 text-xs font-black text-white cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={isChecked}
                          onChange={(e) =>
                            handleToggleChecklistField(
                              row.boolKey,
                              row.dateKey,
                              e.target.checked
                            )
                          }
                          className="w-4 h-4 rounded border-slate-600 text-emerald-500"
                        />
                        <span>{row.label}</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>تاريخ التنفيذ:</span>
                        </span>
                        <input
                          type="date"
                          disabled={!canEdit || !isChecked}
                          value={isChecked ? dateVal : ''}
                          onChange={(e) =>
                            setFollowUpDraft({
                              ...followUpDraft,
                              [row.dateKey]: e.target.value,
                            })
                          }
                          className="bg-[#0B1221] border border-slate-700 rounded-xl px-2.5 py-1 text-xs font-mono text-white disabled:opacity-40"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overall Education & Tawaf Status Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3">
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    حالة إتمام التعليم والإرشاد:
                  </label>
                  <select
                    disabled={!canEdit}
                    value={followUpDraft.educationStatus}
                    onChange={(e) =>
                      setFollowUpDraft({
                        ...followUpDraft,
                        educationStatus: e.target.value as PilgrimEducationStatus,
                      })
                    }
                    className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-white"
                  >
                    <option value="لم يتم تعليمه بعد">لم يتم تعليمه بعد</option>
                    <option value="قيد التعليم">قيد التعليم</option>
                    <option value="أتم التعليم">أتم التعليم</option>
                  </select>
                </div>

                <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3">
                  <label className="block text-[11px] font-bold text-sky-300 mb-1">
                    حالة التطويف:
                  </label>
                  <select
                    disabled={!canEdit}
                    value={followUpDraft.tawafStatus}
                    onChange={(e) => {
                      const st = e.target.value as PilgrimTawafStatus;
                      setFollowUpDraft({
                        ...followUpDraft,
                        tawafStatus: st,
                        tawafCompleted: st === 'أتم التطويف',
                        tawafCompletedAt:
                          st === 'أتم التطويف'
                            ? followUpDraft.tawafCompletedAt ||
                              new Date().toISOString().split('T')[0]
                            : followUpDraft.tawafCompletedAt,
                      });
                    }}
                    className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-white"
                  >
                    <option value="لم يتم تطويفه بعد">لم يتم تطويفه بعد</option>
                    <option value="قيد التطويف">قيد التطويف</option>
                    <option value="أتم التطويف">أتم التطويف</option>
                  </select>
                </div>
              </div>

              {/* Guide Notes */}
              <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-amber-400">
                  ملاحظات المرشد الديني حول الحاج:
                </label>
                <textarea
                  rows={2}
                  disabled={!canEdit}
                  value={followUpDraft.guideNotes}
                  onChange={(e) =>
                    setFollowUpDraft({ ...followUpDraft, guideNotes: e.target.value })
                  }
                  placeholder="سجل أي ملاحظات شرعية أو ميدانية خاصة بتعليم وتطويف هذا الحاج..."
                  className="w-full bg-[#0B1221] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              {/* Preserved Modification & Follow-up History Log */}
              {followUpDraft.historyLog.length > 0 && (
                <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5 space-y-2 max-h-40 overflow-y-auto">
                  <span className="text-[11px] font-black text-sky-400 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>سجل التعديلات والمتابعة المحفوظ ({followUpDraft.historyLog.length}):</span>
                  </span>
                  {followUpDraft.historyLog.map((h) => (
                    <div
                      key={h.id}
                      className="text-[11px] bg-[#0B1221] border border-slate-800/80 rounded-xl p-2 space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-amber-300 font-bold">
                        <span>{h.actionSummary}</span>
                        <span className="font-mono text-[10px] text-slate-400">{h.timestamp}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        بواسطة: {h.authorName} ({h.guideName})
                        {h.notes ? ` — ملاحظة: ${h.notes}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0F172A] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFollowUpModalTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={async () => {
                    const summaryParts: string[] = [
                      `التعليم: ${followUpDraft.educationStatus}`,
                      `التطويف: ${followUpDraft.tawafStatus}`,
                    ];
                    await onSavePilgrimGuideFollowUp(
                      followUpModalTarget.pilgrim,
                      followUpModalTarget.guide,
                      followUpDraft,
                      `تحديث سجل المتابعة (${summaryParts.join(' • ')})`
                    );
                    setFollowUpModalTarget(null);
                    showMsg(
                      `تم حفظ سجل المتابعة والإنجاز للحاج (${getPilgrimDisplayName(
                        followUpModalTarget.pilgrim
                      )}) وتحديث إحصائيات المرشد تلقائياً.`
                    );
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer"
                >
                  حفظ سجل المتابعة والإنجاز
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TRANSFER PILGRIM TO ANOTHER GUIDE */}
      {pilgrimToTransfer && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-purple-500/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-400" />
              <span>نقل الحاج إلى مرشد ديني آخر</span>
            </h3>
            <p className="text-xs text-slate-300">
              نقل مسؤولية تعليم وتطويف الحاج{' '}
              <strong className="text-amber-300">
                {getPilgrimDisplayName(pilgrimToTransfer.pilgrim)}
              </strong>{' '}
              من المرشد ({pilgrimToTransfer.fromGuide.name}) إلى:
            </p>
            <select
              value={transferTargetGuideId}
              onChange={(e) => setTransferTargetGuideId(e.target.value)}
              className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white"
            >
              {guides
                .filter((g) => g.id !== pilgrimToTransfer.fromGuide.id)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({guideStatsMap[g.id]?.totalAssigned ?? 0} حاج)
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPilgrimToTransfer(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetG = guides.find((g) => g.id === transferTargetGuideId);
                  if (!targetG) return;
                  await onAssignPilgrimsToGuide(targetG, [pilgrimToTransfer.pilgrim]);
                  setPilgrimToTransfer(null);
                  showMsg(
                    `تم نقل الحاج (${getPilgrimDisplayName(
                      pilgrimToTransfer.pilgrim
                    )}) إلى مسؤولية المرشد (${targetG.name}) بنجاح.`
                  );
                }}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black cursor-pointer"
              >
                تأكيد النقل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: UNASSIGN PILGRIM CONFIRMATION */}
      {pilgrimToUnassign && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-rose-500/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-rose-400" />
              <span>إزالة الحاج من مسؤولية المرشد</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من إلغاء إسناد الحاج{' '}
              <strong className="text-white">
                {getPilgrimDisplayName(pilgrimToUnassign.pilgrim)}
              </strong>{' '}
              من قائمة المرشد الديني ({pilgrimToUnassign.guide.name})؟ سيتم تحديث العدد تلقائياً مع الاحتفاظ بسجل المتابعة السابق للحاج.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPilgrimToUnassign(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = pilgrimToUnassign;
                  setPilgrimToUnassign(null);
                  await onUnassignPilgrimFromGuide(target.pilgrim, target.guide);
                  showMsg(
                    `تم إزالة الحاج (${getPilgrimDisplayName(
                      target.pilgrim
                    )}) من قائمة المرشد (${target.guide.name}) وتحديث العدد تلقائياً.`
                  );
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
              >
                تأكيد إلغاء الإسناد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: DIRECT PILGRIM EDUCATIONAL PROFILE VIEW (`إمكانية فتح ملف الحاج مباشرة`) */}
      {viewingPilgrimProfile && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
          dir="rtl"
        >
          {(() => {
            const p = viewingPilgrimProfile;
            const pid = p.id || p.nationalId;
            const pr =
              pilgrimProgressMap[pid] ||
              (p.nationalId ? pilgrimProgressMap[p.nationalId] : undefined);
            if (!pr) return null;

            return (
              <div className="bg-[#0B1221] border border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
                <div className="p-5 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between gap-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black">
                      ملف الحاج التعليمي والفقهي المباشر
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">
                      {getPilgrimDisplayName(p)} — ({getPilgrimFileNumber(p)})
                    </h3>
                    <p className="text-xs text-slate-400">
                      المجموعة: {getPilgrimGroupLabel(p)} • الجوال: <span dir="ltr">{p.mobile}</span> •
                      المرجع: {p.currentMarji || 'غير محدد'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingPilgrimProfile(null)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إغلاق ✕
                  </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                  <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-black text-amber-400">
                      إتقان الأبواب الفقهية ({visibleFiqhSections.length} باباً نشطاً):
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {visibleFiqhSections.map((sec) => {
                        const currentSt = getPilgrimSectionMastery(pr, sec);
                        return (
                          <div
                            key={sec.id}
                            className="bg-[#0B1221] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2"
                          >
                            <span className="text-xs font-bold text-white truncate">
                              {sec.name}
                            </span>
                            <select
                              disabled={!canEdit}
                              value={currentSt}
                              onChange={async (e) => {
                                const newStatus = e.target.value as FiqhMasteryStatus;
                                const updatedMastery = setPilgrimSectionMastery(
                                  pr.fiqhIssuesMastery,
                                  sec,
                                  newStatus
                                );
                                const needsReeducation = visibleFiqhSections.some(
                                  (s) =>
                                    (updatedMastery[s.id] || updatedMastery[s.name]) ===
                                    'يحتاج إلى مراجعة وإعادة توعية'
                                );
                                await onSavePilgrimProgress({
                                  ...pr,
                                  fiqhIssuesMastery: updatedMastery,
                                  needsReeducation,
                                  lastUpdated: new Date().toISOString().split('T')[0],
                                });
                              }}
                              className="bg-[#10192D] border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-300"
                            >
                              {FIQH_MASTERY_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* NEW REFERENCE MODAL */}
      {isNewRefModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-amber-500/40 rounded-3xl w-full max-w-lg p-5 space-y-4">
            <h3 className="text-base font-black text-white">إضافة مرجع أو مادة علمية شرعية</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={refForm.title}
                onChange={(e) => setRefForm({ ...refForm, title: e.target.value })}
                placeholder="عنوان الكتاب أو المادة العلمية"
                className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <select
                value={refForm.category}
                onChange={(e) => setRefForm({ ...refForm, category: e.target.value })}
                className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              >
                {visibleFiqhSections.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={refForm.relatedFiqhIssue}
                onChange={(e) => setRefForm({ ...refForm, relatedFiqhIssue: e.target.value })}
                placeholder="المسألة الفقهية المرتبطة"
                className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <textarea
                rows={2}
                value={refForm.summary}
                onChange={(e) => setRefForm({ ...refForm, summary: e.target.value })}
                placeholder="ملخص المادة العلمية"
                className="w-full bg-[#10192D] border border-slate-700 rounded-xl p-3 text-xs text-white"
              />
              <input
                type="text"
                value={refForm.contentOrUrl}
                onChange={(e) => setRefForm({ ...refForm, contentOrUrl: e.target.value })}
                placeholder="رابط الملف أو الفيديو (https://...)"
                className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewRefModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!refForm.title.trim()) return;
                  await onSaveReference(refForm);
                  setIsNewRefModalOpen(false);
                  showMsg('تم حفظ المادة الشرعية (بانتظار الاعتماد الرسمي لإظهارها للحجاج).');
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black"
              >
                حفظ المادة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW SHARIA INQUIRY MODAL */}
      {isNewInquiryModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-amber-500/40 rounded-3xl w-full max-w-lg p-5 space-y-4">
            <h3 className="text-base font-black text-white">تسجيل استفسار شرعي جديد للحاج</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">اختر الحاج السائل:</label>
                <select
                  value={selectedPilgrimIdForInq}
                  onChange={(e) => setSelectedPilgrimIdForInq(e.target.value)}
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {activePilgrims.map((p) => (
                    <option key={p.id || p.nationalId} value={p.id || p.nationalId}>
                      {getPilgrimDisplayName(p)} — ({p.nationalId})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">تصنيف المسألة:</label>
                <select
                  value={newInqCategory}
                  onChange={(e) => setNewInqCategory(e.target.value)}
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {visibleFiqhSections.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">تحويل إلى المرشد المختص:</label>
                <select
                  value={newInqGuideId}
                  onChange={(e) => setNewInqGuideId(e.target.value)}
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
                <label className="block text-xs text-slate-300 mb-1">نص السؤال الشرعي:</label>
                <textarea
                  rows={3}
                  value={newInqQuestion}
                  onChange={(e) => setNewInqQuestion(e.target.value)}
                  placeholder="اكتب سؤال الحاج بدقة..."
                  className="w-full bg-[#10192D] border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewInquiryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newInqQuestion.trim()) return;
                  const p =
                    activePilgrims.find(
                      (x) => (x.id || x.nationalId) === selectedPilgrimIdForInq
                    ) || activePilgrims[0];
                  const g = guides.find((x) => x.id === newInqGuideId) || guides[0];
                  const inq: ShariaInquiry = {
                    id: `inq-${Date.now()}`,
                    pilgrimId: p ? p.id || p.nationalId : 'p-1',
                    nationalId: p?.nationalId || '',
                    pilgrimName: p ? getPilgrimDisplayName(p) : 'حاج مسجل',
                    pilgrimMobile: p?.mobile || '',
                    campaignName: p ? getPilgrimCampaignLabel(p) : 'الباقة العامة',
                    groupName: p ? getPilgrimGroupLabel(p) : 'المجموعة العامة',
                    marjiName: p?.currentMarji,
                    category: newInqCategory,
                    phase: 'قبل الحج',
                    question: newInqQuestion.trim(),
                    assignedGuideId: g?.id,
                    assignedGuideName: g?.name,
                    status: 'جديد',
                    isApproved: false,
                    isFrequentQuestion: false,
                    createdAt: new Date().toISOString().split('T')[0],
                  };
                  await onSaveInquiry(inq);
                  setNewInqQuestion('');
                  setIsNewInquiryModalOpen(false);
                  showMsg('تم تسجيل الاستفسار الشرعي وإحالته للمرشد المختص.');
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black"
              >
                حفظ وإحالة للمرشد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW / EDIT GUIDE MODAL */}
      {isNewGuideModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-amber-500/40 rounded-3xl w-full max-w-lg p-5 space-y-4">
            <h3 className="text-base font-black text-white">
              {isEditingGuide ? 'تعديل بيانات المرشد الديني' : 'إضافة مرشد ديني جديد'}
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={guideForm.name}
                onChange={(e) => setGuideForm({ ...guideForm, name: e.target.value })}
                placeholder="الاسم الكامل للمرشد / المرشدة"
                className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <input
                type="text"
                value={guideForm.phone}
                onChange={(e) => setGuideForm({ ...guideForm, phone: e.target.value })}
                placeholder="رقم الجوال"
                className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <input
                type="email"
                value={guideForm.email}
                onChange={(e) => setGuideForm({ ...guideForm, email: e.target.value })}
                placeholder="البريد الإلكتروني"
                className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <input
                type="text"
                value={guideForm.specialization}
                onChange={(e) => setGuideForm({ ...guideForm, specialization: e.target.value })}
                placeholder="التخصص الشرعي"
                className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <textarea
                rows={2}
                value={guideForm.bio || ''}
                onChange={(e) => setGuideForm({ ...guideForm, bio: e.target.value })}
                placeholder="نبذة تعريفية عن المرشد ومهامه الشرعية"
                className="w-full bg-[#10192D] border border-slate-700 rounded-xl p-3 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">الحالة:</label>
                  <select
                    value={guideForm.status}
                    onChange={(e) =>
                      setGuideForm({
                        ...guideForm,
                        status: e.target.value as ReligiousGuide['status'],
                      })
                    }
                    className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="نشط">نشط</option>
                    <option value="في مهمة ميدانية">في مهمة ميدانية</option>
                    <option value="إجازة">إجازة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    المجموعات المكلف بها (مفصولة بفاصلة):
                  </label>
                  <input
                    type="text"
                    value={guideForm.assignedGroups.join('، ')}
                    onChange={(e) =>
                      setGuideForm({
                        ...guideForm,
                        assignedGroups: e.target.value
                          .split(/[،,]/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="باص 1، باص 2"
                    className="w-full bg-[#10192D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewGuideModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!guideForm.name.trim()) return;
                  const realAssignedCount = guideStatsMap[guideForm.id]?.totalAssigned ?? 0;
                  await onSaveGuide({
                    ...guideForm,
                    pilgrimsEducatedCount: realAssignedCount,
                  });
                  setIsNewGuideModalOpen(false);
                  showMsg(
                    isEditingGuide
                      ? 'تم تحديث بيانات المرشد الديني بنجاح.'
                      : 'تمت إضافة المرشد الديني بنجاح (عدد الحجاج المسندين: 0).'
                  );
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black cursor-pointer"
              >
                {isEditingGuide ? 'حفظ التعديلات' : 'حفظ ملف المرشد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE GUIDE CONFIRMATION MODAL */}
      {guideToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-rose-500/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تأكيد حذف المرشد الديني</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  هل أنت متأكد من رغبتك في حذف ملف هذا المرشد من منظومة الإرشاد الديني؟
                </p>
              </div>
            </div>

            <div className="bg-[#10192D] border border-slate-800 rounded-2xl p-3.5 space-y-1">
              <p className="text-sm font-black text-white">{guideToDelete.name}</p>
              <p className="text-xs text-amber-300 font-bold">{guideToDelete.specialization}</p>
              <p className="text-[11px] text-slate-400 font-mono" dir="ltr">
                {guideToDelete.phone}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGuideToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = guideToDelete;
                  setGuideToDelete(null);
                  if (selectedGuideIdForDetails === target.id) {
                    setSelectedGuideIdForDetails(null);
                  }
                  await onDeleteGuide(target.id);
                  showMsg(`تم حذف المرشد الديني "${target.name}" بنجاح.`);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد حذف المرشد</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DAILY REPORT MODAL FOR A GUIDE */}
      {dailyReportGuideId && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-[#0B1221] border border-amber-500/40 rounded-3xl w-full max-w-lg p-5 space-y-4">
            <h3 className="text-base font-black text-white">رفع تقرير يومي للمرشد الديني</h3>
            <textarea
              rows={3}
              value={dailyReportText}
              onChange={(e) => setDailyReportText(e.target.value)}
              placeholder="ملخص الدروس المنفذة، الاستفسارات المجاب عليها، والملاحظات الميدانية..."
              className="w-full bg-[#10192D] border border-slate-700 rounded-xl p-3 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDailyReportGuideId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  const g = guides.find((x) => x.id === dailyReportGuideId);
                  if (!g || !dailyReportText.trim()) return;
                  await onSaveGuide({
                    ...g,
                    dailyReports: [
                      {
                        id: `rep-${Date.now()}`,
                        date: new Date().toISOString().split('T')[0],
                        summary: dailyReportText.trim(),
                        lessonsDelivered: 1,
                        inquiriesAnswered: 5,
                      },
                      ...g.dailyReports,
                    ],
                  });
                  setDailyReportGuideId(null);
                  showMsg('تم حفظ التقرير اليومي في سجل المرشد.');
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black"
              >
                حفظ التقرير
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
