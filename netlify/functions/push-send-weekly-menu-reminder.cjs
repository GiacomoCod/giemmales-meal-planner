const {
  isUnauthorized,
  parseBody,
  sendJson,
  sendPushToProfile,
  getFirestoreClient,
  getCollectionPath,
  writeInAppNotification,
  isPushTypeEnabled
} = require('./_push-common.cjs');

const getDateKeyInTimeZone = (dateObj, timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj);

const getDailyLockId = (profileId, reminderDateKey) =>
  encodeURIComponent(`weekly-menu-reminder:${profileId}:${reminderDateKey}`);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return sendJson(405, { ok: false, error: 'Method not allowed. Use POST.' });
  }

  if (isUnauthorized(event)) {
    return sendJson(401, { ok: false, error: 'Unauthorized' });
  }

  try {
    const payload = parseBody(event);
    const profileId = String(payload.profileId || '').trim();
    const timeZone = String(payload.timeZone || 'Europe/Rome');
    const ignoreDailyLimit = Boolean(payload.ignoreDailyLimit);

    if (!profileId) {
      return sendJson(400, { ok: false, error: 'profileId is required' });
    }

    const preferenceCheck = await isPushTypeEnabled({ profileId, type: 'weeklyMenu' });
    if (!preferenceCheck.enabled) {
      return sendJson(200, {
        ok: true,
        profileId,
        sent: 0,
        disabledByUser: true,
        notificationType: 'weeklyMenu',
        message: 'Notifiche menu settimanale disattivate nelle impostazioni.'
      });
    }

    const reminderDateKey = getDateKeyInTimeZone(new Date(), timeZone);
    const firestore = getFirestoreClient();

    const lockRef = firestore
      .collection(getCollectionPath(profileId, 'notificationLocks'))
      .doc(getDailyLockId(profileId, reminderDateKey));

    if (!ignoreDailyLimit) {
      const lockDoc = await lockRef.get();
      if (lockDoc.exists) {
        return sendJson(200, {
          ok: true,
          profileId,
          sent: 0,
          message: 'Reminder menu settimanale già inviato oggi (anti-spam attivo).',
          antiSpam: {
            reminderDate: reminderDateKey,
            ignoredDailyLimit: ignoreDailyLimit
          }
        });
      }
    }

    const title = 'Planner di fiducia';
    const body = 'Ehi! Decidi cosa mangiare per la prossima settimana! Se no ti ritrovi a fare la spesa giorno per giorno!';
    const url = '/?tab=planner';

    const pushResult = await sendPushToProfile({
      profileId,
      title,
      body,
      url,
      extraData: {
        type: 'weekly-menu-reminder'
      }
    });

    await writeInAppNotification({
      profileId,
      text: `🍽️ ${body}`,
      data: {
        type: 'weekly-menu-reminder',
        url
      }
    });

    await lockRef.set({
      type: 'weekly-menu-reminder',
      reminderDate: reminderDateKey,
      createdAt: Date.now()
    });

    return sendJson(200, {
      ok: true,
      profileId,
      sent: pushResult.sent,
      failed: pushResult.failed,
      invalidSubscriptionsRemoved: pushResult.invalidSubscriptionsRemoved,
      failures: pushResult.failures,
      antiSpam: {
        reminderDate: reminderDateKey,
        ignoredDailyLimit: ignoreDailyLimit
      }
    });
  } catch (error) {
    return sendJson(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
