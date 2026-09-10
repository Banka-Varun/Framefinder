# Booking alert integration

The UI exports its complete saved preferences as booking-alert-config.json. Each preference has one movie, exact language/version, multiple theater IDs and formats, one show date and a local start-time window in Asia/Kolkata. There is no seat-count requirement. The export enriches theater IDs with directory names and known venue codes. A BookMyShow movie URL supplies the exact event code; incomplete mappings are skipped by the monitor, never guessed from title substrings.

The directory contains 18 named Hyderabad theaters from https://in.bookmyshow.com/hyderabad/cinemas (checked 2026-09-10). It is not exhaustive or continuously synchronized. PRHN came from the supplied script; AMBH was verified in https://in.bookmyshow.com/cinemas/hyderabad/amb-cinemas-gachibowli/buytickets/AMBH/. Unresolved codes use exact venue-name matching in the normalized provider contract. No provider venue IDs were invented.

## Implemented and tested

- Movie URL extraction with exact host and event-ID validation.
- Listing/session extraction from the response shapes visible in the supplied source. Listing candidates remain bookable=null until actual session fields have been verified.
- Exact event, city, language, edition, theater, format, date and time matching on normalized snapshots.
- SQLite-backed observation history and notification outbox. Detect first observed bookable shows and new sessions added after the first poll. Deduplicate once per alert configuration, theater, session and show date across restarts.
- Unknown/error observations do not masquerade as closed shows. Stale/malformed observations are rejected. Passed show times are ignored.
- Pending events remain queued until a delivery adapter explicitly acknowledges success. This is an outbox contract, not a claim of exactly-once external email delivery.
- Separate seat-set comparison helper with a per-session baseline; it does not affect the booking-opening form.
- Backoff calculation for HTTP 429/5xx and stop on 401/403. No IP rotation or retry-through-block behavior.

## What is not connected

No live provider poller, hosted scheduler, email/push sender or application-user routing is active. monitor.py is a runnable local detection core, not an active integration with the published Worker. It reads snapshots from disk and emits pending events. The supplied scripts were inspected, not executed. Personal account/session values and shared notification topics were not copied. Original uploads are unchanged.

Before live integration, obtain a redacted successful response from each relevant endpoint showing actual show/session records, bookable status, language, format and time, plus a closed/no-show response. The original source alone does not establish the undocumented fields needed to verify booking availability. Do not label mere venue or movie presence as 'bookings open'. Preserve provider-approved access and backoff; use a backend host that supports the actual connector runtime.

## Run locally

Use a dedicated state file per account; the CLI is not a public multi-tenant API.

```sh
python3 services/booking/monitor.py --config booking-alert-config.json --snapshot observations.json --state account-booking-state.sqlite
python3 -m unittest discover -s services/booking -p 'test_*.py'
```

## Normalized snapshot contract

The following is a synthetic schema example, not real availability. observedAt must be timezone-aware, no older than five minutes, and not materially in the future. Every show has explicit normalized language, edition, format, date and HH:MM time. The integration adapter must establish these values from actual provider data; it cannot invent missing values. bookable=null represents unknown. Never infer closed state solely from absence in a partial response.

```json
{
  "schemaVersion": 1,
  "observedAt": "2030-01-01T06:00:00Z",
  "shows": [{
    "provider": "fixture",
    "eventCode": "ET12345",
    "sessionId": "example-session",
    "venueCode": "PRHN",
    "venueName": "Prasads Multiplex: Hyderabad",
    "regionCode": "HYD",
    "language": "Telugu",
    "edition": "Original release",
    "format": "PCX",
    "date": "2030-01-02",
    "time": "19:00",
    "bookable": true
  }]
}
```

## Findings in the supplied scripts

The booking watcher matched venue and movie substrings without checking session bookability, format, version or time. Two independent flags could generate duplicate notifications and were not scoped to each complete alert. It marked notification state even when delivery failed. The seat watcher fixed one venue, PCX and past dates, discovered sessions only at startup, used a six-seat threshold, wrote polling state to Git and issued three notifications per event. The global first-run flag could mishandle sessions discovered later. The local adapter replaces those assumptions with explicit inputs, per-session state and a delivery outbox. Live provider mapping remains unverified.

## New account-based web app

The updated application has `/api/v1/alerts` for authenticated preference retrieval and a signed `/api/v1/webhooks/booking` delivery endpoint. The new UI saves preferences in the app database. The earlier standalone JSON export belongs to the older UI; for this version, export the authenticated alerts response and wrap it with the `schemaVersion` and theater/event metadata expected by the monitor. See the root Vercel guide for the precise signed delivery contract. A service-account pull endpoint and hosted scheduler are not provided automatically.
