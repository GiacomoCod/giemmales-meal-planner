/* global importScripts, firebase */

importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBCl1UWI3S_Jw9iGXvCY32wloLz_ai7kds',
  authDomain: 'meal-planner-vibe.firebaseapp.com',
  projectId: 'meal-planner-vibe',
  storageBucket: 'meal-planner-vibe.firebasestorage.app',
  messagingSenderId: '981656795010',
  appId: '1:981656795010:web:85c81b8e8d72b9a10a419b'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'VibesPlanning';
  const body = payload.notification?.body || 'Hai un nuovo promemoria.';
  const url = payload.data?.url || '/';

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(targetUrl));
});
