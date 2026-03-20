// ===== Основная логика приложения =====

var TOTAL_DAYS = 13;
var activeDay = 1;

function getRead() {
  try { return JSON.parse(localStorage.getItem('nesiim-read') || '{}'); } catch(e) { return {}; }
}

function setRead(n) {
  var r = getRead();
  if (!r[n]) {
    r[n] = true;
    localStorage.setItem('nesiim-read', JSON.stringify(r));
    updateReadUI();
  }
}

function toggleRead(n) {
  var r = getRead();
  r[n] = !r[n];
  localStorage.setItem('nesiim-read', JSON.stringify(r));
  updateReadUI();
}

function resetProgress() {
  localStorage.removeItem('nesiim-read');
  updateReadUI();
}

var _visitCount = null;

function updateVisitCounter(lang) {
  var el = document.getElementById('visit-counter');
  if (!el || _visitCount === null) return;
  if (lang === 'he') {
    el.textContent = 'מבקרים: ' + _visitCount;
  } else if (lang === 'de') {
    el.textContent = 'Besucher: ' + _visitCount;
  } else {
    el.textContent = 'Посетителей: ' + _visitCount;
  }
}

function updateReadUI() {
  var r = getRead();
  var cnt = 0;
  for (var i = 1; i <= TOTAL_DAYS; i++) {
    var done = !!r[i];
    if (done) cnt++;
    var btn = document.getElementById('rb' + i);
    if (btn) {
      btn.classList.toggle('done', done);
      btn.textContent = done ? '✓ Прочитано' : '○ Не прочитано';
    }
    var nb = document.querySelectorAll('.nb')[i - 1];
    if (nb) nb.classList.toggle('read', done);
  }
  document.getElementById('prog-fill').style.width = (cnt / TOTAL_DAYS * 100) + '%';
  document.getElementById('prog-label').textContent = cnt + ' / ' + TOTAL_DAYS;
}

function checkScrollRead() {
  var r = getRead();
  if (r[activeDay]) return;
  var scrolled = window.scrollY + window.innerHeight;
  var total = document.documentElement.scrollHeight;
  if (total - scrolled <= 100) {
    setRead(activeDay);
  }
}

window.addEventListener('scroll', checkScrollRead, { passive: true });

