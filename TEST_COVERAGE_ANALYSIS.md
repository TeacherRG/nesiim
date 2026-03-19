# Test Coverage Analysis — Nesiim

**Current coverage: 0%** — no tests exist in the repository.

This document analyses every testable unit in the codebase and prioritises where
to invest testing effort first.

---

## 1. Project at a Glance

| File | Lines | Exported / Public API |
|---|---|---|
| `notifications.js` | 156 | `shouldShowBanner`, `dismissBanner`, `requestAndSchedule`, `initNotifications` + 3 private helpers |
| `sw.js` | 51 | Service Worker event handlers (`message`, `notificationclick`, `install`, `activate`) |
| `index.html` (JS section) | ~350 | 14 functions + scroll listener |

Recommended test framework: **[Vitest](https://vitest.dev/)** (zero-config, ESM-native,
runs in Node — no browser needed for pure-logic tests; add
[happy-dom](https://github.com/capricorn86/happy-dom) for DOM tests).

---

## 2. High-Priority Areas

### 2.1 `notifications.js` — Date & scheduling logic

These are pure-ish functions with clear inputs/outputs and no UI dependency.
They are the easiest to unit-test and contain the most subtle bugs.

#### `getNext10am()` (private, but worth exporting for tests)

| Test case | Why it matters |
|---|---|
| Called before 10 AM on a weekday → returns same day at 10:00 | Happy path |
| Called after 10 AM on a weekday → returns **next** calendar day at 10:00 | Off-by-one; the `if (next <= now)` branch |
| Called on Friday after 10 AM → next valid day is **Sunday** (skips Saturday) | Saturday-skip loop |
| Called on **Saturday at any time** → skips to Sunday | Edge case: same-day Saturday |
| Called on the **last day** of the active window after 10 AM → returns `null` | Window boundary |
| Called **after** `ACTIVE_END` → returns `null` | Outside-window guard |

#### `isInActiveWindow()` (private)

| Test case |
|---|
| Date within window → `true` |
| Date equals `ACTIVE_START` exactly → `true` (inclusive boundary) |
| Date equals `ACTIVE_END` exactly → `true` (inclusive boundary) |
| Date one millisecond before start → `false` |
| Date one millisecond after end → `false` |

#### `msUntilNext10am()`

| Test case |
|---|
| Returns positive number when inside window and a valid next slot exists |
| Returns `null` when `getNext10am()` returns `null` |

### 2.2 `notifications.js` — Public API (`shouldShowBanner`)

`shouldShowBanner` combines three independent conditions (browser support,
active window, stored preference). Each branch needs a test:

| Condition to force | Expected return |
|---|---|
| `window.Notification` absent | `false` |
| Outside active window | `false` |
| `Notification.permission === 'granted'` | `false` |
| `Notification.permission === 'denied'` | `false` |
| `localStorage` stores `'dismissed'` | `false` |
| `localStorage` stores `'granted'` | `false` |
| `localStorage` stores `'denied'` | `false` |
| `localStorage` is empty, permission `'default'`, inside window | `true` |
| `localStorage.getItem` throws | `false` (silent catch) |

### 2.3 `notifications.js` — `requestAndSchedule` & `initNotifications`

These are async and depend on browser APIs — test with mocks/stubs:

| Scenario |
|---|
| Permission denied → `localStorage` set to `'denied'`, returns `false` |
| Permission granted → `localStorage` set to `'granted'`, calls `scheduleNext`, returns `true` |
| `Notification` not in `window` → returns `false` immediately |
| `initNotifications` with `stored === 'dismissed'` → exits early, never calls SW |
| `initNotifications` with `permission === 'granted'` → calls `scheduleNext` |
| `initNotifications` outside active window → exits early |

### 2.4 `index.html` JS — Progress tracking (`getRead`, `setRead`, `toggleRead`, `resetProgress`)

These functions are pure localStorage wrappers and highly testable once
extracted to a module.

| Function | Test cases |
|---|---|
| `getRead()` | Returns `{}` on empty storage; parses stored JSON correctly; returns `{}` on malformed JSON (catch) |
| `setRead(n)` | Sets day `n` to `true`; does **not** overwrite an already-read day (guard `if (!r[n])`) |
| `toggleRead(n)` | Flips unread → read; flips read → unread |
| `resetProgress()` | Removes the key from localStorage |

### 2.5 `index.html` JS — `checkScrollRead`

| Test case |
|---|
| Scroll position near bottom (≤ 100 px remaining) → calls `setRead(activeDay)` |
| Day already marked read → `setRead` is **not** called again |
| Scroll position far from bottom → nothing happens |

### 2.6 `sw.js` — Service Worker message handler

The SW can be tested with the
[`service-worker-mock`](https://github.com/zackargyle/service-worker-mock) package.

| Test case |
|---|
| `SCHEDULE` message with valid `delay` → `setTimeout` called with correct delay |
| `SCHEDULE` message fires after delay, inside window → `showNotification` called with correct `lang` title/body |
| `SCHEDULE` message fires after delay, **past** `activeEnd` → `showNotification` **not** called |
| Unknown `type` in message → handler exits silently, no notification |
| `delay < 0` → handler exits silently |
| `lang = 'he'` → Hebrew title and body used |
| `lang` not in lookup → falls back to `'ru'` (the `|| titles.ru` default) |

### 2.7 `index.html` JS — `setLang`

| Test case |
|---|
| Calling `setLang('de')` hides all `[data-lang="ru"]` and `[data-lang="he"]` elements |
| `setLang('he')` adds `lang-he` class to `<body>` |
| `setLang('ru')` removes `lang-he` class from `<body>` |
| Correct `.lbtn` button gets the `on` class |
| `.dlabel` elements are updated with the correct language labels |

---

## 3. Medium-Priority Areas

### 3.1 `show(n)`

| Test case |
|---|
| Removes `.on` from all `.day` elements and adds it only to `#d{n}` |
| Updates `activeDay` variable |
| `window.scrollTo` is called with `{ top: 0, behavior: 'smooth' }` |

### 3.2 `applyFontSize` / `applyFont`

| Test case |
|---|
| `applyFontSize(val)` sets `document.documentElement.style.setProperty('--fs-base', …)` |
| `applyFont('frank')` toggles the correct body class |
| `applyFont` saves the choice to `localStorage` |

### 3.3 `updateReadUI`

Integration test (requires DOM):

| Test case |
|---|
| Correct number of days shown as `done` vs. not |
| Progress bar `width` equals `(count / TOTAL_DAYS * 100)%` |
| `prog-label` text equals `"{count} / {TOTAL_DAYS}"` |

---

## 4. Lower-Priority / Integration Tests

| Area | Notes |
|---|---|
| Full user flow: open page → click day → scroll to bottom → mark as read | Playwright / Puppeteer E2E |
| Language toggle persists across page reload | E2E with localStorage seeding |
| Notification banner appears on first visit inside active window | E2E with mocked `Notification` API |
| Font & font-size preferences persist across reload | E2E |

---

## 5. Suggested Implementation Plan

1. **Set up Vitest + happy-dom** (`npm init -y && npm i -D vitest happy-dom`)
2. **Extract pure JS** from `index.html` into a `src/` module (e.g. `src/progress.js`,
   `src/display.js`) — enables Node-side unit testing without a browser.
3. **Export private helpers** in `notifications.js` under a test-only flag, or
   use Vitest's `vi.importActual` + module patching.
4. Write unit tests for `notifications.js` first (highest ROI, pure logic, no DOM).
5. Add DOM tests for progress tracking and `setLang`.
6. Add SW tests with `service-worker-mock`.
7. (Optional) Add a Playwright E2E suite for the critical user journey.

---

## 6. Summary Table

| Area | Risk if untested | Effort | Priority |
|---|---|---|---|
| `getNext10am` / Saturday skip | Notifications fire on Shabbat or wrong day | Low | **P0** |
| Active-window boundaries | Notifications outside the Nisan window | Low | **P0** |
| `shouldShowBanner` branches | Banner shown/hidden incorrectly | Low | **P0** |
| Progress read/toggle/reset | User progress lost or corrupted | Low | **P0** |
| `requestAndSchedule` / `initNotifications` | Double-scheduling; missed reschedule on reload | Medium | **P1** |
| SW message handler | Silent failure; no notification displayed | Medium | **P1** |
| `setLang` | Content shown in wrong language | Medium | **P1** |
| `show(n)` / `updateReadUI` | UI state desync | Medium | **P2** |
| E2E user journey | Regressions in full flow | High | **P3** |
