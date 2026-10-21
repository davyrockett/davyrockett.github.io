// The app suite (www.davyrockett.com/apps/): one Home Screen icon for all of David's apps.
// - Tells the apps they were opened from here, so each shows an "All apps" button (suite.js in each app).
// - "Make everything work offline": installs every app's own offline copy in one go.
// - One access key for every app that syncs: checks it against each data repo, then saves it the way
//   each app expects (the same browser storage the apps read, since they're all on www.davyrockett.com).
'use strict';

const OWNER = 'davyrockett';
const APPS = [
  ['rundown', 'Rundown'], ['first-frets', 'First Frets'], ['page-fright', 'Page Fright'], ['lip-service', 'Lip Service'],
  ['jam-session', 'Jam Session'], ['memory-lane', 'Memory Lane'], ['song-party', 'Song Party'], ['sos-band-editor', 'SOS Band Editor'],
  ['sos-band', 'SOS Band'], ['ge150-presets', 'GE150 Presets'], ['health-log', 'Health Log'], ['z4-log', 'Z4 Log'],
];

// Where each syncing app keeps its key (and which data repo it uses). Values are stored exactly as each
// app's own Settings screen stores them; "json" = that app keeps its values JSON-encoded.
const SYNCED = [
  { name: 'Health Log', repo: 'health-log-data', token: 'healthlog-sync-token', repoKey: 'healthlog-sync-repo', last: 'healthlog-sync-last' },
  { name: 'Z4 Log', repo: 'z4-log-data', token: 'z4log-sync-token', repoKey: 'z4log-sync-repo', last: 'z4log-sync-last' },
  { name: 'Jam Session', repo: 'jam-session-data', token: 'js.syncToken', repoKey: 'js.syncRepo', last: 'js.syncLast', json: true },
  { name: 'Memory Lane', repo: 'memory-lane-data', token: 'ml.sync-token', last: 'ml.sync-last' },
  { name: 'Song Party', repo: 'song-party-data', token: 'sp.sync-token', last: 'sp.sync-last' },
  { name: 'SOS Band Editor', repo: 'sos-band-data', token: 'sosed.sync-token', last: 'sosed.sync-last' },
  { name: 'GE150 Presets', repo: 'ge150-presets-data', token: 'ge150.sync-token', last: 'ge150.sync-last' },
  { name: 'Rundown', repo: 'rundown-data', token: 'rundown.sync-token', last: 'rundown.sync-last' },
];

const $ = (id) => document.getElementById(id);
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* blocked */ } }
function hasKey(app) {
  const v = lsGet(app.token);
  if (!v) return false;
  if (!app.json) return true;
  try { return Boolean(JSON.parse(v)); } catch { return false; }
}

// Opened from here: apps show their "All apps" button for the rest of this visit.
// (Rundown, a copy of this screen, sets its own address as home instead.)
try {
  sessionStorage.setItem('davyrockett-suite', '1');
  sessionStorage.setItem('davyrockett-suite-home', '/apps/');
} catch { /* blocked */ }

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

/* ---------- Offline ---------- */

async function offlineState(slug) {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration(`/${slug}/`).catch(() => null);
  if (reg && reg.active && new URL(reg.scope).pathname === `/${slug}/`) return 'ready';
  return reg && (reg.installing || reg.waiting) ? 'working' : 'missing';
}

function waitForActive(reg) {
  return new Promise((resolve) => {
    if (reg.active) return resolve(true);
    const sw = reg.installing || reg.waiting;
    if (!sw) return resolve(false);
    const done = () => {
      if (sw.state === 'activated') resolve(true);
      else if (sw.state === 'redundant') resolve(false);
    };
    sw.addEventListener('statechange', done);
    setTimeout(() => resolve(Boolean(reg.active)), 60000);
  });
}

