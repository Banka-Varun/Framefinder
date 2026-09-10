"""Booking-opening detection adapted from the supplied two-space watcher.

Accepts normalized, explicitly verified show observations. A venue appearing in
an event page is NOT enough. No outbound notifications or live scraping occur.
Run: python services/booking/monitor.py --config CONFIG --snapshot SNAPSHOT --state STATE
The site exports CONFIG. SNAPSHOT must follow the documented provider contract.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
import re

IST = timezone(timedelta(hours=5, minutes=30))

def identity(value):
    return re.sub(r'\s+', ' ', value.strip()).casefold()

def parse_timestamp(value):
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('Observation timestamps must include a timezone')
    return result

def validate_snapshot(snapshot, now):
    if snapshot.get('schemaVersion') != 1 or not isinstance(snapshot.get('shows'), list):
        raise ValueError('Unsupported snapshot schema')
    fetched = parse_timestamp(snapshot['observedAt'])
    if fetched > now + timedelta(seconds=30) or now - fetched > timedelta(minutes=5):
        raise ValueError('Snapshot is stale or has a future timestamp')
    if len(snapshot['shows']) > 10000:
        raise ValueError('Snapshot too large')
    seen = set()
    for s in snapshot['shows']:
        fields = ('provider', 'eventCode', 'sessionId', 'venueName', 'regionCode', 'language', 'edition', 'format', 'date', 'time')
        if any(not isinstance(s.get(k), str) or not s[k].strip() for k in fields):
            raise ValueError('Show is missing required matching fields')
        if not re.fullmatch(r'ET\d+', s['eventCode']):
            raise ValueError('Invalid event code')
        if s.get('bookable') is not None and type(s['bookable']) is not bool:
            raise ValueError('bookable must be true, false or null')
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', s['date']) or not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d', s['time']):
            raise ValueError('Invalid show date/time')
        datetime.strptime(s['date'], '%Y-%m-%d')
        key = (s['provider'], s['eventCode'], s.get('venueCode') or s['venueName'], s['sessionId'], s['date'])
        if key in seen:
            raise ValueError('Duplicate session observations in one snapshot')
        seen.add(key)
    return fetched

def matches(alert, show):
    if alert.get('kind') != 'booking-open' or not alert.get('eventCode'):
        return False
    if alert['eventCode'] != show['eventCode'] or alert.get('regionCode') != show['regionCode']:
        return False
    if alert.get('date') != show['date'] or alert.get('timeZone') != 'Asia/Kolkata':
        return False
    if identity(alert.get('language', '')) != identity(show['language']) or identity(alert.get('edition', '')) != identity(show['edition']):
        return False
    if identity(show['format']) not in {identity(f) for f in alert.get('formats', [])}:
        return False
    if not (alert.get('timeFrom', '99:99') <= show['time'] <= alert.get('timeTo', '00:00')):
        return False
    return any((t.get('venueCode') == show.get('venueCode')) if t.get('venueCode') else identity(t['name']) == identity(show['venueName']) for t in alert.get('theaters', []))

class Monitor:
    def __init__(self, state):
        self.db = sqlite3.connect(state)
        self.db.execute('PRAGMA busy_timeout=5000')
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS observations (
          observation_key TEXT PRIMARY KEY, bookable INTEGER NOT NULL, observed_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS outbox (
          event_key TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL, acknowledged_at TEXT
        );
        ''')

    def process(self, config, snapshot, now=None):
        now = now or datetime.now(timezone.utc)
        observed = validate_snapshot(snapshot, now)
        if config.get('schemaVersion') != 1 or not isinstance(config.get('alerts'), list):
            raise ValueError('Unsupported alert config')
        created = []
        with self.db:
            for alert in config['alerts']:
                if not isinstance(alert.get('id'), str) or not alert['id']:
                    raise ValueError('Alert ID required')
                fingerprint = hashlib.sha256(json.dumps(alert, sort_keys=True).encode()).hexdigest()
                for show in snapshot['shows']:
                    if not matches(alert, show) or show.get('bookable') is None:
                        continue  # Unknown observations never erase the last known state.
                    starts = datetime.fromisoformat(show['date']+'T'+show['time']).replace(tzinfo=IST)
                    if starts <= now:
                        continue
                    key = hashlib.sha256(json.dumps([fingerprint, show['provider'], show.get('venueCode') or show['venueName'], show['sessionId'], show['date']], separators=(',', ':')).encode()).hexdigest()
                    old = self.db.execute('SELECT bookable, observed_at FROM observations WHERE observation_key=?', (key,)).fetchone()
                    if old and observed <= parse_timestamp(old[1]):
                        continue
                    bookable = int(show['bookable'])
                    # Newly observed open shows should notify once too, including newly added sessions.
                    if bookable and (old is None or old[0] == 0):
                        event_key = key + ':booking-open'
                        payload = {'eventKey': event_key, 'alertId': alert['id'], 'type': 'booking-open', 'title': alert['title'], 'show': show, 'observedAt': observed.isoformat()}
                        cur = self.db.execute('INSERT OR IGNORE INTO outbox(event_key,payload,created_at) VALUES(?,?,?)', (event_key, json.dumps(payload), now.isoformat()))
                        if cur.rowcount:
                            created.append(payload)
                    self.db.execute('INSERT INTO observations VALUES(?,?,?) ON CONFLICT(observation_key) DO UPDATE SET bookable=excluded.bookable, observed_at=excluded.observed_at', (key, bookable, observed.isoformat()))
        return created

    def pending(self):
        return [json.loads(r[0]) for r in self.db.execute('SELECT payload FROM outbox WHERE acknowledged_at IS NULL ORDER BY created_at,event_key')]

    def acknowledge(self, event_key):
        # A delivery adapter must call this only after a successful provider response.
        with self.db:
            self.db.execute('UPDATE outbox SET acknowledged_at=? WHERE event_key=? AND acknowledged_at IS NULL', (datetime.now(timezone.utc).isoformat(), event_key))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True)
    parser.add_argument('--snapshot', required=True)
    parser.add_argument('--state', required=True, help='Dedicated SQLite state path per account; never share one user config across accounts')
    args = parser.parse_args()
    monitor = Monitor(args.state)
    monitor.process(json.loads(Path(args.config).read_text()), json.loads(Path(args.snapshot).read_text()))
    print(json.dumps({'pendingEvents': monitor.pending(), 'delivery': 'not-configured'}, indent=2))
