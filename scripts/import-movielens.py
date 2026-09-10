"""Add every row of a locally supplied MovieLens movies.csv without guessing posters/languages.
Usage: python scripts/import-movielens.py /path/to/ml-latest-small/movies.csv
Rebuild afterwards. Existing catalog IDs stay stable. Imported IDs = 100000000 + movieId.
"""
import csv,json,re,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'data/movies.json';films=json.loads(p.read_text());ids={m['id'] for m in films};names={(m['title'].casefold(),m['year']) for m in films};count=0
with open(sys.argv[1],encoding='utf-8-sig',newline='') as f:
 for row in csv.DictReader(f):
  title=row['title'];match=re.search(r'\s*\((\d{4})\)$',title);year=int(match[1]) if match else 0;title=title[:match.start()] if match else title;id=100000000+int(row['movieId'])
  if id in ids or (title.casefold(),year) in names:continue
  films.append({'id':id,'title':title,'year':year,'language':'Unknown','minutes':0,'genres':[g for g in row['genres'].split('|') if g!='(no genres listed)'],'moods':[],'description':'','poster':'','source':'https://grouplens.org/datasets/movielens/latest/'})
  ids.add(id);names.add((title.casefold(),year));count+=1
p.write_text(json.dumps(films,ensure_ascii=False,indent=2)+'\n');print(f'Added {count} films; catalog now has {len(films)} films. Languages/posters are not supplied by MovieLens.')
