<!-- shared-preferences:start -->
## David's preferences (shared across all of David's apps)

This section is the same in every one of David's app repos. If David states a new general preference
(not specific to this app), add it here, in this file, and commit it. David's Mac copies it to the other repos.

**Who David is.** A guitar teacher and gigging guitarist (he/him) who builds personal and teaching apps with Claude.
Comfortable with tech but not a programmer: explain in plain words, skip jargon, keep replies short and
concrete. Likes to see things working: verify before saying "done".

**How the apps are built and hosted**
- Public web apps on GitHub Pages under the **davyrockett** GitHub account (never an Artifact or a hosted
  service). Live at `https://davyrockett.github.io/<repo>/`.
- Each app: `index.html` (+ `app.js` / `styles.css` when bigger), `sw.js` service worker for offline use
  with an update banner, `manifest.webmanifest`, `icons/` drawn by `tools/make-icons.py`, a
  `Start <App>.command` for local testing on the Mac, and a README written for David.
- **`move.js`** (since 2026-10-17): every app loads `move.js` as its first script and lists it in `sw.js`
  `ASSETS`. It carries the app's settings over when the apps move from davyrockett.github.io to
  davyrockett.com (plan: `Claude Apps/move-to-davyrockett-com.md`; master copy `Claude Apps/tools/move.js`).
  Keep it; a new app gets a copy with `data-keep` set to its own localStorage key prefix.
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

- One page (`index.html`, `styles.css`, `site.js`): next gig card, music (4 songs in `music/`, album
  links to Amazon), YouTube videos (load only when clicked), bio, booking contact.
- **Upcoming gigs stay hidden** until a visitor clicks "See all upcoming gigs" in the next-gig card (or
  the "gigs" menu link / a `#gigs` link). The section then offers **List** and **Calendar** views (month
  grid limited to this month through the last gig's month). David asked (2026-10-17) for **no past gigs**
  on the site, so `gigs.json` only holds gigs from yesterday on.
- `promo-materials/` is the press kit; `portfolio/` only redirects home (David doesn't want the portfolio).
  Both keep the old Wix addresses working.
- **Gigs come from the public Google Calendar "All Davy Rockett Gigs"**
  (`qlfaf5pt3ubfrqb158kub26g98@group.calendar.google.com`). `.github/workflows/site.yml` runs hourly:
  `tools/sync_gigs.py` reads the calendar's public iCal feed and writes `gigs.json` (upcoming gigs
  only; title, time, location, never the event description), commits it if it changed, then publishes the site.
  Every push to `main` also publishes. GitHub Pages source is "GitHub Actions", not a branch.
  The workflow commits `.keepalive` monthly so GitHub doesn't pause the hourly schedule.
- Video section: plain dark background (David removed the live band photo, 2026-10-17).
- Bio photo parallax (`setupBioParallax` in site.js): on screens 761px+ wide the guitar photo drifts down
  its column slower than the text, from the top of the column as the bio enters to the bottom as it
  leaves. Off on phones and for "reduce motion". (A full Wix-style parallax version was tried and undone.)
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
