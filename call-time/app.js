/* Call Time: works backwards from when you need to be somewhere.
   Be there at − travel time = leave; leave − getting-ready steps = free until.
   Everything is saved on this device (localStorage keys start with "ct."). */
'use strict';

/* ---------- saved data ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('ct.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ct.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

let routines = store.get('routines', null);
if (!routines) {
  routines = [
    { id: uid(), name: 'Shower + shave', min: 45 },
    { id: uid(), name: 'Get dressed', min: 10 },
    { id: uid(), name: 'Pack gear', min: 20 },
  ];
  store.set('routines', routines);
}
let plans = store.get('plans', []);
const savePlans = () => store.set('plans', plans);
const saveRoutines = () => store.set('routines', routines);

/* ---------- times ---------- */
const MIN = 60000;
function arriveDate(p) {
  const [y, mo, d] = p.day.split('-').map(Number), [h, mi] = p.time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi);
}
// All the times for a plan, worked out backwards from when you need to be there.
function times(p) {
  const arrive = arriveDate(p);
  const leave = new Date(arrive - p.travel * MIN);
  const steps = [];
  let t = leave;
  for (let i = p.steps.length - 1; i >= 0; i--) {
    const start = new Date(t - p.steps[i].min * MIN);
    steps.unshift({ name: p.steps[i].name, min: p.steps[i].min, start, end: t });
    t = start;
  }
  return { arrive, leave, free: t, steps };
}
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const clock = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
function dayWord(d, now = new Date()) {
  if (sameDay(d, now)) return 'today';
  const tom = new Date(now); tom.setDate(now.getDate() + 1);
  if (sameDay(d, tom)) return 'tomorrow';
  const days = (new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5;
  if (days > 0 && days < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
// "10:45 AM", with the day in front when it isn't today.
const cap1 = (s) => s[0].toUpperCase() + s.slice(1);
const when = (d, now) => { const w = dayWord(d, now); return w === 'today' ? clock(d) : `${w} ${clock(d)}`; };
// A length of time: "45 m", "1 h 40 m", "2 days 3 h".
function span(ms, html) {
  const m = Math.max(0, Math.ceil(ms / MIN));
  const u = (s) => html ? `<span class="u">${s}</span>` : ` ${s} `;
  const parts = [];
  if (m >= 24 * 60) { const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); parts.push(d + u(d === 1 ? 'day' : 'days')); if (h) parts.push(h + u('h')); }
  else if (m >= 60) { const h = Math.floor(m / 60), r = m % 60; parts.push(h + u('h')); if (r) parts.push(r + u('m')); }
  else parts.push(m + u('m'));
  return parts.join('').trim();
}
const mins = (m) => span(m * MIN);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- main screen ---------- */
const $ = (id) => document.getElementById(id);
function upcoming(now = new Date()) {
  // A plan is finished once you're due to be there. Drop it then.
  const keep = plans.filter((p) => arriveDate(p) > now);
  if (keep.length !== plans.length) { plans = keep; savePlans(); }
  return plans.slice().sort((a, b) => arriveDate(a) - arriveDate(b));
}

function render() {
  const now = new Date();
  const list = upcoming(now);
  const p = list[0];
  const hero = $('hero');
  hero.classList.toggle('empty', !p);
  $('timeline').hidden = $('tl-head').hidden = $('hero-actions').hidden = $('cal-note').hidden = !p;
  if (!p) {
    $('hero-kicker').textContent = 'Nothing planned';
    $('hero-big').className = 'hero-big words';
    $('hero-big').textContent = 'All free';
    $('hero-small').textContent = 'Add a plan when you need to be somewhere.';
  } else {
    const t = times(p);
    const big = $('hero-big');
    if (now < t.free) {
      $('hero-kicker').textContent = 'Free time left';
      big.className = 'hero-big';
      big.innerHTML = span(t.free - now, true);
      $('hero-small').textContent = `Free until ${when(t.free, now)}`;
    } else if (now < t.leave) {
      const s = t.steps.find((x) => now < x.end);
      $('hero-kicker').textContent = `Now · ${span(s.end - now)} left`;
      big.className = 'hero-big words';
      big.textContent = s.name;
      $('hero-small').textContent = `Leave at ${clock(t.leave)}`;
    } else {
      $('hero-kicker').textContent = now - t.leave < 10 * MIN ? 'Time to leave' : 'On your way';
      big.className = 'hero-big words';
      big.textContent = p.what;
      $('hero-small').textContent = `Be there at ${clock(t.arrive)}`;
    }
    // Timeline
    const rows = [];
    const row = (time, start, end, label, detail) => {
      const cls = now >= end ? 'past' : now >= start ? 'now' : '';
      rows.push(`<li class="${cls}"><span class="t">${esc(time)}</span><span>${esc(label)}${detail ? ` <span class="d">· ${esc(detail)}</span>` : ''}</span></li>`);
    };
    if (now < t.free) row('Now', now, t.free, 'Free time', `until ${clock(t.free)}`);
    t.steps.forEach((s) => row(clock(s.start), s.start, s.end, s.name, mins(s.min)));
    if (p.travel) row(clock(t.leave), t.leave, t.arrive, 'Leave', `${mins(p.travel)} to get there`);
    row(clock(t.arrive), t.arrive, new Date(8.64e15), p.what, '');
    $('tl-head').textContent = `${p.what} · ${cap1(dayWord(t.arrive, now))}`;
    $('timeline').innerHTML = rows.join('');
    // Calendar
    const note = $('cal-note');
    if (!p.cal) { note.className = 'cap cal-note'; note.textContent = 'Adds alerts to your phone\'s calendar, so they ring even with this app closed.'; $('cal-btn').textContent = 'Add to calendar'; }
    else if (p.cal === calSig(p)) { note.className = 'cap cal-note ok'; note.textContent = 'In your calendar.'; $('cal-btn').textContent = 'Add to calendar again'; }
    else { note.className = 'cap cal-note'; note.textContent = 'The times changed since you added it. Add it again (it should replace the old one).'; $('cal-btn').textContent = 'Add to calendar'; }
    $('cal-btn').onclick = () => addToCalendar(p);
    $('edit-btn').onclick = () => openPlan(p);
  }
  // Coming up
  const rest = list.slice(1);
  $('later-wrap').hidden = !rest.length;
  $('later').innerHTML = rest.map((q) => {
    const t = times(q);
    return `<li><button type="button" data-id="${q.id}"><span><span class="w">${esc(q.what)}</span><br><span class="when">${esc(cap1(when(t.arrive, now)))}</span></span>
      <span class="fu">Free until<b>${esc(cap1(when(t.free, now)))}</b></span></button></li>`;
  }).join('');
}
$('later').addEventListener('click', (e) => {
  const b = e.target.closest('[data-id]');
  if (b) openPlan(plans.find((p) => p.id === b.dataset.id));
});
$('add-btn').onclick = () => openPlan(null);

// Update on the minute (no seconds: a ticking clock is the thing we're trying to get away from).
function tick() { render(); clearTimeout(tick.t); tick.t = setTimeout(tick, MIN - (Date.now() % MIN) + 50); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });

/* ---------- calendar (.ics with alerts) ---------- */
const calSig = (p) => { const t = times(p); return [t.free, t.leave, t.arrive, p.what].map(String).join('|'); };
function icsDate(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
function buildIcs(p) {
  const t = times(p), heads = Number(store.get('headsup', '10')), seq = p.seq || 0, stamp = icsDate(new Date());
  const alarm = (before, text) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(text)}`, `TRIGGER:${before ? `-PT${before}M` : 'PT0M'}`, 'END:VALARM'];
  const event = (key, start, end, title, desc, alarms) => ['BEGIN:VEVENT', `UID:${p.id}-${key}@call-time`, `SEQUENCE:${seq}`, `DTSTAMP:${stamp}`,
    `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${icsText(title)}`, `DESCRIPTION:${icsText(desc)}`, 'TRANSP:TRANSPARENT', ...alarms.flat(), 'END:VEVENT'];
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//davyrockett//Call Time//EN', 'METHOD:PUBLISH', 'CALSCALE:GREGORIAN'];
  const plan = [...t.steps.map((s) => `${clock(s.start)} ${s.name} (${mins(s.min)})`), p.travel ? `${clock(t.leave)} Leave (${mins(p.travel)})` : '', `${clock(t.arrive)} ${p.what}`].filter(Boolean).join('\n');
  const first = (title) => [heads ? alarm(heads, `${heads} minutes of free time left`) : [], alarm(0, title)];
  if (t.steps.length) {
    const title = `Get ready: ${t.steps.map((s) => s.name).join(', ')}`;
    lines.push(...event('ready', t.free, t.leave, title, plan, first(title)));
  }
  if (p.travel) {
    const title = `Leave for ${p.what}`;
    lines.push(...event('leave', t.leave, t.arrive, title, plan, t.steps.length ? [alarm(0, title)] : first(title)));
  }
  if (!t.steps.length && !p.travel) lines.push(...event('at', t.arrive, new Date(+t.arrive + 30 * MIN), p.what, plan, first(p.what)));
  lines.push('END:VCALENDAR');
  // Lines longer than 75 bytes are folded, as calendar files expect.
  return lines.map((l) => l.length <= 74 ? l : l.match(/.{1,73}/g).join('\r\n ')).join('\r\n') + '\r\n';
}
function addToCalendar(p) {
  p.seq = (p.seq || 0) + (p.cal ? 1 : 0);
  const ics = buildIcs(p);
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) {
    // iPhone/iPad: opening the calendar file shows the "Add All" screen.
    location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = `Call Time - ${p.what.replace(/[\\/:*?"<>|]/g, '')}.ics`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }
  p.cal = calSig(p);
  savePlans();
  render();
}

/* ---------- pop-ups ---------- */
// Tap outside or the × to close. Forms with typing ask first if something changed.
function sheet(el, { dirty = () => false } = {}) {
  const close = (ask) => {
    if (ask && dirty() && !confirm('Discard your changes?')) return;
    el.hidden = true;
  };
  el.addEventListener('click', (e) => { if (e.target === el) close(true); else if (e.target.closest('[data-close]')) close(true); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) close(true); });
  return { open() { el.hidden = false; }, close };
}

/* ---------- add / edit a plan ---------- */
const form = $('plan-form');
const durOpts = (max, step, sel) => Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step)
  .map((v) => `<option value="${v}"${v === sel ? ' selected' : ''}>${v}</option>`).join('');
form.th.innerHTML = durOpts(8, 1);
form.tm.innerHTML = durOpts(55, 5);
const stepMinOpts = (sel) => {
  const vals = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 105, 120, 150, 180];
  if (!vals.includes(sel)) vals.push(sel), vals.sort((a, b) => a - b);
  return vals.map((v) => `<option value="${v}"${v === sel ? ' selected' : ''}>${mins(v)}</option>`).join('');
};
let editing = null, draft = null, startState = '';
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function readForm() {
  return {
    what: form.what.value.trim(), day: form.day.value, time: form.time.value,
    travel: Number(form.th.value) * 60 + Number(form.tm.value),
    steps: draft.steps.map((s) => ({ ...s })),
  };
}
const formState = () => JSON.stringify(readForm());
const planSheet = sheet($('plan-sheet'), { dirty: () => formState() !== startState });

function drawSteps() {
  $('routine-chips').innerHTML = routines.map((r) => {
    const on = draft.steps.some((s) => s.rid === r.id);
    return `<button type="button" class="btn" data-rid="${r.id}" aria-pressed="${on}">${esc(r.name)} <small>${esc(mins(r.min))}</small></button>`;
  }).join('') + '<button type="button" class="btn" data-other>+ Other</button>';
  $('steps').innerHTML = draft.steps.map((s, i) => s.other
    ? `<li class="other" data-i="${i}"><input type="text" placeholder="What you need to do" value="${esc(s.name)}" maxlength="60" data-name aria-label="Step name">
        <select data-min aria-label="Minutes">${stepMinOpts(s.min)}</select>
        <button type="button" class="btn icon" data-rm aria-label="Remove">×</button>
        <label class="keep"><input type="checkbox" data-keep${s.keep ? ' checked' : ''}> Save as a routine</label></li>`
    : `<li data-i="${i}"><span class="name">${esc(s.name)}</span><select data-min aria-label="Minutes for ${esc(s.name)}">${stepMinOpts(s.min)}</select>
        <button type="button" class="btn icon" data-rm aria-label="Remove ${esc(s.name)}">×</button></li>`).join('');
  summarize();
}
$('routine-chips').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.hasAttribute('data-other')) { draft.steps.push({ name: '', min: 15, other: true, keep: true }); drawSteps(); $('steps').lastElementChild.querySelector('input').focus(); return; }
  const r = routines.find((x) => x.id === b.dataset.rid);
  const i = draft.steps.findIndex((s) => s.rid === r.id);
  if (i >= 0) draft.steps.splice(i, 1); else draft.steps.push({ rid: r.id, name: r.name, min: r.min });
  drawSteps();
});
$('steps').addEventListener('click', (e) => {
  if (!e.target.closest('[data-rm]')) return;
  draft.steps.splice(Number(e.target.closest('li').dataset.i), 1);
  drawSteps();
});
$('steps').addEventListener('input', (e) => {
  const s = draft.steps[Number(e.target.closest('li').dataset.i)];
  if (e.target.matches('[data-name]')) s.name = e.target.value;
  if (e.target.matches('[data-min]')) s.min = Number(e.target.value);
  if (e.target.matches('[data-keep]')) s.keep = e.target.checked;
  summarize();
});
form.addEventListener('input', summarize);

