import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

type PushPermissionState = NotificationPermission | 'unsupported';

type PushStatus = {
  supported: boolean;
  permission: PushPermissionState;
  subscribed: boolean;
};

const MESSAGING_SW_PATH = '/firebase-messaging-sw.js';
const PUSH_SW_SCOPE = '/push-notifications/';
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

const getPushCollectionPath = (profileId: string) =>
  profileId === 'giemmale' ? 'pushSubscriptions' : `profiles/${profileId}/pushSubscriptions`;

const getPushDocId = (endpoint: string) => encodeURIComponent(endpoint);

export const isPushSupportedInBrowser = () => {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

const getServiceWorkerRegistration = async () => {
  const existing = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
  if (existing) return existing;
  return navigator.serviceWorker.register(MESSAGING_SW_PATH, { scope: PUSH_SW_SCOPE });
};

const ensureVapidKey = () => {
  if (!vapidKey) {
    throw new Error('Manca VITE_FIREBASE_VAPID_KEY. Aggiungila nel file .env.local.');
  }
  return vapidKey;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const getCurrentSubscription = async () => {
  const registration = await getServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
};

const saveSubscriptionToFirestore = async (profileId: string, userId: string, subscription: PushSubscription) => {
  const path = getPushCollectionPath(profileId);
  const rawP256dh = subscription.getKey('p256dh');
  const rawAuth = subscription.getKey('auth');
  if (!rawP256dh || !rawAuth) {
    throw new Error('Impossibile leggere le chiavi della subscription push.');
  }

  const p256dh = arrayBufferToBase64(rawP256dh);
  const auth = arrayBufferToBase64(rawAuth);

  await setDoc(
    doc(db, path, getPushDocId(subscription.endpoint)),
    {
      endpoint: subscription.endpoint,
      keys: { p256dh, auth },
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

const deleteSubscriptionFromFirestore = async (profileId: string, endpoint: string) => {
  const path = getPushCollectionPath(profileId);
  await deleteDoc(doc(db, path, getPushDocId(endpoint)));
};

export const getPushStatus = async (profileId: string): Promise<PushStatus> => {
  if (!isPushSupportedInBrowser()) {
    return { supported: false, permission: 'unsupported', subscribed: false };
  }

  const permission = Notification.permission;
  if (permission !== 'granted') {
    return { supported: true, permission, subscribed: false };
  }

  const subscription = await getCurrentSubscription();
  if (!subscription) {
    return { supported: true, permission, subscribed: false };
  }

  const path = getPushCollectionPath(profileId);
  const subDoc = await getDoc(doc(db, path, getPushDocId(subscription.endpoint)));
  return { supported: true, permission, subscribed: subDoc.exists() };
};

export const subscribeToPush = async (profileId: string, userId: string) => {
  if (!isPushSupportedInBrowser()) {
    throw new Error('Questo browser non supporta le notifiche push.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permesso notifiche non concesso.');
  }

  const registration = await getServiceWorkerRegistration();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(ensureVapidKey())
    });
  }

  await saveSubscriptionToFirestore(profileId, userId, subscription);
  return subscription.endpoint;
};

export const unsubscribeFromPush = async (profileId: string) => {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  await deleteSubscriptionFromFirestore(profileId, subscription.endpoint);
  try {
    await subscription.unsubscribe();
  } catch {
    // no-op
  }
};
