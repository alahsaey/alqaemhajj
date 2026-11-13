import { YouTubeConfig } from '../types';
import { defaultYouTubeConfig } from '../data/initialData';

export interface YouTubeVideoItem {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  videoUrl: string;
  isLiveTitle?: boolean;
}

/**
 * Normalizes a YouTubeConfig object, ensuring fallback defaults for @alqaemhajj.
 */
export function resolveYouTubeConfig(config?: YouTubeConfig): YouTubeConfig {
  return {
    enabled: config?.enabled !== undefined ? config.enabled : defaultYouTubeConfig.enabled,
    channelUrl: (config?.channelUrl || defaultYouTubeConfig.channelUrl).trim(),
    channelId: (config?.channelId || defaultYouTubeConfig.channelId).trim(),
    channelHandle: (config?.channelHandle || defaultYouTubeConfig.channelHandle).trim(),
    isLiveActive: Boolean(config?.isLiveActive),
    liveStreamUrl: (config?.liveStreamUrl || '').trim(),
    liveTitle: (config?.liveTitle || defaultYouTubeConfig.liveTitle).trim(),
    cachedLatestVideoId: (config?.cachedLatestVideoId || defaultYouTubeConfig.cachedLatestVideoId).trim(),
    cachedLatestVideoTitle: (config?.cachedLatestVideoTitle || defaultYouTubeConfig.cachedLatestVideoTitle).trim(),
    cachedLatestVideoDate: (config?.cachedLatestVideoDate || defaultYouTubeConfig.cachedLatestVideoDate).trim(),
  };
}

/**
 * Extracts a 11-character YouTube Video ID from any YouTube URL (watch, youtu.be, live, shorts, embed) or raw ID.
 */
export function extractYouTubeVideoId(input?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  return match && match[1] ? match[1] : null;
}

/**
 * Converts a YouTube Channel ID (starting with UC...) to its Uploads Playlist ID (starting with UU...)
 * so YouTube's native player can always play the latest uploaded video even without an API key.
 */
export function getUploadsPlaylistId(channelId: string): string | null {
  const clean = (channelId || '').trim();
  if (clean.startsWith('UC') && clean.length >= 20) {
    return 'UU' + clean.slice(2);
  }
  return null;
}

/**
 * Builds the embed URL for the latest video of the channel.
 */
export function getLatestVideoEmbedUrl(videoId?: string, channelId?: string): string {
  const cleanVid = extractYouTubeVideoId(videoId);
  if (cleanVid) {
    return `https://www.youtube.com/embed/${cleanVid}?rel=0&modestbranding=1`;
  }
  const uploadsListId = getUploadsPlaylistId(channelId || defaultYouTubeConfig.channelId);
  if (uploadsListId) {
    return `https://www.youtube.com/embed/videoseries?list=${uploadsListId}&rel=0&modestbranding=1`;
  }
  return `https://www.youtube.com/embed/${defaultYouTubeConfig.cachedLatestVideoId}?rel=0&modestbranding=1`;
}

/**
 * Builds the embed URL for the Live Stream of the channel.
 * Supports either a direct YouTube Live link/ID or automatic channel live_stream embed.
 */
export function getLiveStreamEmbedUrl(config: YouTubeConfig): string {
  const customLiveVideoId = extractYouTubeVideoId(config.liveStreamUrl);
  if (customLiveVideoId) {
    return `https://www.youtube.com/embed/${customLiveVideoId}?autoplay=1&rel=0&modestbranding=1`;
  }
  const channelId = config.channelId || defaultYouTubeConfig.channelId;
  return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}&autoplay=1&rel=0&modestbranding=1`;
}

/**
 * Fetches the latest published video from the YouTube channel's public RSS feed
 * using CORS-friendly endpoints (works on Cloudflare Pages and any static host).
 */
export async function fetchLatestYouTubeChannelVideo(
  channelId: string = defaultYouTubeConfig.channelId
): Promise<YouTubeVideoItem | null> {
  const cleanChannelId = (channelId || defaultYouTubeConfig.channelId).trim();
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(cleanChannelId)}`;

  // Method 1: rss2json public endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
        const latest = data.items[0];
        const vidId =
          extractYouTubeVideoId(latest.link) ||
          (typeof latest.guid === 'string' && latest.guid.includes(':')
            ? latest.guid.split(':').pop() || ''
            : '');

        if (vidId) {
          const pubDate = latest.pubDate ? latest.pubDate.split(' ')[0] : '';
          const title = latest.title || 'فيديو جديد من قناة قافلة القائم';
          return {
            videoId: vidId,
            title,
            publishedAt: pubDate,
            thumbnailUrl: latest.thumbnail || `https://i3.ytimg.com/vi/${vidId}/hqdefault.jpg`,
            videoUrl: `https://www.youtube.com/watch?v=${vidId}`,
            isLiveTitle: title.includes('مباشر') || title.toLowerCase().includes('live'),
          };
        }
      }
    }
  } catch {
    // Fallback to Method 2
  }

  // Method 2: AllOrigins raw XML parser
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const xmlText: string = json?.contents || '';
      if (xmlText && xmlText.includes('<entry>')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const firstEntry = xmlDoc.querySelector('entry');
        if (firstEntry) {
          const videoIdNode =
            firstEntry.getElementsByTagName('yt:videoId')[0] ||
            firstEntry.querySelector('videoId');
          const titleNode = firstEntry.querySelector('title');
          const publishedNode = firstEntry.querySelector('published');
          const vidId = videoIdNode?.textContent?.trim() || '';

          if (vidId) {
            const title = titleNode?.textContent?.trim() || 'فيديو قناة قافلة القائم';
            const publishedRaw = publishedNode?.textContent?.trim() || '';
            const publishedAt = publishedRaw ? publishedRaw.slice(0, 10) : '';
            return {
              videoId: vidId,
              title,
              publishedAt,
              thumbnailUrl: `https://i3.ytimg.com/vi/${vidId}/hqdefault.jpg`,
              videoUrl: `https://www.youtube.com/watch?v=${vidId}`,
              isLiveTitle: title.includes('مباشر') || title.toLowerCase().includes('live'),
            };
          }
        }
      }
    }
  } catch {
    // Ignore and return null so caller uses cached/fallback video
  }

  return null;
}
