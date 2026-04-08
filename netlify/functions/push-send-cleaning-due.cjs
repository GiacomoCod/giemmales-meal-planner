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

const buildReminderMessage = (dueTasks) => {
  if (dueTasks.length === 1) {
    const task = dueTasks[0];
    return {
      title: 'Planner di fiducia',
      body: `Ehi, domani c'è da: ${task.taskName} (${task.roomLabel}).`,
      inAppText: `✨ Domani: ${task.taskName} (${task.roomLabel})`
    };
  }

  const preview = dueTasks
    .slice(0, 2)
    .map((t) => `${t.taskName} (${t.roomLabel})`)
    .join(', ');
  const remaining = dueTasks.length > 2 ? ` +${dueTasks.length - 2} altre` : '';

  return {
    title: 'Planner di fiducia',
    body: `Domani ci sono ${dueTasks.length} mansioni: ${preview}${remaining}.`,
    inAppText: `✨ Domani ci sono ${dueTasks.length} mansioni in scadenza`
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

    if (!profileId) {
      return sendJson(400, { ok: false, error: 'profileId is required' });
    }

    const tomorrowDate = addDaysUtc(new Date(), 1);
    const targetDateKey = targetDate || getDateKeyInTimeZone(tomorrowDate, timeZone);

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

    const reminder = buildReminderMessage(dueTasks);
    const url = '/?tab=cleaning';
    const pushResult = await sendPushToProfile({
      profileId,
      title: reminder.title,
      body: reminder.body,
      url,
      extraData: {
        type: 'cleaning-due',
        targetDate: targetDateKey,
        count: String(dueTasks.length)
      }
    });

    await writeInAppNotification({
      profileId,
      text: reminder.inAppText,
      data: {
        type: 'cleaning-due',
        targetDate: targetDateKey,
        count: dueTasks.length,
        tasks: dueTasks.map((task) => task.taskName),
        url
      }
    });

    return sendJson(200, {
      ok: true,
      profileId,
      targetDate: targetDateKey,
      sent: pushResult.sent,
      failed: pushResult.failed,
      invalidSubscriptionsRemoved: pushResult.invalidSubscriptionsRemoved,
      failures: pushResult.failures,
      dueTasks
    });
  } catch (error) {
    return sendJson(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
