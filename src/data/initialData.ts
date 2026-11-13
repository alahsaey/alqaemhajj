import { Pilgrim, HajjPackage, Announcement, AdminUser, CampaignSettings } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../utils/rbac';

export const initialPilgrims: Pilgrim[] = [
  {
    id: '1003300132',
    createdAt: '2026-11-07',
    termsAccepted: 'نعم',
    firstName: 'صالح',
    secondName: 'حجي',
    thirdName: 'مبارك',
    lastName: 'الياسين',
    englishFullName: 'Saleh Hajji Alyassin',
    gender: 'ذكر',
    nationality: 'سعودي',
    nationalId: '1003300132',
    idIssueDate: '1983-03-24',
    idExpiryDate: '2035-11-01',
    birthDate: '1983-03-24',
    mobile: '0500680180',
    whatsapp: '0500680180',
    email: 'alahsaey@gmail.com',
    iban: 'SA820000423002534060',
    bankAccountName: 'Saleh Alyassin',
    bankName: 'بنك الرياض',
    transport: 'باص',
    hajjType: 'مستحب',
    lastHajjYear: '',
    currentMarji: 'الشهيد',
    previousMarji: '',
    mobilityIndependence: 'نعم',
    status: 'مقبول ومؤكد',
    roomNumber: 'غرفة 304 - برج مكة',
    roomNumberMakkah: 'غرفة 304 - برج مكة',
    roomNumberMadinah: 'غرفة 102 - فندق أنوار المدينة',
    busNumber: 'حافلة 1',
    busSeat: '12',
    selectedPackage: 'باقة باص القائم الخاصة',
    registrationReference: '1001'
  },
  {
    id: '1092837465',
    createdAt: '2026-11-06',
    termsAccepted: 'نعم',
    firstName: 'محمد',
    secondName: 'علي',
    thirdName: 'حسن',
    lastName: 'الناصر',
    englishFullName: 'Mohammed Ali Alnasser',
    gender: 'ذكر',
    nationality: 'سعودي',
    nationalId: '1092837465',
    idIssueDate: '2018-05-10',
    idExpiryDate: '2028-05-10',
    birthDate: '1990-07-15',
    mobile: '0551234567',
    whatsapp: '0551234567',
    email: 'mohammed.n@example.com',
    iban: 'SA1205000000123456789012',
    bankAccountName: 'Mohammed Ali Alnasser',
    bankName: 'مصرف الراجحي',
    transport: 'طائرة',
    hajjType: 'تمتع',
    lastHajjYear: '1443',
    currentMarji: 'السيستاني',
    previousMarji: '',
    mobilityIndependence: 'نعم',
    status: 'مكتمل الدفع',
    roomNumber: 'غرفة 205 - برج مكة',
    roomNumberMakkah: 'غرفة 205 - برج مكة',
    roomNumberMadinah: 'غرفة 210 - فندق أنوار المدينة',
    busNumber: 'حافلة 2',
    busSeat: '5',
    selectedPackage: 'باقة الحج المميزة (طيران)',
    registrationReference: '1002'
  },
  {
    id: '1048291038',
    createdAt: '2026-11-05',
    termsAccepted: 'نعم',
    firstName: 'زهراء',
    secondName: 'إبراهيم',
    thirdName: 'أحمد',
    lastName: 'الصالح',
    englishFullName: 'Zahra Ibrahim Alsaleh',
    gender: 'أنثى',
    nationality: 'سعودي',
    nationalId: '1048291038',
    idIssueDate: '2019-02-12',
    idExpiryDate: '2029-02-12',
    birthDate: '1995-11-20',
    mobile: '0569876543',
    whatsapp: '0569876543',
    email: 'zahra.alsaleh@example.com',
    iban: 'SA9910000001987654321098',
    bankAccountName: 'Zahra Ibrahim Alsaleh',
    bankName: 'البنك الأهلي السعودي',
    transport: 'باص',
    hajjType: 'تمتع',
    lastHajjYear: '',
    currentMarji: 'السيستاني',
    previousMarji: '',
    mobilityIndependence: 'نعم',
    status: 'قيد المراجعة',
    selectedPackage: 'باقة باص القائم الخاصة',
    registrationReference: '1003'
  }
];

