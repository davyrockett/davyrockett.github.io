// davyrockett.com: gig calendar, song players and videos.
// Gig times in gigs.json are San Diego (Pacific) wall-clock times, shown as-is to every visitor.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* ---------- Gigs ---------- */

// Current time in San Diego as "YYYY-MM-DDTHH:MM", comparable with gig times.
function nowPacific() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date()).map(p => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function parts(s) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, dow };
}

function clock(s) {
  let h = Number(s.slice(11, 13));
  const min = s.slice(14, 16);
  const ampm = h < 12 ? "am" : "pm";
  h = h % 12 || 12;
  return { text: min === "00" ? `${h}` : `${h}:${min}`, ampm };
}

function timeRange(g) {
  if (g.allDay) return "All day";
  const a = clock(g.start);
  if (!g.end || g.end.slice(0, 10) !== g.start.slice(0, 10)) return `${a.text} ${a.ampm}`;
  const b = clock(g.end);
  return a.ampm === b.ampm ? `${a.text}–${b.text} ${b.ampm}` : `${a.text} ${a.ampm} – ${b.text} ${b.ampm}`;
}

function gigEnd(g) {
  if (g.allDay) return (g.end || g.start).slice(0, 10) + "T23:59";
  return g.end || g.start;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function mapLink(location) {
  const a = el("a", null, location.split("\n")[0]);
  a.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(location);
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

function renderNext(gig, today) {
  const box = document.getElementById("next-gig");
  box.replaceChildren();
  const eyebrow = el("div", "eyebrow", "next gig");
  box.append(eyebrow);
  if (!gig) {
    box.append(
      el("div", "when", "Nothing on the calendar right now"),
      el("p", "time", "New dates are added all the time. Want davyrockett at your event? Email bookrockett@gmail.com.")
    );
    return;
  }
  const p = parts(gig.start);
  const isToday = gig.start.slice(0, 10) <= today && gigEnd(gig).slice(0, 10) >= today;
  if (isToday) eyebrow.append(el("span", "tag", "Today"));
  box.append(
    el("div", "when", `${DAYS_LONG[p.dow]}, ${MONTHS_LONG[p.m - 1]} ${p.d}`),
    el("div", "what", gig.title),
    el("div", "time", timeRange(gig))
  );
  if (gig.location) {
    const where = el("div", "where");
    where.append(mapLink(gig.location));
    box.append(where);
  }
  const more = el("button", "more", "See all upcoming gigs");
  more.type = "button";
  more.id = "toggle-gigs";
  more.setAttribute("aria-controls", "gigs");
  more.setAttribute("aria-expanded", "false");
  more.addEventListener("click", () => showGigs(document.getElementById("gigs").hidden));
  box.append(more);
}

// Show or hide the upcoming gigs section (it starts hidden).
function showGigs(open, scroll = true) {
  const section = document.getElementById("gigs");
  if (open) setView("list");  // always opens on the list
  section.hidden = !open;
  const btn = document.getElementById("toggle-gigs");
  if (btn) {
    btn.textContent = open ? "Hide upcoming gigs" : "See all upcoming gigs";
    btn.setAttribute("aria-expanded", String(open));
  }
  if (open && scroll) section.scrollIntoView({ behavior: "smooth" });
}

function gigItem(g, today) {
  const p = parts(g.start);
  const li = el("li", "gig");
  if (g.start.slice(0, 10) <= today) li.classList.add("today");
  const block = el("div", "date-block");
  block.append(el("div", "mon", MONTHS[p.m - 1]), el("div", "day", p.d), el("div", "dow", DAYS[p.dow]));
  const info = el("div");
  info.append(el("div", "title", g.title));
  const details = el("div", "details", timeRange(g) + (p.y !== Number(today.slice(0, 4)) ? ` · ${p.y}` : ""));
  if (g.location) {
    details.append(" · ");
    details.append(mapLink(g.location));
  }
  info.append(details);
  li.append(block, info);
  return li;
}

function renderUpcoming(gigs, today) {
  const list = document.getElementById("upcoming");
  list.replaceChildren();
  if (!gigs.length) {
    list.append(el("li", "empty", "No upcoming gigs on the calendar yet. Check back soon!"));
    return;
  }
  for (const g of gigs) list.append(gigItem(g, today));
}

/* ---------- Calendar view ---------- */

const cal = { gigs: [], today: "", year: 0, month: 0, first: 0, last: 0, selected: "" };

function monthIndex(y, m) { return y * 12 + m; }

function setupCalendar(gigs, today) {
  cal.gigs = gigs;
  cal.today = today;
  const t = parts(today);
  cal.first = monthIndex(t.y, t.m - 1);
  const lastGig = gigs.length ? parts(gigs[gigs.length - 1].start) : t;
  cal.last = Math.max(cal.first, monthIndex(lastGig.y, lastGig.m - 1));
  cal.year = t.y;
  cal.month = t.m - 1;
  cal.selected = gigs.length ? gigs[0].start.slice(0, 10) : "";

  document.getElementById("cal-prev").addEventListener("click", () => moveMonth(-1));
  document.getElementById("cal-next").addEventListener("click", () => moveMonth(1));
  renderCalendar();
}

function moveMonth(step) {
  const i = Math.min(cal.last, Math.max(cal.first, monthIndex(cal.year, cal.month) + step));
  cal.year = Math.floor(i / 12);
  cal.month = i % 12;
  // Show the month's first gig straight away.
  const prefix = `${cal.year}-${String(cal.month + 1).padStart(2, "0")}`;
  const first = cal.gigs.find(g => g.start.startsWith(prefix));
  if (first) cal.selected = first.start.slice(0, 10);
  renderCalendar();
}

function renderCalendar() {
  const { year, month, today } = cal;
  const pad = n => String(n).padStart(2, "0");
  document.getElementById("cal-title").textContent = `${MONTHS_LONG[month]} ${year}`;
  const here = monthIndex(year, month);
  document.getElementById("cal-prev").disabled = here <= cal.first;
  document.getElementById("cal-next").disabled = here >= cal.last;

  const byDay = new Map();
  for (const g of cal.gigs) {
    const d = g.start.slice(0, 10);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(g);
  }

  const grid = document.getElementById("cal-grid");
  grid.replaceChildren();
  for (const d of DAYS) grid.append(el("div", "cal-dow", d));
  const startDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Always six weeks, so the calendar keeps the same height from month to month.
  for (let i = 0; i < 42; i++) {
    const day = i - startDow + 1;
    if (day < 1 || day > daysInMonth) {
      grid.append(el("div", "cal-day blank"));
      continue;
    }
    const key = `${year}-${pad(month + 1)}-${pad(day)}`;
    const gigs = byDay.get(key);
    const cell = el(gigs ? "button" : "div", "cal-day");
    cell.append(el("span", "num", day));
    if (key < today) cell.classList.add("past");
    if (key === today) cell.classList.add("is-today");
    if (gigs) {
      cell.type = "button";
      cell.classList.add("has-gig");
      if (key === cal.selected) cell.classList.add("selected");
      cell.setAttribute("aria-label", `${MONTHS_LONG[month]} ${day}: ${gigs.map(g => g.title).join(", ")}`);
      cell.append(el("span", "venue", gigs.map(g => g.title).join(", ")));
      cell.addEventListener("click", () => {
        cal.selected = key;
        renderCalendar();
      });
    }
    grid.append(cell);
  }

  const detail = document.getElementById("cal-detail");
  detail.replaceChildren();
  const chosen = byDay.get(cal.selected);
  if (chosen && cal.selected.startsWith(`${year}-${pad(month + 1)}`)) {
    for (const g of chosen) detail.append(gigItem(g, today));
  } else {
    const count = cal.gigs.filter(g => g.start.startsWith(`${year}-${pad(month + 1)}`)).length;
    detail.append(el("li", "cal-hint",
      count ? "Tap a highlighted day to see the gig." : "No gigs this month yet."));
  }
}

function setView(view) {
  document.querySelectorAll(".view-switch button")
    .forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  document.getElementById("upcoming").hidden = view !== "list";
  document.getElementById("cal").hidden = view !== "calendar";
}

function setupViewSwitch() {
  document.querySelectorAll(".view-switch button")
    .forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
}

async function loadGigs() {
  try {
    const res = await fetch("gigs.json", { cache: "no-cache" });
    const data = await res.json();
    const now = nowPacific();
    const today = now.slice(0, 10);
    const upcoming = data.gigs.filter(g => gigEnd(g) >= now);
    renderNext(upcoming[0], today);
    renderUpcoming(upcoming, today);
    setupCalendar(upcoming, today);

    const id = data.calendar;
    document.getElementById("sub-google").href =
      "https://calendar.google.com/calendar/render?cid=" + encodeURIComponent(id);
    document.getElementById("sub-ical").href =
      "webcal://calendar.google.com/calendar/ical/" + encodeURIComponent(id) + "/public/basic.ics";
  } catch (err) {
    console.error(err);
    renderNext(null);
    document.getElementById("upcoming").replaceChildren(
      el("li", "empty", "The gig calendar couldn't load. Please try again in a minute.")
    );
  }
  // The "gigs" menu link (or a link to davyrockett.com/#gigs) opens the list.
  document.querySelectorAll('a[href="#gigs"]').forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    showGigs(true);
  }));
  if (location.hash === "#gigs") showGigs(true);
}

