import React, { useState, useMemo } from 'react';
import {
  Gift,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  User,
  Phone,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Info,
  Calendar,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { GiftDistribution, Pilgrim } from '../../types';
import { getStatusLabelArabic, downloadCsvFile } from '../../utils/giftExport';

interface GiftRegistryViewProps {
  giftDistributions: GiftDistribution[];
  activePilgrims: Pilgrim[];
  busesList: string[];
  currentStaffName: string;
  onOpenDeliveryModal: (item: GiftDistribution) => void;
  onOpenFollowUpModal: (item: GiftDistribution) => void;
  onOpenHistoryModal: (item: GiftDistribution) => void;
  onPrintPreview: (title: string, columns: string[], data: (string | number)[][], summary?: { label: string; value: string | number }[]) => void;
}

export const GiftRegistryView: React.FC<GiftRegistryViewProps> = ({
  giftDistributions,
  activePilgrims,
  busesList,
  currentStaffName,
  onOpenDeliveryModal,
  onOpenFollowUpModal,
  onOpenHistoryModal,
  onPrintPreview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busFilter, setBusFilter] = useState('all');
  const [recipientTypeFilter, setRecipientTypeFilter] = useState('all');

  // Build unified registry rows by mapping all active pilgrims to their gift status
  const allRegistryItems = useMemo(() => {
    return activePilgrims.map((pilgrim, idx) => {
      const existing = giftDistributions.find(
        (g) => g.pilgrimId === pilgrim.id || g.nationalId === pilgrim.nationalId
      );

      const flightVal = (
        pilgrim.flightNumberOutbound ||
        pilgrim.flightNumberReturn ||
        pilgrim.flightTicketNumber ||
        ''
      ).trim();

      if (existing) {
        return {
          ...existing,
          // Ensure synced latest bus and flight from pilgrim record
          busNumber: pilgrim.busNumber || existing.busNumber || 'غير محدد',
          flightNumber: flightVal || existing.flightNumber || 'غير محدد',
          membershipNumber: pilgrim.membershipNumber || existing.membershipNumber || `QAEM-1448-${1001 + idx}`,
        };
      }

      // Default un-delivered virtual object
      const defaultItem: GiftDistribution = {
        id: `${pilgrim.id}_gift`,
        pilgrimId: pilgrim.id,
        nationalId: pilgrim.nationalId,
        pilgrimName: `${pilgrim.firstName} ${pilgrim.secondName || ''} ${pilgrim.thirdName || ''} ${pilgrim.lastName}`
          .replace(/\s+/g, ' ')
          .trim(),
        membershipNumber: pilgrim.membershipNumber || `QAEM-1448-${1001 + idx}`,
        mobile: pilgrim.mobile,
        busNumber: pilgrim.busNumber || 'غير محدد',
        flightNumber: flightVal || 'غير محدد',
        seasonYear: pilgrim.seasonYear || '1448',
        status: 'not_delivered',
        recipientType: 'pilgrim',
        recipientName: '',
        followUpStatus: 'not_contacted',
      };
      return defaultItem;
    });
  }, [activePilgrims, giftDistributions]);

  // Filtered rows
  const filteredItems = useMemo(() => {
    return allRegistryItems.filter((item) => {
      // 1. Text Search
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesName = item.pilgrimName.toLowerCase().includes(q);
        const matchesNationalId = item.nationalId.toLowerCase().includes(q);
        const matchesMobile = item.mobile.toLowerCase().includes(q);
        const matchesMemberNum = (item.membershipNumber || '').toLowerCase().includes(q);
        const matchesProxyName = (item.recipientName || '').toLowerCase().includes(q);
        const matchesProxyMobile = (item.recipientMobile || '').toLowerCase().includes(q);
        const matchesStaff = (item.deliveredBy || '').toLowerCase().includes(q);
        if (
          !matchesName &&
          !matchesNationalId &&
          !matchesMobile &&
          !matchesMemberNum &&
          !matchesProxyName &&
          !matchesProxyMobile &&
          !matchesStaff
        ) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        if (item.status !== statusFilter) return false;
      }

      // 3. Bus Filter
      if (busFilter !== 'all') {
        if ((item.busNumber || '').trim() !== busFilter.trim()) return false;
      }

      // 4. Recipient Type Filter
      if (recipientTypeFilter !== 'all') {
        if (item.recipientType !== recipientTypeFilter) return false;
      }

      return true;
    });
  }, [allRegistryItems, searchQuery, statusFilter, busFilter, recipientTypeFilter]);

  // Export current table view to CSV
  const handleExportFilteredCSV = () => {
    const headers = [
      'م',
      'اسم الحاج',
      'رقم العضوية',
      'رقم الهوية',
      'رقم الجوال',
      'رقم الباص',
      'الرحلة الجوية',
      'حالة الهدية',
      'صفة المستلم',
      'اسم المستلم الفعلي',
      'جوال المستلم',
      'صلة القرابة',
      'تاريخ التسليم',
      'وقت التسليم',
      'الموظف المسؤول',
      'مكان التسليم',
      'الملاحظات',
    ];

    const rows = filteredItems.map((item, idx) => [
      idx + 1,
      item.pilgrimName,
      item.membershipNumber || '',
      item.nationalId,
      item.mobile,
      item.busNumber || 'غير محدد',
      item.flightNumber || 'غير محدد',
      getStatusLabelArabic(item.status),
      item.recipientType === 'proxy' ? 'إنابة' : item.status === 'delivered_direct' ? 'الحاج نفسه' : '-',
      item.recipientName || '-',
      item.recipientMobile || '-',
      item.recipientRelation || '-',
      item.deliveryDate || '-',
      item.deliveryTime || '-',
      item.deliveredBy || '-',
      item.deliveryLocation || '-',
      item.notes || '-',
    ]);

    const csvContent = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    downloadCsvFile(csvContent, `سجل_توزيع_هدايا_الحجاج_${Date.now()}`);
  };

  // Trigger Print Preview
  const handlePrintRegistry = () => {
    const columns = ['م', 'اسم الحاج', 'العضوية', 'الهوية', 'الجوال', 'الباص', 'الحالة', 'المستلم الفعلي', 'تاريخ التسليم', 'الموظف المسؤول'];
    const data = filteredItems.map((item, idx) => [
      idx + 1,
      item.pilgrimName,
      item.membershipNumber || '',
      item.nationalId,
      item.mobile,
      item.busNumber || 'غير محدد',
      getStatusLabelArabic(item.status),
      item.recipientName || (item.status === 'delivered_direct' ? 'الحاج نفسه' : 'لم يستلم'),
      item.deliveryDate ? `${item.deliveryDate} ${item.deliveryTime || ''}` : '-',
      item.deliveredBy || '-',
    ]);

    const deliveredCount = filteredItems.filter((i) => i.status === 'delivered_direct' || i.status === 'delivered_proxy').length;

    onPrintPreview(
      'سجل توزيع هدايا الحجاج',
      columns,
      data,
      [
        { label: 'إجمالي السجلات المعروضة', value: filteredItems.length },
        { label: 'الهدايا المسلمة', value: deliveredCount },
        { label: 'الهدايا المتبقية', value: filteredItems.length - deliveredCount },
      ]
    );
  };

  return (
    <div className="space-y-5 animate-fadeIn" dir="rtl">
      {/* Search & Filter Bar */}
      <div className="bg-[#0B1221] border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الحاج، الهوية، الجوال، اسم المستلم بالإنابة، أو الموظف..."
              className="w-full bg-[#10192D] border border-slate-700 focus:border-amber-400 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold whitespace-nowrap">الحالة:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#10192D] border border-slate-700 text-xs text-amber-300 font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="all">جميع الحالات ({allRegistryItems.length})</option>
                <option value="delivered_direct">تم التسليم مباشرة للحاج</option>
                <option value="delivered_proxy">تم التسليم لشخص ينوب</option>
                <option value="not_delivered">لم يتم التسليم</option>
                <option value="contacted_no_show">تم التواصل ولم يحضر</option>
                <option value="unable_to_deliver">تعذر التسليم</option>
                <option value="postponed">مؤجل لموعد آخر</option>
              </select>
            </div>

            {/* Bus Filter */}
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

            {/* Recipient Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold whitespace-nowrap">المستلم:</span>
              <select
                value={recipientTypeFilter}
                onChange={(e) => setRecipientTypeFilter(e.target.value)}
                className="bg-[#10192D] border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="all">الكل</option>
                <option value="pilgrim">الحاج نفسه</option>
                <option value="proxy">بالإنابة</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Controls & Counters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="text-slate-300">
            عدد السجلات المطابقة:{' '}
            <strong className="text-amber-400 font-mono font-bold text-sm">{filteredItems.length}</strong>{' '}
            حاج من أصل <span className="font-mono">{allRegistryItems.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportFilteredCSV}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel/CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrintRegistry}
              className="px-3.5 py-1.5 rounded-xl bg-[#15223B] hover:bg-[#1E3052] text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>معاينة وطباعة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Table */}
      <div className="bg-[#0B1221] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#10192D] border-b border-slate-800 text-slate-300 font-bold whitespace-nowrap">
                <th className="p-3.5 text-center">م</th>
                <th className="p-3.5">اسم الحاج</th>
                <th className="p-3.5 text-center">رقم العضوية</th>
                <th className="p-3.5 text-center">رقم الهوية</th>
                <th className="p-3.5 text-center">الجوال</th>
                <th className="p-3.5 text-center">الباص</th>
                <th className="p-3.5 text-center">الرحلة</th>
                <th className="p-3.5 text-center">حالة استلام الهدية</th>
                <th className="p-3.5">المستلم الفعلي</th>
                <th className="p-3.5 text-center">تاريخ ووقت التسليم</th>
                <th className="p-3.5">الموظف المسؤول</th>
                <th className="p-3.5">مكان التسليم</th>
                <th className="p-3.5 text-center">الإجراءات والتوثيق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    لا توجد سجلات مطابقة للبحث أو التصفية الحالية.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isDelivered =
                    item.status === 'delivered_direct' || item.status === 'delivered_proxy';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#10192D]/60 transition-colors duration-150"
                    >
                      {/* 1. Seq */}
                      <td className="p-3 text-center font-mono font-bold text-amber-500/80 bg-amber-500/[0.02]">
                        {idx + 1}
                      </td>

                      {/* 2. Pilgrim Name */}
                      <td className="p-3 whitespace-nowrap">
                        <strong className="text-white block font-bold">{item.pilgrimName}</strong>
                      </td>

                      {/* 3. Membership # */}
                      <td className="p-3 text-center font-mono text-[11px] text-amber-400 whitespace-nowrap">
                        {item.membershipNumber || 'QAEM-1448'}
                      </td>

                      {/* 4. National ID */}
                      <td className="p-3 text-center font-mono text-[11px] text-slate-300" dir="ltr">
                        {item.nationalId}
                      </td>

                      {/* 5. Mobile */}
                      <td className="p-3 text-center font-mono text-[11px]" dir="ltr">
                        <a
                          href={`tel:${item.mobile}`}
                          className="text-slate-300 hover:text-amber-400 hover:underline"
                        >
                          {item.mobile}
                        </a>
                      </td>

                      {/* 6. Bus */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold text-[11px]">
                          {item.busNumber || 'غير محدد'}
                        </span>
                      </td>

                      {/* 7. Flight */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/25 font-bold text-[11px]">
                          {item.flightNumber || 'غير محدد'}
                        </span>
                      </td>

                      {/* 8. Delivery Status Badge */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            item.status === 'delivered_direct'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : item.status === 'delivered_proxy'
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                              : item.status === 'contacted_no_show'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : item.status === 'unable_to_deliver'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : item.status === 'postponed'
                              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.status === 'delivered_direct' ? (
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                          ) : item.status === 'delivered_proxy' ? (
                            <Users className="w-3 h-3 shrink-0" />
                          ) : item.status === 'contacted_no_show' ? (
                            <Clock className="w-3 h-3 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 shrink-0" />
                          )}
                          <span>{getStatusLabelArabic(item.status)}</span>
                        </span>
                      </td>

                      {/* 9. Actual Recipient */}
                      <td className="p-3 whitespace-nowrap">
                        {isDelivered ? (
                          <div>
                            <strong className="text-white block text-xs">
                              {item.recipientName || item.pilgrimName}
                            </strong>
                            <span className="text-[10px] text-slate-400 block">
                              {item.recipientType === 'pilgrim'
                                ? 'الحاج نفسه'
                                : `إنابة (${item.proxyType || 'قريب'}: ${item.recipientRelation || ''})`}
                            </span>
                            {item.recipientMobile && item.recipientType === 'proxy' && (
                              <span className="text-[10px] text-sky-300/80 font-mono" dir="ltr">
                                {item.recipientMobile}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* 10. Date & Time */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {item.deliveryDate ? (
                          <div className="font-mono text-[11px] text-slate-300">
                            <div>{item.deliveryDate}</div>
                            <div className="text-[10px] text-slate-500">{item.deliveryTime}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* 11. Staff */}
                      <td className="p-3 whitespace-nowrap text-slate-300 text-xs">
                        {item.deliveredBy || <span className="text-slate-500">-</span>}
                      </td>

                      {/* 12. Location */}
                      <td className="p-3 whitespace-nowrap text-slate-300 text-xs">
                        {item.deliveryLocation || <span className="text-slate-500">-</span>}
                      </td>

                      {/* 13. Actions */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Deliver Button */}
                          <button
                            type="button"
                            onClick={() => onOpenDeliveryModal(item)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                              isDelivered
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-sm'
                            }`}
                            title={isDelivered ? 'تعديل بيانات التسليم' : 'تسجيل تسليم الهدية'}
                          >
                            <Gift className="w-3.5 h-3.5" />
                            <span>{isDelivered ? 'تعديل التسليم' : 'تسجيل تسليم'}</span>
                          </button>

                          {/* Follow-up Button (if not delivered) */}
                          {!isDelivered && (
                            <button
                              type="button"
                              onClick={() => onOpenFollowUpModal(item)}
                              className="px-2 py-1 rounded-xl bg-[#15223B] hover:bg-[#1E3052] text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                              title="تسجيل محاولة تواصل أو موعد جديد"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">تواصل</span>
                            </button>
                          )}

                          {/* Details & History Modal */}
                          <button
                            type="button"
                            onClick={() => onOpenHistoryModal(item)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="عرض تفاصيل وسجل العمليات الكامل"
                          >
                            <Info className="w-4 h-4" />
                          </button>
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
  );
};
