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

## The davyrockett.com domain

**Switched to this site on 2026-10-17.** The domain was bought through **Wix** (account
davidrnorgren2@gmail.com), and its records are managed in Wix → Domains → davyrockett.com →
Manage DNS records:

| Type | Name | Value |
| --- | --- | --- |
| A | davyrockett.com | 185.199.108.153, .109.153, .110.153, .111.153 (GitHub) |
| CNAME | www | davyrockett.github.io |
| MX | davyrockett.com | Google email (7 records): leave these alone |

(`m.davyrockett.com` still points at the old Wix mobile site; harmless, delete any time.)

GitHub repo Settings → Pages has the custom domain `www.davyrockett.com` with HTTPS enforced.

### Before March 2027 (both Wix subscriptions were paid through then)
- **Wix Premium plan (Light):** no longer needed. Next charge **$336 on Mar 9, 2027**. Cancel it any
  time before then (Wix → Premium Subscriptions → Premium Plan → ⋯ → Cancel plan). Cancelling takes
  effect immediately with no refund, so there's no benefit to doing it early.
- **Domain:** renews through Wix for **$56.50 / 2 years on Mar 22, 2027**. Cheaper option: transfer it to
  Cloudflare Registrar (about $10–11/year) before then: Wix → Domains → ⋯ → Transfer away from Wix gives
  the transfer code; start the transfer at Cloudflare (needs a Cloudflare account), and copy the DNS
  records above into Cloudflare first. **Don't let the domain lapse.**
