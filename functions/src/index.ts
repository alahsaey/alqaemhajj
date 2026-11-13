import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * Filter pilgrims based on notification target criteria
 */
function filterPilgrimsByTarget(
  targetType: string,
  targetValue: string | undefined,
  pilgrims: any[]
): any[] {
  const active = pilgrims.filter(
    (p) => !p.isDeleted && p.status !== 'محذوف' && p.status !== 'معتذر' && p.status !== 'مرفوض'
  );

  switch (targetType) {
    case 'all':
      return active;
    case 'transport':
      return active.filter((p) => p.transport === targetValue);
    case 'package':
      return active.filter((p) => p.selectedPackage === targetValue);
    case 'bus':
      return active.filter((p) => p.busNumber === targetValue);
    case 'flight':
      return active.filter(
        (p) =>
          p.transport === 'طائرة' &&
          (p.flightNumberOutbound === targetValue ||
            p.flightNumberReturn === targetValue ||
            p.flightTicketNumber === targetValue)
      );
    case 'gender':
      return active.filter((p) => p.gender === targetValue);
    case 'individual':
      return active.filter(
        (p) => p.nationalId === targetValue || p.id === targetValue
      );
    default:
      return active;
  }
}

/**
 * Cloud Scheduler Task: Runs every 5 minutes in Asia/Riyadh timezone.
 * Checks for scheduled notifications that are due and dispatches them via FCM and Firestore inboxes.
 */
export const processScheduledNotifications = functions.scheduler.onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'Asia/Riyadh',
    retryCount: 1,
  },
  async () => {
    const nowIso = new Date().toISOString();
    const snapshot = await db
      .collection('notifications')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', nowIso)
      .get();

    if (snapshot.empty) {
      functions.logger.info('No scheduled notifications due at this time.');
      return;
    }

    const pilgrimsSnap = await db.collection('pilgrims').get();
    const allPilgrims = pilgrimsSnap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    for (const notifDoc of snapshot.docs) {
      const notif = notifDoc.data();
      const notifId = notifDoc.id;

      try {
        const recipients = filterPilgrimsByTarget(
          notif.targetType,
          notif.targetValue,
          allPilgrims
        );

        const fcmTokens: string[] = [];
        recipients.forEach((p) => {
          if (Array.isArray(p.fcmTokens)) {
            fcmTokens.push(...p.fcmTokens);
          }
        });

        // 1. Send FCM Web Push Notification
        let fcmSuccessCount = 0;
        let fcmFailureCount = 0;

        if (fcmTokens.length > 0) {
          const uniqueTokens = Array.from(new Set(fcmTokens));
          const response = await admin.messaging().sendEachForMulticast({
            tokens: uniqueTokens,
            notification: {
              title: notif.title,
              body: notif.body,
            },
            data: {
              notificationId: notifId,
              priority: notif.priority || 'normal',
            },
          });
          fcmSuccessCount = response.successCount;
          fcmFailureCount = response.failureCount;
        }

        // 2. Batch fan-out into pilgrim_notifications inboxes (chunks of 400)
        const sentAt = new Date().toISOString();
        const BATCH_SIZE = 400;

        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
          const chunk = recipients.slice(i, i + BATCH_SIZE);
          const batch = db.batch();

          for (const pilgrim of chunk) {
            const inboxId = `${notifId}_${String(pilgrim.nationalId).trim()}`;
            const inboxRef = db.collection('pilgrim_notifications').doc(inboxId);

            batch.set(
              inboxRef,
              {
                id: inboxId,
                notificationId: notifId,
                pilgrimId: String(pilgrim.nationalId).trim(),
                title: notif.title,
                body: notif.body,
                priority: notif.priority || 'normal',
                isRead: false,
                createdAt: sentAt,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          }

          await batch.commit();
        }

        // 3. Mark notification as sent
        await notifDoc.ref.update({
          status: 'sent',
          sentAt,
          'stats.sentCount': recipients.length,
          'stats.targetCount': recipients.length,
          'stats.failureCount': fcmFailureCount,
        });

        functions.logger.info(
          `Successfully dispatched scheduled notification ${notifId} to ${recipients.length} pilgrims.`
        );
      } catch (err: any) {
        functions.logger.error(`Error processing notification ${notifId}:`, err);
        await notifDoc.ref.update({
          scheduledSendError: err?.message || String(err),
        });
      }
    }
  }
);
