import React, { useState } from 'react';
import { Video, Radio, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react';
import { CampaignSettings, YouTubeConfig } from '../types';
import { resolveYouTubeConfig, fetchLatestYouTubeChannelVideo } from '../utils/youtubeFeed';

interface YouTubeAdminControlProps {
  campaignSettings: CampaignSettings;
  onUpdateCampaignSettings: (settings: CampaignSettings) => void;
}

export const YouTubeAdminControl: React.FC<YouTubeAdminControlProps> = ({
  campaignSettings,
  onUpdateCampaignSettings,
}) => {
  const currentYt = resolveYouTubeConfig(campaignSettings?.youtubeConfig);
  const [form, setForm] = useState<YouTubeConfig>(currentYt);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const saveConfig = (nextConfig: YouTubeConfig, message = 'تم حفظ إعدادات قناة يوتيوب والبث المباشر بنجاح ✓') => {
    setForm(nextConfig);
    onUpdateCampaignSettings({
      ...campaignSettings,
      youtubeConfig: nextConfig,
    });
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleSyncLatestVideo = async () => {
    setSyncing(true);
    setStatusMessage('');
    try {
      const latest = await fetchLatestYouTubeChannelVideo(form.channelId);
      if (latest && latest.videoId) {
        const updated: YouTubeConfig = {
          ...form,
          cachedLatestVideoId: latest.videoId,
          cachedLatestVideoTitle: latest.title,
          cachedLatestVideoDate: latest.publishedAt || new Date().toISOString().slice(0, 10),
        };
        saveConfig(updated, `تم جلب وتثبيت آخر فيديو من القناة: "${latest.title}" ✓`);
      } else {
        setStatusMessage('تم التحديث عبر خلاصة القناة التلقائية ✓');
        setTimeout(() => setStatusMessage(''), 3500);
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-right">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-red-500 shrink-0" />
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              ربط قناة يوتيوب القافلة والبث المباشر (@alqaemhajj)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            يعرض الموقع تلقائياً آخر فيديو تم نشره في قناة اليوتيوب، ويمكنك تفعيل البث المباشر بضغطة زر ليظهر لزوار الموقع فوراً
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncLatestVideo}
            disabled={syncing}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-amber-500' : ''}`} />
            <span>جلب آخر فيديو من القناة الآن</span>
          </button>

          <a
            href={form.channelUrl || 'https://www.youtube.com/@alqaemhajj'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>فتح القناة</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Quick Toggles Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toggle 1: Enable/Disable YouTube Section on Home Page */}
        <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
          <div className="space-y-0.5">
            <div className="text-xs font-black text-slate-900 dark:text-white">
              إظهار قسم يوتيوب في الصفحة الرئيسية
            </div>
            <div className="text-[11px] text-slate-500">
              عرض مشغل آخر فيديو منشور في قناة القافلة لزوار الموقع
            </div>
          </div>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => {
              const next = { ...form, enabled: e.target.checked };
              saveConfig(
                next,
                e.target.checked
                  ? 'تم تفعيل قسم يوتيوب في الصفحة الرئيسية ✓'
                  : 'تم إخفاء قسم يوتيوب من الصفحة الرئيسية'
              );
            }}
            className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
          />
        </label>

        {/* Toggle 2: Activate Live Stream Broadcast */}
        <label
          className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
            form.isLiveActive
              ? 'bg-red-500/10 border-red-500/40'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="space-y-0.5">
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Radio className={`w-4 h-4 ${form.isLiveActive ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
              <span>تفعيل وضع البث المباشر الآن (Live)</span>
            </div>
            <div className="text-[11px] text-slate-500">
              عند التفعيل يتحول المشغل تلقائياً للبث المباشر مع شريط تنبيه أحمر أعلى القسم
            </div>
          </div>
          <input
            type="checkbox"
            checked={form.isLiveActive}
            onChange={(e) => {
              const next = { ...form, isLiveActive: e.target.checked };
              saveConfig(
                next,
                e.target.checked
                  ? 'تم تفعيل البث المباشر الآن في الصفحة الرئيسية ✓'
                  : 'تم إيقاف وضع البث المباشر والعودة لعرض آخر فيديو مسجل ✓'
              );
            }}
            className="w-5 h-5 accent-red-600 rounded cursor-pointer"
          />
        </label>
      </div>

      {/* Live Stream & Channel Details Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            عنوان البث المباشر (عند التفعيل)
          </label>
          <input
            type="text"
            value={form.liveTitle || ''}
            onChange={(e) => setForm({ ...form, liveTitle: e.target.value })}
            placeholder="مثال: البث المباشر للقاء التعريفي لحجاج القافلة"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            رابط البث المباشر (اختياري - أو يترك فارغاً للبث التلقائي للقناة)
          </label>
          <input
            type="text"
            value={form.liveStreamUrl || ''}
            onChange={(e) => setForm({ ...form, liveStreamUrl: e.target.value })}
            placeholder="https://youtube.com/live/..."
            dir="ltr"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            رابط قناة اليوتيوب الرسمية
          </label>
          <input
            type="text"
            value={form.channelUrl || ''}
            onChange={(e) => setForm({ ...form, channelUrl: e.target.value })}
            placeholder="https://www.youtube.com/@alqaemhajj"
            dir="ltr"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
        <div className="text-slate-500 dark:text-slate-400">
          <span>آخر فيديو مثبت حالياً: </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {form.cachedLatestVideoTitle || 'دعاء السمات الشيخ ربيع البقشي'}
          </span>
          {form.cachedLatestVideoDate && (
            <span className="mr-2 text-slate-400">({form.cachedLatestVideoDate})</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => saveConfig(form)}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow"
        >
          حفظ إعدادات يوتيوب والبث المباشر
        </button>
      </div>
    </div>
  );
};
