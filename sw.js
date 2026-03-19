// Nesiim — Service Worker for daily push notifications
// Handles notification display and click actions

const NOTIF_TAG = 'nesiim-daily';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Receive scheduling message from main thread
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'SCHEDULE') return;
  const { delay, lang = 'ru', activeEnd = 0 } = e.data;
  if (typeof delay !== 'number' || delay < 0) return;

  setTimeout(() => {
    const now = Date.now();
    // Do not fire if we are past the active window
    if (activeEnd && now > activeEnd) return;

    const titles = {
      ru: 'Несиим — ежедневное чтение',
      de: 'Nesiim — tägliche Lektüre',
      he: 'נְשִׂיאִים — קריאה יומית'
    };
    const bodies = {
      ru: 'Пора читать главу дня! Откройте Несиим.',
      de: 'Zeit für die Tageslesung! Öffne Nesiim.',
      he: '!הגיע זמן קריאת פרק היום. פתחו נְשִׂיאִים'
    };
    self.registration.showNotification(titles[lang] || titles.ru, {
      body: bodies[lang] || bodies.ru,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: NOTIF_TAG,
      renotify: true
    });
  }, delay);
});

// Open or focus the site when notification is clicked
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});
