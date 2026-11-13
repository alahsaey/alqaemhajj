import React from 'react';
import { Loader2, ZoomIn } from 'lucide-react';
import { getEmbeddedVideoInfo, useResolvedMediaUrl } from '../utils/announcementMedia';

interface AnnouncementImageViewProps {
  imageUrl?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  enableLightbox?: boolean;
  onOpenLightbox?: (resolvedSrc: string, title: string) => void;
  overlayChildren?: React.ReactNode;
}

export const AnnouncementImageView: React.FC<AnnouncementImageViewProps> = ({
  imageUrl,
  alt,
  className = 'w-full h-full object-cover',
  containerClassName = 'relative w-full h-52 bg-slate-950 overflow-hidden group',
  enableLightbox = false,
  onOpenLightbox,
  overlayChildren,
}) => {
  const { resolvedUrl, isLoading } = useResolvedMediaUrl(imageUrl);

  if (!imageUrl) return null;

  return (
    <div
      className={`${containerClassName} ${enableLightbox && resolvedUrl ? 'cursor-pointer' : ''}`}
      onClick={() => {
        if (enableLightbox && resolvedUrl && onOpenLightbox) {
          onOpenLightbox(resolvedUrl, alt);
        }
      }}
    >
      {isLoading ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-amber-400 text-xs bg-slate-950">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>جاري تحميل الصورة المرجعية...</span>
        </div>
      ) : resolvedUrl ? (
        <img src={resolvedUrl} alt={alt} className={className} />
      ) : null}

      {overlayChildren}

      {enableLightbox && resolvedUrl && (
        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
          <span className="bg-slate-950/80 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-amber-500/30">
            <ZoomIn className="w-4 h-4" />
            <span>تكبير الصورة</span>
          </span>
        </div>
      )}
    </div>
  );
};

interface AnnouncementVideoViewProps {
  videoUrl?: string;
  title: string;
  videoClassName?: string;
}

export const AnnouncementVideoView: React.FC<AnnouncementVideoViewProps> = ({
  videoUrl,
  title,
  videoClassName = 'w-full max-h-64 object-contain bg-black',
}) => {
  const videoInfo = getEmbeddedVideoInfo(videoUrl);
  const { resolvedUrl, isLoading } = useResolvedMediaUrl(
    videoInfo.type === 'direct' ? videoInfo.src : ''
  );

  if (!videoUrl || videoInfo.type === 'none') return null;

  if (videoInfo.type === 'youtube') {
    return (
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
        <div className="relative w-full pt-[56.25%]">
          <iframe
            src={videoInfo.src}
            title={title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
      {isLoading ? (
        <div className="w-full h-44 flex flex-col items-center justify-center gap-2 text-sky-400 text-xs bg-slate-950">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>جاري تجهيز الفيديو المرجعي للتشغيل...</span>
        </div>
      ) : resolvedUrl ? (
        <video
          key={resolvedUrl}
          src={resolvedUrl}
          controls
          preload="metadata"
          playsInline
          className={videoClassName}
        />
      ) : null}
    </div>
  );
};