async function renderOffline() {
  const list = $('offline-list');
  const states = await Promise.all(APPS.map(([slug]) => offlineState(slug)));
  list.replaceChildren(...APPS.map(([slug, name], i) => {
    const li = document.createElement('li');
    li.className = `state-${states[i]}`;
    li.innerHTML = '<span class="dot"></span><span class="label"></span>';
    li.querySelector('.label').textContent = name;
    li.title = { ready: 'Works offline', working: 'Downloading…', missing: 'Not downloaded yet', unsupported: '' }[states[i]];
    return li;
  }));
  const missing = states.filter((s) => s !== 'ready').length;
  $('offline-summary').textContent = states[0] === 'unsupported'
    ? 'This browser can’t keep apps offline.'
    : missing ? `${APPS.length - missing} of ${APPS.length} apps work offline on this device.` : 'Every app works offline on this device.';
  $('offline-btn').disabled = !missing || states[0] === 'unsupported';
  $('offline-btn').textContent = missing ? 'Make everything work offline' : 'All set';
}

$('offline-btn').addEventListener('click', async () => {
  const btn = $('offline-btn');
  btn.disabled = true;
  btn.textContent = 'Downloading…';
  for (const [slug] of APPS) {
    if (await offlineState(slug) === 'ready') continue;
    try {
      const reg = await navigator.serviceWorker.register(`/${slug}/sw.js`, { scope: `/${slug}/` });
      renderOffline();
      await waitForActive(reg);
    } catch { /* keep going with the others */ }
    renderOffline();
  }
  await renderOffline();
});

/* ---------- Updates ---------- */

// Each app's saved copy is named "<prefix><version>" (see each app's sw.js).
const CACHE_PREFIX = {
  rundown: 'rundown-v', 'first-frets': 'firstfrets-v', 'page-fright': 'pagefright-v', 'lip-service': 'lipservice-v',
  'jam-session': 'jamsession-v', 'memory-lane': 'memory-lane-v', 'song-party': 'song-party-v', 'sos-band-editor': 'sos-band-editor-v',
  'sos-band': 'sos-band-v', 'ge150-presets': 'presets-v', 'health-log': 'healthlog-v', 'z4-log': 'z4log-v',
};

// Version numbers saved on this device for one app (oldest first). With an update waiting there are two.
async function savedVersions(prefix) {
  const keys = await caches.keys().catch(() => []);
  return keys.filter((k) => k.startsWith(prefix)).map((k) => Number(k.slice(prefix.length))).filter((n) => n > 0).sort((x, y) => x - y);
}

// Waits until a newly found version has finished downloading (or failed).
function waitInstalled(sw) {
  return new Promise((resolve) => {
    if (sw.state !== 'installing') return resolve(sw.state);
    sw.addEventListener('statechange', () => { if (sw.state !== 'installing') resolve(sw.state); });
    setTimeout(() => resolve(sw.state), 60000);
  });
}

const SUITE = ['apps', 'This Apps screen'];
const updateState = {};   // slug -> { reg, status: 'ready' | 'current' | 'latest' | 'checking', from, to }

function updateRow([slug, name]) {
  const s = updateState[slug] || { status: 'checking' };
  const li = document.createElement('li');
  li.className = s.status;
  const icon = slug === 'apps' ? 'icons/icon-192.png' : `../${slug}/icons/icon-192.png`;
  li.innerHTML = `<img src="${icon}" alt=""><span class="name"></span><span class="note"></span>`;
  li.querySelector('.name').textContent = name;
  li.querySelector('.note').textContent = {
    checking: 'checking…',
    ready: s.from && s.to ? `update ready: v${s.from} → v${s.to}` : 'update ready',
    current: s.to ? `up to date · v${s.to}` : 'up to date',
    updated: `updated: v${s.from} → v${s.to}`,
    latest: 'always the latest (not kept offline)',
    error: 'couldn’t check',
  }[s.status];
  if (s.status === 'ready') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn small';
    btn.textContent = 'Update';
    btn.addEventListener('click', () => applyUpdate(slug));
    li.append(btn);
  }
  return li;
}

function renderUpdates() {
  $('update-list').replaceChildren(...[SUITE, ...APPS].map(updateRow));
  const ready = Object.values(updateState).filter((s) => s.status === 'ready').length;
  $('update-all').hidden = ready < 2;
}

