import { Announcement, HajjPackage, CampaignSettings } from '../types';

export const OUT_OF_SCOPE_REPLY =
  'عذراً، هذا السؤال خارج نطاق اختصاصاتي، يرجى التواصل مع إدارة القافلة مباشرة';

export function normalizeArabicText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[؟?!.,،؛:"'()[\]{}\-_/+*#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripArabicPrefix(word: string): string {
  const prefixes = ['وال', 'بال', 'كال', 'فال', 'لل', 'ال'];
  for (const p of prefixes) {
    if (word.startsWith(p) && word.length - p.length >= 3) {
      return word.slice(p.length);
    }
  }
  if (
    (word.startsWith('و') || word.startsWith('ب') || word.startsWith('ل') || word.startsWith('ف')) &&
    word.length >= 4
  ) {
    const rest = word.slice(1);
    for (const p of ['ال']) {
      if (rest.startsWith(p) && rest.length - p.length >= 3) {
        return rest.slice(p.length);
      }
    }
  }
  return word;
}

const ARABIC_STOP_WORDS = new Set([
  'من', 'ما', 'ماذا', 'متي', 'اين', 'وين', 'كيف', 'هل', 'كم', 'اي', 'لمن', 'لماذا',
  'هو', 'هي', 'هم', 'هن', 'انت', 'انتم', 'نحن', 'انا',
  'في', 'علي', 'عن', 'مع', 'الي', 'منذ', 'بين', 'حول', 'تحت', 'فوق', 'عند', 'لدي', 'قبل', 'بعد',
  'هذا', 'هذه', 'ذلك', 'تلك', 'الذي', 'التي', 'الذين',
  'او', 'ام', 'ثم', 'بل', 'لا', 'نعم', 'كل', 'بعض', 'غير', 'فقط',
  'كان', 'يكون', 'تكون', 'كانت', 'يتم', 'سيتم', 'سوف', 'قد', 'لقد',
  'قافله', 'حمله', 'القائم', 'قافلة', 'حملة', 'للحج', 'والعمره', 'الحج', 'العمره', 'حج', 'عمره',
  'عام', 'سنه', 'موسم', '1448', '1448ه', 'اريد', 'ابغي', 'اعرف', 'سؤال', 'استفسار', 'معلومات', 'تفاصيل'
]);

export function extractQueryKeywords(query: string): string[] {
  const norm = normalizeArabicText(query);
  const rawWords = norm.split(/\s+/).filter(Boolean);
  const result = new Set<string>();

  for (const w of rawWords) {
    const stripped = stripArabicPrefix(w);
    if (w.length >= 2 && !ARABIC_STOP_WORDS.has(w) && !ARABIC_STOP_WORDS.has(stripped)) {
      result.add(w);
      if (stripped.length >= 2) {
        result.add(stripped);
      }
    }
  }

  return Array.from(result);
}

export function expandSemanticStems(keywords: string[]): string[] {
  const expanded = new Set<string>(keywords);

  const semanticGroups: string[][] = [
    ['مرشد', 'ارشاد', 'رشد', 'شيخ', 'مشايخ', 'سيد', 'سماحه', 'ايه', 'علماء', 'عالم', 'ديني', 'فقه', 'فقهي', 'توجيهات', 'رعايه', 'موسوي'],
    ['مرجع', 'مراجع', 'تقليد', 'فتوي', 'فتاوي', 'سيستاني', 'خامنئي', 'حكيم', 'شيرازي', 'صدر'],
    ['باقه', 'باقات', 'سعر', 'اسعار', 'تكلفه', 'رسوم', 'ريال', 'طيران', 'باص', 'حافله', 'حافلات', 'فندق', 'فنادق', 'سكن', 'اقامه'],
    ['خطه', 'سير', 'جدول', 'برنامج', 'دليل', 'رحله', 'اوقات', 'وقت', 'مواعيد', 'موعد', 'ترويه', 'عرفه', 'عرفات', 'مزدلفه', 'مني', 'تشريق', 'جمره', 'جمرات', 'طواف', 'سعي', 'وداع', 'نحر', 'هدي', 'احرام', 'ميقات'],
    ['شروط', 'شرط', 'تسجيل', 'التحاق', 'سياسه', 'سياسات', 'الغاء', 'استرداد', 'تنازل', 'وثائق', 'مستندات', 'هويه', 'تصريح', 'محرم', 'كرسي', 'مرافق'],
    ['حقيبه', 'تجهيزات', 'ملابس', 'ادويه', 'تطعيم', 'تطعيمات', 'فحص', 'طبي', 'صحي', 'صحتي', 'الحمي', 'الشوكيه', 'انفلونزا', 'مظله', 'شاحن'],
    ['تواصل', 'اتصال', 'هاتف', 'جوال', 'رقم', 'واتساب', 'واتس', 'عنوان', 'موقع', 'مقر', 'مكان', 'تقع', 'مدينه', 'بريد', 'ايميل', 'الاحساء', 'المبرز', 'الشرقيه'],
    ['لقاء', 'لقاءات', 'تعريفي', 'درس', 'دروس', 'محاضره', 'محاضرات', 'اعلان', 'اعلانات', 'تعميم', 'تعاميم', 'جديد', 'موضوع', 'مواضيع']
  ];

  for (const kw of keywords) {
    for (const group of semanticGroups) {
      if (group.some((g) => kw.includes(g) || g.includes(kw))) {
        for (const item of group) {
          expanded.add(item);
        }
      }
    }
  }

  return Array.from(expanded);
}

