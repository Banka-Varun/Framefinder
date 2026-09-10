# Framefinder: Java + Python services

## What is implemented

- Java 17 HTTP service: method/auth checks, request size limits, concurrency limit, timeout and error handling.
- Python engine: mood/runtime/language filters, rating-weighted cosine similarity over genre/mood features, explanations, watched-film exclusion.
- Optional MovieLens trainer: item cosine neighbours from supplied ratings plus an explicit MovieLens-to-catalog ID map. If a model is supplied, the Python engine blends content and collaborative scores when supported.
- Hosted app: React interface and Worker API with D1 account persistence. The published deployment uses the TypeScript equivalent content recommender, NOT a running Java/Python server. A server-side adapter can call the Java service once it is hosted and configured.

## Run locally

From repository root, using Java 17+ and Python 3:

```sh
java services/java/RecommendationServer.java
```

In another terminal:

```sh
curl http://127.0.0.1:8081/api/recommendations -H 'Content-Type: application/json' -d '{"ratings":{"1":5},"mood":"All moods","language":"Any language","maxMinutes":180}'
```

Set FRAMEFINDER_PYTHON if python3 is not your Python command. Set FRAMEFINDER_API_TOKEN to enable bearer-token validation. The service deliberately binds to loopback; remote hosting requires authenticated TLS ingress. Do not expose the development server directly.

## Connect to the site

The site's /api/recommendations adapter supports JAVA_RECOMMENDER_URL and JAVA_RECOMMENDER_TOKEN server-only variables. JAVA_RECOMMENDER_URL is the full HTTPS /api/recommendations endpoint. Configure them only after deploying the Java/Python service to a host that supports both runtimes. The Sites Worker runtime cannot execute JVM/Python processes. The interface calls its own same-origin API; never send the service token to the browser. If a configured Java service fails, the API reports the error instead of silently substituting another engine.

## Fit the optional collaborative model

Obtain a suitably licensed MovieLens dataset. Create an explicit mapping JSON, e.g. {"MOVIELENS_ID":1}, using actual matching title/year records. Do not assume catalog IDs equal MovieLens IDs. Then run:

```sh
python3 services/python/train_movielens.py /path/to/ratings.csv /path/to/mapping.json /path/to/model.json
```

Set FRAMEFINDER_MODEL to the model path before starting Java. No MovieLens data, evaluation score, or trained collaborative model is included. The starter is content-based until that step is done. Measure precision/recall or NDCG on held-out interactions and compare against popularity and content baselines before claiming improvement.

## Integration boundaries

Booking alerts are saved DRAFTS, not jobs. There is no scheduler, live availability feed, email/push provider, checkout or trial billing yet. To implement them: get provider-authorized availability access, keep last observed availability server-side, enqueue one notification on a closed-to-open transition, deduplicate deliveries, record delivery outcomes, and charge trial usage only for successful supported events. Do not infer booking availability from calendar dates.

Ticket exchange is unavailable. Booking screenshots and URLs cannot verify ownership, transfer eligibility, cancellation or redemption. Listings and money movement require issuer cooperation, transfer confirmation and an approved payment/payout provider with refund/dispute policies. No escrow capability is implemented or claimed.

Letterboxd support is browser-side CSV import and outbound search, not OAuth account synchronization. It matches title plus year in the 10-film starter catalog. Uploaded CSV bytes are not stored. Only matched ratings are saved. Poster images are externally hosted; source attribution is in data/movies.json and each movie detail. Obtain appropriate image/data rights before commercial release.


The latest booking-opening core, script review, snapshot contract and integration limitations are documented in [booking/README.md](booking/README.md).
