<!-- shared-preferences:start -->
## David's preferences (shared across all of David's apps)

This section is the same in every one of David's app repos. If David states a new general preference
(not specific to this app), add it here, in this file, and commit it. David's Mac copies it to the other repos.

**Who David is.** A guitar teacher and gigging guitarist (he/him) who builds personal and teaching apps with Claude.
Comfortable with tech but not a programmer: explain in plain words, skip jargon, keep replies short and
concrete. Likes to see things working: verify before saying "done".

**How the apps are built and hosted**
- Public web apps on GitHub Pages under the **davyrockett** GitHub account (never an Artifact or a hosted
  service). Live at `https://www.davyrockett.com/<repo>/` (since 2026-10-18; old
  `davyrockett.github.io` links redirect there). The website itself is the `davyrockett.github.io` repo.
- Each app: `index.html` (+ `app.js` / `styles.css` when bigger), `sw.js` service worker for offline use
  with an update banner, `manifest.webmanifest`, `icons/` drawn by `tools/make-icons.py`, a
  `Start <App>.command` for local testing on the Mac, and a README written for David.
- **`move.js`** (since 2026-10-17): every app loads `move.js` as its first script and lists it in `sw.js`
  `ASSETS`. It carries the app's settings over when the apps move from davyrockett.github.io to
  davyrockett.com (plan: `Claude Apps/move-to-davyrockett-com.md`; master copy `Claude Apps/tools/move.js`).
  Keep it; a new app gets a copy with `data-keep` set to its own localStorage key prefix.
- **`suite.js`** (since 2026-10-18): every app also loads `<script src="suite.js" defer></script>` (in `ASSETS` too).
  It shows an "All apps" button when the app was opened from David's app suite (www.davyrockett.com/apps, one Home
  Screen icon for everything; master copy `Claude Apps/tools/suite.js`). New apps get it too. If a new app syncs,
  add it to `SYNCED` in the website's `apps/launcher.js` so the suite's one access key reaches it.
- **`share.js`** (since 2026-10-19): Settings in every app has a **Share** section (the app's link, "Copy link",
  and "Share…" where the device can). Load `<script src="share.js" defer></script>` (in `ASSETS` too) and add a
  `data-share` block using the app's own classes (see `Claude Apps/tools/share.js`). First Frets has its own
  share section with a QR code instead.
- **Every change must bump the version** (`tools/bump.sh` where it exists, otherwise `VERSION` in `sw.js`
  and the matching app version). Without it, installed copies on phones never update.
- Settings (gear icon) always has **Appearance: Light / Dark / Auto** and **Check for updates**.
  Apps open in **Light** unless changed in Settings.
- Design follows David's First Frets app: warm off-white / dark-brown palette, bright orange accent (#F57C14; dark mode #FF9433; David tried his logo orange #E27039, too red) and
  davyrockett grey secondary text (#676767; dark mode #A3A3A3),
  Big Shoulders Display headings, Atkinson Hyperlegible body text, works well on a phone.
- Data lives on the device (localStorage / IndexedDB). Apps whose data must sync between phone and Mac
  use a separate `davyrockett/<app>-data` repo (`data.json`) and an access key pasted into Settings.
  Never commit keys, tokens or anything in `private/`.
- **Publish when done:** commit, push to `main`, and confirm the live site shows the new version.
  End with a brief summary of what changed. David's Mac pulls GitHub changes into its Dropbox copy
  automatically, so pushing is all that's needed.

**Taste**
- Labels and descriptions plain and descriptive. Jokes belong in names (e.g. "Page Fright"), not taglines.
- Keep screens uncluttered: show extra controls only when they're relevant.
- Nothing should jump around: when a control doesn't apply, grey it out in place rather than hiding it, and
  reserve space for things that appear, so other controls never shift.
- **No AI voices, ever:** no text-to-speech or synthesised singing in any app. Use written instructions on
  screen, and instrument or synth sounds for audio.
- Commit messages: a short, plain description of the change.
- When renaming or moving an app, keep the old address working with a redirect repo.

**New apps:** create the repo under davyrockett and turn on GitHub Pages; David's Mac downloads new
davyrockett repos into `~/Dropbox/Local/Claude Apps/` automatically. Give each new app its own CLAUDE.md
with this section (copy it from any other app) plus an "## This app" section.
Also add every new app to David's unlinked app list, **www.davyrockett.com/apps** (`apps/index.html` in the
website repo, `Claude Apps/website`): icon, name and one-line description, in the right group.
<!-- shared-preferences:end -->

