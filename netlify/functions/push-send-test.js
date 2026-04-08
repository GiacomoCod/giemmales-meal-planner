import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const DEFAULT_TITLE = 'VibesPlanning';
const DEFAULT_BODY = 'Hai un nuovo promemoria.';
const DEFAULT_URL = '/';

const getPushCollectionPath = (profileId) =>
  profileId === 'giemmale' ? 'pushSubscriptions' : `profiles/${profileId}/pushSubscriptions`;

const getAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return initializeApp({ credential: cert(serviceAccount) });
  }

  return initializeApp({ credential: applicationDefault() });
};

const isUnauthorized = (event) => {
  const expectedApiKey = process.env.PUSH_TEST_API_KEY;
  if (!expectedApiKey) return false;

  const fromHeader = event.headers['x-api-key'];
  const auth = event.headers.authorization || '';
  const bearerToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const providedApiKey = fromHeader || bearerToken;

  return providedApiKey !== expectedApiKey;
};

const parseBody = (event) => {
  if (!event.body) return {};
  return JSON.parse(event.body);
};

const sendJson = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
});

export const handler = async (event) => {
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

    const app = getAdminApp();
    const firestore = getFirestore(app);
    const messaging = getMessaging(app);

    const collectionPath = getPushCollectionPath(profileId);
    const snapshot = await firestore
      .collection(collectionPath)
      .where('enabled', '==', true)
      .limit(500)
      .get();

    const tokens = snapshot.docs
      .map((d) => d.get('token'))
      .filter((token) => typeof token === 'string' && token.length > 0);

    if (tokens.length === 0) {
      return sendJson(200, {
        ok: true,
        profileId,
        sent: 0,
        failed: 0,
        invalidTokensRemoved: 0,
        message: 'Nessun dispositivo registrato.'
      });
    }

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: {
        fcmOptions: { link: url }
      },
      data: { url }
    });

    const invalidTokenCodes = new Set([
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered'
    ]);

    const invalidTokens = [];
    response.responses.forEach((item, index) => {
      if (!item.success && item.error?.code && invalidTokenCodes.has(item.error.code)) {
        invalidTokens.push(tokens[index]);
      }
    });

    if (invalidTokens.length > 0) {
      const deletePromises = invalidTokens.map((token) =>
        firestore.collection(collectionPath).doc(encodeURIComponent(token)).delete()
      );
      await Promise.allSettled(deletePromises);
    }

    return sendJson(200, {
      ok: true,
      profileId,
      sent: response.successCount,
      failed: response.failureCount,
      invalidTokensRemoved: invalidTokens.length
    });
  } catch (error) {
    return sendJson(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
