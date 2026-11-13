import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Announcement, CloudinaryConfig } from '../types';

export const FONT_SIZE_OPTIONS: {
  value: NonNullable<Announcement['fontSize']>;
  label: string;
  shortLabel: string;
  className: string;
}[] = [
  { value: 'sm', label: 'صغير', shortLabel: 'A-', className: 'text-xs leading-relaxed' },
  { value: 'normal', label: 'عادي', shortLabel: 'A', className: 'text-sm leading-relaxed' },
  { value: 'lg', label: 'كبير', shortLabel: 'A+', className: 'text-base leading-relaxed' },
  { value: 'xl', label: 'كبير جداً', shortLabel: 'A++', className: 'text-lg leading-relaxed' },
  { value: '2xl', label: 'بارز / ضخم', shortLabel: 'A+++', className: 'text-xl sm:text-2xl leading-relaxed' },
];

export function getAnnouncementTypographyClasses(ann: Partial<Announcement>): string {
  const sizeObj = FONT_SIZE_OPTIONS.find((o) => o.value === (ann.fontSize || 'normal')) || FONT_SIZE_OPTIONS[1];
  const weightClass = ann.isBold ? 'font-bold' : 'font-normal';
  const alignClass =
    ann.textAlign === 'center' ? 'text-center' : ann.textAlign === 'justify' ? 'text-justify' : 'text-right';
  return `${sizeObj.className} ${weightClass} ${alignClass} whitespace-pre-line`;
}

// ============================================================================
// Hybrid Cloud Media URL System:
// 1. Supports Cloudinary CDN URLs (https://res.cloudinary.com/...)
// 2. Supports External Direct & YouTube URLs (https://...)
// 3. Supports Built-in Cloud Reference URIs (https://media.alqaem.cloud/VID-... & media://...)
//    so announcements store ONLY lightweight URL strings (0 KB binary payload in announcement docs)
// ============================================================================

const CHUNK_SIZE_CHARS = 600 * 1024;
const memoryMediaCache = new Map<string, string>();
const pendingResolutions = new Map<string, Promise<string>>();

export function extractCloudReferenceId(val?: string): string | null {
  if (!val || !val.trim()) return null;
  const clean = val.trim();
  if (clean.startsWith('media://')) {
    return clean.replace('media://', '').trim();
  }
  const cloudMatch = clean.match(/media\.alqaem\.cloud\/((?:IMG|VID)-\d+)/i);
  if (cloudMatch && cloudMatch[1]) {
    return cloudMatch[1].toUpperCase();
  }
  if (/^(IMG|VID)-\d+$/i.test(clean)) {
    return clean.toUpperCase();
  }
  return null;
}

export function extractMediaId(val?: string): string | null {
  if (!val || !val.trim()) return null;
  const refId = extractCloudReferenceId(val);
  if (refId) return refId;

  const clean = val.trim();
  if (clean.includes('cloudinary.com')) {
    const parts = clean.split('/');
    return parts[parts.length - 1] || 'Cloudinary CDN';
  }
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const parsed = new URL(clean);
      return parsed.hostname;
    } catch {
      return 'External URL';
    }
  }
  return null;
}

export function optimizeExternalMediaUrl(url?: string): string {
  if (!url || !url.trim()) return '';
  const clean = url.trim();
  if (clean.includes('res.cloudinary.com') && clean.includes('/upload/') && !clean.includes('/upload/f_auto')) {
    return clean.replace('/upload/', '/upload/f_auto,q_auto/');
  }
  return clean;
}

function getEffectiveCloudinaryConfig(customConfig?: CloudinaryConfig): CloudinaryConfig | null {
  const envCloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || '';
  const envUploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || '';

  const cloudName = (customConfig?.cloudName || envCloudName || '').trim();
  const uploadPreset = (customConfig?.uploadPreset || envUploadPreset || '').trim();

  if (cloudName && uploadPreset) {
    return { cloudName, uploadPreset };
  }
  return null;
}

function uploadViaXhr(
  endpoint: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const pct = Math.max(5, Math.min(95, Math.round((event.loaded / event.total) * 95)));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during cloud upload'));
    xhr.send(formData);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    parts.push(String.fromCharCode.apply(null, sub as unknown as number[]));
  }
  return btoa(parts.join(''));
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function compressImageBeforeUpload(file: File, maxDim = 1280, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                })
              );
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image or video and returns a clean HTTPS URL (`https://res.cloudinary.com/...`
 * when Cloudinary is configured, or `https://media.alqaem.cloud/VID-...` cloud reference URI).
 * The Announcement document in Firestore only stores this short URL string (0 KB media payload).
 */
