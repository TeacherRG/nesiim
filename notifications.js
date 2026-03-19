/**
 * Nesiim — Daily push notifications module
 *
 * Schedules a browser notification at 10:00 AM in the user's local timezone
 * every day except Saturday (שַׁבָּת).
 *
 * Active window: 1–13 Nisan 5786 = 19–31 March 2026.
 * Update ACTIVE_START / ACTIVE_END manually next year.
 *
 * Public API:
 *   shouldShowBanner()        → bool: whether to display the consent banner
 *   dismissBanner()           → saves "dismissed" preference, hides banner
 *   requestAndSchedule(lang)  → asks for permission and schedules next notification
 *   initNotifications(lang)   → call on page load; re-schedules if already granted
 */

const STORAGE_KEY = 'nesiim-notif';
const SW_PATH = '/sw.js';

// --- Active window ---
// 1–13 Nisan 5786 = 19–31 March 2026
// Update both dates manually next year before Nisan 1.
const ACTIVE_START = new Date(2026, 2, 19);          // 19 March 2026, 00:00:00
const ACTIVE_END   = new Date(2026, 2, 31, 23, 59, 59); // 31 March 2026, 23:59:59

function isInActiveWindow() {
  const now = new Date();
  return now >= ACTIVE_START && now <= ACTIVE_END;
}

// --- Scheduling helpers ---

/**
 * Returns the next Date object representing 10:00:00 AM in local time,
 * skipping Saturday (getDay() === 6), within the active window.
 * Returns null if no eligible time remains in the window.
 */
function getNext10am() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(10, 0, 0, 0);
  // If 10am already passed today, move to tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  // Skip Saturday
  while (next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  // Outside active window — no notification to schedule
  if (next > ACTIVE_END) return null;
  return next;
}

/** Milliseconds until the next eligible 10am, or null if outside window. */
function msUntilNext10am() {
  const next = getNext10am();
  return next ? next - Date.now() : null;
}

// --- Service Worker ---

async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[nesiim/notifications] SW registration failed:', err);
    return null;
  }
}

// --- Core functions ---

/**
 * Schedules the next 10am notification via the Service Worker.
 * @param {string} lang - 'ru' | 'de' | 'he'
 */
async function scheduleNext(lang) {
  if (Notification.permission !== 'granted') return;
  if (!isInActiveWindow()) return;
  const sw = await registerSW();
  if (!sw) return;
  const delay = msUntilNext10am();
  if (delay === null) return; // no eligible day left in the window
  const controller = sw.active || (await navigator.serviceWorker.ready).active;
  if (controller) {
    controller.postMessage({
      type: 'SCHEDULE',
      delay,
      lang: lang || 'ru',
      activeEnd: ACTIVE_END.getTime()
    });
  }
  // Persist scheduled time so it can be checked on next visit
  try {
    const next = getNext10am();
    if (next) localStorage.setItem(STORAGE_KEY + '-next', next.toISOString());
  } catch (_) {}
}

/**
 * Whether the consent banner should be shown to the user.
 */
export function shouldShowBanner() {
  if (!('Notification' in window)) return false;
  if (!isInActiveWindow()) return false;
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== 'dismissed' && stored !== 'granted' && stored !== 'denied';
  } catch (_) {
    return false;
  }
}

/**
 * Saves "dismissed" preference so the banner is not shown again.
 */
export function dismissBanner() {
  try { localStorage.setItem(STORAGE_KEY, 'dismissed'); } catch (_) {}
}

/**
 * Requests notification permission and, if granted, schedules the first notification.
 * @param {string} lang - current UI language
 * @returns {Promise<boolean>} true if permission was granted
 */
export async function requestAndSchedule(lang) {
  if (!('Notification' in window)) return false;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    try { localStorage.setItem(STORAGE_KEY, 'denied'); } catch (_) {}
    return false;
  }
  try { localStorage.setItem(STORAGE_KEY, 'granted'); } catch (_) {}
  await scheduleNext(lang);
  return true;
}

/**
 * Call once on page load. Re-schedules the notification if permission was
 * already granted in a previous session.
 * @param {string} lang - current UI language
 */
export async function initNotifications(lang) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (!isInActiveWindow()) return;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'denied' || stored === 'dismissed') return;
  if (Notification.permission === 'granted') {
    await scheduleNext(lang);
  }
}
