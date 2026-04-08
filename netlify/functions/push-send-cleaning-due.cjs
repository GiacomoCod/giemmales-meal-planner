const {
  isUnauthorized,
  parseBody,
  sendJson,
  sendPushToProfile,
  getFirestoreClient,
  getCollectionPath,
  writeInAppNotification
} = require('./_push-common.cjs');

const ROOM_LABELS = {
  cucina: 'Cucina',
  camera: 'Camera da letto',
  bagno: 'Bagno',
  salotto: 'Salotto',
  ingresso: 'Ingresso'
};

const ROOM_CONTEXT = {
  cucina: 'in cucina',
  camera: 'in camera',
  bagno: 'in bagno',
  salotto: 'in salotto',
  ingresso: "all'ingresso"
};

const unitToDays = (value, unit) => {
  if (!value || value < 1) return 7;
  if (unit === 'giorni') return value;
  if (unit === 'settimane') return value * 7;
  if (unit === 'mesi') return value * 30;
  if (unit === 'anni') return value * 365;
  return value * 7;
};

const parseDateKey = (dateKey) => {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const formatDateKey = (dateObj) => dateObj.toISOString().slice(0, 10);

const addDaysUtc = (dateObj, days) => new Date(dateObj.getTime() + days * 24 * 60 * 60 * 1000);

const getDateKeyInTimeZone = (dateObj, timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj);

const findLatestLog = (logs) =>
  logs.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.timestamp || 0) - (a.timestamp || 0);
  })[0] || null;

const lcFirst = (value) => {
  const text = String(value || '').trim();
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
};

const buildTaskPreview = (task) => `${task.taskName} (${task.roomLabel})`;

const buildTaskSnippet = (task) => {
  const context = ROOM_CONTEXT[task.roomId] || `in ${task.roomLabel}`;
  return `${lcFirst(task.taskName)} ${context}`;
};

const getDayContext = ({ reminderDateKey, targetDateKey }) => {
  const reminderDate = parseDateKey(reminderDateKey);
  const targetDate = parseDateKey(targetDateKey);
  const dayDiff = Math.round((targetDate.getTime() - reminderDate.getTime()) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) return { adverb: 'oggi', label: 'Oggi' };
  if (dayDiff === 1) return { adverb: 'domani', label: 'Domani' };
  return { adverb: `il ${targetDateKey}`, label: targetDateKey };
};

const getDailyLockId = (profileId, reminderDateKey, task) =>
  encodeURIComponent(`cleaning-due:${profileId}:${reminderDateKey}:${task.roomId}:${task.taskName}`);

const splitByDailyLimit = async ({ firestore, profileId, reminderDateKey, dueTasks }) => {
  const lockPath = getCollectionPath(profileId, 'notificationLocks');
  const checks = dueTasks.map(async (task) => {
    const lockId = getDailyLockId(profileId, reminderDateKey, task);
    const lockRef = firestore.collection(lockPath).doc(lockId);
    const lockDoc = await lockRef.get();
    return { task, lockId, lockRef, alreadyNotified: lockDoc.exists };
  });

  const results = await Promise.all(checks);
  const fresh = results.filter((item) => !item.alreadyNotified);
  const skipped = results.filter((item) => item.alreadyNotified);
  return { fresh, skipped };
};

const persistDailyLocks = async ({ fresh, targetDateKey, reminderDateKey, now }) => {
  if (!fresh.length) return;
  await Promise.all(
    fresh.map(({ task, lockRef }) =>
      lockRef.set({
        type: 'cleaning-due',
        roomId: task.roomId,
        taskName: task.taskName,
        targetDate: targetDateKey,
        reminderDate: reminderDateKey,
        createdAt: now
      })
    )
  );
};