async function checkOne(slug) {
  if (slug === 'apps') {
    const reg = await navigator.serviceWorker.getRegistration('/apps/').catch(() => null);
    if (!reg) { updateState.apps = { status: 'latest' }; return; }
    const before = await savedVersions('davyrockett-apps-v');
    try { await reg.update(); } catch { updateState.apps = { status: 'error' }; return; }
    if (reg.installing) await waitInstalled(reg.installing);
    const after = await savedVersions('davyrockett-apps-v');
    const newer = after[after.length - 1] > (before[before.length - 1] || 0);
    // This screen switches to a new version by itself; reloading shows it.
    updateState.apps = newer ? { status: 'ready', from: before[before.length - 1], to: after[after.length - 1] }
      : { status: 'current', to: after[after.length - 1] };
    return;
  }
  const reg = await navigator.serviceWorker.getRegistration(`/${slug}/`).catch(() => null);
  if (!reg || new URL(reg.scope).pathname !== `/${slug}/`) { updateState[slug] = { status: 'latest' }; return; }
  const before = await savedVersions(CACHE_PREFIX[slug]);
  try { await reg.update(); } catch { /* offline: report what's already known */ }
  if (reg.installing) await waitInstalled(reg.installing);
  const v = await savedVersions(CACHE_PREFIX[slug]);
  const was = before[before.length - 1];
  const now = v[v.length - 1];
  // A new version waits only while the app is open somewhere; otherwise it takes over straight away.
  updateState[slug] = reg.waiting ? { status: 'ready', reg, from: v[0], to: now }
    : was && now > was ? { status: 'updated', from: was, to: now }
    : { status: 'current', to: now };
}

let checking = false;
async function checkUpdates() {
  if (checking || !('serviceWorker' in navigator)) return;
  checking = true;
  const msg = $('update-msg');
  if (!navigator.onLine) {
    msg.textContent = 'You’re offline. Connect to the internet to check for updates.';
    checking = false;
    return;
  }
  msg.textContent = 'Checking every app for a newer version…';
  for (const k of Object.keys(updateState)) delete updateState[k];
  renderUpdates();
  await Promise.all([SUITE, ...APPS].map(async ([slug]) => {
    try { await checkOne(slug); } catch { updateState[slug] = { status: 'error' }; }
    renderUpdates();
  }));
  const ready = Object.values(updateState).filter((s) => s.status === 'ready').length;
  const done = Object.values(updateState).filter((s) => s.status === 'updated').length;
  const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  msg.textContent = (ready ? `${ready} update${ready === 1 ? '' : 's'} ready to install. ` : '') +
    (done ? `${done} app${done === 1 ? '' : 's'} updated. ` : '') +
    (ready || done ? `(Checked at ${time}.)` : `Everything is up to date (checked at ${time}).`);
  checking = false;
}

function applyUpdate(slug) {
  const s = updateState[slug];
  if (!s || s.status !== 'ready') return;
  if (slug === 'apps') { location.reload(); return; }
  // Same as tapping "Update" inside the app: switch to the version that's already downloaded.
  if (s.reg && s.reg.waiting) s.reg.waiting.postMessage('skipWaiting');
  updateState[slug] = { status: 'current', to: s.to };
  renderUpdates();
}

$('update-all').addEventListener('click', () => {
  const suiteReady = updateState.apps && updateState.apps.status === 'ready';
  APPS.forEach(([slug]) => applyUpdate(slug));
  $('update-msg').textContent = 'All updated.';
  if (suiteReady) setTimeout(() => location.reload(), 800);
});
$('update-check').addEventListener('click', checkUpdates);

/* ---------- One access key for every app ---------- */

function renderKeys() {
  const list = $('key-list');
  list.replaceChildren(...SYNCED.map((app) => {
    const li = document.createElement('li');
    const on = hasKey(app);
    li.className = on ? 'state-ready' : 'state-missing';
    li.innerHTML = '<span class="dot"></span><span class="label"></span><span class="note"></span>';
    li.querySelector('.label').textContent = app.name;
    li.querySelector('.note').textContent = on ? 'connected' : 'no key';
    return li;
  }));
  $('key-forget').hidden = !SYNCED.some(hasKey);
}

