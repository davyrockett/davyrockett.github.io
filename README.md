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

You already own the domain: it's registered at **Network Solutions**, paid through April 22, 2027.
Wix only runs its DNS (the "address book" saying where the website and email live). Google email
records (MX) are on the domain, so they must come along.

Plan: move the DNS to **Cloudflare** (free), point it at GitHub, then (optional) move the registration
to Cloudflare too (about $10–11 a year, versus Network Solutions' higher prices). Don't cancel Wix
until the new site shows at davyrockett.com.

### 1. Cloudflare account and DNS (about 15 minutes)
1. Sign up at cloudflare.com (free plan) and turn on two-factor sign-in.
2. **Add a domain** → `davyrockett.com` → Free plan. Cloudflare copies the current records from Wix.
3. In **DNS → Records**, delete the Wix website records (A records `185.230.63.x` and the `www` CNAME
   pointing at `wixdns.net`), keep every **MX** record, and add:

   | Type | Name | Content | Proxy |
   | --- | --- | --- | --- |
   | A | @ | 185.199.108.153 | DNS only (grey cloud) |
   | A | @ | 185.199.109.153 | DNS only |
   | A | @ | 185.199.110.153 | DNS only |
   | A | @ | 185.199.111.153 | DNS only |
   | CNAME | www | davyrockett.github.io | DNS only |

   The MX records should read: 10 `aspmx.l.google.com`, 20 `alt1.aspmx.l.google.com`,
   20 `alt2.aspmx.l.google.com`, 30 `aspmx2.googlemail.com`, `aspmx3…`, `aspmx4…`, `aspmx5.googlemail.com`.
   Add any that are missing.
4. Cloudflare shows two nameservers (like `xxx.ns.cloudflare.com`). Write them down.

### 2. Network Solutions (5 minutes)
1. Log in → **Domains** → davyrockett.com → **Nameservers** → custom → enter the two Cloudflare ones.
2. Wait until Cloudflare says the domain is **Active** (usually under an hour, can take up to a day).

### 3. GitHub (Claude does this)
Tell Claude it's active. Claude sets `www.davyrockett.com` as the site's custom domain and turns on
HTTPS once GitHub's certificate is ready (15–60 minutes). davyrockett.com redirects to www automatically.

### 4. Cancel Wix
Once the new site shows at davyrockett.com: Wix → Subscriptions → cancel the Premium plan (and turn
off auto-renew on anything else there).

### 5. Optional: move the registration to Cloudflare (saves money)
1. Network Solutions: turn off **domain lock** / transfer lock and get the **authorization (EPP) code**.
   If they offer to cancel privacy protection, that's fine: Cloudflare hides your details for free.
2. Cloudflare → **Domain Registration → Transfer Domains** → davyrockett.com → enter the code → pay
   (about $10–11; it adds a year, so it then runs to April 2028). Turn on **auto-renew**.
3. Approve the confirmation email(s). The transfer finishes within 5 days, with no downtime, since
   Cloudflare is already running the DNS.
4. Afterwards, close or let lapse anything left at Network Solutions (make sure nothing auto-renews).
