import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText,
  Clock,
  X,
  CheckCheck,
  Smartphone,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Pilgrim, PilgrimNotification } from '../types';
import {
  markNotificationAsRead,
  requestBrowserPushPermission,
  triggerBrowserNotification,
} from '../lib/notifications';
import { updateDocument } from '../lib/db';

interface PilgrimNotificationCenterProps {
  pilgrim: Pilgrim;
}

export const PilgrimNotificationCenter: React.FC<PilgrimNotificationCenterProps> = ({
  pilgrim,
}) => {
  const [notifications, setNotifications] = useState<PilgrimNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(
    Boolean(pilgrim.pushNotificationsEnabled)
  );
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  // Subscribe to real-time notifications for this specific pilgrim using Firestore onSnapshot
  useEffect(() => {
    if (!pilgrim?.nationalId) return;

    const q = query(
      collection(db, 'pilgrim_notifications'),
      where('pilgrimId', '==', pilgrim.nationalId.trim())
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: PilgrimNotification[] = snapshot.docs.map((d) => ({
          ...(d.data() as PilgrimNotification),
          id: d.id,
        }));

        // Sort descending by creation date
        items.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setNotifications(items);
      },
      (err) => {
        console.warn('Pilgrim notifications listener note:', err);
      }
    );

    return () => unsubscribe();
  }, [pilgrim.nationalId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (notif: PilgrimNotification) => {
    if (notif.isRead) return;
    await markNotificationAsRead(notif.id, notif.notificationId);
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    for (const item of unread) {
      await markNotificationAsRead(item.id, item.notificationId);
    }
  };

  const handleEnablePush = async () => {
    const permission = await requestBrowserPushPermission();
    if (permission === 'granted') {
      setPushEnabled(true);
      setPushStatusMessage('تم تفعيل إشعارات المتصفح بنجاح لهذا الجهاز.');
      updateDocument('pilgrims', pilgrim.id, {
        pushNotificationsEnabled: true,
      }).catch(() => {});
      triggerBrowserNotification(
        'قافلة القائم للحج والعمرة',
        'تم تفعيل الإشعارات بنجاح. ستصلك التوجيهات ومواعيد الرحلات فور صدورها.'
      );
    } else {
      setPushStatusMessage('تم رفض إذن الإشعارات من المتصفح أو لم يتم السماح به.');
    }

    setTimeout(() => setPushStatusMessage(null), 4000);
  };

  return (
    <div className="relative text-right" dir="rtl">
      {/* Trigger Button with Animated Unread Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`مركز إشعارات الحاج، ${unreadCount} إشعار غير مقروء`}
        className="relative px-3.5 py-2 rounded-xl bg-[#0B1221] hover:bg-[#131F38] border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <div className="relative">
          <Bell className="w-4 h-4 text-amber-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black flex items-center justify-center px-1 animate-pulse border border-slate-950">
              {unreadCount}
            </span>
          )}
        </div>
        <span>مركز الإشعارات</span>
        {unreadCount > 0 && (
          <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded-md">
            {unreadCount} جديد
          </span>
        )}
      </button>

      {/* Notifications Drawer / Panel */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto right-0 sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-[#0B1221] border border-amber-500/35 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn text-right">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 bg-[#070C18] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white">إشعارات وتوجيهات الحاج</h4>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition"
                >
                  تحديد الكل كمقروء
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Web Push Prompt Strip */}
          <div className="p-2.5 bg-gradient-to-r from-amber-500/10 via-[#0B1221] to-[#070C18] border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
              <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>إشعارات المتصفح:</span>
            </div>
            {pushEnabled ? (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>مفعلة</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleEnablePush}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black transition cursor-pointer"
              >
                تفعيل الإشعارات
              </button>
            )}
          </div>

          {pushStatusMessage && (
            <div className="p-2 bg-emerald-950/70 border-b border-emerald-500/40 text-[11px] text-emerald-200 text-center font-bold">
              {pushStatusMessage}
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-2">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-1">
                <Bell className="w-6 h-6 mx-auto text-slate-600" />
                <p className="text-xs font-bold text-slate-300">لا توجد إشعارات جديدة</p>
                <p className="text-[11px] text-slate-500">
                  ستظهر هنا كافة التعليمات ومواعيد الرحلات الموجهة لك فور صدورها من إدارة القافلة.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif)}
                  className={`p-3 rounded-xl transition cursor-pointer space-y-1.5 ${
                    notif.isRead
                      ? 'bg-[#070C18]/60 hover:bg-[#070C18] border border-transparent'
                      : 'bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {notif.priority === 'urgent' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          عاجل
                        </span>
                      )}
                      {notif.priority === 'high' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          هام
                        </span>
                      )}
                      <h5 className="text-xs font-bold text-white truncate max-w-[190px]">
                        {notif.title}
                      </h5>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(notif.createdAt).toLocaleDateString('ar-SA')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3">
                    {notif.body}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    {!notif.isRead ? (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        <span>انقر لتأكيد القراءة</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span>تمت القراءة</span>
                      </span>
                    )}

                    <span className="text-slate-500">
                      {new Date(notif.createdAt).toLocaleTimeString('ar-SA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
