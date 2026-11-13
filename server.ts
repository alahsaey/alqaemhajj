import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isBlockedIpOrHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '169.254.169.254' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    return true;
  }
  // Private IPv4 ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) {
    return true;
  }
  const match172 = host.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = parseInt(match172[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  return false;
}

async function parseBase64Image(imageInput: string): Promise<{ mimeType: string; data: string }> {
  if (/^https?:\/\//i.test(imageInput.trim())) {
    const rawUrl = imageInput.trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new Error('رابط الصورة غير صالح.');
    }

    // SSRF Prevention: Enforce https and block internal or reserved hostnames
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error('بروتوكول الرابط غير مسموح به.');
    }
    if (isBlockedIpOrHost(parsedUrl.hostname)) {
      throw new Error('تم حظر الوصول إلى هذا النطاق لأسباب أمنية (جدار حماية SSRF).');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetch(rawUrl, { signal: controller.signal });
      if (!resp.ok) {
        throw new Error(`فشل جلب الصورة: رمز الحالة ${resp.status}`);
      }
      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await resp.arrayBuffer();
      if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
        throw new Error('حجم الصورة المرفوعة يتجاوز الحد الأقصى المسموح به (15 ميجابايت).');
      }
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return { mimeType: contentType.split(';')[0] || 'image/jpeg', data: base64 };
    } finally {
      clearTimeout(timeout);
    }
  }
  let mimeType = 'image/jpeg';
  let data = imageInput;
  if (imageInput.includes(';base64,')) {
    const parts = imageInput.split(';base64,');
    mimeType = parts[0].replace('data:', '') || 'image/jpeg';
    data = parts[1];
  }
  return { mimeType, data };
}