export async function uploadMediaAsReference(
  file: File,
  kind: 'image' | 'video',
  onProgress?: (percent: number) => void,
  cloudinaryConfig?: CloudinaryConfig
): Promise<{
  refUrl: string;
  mediaId: string;
  provider: 'cloudinary' | 'external';
  originalSizeKb: number;
}> {
  if (onProgress) onProgress(5);

  const processedFile = kind === 'image' ? await compressImageBeforeUpload(file) : file;
  const effectiveCloudinary = getEffectiveCloudinaryConfig(cloudinaryConfig);

  // 1. If Cloudinary is configured, upload directly to Cloudinary CDN
  if (effectiveCloudinary) {
    try {
      const resourceType = kind === 'video' ? 'video' : 'image';
      const endpoint = `https://api.cloudinary.com/v1_1/${effectiveCloudinary.cloudName}/${resourceType}/upload`;
      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('upload_preset', effectiveCloudinary.uploadPreset);

      const response = await uploadViaXhr(endpoint, formData, onProgress);
      if (response && response.secure_url) {
        if (onProgress) onProgress(100);
        const finalUrl = optimizeExternalMediaUrl(String(response.secure_url));
        return {
          refUrl: finalUrl,
          mediaId: String(response.public_id || 'cloudinary'),
          provider: 'cloudinary',
          originalSizeKb: Math.max(1, Math.round(file.size / 1024)),
        };
      }
    } catch (cloudErr) {
      console.warn('Cloudinary upload fallback to built-in cloud media store:', cloudErr);
    }
  }

  // 2. Built-in Cloud Reference Store (works 100% reliably for both images and videos on AI Studio & Netlify)
  const prefix = kind === 'image' ? 'IMG' : 'VID';
  const numericCode = `${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
  const mediaId = `${prefix}-${numericCode}`;
  // Store as standard HTTPS URI so Announcement schema uses pure URI strings
  const refUrl = `https://media.alqaem.cloud/${mediaId}`;
  const mimeType = processedFile.type || (kind === 'image' ? 'image/jpeg' : 'video/mp4');

  const localObjUrl = URL.createObjectURL(processedFile);
  memoryMediaCache.set(mediaId, localObjUrl);

  if (onProgress) onProgress(15);

  const arrayBuffer = await processedFile.arrayBuffer();
  const fullBase64 = arrayBufferToBase64(arrayBuffer);

  const chunks: string[] = [];
  for (let i = 0; i < fullBase64.length; i += CHUNK_SIZE_CHARS) {
    chunks.push(fullBase64.slice(i, i + CHUNK_SIZE_CHARS));
  }

  if (onProgress) onProgress(25);

  const batchSize = 4;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const slice = chunks.slice(i, i + batchSize);
    await Promise.all(
      slice.map((chunkData, idx) => {
        const chunkIndex = i + idx;
        return setDoc(doc(db, 'settings', 'mediaStore', 'chunks', `${mediaId}_${chunkIndex}`), {
          mediaId,
          index: chunkIndex,
          data: chunkData,
        });
      })
    );
    if (onProgress) {
      const done = Math.min(chunks.length, i + batchSize);
      const pct = 25 + Math.round((done / Math.max(1, chunks.length)) * 70);
      onProgress(Math.min(95, pct));
    }
  }

  await setDoc(doc(db, 'settings', 'mediaStore', 'assets', mediaId), {
    mediaId,
    kind,
    mimeType,
    fileName: processedFile.name || `${mediaId}.${kind === 'image' ? 'jpg' : 'mp4'}`,
    sizeBytes: processedFile.size,
    chunkCount: chunks.length,
    createdAt: new Date().toISOString(),
  });

  if (onProgress) onProgress(100);

  return {
    refUrl,
    mediaId,
    provider: 'external',
    originalSizeKb: Math.max(1, Math.round(file.size / 1024)),
  };
}

/**
 * Resolves any media URL:
 * - Standard external/Cloudinary URLs (`https://res.cloudinary.com/...`, `https://...`) -> returned directly
 * - Temporary `tmpfiles.org` URLs -> resolved to signed direct stream URL
 * - Cloud Reference URIs (`https://media.alqaem.cloud/VID-...` or `media://VID-...`) -> resolved from cloud store
 */
