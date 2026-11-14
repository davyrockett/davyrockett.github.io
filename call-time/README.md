# Call Time

For days when one appointment takes over the whole day. You type in where you need to be, when, how long the
trip takes and what you need to do to get ready. Call Time works backwards once and shows one big number:
**how much free time you have left.** No more redoing the math in your head.

Live: https://www.davyrockett.com/call-time/

## Using it

- **+ Add a plan**: where you need to be, the day, "Be there at", travel time, and your getting-ready
  routines (tap to add; change the minutes for this plan if you like; "+ Other" for a one-off).
- The main screen shows the next plan:
  - before you need to start: **free time left** and "Free until 10:45 AM";
  - while getting ready: the step you should be on and when to leave;
  - after the leave time: "Time to leave" / "On your way".
  - Below: the whole timeline, with where you are now highlighted.
- **Add to calendar** puts "Get ready" and "Leave" events in your phone's calendar with alerts, so they ring
  even when the app is closed. Settings > Calendar heads-up adds an extra alert before your free time ends
  (10 minutes unless you change it). If you edit the times afterwards, the app tells you to add it again.
- Other plans are listed under **Coming up**. Tap one to edit or delete it. A plan disappears once its time
  has passed.
- **Settings**: your routines (name and minutes), calendar heads-up, appearance, share link, check for updates.

The countdown changes once a minute, never every second: a ticking clock is what we're getting away from.
There is no automatic cushion: if you want spare time, set "Be there at" a bit earlier.

Everything is saved on the device only (no syncing).

## Files

- `index.html` page; `styles.css` look; `app.js` everything the app does.
- `sw.js` offline copy (bump `VERSION` with `tools/bump.sh` on every change).
- `move.js`, `suite.js`, `share.js` shared with David's other apps.
- `tools/make-icons.py` draws the icons. `Start Call Time.command` runs it on the Mac (port 8771).
