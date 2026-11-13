import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Award, Calendar, Sparkles, ArrowLeft, CheckCircle2, HeartHandshake, Bus, Plane, MapPin, Phone, Package as PackageIcon, X, ZoomIn, Video, Share2, Check, ExternalLink } from 'lucide-react';
import { HajjPackage, Announcement, CampaignSettings } from '../types';
import { getAnnouncementTypographyClasses, getEmbeddedVideoInfo } from '../utils/announcementMedia';
import { shareAnnouncementItem, sharePackageItem, clearDirectShareParamsFromUrl } from '../utils/shareItem';
import { AnnouncementImageView, AnnouncementVideoView } from './AnnouncementMediaView';
import { YouTubeChannelSection } from './YouTubeChannelSection';
import { PackagesCarousel } from './PackagesCarousel';
import { formatPilgrimsCountWithPlus } from '../utils/pilgrimStats';


interface HomeProps {
  setCurrentView: (view: string) => void;
  pilgrimCount: number;
  announcements: Announcement[];
  packages: HajjPackage[];
  campaignSettings?: CampaignSettings;
  onSelectPackageForRegistration?: (pkgTitle: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  setCurrentView,
  pilgrimCount,
  announcements,
  packages,
  campaignSettings,
  onSelectPackageForRegistration
}) => {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedSpotlightAnn, setSharedSpotlightAnn] = useState<Announcement | null>(null);
  const [sharedSpotlightPkg, setSharedSpotlightPkg] = useState<HajjPackage | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  // Detect direct share URL parameters (?announcement=ID or ?package=ID) so visitor sees the shared item immediately without searching
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const annId = params.get('announcement');
    const pkgId = params.get('package');

    if (annId && announcements.length > 0) {
      const foundAnn = announcements.find((a) => a.id === annId);
      if (foundAnn) {
        setSharedSpotlightAnn(foundAnn);
        setHighlightedItemId(`ann-${foundAnn.id}`);
        setTimeout(() => {
          const el = document.getElementById(`announcement-card-${foundAnn.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 350);
      }
    } else if (pkgId && packages.length > 0) {
      const foundPkg = packages.find((p) => p.id === pkgId);
      if (foundPkg) {
        setSharedSpotlightPkg(foundPkg);
        setHighlightedItemId(`pkg-${foundPkg.id}`);
        setTimeout(() => {
          const el = document.getElementById(`package-card-${foundPkg.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 350);
      }
    }
  }, [announcements, packages]);

  const handleShareAnnouncement = async (ann: Announcement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const result = await shareAnnouncementItem(ann);
    if (result === 'copied' || result === 'shared') {
      setCopiedId(`ann-${ann.id}`);
      setTimeout(() => setCopiedId((prev) => (prev === `ann-${ann.id}` ? null : prev)), 2500);
    }
  };

  const handleSharePackage = async (pkg: HajjPackage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const result = await sharePackageItem(pkg);
    if (result === 'copied' || result === 'shared') {
      setCopiedId(`pkg-${pkg.id}`);
      setTimeout(() => setCopiedId((prev) => (prev === `pkg-${pkg.id}` ? null : prev)), 2500);
    }
  };

  const closeSpotlightModal = () => {
    setSharedSpotlightAnn(null);
    setSharedSpotlightPkg(null);
    clearDirectShareParamsFromUrl();
  };

  const texts = campaignSettings?.siteTexts;
  const heroBadge = texts?.heroBadge || 'فتح باب التسجيل لحج موسم 1448 هـ - المقاعد محدودة';
  const heroTitlePrefix = texts?.heroTitlePrefix || 'رفيقكم الموثوق في رحلة العمر';
  const heroTitleHighlight = texts?.heroTitleHighlight || 'قافلة القائم';
  const heroDescription = texts?.heroDescription || 'نقدم خدمات متكاملة وراقية لحجاج بيت الله الحرام والمعتمرين. إشراف ديني وإداري بخبرة سنوية طويلة، مخيمات مطورة في منى وعرفات، وسكن فندقي يليق بضيوف الرحمن.';
  const registerButtonText = texts?.registerButtonText && texts.registerButtonText !== 'سجل الآن في قافلة 1448هـ'
    ? texts.registerButtonText
    : 'استعراض باقات الحج والعمرة';
  const portalButtonText = texts?.portalButtonText || 'بوابة الاستعلام للحاج';
  const cardSeasonBadge = texts?.cardSeasonBadge || 'موسم 1448هـ';
  const cardTitle = texts?.cardTitle || 'قافلة القائم للحج والعمرة';
  const cardSubtitle = texts?.cardSubtitle || 'خدمة ضيوف الرحمن شرف وفخر لنا منذ سنوات طويلة';
  const cardFeatures = texts?.cardFeatures || [
    'سكن فندقي فاخر في مكة المكرمة والمدينة المنورة',
    'مخيمات منى وعرفات المكيفة والمجهزة',
    'إشراف فقهي وإداري وطبي متكامل'
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white overflow-hidden py-14 sm:py-20 lg:py-28 border-b border-amber-500/20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-right">
              {/* Compact Announcement Badge */}
              <div className="inline-flex items-center justify-center gap-2 bg-amber-500/15 border border-amber-500/30 px-4 py-1.5 rounded-full text-amber-400 text-xs sm:text-sm font-bold shadow-inner mb-5 max-w-full">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="leading-snug">{heroBadge}</span>
              </div>

              {/* Main Heading with generous Arabic line-height & bottom margin */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-relaxed sm:leading-snug mb-4">
                {heroTitlePrefix}{' '}
                <span className="text-amber-400 inline-block">{heroTitleHighlight}</span>
              </h1>

              {/* Subtitle Paragraph */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mb-6">
                {heroDescription}
              </p>

              {/* Consistent Full-Width Mobile CTA Buttons */}
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                <button
                  onClick={() => setCurrentView('packages')}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-7 py-3.5 rounded-xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2.5 text-base group cursor-pointer active:scale-[0.99]"
                >
                  <PackageIcon className="w-5 h-5 text-slate-950 shrink-0" />
                  <span>{registerButtonText}</span>
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform shrink-0" />
                </button>
                <button
                  onClick={() => setCurrentView('portal')}
                  className="w-full sm:w-auto bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 hover:border-amber-500/40 font-bold px-7 py-3.5 rounded-xl transition flex items-center justify-center gap-2.5 text-base cursor-pointer active:scale-[0.99]"
                >
                  <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{portalButtonText}</span>
                </button>
              </div>

              {/* Quick stats badges */}
              <div className="w-full grid grid-cols-3 gap-4 pt-8 mt-8 border-t border-slate-800/80 text-center lg:text-right">
                <div className="flex flex-col items-center lg:items-start">
                  <div className="text-2xl lg:text-3xl font-black text-amber-400 tabular-nums">
                    <span dir="ltr" className="inline-block">
                      {formatPilgrimsCountWithPlus(pilgrimCount)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">حاج مسجل ومنضم</div>
                </div>
                <div className="flex flex-col items-center lg:items-start">
                  <div className="text-2xl lg:text-3xl font-black text-amber-400 tabular-nums">
                    <span dir="ltr" className="inline-block">100%</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">خدمات راقية ومضمونة</div>
                </div>
                <div className="flex flex-col items-center lg:items-start">
                  <div className="text-2xl lg:text-3xl font-black text-amber-400 tabular-nums">
                    <span dir="ltr" className="inline-block">24/7</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">إرشاد ومتابعة مستمرة</div>
                </div>
              </div>
            </div>

            {/* Logo showcase card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-8 shadow-2xl shadow-amber-500/10 text-center">
                <div className="absolute -top-4 -right-4 bg-amber-500 text-slate-950 px-4 py-1 rounded-full text-xs font-black shadow">
                  {cardSeasonBadge}
                </div>
                <div className="w-36 h-36 bg-white rounded-2xl mx-auto p-3 shadow-inner flex items-center justify-center mb-6 border border-amber-500/30">
                  <img 
                    src="/assets/aistudio/Screenshot_20261107_174409_com_instagram_android_InstagramMainActivity_441b738d.png" 
                    alt="شعار قافلة القائم" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{cardTitle}</h3>
                <p className="text-sm text-slate-400 mb-6">{cardSubtitle}</p>
                <div className="space-y-3 text-right bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                  {cardFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Packages Interactive Horizontal Carousel */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-right">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">باقات الحج والعمرة 1448هـ</h2>
            <p className="text-sm text-slate-500 mt-1">
              اسحب يميناً أو يساراً للتنقل بين الباقات، واختر الباقة المناسبة لك أو شاركها مباشرة بضغطة زر
            </p>
          </div>
          <button
            onClick={() => setCurrentView('packages')}
            className="text-amber-600 dark:text-amber-400 font-bold text-sm hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>عرض كل الباقات</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <PackagesCarousel
          packages={packages}
          setCurrentView={setCurrentView}
          onSelectPackageForRegistration={onSelectPackageForRegistration}
          highlightedPkgId={
            highlightedItemId && highlightedItemId.startsWith('pkg-')
              ? highlightedItemId.replace('pkg-', '')
              : null
          }
          onOpenDetailsModal={(pkg) => setSharedSpotlightPkg(pkg)}
          cardIdPrefix="package-card"
        />
      </section>

      {/* Announcements / Meetings / Lessons Ticker */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-right">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">التعاميم، إعلانات اللقاءات والدروس</h2>
            <p className="text-sm text-slate-500 mt-1">آخر المستجدات والدروس الإرشادية واللقاءات التعريفية لحجاج القافلة (يمكنك مشاركة أي موضوع مباشرة)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {announcements.map((ann) => {
            const showImg = Boolean(ann.imageUrl && ann.displaySettings?.showImage !== false);
            const showVid = Boolean(ann.videoUrl && ann.displaySettings?.showVideo !== false);
            const enableLightbox = ann.displaySettings?.enableLightbox !== false;
            const isHighlighted = Boolean(ann.displaySettings?.highlightCard) || highlightedItemId === `ann-${ann.id}`;
            const videoInfo = showVid ? getEmbeddedVideoInfo(ann.videoUrl) : { type: 'none' as const, src: '' };
            const typographyClasses = getAnnouncementTypographyClasses(ann);
            const isCopied = copiedId === `ann-${ann.id}`;

            return (
              <div
                id={`announcement-card-${ann.id}`}
                key={ann.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                  isHighlighted
                    ? 'border-2 border-amber-500 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/30'
                    : 'border border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Attached Image Display */}
                {showImg && ann.imageUrl && (
                  <AnnouncementImageView
                    imageUrl={ann.imageUrl}
                    alt={ann.title}
                    enableLightbox={enableLightbox}
                    onOpenLightbox={(resolvedSrc, title) => setLightboxImage({ src: resolvedSrc, title })}
                  />
                )}

                <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {ann.category}
                        </span>
                        {ann.displaySettings?.highlightCard && (
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                            مميز
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{ann.date}</span>
                        <button
                          type="button"
                          onClick={(e) => handleShareAnnouncement(ann, e)}
                          title="مشاركة هذا الموضوع برابط مباشر"
                          className={`p-2 rounded-xl border transition flex items-center gap-1 text-xs font-bold ${
                            isCopied
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-amber-500/20 text-slate-600 dark:text-amber-400 border-slate-200 dark:border-slate-700 hover:border-amber-500/40'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span className="text-[11px]">تم النسخ</span>
                            </>
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <h3
                      className={`text-lg font-bold text-slate-900 dark:text-white ${
                        ann.textAlign === 'center' ? 'text-center' : 'text-right'
                      }`}
                    >
                      {ann.title}
                    </h3>

                    <p className={`text-slate-600 dark:text-slate-300 ${typographyClasses}`}>
                      {ann.content}
                    </p>
                  </div>

                  {/* Attached Video Player Display */}
                  {showVid && videoInfo.type !== 'none' && (
                    <div className="pt-3">
                      <AnnouncementVideoView videoUrl={ann.videoUrl} title={ann.title} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Image Lightbox Modal */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div
              className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <h4 className="text-base font-bold text-amber-400">{lightboxImage.title}</h4>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 flex items-center justify-center bg-slate-950 max-h-[80vh] overflow-auto">
                <img
                  src={lightboxImage.src}
                  alt={lightboxImage.title}
                  className="max-w-full max-h-[72vh] object-contain rounded-xl"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* YouTube Channel Latest Video & Live Stream Section */}
      <YouTubeChannelSection youtubeConfig={campaignSettings?.youtubeConfig} />

      {/* Direct Shared Topic / Announcement Spotlight Modal */}
      {sharedSpotlightAnn && (() => {
        const showImg = Boolean(sharedSpotlightAnn.imageUrl && sharedSpotlightAnn.displaySettings?.showImage !== false);
        const showVid = Boolean(sharedSpotlightAnn.videoUrl && sharedSpotlightAnn.displaySettings?.showVideo !== false);
        const videoInfo = showVid ? getEmbeddedVideoInfo(sharedSpotlightAnn.videoUrl) : { type: 'none' as const, src: '' };
        const typographyClasses = getAnnouncementTypographyClasses(sharedSpotlightAnn);
        const isAnnCopied = copiedId === `ann-${sharedSpotlightAnn.id}`;

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={closeSpotlightModal}
          >
            <div
              className="relative max-w-2xl w-full bg-slate-900 border-2 border-amber-500/50 rounded-3xl overflow-hidden shadow-2xl my-8 text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full">
                    عرض مباشر للموضوع
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {sharedSpotlightAnn.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeSpotlightModal}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[78vh] overflow-y-auto">
                {showImg && sharedSpotlightAnn.imageUrl && (
                  <AnnouncementImageView
                    imageUrl={sharedSpotlightAnn.imageUrl}
                    alt={sharedSpotlightAnn.title}
                    containerClassName="w-full max-h-80 bg-slate-950 overflow-hidden flex items-center justify-center"
                    className="w-full max-h-80 object-contain"
                  />
                )}

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>تاريخ النشر: {sharedSpotlightAnn.date}</span>
                    <span>قافلة القائم للحج والعمرة</span>
                  </div>

                  <h3
                    className={`text-2xl font-black text-white ${
                      sharedSpotlightAnn.textAlign === 'center' ? 'text-center' : 'text-right'
                    }`}
                  >
                    {sharedSpotlightAnn.title}
                  </h3>

                  <p className={`text-slate-200 ${typographyClasses}`}>
                    {sharedSpotlightAnn.content}
                  </p>

                  {showVid && videoInfo.type !== 'none' && (
                    <div className="pt-3">
                      <AnnouncementVideoView
                        videoUrl={sharedSpotlightAnn.videoUrl}
                        title={sharedSpotlightAnn.title}
                        videoClassName="w-full max-h-80 object-contain bg-black"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={(e) => handleShareAnnouncement(sharedSpotlightAnn, e)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
                    isAnnCopied
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {isAnnCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم نسخ الرابط المباشر ✓</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>مشاركة هذا الموضوع</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeSpotlightModal}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
                >
                  إغلاق وتصفح الموقع
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Direct Shared Package Spotlight Modal */}
      {sharedSpotlightPkg && (() => {
        const isPkgCopied = copiedId === `pkg-${sharedSpotlightPkg.id}`;

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={closeSpotlightModal}
          >
            <div
              className="relative max-w-2xl w-full bg-slate-900 border-2 border-amber-500/50 rounded-3xl overflow-hidden shadow-2xl my-8 text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full">
                    عرض مباشر للباقة
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {sharedSpotlightPkg.type}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeSpotlightModal}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[78vh] overflow-y-auto">
                <div className="relative h-60 w-full bg-slate-950 overflow-hidden">
                  <img
                    src={sharedSpotlightPkg.image}
                    alt={sharedSpotlightPkg.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-md text-amber-400 px-4 py-2 rounded-2xl text-base font-black border border-amber-500/40 shadow-lg">
                    {sharedSpotlightPkg.price}
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <h3 className="text-2xl font-black text-white">{sharedSpotlightPkg.title}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-slate-300">
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{sharedSpotlightPkg.transport}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>مكة: {sharedSpotlightPkg.accommodationMakkah}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>المدينة: {sharedSpotlightPkg.accommodationMadinah}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-sm font-bold text-amber-400">مميزات وخدمات الباقة:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {sharedSpotlightPkg.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-200 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectPackageForRegistration) {
                        onSelectPackageForRegistration(sharedSpotlightPkg.title);
                      }
                      closeSpotlightModal();
                      setCurrentView('register');
                    }}
                    className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg"
                  >
                    <span>احجز وسجل في هذه الباقة الآن</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSharePackage(sharedSpotlightPkg, e)}
                    className={`px-4 py-3 rounded-xl font-bold text-xs border transition flex items-center gap-1.5 ${
                      isPkgCopied
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {isPkgCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تم نسخ الرابط ✓</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>مشاركة الباقة</span>
                      </>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={closeSpotlightModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}



      {/* Why Choose Al-Qaem Campaign */}
      <section className="bg-slate-100 dark:bg-slate-900/60 py-16 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">لماذا تختار قافلة القائم؟</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">نتميز بتقديم رعاية شاملة وخدمات استثنائية لراحة ضيوف الرحمن</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-right space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">إشراف فقهي وديني</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">نخبة من العلماء والمرشدين الفقهيين لمرافقة الحجاج والإجابة على الاستسفارات طوال الرحلة.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-right space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">كادر إداري خبير</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">فريق إداري متمرس لترتيب التصاريح، السكن، الإعاشة، والتفويج بكل دقة وسلاسة.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-right space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">مخيمات فاخرة في منى</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">مخيمات مكيفة ومطورة مزودة بكافة خدمات الضيافة والراحة لضمان أداء المناسك بخشوع.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-right space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">رعاية صحية متكاملة</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">عيادة طبية مرافقة للقافلة مع طاقم تمريض وإسعافات أولية لمتابعة صحة الحجاج طوال الوقت.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
