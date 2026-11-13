import ExcelJS from 'exceljs';

/**
 * الهوية البصرية المركزية لنظام قافلة القائم للحج والعمرة والزيارة
 * مستخرجة مباشرة من واجهة النظام المعتمدة (#0B1221 / #0C1220 / #10192D / #12192C / #F4C84A / #C5A45D / #20B995 / #35B8E8)
 */
export const ALQAEM_EXCEL_BRAND = {
  systemName: 'قافلة القائم للحج والعمرة والزيارة',
  entityHeader: 'إدارة قافلة القائم للحج والعمرة والزيارة — منظومة التقارير الرسمية المعتمدة',
  seasonLabel: 'موسم الحج والعمرة 1448هـ',
  logoUrl: '/assets/aistudio/media_1794134676879_98f1e0ea.png',
  colors: {
    // الألوان الأساسية للهوية البصرية (ARGB بدون # لمكتبة ExcelJS)
    navy: 'FF0C1220',             // الكحلي الداكن: اللون الأساسي للخلفيات والعناوين الرئيسية (#0C1220)
    secondaryNavy: 'FF12192C',    // الكحلي المتوسط: لون البطاقات والمساحات الثانوية وشريط المعلومات (#12192C)
    gold: 'FFF4C84A',             // الذهبي المشرق: اللون الرئيسي للعناوين البارزة والعناصر المهمة (#F4C84A)
    mutedGold: 'FFC5A45D',        // الذهبي الهادئ: الفواصل والإطارات والتفاصيل الزخرفية (#C5A45D)
    turquoise: 'FF20B995',        // الأخضر الفيروزي: مؤشرات النشاط والنجاح والحالات الإيجابية (#20B995)
    skyBlue: 'FF35B8E8',          // الأزرق السماوي: العناوين الثانوية والمعلومات التفاعلية (#35B8E8)
    lightText: 'FFD6DCE8',        // النص الفاتح للترويسة وشريط المعلومات (#D6DCE8)
    white: 'FFFFFFFF',            // الأبيض النقي (#FFFFFF)
    borderNavy: 'FF263247',       // حدود الكحلي الهادئ (#263247)

    // ألوان النظام المزدوج لجدول البيانات (تضمن وضوح القراءة والطباعة وعدم استهلاك الحبر)
    rowWhite: 'FFFFFFFF',         // صفوف البيانات البيضاء (#FFFFFF)
    rowLightAlt: 'FFF4F7FB',      // صفوف البيانات المتناوبة بالرمادي الكحلي الفاتح (#F4F7FB)
    rowSeqFill: 'FFEEF2F8',       // خلفية عمود التسلسل الفاتحة (#EEF2F8)
    dataTextNavy: 'FF0C1220',     // نص البيانات الكحلي الداكن الواضح للطباعة (#0C1220)
    dataTextSecondary: 'FF334155',// نص ثانوي واضح (#334155)
    dataBorderLight: 'FFCBD5E1',  // حدود دقيقة باللون الرمادي الكحلي الهادئ (#CBD5E1)

    // تمييز الحالات الإيجابية بالأخضر الفيروزي (#20B995) مع خلفية فاتحة للطباعة
    positiveFill: 'FFE6F8F3',     // خلفية فيروزية فاتحة جداً (#E6F8F3)
    positiveText: 'FF0D7A5F',     // نص فيروزي داكن واضح (#0D7A5F)
    positiveBorder: 'FF20B995',   // إطار فيروزي (#20B995)

    // تمييز المجاميع والأرقام المهمة بالذهبي (#F4C84A / #C5A45D)
    goldHighlightFill: 'FFFFF9E6',// خلفية ذهبية فاتحة للأرقام المهمة والمجاميع (#FFF9E6)
    goldHighlightText: 'FF784F04',// نص ذهبي داكن للطباعة (#784F04)

    // تمييز المعلومات التفاعلية والرموز بالأزرق السماوي (#35B8E8)
    skyHighlightFill: 'FFEEF8FD', // خلفية سماوية فاتحة (#EEF8FD)
    skyHighlightText: 'FF0369A1', // نص سماوي داكن واضح (#0369A1)
  },
  cssColors: {
    navy: '#0C1220',
    secondaryNavy: '#12192C',
    gold: '#F4C84A',
    mutedGold: '#C5A45D',
    turquoise: '#20B995',
    skyBlue: '#35B8E8',
    lightText: '#D6DCE8',
    border: '#263247',
  },
} as const;

export interface AlQaemExcelSummaryItem {
  label: string;
  value: string | number;
}

