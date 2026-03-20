// ===== Инициализация уведомлений (ES module) =====
import { shouldShowBanner, dismissBanner, requestAndSchedule, initNotifications } from '/notifications.js';

function getCurrentLang() {
  var btn = document.querySelector('.lbtn.on');
  return btn ? btn.getAttribute('data-lang') : 'ru';
}

// Update banner text when language switches
window._updateNotifBannerLang = function(lang) {
  var banner = document.getElementById('notif-banner');
  if (!banner || !banner.classList.contains('visible')) return;
  document.getElementById('notif-banner-text').innerHTML = BANNER_TEXTS[lang] || BANNER_TEXTS.ru;
  document.getElementById('notif-allow-btn').textContent = ALLOW_TEXTS[lang] || ALLOW_TEXTS.ru;
  document.getElementById('notif-dismiss-btn').textContent = DISMISS_TEXTS[lang] || DISMISS_TEXTS.ru;
};

window.notifAllow = async function() {
  var lang = getCurrentLang();
  document.getElementById('notif-banner').classList.remove('visible');
  var granted = await requestAndSchedule(lang);
  if (!granted) {
    // Browser denied — nothing more to do
  }
};

window.notifDismiss = function() {
  dismissBanner();
  document.getElementById('notif-banner').classList.remove('visible');
};

// On load: show banner if needed, or re-schedule if already granted
(async function() {
  var lang = getCurrentLang();
  if (shouldShowBanner()) {
    var banner = document.getElementById('notif-banner');
    document.getElementById('notif-banner-text').innerHTML = BANNER_TEXTS[lang] || BANNER_TEXTS.ru;
    document.getElementById('notif-allow-btn').textContent = ALLOW_TEXTS[lang] || ALLOW_TEXTS.ru;
    document.getElementById('notif-dismiss-btn').textContent = DISMISS_TEXTS[lang] || DISMISS_TEXTS.ru;
    banner.classList.add('visible');
  }
  await initNotifications(lang);
})();