async function checkRepo(repo, token) {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${repo}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
    if (res.status === 401) return 'bad';
    if (!res.ok) return 'no-access';
    const info = await res.json();
    return info.permissions && info.permissions.push ? 'ok' : 'read-only';
  } catch {
    return 'offline';
  }
}

$('key-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('key-input');
  const token = input.value.trim();
  const msg = $('key-msg');
  if (!token) { msg.textContent = 'Paste your access key first.'; return; }
  const btn = $('key-save');
  btn.disabled = true;
  btn.textContent = 'Checking…';
  msg.textContent = '';
  const results = await Promise.all(SYNCED.map((app) => checkRepo(app.repo, token)));
  btn.disabled = false;
  btn.textContent = 'Save for every app';

  if (results.every((r) => r === 'offline')) { msg.textContent = 'Can’t reach GitHub right now. Try again when you’re online.'; return; }
  if (results.every((r) => r === 'bad')) { msg.textContent = 'GitHub didn’t accept that key (mistyped or expired).'; return; }

  const saved = [];
  const skipped = [];
  SYNCED.forEach((app, i) => {
    if (results[i] !== 'ok') { skipped.push(`${app.name} (${{ 'read-only': 'read only', 'no-access': 'not included', bad: 'not accepted', offline: 'couldn’t check' }[results[i]]})`); return; }
    lsSet(app.token, app.json ? JSON.stringify(token) : token);
    if (app.repoKey) lsSet(app.repoKey, app.json ? JSON.stringify(`${OWNER}/${app.repo}`) : `${OWNER}/${app.repo}`);
    lsSet(app.last, null);   // each app does a full sync the next time it opens
    saved.push(app.name);
  });
  input.value = '';
  renderKeys();
  msg.textContent = (saved.length ? `Saved for ${saved.join(', ')}.` : 'Not saved anywhere.') +
    (skipped.length ? ` Not saved for ${skipped.join(', ')}: give the key access to that data repo on GitHub.` : '');
});

$('key-forget').addEventListener('click', () => {
  if (!confirm('Remove the access key from every app on this device? Your data stays on GitHub.')) return;
  SYNCED.forEach((app) => { lsSet(app.token, null); lsSet(app.last, null); });
  $('key-msg').textContent = 'Removed. The apps are view-only on this device until you add a key again.';
  renderKeys();
});

/* ---------- Sharing an app ---------- */

// A small share button on each icon opens a panel with that app's link: Copy, or Share… (the
// device's share sheet) where the browser has one.
const shareSheet = $('share-sheet');
let shareUrl = '';
const SHARE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';

document.querySelectorAll('.grid .tile').forEach((tile) => {
  const name = tile.textContent.trim();
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'share-badge';
  badge.setAttribute('aria-label', `Share ${name}`);
  badge.innerHTML = SHARE_ICON;
  badge.addEventListener('click', () => {
    shareUrl = tile.href;
    $('share-title').textContent = name;
    $('share-icon').src = tile.querySelector('img').src;
    $('share-link').textContent = shareUrl;
    $('share-copy').textContent = 'Copy link';
    if (shareSheet.showModal) shareSheet.showModal(); else shareSheet.setAttribute('open', '');
  });
  tile.parentElement.append(badge);
});

if (navigator.share) {
  $('share-send').hidden = false;
  $('share-send').addEventListener('click', () => {
    navigator.share({ title: $('share-title').textContent, url: shareUrl }).catch(() => { /* closed */ });
  });
}
$('share-copy').addEventListener('click', async () => {
  const btn = $('share-copy');
  try {
    await navigator.clipboard.writeText(shareUrl);
    btn.textContent = 'Copied';
  } catch {
    const range = document.createRange();
    range.selectNodeContents($('share-link'));
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    btn.textContent = 'Selected: copy it';
  }
  setTimeout(() => { btn.textContent = 'Copy link'; }, 2000);
});
$('share-close').addEventListener('click', () => shareSheet.close());
shareSheet.addEventListener('click', (e) => { if (e.target === shareSheet) shareSheet.close(); });

/* ---------- Today (below the icons) ---------- */

