export interface ReceiptAuditResult {
  transferAmount: number;
  bankName: string;
  beneficiaryName: string;
  senderName: string;
  referenceNumber: string;
  transactionDate: string;
  isAmountMatched: boolean;
  expectedAmount: number;
  differenceAmount: number;
  confidence: 'عالية' | 'متوسطة' | 'منخفضة';
  status: 'مطابق بالكامل' | 'دفعة جزئية (أقل من المطلوب)' | 'مبلغ زائد' | 'تعذر القراءة أو الإيصال غير واضح';
  notes: string;
}

export async function auditReceiptWithAI(
  imageBase64: string,
  expectedAmount: number,
  pilgrimName: string
): Promise<ReceiptAuditResult> {
  try {
    const response = await fetch('/api/gemini/audit-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        expectedAmount,
        pilgrimName,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const parsed = await response.json();

    const detectedAmount = typeof parsed.transferAmount === 'number'
      ? parsed.transferAmount
      : (parseFloat(String(parsed.transferAmount || '0').replace(/[^0-9.]/g, '')) || 0);

    const diff = expectedAmount - detectedAmount;
    let matchStatus: ReceiptAuditResult['status'] = 'مطابق بالكامل';
    let isMatched = false;

    if (detectedAmount === 0) {
      matchStatus = 'تعذر القراءة أو الإيصال غير واضح';
    } else if (Math.abs(diff) < 1) {
      matchStatus = 'مطابق بالكامل';
      isMatched = true;
    } else if (diff > 0) {
      matchStatus = 'دفعة جزئية (أقل من المطلوب)';
    } else {
      matchStatus = 'مبلغ زائد';
    }

    return {
      transferAmount: detectedAmount,
      bankName: parsed.bankName || 'غير محدد',
      beneficiaryName: parsed.beneficiaryName || 'غير محدد',
      senderName: parsed.senderName || pilgrimName,
      referenceNumber: parsed.referenceNumber || '—',
      transactionDate: parsed.transactionDate || new Date().toLocaleDateString('ar-SA'),
      isAmountMatched: isMatched,
      expectedAmount,
      differenceAmount: diff,
      confidence: (parsed.confidence as any) || 'متوسطة',
      status: matchStatus,
      notes: parsed.notes || 'تم تدقيق الوصل ومقارنة المبلغ آلياً.',
    };
  } catch (error) {
    console.warn('Error during AI receipt audit:', error);
    return {
      transferAmount: 0,
      bankName: 'غير محدد',
      beneficiaryName: 'غير محدد',
      senderName: pilgrimName,
      referenceNumber: '—',
      transactionDate: new Date().toLocaleDateString('ar-SA'),
      isAmountMatched: false,
      expectedAmount,
      differenceAmount: expectedAmount,
      confidence: 'منخفضة',
      status: 'تعذر القراءة أو الإيصال غير واضح',
      notes: 'تعذر فحص الصورة آلياً بسبب جودة الصورة أو قيود الاتصال. يرجى مراجعة الوصل بصرياً.',
    };
  }
}
