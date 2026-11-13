import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';
import { Announcement, HajjPackage, CampaignSettings } from '../types';
import { searchWebsiteKnowledge } from '../utils/advisorKnowledge';

interface AiAdvisorProps {
  announcements?: Announcement[];
  packages?: HajjPackage[];
  campaignSettings?: CampaignSettings;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

export const AiAdvisor: React.FC<AiAdvisorProps> = ({ announcements, packages, campaignSettings }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'أهلاً بك يا ضيف الرحمن. أنا المرشد الذكي لقافلة القائم للحج والعمرة. أجيبك بدقة من واقع بيانات موقع القافلة حول: الإعلانات والمواضيع الجديدة، الإرشاد الديني، الباقات والأسعار، دليل الحاج وخطة سير الرحلة، شروط الالتحاق، ومعلومات التواصل والمقر.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Compute direct answer from live website data in real-time
      const liveWebsiteReply = searchWebsiteKnowledge(userMsg, {
        announcements,
        packages,
        campaignSettings,
      });

      setMessages([...newMessages, { role: 'model', content: liveWebsiteReply }]);
    } catch (err) {
      console.warn('Advisor notice:', err);
      const fallbackReply = searchWebsiteKnowledge(userMsg, {
        announcements,
        packages,
        campaignSettings,
      });
      setMessages([
        ...newMessages,
        { role: 'model', content: fallbackReply }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 text-right">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col h-[650px]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white border-b border-amber-500/30 flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-bold shadow">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-amber-400">المرشد الذكي لقافلة القائم</h2>
            <p className="text-xs text-slate-300">مدعوم بالذكاء الاصطناعي للإجابة على أحكام الحج والعمرة على مدار الساعة</p>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-amber-400'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`max-w-xl rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-tl-none shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-tr-none shadow-sm'
              }`}>
                {msg.content.replace(/\*\*/g, '')}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>المرشد الذكي يقوم بتحضير الإجابة...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل عن بيانات القافلة في الموقع (المرشد الديني، الباقات، الإعلانات، موقع الإدارة، دليل الحاج)..."
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 shadow"
          >
            <Send className="w-4 h-4" />
            <span>إرسال</span>
          </button>
        </form>
      </div>
    </div>
  );
};