// Practice ticks and Z4 ticks live only on this screen: nothing is sent to the apps.
// Practice ticks clear each new day; Z4 ticks stay until that to-do is done in Z4 Log.
const PRACTICE = ['Vocal warm-up', 'Reading', 'Improv'];
const PRACTICE_KEY = 'apps.practice';      // {"date": "2026-10-21", "done": ["Reading"]}
const Z4_TICKS_KEY = 'apps.z4-ticked';     // ids of Z4 to-dos ticked here
const SAVED_KEY = 'apps.today-saved';      // last gigs and to-dos fetched, for when there's no internet
const Z4_SHOWN = 5;
const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';

function lsJSON(k, fallback) { try { return JSON.parse(lsGet(k)) ?? fallback; } catch { return fallback; } }
// Today's date as YYYY-MM-DD on this device.
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tickButton(cls, label, on, onToggle) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.setAttribute('aria-pressed', String(on));
  b.innerHTML = `<span class="t-chk">${TICK}</span><span></span>`;
  b.lastChild.textContent = label;
  b.addEventListener('click', () => {
    const now = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(now));
    onToggle(now);
  });
  return b;
}

function renderPractice() {
  let state = lsJSON(PRACTICE_KEY, {});
  if (state.date !== todayISO()) state = { date: todayISO(), done: [] };
  $('practice').replaceChildren(...PRACTICE.map((name) => tickButton('t-chip', name, state.done.includes(name), (on) => {
    state.done = on ? [...state.done, name] : state.done.filter((n) => n !== name);
    state.date = todayISO();
    lsSet(PRACTICE_KEY, JSON.stringify(state));
  })));
}

/* Gigs: the next Davy Rockett gig (the website's gigs.json, from the Google Calendar) and the next SOS
   Band show (sos-band-data, public). Gig times are Pacific wall-clock times, shown as written. */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function untilText(date) {
  const [y, m, d] = date.split('-').map(Number);
  const [ty, tm, td] = todayISO().split('-').map(Number);
  const n = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 864e5);
  return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`;
}

function clockText(start) {
  let h = Number(start.slice(11, 13));
  const min = start.slice(14, 16);
  const ampm = h < 12 ? 'am' : 'pm';
  h = h % 12 || 12;
  return `${h}${min === '00' ? '' : `:${min}`} ${ampm}`;
}

function gigRow(g) {
  const [y, m, d] = g.date.split('-').map(Number);
  const weekday = DAYS[new Date(y, m - 1, d).getDay()];
  const a = document.createElement('a');
  a.className = 't-gig';
  a.href = g.href;
  a.innerHTML = '<div class="t-date"><b></b><span></span></div><div><div class="title"></div><div class="when"></div></div><span class="who"></span>';
  a.querySelector('b').textContent = MONTHS[m - 1];
  a.querySelector('.t-date span').textContent = d;
  a.querySelector('.title').textContent = g.title;
  a.querySelector('.when').textContent = [weekday, g.time, untilText(g.date)].filter(Boolean).join(' · ');
  a.querySelector('.who').textContent = g.who;
  return a;
}

function renderGigs(gigs) {
  const today = todayISO();
  const upcoming = (gigs || []).filter((g) => g.date >= today).sort((x, y) => x.date.localeCompare(y.date));
  $('gigs-card').hidden = !upcoming.length;
  $('gig-list').replaceChildren(...upcoming.map(gigRow));
}

async function loadGigs() {
  const [site, sos] = await Promise.all([
    fetch('../gigs.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(`https://raw.githubusercontent.com/${OWNER}/sos-band-data/main/data.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const saved = lsJSON(SAVED_KEY, {});
  const out = [];
  const now = new Date();
  const nowLocal = `${todayISO()}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (site) {
    const next = (site.gigs || [])
      .filter((g) => (g.allDay ? (g.end || g.start).slice(0, 10) >= todayISO() : (g.end || g.start) >= nowLocal))
      .sort((x, y) => x.start.localeCompare(y.start))[0];
    if (next) out.push({ date: next.start.slice(0, 10), time: next.allDay ? '' : clockText(next.start), title: next.title, who: 'Davy Rockett', href: '../#gigs' });
  } else if (saved.gigs) {
    out.push(...saved.gigs.filter((g) => g.who === 'Davy Rockett'));
  }
  if (sos) {
    const next = Object.values(sos.items || {})
      .filter((i) => i && i.type === 'show' && !i.deleted && i.date && i.date >= todayISO())
      .sort((x, y) => x.date.localeCompare(y.date))[0];
    if (next) out.push({ date: next.date, time: '', title: next.name, who: 'SOS Band', href: '../sos-band/' });
  } else if (saved.gigs) {
    out.push(...saved.gigs.filter((g) => g.who === 'SOS Band'));
  }
  lsSet(SAVED_KEY, JSON.stringify({ ...lsJSON(SAVED_KEY, {}), gigs: out }));
  renderGigs(out);
}

/* Z4 to-dos: from GitHub with the Z4 Log key when there is one, otherwise Z4 Log's own copy on this
   device (same website, so its database is readable here), otherwise the last list seen. */

function readZ4Device() {
  return new Promise((resolve) => {
    // Only open Z4 Log's database if it already exists: opening a missing one would create an empty one.
    if (!indexedDB.databases) return resolve(null);
    indexedDB.databases().then((dbs) => {
      if (!dbs.some((d) => d.name === 'z4log')) return resolve(null);
      const req = indexedDB.open('z4log');
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('todos')) { db.close(); return resolve(null); }
        const get = db.transaction('todos').objectStore('todos').getAll();
        get.onsuccess = () => { db.close(); resolve(get.result); };
        get.onerror = () => { db.close(); resolve(null); };
      };
    }).catch(() => resolve(null));
  });
}

async function readZ4GitHub() {
  const token = lsGet('z4log-sync-token');
  if (!token) return null;
  const repo = lsGet('z4log-sync-repo') || `${OWNER}/z4-log-data`;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/data.json`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json' },
    });
    return res.ok ? (await res.json()).todos || [] : null;
  } catch {
    return null;
  }
}

