import React, { useState, useEffect } from 'react';
import { BookOpen, CheckSquare, Sparkles, Compass, CheckCircle2, Calendar, MapPin, Clock, ShieldCheck, HeartHandshake, PhoneCall } from 'lucide-react';
import { CampaignSettings } from '../types';
import { defaultCampaignSettings } from '../data/initialData';

interface GuideViewProps {
  campaignSettings?: CampaignSettings;
  initialTab?: 'day1' | 'day2' | 'day3' | 'day4' | 'day5' | 'checklist';
}

export const GuideView: React.FC<GuideViewProps> = ({ campaignSettings, initialTab }) => {
  const [activeDayTab, setActiveDayTab] = useState<'day1' | 'day2' | 'day3' | 'day4' | 'day5' | 'checklist'>(initialTab || 'day1');

  useEffect(() => {
    if (initialTab) {
      setActiveDayTab(initialTab);
    }
  }, [initialTab]);

  const hajjDaysTimeline = campaignSettings?.hajjDaysTimeline || defaultCampaignSettings.hajjDaysTimeline || [];

  const checklistItems = [
    { category: 'الوثائق الرسمية', items: ['أصل بطاقة الهوية الوطنية أو الإقامة سارية المفعول', 'جواز السفر (للضرورة)', 'بطاقة العضوية والتعريف الصادرة من قافلة القائم'] },
    { category: 'الملابس والإحرام', items: ['ثوبا الإحرام القطعيان (للرجال) + حزام الإحرام', 'ملابس ساترة وفضفاضة وطاهرة (للنساء)', 'أحذية خفيفة مريحة ومقاومة للانزلاق للمشي'] },
    { category: 'الصحة والوقاية', items: ['الأدوية الشخصية المزمنة مع الوصفة الطبية', 'شهادة التطيعمات والحمى الشوكية والإنفلونزا', 'كمامات طبية ومعقمات ومطهرات شخصية'] },
    { category: 'التجهيزات الشخصية والتقنية', items: ['شاحن متنقل (Power Bank) + سلك الشحن', 'مظلة شمسية واقية من الشمس', 'مصحف صغير وكتيب أدعية المناسك', 'حقيبة يد صغيرة لتنقلات المشاعر المقدسة'] }
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 text-right space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 px-4 py-1.5 rounded-full text-amber-600 dark:text-amber-400 text-xs font-bold">
          <BookOpen className="w-4 h-4" />
          <span>المعين في معرفة المناسك والأحكام - موسم 1448هـ</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">دليل الحاج التفاعلي لقافلة القائم</h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
          مرشدك الزمني المجدول خطوة بخطوة عبر أيام الحج المباركة، مع ربطها بتعليمات وخدمات ومخيمات قافلة القائم المعتمدة.
        </p>
      </div>

      {/* Campaign Official Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-right">
          <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <span>توجيهات الإدارة والمشايخ المرافقين</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            ترافق نخبة من العلماء والمشايخ الأفاضل حملة قافلة القائم للإجابة عن الاستفسارات الشرعية وإرشاد ضيوف الرحمن في كافة مخيمات منى وعرفة ومزدلفة.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="tel:0534717773"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 shadow"
          >
            <PhoneCall className="w-4 h-4" />
            <span>اتصال طوارئ القافلة</span>
          </a>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-slate-900/5 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
        {[
          { id: 'day1', label: '8 ذو الحجة (التروية)' },
          { id: 'day2', label: '9 ذو الحجة (عرفة)' },
          { id: 'day3', label: '10 ذو الحجة (العيد)' },
          { id: 'day4', label: 'أيام التشريق' },
          { id: 'day5', label: 'طواف الوداع' },
          { id: 'checklist', label: 'حقيبة الحاج' },
        ].map((tab) => {
          const isActive = activeDayTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveDayTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.id === 'checklist' ? <CheckSquare className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeDayTab !== 'checklist' ? (
        (() => {
          const currentDay = hajjDaysTimeline.find(d => d.id === activeDayTab);
          if (!currentDay) return null;
          return (
            <div className="bg-[#0B1221] border border-amber-500/30 text-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8 animate-fadeIn">
              {/* Day Header */}
              <div className="border-b border-slate-800 pb-6 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <Clock className="w-4 h-4" />
                  <span>{currentDay.subtitle}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-amber-400">{currentDay.dayTitle}</h2>
                <p className="text-sm text-slate-300 leading-relaxed">{currentDay.summary}</p>
              </div>

              {/* Steps timeline */}
              <div className="space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-amber-400" />
                  <span>خطوات ومحطات اليوم:</span>
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {currentDay.steps.map((st, idx) => (
                    <div key={idx} className="bg-[#070C18] border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="inline-block bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold px-2.5 py-1 rounded-lg">
                          {st.time}
                        </div>
                        <h4 className="text-base font-bold text-white">{st.title}</h4>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{st.desc}</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black text-sm shrink-0">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campaign Service Integration Tip */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-right">
                  <h4 className="text-xs sm:text-sm font-bold text-amber-300">خدمات ومخيمات قافلة القائم في هذه المرحلة:</h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{currentDay.campaignTip}</p>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="bg-[#0B1221] border border-amber-500/30 text-white rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-fadeIn">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-2xl font-black text-amber-400 flex items-center gap-3">
              <CheckSquare className="w-7 h-7 text-amber-400" />
              <span>قائمة التجهيزات والحقيبة الرسمية للحاج</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">تأكد من اكتمال كافة محتويات حقيبتك قبل موعد التجمع والانطلاق مع قافلة القائم.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {checklistItems.map((category, idx) => (
              <div key={idx} className="bg-[#070C18] border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-amber-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{category.category}</span>
                </h3>
                <ul className="space-y-3">
                  {category.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 font-medium">
                      <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
