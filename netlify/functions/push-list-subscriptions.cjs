const { isUnauthorized, parseBody, sendJson, getSubscriptionsDebug } = require('./_push-common.cjs');

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
    if (!profileId) {
      return sendJson(400, { ok: false, error: 'profileId is required' });
    }

    const subscriptions = await getSubscriptionsDebug(profileId);
    return sendJson(200, {
      ok: true,
      profileId,
      count: subscriptions.length,
      subscriptions
    });
  } catch (error) {
    return sendJson(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