function summarize() {
  const f = readForm(), out = $('plan-summary');
  if (!f.day || !f.time) { out.textContent = 'Pick the day and time to see when your free time ends.'; return; }
  const t = times(f), now = new Date();
  const parts = [`Free until <b>${esc(when(t.free, now))}</b>`];
  if (f.travel) parts.push(`leave at <b>${esc(clock(t.leave))}</b>`);
  let msg = parts.join(', ') + '.';
  if (t.arrive <= now) msg = 'That time has already passed.';
  else if (t.free <= now) msg += ' That\'s already started: time to get going.';
  out.innerHTML = msg;
}

function openPlan(p) {
  editing = p;
  draft = { steps: p ? p.steps.map((s) => ({ ...s })) : [] };
  $('plan-title').textContent = p ? 'Edit plan' : 'New plan';
  $('plan-delete').hidden = !p;
  form.what.value = p ? p.what : '';
  form.day.value = p ? p.day : ymd(new Date());
  form.time.value = p ? p.time : '';
  const tr = p ? p.travel : 0;
  form.th.value = String(Math.floor(tr / 60));
  form.tm.value = String(tr % 60 - (tr % 5));
  drawSteps();
  startState = formState();
  planSheet.open();
  if (!p) setTimeout(() => form.what.focus(), 50);
}
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = readForm();
  f.steps = f.steps.filter((s) => s.name.trim());
  if (arriveDate(f) <= new Date()) { summarize(); $('plan-summary').innerHTML = '<b>That time has already passed.</b> Check the day and time.'; return; }
  // New steps typed in with "Save as a routine" ticked join the routines.
  f.steps.forEach((s) => {
    s.name = s.name.trim();
    if (s.other && s.keep && !routines.some((r) => r.name.toLowerCase() === s.name.toLowerCase())) {
      const r = { id: uid(), name: s.name, min: s.min };
      routines.push(r); s.rid = r.id;
    }
    delete s.other; delete s.keep;
  });
  saveRoutines();
  if (editing) Object.assign(editing, f);
  else plans.push({ id: uid(), ...f });
  savePlans();
  planSheet.close(false);
  render();
});
$('plan-delete').onclick = () => {
  if (!confirm(`Delete the plan for ${editing.what}?` + (editing.cal ? ' Its calendar events stay in your calendar; delete them there.' : ''))) return;
  plans = plans.filter((p) => p !== editing);
  savePlans();
  planSheet.close(false);
  render();
};