const buildReminderMessage = ({ dueTasks, dayContext }) => {
  if (dueTasks.length === 1) {
    const task = dueTasks[0];
    return {
      title: 'Planner di fiducia',
      body: `Ehi, qui il tuo planner di fiducia: ${dayContext.adverb} c'è da ${buildTaskSnippet(task)}.`,
      inAppText: `✨ ${dayContext.label}: ${buildTaskPreview(task)}`
    };
  }

  const preview = dueTasks
    .slice(0, 3)
    .map((t) => buildTaskPreview(t))
    .join(' • ');
  const remaining = dueTasks.length > 3 ? ` (+${dueTasks.length - 3} altre)` : '';

  return {
    title: 'Planner di fiducia',
    body: `Ehi, ${dayContext.adverb} hai ${dueTasks.length} mansioni in scadenza: ${preview}${remaining}.`,
    inAppText: `✨ ${dayContext.label}: ${dueTasks.length} mansioni (${preview}${remaining})`
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
    const targetDate = String(payload.targetDate || '').trim();
    const ignoreDailyLimit = Boolean(payload.ignoreDailyLimit);

    if (!profileId) {
      return sendJson(400, { ok: false, error: 'profileId is required' });
    }

    const tomorrowDate = addDaysUtc(new Date(), 1);
    const targetDateKey = targetDate || getDateKeyInTimeZone(tomorrowDate, timeZone);
    const reminderDateKey = getDateKeyInTimeZone(new Date(), timeZone);
    const dayContext = getDayContext({ reminderDateKey, targetDateKey });
    const now = Date.now();

    const firestore = getFirestoreClient();
    const [tasksSnapshot, logsSnapshot, settingsSnapshot] = await Promise.all([
      firestore.collection(getCollectionPath(profileId, 'roomTasks')).limit(500).get(),
      firestore.collection(getCollectionPath(profileId, 'cleaningLogs')).limit(1200).get(),
      firestore.collection(getCollectionPath(profileId, 'taskSettings')).limit(500).get()
    ]);

    const roomTasks = tasksSnapshot.docs.map((doc) => doc.data());
    const cleaningLogs = logsSnapshot.docs.map((doc) => doc.data());
    const taskSettings = Object.fromEntries(settingsSnapshot.docs.map((doc) => [doc.id, doc.data()]));

    const dueTasks = [];
    for (const task of roomTasks) {
      const taskName = task.taskName;
      const roomId = task.roomId;
      const logsForTask = cleaningLogs.filter((log) => log.roomId === roomId && log.taskType === taskName);
      const latestLog = findLatestLog(logsForTask);
      if (!latestLog || !latestLog.date) continue;

      const setting = taskSettings[taskName] || { value: 1, unit: 'settimane' };
      const intervalDays = unitToDays(setting.value, setting.unit);
      const nextDueDate = addDaysUtc(parseDateKey(latestLog.date), intervalDays);
      const nextDueKey = formatDateKey(nextDueDate);

      if (nextDueKey === targetDateKey) {
        dueTasks.push({
          taskName,
          roomId,
          roomLabel: ROOM_LABELS[roomId] || roomId,
          dueDate: nextDueKey
        });
      }
    }

    if (dueTasks.length === 0) {
      return sendJson(200, {
        ok: true,
        profileId,
        targetDate: targetDateKey,
        sent: 0,
        message: 'Nessuna mansione in scadenza per la data target.',
        dueTasks: []
      });
    }

    const { fresh, skipped } = ignoreDailyLimit
      ? {
          fresh: dueTasks.map((task) => ({
            task,
            lockId: getDailyLockId(profileId, reminderDateKey, task),
            lockRef: firestore.collection(getCollectionPath(profileId, 'notificationLocks')).doc(getDailyLockId(profileId, reminderDateKey, task)),
            alreadyNotified: false
          })),
          skipped: []
        }
      : await splitByDailyLimit({
          firestore,
          profileId,
          reminderDateKey,
          dueTasks
        });

    if (fresh.length === 0) {
      return sendJson(200, {
        ok: true,
        profileId,
        targetDate: targetDateKey,
        sent: 0,
        message: 'Mansioni già notificate oggi (anti-spam attivo).',
        dueTasks: [],
        skippedTasks: skipped.map(({ task }) => task)
      });
    }

    const tasksToNotify = fresh.map(({ task }) => task);
    const reminder = buildReminderMessage({ dueTasks: tasksToNotify, dayContext });
    const url = '/?tab=cleaning';
    const pushResult = await sendPushToProfile({
      profileId,
      title: reminder.title,
      body: reminder.body,
      url,
      extraData: {
        type: 'cleaning-due',
        targetDate: targetDateKey,
        count: String(tasksToNotify.length)
      }
    });

    await writeInAppNotification({
      profileId,
      text: reminder.inAppText,
      data: {
        type: 'cleaning-due',
        targetDate: targetDateKey,
        count: tasksToNotify.length,
        tasks: tasksToNotify.map((task) => task.taskName),
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
      dueTasks: tasksToNotify,
      skippedTasks: skipped.map(({ task }) => task),
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