function renderZ4(todos) {
  const open = (todos || []).filter((t) => t && !t.done && !t.deleted).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  // Forget ticks for to-dos that are now done (or gone) in Z4 Log.
  const ticked = lsJSON(Z4_TICKS_KEY, []).filter((id) => open.some((t) => t.id === id));
  lsSet(Z4_TICKS_KEY, JSON.stringify(ticked));
  $('z4-card').hidden = !open.length;
  const rows = open.slice(0, Z4_SHOWN).map((t) => tickButton('t-todo', t.title, ticked.includes(t.id), (on) => {
    const now = lsJSON(Z4_TICKS_KEY, []).filter((id) => id !== t.id);
    if (on) now.push(t.id);
    lsSet(Z4_TICKS_KEY, JSON.stringify(now));
  }));
  if (open.length > Z4_SHOWN) {
    const more = document.createElement('p');
    more.className = 't-more';
    more.textContent = `and ${open.length - Z4_SHOWN} more in Z4 Log`;
    rows.push(more);
  }
  $('z4-list').replaceChildren(...rows);
}

async function loadZ4() {
  const saved = lsJSON(SAVED_KEY, {});
  if (saved.z4) renderZ4(saved.z4);
  const todos = (await readZ4GitHub()) || (await readZ4Device());
  if (!todos) return;
  const slim = todos.map(({ id, title, done, deleted, createdAt }) => ({ id, title, done, deleted, createdAt }));
  lsSet(SAVED_KEY, JSON.stringify({ ...lsJSON(SAVED_KEY, {}), z4: slim }));
  renderZ4(slim);
}

function renderToday() {
  $('today-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  renderPractice();
  renderGigs(lsJSON(SAVED_KEY, {}).gigs);
  loadGigs();
  loadZ4();
}

renderToday();

/* ---------- Settings sheet ---------- */

const sheet = $('settings');
$('settings-open').addEventListener('click', () => {
  renderOffline();
  renderKeys();
  checkUpdates();
  if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', '');
});
$('settings-close').addEventListener('click', () => sheet.close ? sheet.close() : sheet.removeAttribute('open'));
// A tap on the dimmed area outside the sheet closes it.
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

renderOffline();
renderKeys();
document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderOffline(); renderKeys(); renderToday(); } });
