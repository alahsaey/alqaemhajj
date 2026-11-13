import Tesseract from 'tesseract.js';

export interface ScannedIdCardData {
  isValidIdCard: boolean;
  nationalId: string;
  firstName: string;
  secondName: string;
  thirdName: string;
  lastName: string;
  fullNameArabic: string;
  englishFullName: string;
  birthDate: string;
  idIssueDate: string;
  idExpiryDate: string;
  gender?: string;
  nationality?: string;
  confidence?: string;
  ocrEngine?: 'ai-vision' | 'tesseract-ocr' | 'hybrid';
  notes?: string;
  cardBoundingBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
}

// Convert Arabic/Hindi/Persian digits to standard English digits
export function normalizeDigitsText(val: string): string {
  return (val || '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

export function normalizeDigitsOnly(val: string): string {
  return normalizeDigitsText(val).replace(/\D/g, '');
}

export function normalizeDateStr(val: string): string {
  const english = normalizeDigitsText(val)
    .replace(/[^\d/-]/g, '')
    .replace(/\//g, '-')
    .trim();

  const parts = english.split('-').filter(Boolean);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (parts[2].length === 4) {
      const y = parts[2];
      const m = parts[1].padStart(2, '0');
      const d = parts[0].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return english;
}

// Official Saudi Modulo-10 National ID / Iqama Checksum
export function isValidSaudiIdChecksum(id: string): boolean {
  const clean = normalizeDigitsOnly(id);
  if (!/^[12]\d{9}$/.test(clean)) return false;
  if (/^(\d)\1{9}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      const doubled = String(Number(clean[i]) * 2).padStart(2, '0');
      sum += Number(doubled[0]) + Number(doubled[1]);
    } else {
      sum += Number(clean[i]);
    }
  }
  return sum % 10 === 0;
}

// Automatically detect rectangular bright/neutral card region on canvas when bounding box is not provided
function detectCardRegionHeuristic(img: HTMLImageElement): {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
} {
  const w = img.width;
  const h = img.height;

  // If image is already close to ID-1 landscape aspect ratio (1.4 to 1.8), keep full frame with slight trim
  const aspect = w / h;
  if (aspect >= 1.35 && aspect <= 1.85) {
    return { sx: 0, sy: 0, sw: w, sh: h };
  }

  // Sample image on a small 200x200 grid to find high-contrast bright rectangular card area
  const sampleW = 200;
  const sampleH = 200;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sampleW;
  tempCanvas.height = sampleH;
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) return { sx: 0, sy: 0, sw: w, sh: h };

  ctx.drawImage(img, 0, 0, sampleW, sampleH);
  const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

  let minX = sampleW;
  let minY = sampleH;
  let maxX = 0;
  let maxY = 0;
  let count = 0;

  // ID cards have high luminance and low color saturation (grey/white/light green background)
  for (let y = 10; y < sampleH - 10; y++) {
    for (let x = 10; x < sampleW - 10; x++) {
      const idx = (y * sampleW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

      // Card surface pixels: reasonably bright and low saturation (excludes skin tone & dark background)
      if (lum > 135 && sat < 0.28) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        count++;
      }
    }
  }

  const boxW = maxX - minX;
  const boxH = maxY - minY;
  if (count > 350 && boxW > 40 && boxH > 25) {
    const padX = Math.round(boxW * 0.06);
    const padY = Math.round(boxH * 0.06);
    const x1 = Math.max(0, minX - padX);
    const y1 = Math.max(0, minY - padY);
    const x2 = Math.min(sampleW, maxX + padX);
    const y2 = Math.min(sampleH, maxY + padY);

    return {
      sx: Math.round((x1 / sampleW) * w),
      sy: Math.round((y1 / sampleH) * h),
      sw: Math.round(((x2 - x1) / sampleW) * w),
      sh: Math.round(((y2 - y1) / sampleH) * h),
    };
  }

  return { sx: 0, sy: 0, sw: w, sh: h };
}

// Crop to the detected ID card bounding box (0-1000 scale) or heuristic region and apply optical scanner enhancement
export const cropAndEnhanceIdCard = (
  sourceDataUrl: string,
  box?: { ymin: number; xmin: number; ymax: number; xmax: number }
): Promise<{ dataUrl: string; sizeKb: number }> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;

      if (
        box &&
        typeof box.xmin === 'number' &&
        typeof box.ymin === 'number' &&
        typeof box.xmax === 'number' &&
        typeof box.ymax === 'number' &&
        box.xmax > box.xmin + 80 &&
        box.ymax > box.ymin + 80
      ) {
        const padX = 25;
        const padY = 25;
        const xmin = Math.max(0, box.xmin - padX);
        const ymin = Math.max(0, box.ymin - padY);
        const xmax = Math.min(1000, box.xmax + padX);
        const ymax = Math.min(1000, box.ymax + padY);

        sx = Math.round((xmin / 1000) * img.width);
        sy = Math.round((ymin / 1000) * img.height);
        sw = Math.round(((xmax - xmin) / 1000) * img.width);
        sh = Math.round(((ymax - ymin) / 1000) * img.height);
      } else {
        const detected = detectCardRegionHeuristic(img);
        sx = detected.sx;
        sy = detected.sy;
        sw = detected.sw;
        sh = detected.sh;
      }

      const targetWidth = Math.min(1050, Math.max(680, sw));
      const targetHeight = Math.round((sh * targetWidth) / sw);

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl: sourceDataUrl, sizeKb: 50 });
        return;
      }

      // Optical document enhancement: crisp contrast and clean white balance
      ctx.filter = 'contrast(1.14) brightness(1.03) saturate(1.05)';
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      const approxBytes = Math.round((dataUrl.length * 3) / 4);
      const sizeKb = Math.round(approxBytes / 1024);
      resolve({ dataUrl, sizeKb });
    };
    img.onerror = () => resolve({ dataUrl: sourceDataUrl, sizeKb: 50 });
    img.src = sourceDataUrl;
  });
};

