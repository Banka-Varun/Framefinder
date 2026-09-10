"""Build item cosine neighbours from MovieLens ratings and an explicit ID mapping.
Usage: python train_movielens.py ratings.csv mapping.json model.json
mapping.json maps MovieLens movie IDs to the IDs in data/movies.json.
No dataset or fitted model is bundled. Use only data you have rights to use.
"""
import csv, json, math, sys
from collections import defaultdict

def train(ratings_path, mapping):
    users = defaultdict(dict)
    with open(ratings_path, newline='', encoding='utf-8') as stream:
        for row in csv.DictReader(stream):
            movie = mapping.get(row['movieId'])
            if movie is not None:
                users[row['userId']][str(movie)] = float(row['rating']) - 3
    norms, dots = defaultdict(float), defaultdict(float)
    for values in users.values():
        items = sorted(values.items())
        for i, (a, av) in enumerate(items):
            norms[a] += av * av
            for b, bv in items[i + 1:]:
                dots[a, b] += av * bv
    model = defaultdict(dict)
    for (a, b), dot in dots.items():
        denominator = math.sqrt(norms[a] * norms[b])
        if denominator:
            model[a][b] = model[b][a] = dot / denominator
    return dict(model)

if __name__ == '__main__':
    mapping = json.load(open(sys.argv[2], encoding='utf-8'))
    model = train(sys.argv[1], mapping)
    with open(sys.argv[3], 'w', encoding='utf-8') as stream:
        json.dump(model, stream)
    print(f'Saved neighbours for {len(model)} mapped films. Evaluate on held-out ratings before claiming quality.')
