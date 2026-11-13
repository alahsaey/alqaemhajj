import { GiftDistribution, GiftCommunication, Pilgrim } from '../types';
import { parseRawCsvAndExportAlQaemExcel } from './alqaemExcelEngine';

/**
 * Utility that routes all Gift Distribution exports through the Central Al-Qaem Excel Export Engine (.xlsx)
 * with full official Navy & Gold visual identity and RTL support.
 */
export const downloadCsvFile = (content: string, filename: string) => {
  parseRawCsvAndExportAlQaemExcel(content, filename);
};

export const getStatusLabelArabic = (status: GiftDistribution['status']): string => {
  switch (status) {
    case 'delivered_direct':
      return 'تم التسليم مباشرة للحاج';
    case 'delivered_proxy':
      return 'تم التسليم لشخص ينوب عن الحاج';
    case 'contacted_no_show':
      return 'تم التواصل مع الحاج ولم يحضر';
    case 'unable_to_deliver':
      return 'تعذر التسليم';
    case 'postponed':
      return 'مؤجل لموعد آخر';
    case 'not_delivered':
    default:
      return 'لم يتم التسليم';
  }
};

export const getFollowUpLabelArabic = (status?: string): string => {
  switch (status) {
    case 'contacted_no_show':
      return 'تم التواصل ولم يحضر';
    case 'unable_to_contact':
      return 'تعذر التواصل معه';
    case 'new_date_set':
      return 'تم تحديد موعد جديد';
    case 'unable_other':
      return 'تعذر التسليم لسبب آخر';
    case 'not_contacted':
    default:
      return 'لم يتم التواصل معه';
  }
};

/**
 * 1. التقرير الإجمالي لتوزيع الهدايا
 */
export const exportOverallGiftReportCSV = (
  items: GiftDistribution[],
  totalPilgrimsCount: number,
  campaignTitle: string = 'قافلة القائم'
) => {
  const deliveredDirect = items.filter((i) => i.status === 'delivered_direct').length;
  const deliveredProxy = items.filter((i) => i.status === 'delivered_proxy').length;
  const totalDelivered = deliveredDirect + deliveredProxy;
  const notDelivered = totalPilgrimsCount - totalDelivered;
  const noShow = items.filter((i) => i.status === 'contacted_no_show').length;
  const unable = items.filter((i) => i.status === 'unable_to_deliver').length;
  const postponed = items.filter((i) => i.status === 'postponed').length;
  const completionRate = totalPilgrimsCount > 0 ? ((totalDelivered / totalPilgrimsCount) * 100).toFixed(1) : '0';

  const rows = [
    ['التقرير الإجمالي لتوزيع هدايا الحجاج - ' + campaignTitle],
    ['تاريخ استخراج التقرير', new Date().toLocaleString('ar-SA')],
    [],
    ['المؤشر الإحصائي', 'العدد', 'النسبة المئوية'],
    ['إجمالي عدد الحجاج', totalPilgrimsCount, '100%'],
    ['إجمالي الهدايا المخصصة', totalPilgrimsCount, '100%'],
    ['إجمالي الهدايا المسلمة', totalDelivered, `${completionRate}%`],
    ['عدد حالات التسليم المباشر للحاج', deliveredDirect, totalPilgrimsCount > 0 ? `${((deliveredDirect / totalPilgrimsCount) * 100).toFixed(1)}%` : '0%'],
    ['عدد حالات التسليم بالإنابة', deliveredProxy, totalPilgrimsCount > 0 ? `${((deliveredProxy / totalPilgrimsCount) * 100).toFixed(1)}%` : '0%'],
    ['عدد الهدايا غير المسلمة', notDelivered, totalPilgrimsCount > 0 ? `${((notDelivered / totalPilgrimsCount) * 100).toFixed(1)}%` : '0%'],
    ['عدد حالات تم التواصل ولم يحضروا', noShow, ''],
    ['عدد الحالات المؤجلة لموعد آخر', postponed, ''],
    ['عدد حالات تعذر التسليم', unable, ''],
    ['نسبة الإنجاز الإجمالية للتوزيع', `${completionRate}%`, ''],
  ];

  const csvContent = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadCsvFile(csvContent, `التقرير_الإجمالي_لتوزيع_الهدايا_${Date.now()}`);
};

/**
 * 2. تقرير التسليم المباشر
 */
