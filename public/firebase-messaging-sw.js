// Firebase Cloud Messaging Service Worker for background Web Push Notifications
// Qaem Hajj & Umrah Campaign

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD3cB0J2RWY034Vi2reTQAC3CcxvtNyPsg",
  projectId: "gen-lang-client-0665824713",
  messagingSenderId: "435058479054",
  appId: "1:435058479054:web:604fa767e54c23cea4e59f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'قافلة القائم للحج والعمرة';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'لديك توجيه أو إشعار جديد في بوابة الحاج.',
    icon: '/assets/aistudio/Screenshot_20261107_174409_com_instagram_android_InstagramMainActivity_441b738d.png',
    badge: '/assets/aistudio/Screenshot_20261107_174409_com_instagram_android_InstagramMainActivity_441b738d.png',
    dir: 'rtl',
    lang: 'ar',
    tag: payload.data?.tag || 'qaem-notification',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