## This app

**davyrockett.com**, David's music website (replaces the old Wix site). Repo `davyrockett/davyrockett.github.io`
(renamed from `website` on 2026-10-18). It's the account's main GitHub Pages site, so with its custom domain
every app repo with Pages is served at `www.davyrockett.com/<repo>/` and old `davyrockett.github.io/...` links
redirect there. **Never rename or delete this repo or remove its custom domain:** every app's address depends on it.
On the Mac the folder is still `Claude Apps/website`.
It's a public *website*, not an installable app, so some shared rules don't apply: no service worker,
manifest, Settings gear or version bumping (visitors should always get the latest page, and the gig list
changes on its own).

- One page (`index.html`, `styles.css`, `site.js`), top to bottom (order David chose 2026-10-26; the menu
  links follow it): next gig card, YouTube videos (load only when clicked), bio, music (4 songs in `music/`,
  album links to Amazon), booking contact.
- **Upcoming gigs stay hidden** until a visitor clicks "See all upcoming gigs" in the next-gig card (or
  the "gigs" menu link / a `#gigs` link). The section then offers **List** and **Calendar** views (month
  grid limited to this month through the last gig's month). David asked (2026-10-17) for **no past gigs**
  on the site, so `gigs.json` only holds gigs from yesterday on.
- `apps/` is David's **app suite** (unlinked, noindex): an installable app (its own `manifest.webmanifest`,
  `sw.js`, `icons/` made from the outline figure) that opens every app in one window. `launcher.js`: sets
  `sessionStorage['davyrockett-suite']` so apps show their "All apps" button (`suite.js`), a "Make everything work
  offline" button (registers each app's own `sw.js`), and one access key saved into every syncing app's own storage
  keys (`SYNCED` list; checked against each data repo first). The icons sit in four labelled groups (David, 2026-10-27): **gigs** (Website first, SOS Editor, SOS Band,
  GE150 Presets), **practice** (Page Fright, Lip Service), **students & clients** (First Frets, Jam Session,
  Memory Lane, Song Party), **personal** (Health Log, Z4 Log). On screens 900px+ wide the groups stay four
  across in a left column and the cards below move to their right (David, 2026-10-27; `apps.css`). Add each new app to the right group, `APPS` in launcher.js
  and `APPS` in apps/sw.js.
  Each icon has a small share button (added by launcher.js) that opens a panel with the app's link: Copy link,
  and Share… where the device has a share sheet.
  **Since 2026-10-21 this screen is the same as Rundown** (David: "Make the apps app exactly like this. We'll work on
  Rundown at a later date"): `apps/index.html`, `apps/launcher.js` and `apps/apps.css` were copied from the rundown
  repo (index.html, rundown.js, rundown.css) with only the Apps-specific bits changed (name, icon, `/apps/` as home,
  its own offline/update entry, a Rundown tile, which David hid for now on 2026-10-21: commented out in index.html). Header: the time and date instead of the "apps" title. Cards below
  the icons (never make the icons smaller, no badges on icons): **practice first**, a small 5-day San Diego weather
  forecast, next gigs (Davy Rockett from `gigs.json` + next SOS show), Z4 to-dos, autocross (date, title, weekday ·
  track · town), plus The Crossing and RJ sessions, which stay hidden until rundown-data has them. The calendar
  card and the Z4 to-dos card are commented out for now (David). Cards read the public `davyrockett/rundown-data` (details in the rundown repo's
  CLAUDE.md). Practice / Z4 ticks are only on this screen and Rundown (same storage keys); they never change or
  read anything in Lip Service, Page Fright or Z4 Log. If Rundown changes later, this screen doesn't follow
  automatically: copy the change over only if David asks.
  **Rundown** (www.davyrockett.com/rundown/, its own repo, 2026-10-21) is David's dashboard, started as a copy of this
  screen; it sets `sessionStorage['davyrockett-suite-home']` to `/rundown/` so apps' "All apps" button returns there
  (this screen sets `/apps/`). Its tile here is hidden for now (commented out).
  The suite's first tile is **Website** (same icon as the suite: the outline figure). The site's own
  pages load `suite.js` (copy of `Claude Apps/tools/suite.js`) so the "All apps" button shows there too when
  opened from the suite (no browser back button inside the installed suite).
- **`tv/`: the one TV address (www.davyrockett.com/tv, 2026-10-30, David's request).** The TV's browser opens it once;
  the **📺 TV** switch on the Apps screen (`#tv-toggle`, launcher.js) sets `localStorage['davyrockett-tv'] = '1'` for
  that device, and then every app's `suite.js` loads `/tv/mirror.js`. David: "don't overcomplicate… have the tv mirror
  the remote device", except the apps that already had a TV link.
  - `mirror.js` (iPad): on every change (MutationObserver, scroll, input; throttled, bigger copies wait longer) sends a
    copy of the page: head styles, `<html>`/`<body>` attributes, and the body HTML without scripts or the insides of
    hidden elements, with scroll places (`data-tv-sc`), sliders/ticks and modal dialogs (`data-tv-modal`) written in.
    Typed text (keys!) is never copied. Gzipped unless a TV says it can't unzip.
    **Canvas drawings (SOS Band charts, David's request 2026-10-30 "nice for rehearsals"):** each canvas becomes a JPEG
    (max 1400 px wide) the first time it's seen (SOS draws a page before putting it on the page), sent once per TV on
    `img` as `<key>\n<jpeg>`; the copy marks the canvas `data-tv-img`. tv.js draws it into the frame's canvas and asks
    on `need` for any it missed. A canvas redrawn later at the same size isn't re-sent. TV_CSS makes SOS Band's
    Perform page (`#pf-page`) fill the TV. Tested: chart viewer (scrolling sends only ~3 KB), Perform page turns,
    late-joining TV at 1600×900.
    Shows a small "On TV" pill beside the All apps button (tap to stop).
  - **Memory Lane / Song Party** keep their own link: mirror.js only sends `{own: 'ml.link-role'}` and calls their
    `linkStart('remote')`; the TV page sets that role to `tv` and opens the real app in its frame.
  - **Private** (`IDLE` in mirror.js): the Apps screen, Rundown, Health Log, Z4 Log. The TV shows its resting screen.
  - `tv.js` (TV, old-style JS): draws the copy in a same-origin frame (`srcdoc` with `<base>`), then updates only what
    changed (its own small morph), so CSS animations keep running. Pages are laid out at the TV's own size.
    Retained copies over 30 min old are ignored. Says `on:<id>:gz|plain` on `tv` (retained, 20 s, last will `off:<id>`).
  - **Several senders (2026-10-30 fix):** every davyrockett.com page with 📺 TV on sends (a forgotten Safari tab on the
    website made the TV jump between it and Page Fright). Each message carries `a`, when that page was last touched
    (pointerdown/touchstart/keydown/wheel/window focus; a page opened in the background starts at 0), and a touch sends
    even if nothing changed. tv.js follows one page (`owner`) and only switches to another when its `a` is newer.
  - **Size + Read music-only view (David picked these 2026-10-30):** the "On TV" pill has − / + (steps 60%–300%),
    saved on the remote per app and hash part (`davyrockett-tv-size:<app>:<read|improv|…>`), sent as `z`; the pill shows
    "Size N%" for a moment. tv.js puts the CSS in a `<style id="tv-view">` in the frame: `html{zoom:z}` normally. For
    Page Fright while `#read-view` shows: everything but `#score` is hidden and the SVG is sized to fit the whole
    exercise on screen, keeping its shape, **always, ignoring z** (David: "the TV should just show the entire exercise
    at once always"; a zoom-and-follow version was removed the same day). Read's − / + are greyed out (`readShown()`).
    The lines are as the remote laid them out, so a phone remote (2 bars a line) comes out tall and thin.
    Not tried on a real TV; `zoom` needs a browser that supports it (Chrome, Safari, Firefox 126+).
  - `relay.js`: both public MQTT relays at once (EMQX + HiveMQ, sends through both, dedupe by `id`/`n`/`t`).
    Topics `davyrockett-tv/dr/state|tv`. **Testing:** never use `dr`. Put `?link=claude-test-…` on the TV page and
    `localStorage['davyrockett-tv-link']` on the remote. For Memory Lane / Song Party, test with copies whose
    `LINK_CODE` is changed (see memory-lane's notes about its real `ml` link). Tested 2026-10-30 with two tabs:
    Page Fright, Jam Session, Raise the Barre (phone size), Memory Lane hand-off, Health Log resting, late-joining TV,
    plain (no unzip) fallback. Not yet tried on a real smart TV.
  - The publish workflow copies a fixed list of folders into `_site`: `tv` is on it (a new top-level folder must be added).
- `promo-materials/` is the press kit; `portfolio/` only redirects home (David doesn't want the portfolio).
  Both keep the old Wix addresses working.
- **Gigs come from the public Google Calendar "All Davy Rockett Gigs"**
  (`qlfaf5pt3ubfrqb158kub26g98@group.calendar.google.com`). `.github/workflows/site.yml` runs hourly:
  `tools/sync_gigs.py` reads the calendar's public iCal feed and writes `gigs.json` (upcoming gigs
  only; title, time, location, never the event description), commits it if it changed, then publishes the site.
  Every push to `main` also publishes. GitHub Pages source is "GitHub Actions", not a branch.
  The workflow commits `.keepalive` monthly so GitHub doesn't pause the hourly schedule.
- Video section: plain dark background (David removed the live band photo, 2026-10-17).
- Bio photo (`images/davy-stage.jpg`, David on a stool with guitar and mic, added 2026-10-26): on screens
  761px+ wide it fills the right side of the bio section and fades into the page on its left, top and bottom
  (CSS mask in styles.css); on phones it sits full width at the top of the bio and fades out at the bottom.
  It replaced the old blue-sweater cutout (`davy-guitar.png`, still the press kit's promo photo) and the
  scrolling parallax that went with it. (A full Wix-style parallax version was tried and undone earlier.)
- Gig times are Pacific wall-clock times and are shown as-is (not converted to the visitor's time zone).
  A gig stays "upcoming" until its end time.
- Colours: the logo orange `#E27039` is used as the accent here (to match the logo artwork), not the app
  orange `#F57C14`. Fonts: Questrial headings (lowercase, like the logo), Atkinson Hyperlegible body.
- Domain (switched 2026-10-17): bought through **Wix** (account davidrnorgren2@gmail.com, auto-renews
  Mar 22, 2027 for $56.50/2 yrs). DNS is edited in Wix (A records → GitHub's 4 IPs, `www` CNAME →
  davyrockett.github.io). **Keep the 7 Google MX records.** Pages custom domain: www.davyrockett.com.
  Wix Premium plan (Light) is no longer needed; next charge $336 on Mar 9, 2027 (cancel before then).
  Optional: transfer the domain to Cloudflare Registrar before Mar 2027. Details in README.
- Local preview: `Start Website.command` (port 8775).
