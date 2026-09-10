"""Read-only extraction from the schemas in the user's scripts.
No request headers, user session identifiers, notification topics, credentials,
proxy rotation or live HTTP requests are copied here.
"""
import re
from urllib.parse import urlparse
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

def parse_movie_url(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != 'in.bookmyshow.com' or parsed.username or parsed.password or parsed.port:
        raise ValueError('Expected a public BookMyShow movie URL')
    parts = parsed.path.split('/')
    event = next((p for p in parts if re.fullmatch(r'ET\d+', p)), None)
    date = next((p for p in parts if re.fullmatch(r'\d{8}', p)), None)
    if not event:
        raise ValueError('No exact movie event ID in URL')
    if date:
        datetime.strptime(date, '%Y%m%d')
    return {'eventCode': event, 'dateCode': date}

def movie_space_candidates(data):
    """A listing candidate is not a verified bookable show."""
    candidates = []
    for widget in data.get('data', {}).get('showtimeWidgets', []):
        if widget.get('type') != 'groupList':
            continue
        for group in widget.get('data', []):
            for venue in group.get('data', []):
                name = venue.get('additionalData', {}).get('venueName')
                if name:
                    candidates.append({'venueName': name, 'bookable': None, 'verification': 'show-time-format-status-required'})
    return candidates

def layout_sessions(data):
    """Preserve each session and screen attribute; do not hardcode PCX."""
    return [{'sessionId': show['sessionId'], 'dateCode': show.get('showDateCode'), 'time': show.get('showTime'), 'screenAttribute': show.get('attributes'), 'bookable': None}
            for show in data.get('data', {}).get('showTimes', []) if show.get('sessionId')]

def newly_available(previous_rows, current_rows):
    """Separate seat-difference helper. None means no baseline, not zero seats."""
    if previous_rows is None:
        return {}
    return {row: sorted(set(seats) - set(previous_rows.get(row, []))) for row, seats in current_rows.items() if set(seats) - set(previous_rows.get(row, []))}

def retry_delay(status, retry_after=None, failures=0, now=None):
    """Pause on denied access; respect Retry-After rather than rotate IPs."""
    if status in (401, 403):
        return None  # Stop until access is repaired.
    if status == 429:
        if retry_after:
            try:
                return max(1, int(retry_after))
            except ValueError:
                try:
                    return max(1, int((parsedate_to_datetime(retry_after) - (now or datetime.now(timezone.utc))).total_seconds()))
                except (TypeError, ValueError):
                    pass
        return min(3600, 60 * 2 ** min(failures, 6))
    if status >= 500:
        return min(900, 30 * 2 ** min(failures, 5))
    return 60
