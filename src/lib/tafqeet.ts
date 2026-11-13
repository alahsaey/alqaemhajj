/**
 * تحويل الأرقام إلى كلمات عربية (تفقيط المبالغ المالية)
 * لمطابقة السندات المالية الرسمية
 */

const ones = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر',
  'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
];

const tens = [
  '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'
];

const hundreds = [
  '', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'
];

function convertHundreds(num: number): string {
  let result = '';
  const h = Math.floor(num / 100);
  const remainder = num % 100;

  if (h > 0) {
    result += hundreds[h];
  }

  if (remainder > 0) {
    if (result) result += ' و ';
    if (remainder < 20) {
      result += ones[remainder];
    } else {
      const o = remainder % 10;
      const t = Math.floor(remainder / 10);
      if (o > 0) {
        result += ones[o] + ' و ' + tens[t];
      } else {
        result += tens[t];
      }
    }
  }

  return result;
}

export function numberToArabicWords(amountStr: string | number): string {
  if (!amountStr) return 'صفر ريال سعودي لا غير';
  
  // Clean string from non-digits except decimals
  const cleanStr = String(amountStr).replace(/[^0-9.]/g, '');
  const num = Math.floor(parseFloat(cleanStr) || 0);

  if (num === 0) return 'صفر ريال سعودي لا غير';

  let result = '';

  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remaining = num % 1000;

  if (billions > 0) {
    result += convertHundreds(billions) + ' مليار';
  }

  if (millions > 0) {
    if (result) result += ' و ';
    if (millions === 1) result += 'مليون';
    else if (millions === 2) result += 'مليونان';
    else if (millions >= 3 && millions <= 10) result += convertHundreds(millions) + ' ملايين';
    else result += convertHundreds(millions) + ' مليون';
  }

  if (thousands > 0) {
    if (result) result += ' و ';
    if (thousands === 1) result += 'ألف';
    else if (thousands === 2) result += 'ألفان';
    else if (thousands >= 3 && thousands <= 10) result += convertHundreds(thousands) + ' آلاف';
    else result += convertHundreds(thousands) + ' ألف';
  }

  if (remaining > 0) {
    if (result) result += ' و ';
    result += convertHundreds(remaining);
  }

  return `فقط ${result.trim()} ريال سعودي لا غير`;
}
