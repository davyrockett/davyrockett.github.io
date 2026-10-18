// The app suite (www.davyrockett.com/apps/): one Home Screen icon for all of David's apps.
// - Tells the apps they were opened from here, so each shows an "All apps" button (suite.js in each app).
// - "Make everything work offline": installs every app's own offline copy in one go.
// - One access key for every app that syncs: checks it against each data repo, then saves it the way
//   each app expects (the same browser storage the apps read, since they're all on www.davyrockett.com).
'use strict';

const OWNER = 'davyrockett';
const APPS = [
  ['first-frets', 'First Frets'], ['page-fright', 'Page Fright'], ['lip-service', 'Lip Service'],
  ['jam-session', 'Jam Session'], ['memory-lane', 'Memory Lane'], ['sos-band-editor', 'SOS Band Editor'],
  ['sos-band', 'SOS Band'], ['ge150-presets', 'GE150 Presets'], ['health-log', 'Health Log'], ['z4-log', 'Z4 Log'],
];

// Where each syncing app keeps its key (and which data repo it uses). Values are stored exactly as each
// app's own Settings screen stores them; "json" = that app keeps its values JSON-encoded.
const SYNCED = [
  { name: 'Health Log', repo: 'health-log-data', token: 'healthlog-sync-token', repoKey: 'healthlog-sync-repo', last: 'healthlog-sync-last' },
  { name: 'Z4 Log', repo: 'z4-log-data', token: 'z4log-sync-token', repoKey: 'z4log-sync-repo', last: 'z4log-sync-last' },
  { name: 'Jam Session', repo: 'jam-session-data', token: 'js.syncToken', repoKey: 'js.syncRepo', last: 'js.syncLast', json: true },
  { name: 'Memory Lane', repo: 'memory-lane-data', token: 'ml.sync-token', last: 'ml.sync-last' },
  { name: 'SOS Band Editor', repo: 'sos-band-data', token: 'sosed.sync-token', last: 'sosed.sync-last' },
  { name: 'GE150 Presets', repo: 'ge150-presets-data', token: 'ge150.sync-token', last: 'ge150.sync-last' },
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
try { sessionStorage.setItem('davyrockett-suite', '1'); } catch { /* blocked */ }

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

/* ---------- Settings sheet ---------- */

const sheet = $('settings');
$('settings-open').addEventListener('click', () => {
  renderOffline();
  renderKeys();
  if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', '');
});
$('settings-close').addEventListener('click', () => sheet.close ? sheet.close() : sheet.removeAttribute('open'));
// A tap on the dimmed area outside the sheet closes it.
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

renderOffline();
renderKeys();
document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderOffline(); renderKeys(); } });