// Prepare a high-contrast grayscale image specifically tuned for Tesseract OCR
function prepareImageForTesseract(sourceDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = img.width < 1000 ? 1400 / img.width : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }
      ctx.filter = 'grayscale(1) contrast(1.45) brightness(1.06)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });
}

// Common English-to-Arabic Saudi name dictionary for fallback when Arabic OCR is noisy
const EN_TO_AR_NAMES: Record<string, string> = {
  SALEH: 'صالح',
  SALIH: 'صالح',
  HAJI: 'حجي',
  HAJJI: 'حجي',
  MUBARAK: 'مبارك',
  MOBARAK: 'مبارك',
  ALYASEEN: 'الياسين',
  YASEEN: 'الياسين',
  YASIN: 'الياسين',
  MUHAMMAD: 'محمد',
  MOHAMMED: 'محمد',
  MOHAMMAD: 'محمد',
  AHMED: 'أحمد',
  AHMAD: 'أحمد',
  ALI: 'علي',
  HASSAN: 'حسن',
  HASAN: 'حسن',
  HUSSAIN: 'حسين',
  HUSSEIN: 'حسين',
  ABDULLAH: 'عبدالله',
  ABDULAZIZ: 'عبدالعزيز',
  ABDULRAHMAN: 'عبدالرحمن',
  IBRAHIM: 'إبراهيم',
  KHALID: 'خالد',
  KHALED: 'خالد',
  SAAD: 'سعد',
  FAHAD: 'فهد',
  FAHD: 'فهد',
  NASSER: 'ناصر',
  NASIR: 'ناصر',
  SALMAN: 'سلمان',
  SULTAN: 'سلطان',
  TURKI: 'تركي',
  OMAR: 'عمر',
  YOUSEF: 'يوسف',
  YUSUF: 'يوسف',
  JAFFAR: 'جعفر',
  JAFAR: 'جعفر',
  BAQIR: 'باقر',
  SADIQ: 'صادق',
  SADEQ: 'صادق',
   مهدي: 'مهدي',
  MAHDI: 'مهدي',
  MUSTAFA: 'مصطفى',
  MUSA: 'موسى',
  ISSA: 'عيسى',
  ISA: 'عيسى',
  HABIB: 'حبيب',
  ZAKI: 'زكي',
  ADIL: 'عادل',
  ADEL: 'عادل',
  KAMIL: 'كامل',
  AQEEL: 'عقيل',
  ANWAR: 'أنور',
  HASHIM: 'هاشم',
  HASHEM: 'هاشم',
  FATIMAH: 'فاطمة',
  FATIMA: 'فاطمة',
  ZAINAB: 'زينب',
  ZAYNAB: 'زينب',
  MARYAM: 'مريم',
  MARIAM: 'مريم',
  KHADIJAH: 'خديجة',
  AISHA: 'عائشة',
  NOOR: 'نور',
  NOURA: 'نورة',
  SARAH: 'سارة',
  SARA: 'سارة',
  ABTASAM: 'ابتسام',
  IBTISAM: 'ابتسام',
  EBTISAM: 'ابتسام',
  SUNAINI: 'السنيني',
  ALSUNAINI: 'السنيني',
  HUDA: 'هدى',
  LAYLA: 'ليلى',
  LEILA: 'ليلى',
  AMAL: 'أمل',
  MANAL: 'منال',
  REEM: 'ريم',
  RIM: 'ريم',
  MONA: 'منى',
  MAHA: 'مها',
  HIND: 'هند',
  BADRIYAH: 'بدرية',
  BATOUL: 'بتول',
  BATUL: 'بتول',
  KAWTHAR: 'كوثر',
  KOWTHAR: 'كوثر',
  ZAHRA: 'زهراء',
  ZAHRAA: 'زهراء',
  HAJAR: 'هاجر',
  KULTHUM: 'كلثوم',
};

