# Unblocked seats

`/seat-alerts` saves one location, one theater, one movie and between 1 and 31 different dates. This is separate from `/booking-alerts`, where one movie can have several selected theaters and formats.

Saved preferences are available to their owner through `GET /api/v1/seat-alerts`. Live delivery requires a provider-authorized seat-map collector and scheduler. A profile's saved preferences do not themselves start a BookMyShow watcher. The app never calls an undocumented seat map “verified” merely because a page loaded.

## Signed complete snapshot

Set `SEAT_FEED_READY=true` only after the feed is connected. Send the exact JSON bytes to `POST /api/v1/webhooks/seats`, with HMAC-SHA256 hex signature in `x-seat-signature` using `SEAT_WEBHOOK_SECRET`. A Python delivery adapter is supplied in `seat_bridge.py`.

```json
{
  "alertId": "uuid-from-saved-alert",
  "provider": "your-authorized-provider",
  "sessionId": "provider-session-id",
  "layoutId": "stable-seat-layout-version",
  "city": "Hyderabad",
  "theaterId": "local-directory-id",
  "title": "Exact movie title",
  "date": "2026-12-20",
  "time": "19:30",
  "bookingUrl": "https://in.bookmyshow.com/.../ET12345678",
  "observedAt": "2026-12-01T10:00:00.000Z",
  "complete": true,
  "seats": {"A1": "held", "A2": "available", "A3": "sold", "A4": "unavailable"}
}
```

All example availability is synthetic. Observations must be no older than five minutes; the show must not have started. Seat IDs are scoped to a show/session/layout, not a global seat number. A new layout starts a new baseline. The first observation never sends a release alert. Only seats present in the preceding complete map with `held`, `sold` or `unavailable` state and now explicitly `available` count as releases. New seat IDs do not count as releases. Partial maps, unknown states, mismatched dates/theaters/movies and old observations are rejected or ignored. Ordering uses observation timestamps, not delivery order.

Changes persist in D1/Turso with an outbox; retries reuse an event ID. Notification delivery shares the three-free-credit balance with booking-open alerts. A duplicate event neither creates another notification nor debits again. Live email/Web Push is not connected; notifications appear in the app. The notification cannot reserve seats or guarantee they are still available when opened.

Provider mapping of exact theater/session IDs is still required. Do not rotate proxies, bypass a provider access block, or reuse private account headers from an uploaded script.