function show(n) {
  document.querySelectorAll('.day').forEach(function(d){ d.classList.remove('on'); });
  document.querySelectorAll('.nb').forEach(function(b){ b.classList.remove('on'); });
  document.getElementById('d' + n).classList.add('on');
  document.querySelectorAll('.nb')[n - 1].classList.add('on');
  activeDay = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setLang(l) {
  // Update lang buttons
  document.querySelectorAll('.lbtn').forEach(function(b) {
    b.classList.toggle('on', b.getAttribute('data-lang') === l);
  });
  // Show/hide content by data-lang attribute (skip lang buttons themselves)
  ['ru', 'de', 'he', 'uk'].forEach(function(lang) {
    document.querySelectorAll('[data-lang="' + lang + '"]').forEach(function(el) {
      if (!el.classList.contains('lbtn')) {
        el.style.display = (lang === l) ? '' : 'none';
      }
    });
  });
  // Hebrew-only mode: apply/remove body class for CSS layout (single column)
  document.body.classList.toggle('lang-he', l === 'he');
  // Update day labels (dlabel)
  var dlabels = l === 'he' ? DLABEL_HE : l === 'de' ? DLABEL_DE : l === 'uk' ? DLABEL_UK : DLABEL_RU;
  document.querySelectorAll('.dlabel').forEach(function(el, i) {
    if (i < dlabels.length) el.textContent = dlabels[i];
  });
  // Update scripture references (.ref) — swap book name per language
  document.querySelectorAll('.ref').forEach(function(el) {
    var txt = el.textContent
      .replace(/בְּמִדְבַּר|Bamidbar|Бемидбар|Бемідбар/g, 'X');
    var bookName = l === 'he' ? 'בְּמִדְבַּר' : l === 'de' ? 'Bamidbar' : l === 'uk' ? 'Бемідбар' : 'Бемидбар';
    el.textContent = txt.replace('X', bookName);
  });
  // Update read buttons
  var readText = l === 'he' ? '✓ נקרא' : l === 'de' ? '✓ Gelesen' : l === 'uk' ? '✓ Прочитано' : '✓ Прочитано';
  document.querySelectorAll('.read-btn').forEach(function(btn) {
    btn.textContent = readText;
  });
  // Update reset button
  var resetEl = document.querySelector('.reset-btn');
  if (resetEl) resetEl.textContent = l === 'he' ? '↺ איפוס' : l === 'de' ? '↺ Reset' : l === 'uk' ? '↺ Скинути' : '↺ Сброс';
  // Update intro band label (exists only in day 1)
  document.querySelectorAll('.intro-label').forEach(function(el) {
    if (l === 'he') el.textContent = 'פסוקי פתיחה · נקראים ביום הראשון';
    else if (l === 'de') el.textContent = 'Einleitungsverse · werden am ersten Tag gelesen';
    else if (l === 'uk') el.textContent = 'Вступні вірші · читаються в перший день';
    else el.textContent = 'Вводные стихи · читаются в первый день';
  });
  // Update prayer box titles (.ptb)
  document.querySelectorAll('.ptb').forEach(function(el) {
    if (l === 'he') el.textContent = 'יְהִי רָצוֹן';
    else if (l === 'de') el.textContent = 'יְהִי רָצוֹן — Gebet';
    else if (l === 'uk') el.textContent = 'יְהִי רָצוֹן — Молитва';
    else el.textContent = 'יְהִי רָצוֹן — Молитва';
  });
  // Update column header for translation column
  document.querySelectorAll('.col-h .ch:last-child').forEach(function(el) {
    if (l === 'de') el.textContent = 'Übersetzung';
    else if (l === 'uk') el.textContent = 'Переклад';
    else el.textContent = 'Перевод';
  });
  // Re-apply read state (textContent was overwritten for read-btns)
  updateReadUI();
  // Update visitor counter label for current language
  updateVisitCounter(l);
  // Update notification banner text if visible
  if (window._updateNotifBannerLang) window._updateNotifBannerLang(l);
  // Sync language select in settings panel
  var langSel = document.getElementById('lang-sel');
  if (langSel) langSel.value = l;
  // Update settings labels for current language
  var langLabel = document.getElementById('lang-label');
  if (langLabel) langLabel.textContent = l === 'he' ? 'שפה' : l === 'de' ? 'Sprache' : l === 'uk' ? 'Мова' : 'Язык';
  var fontLabel = document.getElementById('font-label');
  if (fontLabel) fontLabel.textContent = l === 'he' ? 'גופן' : l === 'de' ? 'Schriftart' : l === 'uk' ? 'Шрифт' : 'Вид шрифта';
  var fsLabel = document.querySelector('#settings-panel .settings-group label');
  if (fsLabel) {
    var fsSpan = document.getElementById('fs-val');
    var fsText = l === 'he' ? 'גודל גופן' : l === 'de' ? 'Schriftgröße' : l === 'uk' ? 'Розмір шрифту' : 'Размер шрифта';
    fsLabel.innerHTML = fsText + ' <span id="fs-val">' + (fsSpan ? fsSpan.textContent : '100%') + '</span>';
  }
  // Save language preference
  try { localStorage.setItem('nesiim-lang', l); } catch(e) {}
}

var BASE_FONT_SIZE_PX = 16;

var FONTS = {
  crimson: "'Crimson Pro', Georgia, serif",
  noto: "'Noto Serif Hebrew', 'Frank Ruhl Libre', serif",
  stam: "'Stam Ashkenaz CLM', 'Noto Serif Hebrew', serif",
  frank: "'Frank Ruhl Libre', serif",
  georgia: "Georgia, 'Times New Roman', serif",
  arial: "Arial, Helvetica, sans-serif"
};

function toggleTopMenu(e) {
  e.stopPropagation();
  var panel = document.getElementById('top-menu-panel');
  var btn = document.getElementById('top-menu-btn');
  var settings = document.getElementById('settings-panel');
  var isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  btn.classList.toggle('on', !isOpen);
  if (!isOpen) settings.classList.remove('open');
}

function toggleSettingsFromMenu(e) {
  e.stopPropagation();
  document.getElementById('top-menu-panel').classList.remove('open');
  document.getElementById('top-menu-btn').classList.remove('on');
  document.getElementById('settings-panel').classList.toggle('open');
}

function openAbout(e) {
  if (e) e.stopPropagation();
  document.getElementById('top-menu-panel').classList.remove('open');
  document.getElementById('top-menu-btn').classList.remove('on');
  document.getElementById('about-overlay').classList.add('open');
}

function closeAbout() {
  document.getElementById('about-overlay').classList.remove('open');
}

function shareProject(e) {
  if (e) e.stopPropagation();
  document.getElementById('top-menu-panel').classList.remove('open');
  document.getElementById('top-menu-btn').classList.remove('on');
  var url = 'https://nesiim.mychitas.app';
  var title = 'נְשִׂיאִים — Несиим';
  var text = 'Платформа для ежедневного чтения приношений двенадцати вождей в Нисан';
  if (navigator.share) {
    navigator.share({ title: title, text: text, url: url }).catch(function() {});
  } else {
    navigator.clipboard.writeText(url).then(function() {
      showToast('Ссылка скопирована');
    }).catch(function() {
      prompt('Скопируйте ссылку:', url);
    });
  }
}

function showToast(msg) {
  var toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.classList.add('show'); }, 10);
  setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 300); }, 2500);
}