export const hajjPackages: HajjPackage[] = [
  {
    id: 'pkg-1',
    title: 'باقة الحج المميزة (طيران)',
    type: 'VIP طيران فاخر',
    price: '28,500 ريال',
    transport: 'طيران ذهاب وعودة + حافلات VIP مكيفة',
    accommodationMakkah: 'فندق خمس نجوم - إبراج الساعة (إقامة كاملة بوفيه مفتوح)',
    accommodationMadinah: 'فندق دار الايمان أو ما يعادله قرب الحرم النبوي',
    campMina: 'مخيمات مطورة مكيفة VIP مع خدمات الضيافة الفاخرة',
    features: [
      'تذاكر الطيران الداخلي والخارجي',
      'إقامة فندقية فاخرة قريبة جداً من الحرمين',
      'مخيمات مطورة في منى وعرفات',
      'إشراف إداري وديني وثقافي متكامل',
      'وجبات بنظام البوفيه المفتوح والمشروبات طوال اليوم',
      'هدايا الحاج والحقيبة المتكاملة'
    ],
    image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'pkg-2',
    title: 'باقة باص القائم الخاصة',
    type: 'درجة ممتازة - باصات حديثة',
    price: '16,800 ريال',
    transport: 'حافلات سياحية حديثة ومكيفة VIP',
    accommodationMakkah: 'فندق أرقى المستويات (أجياد / العزيزية المجاورة)',
    accommodationMadinah: 'فندق قريب من ساحة الحرم النبوي الشريف',
    campMina: 'مخيمات منى المكيفة والخدمات المتميزة',
    features: [
      'رحلة عبر حافلات حديثة ومريحة',
      'سكن مريح وخدمات نظافة مستمرة',
      'وجبات غذائية مدروسة ومميزة',
      'محاضرات دينية وإرشادية طوال الرحلة',
      'كادر مرشدين وإداريين لخدمة الحجاج بكل راحة'
    ],
    image: 'https://images.unsplash.com/photo-1565552403568-35e683675a89?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'pkg-3',
    title: 'باقة العمرة الميسرة (عمرة رجب وشعبان)',
    type: 'عمرة مبرورة',
    price: '3,200 ريال',
    transport: 'باص سياحي مكيف VIP',
    accommodationMakkah: 'فندق 4 نجوم في مكة المكرمة (3 ليال)',
    accommodationMadinah: 'فندق قريب من الحرم النبوي (ليلتان)',
    campMina: 'لايوجد (إقامة فندقية)',
    features: [
      'برنامج إيماني متكامل ومزارات المدينة المنورة',
      'إشراف ديني ومطوف مرافق',
      'سكن فندقي مريح',
      'مواصلات مؤمنة بالكامل'
    ],
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800'
  }
];

export const announcements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'فتح باب التسجيل لحج موسم 1448هـ',
    date: '2026-11-01',
    content: 'تعلن قافلة القائم للحج والعمرة عن فتح باب التسجيل المبكر لحجاج بيت الله الحرام لموسم 1448هـ. سادرعوا بالتسجيل المبكر لضمان المقاعد وتأكيد الباقات المتاحة.',
    category: 'هام'
  },
  {
    id: 'ann-2',
    title: 'اللقاء التعريفي الأول للحجاج المجلين',
    date: '2026-11-15',
    content: 'ندعو جميع الحجاج المسجلين لحضور اللقاء التعريفي الأول في مقر القافلة للتعرف على الإرشادات الصحية والفقهية وسير رحلة المناسك.',
    category: 'مواعيد'
  },
  {
    id: 'ann-3',
    title: 'إرشادات الفحص الطبي والتطعيمات الرسمية',
    date: '2026-11-05',
    content: 'يرجى من جميع الحجاج استكمال الفحص الطبي وإصدار الشهادة الصحية عبر تطبيق صحتي وتثبيتها في النظام.',
    category: 'توجيهات'
  }
];