export interface AlQaemExcelReportOptions {
  /** عنوان التقرير الرئيسي باللون الذهبي */
  reportTitle: string;
  /** العنوان الفرعي أو وصف التقرير باللون الأزرق السماوي */
  subtitle?: string;
  /** تصنيف أو قسم التقرير (مثل: كشوف الحجاج، التقارير المالية، الإرشاد الديني...) */
  category?: string;
  /** اسم الملف عند التحميل (بدون امتداد) */
  filename: string;
  /** رؤوس الأعمدة */
  columns: string[];
  /** صفوف البيانات */
  rows: (string | number | boolean | null | undefined)[][];
  /** بطاقات أو مؤشرات ملخصة تظهر في شريط معلومات التقرير */
  summaryCards?: AlQaemExcelSummaryItem[];
  /** اسم الموظف أو المشرف المصدر للتقرير */
  generatedBy?: string;
  /** خيار تحديد وترتيب أعمدة معينة من نافذة إعداد التقرير (مصفوفة فهارس الأعمدة المختارة بالترتيب المطلوب) */
  OrderedSelectedColumnIndices?: number[];
}

// ذاكرة مؤقتة لشعار القافلة بصيغة Base64 لتضمينه في جميع ملفات Excel بسرعة فائقة
let cachedLogoBase64: string | null = null;