/* ---------- settings ---------- */
const settingsSheet = sheet($('settings-sheet'));
const THEME_BG = { light: '#F1F0EC', dark: '#151310' };
function applyTheme(t) {
  const r = document.documentElement;
  if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t); else r.removeAttribute('data-theme');
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content',
    t === 'light' || t === 'dark' ? THEME_BG[t] : (m.media.includes('dark') ? THEME_BG.dark : THEME_BG.light)));
}
applyTheme(store.get('theme', 'light'));
const DEFAULTS = { theme: 'light', headsup: '10' };
function markSegs() {
  document.querySelectorAll('.seg').forEach((g) => {
    const cur = String(store.get(g.dataset.key, DEFAULTS[g.dataset.key]));
    g.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === cur));
  });
}
document.querySelector('.settings').addEventListener('click', (e) => {
  const b = e.target.closest('.seg [data-v]');
  if (!b) return;
  const key = b.closest('.seg').dataset.key;
  store.set(key, b.dataset.v);
  if (key === 'theme') applyTheme(b.dataset.v);
  markSegs();
});
function drawRoutines() {
  $('routines').innerHTML = routines.map((r, i) => `<li data-i="${i}">
    <input type="text" value="${esc(r.name)}" maxlength="60" data-name aria-label="Routine name">
    <select data-min aria-label="Minutes">${stepMinOpts(r.min)}</select>
    <button type="button" class="btn icon" data-rm aria-label="Delete ${esc(r.name)}">×</button></li>`).join('');
}
$('routines').addEventListener('input', (e) => {
  const r = routines[Number(e.target.closest('li').dataset.i)];
  if (e.target.matches('[data-name]')) r.name = e.target.value;
  if (e.target.matches('[data-min]')) r.min = Number(e.target.value);
  saveRoutines();
});
$('routines').addEventListener('change', (e) => {
  // An emptied name: put the old one back rather than keep a blank routine.
  if (e.target.matches('[data-name]') && !e.target.value.trim()) { drawRoutines(); }
});
$('routines').addEventListener('click', (e) => {
  if (!e.target.closest('[data-rm]')) return;
  const i = Number(e.target.closest('li').dataset.i);
  if (!confirm(`Delete the routine "${routines[i].name}"? Plans that use it keep it.`)) return;
  routines.splice(i, 1); saveRoutines(); drawRoutines();
});
$('routine-add').onclick = () => {
  routines.push({ id: uid(), name: '', min: 15 }); drawRoutines();
  $('routines').lastElementChild.querySelector('input').focus();
};
$('settings-open').onclick = () => {
  routines = routines.filter((r) => r.name.trim());
  saveRoutines(); drawRoutines(); markSegs();
  $('ver-line').textContent = `You're on ${window.APP_VERSION}.`;
  $('set-update').disabled = false;
  settingsSheet.open();
};
// Routines left blank are dropped when Settings closes.
new MutationObserver(() => {
  if ($('settings-sheet').hidden) { routines = routines.filter((r) => r.name.trim()); saveRoutines(); }
}).observe($('settings-sheet'), { attributes: true, attributeFilter: ['hidden'] });
$('set-update').onclick = async () => {
  const ver = $('ver-line'), ub = $('set-update'), reg = window.SW_REG;
  if (!reg || !navigator.onLine) { ver.textContent = 'Connect to the internet, then try again.'; return; }
  ub.disabled = true; ver.textContent = 'Checking…';
  try { await reg.update(); } catch (e) { /* offline */ }
  const w = reg.waiting || reg.installing;
  if (w) {
    ver.textContent = 'Updating now…';
    const go = () => w.postMessage('skipWaiting');
    if (w.state === 'installed') go(); else w.addEventListener('statechange', () => { if (w.state === 'installed') go(); });
  } else { ver.textContent = `You're on the latest version (${window.APP_VERSION}).`; ub.disabled = false; }
};

tick();

/* ---------- offline support + updates (see sw.js) ---------- */
(async () => {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.register('sw.js');
  if (!reg) return;
  window.SW_REG = reg;
  const banner = $('update-banner');
  const hadController = Boolean(navigator.serviceWorker.controller);
  const apply = (worker) => worker.postMessage('skipWaiting');
  // Right after the app opens there's nothing to lose, so updates apply on their own.
  const justOpened = () => performance.now() < 20000;
  const handle = (worker) => {
    if (!worker || !navigator.serviceWorker.controller) return;
    if (justOpened()) apply(worker);
    else { banner.hidden = false; $('update-btn').onclick = () => apply(worker); }
  };
  const watch = (worker) => {
    if (!worker) return;
    if (worker.state === 'installed') return handle(worker);
    worker.addEventListener('statechange', () => { if (worker.state === 'installed') handle(worker); });
  };
  handle(reg.waiting);
  watch(reg.installing);
  reg.addEventListener('updatefound', () => watch(reg.installing));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  const check = () => { if (navigator.onLine) reg.update().catch(() => {}).then(() => handle(reg.waiting)); };
  check();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
})();
