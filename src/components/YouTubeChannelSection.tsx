import React, { useState, useEffect } from 'react';
import { Video, Radio, ExternalLink, RefreshCw, Play, Share2, Check } from 'lucide-react';
import { YouTubeConfig } from '../types';
import {
  resolveYouTubeConfig,
  fetchLatestYouTubeChannelVideo,
  getLatestVideoEmbedUrl,
  getLiveStreamEmbedUrl,
  YouTubeVideoItem,
} from '../utils/youtubeFeed';

interface YouTubeChannelSectionProps {
  youtubeConfig?: YouTubeConfig;
}

export const YouTubeChannelSection: React.FC<YouTubeChannelSectionProps> = ({ youtubeConfig }) => {
  const config = resolveYouTubeConfig(youtubeConfig);

  const [activeMode, setActiveMode] = useState<'latest' | 'live'>(
    config.isLiveActive ? 'live' : 'latest'
  );
  const [latestVideo, setLatestVideo] = useState<YouTubeVideoItem>({
    videoId: config.cachedLatestVideoId || '2ON9k1wNizE',
    title: config.cachedLatestVideoTitle || 'دعاء السمات الشيخ ربيع البقشي',
    publishedAt: config.cachedLatestVideoDate || '2026-05-22',
    thumbnailUrl: `https://i3.ytimg.com/vi/${config.cachedLatestVideoId || '2ON9k1wNizE'}/hqdefault.jpg`,
    videoUrl: `https://www.youtube.com/watch?v=${config.cachedLatestVideoId || '2ON9k1wNizE'}`,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync active mode if admin toggles live broadcast on/off
  useEffect(() => {
    if (config.isLiveActive) {
      setActiveMode('live');
    } else {
      setActiveMode('latest');
    }
  }, [config.isLiveActive]);

  // Keep fallback in sync with admin-cached latest video
  useEffect(() => {
    if (config.cachedLatestVideoId) {
      setLatestVideo((prev) => ({
        ...prev,
        videoId: config.cachedLatestVideoId || prev.videoId,
        title: config.cachedLatestVideoTitle || prev.title,
        publishedAt: config.cachedLatestVideoDate || prev.publishedAt,
        thumbnailUrl: `https://i3.ytimg.com/vi/${config.cachedLatestVideoId}/hqdefault.jpg`,
        videoUrl: `https://www.youtube.com/watch?v=${config.cachedLatestVideoId}`,
      }));
    }
  }, [config.cachedLatestVideoId, config.cachedLatestVideoTitle, config.cachedLatestVideoDate]);

  const loadLatestFromChannel = async () => {
    setIsRefreshing(true);
    try {
      const fetched = await fetchLatestYouTubeChannelVideo(config.channelId);
      if (fetched && fetched.videoId) {
        setLatestVideo(fetched);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (config.enabled) {
      loadLatestFromChannel();
    }
  }, [config.channelId, config.enabled]);

  if (!config.enabled) {
    return null;
  }

  const latestEmbedUrl = getLatestVideoEmbedUrl(latestVideo.videoId, config.channelId);
  const liveEmbedUrl = getLiveStreamEmbedUrl(config);
  const currentShareUrl =
    activeMode === 'live'
      ? config.liveStreamUrl || `${config.channelUrl}/live`
      : latestVideo.videoUrl;

  const handleCopyVideoLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: activeMode === 'live' ? config.liveTitle : latestVideo.title,
          url: currentShareUrl,
        });
      } else {
        await navigator.clipboard.writeText(currentShareUrl);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      try {
        await navigator.clipboard.writeText(currentShareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch {
        // Ignore
      }
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-right">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        {/* Top Live Broadcast Alert Banner if Live Mode is Active */}
        {config.isLiveActive && (
          <div className="bg-red-600 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Radio className="w-5 h-5 animate-pulse shrink-0" />
              <span className="font-black text-sm sm:text-base">
                بث مباشر الآن من قناة قافلة القائم على يوتيوب: {config.liveTitle}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveMode('live')}
              className="px-3.5 py-1.5 rounded-xl bg-white text-red-700 font-black text-xs hover:bg-red-50 transition whitespace-nowrap shrink-0"
            >
              مشاهدة البث المباشر الآن
            </button>
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header & Mode Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>القناة الرسمية على يوتيوب</span>
                <span aria-hidden="true">·</span>
                <span dir="ltr" className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                  {config.channelHandle || '@alqaemhajj'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                مرئيات وبث قافلة القائم على يوتيوب
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                متابعة آخر فيديو تم نشره في القناة الرسمية أو مشاهدة البث المباشر للدروس واللقاءات
              </p>
            </div>

            {/* Interactive Segmented Control: Latest Video vs Live Stream */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveMode('latest')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    activeMode === 'latest'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>آخر فيديو منشور</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('live')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    activeMode === 'live'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>البث المباشر</span>
                  {config.isLiveActive && <span className="text-[10px] font-black">(مباشر الآن)</span>}
                </button>
              </div>

              <a
                href={config.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>زيارة القناة</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Main Video Player + Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* 16:9 YouTube Embed Player */}
            <div className="lg:col-span-8">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
                <iframe
                  key={activeMode === 'live' ? liveEmbedUrl : latestEmbedUrl}
                  src={activeMode === 'live' ? liveEmbedUrl : latestEmbedUrl}
                  title={
                    activeMode === 'live'
                      ? config.liveTitle || 'البث المباشر لقافلة القائم'
                      : latestVideo.title
                  }
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Video Metadata & Quick Actions Panel */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {activeMode === 'live' ? 'حالة البث المباشر' : 'أحدث مشاركة في القناة'}
                  </span>
                  {activeMode === 'latest' && (
                    <button
                      type="button"
                      onClick={loadLatestFromChannel}
                      disabled={isRefreshing}
                      title="تحديث لجلب آخر فيديو من يوتيوب"
                      className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>تحديث</span>
                    </button>
                  )}
                </div>

                {activeMode === 'latest' ? (
                  <div className="space-y-3">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                      {latestVideo.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>تاريخ النشر: {latestVideo.publishedAt || 'حديث'}</span>
                      <span aria-hidden="true">·</span>
                      <span>يوتيوب قافلة القائم</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      يتم عرض آخر فيديو تم رفعه على قناة القافلة الرسمية في يوتيوب تلقائياً. عند نشر أي فيديو جديد في القناة سيظهر هنا مباشرة.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                      {config.liveTitle || 'البث المباشر لقافلة القائم للحج والعمرة'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {config.isLiveActive ? 'البث المباشر مفعل الآن' : 'نافذة البث المباشر للقناة'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span dir="ltr">{config.channelHandle || '@alqaemhajj'}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      عند بدء بث مباشر على قناة قافلة القائم في يوتيوب، يعمل البث هنا مباشرة داخل الموقع لمتابعة المجالس والدروس والإرشادات الحية.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <a
                  href={currentShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow"
                >
                  <Video className="w-4 h-4" />
                  <span>
                    {activeMode === 'live'
                      ? 'فتح البث المباشر في تطبيق يوتيوب'
                      : 'مشاهدة الفيديو على يوتيوب'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyVideoLink}
                  className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-500">تم نسخ رابط الفيديو ✓</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-amber-500" />
                      <span>مشاركة رابط الفيديو</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
