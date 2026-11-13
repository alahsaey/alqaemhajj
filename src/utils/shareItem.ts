import { Announcement, HajjPackage } from '../types';

export function buildDirectShareUrl(params: { announcementId?: string; packageId?: string }): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('announcement');
  url.searchParams.delete('package');

  if (params.announcementId) {
    url.searchParams.set('announcement', params.announcementId);
  }
  if (params.packageId) {
    url.searchParams.set('package', params.packageId);
  }
  return url.toString();
}

export async function shareAnnouncementItem(ann: Announcement): Promise<'shared' | 'copied' | 'cancelled'> {
  const shareUrl = buildDirectShareUrl({ announcementId: ann.id });
  const shareTitle = `قافلة القائم | ${ann.title}`;
  const shareText = `📢 ${ann.title} (${ann.category})\n\n${ann.content}\n\n🔗 رابط الموضوع المباشر:`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('cancel')) {
        return 'cancelled';
      }
    }
  }

  try {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}

export async function sharePackageItem(pkg: HajjPackage): Promise<'shared' | 'copied' | 'cancelled'> {
  const shareUrl = buildDirectShareUrl({ packageId: pkg.id });
  const shareTitle = `قافلة القائم | ${pkg.title}`;
  const shareText =
    `🕋 ${pkg.title} (${pkg.type})\n` +
    `💰 السعر: ${pkg.price}\n` +
    `🚌 المواصلات: ${pkg.transport}\n` +
    `🏨 سكن مكة: ${pkg.accommodationMakkah}\n` +
    `🏨 سكن المدينة: ${pkg.accommodationMadinah}\n\n` +
    `🔗 استعراض وحجز الباقة مباشرة:`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('cancel')) {
        return 'cancelled';
      }
    }
  }

  try {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}

export function clearDirectShareParamsFromUrl(): void {
  const url = new URL(window.location.href);
  if (url.searchParams.has('announcement') || url.searchParams.has('package')) {
    url.searchParams.delete('announcement');
    url.searchParams.delete('package');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
}
