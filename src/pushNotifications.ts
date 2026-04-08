import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import { app, db } from './firebase';

type PushPermissionState = NotificationPermission | 'unsupported';

type PushStatus = {
  supported: boolean;
  permission: PushPermissionState;
  subscribed: boolean;
};

const MESSAGING_SW_PATH = '/firebase-messaging-sw.js';
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
let messagingInstancePromise: Promise<Messaging | null> | null = null;

const getPushCollectionPath = (profileId: string) =>
  profileId === 'giemmale' ? 'pushSubscriptions' : `profiles/${profileId}/pushSubscriptions`;

const getPushDocId = (token: string) => encodeURIComponent(token);

export const isPushSupportedInBrowser = () => {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
};

const getMessagingInstance = async () => {
  if (!messagingInstancePromise) {
    messagingInstancePromise = (async () => {
      if (!isPushSupportedInBrowser()) return null;
      const messagingSupported = await isSupported();
      if (!messagingSupported) return null;
      return getMessaging(app);
    })();
  }

  return messagingInstancePromise;
};

const getServiceWorkerRegistration = async () => {
  const registration = await navigator.serviceWorker.register(MESSAGING_SW_PATH);
  await navigator.serviceWorker.ready;
  return registration;
};

const ensureVapidKey = () => {
  if (!vapidKey) {
    throw new Error('Manca VITE_FIREBASE_VAPID_KEY. Aggiungila nel file .env.local.');
  }
  return vapidKey;
};

const getCurrentToken = async () => {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const registration = await getServiceWorkerRegistration();
  const token = await getToken(messaging, {
    vapidKey: ensureVapidKey(),
    serviceWorkerRegistration: registration
  });

  return token || null;
};

const saveTokenToFirestore = async (profileId: string, userId: string, token: string) => {
  const path = getPushCollectionPath(profileId);
  await setDoc(
    doc(db, path, getPushDocId(token)),
    {
      token,
      userId,
      profileId,
      enabled: true,
      permission: Notification.permission,
      userAgent: navigator.userAgent,
      language: navigator.language || 'it-IT',
      platform: navigator.platform || 'web',
      updatedAt: Date.now()
    },
    { merge: true }
  );
};

const deleteTokenFromFirestore = async (profileId: string, token: string) => {
  const path = getPushCollectionPath(profileId);
  await deleteDoc(doc(db, path, getPushDocId(token)));
};

export const getPushStatus = async (profileId: string): Promise<PushStatus> => {
  if (!isPushSupportedInBrowser()) {
    return { supported: false, permission: 'unsupported', subscribed: false };
  }

  const permission = Notification.permission;
  if (permission !== 'granted') {
    return { supported: true, permission, subscribed: false };
  }

  const token = await getCurrentToken();
  if (!token) {
    return { supported: true, permission, subscribed: false };
  }

  const path = getPushCollectionPath(profileId);
  const tokenDoc = await getDoc(doc(db, path, getPushDocId(token)));
  return { supported: true, permission, subscribed: tokenDoc.exists() };
};

export const subscribeToPush = async (profileId: string, userId: string) => {
  if (!isPushSupportedInBrowser()) {
    throw new Error('Questo browser non supporta le notifiche push.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permesso notifiche non concesso.');
  }

  const token = await getCurrentToken();
  if (!token) {
    throw new Error('Impossibile ottenere il token push.');
  }

  await saveTokenToFirestore(profileId, userId, token);
  return token;
};

export const unsubscribeFromPush = async (profileId: string) => {
  const messaging = await getMessagingInstance();
  if (!messaging) return;

  const token = await getCurrentToken();
  if (token) {
    await deleteTokenFromFirestore(profileId, token);
  }

  await deleteToken(messaging);
};
