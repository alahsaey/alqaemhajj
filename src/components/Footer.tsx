import React, { useState } from 'react';
import { Phone, Mail, MapPin, Heart, ShieldCheck, Share2, Check } from 'lucide-react';
import { CampaignSettings } from '../types';

interface FooterProps {
  setCurrentView: (v: string) => void;
  campaignSettings: CampaignSettings;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentView, campaignSettings }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const shareData = {
      title: campaignSettings.siteTexts?.brandName || 'قافلة القائم للحج والعمرة',
      text: campaignSettings.siteTexts?.heroDescription || 'نظام إدارة قافلة القائم لخدمة ضيوف الرحمن',
      url: window.location.origin
    };
    if (navigator.share) {
      navigator.share(shareData).catch(err => {
        if (err?.name !== 'AbortError' && !String(err?.message || '').toLowerCase().includes('cancel')) {
          console.error('Error sharing:', err);
        }
      });
    } else {
      navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-amber-500/20 pt-16 pb-12 text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* About Campaign */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl p-1 shadow flex items-center justify-center border border-amber-500/40">
                <img 
                  src="/assets/aistudio/Screenshot_20261107_174409_com_instagram_android_InstagramMainActivity_441b738d.png" 
                  alt="شعار القافلة" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">قافلة القائم</h3>
                <p className="text-xs text-amber-400">للحج والعمرة والزيارة</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              نرافقكم في رحلة الإيمان والخشوع بخدمات متميزة وكادر إداري وديني متمرس لتأدية مناسك الحج والعمرة بيسر وطمأنينة.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>مرخصة رسمياً لخدمة حجاج بيت الله الحرام 1448هـ</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-base mb-4 border-b border-slate-800 pb-2">روابط سريعة</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => setCurrentView('home')} className="hover:text-amber-400 transition">الرئيسية</button>
              </li>
              <li>
                <button onClick={() => setCurrentView('packages')} className="hover:text-amber-400 transition">الباقات والأسعار</button>
              </li>
              <li>
                <button onClick={() => setCurrentView('packages')} className="hover:text-amber-400 transition">باقات الحج والتسجيل</button>
              </li>
              <li>
                <button onClick={() => setCurrentView('portal')} className="hover:text-amber-400 transition">بوابة الاستعلام للحاج</button>
              </li>
              <li>
                <button onClick={() => setCurrentView('guide')} className="hover:text-amber-400 transition">دليل المناسك والإرشادات</button>
              </li>
            </ul>
          </div>

          {/* Services & Guidance */}
          <div>
            <h4 className="text-white font-bold text-base mb-4 border-b border-slate-800 pb-2">خدمات الحجاج</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>قوافل الحج والعمرة الفاخرة</li>
              <li>مخيمات منى وعرفات المكيفة</li>
              <li>الإرشاد الفقهي والديني المتخصص</li>
              <li>الرعاية الطبية والمتابعة المستمرة</li>
              <li>النقل الترددي المريح والآمن</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-bold text-base mb-4 border-b border-slate-800 pb-2">تواصل معنا</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span>{campaignSettings.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-amber-400 shrink-0" />
                <a href={`tel:${campaignSettings.phone}`} className="hover:text-amber-400 transition" dir="ltr">{campaignSettings.phone}</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-amber-400 shrink-0" />
                <a href={`mailto:${campaignSettings.email}`} className="hover:text-amber-400 transition" dir="ltr">{campaignSettings.email}</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-900 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} قافلة القائم للحج والعمرة. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className={`flex items-center gap-1.5 transition px-3 py-1.5 rounded-lg border text-xs font-medium ${
                copied 
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-600' 
                  : 'bg-slate-900 hover:text-amber-400 border-slate-800'
              }`}
              title="مشاركة الموقع"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم نسخ الرابط ✓' : 'مشاركة الموقع'}</span>
            </button>
            <div className="flex items-center gap-1">
              <span>صُمم لخدمة ضيوف الرحمن بإتقان</span>
              <Heart className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