export const initialAdminUsers: AdminUser[] = [
  {
    id: 'usr-1',
    username: 'admin',
    pin: '3f03b51688d048d0870949d2110c9d784762391696a40a50f00f07f90f230589',
    fullName: 'المدير العام للقافلة',
    role: 'الإدارة العامة',
    status: 'active',
    assignedSeason: 'موسم 1448هـ',
    assignedCaravan: 'جميع القوافل والأفواج',
    detailedPermissions: DEFAULT_ROLE_PERMISSIONS['الإدارة العامة'],
    permissions: {
      managePilgrims: true,
      manageAnnouncements: true,
      managePackages: true,
      manageStaff: true,
      manageFinance: true,
      manageReligiousGuide: true,
      manageTravelKit: true,
      manageNotifications: true,
      manageGifts: true,
      manageCultural: true,
    },
    createdAt: '2026-11-01'
  },
  {
    id: 'usr-2',
    username: 'supervisor@alqaemhajj.com',
    pin: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    fullName: 'مشرف المكتب والقبول',
    role: 'الإشراف المكتبي',
    legacyRole: 'مشرف إداري',
    status: 'active',
    assignedSeason: 'موسم 1448هـ',
    assignedCaravan: 'جميع القوافل والأفواج',
    detailedPermissions: DEFAULT_ROLE_PERMISSIONS['الإشراف المكتبي'],
    permissions: {
      managePilgrims: true,
      manageAnnouncements: false,
      managePackages: false,
      manageStaff: false,
      manageFinance: false,
      manageReligiousGuide: false,
      manageTravelKit: true,
      manageNotifications: true,
      manageGifts: true,
      manageCultural: false,
    },
    createdAt: '2026-11-05'
  }
];

export const defaultSiteTexts = {
  topBarAnnouncement: 'قافلة القائم للحج والعمرة - موسم 1448هـ',
  topBarBadge: 'ترخيص رسمي معتمد',
  topBarSubtext: 'الأحساء - المبرز',
  brandName: 'قافلة القائم',
  brandSubtitle: 'للحج والعمرة والزيارة',
  heroBadge: 'فتح باب التسجيل لحج موسم 1448 هـ - المقاعد محدودة',
  heroTitlePrefix: 'رفيقكم الموثوق في رحلة العمر',
  heroTitleHighlight: 'قافلة القائم',
  heroDescription: 'نقدم خدمات متكاملة وراقية لحجاج بيت الله الحرام والمعتمرين. إشراف ديني وإداري بخبرة سنوية طويلة، مخيمات مطورة في منى وعرفات، وسكن فندقي يليق بضيوف الرحمن.',
  registerButtonText: 'استعراض باقات الحج والعمرة',
  portalButtonText: 'بوابة الاستعلام للحاج',
  cardSeasonBadge: 'موسم 1448هـ',
  cardTitle: 'قافلة القائم للحج والعمرة',
  cardSubtitle: 'خدمة ضيوف الرحمن شرف وفخر لنا منذ سنوات طويلة',
  cardFeatures: [
    'سكن فندقي فاخر في مكة المكرمة والمدينة المنورة',
    'مخيمات منى وعرفات المكيفة والمجهزة',
    'إشراف فقهي وإداري وطبي متكامل'
  ]
};

export const defaultYouTubeConfig = {
  enabled: true,
  channelUrl: 'https://www.youtube.com/@alqaemhajj',
  channelId: 'UCQNRXHuNgW8COB-VOJ6zzQw',
  channelHandle: '@alqaemhajj',
  isLiveActive: false,
  liveStreamUrl: '',
  liveTitle: 'البث المباشر لقافلة القائم للحج والعمرة',
  cachedLatestVideoId: '2ON9k1wNizE',
  cachedLatestVideoTitle: 'دعاء السمات الشيخ ربيع البقشي',
  cachedLatestVideoDate: '2026-05-22'
};

