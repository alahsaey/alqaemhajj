import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'default' | 'floating';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'default' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const isFloating = variant === 'floating';

  const buttonClasses = isFloating
    ? "fixed bottom-24 left-6 z-40 w-14 h-14 bg-amber-500 text-slate-950 rounded-full shadow-2xl flex items-center justify-center border-4 border-slate-900 active:scale-95 transition-transform hover:scale-110"
    : "flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600 transition";

  const iosButtonClasses = isFloating
    ? "fixed bottom-24 left-6 z-40 w-14 h-14 bg-slate-800 text-amber-400 rounded-full shadow-2xl flex items-center justify-center border-4 border-slate-900 active:scale-95 transition-transform"
    : "flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800";

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={buttonClasses}
        title="تثبيت تطبيق قافلة القائم"
      >
        <div className="relative">
          <Smartphone className={isFloating ? "w-7 h-7" : "w-4 h-4"} />
          {isFloating && (
            <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5">
              <Download className="w-3 h-3 text-amber-600" />
            </div>
          )}
        </div>
        {!isFloating && <span>تثبيت التطبيق</span>}
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={iosButtonClasses}
          title="تثبيت على iOS"
        >
          <Smartphone className={isFloating ? "w-6 h-6" : "w-4 h-4"} />
          {!isFloating && <span>تثبيت على iOS</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">التثبيت على iPhone / iPad</h3>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 text-right" dir="rtl">
                <p>1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط سفاري.</p>
                <p>2. مرر للأسفل واضغط على <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