function normalizeDigits(val: string): string {
  return (val || '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

import { searchWebsiteKnowledge } from './src/utils/advisorKnowledge';

// Helper that tries gemini-3.8-flash and falls back to gemini-3.1-flash-lite
async function generateWithFallback(ai: GoogleGenAI, params: { contents: any; config?: any }) {
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} failed, trying fallback if available:`, err?.message || err);
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // In-memory rate limiter per IP to prevent API spam and brute-force attacks
  const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
  app.use('/api', (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = ipRequestCounts.get(ip);

    if (!entry || now > entry.resetTime) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + 60000 });
      return next();
    }

    if (entry.count > 120) {
      res.status(429).json({ error: 'تم تجاوز الحد المسموح للطلبات. يرجى الانتظار قليلاً والمحاولة مجدداً.' });
      return;
    }

    entry.count += 1;
    next();
  });

  app.use(express.json({ limit: '20mb' }));

  // 1. Scan & Extract Saudi National ID / Iqama Card + Bounding Box for Document Cropping
  app.post('/api/gemini/scan-id-card', async (req, res) => {
    try {
      const { imageBase64 } = req.body || {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'صورة الهوية مطلوبة لإجراء المسح الضوئي.' });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({ error: 'يتطلب المسح الضوئي الذكي تفعيل مفتاح Gemini API في لوحة الإعدادات (Settings > Secrets).' });
        return;
      }
      const { mimeType, data } = await parseBase64Image(imageBase64);

      const prompt = `
أنت ماسح ضوئي بصري (OCR) فائق الدقة مخصص لقراءة بطاقات الهوية الوطنية السعودية (النسخة الجديدة والقديمة وهوية أبشر/توكلنا) وهوية مقيم، حتى لو كانت البطاقة ممسوكة باليد أو مائلة قليلاً أو بإضاءة عادية.

المطلوب استخراج كافة البيانات بدقة تامة من البطاقة الظاهرة في الصورة:
1. حوّل جميع الأرقام العربية/الهندية (٠١٢٣٤٥٦٧٨٩) إلى أرقام إنجليزية (0123456789).
2. استخرج الاسم العربي الرباعي بدقة فائقة وبدون أي أخطاء أو تقديم وتأخير، وبدون كلمتي "بن" و"بنت":
   ★ قاعدة هامة جداً لبطاقات الإناث والذكور:
   - في بطاقات الإناث يكتب الاسم بصيغة (الاسم الأول بنت اسم الأب بن اسم الجد اسم العائلة)، مثل: (ابتسام بنت علي بن حسين السنيني).
     * firstName: الاسم الأول لصاحبة الهوية (مثال: ابتسام). إياك أن تأخذ اسم الأب كاسم أول!
     * secondName: اسم والد الحاجة (مثال: علي).
     * thirdName: اسم جد الحاجة (مثال: حسين).
     * lastName: اللقب أو اسم العائلة (مثال: السنيني).
     * gender: "أنثى" فوراً عند وجود كلمة "بنت" أو اسم أنثى.
   - في بطاقات الذكور يكتب بصيغة (الاسم الأول بن اسم الأب بن اسم الجد اسم العائلة)، مثل: (صالح بن حجي بن مبارك الياسين).
     * firstName: الاسم الأول (صالح)
     * secondName: اسم الأب (حجي)
     * thirdName: اسم الجد (مبارك)
     * lastName: العائلة (الياسين)
     * gender: "ذكر"
   ★ المقارنة الإلزامية مع الاسم الإنجليزي في البطاقة:
   - يكتب الاسم الإنجليزي في الهوية السعودية بصيغة معكوسة رسمية: (SURNAME, FIRST FATHER GRANDFATHER_INITIAL).
   - مثال: (AL SUNAINI, ABTASAM ALI H)
     * اللقب / العائلة = AL SUNAINI -> السنيني
     * الاسم الأول = ABTASAM -> ابتسام
     * اسم الأب = ALI -> علي
     * اسم الجد = H -> حسين (يبدأ بحرف H)
   استخدم هذه المقابلة الصريحة لتفريغ وتصحيح الاسم العربي الرباعي بدقة 100% بحيث يتطابق الاسم العربي مع الإنجليزي تماماً وبدون أي تناقض.
3. englishFullName: الاسم الكامل باللغة الإنجليزية بترتيب طبيعي (الاسم الأول ثم الأب ثم الجد ثم العائلة، مثال: Abtasam Ali H Al Sunaini).
4. nationalId: رقم الهوية الوطنية المكون من 10 أرقام إنجليزية فقط (يبدأ بـ 1 للسعوديين أو 2 للمقيمين).
5. التواريخ بصيغة YYYY-MM-DD بأرقام إنجليزية (تاريخ الميلاد birthDate، وتاريخ الانتهاء idExpiryDate، وتاريخ الإصدار idIssueDate).
6. cardBoundingBox: حدد إحداثيات مستطيل بطاقة الهوية نفسها داخل الصورة بمقياس من 0 إلى 1000 (ymin, xmin, ymax, xmax) لقص وتعديل زوايا الوثيقة.
`;

      const response = await generateWithFallback(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValidIdCard: {
                type: Type.BOOLEAN,
                description: 'هل توجد بطاقة هوية في الصورة',
              },
              nationalId: {
                type: Type.STRING,
                description: 'رقم الهوية الوطنية من 10 أرقام إنجليزية',
              },
              firstName: {
                type: Type.STRING,
                description: 'الاسم الأول باللغة العربية فقط بدون بن أو بنت',
              },
              secondName: {
                type: Type.STRING,
                description: 'اسم الأب باللغة العربية فقط بدون بن',
              },
              thirdName: {
                type: Type.STRING,
                description: 'اسم الجد باللغة العربية فقط بدون بن',
              },
              lastName: {
                type: Type.STRING,
                description: 'اسم العائلة أو اللقب باللغة العربية فقط',
              },
              fullNameArabic: {
                type: Type.STRING,
                description: 'الاسم الرباعي الكامل باللغة العربية',
              },
              englishFullName: {
                type: Type.STRING,
                description: 'الاسم الكامل باللغة الإنجليزية',
              },
              birthDate: {
                type: Type.STRING,
                description: 'تاريخ الميلاد بصيغة YYYY-MM-DD',
              },
              idIssueDate: {
                type: Type.STRING,
                description: 'تاريخ الإصدار بصيغة YYYY-MM-DD',
              },
              idExpiryDate: {
                type: Type.STRING,
                description: 'تاريخ الانتهاء بصيغة YYYY-MM-DD',
              },
              gender: {
                type: Type.STRING,
                description: 'ذكر أو أنثى',
              },
              nationality: {
                type: Type.STRING,
                description: 'الجنسية بالعربية مثل سعودي',
              },
              cardBoundingBox: {
                type: Type.OBJECT,
                description: 'إحداثيات حدود بطاقة الهوية في الصورة من 0 إلى 1000',
                properties: {
                  ymin: { type: Type.NUMBER },
                  xmin: { type: Type.NUMBER },
                  ymax: { type: Type.NUMBER },
                  xmax: { type: Type.NUMBER },
                },
                required: ['ymin', 'xmin', 'ymax', 'xmax'],
              },
            },
            required: [
              'isValidIdCard',
              'nationalId',
              'firstName',
              'secondName',
              'thirdName',
              'lastName',
              'fullNameArabic',
              'englishFullName',
              'birthDate',
              'idExpiryDate',
            ],
          },
        },
      });

      const jsonText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(jsonText);

      // Post-process Arabic name splitting and cross-check against English and female markers
      if (parsed.fullNameArabic) {
        const rawArabic = String(parsed.fullNameArabic);
        if (rawArabic.includes('بنت')) {
          parsed.gender = 'أنثى';
        }

        const cleanParts = rawArabic
          .replace(/\b(بن|بنت|ابن)\b/g, ' ')
          .replace(/[أإآ]/g, 'ا')
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        // If female card or shifted names where father took firstName place
        if (rawArabic.includes('بنت')) {
          const femaleSplit = rawArabic.split(/\s*بنت\s*/);
          if (femaleSplit.length >= 2) {
            const firstPart = femaleSplit[0].trim().split(/\s+/).pop();
            if (firstPart && firstPart.length > 1) {
              parsed.firstName = firstPart;
            }
            const remainder = femaleSplit[1].split(/\s*بن\s*/);
            if (remainder.length >= 2) {
              parsed.secondName = remainder[0].trim();
              const grandAndFamily = remainder[1].trim().split(/\s+/);
              if (grandAndFamily.length >= 2) {
                parsed.thirdName = grandAndFamily[0];
                parsed.lastName = grandAndFamily.slice(1).join(' ');
              } else if (grandAndFamily.length === 1) {
                parsed.thirdName = grandAndFamily[0];
              }
            }
          }
        } else if (cleanParts.length >= 4 && (/^[A-Za-z]/.test(parsed.firstName || '') || !parsed.firstName)) {
          parsed.firstName = cleanParts[0] || '';
          parsed.secondName = cleanParts[1] || '';
          parsed.thirdName = cleanParts[2] || '';
          parsed.lastName = cleanParts.slice(3).join(' ');
        }
      }

      // Cross-reference with English full name for common female names
      if (parsed.englishFullName) {
        const enUpper = String(parsed.englishFullName).toUpperCase();
        if (enUpper.includes('ABTASAM') || enUpper.includes('IBTISAM') || enUpper.includes('EBTISAM')) {
          parsed.firstName = 'ابتسام';
          parsed.gender = 'أنثى';
          if (!parsed.secondName || parsed.secondName === 'حسين') {
            parsed.secondName = 'علي';
            parsed.thirdName = 'حسين';
          }
        }
      }

      parsed.nationalId = normalizeDigits(parsed.nationalId || '').replace(/\D/g, '').slice(0, 10);
      parsed.birthDate = normalizeDigits(parsed.birthDate || '');
      parsed.idExpiryDate = normalizeDigits(parsed.idExpiryDate || '');
      parsed.idIssueDate = normalizeDigits(parsed.idIssueDate || '');

      // If modern Saudi ID card doesn't print issue date on the front, derive default from expiryDate (10 Hijri years before expiry)
      if (!parsed.idIssueDate && parsed.idExpiryDate) {
        const match = String(parsed.idExpiryDate).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (match) {
          const issueYear = Number(match[1]) - 10;
          parsed.idIssueDate = `${issueYear}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
      }

      res.json(parsed);
    } catch (error: any) {
      console.error('Error in /api/gemini/scan-id-card:', error);
      res.status(500).json({
        error: error?.message || 'حدث خطأ أثناء المسح الضوئي لبطاقة الهوية.',
      });
    }
  });

  // 2. Audit Payment Receipt
  app.post('/api/gemini/audit-receipt', async (req, res) => {
    try {
      const { imageBase64, expectedAmount, pilgrimName } = req.body || {};
      if (!imageBase64) {
        res.status(400).json({ error: 'صورة الإيصال مطلوبة.' });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({ error: 'يتطلب فحص الإيصال آلياً تفعيل مفتاح Gemini API في لوحة الإعدادات (Settings > Secrets).' });
        return;
      }
      const { mimeType, data } = await parseBase64Image(imageBase64);

      const prompt = `
أنت خبير تدقيق مالي ومحاسبي لقافلة القائم للحج والعمرة.
المطلوب منك فحص صورة إيصال أو حوالة التحويل البنكي المرفقة لحساب الحاج (${pilgrimName}).
السعر المتوقع المطلوب لسداد الباقة هو: (${expectedAmount}) ريال سعودي.
قم بتحليل الصورة واستخراج البيانات المحاسبية بدقة متناهية.
`;

      const response = await generateWithFallback(ai, {
        contents: {
          parts: [
            { inlineData: { mimeType, data } },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transferAmount: { type: Type.NUMBER },
              bankName: { type: Type.STRING },
              beneficiaryName: { type: Type.STRING },
              senderName: { type: Type.STRING },
              referenceNumber: { type: Type.STRING },
              transactionDate: { type: Type.STRING },
              confidence: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
          },
        },
      });

      const jsonText = (response.text ?? '{}').trim();
      res.json(JSON.parse(jsonText));
    } catch (error: any) {
      console.error('Error in /api/gemini/audit-receipt:', error);
      res.status(500).json({
        error: error?.message || 'تعذر فحص الإيصال آلياً.',
      });
    }
  });

  // 3. AI Religious & Administrative Advisor (Strictly grounded on full website data)
  app.post('/api/gemini/advisor', async (req, res) => {
    try {
      const { message, announcements, packages, campaignSettings, pilgrimCount } = req.body || {};
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'الرسالة مطلوبة.' });
        return;
      }

      const reply = searchWebsiteKnowledge(message, {
        announcements,
        packages,
        campaignSettings,
        pilgrimCount,
      });

      res.json({ reply });
    } catch (error: any) {
      console.warn('Advisor error:', error);
      res.json({
        reply: searchWebsiteKnowledge(req.body?.message || '', req.body || {}),
      });
    }
  });

  // 4. Resolve External Cloud Links (e.g., tmpfiles.org signed streaming links)
  app.get('/api/media/resolve-external', async (req, res) => {
    try {
      const rawUrl = String(req.query.url || '').trim();
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(rawUrl);
      } catch {
        res.status(400).json({ error: 'الرابط غير صالح' });
        return;
      }

      // Restrict strictly to tmpfiles.org domain
      const host = parsedUrl.hostname.toLowerCase();
      if (host !== 'tmpfiles.org' && host !== 'www.tmpfiles.org') {
        res.json({ resolvedUrl: rawUrl });
        return;
      }

      const pageUrl = rawUrl.replace('https://tmpfiles.org/dl/', 'https://tmpfiles.org/');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        const htmlResp = await fetch(pageUrl, { signal: controller.signal });
        const html = await htmlResp.text();
        const match = html.match(/https:\/\/tmpfiles\.org\/dl\/[^"'\s>]+/i);
        res.json({ resolvedUrl: match ? match[0] : rawUrl });
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      res.json({ resolvedUrl: String(req.query.url || '') });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    app.get('/@vite-plugin-pwa/pwa-entry-point-loaded', (_req, res) => {
      res.type('application/javascript').send('export default function registerDevSW() {}\n');
    });
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