export const defaultCampaignSettings: CampaignSettings = {
  phone: '0534717773',
  whatsapp: '0534717773',
  email: 'alqaemhajj@gmail.com',
  address: 'المملكة العربية السعودية - المنطقة الشرقية (الأحساء-المبرز)',
  siteTexts: defaultSiteTexts,
  youtubeConfig: defaultYouTubeConfig,
  busList: ['حافلة 1', 'حافلة 2'],
  marjiList: [
    'السيد السيستاني (دام ظله)',
    'الإمام الخامنئي (دام ظله)',
    'آية الله العظمى الحكيم (قدا)',
    'آية الله العظمى الشيرازي',
    'الشهيد الصدر / آية الله الصدر',
    'مرجع آخر'
  ],
  operationalCostTarget: 350000,
  pilgrimStatsConfig: {
    activeSeasonYear: '1448',
    baseHistoricalCount: 0,
    autoIncludeCurrentPassengers: true,
    historicalRecords: [
      { id: 'hist-1447', hijriYear: '1447هـ', pilgrimsCount: 280, notes: 'موسم حج 1447هـ' },
      { id: 'hist-1446', hijriYear: '1446هـ', pilgrimsCount: 265, notes: 'موسم حج 1446هـ' },
      { id: 'hist-1445', hijriYear: '1445هـ', pilgrimsCount: 250, notes: 'موسم حج 1445هـ' },
      { id: 'hist-1444', hijriYear: '1444هـ', pilgrimsCount: 240, notes: 'موسم حج 1444هـ' },
    ]
  },
  hajjDaysTimeline: [
    {
      id: 'day1',
      dayTitle: 'اليوم الثامن: يوم التروية (8 ذو الحجة)',
      subtitle: 'الانطلاق إلى منى والإقامة في مخيمات القافلة المجهزة',
      summary: 'يبدأ الحاج بالاغتسال ولبس الإحرام (للرجال) وتجديد النية للحج، ثم يتوجه رفقة قافلة القائم إلى مشعر منى المكرم.',
      steps: [
        {
          time: '08:00 ص - 10:00 ص',
          title: 'الإحرام من مكة والتلبية',
          desc: 'الاغتسال والتطيب (البدن لا الثوب)، لبس ثوبي الإحرام، وصلاة ركعتي الإحرام ثم التلبية بصوت عالٍ: (لبيك اللهم لبيك...).'
        },
        {
          time: '12:00 ظهراً - 04:00 عصراً',
          title: 'الوصول إلى مخيم منى',
          desc: 'التوجه بحافلات قافلة القائم الحديثة إلى مشعر منى والتسكين في المخيمات المكيفة والمجهزة بالكامل بفرش وخدمات ضيافة.'
        },
        {
          time: 'طوال اليوم',
          title: 'الصلوات والتقصير والذكر',
          desc: 'أداء صلوات الظهر والعصر والمغرب والعشاء والعصر قصراً (بدون جمع)، والإكثار من تلاوة القرآن والدعاء بإشراف المشايخ المرافقين.'
        }
      ],
      campaignTip: 'تأكد من حمل بطاقة العضوية الخاصة بقافلة القائم وحقيبة اليد الشخصية وارتداء بطاقة التعريف طوال فترة التواجد بالمشاعر.'
    },
    {
      id: 'day2',
      dayTitle: 'اليوم التاسع: يوم عرفة الركن الأعظم (9 ذو الحجة)',
      subtitle: 'الوقوف بصعيد عرفات الطاهر والنفير إلى مزدلفة',
      summary: 'أعظم أيام الحج؛ حيث يتوجه الحجاج بعد طلوع الشمس إلى عرفات لأداء الركن الأعظم والابتهال إلى الله.',
      steps: [
        {
          time: '07:30 ص - 10:00 ص',
          title: 'التوجه إلى عرفات',
          desc: 'التحرك من مخيم منى عبر حافلات القافلة أو قطار الحرمين السريع إلى صعيد عرفات.'
        },
        {
          time: '12:00 ظهراً - غروب الشمس',
          title: 'الوقوف بعرفة والذكر والدعاء',
          desc: 'أداء صلاتي الظهر والعصر جمع تقديم وقصراً بأذان وإقامتين، ثم التفرغ التام للدعاء والتضرع والاستغفار حتى غروب الشمس.'
        },
        {
          time: 'بعد غروب الشمس',
          title: 'النفير إلى مزدلفة',
          desc: 'التحرك بهسك وسكينة بعد الغروب باتجاه مشعر مزدلفة المبروك تحت إشراف وتوجيه المرشدين الإداريين والميدانيين.'
        }
      ],
      campaignTip: 'احرص على الإكثار من شرب السوائل واستخدام المظلة الشمسية الواقية خلال النهار في عرفات.'
    },
    {
      id: 'day3',
      dayTitle: 'اليوم العاشر: يوم النحر وعيد الأضحى (10 ذو الحجة)',
      subtitle: 'المبيت بمزدلفة، رمي جمرة العقبة، النحر، والحلق',
      summary: 'يوم العيد الأكبر، يتضمن المبيت بمزدلفة، جمع الحصى، العودة لمنى لرمي جمرة العقبة الكبرى، ثم الهدي والحلق.',
      steps: [
        {
          time: 'قبيل الفجر - 06:00 ص',
          title: 'المبيت بمزدلفة وصلاة الفجر',
          desc: 'المبيت بمزدلفة، صلاة الفجر، الوقوف بالمشعر الحرام والدعاء، وجمع 7 حصيات لرمي جمرة العقبة.'
        },
        {
          time: '08:00 ص - 11:00 ص',
          title: 'رمي جمرة العقبة الكبرى',
          desc: 'العودة إلى منى ورمي جمرة العقبة الكبرى بسبع حصيات متعاقبات مع التكبير مع كل حصاة.'
        },
        {
          time: '11:30 ص - المساء',
          title: 'الهدي، الحلق، وطواف الإفاضة',
          desc: 'تنييم ذبح الهدي عبر الترتيب المعتمد للقافلة، ثم الحلق أو التقصير والتحلل الأصغر، ثم التوجه لمكة لأداء طواف الإفاضة والسعي.'
        }
      ],
      campaignTip: 'تنسق إدارة قافلة القائم مواعيد التفويج المجدولة لرمي الجمرات وطواف الإفاضة لضمان أقصى درجات الراحة والأمان للحجاج.'
    },
    {
      id: 'day4',
      dayTitle: 'أيام التشريق: المبيت بمنى ورمي الجمرات (11 و 12 ذو الحجة)',
      subtitle: 'أيام أكل وشرب وذكر، ورمي الجمرات الثلاث',
      summary: 'يقضي الحجاج أيام التشريق في مخيمات منى، مع رمي الجمرات الثلاث (الصغرى، الوسطى، الكبرى) بعد زوال الشمس.',
      steps: [
        {
          time: 'طوال اليومين',
          title: 'المبيت في منى',
          desc: 'يجب المبيت في منى ليالي التشريق (ليلة الحادي عشر وليلة الثاني عشر).'
        },
        {
          time: 'بعد زوال الشمس (الظهر)',
          title: 'رمي الجمرات الثلاث',
          desc: 'رمي الجمرات الثلاث بترتيب: الجمرة الصغرى ثم الوسطى ثم جمرة العقبة الكبرى (كل جمرة بسبع حصيات).'
        },
        {
          time: '12 ذو الحجة (المتعجل)',
          title: 'النفير لمن أراد التعجل',
          desc: 'من أراد التعجل جاز له الخروج من منى قبل غروب شمس الثاني عشر بعد رمي الجمرات.'
        }
      ],
      campaignTip: 'التزم بجدول التفويج الزمني الدقيق الذي تعلنه إدارة حملة القائم لتفادي الازدحام.'
    },
    {
      id: 'day5',
      dayTitle: 'طواف الوداع وختام المناسك',
      subtitle: 'طواف الوداع ومغادرة المشاعر المقدسة',
      summary: 'آخر عهد الحاج بالبيت العتيق هو طواف الوداع قبل مغادرة مكة المكرمة عائدين إلى الديار بسلامة الله.',
      steps: [
        {
          time: 'قبل المغادرة',
          title: 'طواف الوداع',
          desc: 'أداء طواف الوداع حول الكعبة المشرفة 7 أشواط، وصلاة ركعتيه، ليكون آخر عهد الحاج بالبيت الحرام.'
        },
        {
          time: 'العودة المظفرة',
          title: 'العودة مع قافلة القائم',
          desc: 'التجمع في نقطة انطلاق حافلات أو قطار القافلة للعودة إلى المنطقة الشرقية (الأحساء - المبرز) محملين بالقبول والمغفرة.'
        }
      ],
      campaignTip: 'تأكد من تسليم بطاقة العضوية والتحقق من أمتعتك الشخصية قبل مغادرة الفندق في مكة أو المدينة.'
    }
  ]
};
