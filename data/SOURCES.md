# Catalog sources

The initial bundled catalog contained 203 films. The first 103 are the curated multilingual selection; poster image and source-page URLs are recorded per film. 100 additional deduplicated film records were selected from https://github.com/erik-sytnyk/movies-list/blob/master/db.json at commit `589b6c016a13dd4a389983668f2ee63d88faea52`. Only records with HTTPS poster URLs were imported; the TV miniseries Shogun was excluded. No plot descriptions were copied. Original IDs remain stable.

Languages for added records are manually curated primary-language labels; moods are genre-based heuristics. The included catalog is finite, not the full MovieLens or TMDB database. A configured TMDB token enables paginated live discovery and search.

Poster images are hosted by their respective sources. URLs were sourced, but continued availability and hotlink permission are not guaranteed. Cards with failed images are hidden from poster galleries. Film detail pages retain an accessible text fallback. Review media usage rights before a public commercial launch.

## Telugu expansion — 10 September 2026

The catalog now contains 311 records, including 132 Telugu films. Added 108 Telugu films and refreshed 22 existing Telugu poster URLs using the TMDB metadata snapshots in https://github.com/Mourya-Dev-Ops/TFIverse/tree/e78ba9f414ae84f39160cb6fef7eee5ed45aa344/data/movies-json . Selected only records with original_language=te, a release date, adult=false and a nonempty poster_path. Imported factual titles, release years, runtimes, genre labels, TMDB IDs and poster paths; no plot text or repository code was copied. Existing IDs, titles and descriptions remain stable. Punctuation-normalized title plus year deduplicates imports. Moods are genre-based heuristics. Each record links to its TMDB source page, with poster URLs on image.tmdb.org. These external images are subject to their owners’ rights and availability.

Seven titles identified by the owner as showing title covers now have an empty poster field so galleries and recommendations omit them. Their records remain available for existing diary entries.