export async function resolveMediaReferenceUrl(urlOrRef?: string): Promise<string> {
  if (!urlOrRef || !urlOrRef.trim()) return '';
  const clean = urlOrRef.trim();

  // Check if it's a tmpfiles.org link that needs signed token resolution
  if (clean.includes('tmpfiles.org/')) {
    const cachedTmp = memoryMediaCache.get(clean);
    if (cachedTmp) return cachedTmp;
    try {
      const resp = await fetch(`/api/media/resolve-external?url=${encodeURIComponent(clean)}`);
      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && contentType.includes('application/json')) {
        const data = await resp.json();
        if (data?.resolvedUrl) {
          memoryMediaCache.set(clean, data.resolvedUrl);
          return data.resolvedUrl;
        }
      }
    } catch {
      // Fallback if on static host (e.g. Cloudflare Pages)
    }
    return clean.replace('http://', 'https://');
  }

  const mediaId = extractCloudReferenceId(clean);
  if (!mediaId) {
    return optimizeExternalMediaUrl(clean);
  }

  const mem = memoryMediaCache.get(mediaId);
  if (mem) return mem;

  const inflight = pendingResolutions.get(mediaId);
  if (inflight) return inflight;

  const task = (async () => {
    try {
      const assetSnap = await getDoc(doc(db, 'settings', 'mediaStore', 'assets', mediaId));
      if (!assetSnap.exists()) {
        return '';
      }
      const meta = assetSnap.data() as {
        mimeType?: string;
        chunkCount?: number;
      };
      const chunkCount = Number(meta.chunkCount || 0);
      if (chunkCount <= 0) return '';

      const chunkIndices = Array.from({ length: chunkCount }, (_, i) => i);
      const chunkParts: string[] = new Array(chunkCount).fill('');

      const batchSize = 6;
      for (let i = 0; i < chunkIndices.length; i += batchSize) {
        const batch = chunkIndices.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (idx) => {
            const cSnap = await getDoc(doc(db, 'settings', 'mediaStore', 'chunks', `${mediaId}_${idx}`));
            if (cSnap.exists()) {
              chunkParts[idx] = String(cSnap.data()?.data || '');
            }
          })
        );
      }

      const fullBase64 = chunkParts.join('');
      if (!fullBase64) return '';

      const bytes = base64ToUint8Array(fullBase64);
      const mimeType = meta.mimeType || (mediaId.startsWith('IMG') ? 'image/jpeg' : 'video/mp4');
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });

      const objUrl = URL.createObjectURL(blob);
      memoryMediaCache.set(mediaId, objUrl);
      return objUrl;
    } catch (err) {
      console.warn('Error resolving cloud media reference:', mediaId, err);
      return '';
    } finally {
      pendingResolutions.delete(mediaId);
    }
  })();

  pendingResolutions.set(mediaId, task);
  return task;
}

export function useResolvedMediaUrl(urlOrRef?: string): {
  resolvedUrl: string;
  isLoading: boolean;
  mediaId: string | null;
} {
  const cloudRefId = extractCloudReferenceId(urlOrRef);
  const isTmpFiles = Boolean(urlOrRef && urlOrRef.includes('tmpfiles.org/'));
  const needsAsyncResolve = Boolean(cloudRefId || isTmpFiles);

  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    if (!urlOrRef || !urlOrRef.trim()) return '';
    if (cloudRefId) return memoryMediaCache.get(cloudRefId) || '';
    if (isTmpFiles) return memoryMediaCache.get(urlOrRef.trim()) || '';
    return optimizeExternalMediaUrl(urlOrRef);
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!urlOrRef || !needsAsyncResolve) return false;
    const key = cloudRefId || urlOrRef.trim();
    return !memoryMediaCache.has(key);
  });

  useEffect(() => {
    let active = true;
    if (!urlOrRef || !urlOrRef.trim()) {
      setResolvedUrl('');
      setIsLoading(false);
      return;
    }

    const refId = extractCloudReferenceId(urlOrRef);
    const tmp = urlOrRef.includes('tmpfiles.org/');

    if (!refId && !tmp) {
      setResolvedUrl(optimizeExternalMediaUrl(urlOrRef));
      setIsLoading(false);
      return;
    }

    const cacheKey = refId || urlOrRef.trim();
    const cached = memoryMediaCache.get(cacheKey);
    if (cached) {
      setResolvedUrl(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    resolveMediaReferenceUrl(urlOrRef).then((res) => {
      if (!active) return;
      setResolvedUrl(res);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [urlOrRef]);

  return {
    resolvedUrl,
    isLoading,
    mediaId: extractMediaId(urlOrRef),
  };
}

export function getEmbeddedVideoInfo(url?: string): {
  type: 'youtube' | 'direct' | 'none';
  src: string;
} {
  if (!url || !url.trim()) {
    return { type: 'none', src: '' };
  }
  const clean = url.trim();

  const ytMatch =
    clean.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/) ||
    clean.match(/[?&]v=([A-Za-z0-9_-]{6,})/);

  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      src: `https://www.youtube.com/embed/${ytMatch[1]}`,
    };
  }

  return {
    type: 'direct',
    src: clean,
  };
}

export async function compressAnnouncementImage(
  file: File,
  onProgress?: (percent: number) => void,
  cloudinaryConfig?: CloudinaryConfig
): Promise<{ dataUrl: string; mediaId: string; sizeKb: number }> {
  const { refUrl, mediaId } = await uploadMediaAsReference(file, 'image', onProgress, cloudinaryConfig);
  return { dataUrl: refUrl, mediaId, sizeKb: 0 };
}