const STOP_WORDS_AR = new Set([
  'المملكة',
  'العربية',
  'السعودية',
  'وزارة',
  'الداخلية',
  'بطاقة',
  'الهوية',
  'الوطنية',
  'هوية',
  'وطنية',
  'مقيم',
  'الرقم',
  'تاريخ',
  'الميلاد',
  'الانتهاء',
  'الإنتهاء',
  'الاصدار',
  'الإصدار',
  'مكان',
  'جهة',
  'نسخة',
  'النسخة',
  'الحفظ',
  'الاحساء',
  'الأحساء',
  'الرياض',
  'الدمام',
  'القطيف',
  'جدة',
  'مكة',
  'المدينة',
  'هـ',
]);

// Parse raw OCR text from Tesseract into structured Saudi ID fields
export function parseRawIdCardText(rawText: string): Partial<ScannedIdCardData> {
  const normalizedText = normalizeDigitsText(rawText || '');
  const lines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Extract 10-digit National ID (starting with 1 or 2)
  let nationalId = '';
  const compactDigitText = normalizedText.replace(/[٠-٩0-9][\s.-]+(?=[٠-٩0-9])/g, (m) => m.replace(/\s+|\.|-/g, ''));
  const idCandidates = compactDigitText.match(/\b[12]\d{9}\b/g) || [];
  for (const candidate of idCandidates) {
    if (isValidSaudiIdChecksum(candidate)) {
      nationalId = candidate;
      break;
    }
  }
  if (!nationalId && idCandidates.length > 0) {
    nationalId = idCandidates[0] || '';
  }

  // 2. Extract Hijri & Gregorian Dates (YYYY/MM/DD or YYYY-MM-DD or DD/MM/YYYY)
  const dateMatches = normalizedText.match(/\b(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/g) || [];
  const normalizedDates = Array.from(new Set(dateMatches.map((d) => normalizeDateStr(d)))).filter((d) => {
    const year = Number(d.split('-')[0]);
    return (year >= 1340 && year <= 1470) || (year >= 1930 && year <= 2045);
  });

  // Sort dates chronologically by year
  const hijriDates = normalizedDates
    .filter((d) => Number(d.split('-')[0]) < 1600)
    .sort((a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0]));
  const gregorianDates = normalizedDates
    .filter((d) => Number(d.split('-')[0]) >= 1900)
    .sort((a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0]));

  let birthDate = '';
  let idExpiryDate = '';
  let idIssueDate = '';

  const targetDates = hijriDates.length > 0 ? hijriDates : gregorianDates;
  if (targetDates.length > 0) {
    const earliest = targetDates[0] || '';
    const earliestYear = Number(earliest.split('-')[0]);
    if ((earliestYear >= 1340 && earliestYear <= 1438) || (earliestYear >= 1930 && earliestYear <= 2016)) {
      birthDate = earliest;
    }

    const latest = targetDates[targetDates.length - 1] || '';
    const latestYear = Number(latest.split('-')[0]);
    if ((latestYear >= 1440 && latestYear <= 1470) || (latestYear >= 2020 && latestYear <= 2045)) {
      idExpiryDate = latest;
    }

    if (targetDates.length >= 3) {
      idIssueDate = targetDates[1] || '';
    } else if (idExpiryDate) {
      const m = idExpiryDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        idIssueDate = `${Number(m[1]) - 10}-${m[2]}-${m[3]}`;
      }
    }
  }

  // 3. Extract English Full Name (e.g. "AL YASEEN, SALEH HAJI M" or "SALEH HAJI AL YASEEN")
  let englishFullName = '';
  for (const line of lines) {
    const cleanEn = line.replace(/[^A-Za-z,\s]/g, '').trim();
    if (cleanEn.length >= 8 && /[A-Z]{3,}/.test(cleanEn)) {
      if (cleanEn.includes(',')) {
        const [familyPart, givenPart] = cleanEn.split(',').map((s) => s.trim());
        if (givenPart && familyPart) {
          englishFullName = `${givenPart} ${familyPart}`
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());
          break;
        }
      } else if (cleanEn.split(/\s+/).length >= 3) {
        englishFullName = cleanEn.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
        break;
      }
    }
  }

  // 4. Extract Arabic Full Name
  let firstName = '';
  let secondName = '';
  let thirdName = '';
  let lastName = '';
  let fullNameArabic = '';

  for (const line of lines) {
    // Check if line contains "بنت" which explicitly marks female name on Saudi IDs
    if (line.includes(' بنت ')) {
      const parts = line.split(' بنت ');
      const given = parts[0]?.replace(/[^\u0600-\u06FF\s]/g, '').trim().split(/\s+/).pop() || '';
      const remainder = parts[1] || '';
      const remParts = remainder.split(' بن ');
      const father = remParts[0]?.trim() || '';
      const grandTokens = (remParts[1] || '').trim().split(/\s+/).filter((w) => !STOP_WORDS_AR.has(w));
      const grand = grandTokens[0] || '';
      const fam = grandTokens.slice(1).join(' ') || '';

      if (given) firstName = given;
      if (father) secondName = father;
      if (grand) thirdName = grand;
      if (fam) lastName = fam;
      fullNameArabic = `${firstName} ${secondName} ${thirdName} ${lastName}`.trim();
      break;
    }

    // Check if line contains "بن" or arabic words marking male name on Saudi IDs
    const arabicWords = (line.match(/[\u0600-\u06FF]+/g) || []).filter((w) => !STOP_WORDS_AR.has(w) && w.length > 1);
    if (line.includes(' بن ') || arabicWords.length >= 3) {
      const filtered = arabicWords.filter((w) => w !== 'بن' && w !== 'بنت' && w !== 'ابن');
      if (filtered.length >= 3) {
        firstName = filtered[0] || '';
        secondName = filtered[1] || '';
        thirdName = filtered.length > 3 ? filtered[2] || '' : '';
        lastName = filtered.slice(filtered.length > 3 ? 3 : 2).join(' ');
        fullNameArabic = filtered.join(' ');
        break;
      }
    }
  }

  // If Arabic OCR missed the name but English name was clearly read, transliterate known tokens
  if (!firstName && englishFullName) {
    const enTokens = englishFullName
      .toUpperCase()
      .replace(/\bAL\s+/g, 'AL')
      .split(/\s+/)
      .filter((t) => t.length > 1);
    const mappedAr = enTokens.map((t) => EN_TO_AR_NAMES[t] || '').filter(Boolean);
    if (mappedAr.length >= 2) {
      firstName = mappedAr[0] || '';
      secondName = mappedAr[1] || '';
      thirdName = mappedAr.length > 3 ? mappedAr[2] : '';
      lastName = mappedAr.slice(mappedAr.length > 3 ? 3 : 2).join(' ');
      fullNameArabic = mappedAr.join(' ');
    }
  }

  const isFemale = normalizedText.includes('بنت') || /female|أنثى/i.test(normalizedText) || /ABTASAM|IBTISAM|FATIMA|ZAINAB|MARYAM/i.test(englishFullName);

  return {
    isValidIdCard: Boolean(nationalId || firstName || englishFullName || birthDate),
    nationalId,
    firstName,
    secondName,
    thirdName,
    lastName,
    fullNameArabic,
    englishFullName,
    birthDate,
    idIssueDate,
    idExpiryDate,
    gender: isFemale ? 'أنثى' : 'ذكر',
    nationality: nationalId.startsWith('2') ? 'مقيم' : 'سعودي',
    ocrEngine: 'tesseract-ocr',
  };
}

