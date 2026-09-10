"""Dependency-free recommendation engine; JSON request on stdin, JSON response on stdout.
Content cosine works immediately. A MovieLens item-neighbour model is optional.
"""
import json, math, os, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
CATALOG = json.loads((ROOT / 'data/movies.json').read_text())

def cosine(a, b):
    a, b = set(a['genres'] + a['moods']), set(b['genres'] + b['moods'])
    return len(a & b) / (math.sqrt(len(a) * len(b)) or 1)

def recommend(payload):
    ratings = payload.get('ratings', {})
    if not isinstance(ratings, dict) or len(ratings) > 10000:
        raise ValueError('ratings must be an object with at most 10000 entries')
    for value in ratings.values():
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not .5 <= value <= 5 or value % .5:
            raise ValueError('ratings must be in half-star increments from 0.5 to 5')
    minutes = payload.get('maxMinutes', 240)
    if not isinstance(minutes, (int, float)) or not 1 <= minutes <= 600:
        raise ValueError('maxMinutes must be between 1 and 600')
    mood, language = payload.get('mood', 'All moods'), payload.get('language', 'Any language')
    rated = [m for m in CATALOG if str(m['id']) in ratings]
    liked = [m for m in rated if ratings[str(m['id'])] >= 4]
    model = {}
    model_path = os.getenv('FRAMEFINDER_MODEL')
    if model_path:
        model = json.loads(Path(model_path).read_text())
    results = []
    for movie in CATALOG:
        key = str(movie['id'])
        if key in ratings or movie['minutes'] > minutes:
            continue
        if mood != 'All moods' and mood not in movie['moods']:
            continue
        if language != 'Any language' and language != movie['language']:
            continue
        content = sum(cosine(movie, r) * (ratings[str(r['id'])] - 3) for r in rated)
        neighbours = model.get(key, {})
        supported = [(float(neighbours[k]), value - 3) for k, value in ratings.items() if k in neighbours]
        collaborative = sum(s * r for s, r in supported) / (sum(abs(s) for s, _ in supported) or 1)
        score = .7 * content + .3 * collaborative if supported else content
        nearest = max(liked, key=lambda r: cosine(movie, r), default=None)
        reason = f"Because you liked {nearest['title']}" if nearest and cosine(movie, nearest) > 0 else (f'For an {mood.lower()} mood' if mood != 'All moods' else 'Explore your taste')
        results.append({**movie, 'score': score, 'reason': reason, 'method': 'hybrid' if supported else 'content-cosine'})
    return {'movies': sorted(results, key=lambda m: (-m['score'], m['id'])), 'method': 'hybrid-when-supported' if model else 'content-cosine'}

if __name__ == '__main__':
    try:
        print(json.dumps(recommend(json.load(sys.stdin))))
    except (ValueError, TypeError, OSError, KeyError) as exc:
        print(json.dumps({'error': str(exc)}))
        sys.exit(2)
