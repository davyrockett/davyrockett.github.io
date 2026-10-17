"""Read David's public "All Davy Rockett Gigs" Google Calendar and write gigs.json for the website.

Run by .github/workflows/site.yml every hour. Only the title, time and location of each gig are
published; event descriptions are left out on purpose.

    pip install icalendar recurring-ical-events
    python tools/sync_gigs.py
"""

import json
import sys
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

CALENDAR_ID = "qlfaf5pt3ubfrqb158kub26g98@group.calendar.google.com"
FEED_URL = f"https://calendar.google.com/calendar/ical/{CALENDAR_ID.replace('@', '%40')}/public/basic.ics"
TZ = ZoneInfo("America/Los_Angeles")
OUT = Path(__file__).resolve().parent.parent / "gigs.json"


def local(value):
    """Calendar date/datetime -> local time string, and whether it's an all-day event."""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=TZ)
        return value.astimezone(TZ).strftime("%Y-%m-%dT%H:%M"), False
    return value.isoformat(), True


def main():
    with urllib.request.urlopen(FEED_URL, timeout=60) as response:
        cal = icalendar.Calendar.from_ical(response.read())

    # Expand repeating events (weekly residencies etc.) from the first gig until two years ahead.
    end = date.today() + timedelta(days=730)
    gigs = []
    for event in recurring_ical_events.of(cal).between(date(2000, 1, 1), end):
        if str(event.get("STATUS", "")).upper() == "CANCELLED":
            continue
        start, all_day = local(event.decoded("DTSTART"))
        finish = local(event.decoded("DTEND"))[0] if event.get("DTEND") else None
        if all_day and finish:
            # An all-day event's end date is the day after it finishes.
            finish = (date.fromisoformat(finish) - timedelta(days=1)).isoformat()
        gigs.append({
            "title": str(event.get("SUMMARY", "")).strip() or "Gig",
            "start": start,
            "end": finish,
            "allDay": all_day,
            "location": str(event.get("LOCATION", "")).strip(),
        })

    gigs.sort(key=lambda g: g["start"])
    data = {"calendar": CALENDAR_ID, "gigs": gigs}
    text = json.dumps(data, ensure_ascii=False, indent=0) + "\n"
    if OUT.exists() and OUT.read_text() == text:
        print(f"No changes ({len(gigs)} gigs).")
        return
    OUT.write_text(text)
    print(f"Wrote {len(gigs)} gigs to {OUT.name}.")


if __name__ == "__main__":
    sys.exit(main())