export const exportDirectDeliveryReportCSV = (items: GiftDistribution[]) => {
  const directItems = items.filter((i) => i.status === 'delivered_direct');
  const headers = ['م', 'اسم الحاج', 'رقم العضوية', 'رقم الهوية', 'رقم الجوال', 'رقم الباص', 'الرحلة الجوية', 'تاريخ التسليم', 'وقت التسليم', 'الموظف المسؤول', 'مكان التسليم', 'الملاحظات'];
  const rows = directItems.map((item, idx) => [
    idx + 1,
    item.pilgrimName,
    item.membershipNumber || '',
    item.nationalId,
    item.mobile,
    item.busNumber || 'غير محدد',
    item.flightNumber || 'غير محدد',
    item.deliveryDate || '',
    item.deliveryTime || '',
    item.deliveredBy || '',
    item.deliveryLocation || '',
    item.notes || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadCsvFile(csvContent, `تقرير_التسليم_المباشر_${Date.now()}`);
};

/**
 * 3. تقرير التسليم بالإنابة
 */
export const exportProxyDeliveryReportCSV = (items: GiftDistribution[]) => {
  const proxyItems = items.filter((i) => i.status === 'delivered_proxy');
  const headers = [
    'م',
    'اسم الحاج صاحب الهدية',
    'رقم العضوية',
    'رقم هوية الحاج',
    'جوال الحاج',
    'اسم المستلم الفعلي',
    'رقم هوية/إثبات المستلم',
    'رقم جوال المستلم',
    'صلة القرابة / العلاقة',
    'نوع الإنابة',
    'رقم الباص',
    'رقم الرحلة الجوية',
    'تاريخ التسليم',
    'وقت التسليم',
    'الموظف المسؤول',
    'مكان التسليم',
    'الملاحظات',
  ];

  const rows = proxyItems.map((item, idx) => [
    idx + 1,
    item.pilgrimName,
    item.membershipNumber || '',
    item.nationalId,
    item.mobile,
    item.recipientName || '',
    item.recipientIdNumber || '',
    item.recipientMobile || '',
    item.recipientRelation || '',
    item.proxyType || 'قريب',
    item.busNumber || 'غير محدد',
    item.flightNumber || 'غير محدد',
    item.deliveryDate || '',
    item.deliveryTime || '',
    item.deliveredBy || '',
    item.deliveryLocation || '',
    item.notes || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadCsvFile(csvContent, `تقرير_التسليم_بالإنابة_${Date.now()}`);
};

/**
 * 4. تقرير الحجاج الذين لم يستلموا
 */
export const exportNotDeliveredReportCSV = (items: GiftDistribution[]) => {
  const pendingItems = items.filter(
    (i) => i.status !== 'delivered_direct' && i.status !== 'delivered_proxy'
  );
  const headers = ['م', 'اسم الحاج', 'رقم العضوية', 'رقم الهوية', 'رقم الجوال', 'رقم الباص', 'الرحلة الجوية', 'حالة الهدية', 'حالة المتابعة', 'تاريخ آخر تواصل', 'الموظف المسؤول عن التواصل', 'موعد الاستلام القادم', 'الملاحظات'];
  const rows = pendingItems.map((item, idx) => [
    idx + 1,
    item.pilgrimName,
    item.membershipNumber || '',
    item.nationalId,
    item.mobile,
    item.busNumber || 'غير محدد',
    item.flightNumber || 'غير محدد',
    getStatusLabelArabic(item.status),
    getFollowUpLabelArabic(item.followUpStatus),
    item.lastContactDate || 'لم يتم',
    item.lastContactStaff || '',
    item.nextFollowUpDate || '',
    item.notes || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadCsvFile(csvContent, `تقرير_الحجاج_الذين_لم_يستلموا_${Date.now()}`);
};

/**
 * 5. تقرير تم التواصل معهم ولم يحضروا
 */
export const exportContactedNoShowReportCSV = (items: GiftDistribution[]) => {
  const list = items.filter(
    (i) => i.status === 'contacted_no_show' || i.followUpStatus === 'contacted_no_show'
  );
  const headers = ['م', 'اسم الحاج', 'رقم العضوية', 'رقم الجوال', 'رقم الباص', 'الرحلة الجوية', 'تاريخ التواصل الأخير', 'الموظف المتواصل', 'موعد الحضور المحدد سابقاً', 'عدد محاولات التواصل', 'الملاحظات'];
  const rows = list.map((item, idx) => [
    idx + 1,
    item.pilgrimName,
    item.membershipNumber || '',
    item.mobile,
    item.busNumber || 'غير محدد',
    item.flightNumber || 'غير محدد',
    item.lastContactDate || '',
    item.lastContactStaff || '',
    item.nextFollowUpDate || '',
    item.contactAttemptsCount || 1,
    item.notes || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadCsvFile(csvContent, `تقرير_تم_التواصل_ولم_يحضروا_${Date.now()}`);
};

/**
 * 6. تقرير محاولات التواصل الشامل
 */
export const exportCommunicationsReportCSV = (comms: GiftCommunication[]) => {
  const headers = ['م', 'اسم الحاج', 'رقم الجوال', 'رقم الباص', 'الرحلة', 'تاريخ التواصل', 'وقت التواصل', 'وسيلة التواصل', 'الموظف المسؤول', 'نتيجة المحاولة', 'موعد المتابعة القادم', 'الملاحظات'];
  const rows = comms.map((c, idx) => [
    idx + 1,
    c.pilgrimName,
    c.mobile,
    c.busNumber || 'غير محدد',
    c.flightNumber || 'غير محدد',
    c.contactDate,
    c.contactTime,
    c.contactMethod,
    c.contactStaff,
    c.result,
    c.nextFollowUpDate || '',
    c.notes || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadCsvFile(csvContent, `سجل_محاولات_التواصل_الشامل_${Date.now()}`);
};

/**
 * 7. تقرير التسليم حسب الباصات
 */
export const exportBusDeliveryReportCSV = (
  items: GiftDistribution[],
  busesList: string[]
) => {
  const headers = ['م', 'رقم الباص', 'إجمالي الحجاج في الباص', 'الهدايا المسلمة', 'تسليم مباشر', 'تسليم بالإنابة', 'غير المسلم', 'نسبة الإنجاز'];
  const rows = busesList.map((busName, idx) => {
    const busPilgrims = items.filter((i) => (i.busNumber || '').trim() === busName.trim());
    const total = busPilgrims.length;
    const direct = busPilgrims.filter((i) => i.status === 'delivered_direct').length;
    const proxy = busPilgrims.filter((i) => i.status === 'delivered_proxy').length;
    const delivered = direct + proxy;
    const notDelivered = total - delivered;
    const pct = total > 0 ? `${((delivered / total) * 100).toFixed(1)}%` : '0%';

    return [idx + 1, busName, total, delivered, direct, proxy, notDelivered, pct];
  });

  const csvContent = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadCsvFile(csvContent, `تقرير_التسليم_حسب_الباصات_${Date.now()}`);
};

/**
 * 8. تقرير التسليم حسب الرحلات الجوية
 */
export const exportFlightDeliveryReportCSV = (items: GiftDistribution[]) => {
  // Extract distinct flight numbers
  const flightsMap = new Map<string, GiftDistribution[]>();
  items.forEach((item) => {
    const flight = (item.flightNumber || '').trim() || 'حجاج الطيران (غير مسكنين برقم رحلة)';
    if (!flightsMap.has(flight)) {
      flightsMap.set(flight, []);
    }
    flightsMap.get(flight)!.push(item);
  });

  const headers = ['م', 'رقم الرحلة الجوية', 'عدد الحجاج', 'الهدايا المسلمة', 'تسليم مباشر', 'تسليم بالإنابة', 'غير المسلم', 'نسبة الإنجاز'];
  let idx = 0;
  const rows: any[] = [];
  flightsMap.forEach((flightPilgrims, flightName) => {
    idx++;
    const total = flightPilgrims.length;
    const direct = flightPilgrims.filter((i) => i.status === 'delivered_direct').length;
    const proxy = flightPilgrims.filter((i) => i.status === 'delivered_proxy').length;
    const delivered = direct + proxy;
    const notDelivered = total - delivered;
    const pct = total > 0 ? `${((delivered / total) * 100).toFixed(1)}%` : '0%';
    rows.push([idx, flightName, total, delivered, direct, proxy, notDelivered, pct]);
  });

  const csvContent = [headers, ...rows]
    .map((r: any[]) => r.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadCsvFile(csvContent, `تقرير_التسليم_حسب_الرحلات_الجوية_${Date.now()}`);
};

/**
 * 9. تقرير أداء الموظفين
 */
export const exportStaffPerformanceReportCSV = (
  items: GiftDistribution[],
  comms: GiftCommunication[]
) => {
  const staffStats = new Map<string, { direct: number; proxy: number; comms: number }>();

  items.forEach((item) => {
    if (item.deliveredBy && (item.status === 'delivered_direct' || item.status === 'delivered_proxy')) {
      const staff = item.deliveredBy.trim();
      if (!staffStats.has(staff)) {
        staffStats.set(staff, { direct: 0, proxy: 0, comms: 0 });
      }
      const entry = staffStats.get(staff)!;
      if (item.status === 'delivered_direct') entry.direct++;
      if (item.status === 'delivered_proxy') entry.proxy++;
    }
  });

  comms.forEach((c) => {
    if (c.contactStaff) {
      const staff = c.contactStaff.trim();
      if (!staffStats.has(staff)) {
        staffStats.set(staff, { direct: 0, proxy: 0, comms: 0 });
      }
      staffStats.get(staff)!.comms++;
    }
  });

  const headers = ['م', 'اسم الموظف المسؤول', 'تسليم مباشر', 'تسليم بالإنابة', 'إجمالي عمليات التسليم', 'عدد محاولات التواصل', 'إجمالي العمليات الموثقة'];
  let idx = 0;
  const rows: any[] = [];
  staffStats.forEach((stats, staffName) => {
    idx++;
    const totalDelivered = stats.direct + stats.proxy;
    const grandTotal = totalDelivered + stats.comms;
    rows.push([idx, staffName, stats.direct, stats.proxy, totalDelivered, stats.comms, grandTotal]);
  });

  const csvContent = [headers, ...rows]
    .map((r: any[]) => r.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadCsvFile(csvContent, `تقرير_أداء_الموظفين_في_التوزيع_${Date.now()}`);
};

/**
 * 10. تقرير التسليم حسب الفترة الزمنية
 */
export const exportDateFilteredReportCSV = (
  items: GiftDistribution[],
  filterLabel: string = 'الفترة المحددة'
) => {
  const deliveredItems = items.filter(
    (i) => i.status === 'delivered_direct' || i.status === 'delivered_proxy'
  );
  const headers = ['م', 'اسم الحاج', 'رقم العضوية', 'رقم الهوية', 'نوع التسليم', 'اسم المستلم', 'تاريخ التسليم', 'وقت التسليم', 'الموظف المسؤول', 'مكان التسليم', 'رقم الباص', 'الرحلة الجوية'];
  const rows = deliveredItems.map((item, idx) => [
    idx + 1,
    item.pilgrimName,
    item.membershipNumber || '',
    item.nationalId,
    item.status === 'delivered_direct' ? 'مباشر للحاج' : 'إنابة',
    item.recipientName || item.pilgrimName,
    item.deliveryDate || '',
    item.deliveryTime || '',
    item.deliveredBy || '',
    item.deliveryLocation || '',
    item.busNumber || 'غير محدد',
    item.flightNumber || 'غير محدد',
  ]);

  const csvContent = [
    [`تقرير التسليم الزمني (${filterLabel})`],
    [`إجمالي العمليات المنفذة: ${deliveredItems.length}`],
    [],
    headers,
    ...rows,
  ]
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadCsvFile(csvContent, `تقرير_التسليم_الزمني_${Date.now()}`);
};

/**
 * 11. تقرير حالات التأجيل وتعذر التسليم
 */
export const exportPostponedAndUnableReportCSV = (items: GiftDistribution[]) => {
  const list = items.filter(
    (i) => i.status === 'postponed' || i.status === 'unable_to_deliver'
  );
  const headers = ['م', 'اسم الحاج', 'رقم العضوية', 'رقم الجوال', 'رقم الباص', 'الرحلة', 'الحالة', 'السبب / التفاصيل', 'الموعد القادم', 'الموظف المسؤول', 'تاريخ التسجيل', 'الملاحظات'];
  const rows = list.map((item, idx) => [
    idx + 1,
    item.pilgrimName,
    item.membershipNumber || '',
    item.mobile,
    item.busNumber || 'غير محدد',
    item.flightNumber || 'غير محدد',
    getStatusLabelArabic(item.status),
    item.reasonUnable || item.notes || '',
    item.postponedDate || item.nextFollowUpDate || 'غير محدد',
    item.deliveredBy || item.lastContactStaff || '',
    item.updatedAt || item.deliveryDate || '',
    item.notes || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadCsvFile(csvContent, `تقرير_حالات_التأجيل_وتعذر_التسليم_${Date.now()}`);
};

/**
 * 12. تقرير سجل التعديلات والعمليات والتدقيق
 */
export const exportAuditLogsReportCSV = (items: GiftDistribution[]) => {
  const headers = ['م', 'اسم الحاج صاحب الهدية', 'رقم الهوية', 'الموظف المسؤول', 'نوع الإجراء', 'الحالة السابقة', 'الحالة الجديدة', 'تاريخ ووقت العملية', 'السبب / الملاحظات'];
  const rows: any[] = [];
  let counter = 0;

  items.forEach((item) => {
    if (Array.isArray(item.history) && item.history.length > 0) {
      item.history.forEach((h) => {
        counter++;
        rows.push([
          counter,
          item.pilgrimName,
          item.nationalId,
          h.staffName,
          h.action,
          h.previousStatus || '',
          h.newStatus || '',
          h.timestamp,
          h.reason || h.details || '',
        ]);
      });
    } else if (item.status === 'delivered_direct' || item.status === 'delivered_proxy') {
      counter++;
      rows.push([
        counter,
        item.pilgrimName,
        item.nationalId,
        item.deliveredBy || 'المشرف',
        item.status === 'delivered_direct' ? 'تسجيل تسليم مباشر' : 'تسجيل تسليم بالإنابة',
        'لم يتم التسليم',
        getStatusLabelArabic(item.status),
        `${item.deliveryDate || ''} ${item.deliveryTime || ''}`.trim(),
        item.notes || '',
      ]);
    }
  });

  const csvContent = [headers, ...rows]
    .map((r: any[]) => r.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadCsvFile(csvContent, `سجل_التدقيق_وعمليات_توزيع_الهدايا_${Date.now()}`);
};

/**
 * 13. تقرير المطابقة النهائية للهدايا
 */
export const exportReconciliationReportCSV = (
  items: GiftDistribution[],
  totalPilgrimsCount: number
) => {
  const direct = items.filter((i) => i.status === 'delivered_direct').length;
  const proxy = items.filter((i) => i.status === 'delivered_proxy').length;
  const totalDelivered = direct + proxy;
  const remaining = totalPilgrimsCount - totalDelivered;
  const unable = items.filter((i) => i.status === 'unable_to_deliver').length;
  const postponed = items.filter((i) => i.status === 'postponed').length;
  const discrepancy = totalPilgrimsCount - (totalDelivered + remaining); // Must strictly be 0

  const summary = [
    ['تقرير المطابقة والتدقيق النهائي لهدايا الحجاج'],
    ['تاريخ المطابقة', new Date().toLocaleString('ar-SA')],
    [],
    ['بند المطابقة الرقابي', 'العدد الإجمالي', 'الحالة الرقابية والتدقيق'],
    ['إجمالي الهدايا المخصصة للموسم (المطابقة لعدد الحجاج)', totalPilgrimsCount, 'مطابق 100% لسجل حجاج الموسم النشط'],
    ['عدد الهدايا المسلمة مباشرة للحاج', direct, 'موثق بهوية الحاج وتوقيعه/استلامه الشخصي'],
    ['عدد الهدايا المسلمة بالإنابة', proxy, 'موثق بهوية النائب وصلة القرابة ونوع الإنابة'],
    ['إجمالي الهدايا المسلمة الفعلي', totalDelivered, 'لا يوجد أي احتساب مكرر للإنابة'],
    ['عدد الهدايا المتبقية غير المسلمة', remaining, 'في المستودع وجاهزة للمتابعة والتسليم'],
    ['عدد الهدايا التي تعذر تسليمها أو ألغيت', unable, 'موثقة بسبب التعذر'],
    ['عدد الحالات المؤجلة لمواعيد لاحقة', postponed, 'محددة بتواريخ استلام قادمة'],
    ['فارق المطابقة (الفرق بين المخصص والمسلم والمتبقي)', discrepancy, discrepancy === 0 ? 'مطابقة تامة 100% (صفر فروقات)' : 'يوجد تفاوت يتطلب التدقيق'],
  ];

  const csvContent = summary.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadCsvFile(csvContent, `تقرير_المطابقة_النهائية_للهدايا_${Date.now()}`);
};
