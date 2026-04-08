const {
  isUnauthorized,
  parseBody,
  sendJson,
  sendPushToProfile,
  writeInAppNotification,
  isPushTypeEnabled
} = require('./_push-common.cjs');

const REMINDER_TEMPLATES = {
  'meal-plan': {
    title: 'Promemoria Menu',
    body: 'Controlla il menu di oggi prima di cena.',
    url: '/'
  },
  shopping: {
    title: 'Promemoria Spesa',
    body: 'Hai elementi nella lista della spesa da controllare.',
    url: '/?tab=shopping'
  },
  'weekly-plan': {
    title: 'Pianificazione Settimanale',
    body: 'Aggiorna il menu della prossima settimana.',
    url: '/?tab=planner'
  }
};

const REMINDER_PREFERENCE_BY_TYPE = {
  shopping: 'shopping',
  'weekly-plan': 'weeklyMenu',
  'meal-plan': 'weeklyMenu'
};

const REMINDER_EMOJI_BY_TYPE = {
  shopping: '🛒',
  'weekly-plan': '🍽️',
  'meal-plan': '🍽️'
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
    const reminderType = String(payload.reminderType || 'meal-plan').trim();

    if (!profileId) {
      return sendJson(400, { ok: false, error: 'profileId is required' });
    }

    if (!REMINDER_TEMPLATES[reminderType]) {
      return sendJson(400, {
        ok: false,
        error: `reminderType non valido: ${reminderType}`,
        allowed: Object.keys(REMINDER_TEMPLATES)
      });
    }

    const preferenceType = REMINDER_PREFERENCE_BY_TYPE[reminderType];
    if (preferenceType) {
      const preferenceCheck = await isPushTypeEnabled({ profileId, type: preferenceType });
      if (!preferenceCheck.enabled) {
        return sendJson(200, {
          ok: true,
          profileId,
          reminderType,
          sent: 0,
          disabledByUser: true,
          notificationType: preferenceType,
          message: `Notifiche ${preferenceType} disattivate nelle impostazioni.`
        });
      }
    }

    const template = REMINDER_TEMPLATES[reminderType];
    const title = String(payload.title || template.title).trim();
    const body = String(payload.body || template.body).trim();
    const url = String(payload.url || template.url).trim();

    const result = await sendPushToProfile({
      profileId,
      title,
      body,
      url,
      extraData: { reminderType }
    });
    const emoji = REMINDER_EMOJI_BY_TYPE[reminderType] || '🔔';
    await writeInAppNotification({
      profileId,
      text: `${emoji} ${body}`,
      data: {
        type: 'push-reminder',
        reminderType,
        url
      }
    });

    return sendJson(200, {
      ok: true,
      profileId,
      reminderType,
      sent: result.sent,
      failed: result.failed,
      invalidSubscriptionsRemoved: result.invalidSubscriptionsRemoved,
      failures: result.failures,
      message: result.message
    });
  } catch (error) {
    return sendJson(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
