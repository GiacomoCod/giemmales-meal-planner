const {
  isUnauthorized,
  parseBody,
  sendJson,
  sendPushToProfile,
  getFirestoreClient,
  getCollectionPath,
  writeInAppNotification
} = require('./_push-common.cjs');

const addDaysUtc = (dateObj, days) => new Date(dateObj.getTime() + days * 24 * 60 * 60 * 1000);

const getDateKeyInTimeZone = (dateObj, timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj);

const eventIdentity = (event) =>
  event.id || `${event.date || 'na'}:${event.startTime || 'na'}:${event.text || 'evento'}`;

const getDailyLockId = (profileId, reminderDateKey, event) =>
  encodeURIComponent(`events-due:${profileId}:${reminderDateKey}:${eventIdentity(event)}`);

const formatEventPreview = (event) => {
  const label = String(event.text || 'Evento senza titolo').trim();
  if (event.startTime && event.endTime) return `${event.startTime}-${event.endTime} ${label}`;
  if (event.startTime) return `${event.startTime} ${label}`;
  return label;
};

const buildReminderMessage = (events) => {
  if (events.length === 1) {
    const event = events[0];
    const preview = formatEventPreview(event);
    return {
      title: 'Planner di fiducia',
      body: `Ehi, domani hai in agenda: ${preview}.`,
      inAppText: `📅 Domani: ${preview}`
    };
  }

  const preview = events.slice(0, 3).map(formatEventPreview).join(' • ');
  const remaining = events.length > 3 ? ` (+${events.length - 3} altri)` : '';
  return {
    title: 'Planner di fiducia',
    body: `Ehi, domani hai ${events.length} eventi in agenda: ${preview}${remaining}.`,
    inAppText: `📅 Domani hai ${events.length} eventi: ${preview}${remaining}`
  };
};

const splitByDailyLimit = async ({ firestore, profileId, reminderDateKey, events }) => {
  const lockPath = getCollectionPath(profileId, 'notificationLocks');
  const checks = events.map(async (event) => {
    const lockId = getDailyLockId(profileId, reminderDateKey, event);
    const lockRef = firestore.collection(lockPath).doc(lockId);
    const lockDoc = await lockRef.get();
    return { event, lockRef, alreadyNotified: lockDoc.exists };
  });

  const results = await Promise.all(checks);
  return {
    fresh: results.filter((item) => !item.alreadyNotified),
    skipped: results.filter((item) => item.alreadyNotified)
  };
};

const persistDailyLocks = async ({ fresh, targetDateKey, reminderDateKey, now }) => {
  if (!fresh.length) return;
  await Promise.all(
    fresh.map(({ event, lockRef }) =>
      lockRef.set({
        type: 'events-due',
        eventId: event.id || null,
        eventText: event.text || null,
        targetDate: targetDateKey,
        reminderDate: reminderDateKey,
        createdAt: now
      })
    )
  );
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
    const targetDate = String(payload.targetDate || '').trim();
    const ignoreDailyLimit = Boolean(payload.ignoreDailyLimit);

    if (!profileId) {
      return sendJson(400, { ok: false, error: 'profileId is required' });
    }

    const tomorrowDate = addDaysUtc(new Date(), 1);
    const targetDateKey = targetDate || getDateKeyInTimeZone(tomorrowDate, timeZone);
    const reminderDateKey = getDateKeyInTimeZone(new Date(), timeZone);
    const now = Date.now();

    const firestore = getFirestoreClient();
    const eventsSnapshot = await firestore
      .collection(getCollectionPath(profileId, 'events'))
      .where('date', '==', targetDateKey)
      .limit(500)
      .get();

    const eventsDue = eventsSnapshot.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: data.id || doc.id,
        text: data.text || 'Evento',
        date: data.date || targetDateKey,
        startTime: data.startTime || null,
        endTime: data.endTime || null
      };
    });

    if (eventsDue.length === 0) {
      return sendJson(200, {
        ok: true,
        profileId,
        targetDate: targetDateKey,
        sent: 0,
        message: 'Nessun evento previsto per la data target.',
        dueEvents: []
      });
    }

    const { fresh, skipped } = ignoreDailyLimit
      ? {
          fresh: eventsDue.map((event) => ({
            event,
            lockRef: firestore
              .collection(getCollectionPath(profileId, 'notificationLocks'))
              .doc(getDailyLockId(profileId, reminderDateKey, event)),
            alreadyNotified: false
          })),
          skipped: []
        }
      : await splitByDailyLimit({
          firestore,
          profileId,
          reminderDateKey,
          events: eventsDue
        });

    if (fresh.length === 0) {
      return sendJson(200, {
        ok: true,
        profileId,
        targetDate: targetDateKey,
        sent: 0,
        message: 'Eventi già notificati oggi (anti-spam attivo).',
        dueEvents: [],
        skippedEvents: skipped.map(({ event }) => event)
      });
    }

    const eventsToNotify = fresh.map(({ event }) => event);
    const reminder = buildReminderMessage(eventsToNotify);
    const url = '/';
    const pushResult = await sendPushToProfile({
      profileId,
      title: reminder.title,
      body: reminder.body,
      url,
      extraData: {
        type: 'events-due',
        targetDate: targetDateKey,
        count: String(eventsToNotify.length)
      }
    });

    await writeInAppNotification({
      profileId,
      text: reminder.inAppText,
      data: {
        type: 'events-due',
        targetDate: targetDateKey,
        count: eventsToNotify.length,
        events: eventsToNotify.map((evt) => evt.text),
        url
      }
    });

    await persistDailyLocks({
      fresh,
      targetDateKey,
      reminderDateKey,
      now
    });

    return sendJson(200, {
      ok: true,
      profileId,
      targetDate: targetDateKey,
      sent: pushResult.sent,
      failed: pushResult.failed,
      invalidSubscriptionsRemoved: pushResult.invalidSubscriptionsRemoved,
      failures: pushResult.failures,
      dueEvents: eventsToNotify,
      skippedEvents: skipped.map(({ event }) => event),
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