export interface WebsiteCorpusInput {
  announcements?: Announcement[] | any[];
  packages?: HajjPackage[] | any[];
  campaignSettings?: CampaignSettings | any;
  pilgrimCount?: number;
}

export const OFFICIAL_REGISTRATION_TERMS = [
  '1- الالتزام بروح الأخوة والأخلاق الإسلامية.',
  '2- الالتزام بجميع الإجراءات التنظيمية للجان خدمة الحاج، كجداول المواصلات والضيافة والإسكان والبرامج الأخرى.',
  '3- المحافظة على حقوق وممتلكات الآخرين.',
  '4- إن تقديم الاستمارة لا يعني إلزام الإدارة بالقبول، ولا يحق للحاج التنازل لغيره إلا بعد موافقة الإدارة.',
  '5- إن ما يدفع من مبلغ هو أجرة في مقابل ما تقدمه القافلة من خدمات متعارفة، ولا يحق للحاج استرداد الأجرة إلا بمسوغ شرعي.',
  '6- عند رغبة الحاج إلغاء العقد، يلتزم الحاج بدفع قيمة المصروفات والرسوم وتصريح الحج حسب ما تقرره إدارة القافلة.',
  '7- تتواصل القافلة مع الحاج عن طريق أرقام الاتصال المسجلة في الاستمارة، ولا تتحمل القافلة ما يترتب على خطأ الأرقام المسجلة.',
  '8- يلتزم الحاج بعدم التأخير عن مواعيد الرحلات، وفي حال التأخير يتحمل الحاج ما يترتب على ذلك.',
  '9- في حال كون الحاج يحتاج لرعاية خاصة أو كرسي متحرك فيلزم وجود حاج مرافق له يقوم بشؤونه مع توفير كرسي متحرك خاص بالحاج.',
  '10- القافلة غير مسؤولة عن تغيير مواعيد رحلات الطيران أو إلغائها من قبل شركة الطيران، ويقبل الحاج بوسيلة المواصلات البديلة التي تؤمنها القافلة.'
];

export const OFFICIAL_TRAVEL_KIT = [
  { category: 'الوثائق الرسمية', items: ['أصل بطاقة الهوية الوطنية أو الإقامة سارية المفعول', 'جواز السفر (للضرورة)', 'بطاقة العضوية والتعريف الصادرة من قافلة القائم'] },
  { category: 'الملابس والإحرام', items: ['ثوبا الإحرام القطنيان (للرجال) + حزام الإحرام', 'ملابس ساترة وفضفاضة وطاهرة (للنساء)', 'أحذية خفيفة مريحة ومقاومة للانزلاق للمشي'] },
  { category: 'الصحة والوقاية', items: ['الأدوية الشخصية المزمنة مع الوصفة الطبية', 'شهادة التطعيمات والحمى الشوكية والإنفلونزا', 'كمامات طبية ومعقمات ومطهرات شخصية'] },
  { category: 'التجهيزات الشخصية والتقنية', items: ['شاحن متنقل (Power Bank) + سلك الشحن', 'مظلة شمسية واقية من الشمس', 'مصحف صغير وكتيب أدعية المناسك', 'حقيبة يد صغيرة لتنقلات المشاعر المقدسة'] }
];

