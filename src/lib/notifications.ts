import {
  writeBatch,
  doc,
  collection,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  NotificationItem,
  PilgrimNotification,
  Pilgrim,
  NotificationTargetType,
} from '../types';
import { setDocument, updateDocument, recordActivityLog } from './db';

/**
 * Filter active pilgrims matching a specific notification target criteria.
 */
export function resolveTargetPilgrims(
  targetType: NotificationTargetType,
  targetValue: string | undefined,
  pilgrims: Pilgrim[]
): Pilgrim[] {
  // Only target active, non-excluded pilgrims
  const activePilgrims = pilgrims.filter(
    (p) =>
      !p.isDeleted &&
      p.status !== 'محذوف' &&
      p.status !== 'معتذر' &&
      p.status !== 'مرفوض'
  );

  switch (targetType) {
    case 'all':
      return activePilgrims;

    case 'transport':
      if (!targetValue) return activePilgrims;
      return activePilgrims.filter(
        (p) => (p.transport || '').trim() === targetValue.trim()
      );

    case 'package':
      if (!targetValue) return activePilgrims;
      return activePilgrims.filter(
        (p) => (p.selectedPackage || '').trim() === targetValue.trim()
      );

    case 'bus':
      if (!targetValue) return activePilgrims;
      return activePilgrims.filter(
        (p) => (p.busNumber || '').trim() === targetValue.trim()
      );

    case 'flight':
      if (!targetValue) {
        return activePilgrims.filter((p) => p.transport === 'طائرة');
      }
      return activePilgrims.filter((p) => {
        if (p.transport !== 'طائرة') return false;
        const cleanVal = targetValue.trim().toLowerCase();
        return (
          (p.flightNumberOutbound || '').trim().toLowerCase() === cleanVal ||
          (p.flightNumberReturn || '').trim().toLowerCase() === cleanVal ||
          (p.flightTicketNumber || '').trim().toLowerCase() === cleanVal
        );
      });

    case 'gender':
      if (!targetValue) return activePilgrims;
      return activePilgrims.filter(
        (p) => (p.gender || '').trim() === targetValue.trim()
      );

    case 'individual':
      if (!targetValue) return [];
      return activePilgrims.filter(
        (p) =>
          p.nationalId.trim() === targetValue.trim() ||
          p.id.trim() === targetValue.trim() ||
          (p.registrationReference || '').trim().toLowerCase() === targetValue.trim().toLowerCase()
      );

    default:
      return activePilgrims;
  }
}

/**
 * Dispatches an instant notification or registers a scheduled notification in Firestore.
 * Handles recipient record fan-out in safe batches of 400 to comply with Firestore limits.
 */
export async function createAndDispatchNotification(
  notification: Omit<NotificationItem, 'stats' | 'status'> & {
    stats?: Partial<NotificationItem['stats']>;
    status?: NotificationItem['status'];
  },
  pilgrims: Pilgrim[]
): Promise<{ success: boolean; targetCount: number; error?: string }> {
  try {
    const recipients = resolveTargetPilgrims(
      notification.targetType,
      notification.targetValue,
      pilgrims
    );

    const isInstant =
      notification.deliveryType === 'instant' ||
      !notification.scheduledAt ||
      new Date(notification.scheduledAt).getTime() <= Date.now() + 60000; // within 1 minute

    const initialStatus: NotificationItem['status'] = isInstant
      ? 'sent'
      : 'scheduled';

    const fullNotification: NotificationItem = {
      ...notification,
      status: initialStatus,
      sentAt: isInstant ? new Date().toISOString() : undefined,
      stats: {
        targetCount: recipients.length,
        sentCount: isInstant ? recipients.length : 0,
        readCount: 0,
        failureCount: 0,
        ...(notification.stats || {}),
      },
    };

    // 1. Save master notification record
    await setDocument('notifications', fullNotification.id, fullNotification);

    // 2. If instant, fan out to each recipient's inbox in batches
    if (isInstant && recipients.length > 0) {
      const BATCH_SIZE = 400; // safe limit under Firestore 500
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const chunk = recipients.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        for (const pilgrim of chunk) {
          const inboxId = `${fullNotification.id}_${pilgrim.nationalId.trim()}`;
          const inboxRef = doc(db, 'pilgrim_notifications', inboxId);

          const inboxItem: PilgrimNotification = {
            id: inboxId,
            notificationId: fullNotification.id,
            pilgrimId: pilgrim.nationalId.trim(),
            title: fullNotification.title,
            body: fullNotification.body,
            priority: fullNotification.priority,
            isRead: false,
            createdAt: fullNotification.sentAt || new Date().toISOString(),
          };

          batch.set(inboxRef, {
            ...inboxItem,
            updatedAt: serverTimestamp(),
          });
        }

        await batch.commit();
      }
    }

    // 3. Audit trail
    recordActivityLog({
      adminId: notification.createdBy.adminId,
      adminName: notification.createdBy.adminName,
      username: notification.createdBy.adminId,
      userRole: notification.createdBy.role,
      category: 'الباقات والإعلانات',
      action: isInstant
        ? `إرسال إشعار فوري: ${notification.title}`
        : `جدولة إشعار: ${notification.title}`,
      target: `المستهدفون: ${recipients.length} حاج (${notification.targetType}: ${notification.targetValue || 'الكل'})`,
      details: `الأولوية: ${notification.priority} | النمط: ${notification.deliveryType}`,
    }).catch(() => {});

    return {
      success: true,
      targetCount: recipients.length,
    };
  } catch (err: any) {
    console.error('Error dispatching notification:', err);
    return {
      success: false,
      targetCount: 0,
      error: err?.message || 'حدث خطأ أثناء معالجة وإرسال الإشعار.',
    };
  }
}

