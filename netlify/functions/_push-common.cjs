const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const webpush = require('web-push');

const getPushCollectionPath = (profileId) =>
  profileId === 'giemmale' ? 'pushSubscriptions' : `profiles/${profileId}/pushSubscriptions`;
const getNotificationsCollectionPath = (profileId) =>
  profileId === 'giemmale' ? 'notifications' : `profiles/${profileId}/notifications`;
const getCollectionPath = (profileId, collectionName) =>
  profileId === 'giemmale' ? collectionName : `profiles/${profileId}/${collectionName}`;

const DEFAULT_PUSH_NOTIFICATION_PREFERENCES = {
  events: true,
  cleaning: true,
  shopping: true,
  weeklyMenu: true
};

const normalizePushPreferences = (rawPreferences = {}) => {
  const base = { ...DEFAULT_PUSH_NOTIFICATION_PREFERENCES };
  if (!rawPreferences || typeof rawPreferences !== 'object') return base;

  for (const key of Object.keys(DEFAULT_PUSH_NOTIFICATION_PREFERENCES)) {
    if (typeof rawPreferences[key] === 'boolean') {
      base[key] = rawPreferences[key];
    }
  }
  return base;
};

const getSettingsDocPaths = (profileId) => {
  const paths = [`profiles/${profileId}/metadata/settings`];
  if (profileId === 'giemmale') {
    paths.push('metadata/settings');
  }
  return paths;
};

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

const getPushNotificationPreferences = async (profileId) => {
  const firestore = getFirestoreClient();
  const paths = getSettingsDocPaths(profileId);

  for (const path of paths) {
    const settingsDoc = await firestore.doc(path).get();
    if (!settingsDoc.exists) continue;
    const data = settingsDoc.data() || {};
    const rawPreferences = data.pushNotificationPreferences || data.pushPreferences || {};
    return {
      preferences: normalizePushPreferences(rawPreferences),
      sourcePath: path
    };
  }

  return {
    preferences: { ...DEFAULT_PUSH_NOTIFICATION_PREFERENCES },
    sourcePath: null
  };
};

const isPushTypeEnabled = async ({ profileId, type }) => {
  const { preferences, sourcePath } = await getPushNotificationPreferences(profileId);
  const enabled = Boolean(preferences[type]);
  return { enabled, preferences, sourcePath };
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

const writeInAppNotification = async ({ profileId, text, data = {} }) => {
  const firestore = getFirestoreClient();
  const collectionPath = getNotificationsCollectionPath(profileId);
  const docId = `push-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await firestore.collection(collectionPath).doc(docId).set({
    text,
    timestamp: Date.now(),
    read: false,
    source: 'push',
    ...data
  });
};

const isUnauthorized = (event) => {
  const expectedApiKey = process.env.PUSH_TEST_API_KEY;
  if (!expectedApiKey) return false;

  const headers = event?.headers || {};
  const fromHeader = headers['x-api-key'] || headers['X-API-Key'];
  const auth = headers.authorization || '';
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
  getSubscriptionsDebug,
  getFirestoreClient,
  getCollectionPath,
  writeInAppNotification,
  getPushNotificationPreferences,
  isPushTypeEnabled,
  DEFAULT_PUSH_NOTIFICATION_PREFERENCES
};
