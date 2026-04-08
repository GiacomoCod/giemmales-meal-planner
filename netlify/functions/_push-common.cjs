const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const webpush = require('web-push');

const getPushCollectionPath = (profileId) =>
  profileId === 'giemmale' ? 'pushSubscriptions' : `profiles/${profileId}/pushSubscriptions`;

const parseServiceAccount = (rawValue) => {
  if (!rawValue) return null;

  const parsed =
    rawValue.trim().startsWith('{')
      ? JSON.parse(rawValue)
      : JSON.parse(Buffer.from(rawValue, 'base64').toString('utf-8'));

  const projectId = parsed.project_id || parsed.projectId;
  const clientEmail = parsed.client_email || parsed.clientEmail;
  const privateKeyRaw = parsed.private_key || parsed.privateKey;
  const privateKey = typeof privateKeyRaw === 'string' ? privateKeyRaw.replace(/\\n/g, '\n') : '';

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON incompleto: servono project_id, client_email, private_key');
  }

  return { projectId, clientEmail, privateKey };
};

const getAdminApp = () => {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = parseServiceAccount(serviceAccountJson);
    return initializeApp({ credential: cert(serviceAccount) });
  }

  return initializeApp({ credential: applicationDefault() });
};

const getFirestoreClient = () => {
  const app = getAdminApp();
  return getFirestore(app);
};

const configureWebPush = () => {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || process.env.VITE_FIREBASE_VAPID_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:no-reply@example.com';

  if (!publicKey || !privateKey) {
    throw new Error(
      'Mancano WEB_PUSH_VAPID_PUBLIC_KEY e/o WEB_PUSH_VAPID_PRIVATE_KEY nelle environment variables.'
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
};

const listSubscriptions = async (profileId) => {
  const firestore = getFirestoreClient();
  const collectionPath = getPushCollectionPath(profileId);
  const snapshot = await firestore
    .collection(collectionPath)
    .where('enabled', '==', true)
    .limit(500)
    .get();

  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data();
      if (!data?.endpoint || !data?.keys?.p256dh || !data?.keys?.auth) return null;

      return {
        docRef: docSnap.ref,
        meta: {
          userAgent: data.userAgent || null,
          platform: data.platform || null,
          updatedAt: data.updatedAt || null
        },
        subscription: {
          endpoint: data.endpoint,
          keys: {
            p256dh: data.keys.p256dh,
            auth: data.keys.auth
          }
        }
      };
    })
    .filter(Boolean);
};

const sendPushToProfile = async ({ profileId, title, body, url, extraData = {} }) => {
  configureWebPush();
  const subscriptions = await listSubscriptions(profileId);
  if (subscriptions.length === 0) {
    return {
      sent: 0,
      failed: 0,
      invalidSubscriptionsRemoved: 0,
      failures: [],
      message: 'Nessun dispositivo registrato.'
    };
  }

  const payload = JSON.stringify({
    title,
    body,
    url,
    ...extraData
  });

  const failures = [];
  const deleteInvalidPromises = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async ({ docRef, subscription, meta }) => {
      try {
        await webpush.sendNotification(subscription, payload, {
          TTL: 60,
          urgency: 'high'
        });
        sent += 1;
      } catch (error) {
        const statusCode = error?.statusCode || 0;
        const message = error?.message || 'Unknown web-push error';
        failures.push({
          endpoint: subscription.endpoint,
          platform: meta?.platform || null,
          statusCode,
          message
        });

        if (statusCode === 404 || statusCode === 410) {
          deleteInvalidPromises.push(docRef.delete());
        }
      }
    })
  );

  if (deleteInvalidPromises.length > 0) {
    await Promise.allSettled(deleteInvalidPromises);
  }

  return {
    sent,
    failed: failures.length,
    invalidSubscriptionsRemoved: deleteInvalidPromises.length,
    failures
  };
};

const getSubscriptionsDebug = async (profileId) => {
  const subscriptions = await listSubscriptions(profileId);
  return subscriptions.map(({ subscription, meta }) => ({
    endpoint: subscription.endpoint,
    platform: meta?.platform || null,
    userAgent: meta?.userAgent || null,
    updatedAt: meta?.updatedAt || null
  }));
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

module.exports = {
  isUnauthorized,
  parseBody,
  sendJson,
  sendPushToProfile,
  getSubscriptionsDebug
};