export function searchWebsiteKnowledge(message: string, siteData: WebsiteCorpusInput): string {
  const qNorm = normalizeArabicText(message);
  if (!qNorm) return OUT_OF_SCOPE_REPLY;

  const announcements = Array.isArray(siteData.announcements) ? siteData.announcements : [];
  const packages = Array.isArray(siteData.packages) ? siteData.packages : [];
  const settings = siteData.campaignSettings || {};
  const siteTexts = settings.siteTexts || {};
  const marjiList: string[] = Array.isArray(settings.marjiList) ? settings.marjiList : [];
  const timelineDays: any[] = Array.isArray(settings.hajjDaysTimeline) ? settings.hajjDaysTimeline : [];
  const phone = settings.phone || '0534717773';
  const whatsapp = settings.whatsapp || phone;
  const email = settings.email || 'alqaemhajj@gmail.com';
  const address = settings.address || 'المملكة العربية السعودية - المنطقة الشرقية (الأحساء-المبرز)';

  const keywords = extractQueryKeywords(message);
  const expandedKeywords = expandSemanticStems(keywords);

  const matchedSections: string[] = [];

  // Check if user is specifically asking for location / headquarters / contact / administration address
  const isDirectLocationOrContactQuery =
    qNorm.includes('عنوان') ||
    qNorm.includes('موقع') ||
    qNorm.includes('مقر') ||
    qNorm.includes('مكان') ||
    qNorm.includes('تقع') ||
    qNorm.includes('اين') ||
    qNorm.includes('وين') ||
    qNorm.includes('تواصل') ||
    qNorm.includes('اتصال') ||
    qNorm.includes('هاتف') ||
    qNorm.includes('جوال') ||
    qNorm.includes('رقم') ||
    qNorm.includes('واتس') ||
    qNorm.includes('بريد') ||
    qNorm.includes('ايميل') ||
    qNorm.includes('الاحساء') ||
    qNorm.includes('المبرز') ||
    (qNorm.includes('اداره') && !qNorm.includes('شروط'));

  if (isDirectLocationOrContactQuery) {
    matchedSections.push(
      `📍 **مقر وعنوان ومعلومات التواصل الرسمية (${siteTexts.brandName || 'قافلة القائم'})**:\n` +
        `• العنوان والمقر الرئيسي: ${address}\n` +
        `• رقم الهاتف والجوال المعتمد: ${phone}\n` +
        `• التواصل عبر الواتساب: ${whatsapp}\n` +
        `• البريد الإلكتروني: ${email}\n` +
        `• أوقات العمل: من الأحد إلى الخميس (صباحاً ومساءً) وخدمة العملاء عبر الواتساب على مدار الساعة.`
    );
  }

  // 1. Score and match LIVE Announcements & Topics added on the website
  const scoredAnnouncements: { ann: any; score: number }[] = [];
  const isAskingAllAnnouncements =
    qNorm.includes('اعلانات') ||
    qNorm.includes('الاعلانات') ||
    qNorm.includes('مواضيع') ||
    qNorm.includes('المواضيع') ||
    qNorm.includes('التعاميم') ||
    qNorm.includes('تعاميم') ||
    qNorm.includes('اخر الاخبار') ||
    qNorm.includes('كل الجديد');

  // Filter out purely location words when scoring announcements if we already answered location
  const locationOnlyWords = new Set(['موقع', 'مقر', 'عنوان', 'مكان', 'تقع', 'اين', 'وين', 'اداره', 'الاداره']);
  const nonLocationKeywords = keywords.filter((kw) => !locationOnlyWords.has(kw));

  for (const ann of announcements) {
    const titleNorm = normalizeArabicText(ann.title || '');
    const contentNorm = normalizeArabicText(ann.content || '');
    const catNorm = normalizeArabicText(ann.category || '');
    const fullAnnNorm = `${titleNorm} ${contentNorm} ${catNorm}`;
    const annWords = fullAnnNorm.split(/\s+/).filter(Boolean).map(stripArabicPrefix);

    let score = 0;

    const activeKeywords = isDirectLocationOrContactQuery ? nonLocationKeywords : keywords;

    // Direct keyword overlap
    for (const kw of activeKeywords) {
      if (kw.length < 2) continue;
      if (titleNorm.includes(kw)) score += 6;
      if (contentNorm.includes(kw)) score += 4;
      if (catNorm.includes(kw)) score += 3;
      if (annWords.some((aw) => aw.length >= 3 && (aw === kw || aw.includes(kw) || kw.includes(aw)))) {
        score += 3;
      }
    }

    // Semantic / Root overlap (e.g. مرشد <-> الإرشاد الديني / سماحة السيد)
    if (!isDirectLocationOrContactQuery || nonLocationKeywords.length > 0) {
      for (const ekw of expandedKeywords) {
        if (ekw.length < 3 || locationOnlyWords.has(ekw)) continue;
        if (titleNorm.includes(ekw)) score += 2;
        if (contentNorm.includes(ekw)) score += 2;
      }
    }

    if (score > 0) {
      scoredAnnouncements.push({ ann, score });
    }
  }

  scoredAnnouncements.sort((a, b) => b.score - a.score);

  if (isAskingAllAnnouncements && announcements.length > 0) {
    const listText = announcements
      .map((a) => `• **${a.title}** (${a.category || 'إعلان'} - ${a.date || ''}):\n  ${a.content}`)
      .join('\n\n');
    matchedSections.push(`📢 الإعلانات والمواضيع المنشورة في موقع قافلة القائم:\n\n${listText}`);
  } else if (scoredAnnouncements.length > 0) {
    const topScore = scoredAnnouncements[0].score;
    const bestAnnouncements = scoredAnnouncements
      .filter((item) => item.score >= Math.max(3, topScore * 0.5))
      .slice(0, 3);

    if (bestAnnouncements.length > 0) {
      const annText = bestAnnouncements
        .map(
          ({ ann }) =>
            `📢 ${ann.title}${ann.category ? ` (${ann.category})` : ''}${ann.date ? ` - ${ann.date}` : ''}:\n${ann.content}`
        )
        .join('\n\n');
      matchedSections.push(annText);
    }
  }

  // 2. Religious Guidance & Maraji List (الإرشاد الديني وكشف المراجع)
  const isReligiousOrMarjiQuery =
    qNorm.includes('مرشد') ||
    qNorm.includes('ارشاد') ||
    qNorm.includes('شيخ') ||
    qNorm.includes('مشايخ') ||
    qNorm.includes('سيد') ||
    qNorm.includes('سماحه') ||
    qNorm.includes('ايه الله') ||
    qNorm.includes('موسوي') ||
    qNorm.includes('مرجع') ||
    qNorm.includes('مراجع') ||
    qNorm.includes('تقليد') ||
    qNorm.includes('فقه');

  if (isReligiousOrMarjiQuery) {
    const religiousAnns = announcements.filter((a) => {
      const t = normalizeArabicText(`${a.title || ''} ${a.content || ''} ${a.category || ''}`);
      return (
        t.includes('ارشاد') ||
        t.includes('مرشد') ||
        t.includes('سماحه') ||
        t.includes('سيد') ||
        t.includes('شيخ') ||
        t.includes('ايه الله') ||
        t.includes('رعايه') ||
        t.includes('موسوي')
      );
    });

    for (const rAnn of religiousAnns) {
      const alreadyIncluded = matchedSections.some((sec) => sec.includes(rAnn.content));
      if (!alreadyIncluded) {
        matchedSections.push(`📢 ${rAnn.title}${rAnn.date ? ` (${rAnn.date})` : ''}:\n${rAnn.content}`);
      }
    }

    if (qNorm.includes('مرجع') || qNorm.includes('مراجع') || qNorm.includes('تقليد') || matchedSections.length === 0) {
      if (marjiList.length > 0) {
        matchedSections.push(
          `📚 كشف المراجع الدينية المعتمدة في سجل الإرشاد الديني بالقافلة:\n• ${marjiList.join('\n• ')}`
        );
      }
    }
  }

  // 3. Packages & Prices (الباقات والأسعار والسكن والمواصلات)
  const isPackageQuery =
    qNorm.includes('باق') ||
    qNorm.includes('سعر') ||
    qNorm.includes('اسعار') ||
    qNorm.includes('تكلف') ||
    qNorm.includes('رسوم') ||
    qNorm.includes('ريال') ||
    qNorm.includes('فندق') ||
    qNorm.includes('فنادق') ||
    qNorm.includes('سكن') ||
    qNorm.includes('مخيم') ||
    qNorm.includes('طيران') ||
    qNorm.includes('طائره') ||
    qNorm.includes('باص') ||
    qNorm.includes('حافل');

  if (isPackageQuery && packages.length > 0) {
    const specificMatches = packages.filter((pkg) => {
      const pkgNorm = normalizeArabicText(
        `${pkg.title} ${pkg.type} ${pkg.transport} ${pkg.accommodationMakkah} ${pkg.accommodationMadinah}`
      );
      return keywords.some(
        (kw) => kw.length >= 3 && !['باقه', 'باقات', 'سعر', 'اسعار'].includes(kw) && pkgNorm.includes(kw)
      );
    });

    const targetPackages = specificMatches.length > 0 ? specificMatches : packages;
    const pkgText = targetPackages
      .map(
        (pkg) =>
          `🌟 **${pkg.title}** (${pkg.type}):\n` +
          `- السعر: ${pkg.price}\n` +
          `- المواصلات: ${pkg.transport}\n` +
          `- سكن مكة المكرمة: ${pkg.accommodationMakkah}\n` +
          `- سكن المدينة المنورة: ${pkg.accommodationMadinah}\n` +
          `- مخيمات المشاعر (منى وعرفات): ${pkg.campMina}\n` +
          (Array.isArray(pkg.features) && pkg.features.length > 0
            ? `- المميزات:\n  • ${pkg.features.join('\n  • ')}`
            : '')
      )
      .join('\n\n');

    matchedSections.push(`🕋 الباقات المتاحة في موقع قافلة القائم:\n\n${pkgText}`);
  }

  // 4. Hajj Guide & Trip Timeline (دليل الحاج وخطة سير الرحلة والأوقات)
  const isTimelineOrGuideQuery =
    qNorm.includes('دليل') ||
    qNorm.includes('خطه') ||
    qNorm.includes('سير') ||
    qNorm.includes('جدول') ||
    qNorm.includes('برنامج') ||
    qNorm.includes('وقت') ||
    qNorm.includes('اوقات') ||
    qNorm.includes('ترويه') ||
    qNorm.includes('عرفه') ||
    qNorm.includes('عرفات') ||
    qNorm.includes('مزدلفه') ||
    qNorm.includes('مني') ||
    qNorm.includes('تشريق') ||
    qNorm.includes('جمره') ||
    qNorm.includes('جمرات') ||
    qNorm.includes('طواف') ||
    qNorm.includes('وداع') ||
    qNorm.includes('نحر') ||
    qNorm.includes('العاشر') ||
    qNorm.includes('التاسع') ||
    qNorm.includes('الثامن') ||
    qNorm.includes('مناسك') ||
    qNorm.includes('منسك');

  if (isTimelineOrGuideQuery && timelineDays.length > 0) {
    const matchedDays = timelineDays.filter((day) => {
      const dayNorm = normalizeArabicText(
        `${day.dayTitle} ${day.subtitle} ${day.summary} ${day.campaignTip} ${(day.steps || [])
          .map((s: any) => `${s.time} ${s.title} ${s.desc}`)
          .join(' ')}`
      );
      return keywords.some(
        (kw) =>
          kw.length >= 3 &&
          !['دليل', 'خطه', 'سير', 'جدول', 'برنامج', 'وقت', 'اوقات', 'مناسك', 'رحله'].includes(kw) &&
          dayNorm.includes(kw)
      );
    });

    const daysToFormat = matchedDays.length > 0 ? matchedDays : timelineDays;
    const daysText = daysToFormat
      .map((day) => {
        const stepsText = Array.isArray(day.steps)
          ? day.steps.map((st: any, idx: number) => `  ${idx + 1}. [${st.time}] ${st.title}: ${st.desc}`).join('\n')
          : '';
        return (
          `📅 **${day.dayTitle}** (${day.subtitle}):\n` +
          `${day.summary}\n` +
          (stepsText ? `الخطوات والأوقات:\n${stepsText}\n` : '') +
          (day.campaignTip ? `💡 توجيه القافلة: ${day.campaignTip}` : '')
        );
      })
      .join('\n\n');

    matchedSections.push(`📖 من دليل الحاج التفاعلي وخطة سير الرحلة في الموقع:\n\n${daysText}`);
  }

  // 5. Travel Kit / Checklist (حقيبة الحاج والتجهيزات)
  const isChecklistQuery =
    qNorm.includes('حقيب') ||
    qNorm.includes('تجهيز') ||
    qNorm.includes('ملابس') ||
    qNorm.includes('احرام') ||
    qNorm.includes('ادويه') ||
    qNorm.includes('مظله') ||
    qNorm.includes('شاحن') ||
    qNorm.includes('مستلزمات') ||
    qNorm.includes('اغراض');

  if (isChecklistQuery) {
    const kitText = OFFICIAL_TRAVEL_KIT.map(
      (cat) => `• **${cat.category}**:\n  - ${cat.items.join('\n  - ')}`
    ).join('\n\n');
    matchedSections.push(`🎒 قائمة التجهيزات وحقيبة الحاج الرسمية في الموقع:\n\n${kitText}`);
  }

  // 6. Registration Terms & Campaign Policies (شروط الالتحاق والتسجيل وسياسات القافلة)
  const isTermsOrPolicyQuery =
    qNorm.includes('شرط') ||
    qNorm.includes('شروط') ||
    qNorm.includes('التحاق') ||
    qNorm.includes('تسجيل') ||
    qNorm.includes('سجل') ||
    qNorm.includes('سياس') ||
    qNorm.includes('الغاء') ||
    qNorm.includes('استرداد') ||
    qNorm.includes('تنازل') ||
    qNorm.includes('كرسي') ||
    qNorm.includes('مرافق') ||
    qNorm.includes('وثائق') ||
    qNorm.includes('مستندات') ||
    qNorm.includes('تطعيم');

  if (isTermsOrPolicyQuery) {
    matchedSections.push(
      `📋 شروط الالتحاق وسياسات التسجيل الرسمية في قافلة القائم:\n\n${OFFICIAL_REGISTRATION_TERMS.join('\n')}`
    );
  }

  // 7. General Campaign Services & About (خدمات ومميزات القافلة)
  const isServicesOrAboutQuery =
    qNorm.includes('خدم') ||
    qNorm.includes('مميز') ||
    qNorm.includes('تقدم') ||
    qNorm.includes('توفر') ||
    qNorm.includes('نبذه') ||
    qNorm.includes('معلومات عن') ||
    qNorm.includes('لماذا تختار');

  if (isServicesOrAboutQuery) {
    const featuresList =
      Array.isArray(siteTexts.cardFeatures) && siteTexts.cardFeatures.length > 0
        ? siteTexts.cardFeatures
        : [
            'سكن فندقي فاخر في مكة المكرمة والمدينة المنورة',
            'مخيمات منى وعرفات المكيفة والمجهزة',
            'إشراف فقهي وإداري وطبي متكامل'
          ];
    const heroDesc =
      siteTexts.heroDescription ||
      'نقدم خدمات متكاملة وراقية لحجاج بيت الله الحرام والمعتمرين. إشراف ديني وإداري بخبرة سنوية طويلة، مخيمات مطورة في منى وعرفات، وسكن فندقي يليق بضيوف الرحمن.';

    matchedSections.push(
      `🕋 **${siteTexts.brandName || 'قافلة القائم'} (${siteTexts.brandSubtitle || 'للحج والعمرة والزيارة'})**:\n` +
        `${heroDesc}\n\n` +
        `✨ أبرز الخدمات والمميزات:\n• ${featuresList.join('\n• ')}\n\n` +
        `📍 العنوان والمقر: ${address}\n` +
        `📞 رقم الهاتف المعتمد: ${phone}\n` +
        `✉️ البريد الإلكتروني: ${email}`
    );
  }

  if (matchedSections.length > 0) {
    return matchedSections.join('\n\n────────────────────\n\n');
  }

  return OUT_OF_SCOPE_REPLY;
}