/**
 * Check and process any due scheduled notifications.
 */
export async function processDueScheduledNotifications(
  scheduledNotifications: NotificationItem[],
  pilgrims: Pilgrim[]
): Promise<number> {
  const now = Date.now();
  let processedCount = 0;

  for (const notif of scheduledNotifications) {
    if (notif.status !== 'scheduled' || !notif.scheduledAt) continue;

    const scheduledTime = new Date(notif.scheduledAt).getTime();
    if (scheduledTime <= now) {
      try {
        const recipients = resolveTargetPilgrims(
          notif.targetType,
          notif.targetValue,
          pilgrims
        );

        const sentAt = new Date().toISOString();

        // Batch write recipients
        if (recipients.length > 0) {
          const BATCH_SIZE = 400;
          for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const chunk = recipients.slice(i, i + BATCH_SIZE);
            const batch = writeBatch(db);

            for (const pilgrim of chunk) {
              const inboxId = `${notif.id}_${pilgrim.nationalId.trim()}`;
              const inboxRef = doc(db, 'pilgrim_notifications', inboxId);

              const inboxItem: PilgrimNotification = {
                id: inboxId,
                notificationId: notif.id,
                pilgrimId: pilgrim.nationalId.trim(),
                title: notif.title,
                body: notif.body,
                priority: notif.priority,
                isRead: false,
                createdAt: sentAt,
              };

              batch.set(inboxRef, {
                ...inboxItem,
                updatedAt: serverTimestamp(),
              });
            }

            await batch.commit();
          }
        }

        // Update master notification status
        await updateDocument('notifications', notif.id, {
          status: 'sent',
          sentAt,
          stats: {
            ...notif.stats,
            targetCount: recipients.length,
            sentCount: recipients.length,
          },
        });

        processedCount++;
      } catch (err) {
        console.error(`Failed to dispatch scheduled notification ${notif.id}:`, err);
        await updateDocument('notifications', notif.id, {
          scheduledSendError: String(err),
        }).catch(() => {});
      }
    }
  }

  return processedCount;
}

/**
 * Mark a pilgrim notification as read and increment the read count in master stats.
 */
export async function markNotificationAsRead(
  inboxId: string,
  notificationId: string
): Promise<void> {
  try {
    const readAt = new Date().toISOString();
    await updateDocument('pilgrim_notifications', inboxId, {
      isRead: true,
      readAt,
    });

    const notifRef = doc(db, 'notifications', notificationId);
    const batch = writeBatch(db);
    batch.update(notifRef, {
      'stats.readCount': increment(1),
    });
    await batch.commit().catch(() => {});
  } catch (err) {
    console.warn('Error marking notification as read:', err);
  }
}

/**
 * Request Web Push Notification Permission from the user's browser.
 */
export async function requestBrowserPushPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Notification permission error:', err);
    return 'denied';
  }
}

/**
 * Triggers an immediate browser notification if permission is granted.
 */
export function triggerBrowserNotification(
  title: string,
  body: string,
  options?: { icon?: string; tag?: string }
): void {
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(title, {
        body,
        icon: options?.icon || '/assets/aistudio/Screenshot_20261107_174409_com_instagram_android_InstagramMainActivity_441b738d.png',
        tag: options?.tag || 'qaem-notification',
        dir: 'rtl',
        lang: 'ar',
      });
    } catch {
      // Browsers in restricted iframe contexts may ignore constructor
    }
  }
}