document.addEventListener('click', function(e) {
  var wrap = document.getElementById('top-menu-wrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('top-menu-panel').classList.remove('open');
    document.getElementById('top-menu-btn').classList.remove('on');
    document.getElementById('settings-panel').classList.remove('open');
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeAbout();
    document.getElementById('top-menu-panel').classList.remove('open');
    document.getElementById('top-menu-btn').classList.remove('on');
    document.getElementById('settings-panel').classList.remove('open');
  }
});

function applyFontSize(val) {
  document.getElementById('fs-val').textContent = val + '%';
  document.getElementById('fs-slider').value = val;
  document.documentElement.style.fontSize = (val / 100 * BASE_FONT_SIZE_PX) + 'px';
  try { localStorage.setItem('nesiim-fs', val); } catch(e) {}
}

function applyFont(val) {
  var fontFamily = FONTS[val] || FONTS.crimson;
  document.body.style.fontFamily = fontFamily;
  document.querySelectorAll('.rc, .pru').forEach(function(el) {
    el.style.fontFamily = fontFamily;
  });
  try { localStorage.setItem('nesiim-font', val); } catch(e) {}
}

(function() {
  // Increment visit count once per browser session using external CounterAPI
  var _alreadyVisited = sessionStorage.getItem('nesiim-visited');
  if (!_alreadyVisited) {
    sessionStorage.setItem('nesiim-visited', '1');
  }
  fetch(_alreadyVisited
    ? 'https://api.counterapi.dev/v1/nesiim/visits'
    : 'https://api.counterapi.dev/v1/nesiim/visits/up')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _visitCount = data.count;
      var langSel = document.getElementById('lang-sel');
      updateVisitCounter(langSel ? langSel.value : 'ru');
    })
    .catch(function() {});
  // Detect language: saved preference → browser language → fallback 'ru'
  var _savedLang = null;
  try { _savedLang = localStorage.getItem('nesiim-lang'); } catch(e) {}
  var _browserLang = (navigator.language || navigator.userLanguage || 'ru').toLowerCase().substring(0, 2);
  var _initLang = _savedLang || (['ru','de','he','uk'].indexOf(_browserLang) !== -1 ? _browserLang : 'ru');
  setLang(_initLang);
  updateReadUI();
  var nisan1 = new Date(2026, 2, 19);
  var diff = Math.floor((new Date() - nisan1) / 86400000) + 1;
  if (diff >= 1 && diff <= 13) show(diff);
  setTimeout(checkScrollRead, 100);
  // Restore saved settings
  try {
    var savedFs = localStorage.getItem('nesiim-fs');
    if (savedFs) applyFontSize(savedFs);
    var savedFont = localStorage.getItem('nesiim-font');
    if (savedFont) {
      document.getElementById('font-sel').value = savedFont;
      applyFont(savedFont);
    }
  } catch(e) {}
})();
