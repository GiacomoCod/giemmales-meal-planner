const { sendJson } = require('./_push-common.cjs');
const { handler: sendCleaningDueHandler } = require('./push-send-cleaning-due.cjs');

const addDaysUtc = (dateObj, days) => new Date(dateObj.getTime() + days * 24 * 60 * 60 * 1000);

const parseProfileIds = (rawValue) => {
  const fallback = ['giemmale'];
  const raw = String(rawValue || '').trim();
  if (!raw) return fallback;

  const values = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) return fallback;
  return [...new Set(values)];
};

const parseHour = (rawValue, fallback) => {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 23) return fallback;
  return parsed;
};

const getHourInTimeZone = (dateObj, timeZone) =>
  Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hour12: false
    }).format(dateObj)
  );

const getDateKeyInTimeZone = (dateObj, timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj);

const invokeCleaningDue = async ({ profileId, timeZone, targetDate }) => {
  const fakeEvent = {
    httpMethod: 'POST',
    headers: process.env.PUSH_TEST_API_KEY ? { 'x-api-key': process.env.PUSH_TEST_API_KEY } : {},
    body: JSON.stringify({ profileId, timeZone, targetDate })
  };

  const response = await sendCleaningDueHandler(fakeEvent);
  let body = {};
  try {
    body = response?.body ? JSON.parse(response.body) : {};
  } catch {
    body = {};
  }

  return {
    statusCode: Number(response?.statusCode || 500),
    body
  };
};

exports.handler = async () => {
  try {
    const timeZone = String(process.env.PUSH_CLEANING_DUE_TIME_ZONE || 'Europe/Rome').trim() || 'Europe/Rome';
    const tomorrowHourLocal = parseHour(process.env.PUSH_CLEANING_DUE_HOUR_TOMORROW_LOCAL, 20);
    const todayHourLocal = parseHour(process.env.PUSH_CLEANING_DUE_HOUR_TODAY_LOCAL, 10);
    const profileIds = parseProfileIds(process.env.PUSH_CLEANING_DUE_PROFILE_IDS || process.env.PUSH_EVENTS_DUE_PROFILE_IDS);

    const now = new Date();
    const localHour = getHourInTimeZone(now, timeZone);
    const runDate = getDateKeyInTimeZone(now, timeZone);
    const tomorrowDate = getDateKeyInTimeZone(addDaysUtc(now, 1), timeZone);

    const windows = [];
    if (localHour === todayHourLocal) {
      windows.push({ type: 'cleaning-today', targetDate: runDate });
    }
    if (localHour === tomorrowHourLocal) {
      windows.push({ type: 'cleaning-tomorrow', targetDate: tomorrowDate });
    }

    if (windows.length === 0) {
      return sendJson(200, {
        ok: true,
        scheduled: true,
        skipped: true,
        reason: `Ora locale ${localHour} fuori dalle finestre mansioni (${todayHourLocal}, ${tomorrowHourLocal}).`,
        timeZone,
        runDate,
        localHour,
        hours: {
          today: todayHourLocal,
          tomorrow: tomorrowHourLocal
        }
      });
    }

    const results = [];
    for (const window of windows) {
      for (const profileId of profileIds) {
        const runResult = await invokeCleaningDue({ profileId, timeZone, targetDate: window.targetDate });
        const body = runResult.body || {};
        results.push({
          window: window.type,
          profileId,
          statusCode: runResult.statusCode,
          ok: Boolean(body.ok),
          sent: Number(body.sent || 0),
          failed: Number(body.failed || 0),
          targetDate: body.targetDate || window.targetDate,
          dueTasks: Array.isArray(body.dueTasks) ? body.dueTasks.length : 0,
          skippedTasks: Array.isArray(body.skippedTasks) ? body.skippedTasks.length : 0,
          message: body.message || null,
          error: body.error || null
        });
      }
    }

    return sendJson(200, {
      ok: true,
      scheduled: true,
      timeZone,
      runDate,
      localHour,
      windows,
      hours: {
        today: todayHourLocal,
        tomorrow: tomorrowHourLocal
      },
      profiles: profileIds.length,
      results
    });
  } catch (error) {
    return sendJson(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