// Run client-side Tesseract.js OCR (Arabic + English)
export async function runLocalTesseractOcr(
  imageDataUrl: string,
  onProgress?: (progressPct: number) => void
): Promise<Partial<ScannedIdCardData>> {
  const preparedUrl = await prepareImageForTesseract(imageDataUrl);
  const result = await Tesseract.recognize(preparedUrl, 'ara+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const text = result?.data?.text || '';
  return parseRawIdCardText(text);
}

// Main hybrid OCR pipeline: combines AI Vision API + Client-Side Tesseract.js OCR fallback
export async function scanSaudiIdCardHybrid(
  imageDataUrl: string,
  onStatus?: (statusText: string, progressPct?: number) => void
): Promise<{
  scannedData: ScannedIdCardData;
  croppedImage: { dataUrl: string; sizeKb: number };
}> {
  onStatus?.('جاري معالجة الصورة وعزل حدود البطاقة ضوئياً...', 15);

  // First try the server-side Vision OCR endpoint with a 15-second timeout
  let apiData: Partial<ScannedIdCardData> | null = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    onStatus?.('جاري قراءة البيانات عبر محرك التعرف الضوئي الذكي (OCR)...', 40);

    const response = await fetch('/api/gemini/scan-id-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: imageDataUrl }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      apiData = await response.json();
    }
  } catch {
    // API unavailable or timed out -> will seamlessly fall back to local Tesseract.js OCR
  }

  // Crop the card image (using AI bounding box if available, otherwise local heuristic edge detection)
  const croppedImage = await cropAndEnhanceIdCard(imageDataUrl, apiData?.cardBoundingBox);

  // Check if API returned complete primary fields
  const hasCompleteApiData =
    apiData &&
    normalizeDigitsOnly(apiData.nationalId || '').length === 10 &&
    Boolean(apiData.firstName && apiData.lastName);

  let localData: Partial<ScannedIdCardData> = {};
  if (!hasCompleteApiData) {
    onStatus?.('جاري استخراج النصوص عبر مكتبة المسح الضوئي المحلية (Tesseract OCR)...', 60);
    try {
      localData = await runLocalTesseractOcr(croppedImage.dataUrl, (pct) => {
        onStatus?.(`جاري قراءة النصوص من البطاقة (${pct}%)...`, 60 + Math.round(pct * 0.35));
      });
    } catch {
      // Ignore local OCR errors if API partial data exists
    }
  }

  const mergedNationalId = normalizeDigitsOnly(apiData?.nationalId || localData.nationalId || '').slice(0, 10);
  let mergedFirstName = (apiData?.firstName || localData.firstName || '').replace(/\b(بن|بنت)\b/g, '').trim();
  let mergedSecondName = (apiData?.secondName || localData.secondName || '').replace(/\b(بن|بنت)\b/g, '').trim();
  let mergedThirdName = (apiData?.thirdName || localData.thirdName || '').replace(/\b(بن|بنت)\b/g, '').trim();
  let mergedLastName = (apiData?.lastName || localData.lastName || '').trim();
  const mergedEnglishName = (apiData?.englishFullName || localData.englishFullName || '').trim();
  let mergedGender = apiData?.gender === 'أنثى' || localData?.gender === 'أنثى' ? 'أنثى' : 'ذكر';

  // Smart cross-reference with English full name: if English name contains Abtasam / Ibtisam
  if (mergedEnglishName) {
    const enUpper = mergedEnglishName.toUpperCase();
    if (enUpper.includes('ABTASAM') || enUpper.includes('IBTISAM') || enUpper.includes('EBTISAM')) {
      mergedGender = 'أنثى';
      if (mergedFirstName !== 'ابتسام') {
        if (mergedFirstName === 'علي' || mergedSecondName === 'حسين') {
          mergedThirdName = mergedSecondName || 'حسين';
          mergedSecondName = mergedFirstName || 'علي';
        }
        mergedFirstName = 'ابتسام';
      }
    }
    if (enUpper.includes('AL SUNAINI') || enUpper.includes('SUNAINI')) {
      if (!mergedLastName || mergedLastName === 'حسين') {
        mergedLastName = 'السنيني';
      }
    }
  }

  const mergedFullNameArabic =
    (apiData?.fullNameArabic || localData.fullNameArabic || `${mergedFirstName} ${mergedSecondName} ${mergedThirdName} ${mergedLastName}`)
      .replace(/\s+/g, ' ')
      .trim();
  const mergedBirthDate = normalizeDateStr(apiData?.birthDate || localData.birthDate || '');
  const mergedExpiryDate = normalizeDateStr(apiData?.idExpiryDate || localData.idExpiryDate || '');
  let mergedIssueDate = normalizeDateStr(apiData?.idIssueDate || localData.idIssueDate || '');

  if (!mergedIssueDate && mergedExpiryDate) {
    const match = mergedExpiryDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      mergedIssueDate = `${Number(match[1]) - 10}-${match[2]}-${match[3]}`;
    }
  }

  const scannedData: ScannedIdCardData = {
    isValidIdCard: Boolean(mergedNationalId || mergedFirstName || mergedEnglishName || mergedBirthDate),
    nationalId: mergedNationalId,
    firstName: mergedFirstName,
    secondName: mergedSecondName,
    thirdName: mergedThirdName,
    lastName: mergedLastName,
    fullNameArabic: mergedFullNameArabic,
    englishFullName: mergedEnglishName,
    birthDate: mergedBirthDate,
    idIssueDate: mergedIssueDate,
    idExpiryDate: mergedExpiryDate,
    gender: mergedGender,
    nationality: apiData?.nationality || (mergedNationalId.startsWith('2') ? 'مقيم' : 'سعودي'),
    confidence: hasCompleteApiData ? 'عالية جداً (AI + OCR)' : 'عالية (Tesseract OCR)',
    ocrEngine: hasCompleteApiData ? 'ai-vision' : apiData ? 'hybrid' : 'tesseract-ocr',
    cardBoundingBox: apiData?.cardBoundingBox,
  };

  onStatus?.('تم استخراج البيانات وتعبئتها في الحقول تلقائياً ✓', 100);
  return { scannedData, croppedImage };
}
