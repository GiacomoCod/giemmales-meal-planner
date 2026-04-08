const { isUnauthorized, parseBody, sendJson, sendPushToProfile } = require('./_push-common.cjs');

const DEFAULT_TITLE = 'VibesPlanning';
const DEFAULT_BODY = 'Hai un nuovo promemoria.';
const DEFAULT_URL = '/';

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
    const title = String(payload.title || DEFAULT_TITLE).trim();
    const body = String(payload.body || DEFAULT_BODY).trim();
    const url = String(payload.url || DEFAULT_URL).trim();

    if (!profileId) {
      return sendJson(400, { ok: false, error: 'profileId is required' });
    }

    const result = await sendPushToProfile({ profileId, title, body, url });

    return sendJson(200, {
      ok: true,
      profileId,
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
