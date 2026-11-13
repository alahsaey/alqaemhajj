import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  PhoneCall,
  UserCheck,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  Gift,
  CheckCircle2,
  Phone,
  MessageSquare,
  Users,
} from 'lucide-react';
import { GiftDistribution, GiftCommunication, Pilgrim } from '../../types';
import { getFollowUpLabelArabic, getStatusLabelArabic, exportContactedNoShowReportCSV, exportCommunicationsReportCSV } from '../../utils/giftExport';

interface GiftFollowUpViewProps {
  giftDistributions: GiftDistribution[];
  communications: GiftCommunication[];
  activePilgrims: Pilgrim[];
  busesList: string[];
  currentStaffName: string;
  onOpenDeliveryModal: (item: GiftDistribution) => void;
  onOpenFollowUpModal: (item: GiftDistribution) => void;
  onOpenHistoryModal: (item: GiftDistribution) => void;
  onPrintPreview: (title: string, columns: string[], data: (string | number)[][], summary?: { label: string; value: string | number }[]) => void;
}

export const GiftFollowUpView: React.FC<GiftFollowUpViewProps> = ({
  giftDistributions,
  communications,
  activePilgrims,
  busesList,
  currentStaffName,
  onOpenDeliveryModal,
  onOpenFollowUpModal,
  onOpenHistoryModal,
  onPrintPreview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [busFilter, setBusFilter] = useState('all');
  const [viewSubTab, setViewSubTab] = useState<'pendingList' | 'commsLog'>('pendingList');

  // Filter ONLY pilgrims who haven't completed delivery
  const pendingPilgrims = useMemo(() => {
    return activePilgrims
      .map((pilgrim, idx) => {
        const existing = giftDistributions.find(
          (g) => g.pilgrimId === pilgrim.id || g.nationalId === pilgrim.nationalId
        );

        if (existing) {
          if (existing.status === 'delivered_direct' || existing.status === 'delivered_proxy') {
            return null; // Already delivered
          }
          return {
            ...existing,
            busNumber: pilgrim.busNumber || existing.busNumber || 'غير محدد',
            membershipNumber: pilgrim.membershipNumber || existing.membershipNumber || `QAEM-1448-${1001 + idx}`,
          };
        }

        // Virtual un-delivered
        const defaultItem: GiftDistribution = {
          id: `${pilgrim.id}_gift`,
          pilgrimId: pilgrim.id,
          nationalId: pilgrim.nationalId,
          pilgrimName: `${pilgrim.firstName} ${pilgrim.secondName || ''} ${pilgrim.lastName}`.trim(),
          membershipNumber: pilgrim.membershipNumber || `QAEM-1448-${1001 + idx}`,
          mobile: pilgrim.mobile,
          busNumber: pilgrim.busNumber || 'غير محدد',
          flightNumber: (pilgrim.flightNumberOutbound || pilgrim.flightTicketNumber || '').trim() || 'غير محدد',
          seasonYear: pilgrim.seasonYear || '1448',
          status: 'not_delivered',
          recipientType: 'pilgrim',
          followUpStatus: 'not_contacted',
        };
        return defaultItem;
      })
      .filter((item): item is GiftDistribution => item !== null);
  }, [activePilgrims, giftDistributions]);

  // Filtered pending items
  const filteredPending = useMemo(() => {
    return pendingPilgrims.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesName = item.pilgrimName.toLowerCase().includes(q);
        const matchesId = item.nationalId.toLowerCase().includes(q);
        const matchesMobile = item.mobile.toLowerCase().includes(q);
        const matchesMember = (item.membershipNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesMobile && !matchesMember) return false;
      }

      if (followUpFilter !== 'all') {
        if ((item.followUpStatus || 'not_contacted') !== followUpFilter) return false;
      }

      if (busFilter !== 'all') {
        if ((item.busNumber || '').trim() !== busFilter.trim()) return false;
      }

      return true;
    });
  }, [pendingPilgrims, searchQuery, followUpFilter, busFilter]);

  // Filtered Communications Log
  const filteredComms = useMemo(() => {
    return communications.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesName = c.pilgrimName.toLowerCase().includes(q);
        const matchesMobile = c.mobile.toLowerCase().includes(q);
        const matchesStaff = c.contactStaff.toLowerCase().includes(q);
        const matchesNotes = (c.notes || '').toLowerCase().includes(q);
        if (!matchesName && !matchesMobile && !matchesStaff && !matchesNotes) return false;
      }
      return true;
    });
  }, [communications, searchQuery]);

  return (
    <div className="space-y-5 animate-fadeIn" dir="rtl">
      {/* Header Strip & Sub-tabs */}
      <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>متابعة الحجاج الذين لم يستلموا هداياهم وسجل التواصل</span>
            </h3>
            <p className="text-xs text-slate-400">
              توثيق محاولات الاتصال والتواصل المتكررة، متابعة مواعيد الحضور المحددة، وتسليم الهدية فور وصول الحاج.
            </p>
          </div>

          {/* Sub-tab switcher */}
          <div className="flex items-center gap-1 bg-[#10192D] p-1 rounded-2xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setViewSubTab('pendingList')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewSubTab === 'pendingList'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              قائمة غير المستلمين ({pendingPilgrims.length})
            </button>
            <button
              type="button"
              onClick={() => setViewSubTab('commsLog')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewSubTab === 'commsLog'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              سجل محاولات التواصل ({communications.length})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between pt-2 border-t border-slate-800/80">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الحاج، رقم الجوال، أو رقم الهوية..."
              className="w-full bg-[#10192D] border border-slate-700 focus:border-amber-400 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {viewSubTab === 'pendingList' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-bold whitespace-nowrap">حالة المتابعة:</span>
                  <select
                    value={followUpFilter}
                    onChange={(e) => setFollowUpFilter(e.target.value)}
                    className="bg-[#10192D] border border-slate-700 text-xs text-amber-300 font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="all">كافة الحالات ({pendingPilgrims.length})</option>
                    <option value="not_contacted">لم يتم التواصل معه</option>
                    <option value="contacted_no_show">تم التواصل ولم يحضر</option>
                    <option value="unable_to_contact">تعذر التواصل معه</option>
                    <option value="new_date_set">تم تحديد موعد جديد</option>
                    <option value="unable_other">تعذر التسليم لسبب آخر</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-bold whitespace-nowrap">الباص:</span>
                  <select
                    value={busFilter}
                    onChange={(e) => setBusFilter(e.target.value)}
                    className="bg-[#10192D] border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="all">جميع الحافلات</option>
                    {busesList.map((bus) => (
                      <option key={bus} value={bus}>
                        {bus}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Quick Export Actions */}
            {viewSubTab === 'pendingList' ? (
              <button
                type="button"
                onClick={() => exportContactedNoShowReportCSV(pendingPilgrims)}
                className="px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => exportCommunicationsReportCSV(communications)}
                className="px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير السجل الكامل</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* View Sub-Tab 1: Pending Pilgrims Table */}
      {viewSubTab === 'pendingList' && (
        <div className="bg-[#0B1221] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#10192D] border-b border-slate-800 text-slate-300 font-bold whitespace-nowrap">
                  <th className="p-3.5 text-center">م</th>
                  <th className="p-3.5">اسم الحاج</th>
                  <th className="p-3.5 text-center">رقم العضوية</th>
                  <th className="p-3.5 text-center">رقم الجوال</th>
                  <th className="p-3.5 text-center">الباص</th>
                  <th className="p-3.5 text-center">الرحلة</th>
                  <th className="p-3.5 text-center">حالة المتابعة</th>
                  <th className="p-3.5 text-center">تاريخ آخر تواصل</th>
                  <th className="p-3.5">الموظف المتواصل</th>
                  <th className="p-3.5 text-center">موعد الاستلام القادم</th>
                  <th className="p-3.5 text-center">محاولات التواصل</th>
                  <th className="p-3.5 text-center">الإجراءات الميدانية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400">
                      ممتاز! لا يوجد أي حجاج مطابقين لمعايير المتابعة المحددة.
                    </td>
                  </tr>
                ) : (
                  filteredPending.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-[#10192D]/60 transition-colors">
                      <td className="p-3 text-center font-mono font-bold text-amber-500/80 bg-amber-500/[0.02]">
                        {idx + 1}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <strong className="text-white block font-bold">{item.pilgrimName}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{item.nationalId}</span>
                      </td>

                      <td className="p-3 text-center font-mono text-[11px] text-amber-400 whitespace-nowrap">
                        {item.membershipNumber || 'QAEM-1448'}
                      </td>

                      <td className="p-3 text-center font-mono text-[11px]" dir="ltr">
                        <a
                          href={`tel:${item.mobile}`}
                          className="text-amber-400 hover:underline font-bold"
                        >
                          {item.mobile}
                        </a>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold text-[11px]">
                          {item.busNumber || 'غير محدد'}
                        </span>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap text-slate-300">
                        {item.flightNumber || 'غير محدد'}
                      </td>

                      {/* Follow-up Status Badge */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            item.followUpStatus === 'contacted_no_show'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : item.followUpStatus === 'unable_to_contact'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : item.followUpStatus === 'new_date_set'
                              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                              : item.followUpStatus === 'unable_other'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {getFollowUpLabelArabic(item.followUpStatus)}
                        </span>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-300">
                        {item.lastContactDate || <span className="text-slate-500">لم يتم</span>}
                      </td>

                      <td className="p-3 whitespace-nowrap text-slate-300 text-xs">
                        {item.lastContactStaff || <span className="text-slate-500">-</span>}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap font-mono text-[11px] text-amber-300 font-bold">
                        {item.nextFollowUpDate || <span className="text-slate-500 font-normal">غير محدد</span>}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-amber-400">
                        {item.contactAttemptsCount || 0}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Deliver Gift on the spot */}
                          <button
                            type="button"
                            onClick={() => onOpenDeliveryModal(item)}
                            className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs shadow transition cursor-pointer active:scale-95 flex items-center gap-1"
                            title="تسليم الهدية فوراً للحاج أو من ينوب عنه"
                          >
                            <Gift className="w-3.5 h-3.5" />
                            <span>تسليم الآن</span>
                          </button>

                          {/* Record Contact Attempt */}
                          <button
                            type="button"
                            onClick={() => onOpenFollowUpModal(item)}
                            className="px-2.5 py-1 rounded-xl bg-[#15223B] hover:bg-[#1E3052] text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                            title="تسجيل محاولة اتصال أو تواصل"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>تسجيل تواصل</span>
                          </button>

                          {/* History */}
                          <button
                            type="button"
                            onClick={() => onOpenHistoryModal(item)}
                            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="عرض السجل الكامل"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Sub-Tab 2: Communications Log Table */}
      {viewSubTab === 'commsLog' && (
        <div className="bg-[#0B1221] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#10192D] border-b border-slate-800 text-slate-300 font-bold whitespace-nowrap">
                  <th className="p-3.5 text-center">م</th>
                  <th className="p-3.5">اسم الحاج</th>
                  <th className="p-3.5 text-center">الجوال</th>
                  <th className="p-3.5 text-center">الباص</th>
                  <th className="p-3.5 text-center">تاريخ ووقت التواصل</th>
                  <th className="p-3.5 text-center">وسيلة التواصل</th>
                  <th className="p-3.5">الموظف المتواصل</th>
                  <th className="p-3.5 text-center">نتيجة المحاولة</th>
                  <th className="p-3.5 text-center">موعد المتابعة القادم</th>
                  <th className="p-3.5">الملاحظات والتفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredComms.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      لم يتم تسجيل أي محاولات تواصل مطابقة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  filteredComms.map((comm, idx) => (
                    <tr key={comm.id} className="hover:bg-[#10192D]/60 transition-colors">
                      <td className="p-3 text-center font-mono font-bold text-amber-500/80 bg-amber-500/[0.02]">
                        {idx + 1}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <strong className="text-white block font-bold">{comm.pilgrimName}</strong>
                      </td>

                      <td className="p-3 text-center font-mono text-[11px]" dir="ltr">
                        <a href={`tel:${comm.mobile}`} className="text-amber-400 hover:underline">
                          {comm.mobile}
                        </a>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap text-emerald-400 font-bold">
                        {comm.busNumber || 'غير محدد'}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-300">
                        {comm.contactDate} {comm.contactTime}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/25 font-bold text-[11px]">
                          {comm.contactMethod}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap text-slate-300">{comm.contactStaff}</td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                          {comm.result}
                        </span>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap font-mono text-amber-400 font-bold">
                        {comm.nextFollowUpDate || <span className="text-slate-500 font-normal">-</span>}
                      </td>

                      <td className="p-3 text-slate-300 text-xs max-w-xs truncate" title={comm.notes}>
                        {comm.notes || <span className="text-slate-500">-</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
