# davyrockett.com

David's music website: upcoming gigs, songs, videos, bio and booking.

## Adding a gig

Just add it to the **All Davy Rockett Gigs** Google Calendar. The website checks the calendar every
hour and updates itself. Tips:

- The event **title** is what visitors see (e.g. "Solterra w Yamaoka and Co").
- Put the venue's address in **Location** and the site adds a map link.
- The event **description** is never shown on the website, so private notes are fine there
  (but the calendar itself is public, so anyone with the calendar link can see them).
- Delete or cancel an event and it disappears from the site within the hour.

In a hurry? On GitHub open the repo → **Actions** → **Update gigs and publish site** → **Run workflow**.

## Changing the site

Ask Claude (on the Mac or from your phone). Every change pushed to GitHub goes live in a minute or two.
To look at it on the Mac first, double-click **Start Website.command**.

## What's where

| File | What it is |
| --- | --- |
| `index.html` | The page itself (text, bio, videos, album links) |
| `styles.css` | Colours, fonts and layout |
| `site.js` | Gig list, song players, video buttons |
| `gigs.json` | Gigs copied from Google Calendar (updated automatically, don't edit) |
| `music/`, `images/` | Songs and pictures |
| `promo-materials/` | Press kit page (davyrockett.com/promo-materials) |
| `tools/sync_gigs.py` | Reads the Google Calendar |
