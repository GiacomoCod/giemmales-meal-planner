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
  encodeURIComponent(`shopping-reminder:${profileId}:${reminderDateKey}`);

const normalizeCategory = (value) => {
  if (value === 'home' || value === 'medicine') return value;
  return 'supermarket';
};

const computeCategoryCounts = (items) => {
  const counts = {
    supermarket: 0,
    home: 0,
    medicine: 0
  };

  for (const item of items) {
    const category = normalizeCategory(item.category);
    counts[category] += 1;
  }

  return counts;
};

const buildReminderMessage = (counts) => {
  const total = counts.supermarket + counts.home + counts.medicine;
  const activeCategories = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([key]) => key);

  if (activeCategories.length === 1) {
    const only = activeCategories[0];
    if (only === 'medicine') {
      const body = 'Ehi! Ci sono dei farmaci che devi comprare. Dai vacci.';
      return {
        title: 'Planner di fiducia',
        body,
        inAppText: `💊 ${body}`
      };
    }

    if (only === 'home') {
      const body = 'Ehi! Ci sono delle cose per la casa da comprare. Dai vacci.';
      return {
        title: 'Planner di fiducia',
        body,
        inAppText: `🏠 ${body}`
      };
    }

    const body = 'Ehi! Ci sono delle cose che devi comprare al supermercato! Dai vacci.';
    return {
      title: 'Planner di fiducia',
      body,
      inAppText: `🛒 ${body}`
    };
  }

  const labels = [];
  if (counts.supermarket > 0) labels.push('supermercato');
  if (counts.home > 0) labels.push('casa');
  if (counts.medicine > 0) labels.push('farmaci');

  const body = `Ehi! Hai ${total} cose in lista: ${labels.join(', ')}. Dai vacci.`;
  return {
    title: 'Planner di fiducia',
    body,
    inAppText: `🛒 ${body}`
  };
};

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

    const preferenceCheck = await isPushTypeEnabled({ profileId, type: 'shopping' });
    if (!preferenceCheck.enabled) {
      return sendJson(200, {
        ok: true,
        profileId,
        sent: 0,
        disabledByUser: true,
        notificationType: 'shopping',
        message: 'Notifiche spesa disattivate nelle impostazioni.'
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
          message: 'Reminder spesa già inviato oggi (anti-spam attivo).',
          antiSpam: {
            reminderDate: reminderDateKey,
            ignoredDailyLimit: ignoreDailyLimit
          }
        });
      }
    }

    const shoppingSnapshot = await firestore
      .collection(getCollectionPath(profileId, 'shoppingList'))
      .limit(500)
      .get();

    const pendingItems = shoppingSnapshot.docs
      .map((doc) => doc.data() || {})
      .filter((item) => item.checked !== true);
    if (pendingItems.length === 0) {
      return sendJson(200, {
        ok: true,
        profileId,
        sent: 0,
        message: 'Lista spesa vuota: nessun reminder inviato.',
        pendingItems: 0
      });
    }

    const categoryCounts = computeCategoryCounts(pendingItems);
    const reminder = buildReminderMessage(categoryCounts);
    const url = '/?tab=shopping';

    const pushResult = await sendPushToProfile({
      profileId,
      title: reminder.title,
      body: reminder.body,
      url,
      extraData: {
        type: 'shopping-reminder',
        totalItems: String(pendingItems.length)
      }
    });

    await writeInAppNotification({
      profileId,
      text: reminder.inAppText,
      data: {
        type: 'shopping-reminder',
        totalItems: pendingItems.length,
        categoryCounts,
        url
      }
    });

    await lockRef.set({
      type: 'shopping-reminder',
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
      pendingItems: pendingItems.length,
      categoryCounts,
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