async function fetchAlQaemLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const response = await fetch(ALQAEM_EXCEL_BRAND.logoUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          cachedLogoBase64 = reader.result;
          resolve(reader.result);
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * فحص ما إذا كانت القيمة تمثل حالة إيجابية لتمييزها باللون الأخضر الفيروزي (#20B995)
 */
function isPositiveStatusValue(valStr: string, colHeader: string): boolean {
  const clean = valStr.trim();
  if (!clean) return false;

  const exactPositives = new Set([
    'نعم',
    'نعم (مؤكد)',
    'مؤكد',
    'تم القبول',
    'مكتمل',
    'تم التسليم',
    'تم التسليم مباشرة للحاج',
    'مباشر للحاج',
    'حاضر',
    'اجتاز',
    'نشط',
    'سليم ولله الحمد',
    'تم التعليم',
    'تم التطويف',
    'متقن',
    'مفعلة',
    'معتمد',
    '100%',
    '100.0%',
  ]);

  if (exactPositives.has(clean)) return true;

  if (
    clean.startsWith('مؤكد الدفع') ||
    clean.startsWith('تم التسليم') ||
    clean.startsWith('مطابق 100%') ||
    clean.startsWith('مكتمل (') ||
    clean.includes('مطابقة تامة 100%')
  ) {
    return true;
  }

  // إذا كان العمود يمثل نسبة إنجاز وتجاوزت 80%
  if (
    (colHeader.includes('نسبة') || colHeader.includes('الإنجاز') || colHeader.includes('الدرجة')) &&
    clean.endsWith('%')
  ) {
    const num = parseFloat(clean.replace('%', ''));
    if (!isNaN(num) && num >= 80) return true;
  }

  return false;
}

/**
 * فحص ما إذا كان العمود أو الخلية يمثل مبلغاً مالياً أو مجموعاً مهماً لإبرازه باللون الذهبي
 */
function isImportantNumberOrTotalColumn(colHeader: string): boolean {
  const h = colHeader.trim();
  return (
    h.includes('المبلغ') ||
    h.includes('سعر') ||
    h.includes('ريال') ||
    h.includes('إجمالي') ||
    h.includes('الإجمالي') ||
    h.includes('المسندون') ||
    h.includes('الهدايا المسلمة')
  );
}

/**
 * فحص ما إذا كان العمود يمثل معلومة تفاعلية أو مرجعية لإبرازه بالأزرق السماوي (#35B8E8)
 */
function isInteractiveOrReferenceColumn(colHeader: string, valStr: string): boolean {
  const h = colHeader.trim();
  if (
    h.includes('رقم العضوية') ||
    h.includes('رقم الملف') ||
    h.includes('الرقم التسلسلي المرجعي') ||
    h.includes('PNR') ||
    h.includes('رقم التذكرة') ||
    h.includes('رقم الباص') ||
    h.includes('رحلة')
  ) {
    return valStr.trim() !== '' && valStr.trim() !== 'غير محدد' && valStr.trim() !== 'غير مخصص' && valStr.trim() !== '-';
  }
  return valStr.trim().startsWith('QAEM-');
}

/**
 * فحص ما إذا كان الصف بأكمله يمثل صف مجموع أو إجمالي نهائي
 */
function isSummaryOrTotalRow(rowValues: (string | number | boolean | null | undefined)[]): boolean {
  return rowValues.some((cell) => {
    const s = String(cell ?? '').trim();
    return (
      s.startsWith('إجمالي ') ||
      s.startsWith('الإجمالي الكلي') ||
      s.startsWith('المجموع الكلي') ||
      s.startsWith('نسبة الإنجاز الإجمالية') ||
      s.startsWith('فارق المطابقة')
    );
  });
}

/**
 * استنتاج عنوان التقرير وتصنيفه تلقائياً من اسم الملف إذا لم يُمرر صراحةً
 */
export function inferReportMetadataFromFilename(
  rawFilename: string,
  headers: string[]
): { title: string; category: string; subtitle: string } {
  const cleanName = rawFilename
    .replace(/_\d{4}-\d{2}-\d{2}$/, '')
    .replace(/_\d{10,}$/, '')
    .replace(/^قافلة_القائم_/, '')
    .replace(/_/g, ' ')
    .trim();

  let category = 'التقارير الإدارية والتشغيلية';
  if (cleanName.includes('المبالغ') || cleanName.includes('المالي') || cleanName.includes('دفعهم')) {
    category = 'التقارير المالية والتحصيلات';
  } else if (cleanName.includes('الطيران') || cleanName.includes('رحلات') || cleanName.includes('التذاكر')) {
    category = 'تقارير الطيران والتذاكر والوصول والمغادرة';
  } else if (cleanName.includes('الباصات') || cleanName.includes('اركاب') || cleanName.includes('المجموعات')) {
    category = 'كشوف المجموعات وإركاب الحافلات';
  } else if (cleanName.includes('سكن') || cleanName.includes('الغرف') || cleanName.includes('الوصول')) {
    category = 'تقارير السكن والوصول والمغادرة (المدينة • مكة • منى)';
  } else if (cleanName.includes('الصحية') || cleanName.includes('الطبية')) {
    category = 'تقارير الرعاية الطبية والحالات الصحية';
  } else if (cleanName.includes('المراجع') || cleanName.includes('التوعية') || cleanName.includes('حضور') || cleanName.includes('برنامج') || cleanName.includes('التعليمية') || cleanName.includes('المرشد')) {
    category = 'منظومة الإرشاد الديني والتوعية';
  } else if (cleanName.includes('هدايا') || cleanName.includes('التسليم') || cleanName.includes('المطابقة') || cleanName.includes('التواصل')) {
    category = 'منظومة توزيع الهدايا والمتابعة الميدانية';
  } else if (cleanName.includes('الرقابة') || cleanName.includes('النشاطات') || cleanName.includes('التدقيق') || cleanName.includes('المشرفين')) {
    category = 'تقارير المشرفين والإشراف والرقابة';
  } else if (cleanName.includes('الباقات') || cleanName.includes('الحجوزات')) {
    category = 'تقارير الحجوزات والباقات';
  } else if (cleanName.includes('الحجاج') || headers.some((h) => h.includes('اسم الحاج') || h.includes('الاسم الكامل'))) {
    category = 'كشوف وسجلات الحجاج المعتمدة';
  }

  const title = cleanName.startsWith('تقرير') || cleanName.startsWith('كشف') || cleanName.startsWith('سجل')
    ? cleanName
    : `كشف وتقرير: ${cleanName}`;

  const subtitle = `${category} — صادر رسمياً من نظام قافلة القائم للحج والعمرة والزيارة (${ALQAEM_EXCEL_BRAND.seasonLabel})`;

  return { title, category, subtitle };
}

// ============================================================================
// نظام الربط التفاعلي مع نافذة إعداد وتخصيص التقرير (Report Customizer Bus)
// ============================================================================
type CustomizerListener = (report: AlQaemExcelReportOptions | null) => void;
type LastReportListener = (report: AlQaemExcelReportOptions | null) => void;

let activeCustomizerReport: AlQaemExcelReportOptions | null = null;
let lastExportedReportConfig: AlQaemExcelReportOptions | null = null;
const customizerListeners = new Set<CustomizerListener>();
const lastReportListeners = new Set<LastReportListener>();

export function openAlQaemExcelCustomizer(report: AlQaemExcelReportOptions) {
  activeCustomizerReport = report;
  lastExportedReportConfig = report;
  customizerListeners.forEach((fn) => fn(activeCustomizerReport));
  lastReportListeners.forEach((fn) => fn(lastExportedReportConfig));
}

export function closeAlQaemExcelCustomizer() {
  activeCustomizerReport = null;
  customizerListeners.forEach((fn) => fn(null));
}

export function getLastExportedAlQaemReport(): AlQaemExcelReportOptions | null {
  return lastExportedReportConfig;
}

export function subscribeToAlQaemExcelCustomizer(listener: CustomizerListener): () => void {
  customizerListeners.add(listener);
  listener(activeCustomizerReport);
  return () => {
    customizerListeners.delete(listener);
  };
}

export function subscribeToLastExportedAlQaemReport(listener: LastReportListener): () => void {
  lastReportListeners.add(listener);
  listener(lastExportedReportConfig);
  return () => {
    lastReportListeners.delete(listener);
  };
}

/**
 * المحرك المركزي الموحد لتصدير جميع تقارير نظام قافلة القائم بصيغة Excel (.xlsx)
 * مع تطبيق الهوية البصرية الكاملة (الكحلي الداكن، الكحلي المتوسط، الذهبي المشرق، الذهبي الهادئ،
 * الأخضر الفيروزي، الأزرق السماوي، وجدول البيانات المزدوج الفاتح المناسب للقراءة والطباعة).
 */
export async function exportAlQaemExcelReport(options: AlQaemExcelReportOptions): Promise<void> {
  // حفظ نسخة من إعدادات التقرير لإتاحة إعادة تخصيص الأعمدة أو ترتيبها في أي وقت
  lastExportedReportConfig = {
    ...options,
    OrderedSelectedColumnIndices: undefined,
  };
  lastReportListeners.forEach((fn) => fn(lastExportedReportConfig));

  // تطبيق اختيار الأعمدة وترتيبها إن وجد من نافذة إعداد التقرير
  const validIndices =
    options.OrderedSelectedColumnIndices && options.OrderedSelectedColumnIndices.length > 0
      ? options.OrderedSelectedColumnIndices.filter(
          (idx) => idx >= 0 && idx < options.columns.length
        )
      : options.columns.map((_, idx) => idx);

  const effectiveColumns =
    validIndices.length > 0
      ? validIndices.map((idx) => options.columns[idx])
      : options.columns.length > 0
      ? options.columns
      : ['البيان', 'القيمة', 'التفاصيل'];

  const effectiveRows = options.rows.map((row) =>
    validIndices.length > 0 ? validIndices.map((idx) => row[idx] ?? '') : row
  );

  const colCount = Math.max(effectiveColumns.length, 3);
  const inferred = inferReportMetadataFromFilename(options.filename, effectiveColumns);
  const reportTitle = options.reportTitle || inferred.title;
  const category = options.category || inferred.category;
  const subtitle = options.subtitle || inferred.subtitle;
  const generatedBy = options.generatedBy || 'إدارة نظام قافلة القائم';
  const issueTimestamp = new Date().toLocaleString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = ALQAEM_EXCEL_BRAND.systemName;
  workbook.lastModifiedBy = generatedBy;
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = reportTitle
    .replace(/[\\/?*[\]:]/g, ' ')
    .trim()
    .slice(0, 31) || 'تقرير قافلة القائم';

  const hasSummaryRow = Boolean(options.summaryCards && options.summaryCards.length > 0);
  const tableHeaderRowNumber = hasSummaryRow ? 7 : 6;

  const sheet = workbook.addWorksheet(sheetName, {
    views: [
      {
        rightToLeft: true,
        showGridLines: true,
        state: 'frozen',
        ySplit: tableHeaderRowNumber,
      },
    ],
    pageSetup: {
      paperSize: 9, // A4
      orientation: colCount > 6 ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.35,
        bottom: 0.35,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  const { colors } = ALQAEM_EXCEL_BRAND;

  // دالة مساعدة لتلوين نطاق خلايا في صف معين
  const styleRowRange = (
    rowNumber: number,
    bgArgb: string,
    borderColorArgb: string = colors.borderNavy
  ) => {
    const row = sheet.getRow(rowNumber);
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: borderColorArgb } },
        bottom: { style: 'thin', color: { argb: borderColorArgb } },
        left: { style: 'thin', color: { argb: borderColorArgb } },
        right: { style: 'thin', color: { argb: borderColorArgb } },
      };
    }
  };

  // ==========================================================================
  // 1. الصف الأول: اسم الجهة والنظام في أعلى التقرير (خلفية كحلي داكن #0C1220)
  // ==========================================================================
  sheet.mergeCells(1, 1, 1, colCount);
  styleRowRange(1, colors.navy, colors.navy);
  const row1 = sheet.getRow(1);
  row1.height = 30;
  const r1Cell = row1.getCell(1);
  r1Cell.value = `${ALQAEM_EXCEL_BRAND.systemName}  •  ${ALQAEM_EXCEL_BRAND.seasonLabel}`;
  r1Cell.font = {
    name: 'Cairo',
    size: 12,
    bold: true,
    color: { argb: colors.lightText },
  };
  r1Cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // ==========================================================================
  // 2. الصف الثاني: عنوان التقرير باللون الذهبي المشرق (#F4C84A) على كحلي داكن (#0C1220)
  // ==========================================================================
  sheet.mergeCells(2, 1, 2, colCount);
  styleRowRange(2, colors.navy, colors.navy);
  const row2 = sheet.getRow(2);
  row2.height = 38;
  const r2Cell = row2.getCell(1);
  r2Cell.value = reportTitle;
  r2Cell.font = {
    name: 'Cairo',
    size: 16,
    bold: true,
    color: { argb: colors.gold },
  };
  r2Cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // ==========================================================================
  // 3. الصف الثالث: العنوان الثانوي والتصنيف بالأزرق السماوي (#35B8E8)
  // ==========================================================================
  sheet.mergeCells(3, 1, 3, colCount);
  styleRowRange(3, colors.navy, colors.navy);
  const row3 = sheet.getRow(3);
  row3.height = 24;
  const r3Cell = row3.getCell(1);
  r3Cell.value = subtitle;
  r3Cell.font = {
    name: 'Cairo',
    size: 10,
    bold: true,
    color: { argb: colors.skyBlue },
  };
  r3Cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // تضمين شعار قافلة القائم الرسمي في الترويسة العليا إن توفر
  try {
    const logoBase64 = await fetchAlQaemLogoBase64();
    if (logoBase64) {
      const imageId = workbook.addImage({
        base64: logoBase64,
        extension: 'png',
      });
      sheet.addImage(imageId, {
        tl: { col: 0.15, row: 0.15 },
        ext: { width: 72, height: 72 },
      });
    }
  } catch {
    // في حال تعذر جلب الصورة يستمر التصدير دون توقف
  }

  // ==========================================================================
  // 4. الصف الرابع: خط ذهبي رفيع للفصل بين الترويسة ومحتوى التقرير (#F4C84A / #C5A45D)
  // ==========================================================================
  sheet.mergeCells(4, 1, 4, colCount);
  const row4 = sheet.getRow(4);
  row4.height = 6;
  for (let c = 1; c <= colCount; c++) {
    const cell = row4.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.gold },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: colors.mutedGold } },
      bottom: { style: 'medium', color: { argb: colors.mutedGold } },
    };
  }

  // ==========================================================================
  // 5. الصف الخامس: شريط معلومات التقرير بخلفية كحلية متوسطة (#12192C)
  // ==========================================================================
  sheet.mergeCells(5, 1, 5, colCount);
  styleRowRange(5, colors.secondaryNavy, colors.borderNavy);
  const row5 = sheet.getRow(5);
  row5.height = 28;
  const r5Cell = row5.getCell(1);
  r5Cell.value = {
    richText: [
      {
        text: 'الجهة المصدرة: ',
        font: { name: 'Cairo', size: 10, bold: true, color: { argb: colors.mutedGold } },
      },
      {
        text: `${ALQAEM_EXCEL_BRAND.systemName}   |   `,
        font: { name: 'Cairo', size: 10, bold: true, color: { argb: colors.white } },
      },
      {
        text: 'القسم: ',
        font: { name: 'Cairo', size: 10, bold: true, color: { argb: colors.mutedGold } },
      },
      {
        text: `${category}   |   `,
        font: { name: 'Cairo', size: 10, bold: true, color: { argb: colors.skyBlue } },
      },
      {
        text: 'إجمالي السجلات: ',
        font: { name: 'Cairo', size: 10, bold: true, color: { argb: colors.mutedGold } },
      },
      {
        text: `${effectiveRows.length} سجل   |   `,
        font: { name: 'Cairo', size: 10, bold: true, color: { argb: colors.gold } },
      },
      {
        text: 'تاريخ الاستخراج: ',
        font: { name: 'Cairo', size: 10, bold: true, color: { argb: colors.mutedGold } },
      },
      {
        text: issueTimestamp,
        font: { name: 'Cairo', size: 10, bold: true, color: { argb: colors.lightText } },
      },
    ],
  };
  r5Cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // ==========================================================================
  // 6. الصف السادس (اختياري): شريط المؤشرات الإحصائية والمجاميع (#12192C)
  // ==========================================================================
  if (hasSummaryRow && options.summaryCards) {
    sheet.mergeCells(6, 1, 6, colCount);
    styleRowRange(6, colors.secondaryNavy, colors.mutedGold);
    const row6 = sheet.getRow(6);
    row6.height = 28;
    const summaryRichText: ExcelJS.RichText[] = [];
    options.summaryCards.forEach((card, idx) => {
      if (idx > 0) {
        summaryRichText.push({
          text: '     •     ',
          font: { name: 'Cairo', size: 10, bold: true, color: { argb: colors.mutedGold } },
        });
      }
      summaryRichText.push({
        text: `${card.label}: `,
        font: { name: 'Cairo', size: 10, bold: true, color: { argb: colors.lightText } },
      });
      summaryRichText.push({
        text: String(card.value),
        font: { name: 'Cairo', size: 11, bold: true, color: { argb: colors.gold } },
      });
    });
    const r6Cell = row6.getCell(1);
    r6Cell.value = { richText: summaryRichText };
    r6Cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  }

  // ==========================================================================
  // 7. صف رؤوس الأعمدة بالكحلي (#0C1220) مع كتابة بيضاء أو ذهبية واضحة
  // ==========================================================================
  const headerRow = sheet.getRow(tableHeaderRowNumber);
  headerRow.height = 32;

  effectiveColumns.forEach((colTitle, idx) => {
    const colIndex = idx + 1;
    const cell = headerRow.getCell(colIndex);
    const cleanTitle = String(colTitle ?? '').trim();
    cell.value = cleanTitle;

    // تمييز عمود التسلسل وأعمدة الإجماليات والأسماء الرئيسية باللون الذهبي المشرق، والبقية بالأبيض الواضح
    const isGoldHeader =
      idx === 0 ||
      cleanTitle === '#' ||
      cleanTitle === 'م' ||
      cleanTitle.includes('اسم الحاج') ||
      cleanTitle.includes('الاسم الكامل') ||
      cleanTitle.includes('اسم المرشد') ||
      isImportantNumberOrTotalColumn(cleanTitle);

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.navy },
    };
    cell.font = {
      name: 'Cairo',
      size: 11,
      bold: true,
      color: { argb: isGoldHeader ? colors.gold : colors.white },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'medium', color: { argb: colors.mutedGold } },
      bottom: { style: 'medium', color: { argb: colors.gold } },
      left: { style: 'thin', color: { argb: colors.borderNavy } },
      right: { style: 'thin', color: { argb: colors.borderNavy } },
    };
  });

  // ==========================================================================
  // 8. صفوف البيانات: نظام مزدوج (خلفيات بيضاء ورمادي فاتح متناوب لسهولة القراءة والطباعة)
  // مع تمييز الحالات الإيجابية بالفيروزي (#20B995) والمجاميع بالذهبي (#F4C84A)
  // ==========================================================================
  effectiveRows.forEach((rowData, rowIndex) => {
    const currentRowNum = tableHeaderRowNumber + 1 + rowIndex;
    const excelRow = sheet.getRow(currentRowNum);
    const isTotalRow = isSummaryOrTotalRow(rowData);
    excelRow.height = isTotalRow ? 29 : 25;

    const baseRowBg = isTotalRow
      ? colors.goldHighlightFill
      : rowIndex % 2 === 0
      ? colors.rowWhite
      : colors.rowLightAlt;

    for (let cIdx = 0; cIdx < colCount; cIdx++) {
      const cell = excelRow.getCell(cIdx + 1);
      const rawVal = rowData[cIdx];
      const colTitle = String(effectiveColumns[cIdx] ?? '');
      const valStr = rawVal === null || rawVal === undefined ? '' : String(rawVal).trim();

      // حفظ الأرقام كقيم رقمية حقيقية عندما تكون أرقاماً صافية (مع استثناء الهويات والجوالات التي تبدأ بصفر)
      const isPhoneOrNationalId =
        colTitle.includes('هوية') ||
        colTitle.includes('الهوية') ||
        colTitle.includes('جوال') ||
        colTitle.includes('الجوال') ||
        colTitle.includes('الهاتف') ||
        colTitle.includes('الواتساب') ||
        colTitle.includes('الآيبان') ||
        (valStr.startsWith('0') && valStr.length > 1);

      if (typeof rawVal === 'number') {
        cell.value = rawVal;
      } else if (
        !isPhoneOrNationalId &&
        /^-?\d+(\.\d+)?$/.test(valStr) &&
        valStr.length <= 9
      ) {
        cell.value = Number(valStr);
      } else {
        cell.value = valStr;
      }

      // تحديد المحاذاة المناسبة لكل خلية
      const isCenteredCol =
        cIdx === 0 ||
        colTitle === '#' ||
        colTitle === 'م' ||
        colTitle.includes('التسلسل') ||
        colTitle.includes('رقم') ||
        colTitle.includes('تاريخ') ||
        colTitle.includes('وقت') ||
        colTitle.includes('حالة') ||
        colTitle.includes('الجنس') ||
        colTitle.includes('نسبة') ||
        colTitle.includes('العدد') ||
        valStr.length <= 12;

      cell.alignment = {
        vertical: 'middle',
        horizontal: isCenteredCol ? 'center' : 'right',
        wrapText: true,
      };

      // 1) في حال كان الصف صف مجموع/إجمالي كلي
      if (isTotalRow) {
        const isLastOrAmountCell =
          cIdx === colCount - 1 || isImportantNumberOrTotalColumn(colTitle);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isLastOrAmountCell ? colors.secondaryNavy : colors.goldHighlightFill },
        };
        cell.font = {
          name: 'Cairo',
          size: 11,
          bold: true,
          color: { argb: isLastOrAmountCell ? colors.gold : colors.dataTextNavy },
        };
        cell.border = {
          top: { style: 'medium', color: { argb: colors.mutedGold } },
          bottom: { style: 'double', color: { argb: colors.mutedGold } },
          left: { style: 'thin', color: { argb: colors.mutedGold } },
          right: { style: 'thin', color: { argb: colors.mutedGold } },
        };
        continue;
      }

      // 2) عمود التسلسل الأول (# / م)
      if (cIdx === 0 && (colTitle === '#' || colTitle === 'م' || colTitle.includes('التسلسل'))) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.rowSeqFill },
        };
        cell.font = {
          name: 'Cairo',
          size: 10,
          bold: true,
          color: { argb: colors.dataTextNavy },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.dataBorderLight } },
          bottom: { style: 'thin', color: { argb: colors.dataBorderLight } },
          left: { style: 'thin', color: { argb: colors.dataBorderLight } },
          right: { style: 'thin', color: { argb: colors.mutedGold } },
        };
        continue;
      }

      // 3) الحالات الإيجابية باللون الأخضر الفيروزي (#20B995)
      if (isPositiveStatusValue(valStr, colTitle)) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.positiveFill },
        };
        cell.font = {
          name: 'Cairo',
          size: 10,
          bold: true,
          color: { argb: colors.positiveText },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.positiveBorder } },
          bottom: { style: 'thin', color: { argb: colors.positiveBorder } },
          left: { style: 'thin', color: { argb: colors.dataBorderLight } },
          right: { style: 'thin', color: { argb: colors.dataBorderLight } },
        };
        continue;
      }

      // 4) الأرقام المهمة والمبالغ المالية باللون الذهبي الهادئ (#F4C84A / #C5A45D)
      if (isImportantNumberOrTotalColumn(colTitle) && valStr !== '' && valStr !== '0' && valStr !== '0 ريال') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.goldHighlightFill },
        };
        cell.font = {
          name: 'Cairo',
          size: 10.5,
          bold: true,
          color: { argb: colors.goldHighlightText },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.mutedGold } },
          bottom: { style: 'thin', color: { argb: colors.mutedGold } },
          left: { style: 'thin', color: { argb: colors.dataBorderLight } },
          right: { style: 'thin', color: { argb: colors.dataBorderLight } },
        };
        continue;
      }

      // 5) المعلومات التفاعلية والرموز المرجعية بالأزرق السماوي (#35B8E8)
      if (isInteractiveOrReferenceColumn(colTitle, valStr)) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.skyHighlightFill },
        };
        cell.font = {
          name: 'Cairo',
          size: 10,
          bold: true,
          color: { argb: colors.skyHighlightText },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.dataBorderLight } },
          bottom: { style: 'thin', color: { argb: colors.dataBorderLight } },
          left: { style: 'thin', color: { argb: colors.dataBorderLight } },
          right: { style: 'thin', color: { argb: colors.dataBorderLight } },
        };
        continue;
      }

      // 6) الخلايا القياسية (بيضاء / رمادي فاتح متناوب مع نص كحلي داكن واضح وحدود دقيقة)
      const isPrimaryNameCol =
        colTitle.includes('اسم الحاج') ||
        colTitle.includes('الاسم الكامل') ||
        colTitle.includes('الاسم الرباعي') ||
        colTitle.includes('اسم المرشد') ||
        colTitle.includes('المؤشر');

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: baseRowBg },
      };
      cell.font = {
        name: 'Cairo',
        size: 10,
        bold: isPrimaryNameCol,
        color: { argb: isPrimaryNameCol ? colors.dataTextNavy : colors.dataTextSecondary },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.dataBorderLight } },
        bottom: { style: 'thin', color: { argb: colors.dataBorderLight } },
        left: { style: 'thin', color: { argb: colors.dataBorderLight } },
        right: { style: 'thin', color: { argb: colors.dataBorderLight } },
      };
    }
  });

  // ==========================================================================
  // 9. صف التذييل الرسمي في أسفل التقرير (الكحلي المتوسط #12192C مع الذهبي #F4C84A)
  // ==========================================================================
  const footerRowNum = tableHeaderRowNumber + effectiveRows.length + 1;
  sheet.mergeCells(footerRowNum, 1, footerRowNum, colCount);
  styleRowRange(footerRowNum, colors.secondaryNavy, colors.mutedGold);
  const footerRow = sheet.getRow(footerRowNum);
  footerRow.height = 26;
  const footerCell = footerRow.getCell(1);
  footerCell.value = `وثيقة رسمية صادرة من محرك التقارير المركزي — ${ALQAEM_EXCEL_BRAND.systemName} (${ALQAEM_EXCEL_BRAND.seasonLabel})   •   إجمالي السجلات: ${effectiveRows.length}   •   تاريخ الإصدار: ${issueTimestamp}`;
  footerCell.font = {
    name: 'Cairo',
    size: 9.5,
    bold: true,
    color: { argb: colors.gold },
  };
  footerCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // ==========================================================================
  // 10. ضبط عرض الأعمدة تلقائياً بما يتناسب مع المحتوى العربي والعناوين
  // ==========================================================================
  effectiveColumns.forEach((colTitle, idx) => {
    const col = sheet.getColumn(idx + 1);
    const headerLen = String(colTitle ?? '').length;
    let maxCellLen = headerLen;

    // فحص أول 150 صفاً لحساب العرض المثالي للعمود
    const sampleRows = effectiveRows.slice(0, 150);
    sampleRows.forEach((r) => {
      const valStr = String(r[idx] ?? '');
      if (valStr.length > maxCellLen) {
        maxCellLen = valStr.length;
      }
    });

    if (idx === 0 && (colTitle === '#' || colTitle === 'م' || colTitle.includes('التسلسل'))) {
      col.width = 10;
    } else {
      col.width = Math.min(Math.max(maxCellLen + 6, 15), 44);
    }
  });

  // تثبيت تكرار الترويسة ورؤوس الأعمدة عند الطباعة على أوراق متعددة
  sheet.pageSetup.printTitlesRow = `1:${tableHeaderRowNumber}`;

  // ==========================================================================
  // 11. استخراج ملف Excel (.xlsx) وتحميله مباشرة للمستخدم
  // ==========================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const cleanFilename = options.filename
    .replace(/\.(csv|xlsx)$/i, '')
    .replace(/[\\/?*[\]:"]/g, '_')
    .trim();
  link.href = url;
  link.setAttribute('download', `${cleanFilename}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * محول ذكي يحول أي محتوى CSV خام (للتوافق مع الدوال السابقة) إلى تقرير Excel (.xlsx)
 * متكامل الهوية البصرية لنظام قافلة القائم.
 */
export function parseRawCsvAndExportAlQaemExcel(rawCsvContent: string, filename: string): void {
  const cleanContent = rawCsvContent.replace(/^\uFEFF/, '').trim();
  const lines = cleanContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parsedRows = lines.map(parseCsvLine);
  if (parsedRows.length === 0) return;

  // بعض التقارير الملخصة تحتوي على سطر عنوان وتاريخ في أول سطرين قبل جدول الرؤوس الفعلي
  let headerRowIdx = 0;
  let customReportTitle: string | undefined;
  const summaryCards: AlQaemExcelSummaryItem[] = [];

  if (parsedRows.length >= 3 && parsedRows[0].filter(Boolean).length === 1) {
    customReportTitle = parsedRows[0][0];
    if (parsedRows[1].filter(Boolean).length <= 2) {
      if (parsedRows[1][0] && parsedRows[1][1]) {
        summaryCards.push({ label: parsedRows[1][0], value: parsedRows[1][1] });
      } else if (parsedRows[1][0]) {
        summaryCards.push({ label: 'معلومات إضافية', value: parsedRows[1][0] });
      }
      headerRowIdx = 2;
    } else {
      headerRowIdx = 1;
    }
  }

  const columns = parsedRows[headerRowIdx] || ['البيان'];
  const rows = parsedRows.slice(headerRowIdx + 1);
  const inferred = inferReportMetadataFromFilename(filename, columns);

  void exportAlQaemExcelReport({
    reportTitle: customReportTitle || inferred.title,
    subtitle: inferred.subtitle,
    category: inferred.category,
    filename,
    columns,
    rows,
    summaryCards: summaryCards.length > 0 ? summaryCards : undefined,
  });
}
