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

## Moving davyrockett.com from Wix to this site

The domain is registered at **Network Solutions** (paid through April 2027). Its DNS (the "address book"
that says where the website and email live) is currently run by **Wix**. Your Google email also uses the
domain, so the email records must come along, or email to @davyrockett.com stops arriving.

1. Log in where the domain's DNS can be changed: Network Solutions (or the Wix **Domains** page if you
   bought it through Wix). Switch the domain to Network Solutions' own DNS (or Cloudflare's free DNS).
2. Add these records:

   | Type | Name | Value |
   | --- | --- | --- |
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | davyrockett.github.io |
   | MX | @ | 10 → aspmx.l.google.com |
   | MX | @ | 20 → alt1.aspmx.l.google.com |
   | MX | @ | 20 → alt2.aspmx.l.google.com |
   | MX | @ | 30 → aspmx2.googlemail.com |
   | MX | @ | 30 → aspmx3.googlemail.com |
   | MX | @ | 30 → aspmx4.googlemail.com |
   | MX | @ | 30 → aspmx5.googlemail.com |
3. Tell Claude when it's done. Claude sets `www.davyrockett.com` as the custom domain in this repo's
   GitHub Pages settings and turns on HTTPS (GitHub issues the certificate in about 15–60 minutes).
4. Once the new site shows at davyrockett.com, cancel the Wix premium plan.

Optional money saver: transfer the domain itself to Cloudflare Registrar or Porkbun (about $11 a year,
versus Network Solutions' higher renewal price). Do it any time before April 2027.
