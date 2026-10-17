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
  const more = el("a", "more", "See all upcoming gigs");
  more.href = "#gigs";
  box.append(more);
}

function renderUpcoming(gigs, today) {
  const list = document.getElementById("upcoming");
  list.replaceChildren();
  if (!gigs.length) {
    const li = el("li", "empty", "No upcoming gigs on the calendar yet. Check back soon!");
    list.append(li);
    return;
  }
  for (const g of gigs) {
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
    list.append(li);
  }
}

function renderPast(gigs) {
  if (!gigs.length) return;
  const byYear = new Map();
  for (const g of gigs) {
    const y = g.start.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(g);
  }
  const years = [...byYear.keys()].sort().reverse();
  document.getElementById("past-stat").textContent =
    `${gigs.length.toLocaleString()} gigs since ${years[years.length - 1]}.`;
  const holder = document.getElementById("past-years");
  for (const y of years) {
    const list = byYear.get(y).slice().reverse();
    const det = el("details");
    const sum = el("summary");
    sum.append(el("span", null, y), el("span", "count", `${list.length} gig${list.length === 1 ? "" : "s"}`));
    det.append(sum);
    // Fill the list only when a year is opened, to keep the page light.
    det.addEventListener("toggle", () => {
      if (!det.open || det.querySelector("ul")) return;
      const ul = el("ul");
      for (const g of list) {
        const p = parts(g.start);
        const li = el("li");
        li.append(el("span", "d", `${MONTHS[p.m - 1]} ${p.d}`), g.title);
        ul.append(li);
      }
      det.append(ul);
    });
    holder.append(det);
  }
  document.getElementById("past").hidden = false;
}

async function loadGigs() {
  try {
    const res = await fetch("gigs.json", { cache: "no-cache" });
    const data = await res.json();
    const now = nowPacific();
    const today = now.slice(0, 10);
    const upcoming = data.gigs.filter(g => gigEnd(g) >= now);
    const past = data.gigs.filter(g => gigEnd(g) < now);
    renderNext(upcoming[0], today);
    renderUpcoming(upcoming, today);
    renderPast(past);

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

loadGigs();
setupTracks();
setupVideos();
