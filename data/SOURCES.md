# Catalog sources

The initial bundled catalog contained 203 films. The first 103 are the curated multilingual selection; poster image and source-page URLs are recorded per film. 100 additional deduplicated film records were selected from https://github.com/erik-sytnyk/movies-list/blob/master/db.json at commit `589b6c016a13dd4a389983668f2ee63d88faea52`. Only records with HTTPS poster URLs were imported; the TV miniseries Shogun was excluded. No plot descriptions were copied. Original IDs remain stable.

Languages for added records are manually curated primary-language labels; moods are genre-based heuristics. The included catalog is finite, not the full MovieLens or TMDB database. A configured TMDB token enables paginated live discovery and search.

Poster images are hosted by their respective sources. URLs were sourced, but continued availability and hotlink permission are not guaranteed. Cards with failed images are hidden from poster galleries. Film detail pages retain an accessible text fallback. Review media usage rights before a public commercial launch.

## Telugu expansion — 10 September 2026

The catalog now contains 311 records, including 132 Telugu films. Added 108 Telugu films and refreshed 22 existing Telugu poster URLs using the TMDB metadata snapshots in https://github.com/Mourya-Dev-Ops/TFIverse/tree/e78ba9f414ae84f39160cb6fef7eee5ed45aa344/data/movies-json . Selected only records with original_language=te, a release date, adult=false and a nonempty poster_path. Imported factual titles, release years, runtimes, genre labels, TMDB IDs and poster paths; no plot text or repository code was copied. Existing IDs, titles and descriptions remain stable. Punctuation-normalized title plus year deduplicates imports. Moods are genre-based heuristics. Each record links to its TMDB source page, with poster URLs on image.tmdb.org. These external images are subject to their owners’ rights and availability.

Seven titles identified by the owner as showing title covers now have an empty poster field so galleries and recommendations omit them. Their records remain available for existing diary entries.

## Audience-led expansion — 11 September 2026

Added 500 unique films with a recorded audience average of at least 7/10, at least 100 votes, runtime of at least 70 minutes, and an HTTPS poster returning an image response during verification. No plot text was imported. Original movie IDs and diary references are preserved. New records use `1000000 + TMDB ID`.

Factual film metadata, poster paths and genre labels: Meilisearch's TMDB movie demo snapshot, `src/federated-search/setup/movies.json`, commit `595f92ebfd61b53ef5bd45751858b54ff9fff785`: https://github.com/meilisearch/demos/blob/595f92ebfd61b53ef5bd45751858b54ff9fff785/src/federated-search/setup/movies.json . Joined on TMDB IDs to the historical Movie Dataset metadata for original language and vote counts, `data/processed/movies_final_clean.csv`, commit `7397cf53bffe438905f64f4aee0f03e834f6764a`: https://github.com/xingxingchengju-oss/movie-recommender-dpw-uic/blob/7397cf53bffe438905f64f4aee0f03e834f6764a/data/processed/movies_final_clean.csv . This is a historical rating snapshot, not a claim about current box-office success.

Updated recorded audience scores for 269 existing films, including 130 Telugu records from the TFIverse TMDB snapshot already cited above. Discovery uses a confidence-weighted rating `(votes * rating + 500 * 6.5) / (votes + 500)`. Recommendations combine that score with the member's genre and language preferences. Live TMDB discovery, when configured, requests released films with averages at least 7/10 and sufficient votes. The interface does not expose catalogue totals or source-count labels. Poster availability may change after verification.