/* ---------- Song players ---------- */

const PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
const audio = new Audio();
audio.preload = "none";
let current = null;

function mmss(sec) {
  if (!isFinite(sec)) return "";
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

function setupTracks() {
  document.querySelectorAll(".track").forEach(track => {
    const btn = el("button", "play");
    btn.type = "button";
    btn.innerHTML = PLAY;
    btn.setAttribute("aria-label", "Play " + track.dataset.name);
    const mid = el("div");
    const bar = el("div", "bar");
    bar.append(el("span"));
    mid.append(el("div", "name", track.dataset.name), bar);
    track.append(btn, mid, el("span", "t", ""));

    btn.addEventListener("click", () => {
      if (current === track) {
        audio.paused ? audio.play() : audio.pause();
        return;
      }
      if (current) resetTrack(current);
      current = track;
      audio.src = track.dataset.src;
      audio.play();
    });
    bar.addEventListener("click", e => {
      if (current !== track || !audio.duration) return;
      const r = bar.getBoundingClientRect();
      audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
    });
  });

  const sync = () => {
    if (!current) return;
    const btn = current.querySelector("button");
    btn.innerHTML = audio.paused ? PLAY : PAUSE;
    btn.setAttribute("aria-label", (audio.paused ? "Play " : "Pause ") + current.dataset.name);
    current.querySelector(".bar span").style.width = audio.duration ? (100 * audio.currentTime / audio.duration) + "%" : "0";
    current.querySelector(".t").textContent = mmss(audio.currentTime);
  };
  ["play", "pause", "timeupdate", "ended"].forEach(ev => audio.addEventListener(ev, sync));
}

function resetTrack(track) {
  track.querySelector("button").innerHTML = PLAY;
  track.querySelector(".bar span").style.width = "0";
  track.querySelector(".t").textContent = "";
}

/* ---------- Videos (load YouTube only when clicked) ---------- */

function setupVideos() {
  document.querySelectorAll(".vid").forEach(fig => {
    const id = fig.dataset.id;
    const title = fig.querySelector("figcaption").textContent;
    const frame = el("div", "frame");
    const btn = el("button");
    btn.setAttribute("aria-label", "Play video: " + title);
    const img = el("img");
    img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    img.alt = "";
    img.loading = "lazy";
    btn.append(img);
    btn.addEventListener("click", () => {
      audio.pause();
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      iframe.title = title;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      frame.replaceChildren(iframe);
    });
    frame.append(btn);
    fig.prepend(frame);
  });
}

/* ---------- Parallax backgrounds ---------- */

// Each .parallax-bg layer moves at 20% of the scroll speed, like the old Wix site, and sits
// in its normal place when its section is centred on screen. Photo backgrounds are made taller
// than their section so their edges never show while they move.
const PARALLAX = 0.2;

function setupParallax() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layers = [...document.querySelectorAll(".parallax-bg")];
  let ticking = false;

  const size = () => {
    for (const layer of layers) {
      if (layer.classList.contains("music-figure")) continue;
      const extra = Math.ceil(PARALLAX * (innerHeight + layer.parentElement.offsetHeight) / 2) + 2;
      layer.style.top = `${-extra}px`;
      layer.style.bottom = `${-extra}px`;
    }
    update();
  };
  const update = () => {
    ticking = false;
    for (const layer of layers) {
      const box = layer.parentElement.getBoundingClientRect();
      if (box.top > innerHeight || box.bottom < 0) continue;  // off screen
      const offset = (box.top + box.height / 2 - innerHeight / 2) * PARALLAX;
      layer.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    }
  };
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener("resize", size);
  // Sections move when the gig list opens or closes.
  new ResizeObserver(size).observe(document.body);
  size();
}

setupViewSwitch();
loadGigs();
setupTracks();
setupVideos();
setupParallax();
