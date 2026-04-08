const { sendJson } = require('./_push-common.cjs');
const { handler: sendShoppingReminderHandler } = require('./push-send-shopping-reminder.cjs');

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

const parseWeekdays = (rawValue, fallback) => {
  const raw = String(rawValue || '').trim();
  const value = raw || fallback;
  return new Set(
    value
      .split(',')
      .map((day) => day.trim().slice(0, 3).toUpperCase())
      .filter(Boolean)
  );
};

const getHourInTimeZone = (dateObj, timeZone) =>
  Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hour12: false
    }).format(dateObj)
  );

const getWeekdayInTimeZone = (dateObj, timeZone) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short'
  })
    .format(dateObj)
    .slice(0, 3)
    .toUpperCase();

const getDateKeyInTimeZone = (dateObj, timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj);

const invokeShoppingReminder = async ({ profileId, timeZone }) => {
  const fakeEvent = {
    httpMethod: 'POST',
    headers: process.env.PUSH_TEST_API_KEY ? { 'x-api-key': process.env.PUSH_TEST_API_KEY } : {},
    body: JSON.stringify({ profileId, timeZone })
  };

  const response = await sendShoppingReminderHandler(fakeEvent);
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
    const timeZone = String(process.env.PUSH_SHOPPING_REMINDER_TIME_ZONE || 'Europe/Rome').trim() || 'Europe/Rome';
    const targetHourLocal = parseHour(process.env.PUSH_SHOPPING_REMINDER_HOUR_LOCAL, 17);
    const targetDays = parseWeekdays(process.env.PUSH_SHOPPING_REMINDER_DAYS, 'Tue,Fri');
    const profileIds = parseProfileIds(
      process.env.PUSH_SHOPPING_REMINDER_PROFILE_IDS || process.env.PUSH_EVENTS_DUE_PROFILE_IDS
    );

    const now = new Date();
    const localHour = getHourInTimeZone(now, timeZone);
    const localWeekday = getWeekdayInTimeZone(now, timeZone);
    const runDate = getDateKeyInTimeZone(now, timeZone);

    if (localHour !== targetHourLocal || !targetDays.has(localWeekday)) {
      return sendJson(200, {
        ok: true,
        scheduled: true,
        skipped: true,
        reason: `Ora/giorno locale (${localWeekday} ${localHour}) fuori finestra shopping.`,
        timeZone,
        runDate,
        localHour,
        localWeekday,
        targetHourLocal,
        targetDays: [...targetDays]
      });
    }

    const results = [];
    for (const profileId of profileIds) {
      const runResult = await invokeShoppingReminder({ profileId, timeZone });
      const body = runResult.body || {};
      results.push({
        profileId,
        statusCode: runResult.statusCode,
        ok: Boolean(body.ok),
        sent: Number(body.sent || 0),
        failed: Number(body.failed || 0),
        pendingItems: Number(body.pendingItems || 0),
        disabledByUser: Boolean(body.disabledByUser),
        message: body.message || null,
        error: body.error || null
      });
    }

    return sendJson(200, {
      ok: true,
      scheduled: true,
      timeZone,
      runDate,
      localHour,
      localWeekday,
      targetHourLocal,
      targetDays: [...targetDays],
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
