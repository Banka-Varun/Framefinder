# Framefinder

A film community and recommendation project with independent accounts, real URLs, a film diary, booking preferences and ticket submissions. **The repository is deployable source, not an activated payment business.** External integrations require your own credentials and provider access.

## What is included

- `/` public home, `/signup`, `/login`, password reset and email verification pages.
- `/onboarding`: select languages first, then at least three watched favorites.
- `/for-you`, `/tonight`, `/films`, `/films/[id]`, `/my-list`.
- 203 included films with sourced poster URLs, pagination and title-cover fallback. This is a curated starter catalog, **not the complete MovieLens dataset**. TMDB enables much larger searchable results and real posters; MovieLens import is supplied below.
- Real account-specific watched/liked/watchlist/rating/review records. Film counts reflect this app’s users, not fabricated external views or likes.
- `/members`, `/members/[username]`, profile photos, follows and `/settings`.
- `/booking-alerts`: title, language, release version, Hyderabad, multiple theaters, multiple formats, date, IST time range and movie URL. No seat quantity for booking-open alerts.
- Three delivered notifications free. Razorpay order creation, server-set prices, capture verification, HMAC signature validation, idempotent credit grants and refund events. Checkout remains disabled until live-feed and payment settings are configured.
- `/tickets`: persisted submissions, private proof upload, duplicate-booking fingerprint and separately displayed face/asking prices. Sellers can explicitly publish unverified listings for enquiries; only verified listings can enter checkout. Marketplace checkout is a documented partner adapter; **there is no built-in issuer access, escrow service or seller payout provider**.
- Java/Python recommendation and booking-monitor services under `services/`.

## Run and deploy to Vercel

1. Use Node 22.13+ (Node 24 is supported) and Python 3 for the optional services.
2. Create a Turso database. Set its HTTPS URL and database auth token in `.env.local`, using `.env.example` as a guide. Never commit the real environment file.
3. Create a **private** Supabase Storage bucket for uploaded photos/proof, and set the three storage variables. This is storage only; account authentication belongs to this app. Both the Turso token and Supabase service role key are server secrets.
4. Configure Turnstile with your development and production hostnames. `REQUIRE_CAPTCHA=true` deliberately prevents public registration when its secret is absent. For local-only development you can set it to `false`.
5. Run:

```bash
npm install
npm run db:migrate
npm run dev
```

6. Put this folder’s contents at the root of a new GitHub repository. Import that repository in Vercel. Select **Next.js**, use the repository root, and add the same environment variables in Vercel settings. The included configuration uses `npm install` and `npm run build`.
7. Run database migrations once before accepting traffic. Redeploy after changing runtime secrets where your hosting platform requires it.

The ZIP is a standard Next.js export and contains no Cloudflare worker imports. Vercel functions serve the UI/API. Turso retains account data across deploys; Supabase Storage retains images. The private ChatGPT Site and your Vercel deployment use separate databases unless you explicitly migrate data.

## Activate Google and email

Create a Google OAuth **Web application** client. Add the exact callback:

```
https://YOUR_DOMAIN/api/v1/auth/google-callback
```

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Google sign-in includes state, PKCE and nonce validation. A password account is not silently linked just because its email matches a Google account. The Google button explains the missing configuration until credentials are present.

Set `RESEND_API_KEY` and `MAIL_FROM` using a verified sender domain. Then verification and forgotten-password email links work. Email/password registration works without Google. Passwords are salted with scrypt; only opaque session-token hashes are stored. Cookies are HttpOnly, Secure and SameSite=Lax. Use HTTPS in production. Unverified accounts cannot purchase credits or enter ticket checkout.

Turnstile runs real server-side verification. There is no decorative “not a robot” checkbox that pretends to provide protection. Secrets stay on the server.

## More than ten movies

The included 203-film JSON works without an API key. Missing artwork uses a labeled local title cover; it is not a counterfeit official poster. Add `TMDB_READ_TOKEN` to enable paginated TMDB discovery/search and India watch-provider options. Provider links open TMDB’s film watch-options page, because the provider endpoint does not return universal Netflix/Prime deep links. JustWatch attribution is displayed.

To use **every row of your own downloaded MovieLens catalog**:

```bash
python scripts/import-movielens.py /path/to/ml-latest-small/movies.csv
npm run build
```

MovieLens does not supply language, runtime or posters. Imported entries use `Unknown` language until enriched. Do not label all entries English or invent image URLs. Imported films appear in all-language search; language-specific onboarding requires enrichment. Keep IDs stable when enriching. Respect the dataset’s own usage conditions.

Letterboxd import is in `/settings`. Upload your `ratings.csv` account export. Exact title/year matches are imported; unmatched titles are reported and not fabricated. The importer does not download someone else’s private data or claim that a profile URL is a CSV. It supports up to 2,000 rows per upload, with a 500 KB file limit.

## Recommendation architecture

The deployed web app initially ranks films by favorite-film genre overlap and selected languages. This is a transparent content-based baseline, not a trained deep-learning model. `services/python/train_movielens.py` trains the optional neighbor model from an actual ratings dataset; the Python service can blend content and collaborative signals. The Java gateway hosts that Python recommender behind an authenticated HTTP interface. Set JAVA_RECOMMENDER_URL to its HTTPS /api/recommendations endpoint and JAVA_RECOMMENDER_TOKEN to use it from the new web app; this switches the recommendation API from the TypeScript baseline to the Java/Python service. Consult `services/README.md` for its setup.

**Java and a continuously running monitor do not run inside Vercel functions.** Run them on a separate long-lived host/container. The services are included in the project; supplying an endpoint does not itself train a model or start a scheduler.

## Booking automation and payments

The supplied legacy scripts were reviewed but were not executed against ticket providers or used to send messages. `services/booking/monitor.py` is a normalized snapshot matcher with durable deduplication; `legacy_adapter.py` does not guess whether a blocked/unblocked seat is bookable. Connect an authorized show feed, map provider theater IDs, and run the worker on a scheduler before setting `BOOKING_FEED_READY=true`.

The app accepts a trusted booking-open event at `POST /api/v1/webhooks/booking`. Sign the exact JSON bytes using HMAC-SHA256 with `BOOKING_WEBHOOK_SECRET` and put the hex signature in `x-booking-signature`. Required fields:

```json
{
  "eventId": "stable-provider-show-event-id",
  "alertId": "saved-alert-id",
  "title": "Exact movie title",
  "city": "Hyderabad",
  "language": "English",
  "edition": "Original release",
  "theaterId": "local-directory-id",
  "format": "2D",
  "date": "2026-12-20",
  "time": "19:30",
  "bookingUrl": "https://in.bookmyshow.com/.../ET12345678",
  "observedAt": "2026-12-01T10:00:00.000Z",
  "bookable": true
}
```

The observation must be within five minutes. The app rechecks every selected dimension, rejects unrelated shows and stale observations, limits consumption to available credits, and deduplicates notifications. Notifications persist in `/notifications`; email notifications for booking events and Web Push are not wired in this version. Password/verification emails are separate.

For paid alerts, configure Razorpay in **test mode first**, a webhook at `/api/v1/webhooks/razorpay`, and a server-controlled price in paise. Subscribe to `payment.captured` and `refund.processed`. The callback must match the stored order, amount, currency and captured status before credits are granted. A browser success callback alone does not grant credits. Test provider outage, signature failure, webhook retries and refunds in your own Razorpay sandbox before live keys. Refunding a pack removes that pack’s credit entitlement; historical notifications remain visible. The app does not issue refunds itself.

## Navigation, seat alerts and negotiations

Navigation uses shared native-history client links and a session provider mounted in the root layout. Loading the session renders a neutral account placeholder instead of briefly showing Sign in. Ordinary link clicks update the app’s route directly; modified clicks still open a new tab and direct URLs retain server routing. Session checks are shared, concurrent API reads are deduplicated, film searches are debounced, and recently visited reads are cached in memory. Mutations invalidate cached data; logout clears it. No private profile information is stored in localStorage. Full catalog data stays on the server; only the featured selection travels with the client.

`/seat-alerts` is the separate unblocked-seat flow: location → one theater → one movie → multiple dates (up to 31). `/booking-alerts` continues to group multiple theaters under one movie. The signed complete-seat-map API compares successive observations, starts with a silent baseline and deduplicates releases. See `services/booking/SEAT-ALERTS.md` and `seat_bridge.py`. Live monitoring still requires your authorized collector and scheduler.

`/messages` holds private buyer–seller conversations per listing. Participants can send text, propose a total price, counteroffer, accept, decline or withdraw. Only the other participant can accept/decline an offer. Accepted offers feed the server-side checkout amount; they do not reserve, verify or transfer a ticket. Once checkout reserves a listing, its conversations become read-only. Messages refresh every seven seconds while the tab is visible. This is polling, not a WebSocket service.

Asking prices may exceed the original face value, as requested; both are displayed. This capability does not establish that a particular issuer or jurisdiction permits resale or a markup. The connected issuer/payment partner must enforce the applicable terms before accepting money. The app does not bypass issuer restrictions.

## Ticket partner contract and limits

An uploaded screenshot is evidence for review, not verification. Booking URLs are not proof of ownership. Existing submissions remain private until the seller chooses Publish for enquiries. New submissions have an explicit publish checkbox. A published `pending_verification` listing is visible with an unverified badge; proof and booking references are never disclosed. A trusted issuer must still confirm ownership and transferability before checkout.

A configured HTTPS partner receives bearer-authenticated calls:

- `POST /verify`: listing ID, seller ID, original booking reference, metadata and proof image bytes in base64. The raw booking reference is sent for issuer validation but stored locally only as a fingerprint. The partner must validate the actual booking with its issuer.
- `POST /checkout`: listing/buyer/seller IDs, total amount in paise, currency, return URL, `showStartsAt`, and `payoutCondition: show_completed_without_open_dispute`. `Idempotency-Key` is the listing ID. Return `{ "url": "https://..." }`. The partner must actually implement its compliant marketplace payment, transfer, dispute, refund and delayed-payout process. **The app does not hold funds or treat elapsed show time as proof that the buyer attended.**
- Send signed events to `POST /api/v1/webhooks/tickets` with `x-ticket-signature = HMAC_SHA256(raw_body, TICKET_WEBHOOK_SECRET)`. Body: `{ "listingId": "uuid", "status": "verified|rejected|completed|refunded|expired", "timestamp": 1790000000000 }`; timestamp is milliseconds and must be fresh. Status transitions are checked. `completed` requires a reserved listing and should only be emitted after successful transfer/settlement confirmed by the partner.

A checkout timeout leaves the reservation pending for reconciliation; it never relists a possibly paid ticket automatically. Partner calls use listing IDs for idempotency. A real ticketing agreement and payout integration remain necessary. This app cannot verify BookMyShow ownership by scraping a screenshot, bypass non-transferable ticket rules, or independently supply escrow. The UI states this before collecting buyer payment.

## Validation and remaining work

The Site build, TypeScript checks and local SQLite-backed API tests cover registration/login/logout, password hashing, CSRF, separate account state, private proof access, catalog pagination, booking matching/deduplication/credits, ticket duplicate rejection and Razorpay capture/signature/idempotency with **mocked provider responses**. They do not establish live OAuth, CAPTCHA, email deliverability, streaming availability, issuer approval or real payment success without your credentials.

The design is responsive by code. No browser screenshot/UI automation was performed. Before a public launch, run the configured providers’ sandbox flows and an accessibility review. Add operational support for account deletion, abuse reports, email retries and disputed ticket transactions before opening a real marketplace.

## Official integration references

- [Google OAuth web client](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Turso HTTP API](https://docs.turso.tech/sdk/http/reference)
- [TMDB discovery](https://developer.themoviedb.org/reference/discover-movie) and [watch providers](https://developer.themoviedb.org/reference/movie-watch-providers)
- [MovieLens downloads](https://grouplens.org/datasets/movielens/latest/)
- [Razorpay integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)

## Ticket verification and chat access

There is no built-in admin account, admin password, or manual verification dashboard. Ticket verification is performed only through the signed ticket-partner callback. The partner must validate booking ownership, current ticket validity and permitted transfer with the issuer; inspecting a screenshot is not sufficient. Do not change a database status to manufacture verification. Until a partner is connected, listings remain unverified and checkout stays unavailable.

A seller can publish an unverified listing for enquiries. Another signed-in account opens that listing and selects **Chat with seller & negotiate**. The seller opens **Buyer conversations** or `/messages` to reply. A seller cannot message their own listing.

## Upcoming movie selection

Booking alerts, released-seat alerts and ticket submissions share an upcoming Telugu/Hollywood selector. Seven announced titles, their source URLs and poster sources are in `data/upcoming-movies.json`, checked on 2026-09-10. This list is curated and must be refreshed over time; it is not a live BookMyShow feed. Announced release dates are not theater availability and do not set the user's show date. Users can choose other included films or enter an exact title. Known titles show artwork in forms and saved listings; unavailable artwork or unmatched custom titles use a title fallback.

Seat alerts accept up to 31 unique dates. Add an individual date or a consecutive range, then remove any date you do not want. Location, theater and movie selection remain in that order.


## Social notifications and manual ticket review

This update adds follower/following pages, mutual connections, movie-grouped conversations, unread counts, unsend for your own messages, and server-side contact filtering before messages are saved. Search accepts partial titles and ignores capitalization.

1. Vercel builds now apply pending SQL migrations using the existing `TURSO_HTTP_URL` and `TURSO_AUTH_TOKEN`. New notification tables and browser push signing keys are created once. Keep the database credentials enabled for Production. Preview deployments should use a separate preview database.
2. Sign in on your phone, open Notifications or Settings, tap **Enable browser notifications**, and allow Chrome notifications. Delivery supports new followers, incoming conversation requests, messages, offers, admin updates and matching feed alerts. Push messages show the event title and details: follower or sender name, offer, or show/seat information. The chat message body is not included; open the authenticated conversation to read it. No ntfy app is required. Live show/seat notifications still require the authorized collector to send matching webhook events. Browser/device settings can delay or prevent delivery.
3. Administrator access is controlled by the owner-managed Vercel Production variable `ADMIN_USER_IDS`, containing account IDs from the accounts table. Existing values still work. `/admin` only offers an access check; the server rejects accounts outside that list. No setup instructions or account IDs are displayed on this page, and visitors cannot grant themselves access. The profile menu shows the admin link only to designated accounts.
4. Admins can inspect private proof only from the review page, approve a manual review, request more information, reject a listing, and notify an individual member. Every review records the reviewer, decision, note and time. An admin cannot review their own listing. Manual approval is displayed separately and does not claim issuer verification or activate checkout.
5. Set `TMDB_READ_TOKEN` to your TMDB API Read Access Token in Production for broad movie search and posters from TMDB. The included catalog remains available without it. Missing or unreleased artwork uses a labeled fallback.

Contact filtering catches numeric and spaced phone numbers, common number-word sequences, UPI URIs and payment handles. It is a heuristic; deliberate obfuscation is not guaranteed to be caught. Rejected text is never stored or delivered. Unsend removes the text from the conversation, but cannot erase something a recipient has already read. Push delivery failures do not cancel a saved message or offer.

Run `npm test` and `npm run build` before publishing changes.


## Google sign-in: owner setup

The app already implements Google OAuth with state, PKCE, a nonce, and server-side identity validation. A real Google-issued OAuth client is still required.

1. Open Google Cloud Console and select or create a project named Framefinder.
2. Open Google Auth Platform. Complete Branding / Get started with app name Framefinder, your support email and developer contact email. Choose External audience for public Google accounts.
3. Open Clients → Create client → Web application. Name it Framefinder Web.
4. Authorized JavaScript origin: `https://framefinderr.vercel.app`
5. Authorized redirect URI (exact): `https://framefinderr.vercel.app/api/v1/auth/google-callback`
6. Create the client. Put the client ID in `GOOGLE_CLIENT_ID` and the client secret in `GOOGLE_CLIENT_SECRET` in Vercel Production environment variables. Keep the client secret out of GitHub and browser-side variables.
7. Save, redeploy, then use Continue with Google. If the consent configuration limits the audience to test users, add the accounts that will test the app. Review Google's publishing requirements before opening it to everyone.

Existing email/password accounts now connect Google through a one-time Framefinder password confirmation at `/link-google`. This preserves the account ID, password, profile and history. Future Google sign-ins use the linked Google subject directly. The linking proof is server-side, browser-bound, expires after ten minutes and is single-use. Forgot your password? Reset it, then start Continue with Google again.

Google setup reference: https://developers.google.com/identity/protocols/oauth2/web-server#create-authorization-credentials

## Catalog and artwork update

The bundled catalog now includes 311 films, including 132 Telugu films with sourced poster URLs. Telugu discovery uses this included selection even when TMDB is configured; unmatched Telugu searches can query TMDB. For You and Tonight’s Pick include a language selector. Recommendations draw from all selected languages and interleave them. The posterless titles reported by the owner are excluded from discovery and recommendations; their IDs and existing watch history remain intact. Gallery cards whose images fail in the browser disappear instead of becoming title covers. Film detail pages still offer a text fallback so diary links remain usable. See data/SOURCES.md for provenance.

## Compact tickets, avatars and administrator sessions

- `/admin` remembers a successful access check for the current authenticated session. Refreshes and navigation do not ask again. A new login requires one check; logout expires it. Every admin API request still checks `ADMIN_USER_IDS`, so removing a role takes effect even for a previously verified session.
- Messages use compact horizontal rows. Ticket Exchange uses narrow 9:16 portrait cards with a poster, movie title, essential details and an action. Follower summaries show one username and the remaining count; the count opens the complete paginated follower list.
- `/my-tickets` is available from the profile dropdown and your own profile. Purchases & checkouts are restricted to the buyer; Selling is restricted to the seller. Rows include show time, status, checkout amount and recorded dates. A reserved ticket is labeled Checkout pending, never Purchase confirmed. Migration `0005_ticket_receipts.sql` is applied during configured Vercel builds.
- A signed ticket-partner `completed` webhook may include `purchasedAt` as an ISO date-time. This records the buyer's purchase date; the existing `timestamp` records partner confirmation time. If the purchase date was not supplied (including historical records), the UI explicitly says Not recorded. No purchase dates or payments are inferred from a listing's creation time. Without a connected partner, users can list and chat but cannot complete a purchase.
- Signup includes an optional avatar creator. Existing users can open Change avatar in Settings; onboarding does not repeat the creator. Background, skin tone, hairstyle, expression and accessory choices render through a public, cacheable SVG endpoint. Only predefined design tokens are accepted; arbitrary SVG, HTML and URLs are rejected. Designs are saved on the user's account and existing photo uploads remain supported. Accounts without a photo receive a deterministic generated avatar. This feature does not require Supabase or another image service.

Ticket Exchange and listing details now display Admin approved when the latest manual review is approved, with issuer verification pending shown separately. Only the signed issuer callback can mark a ticket Verified by issuer and enable checkout. Uploading alone shows Awaiting review. Listing status refreshes on window focus and every 15 seconds while the page is visible. My Tickets also displays the latest review decision.
# Navigation, usernames and member support

The main navigation has Home, For You, Discover, Ticket Exchange and Messages. Signed-in Home shows recent public film activity from followed members; For You retains personalised recommendations. The labelled hamburger Menu before the logo opens a left-side drawer containing Tonight’s Pick, My List, booking and seat alerts, member discovery, Help & FAQs, reporting, contact, ratings, About, Terms, Privacy and sharing. Existing ticket cards and profile ticket navigation are preserved.

The interface uses a charcoal and white palette with orange accents. Contact and rating confirmations do not display internal tracking IDs.

Public help pages are available at `/help`, `/about`, `/contact`, `/report`, `/rate`, `/terms` and `/privacy`. FAQs can be searched and expanded. Sharing uses the device share sheet when available, with clipboard and selectable-link fallbacks. Support submissions and ratings require a signed-in account and are visible only in the admin support inbox. Admins can resolve or reopen requests; the existing notification form can be used to reply to members.

Google signup derives a handle from the account name. Duplicate handles receive a suffix, with database uniqueness enforced during insertion. Email signup suggests an available name-based handle while preserving manual edits. New members can confirm their handle in onboarding; existing members can change it in Settings. Renaming preserves the account ID, history, tickets and conversations, but changes the member profile URL. Names that cannot produce an ASCII handle use a `member` fallback which the member can edit.

Messages keeps the existing movie-based ticket conversations and adds All / Unread / Closed filters and a pinned show, theater, ticket count and review-status summary. This does not add general member-to-member direct messages or alter payment/transfer behavior.

**Database update:** `drizzle/0006_member_feedback.sql` adds the feedback table and support-inbox index. The existing build migration script applies it when Turso is configured. Apply it before running this version against a database; no existing data is renamed or removed. No new environment variables or dependencies are required.

Validation: `npm run typecheck`, `npm test`, and the production build. The new regression tests cover same-name Google signups, username conflicts and stable account history, followed-member feed access, feedback retry deduplication, private support access and rating validation. Live OAuth, notification delivery and payment providers still require testing with deployment credentials.


## September product update

- The signed-in hamburger opens secondary pages only. Home, For You, Search films, Ticket Exchange and Messages stay in the primary navigation. Visitors do not see the drawer.
- Blue light/dark themes are a device preference. Message groups use portrait posters; conversations show display names and avatars. Member discovery excludes the viewer; profile owners can remove their followers.
- Onboarding saves liked/watched state without a star rating. Existing ratings are preserved because their origin was not recorded.
- Reviewed tickets leave the queue. Rejected or needs-info submissions link from Notifications to a private corrected-proof form. Each review is tied to the actual proof and concurrent reviews accept only one decision. Manual proof approval remains separate from issuer verification and checkout. After replacement proof, issuer `verified`/`rejected` callbacks must include the matching `proofId`; old callbacks are rejected. An issuer integration must fetch and verify the new proof before sending that callback.
- `/subscriptions` contains Starter and Alert Pass plans, balance, verified checkout and purchase history. The default prepaid pass is INR 100 for 10 alerts; server configuration can override it. There is no automatic recurring charge. Payments remain unavailable unless payment credentials and live booking monitoring are configured. The existing three-credit starter allowance remains.
- Telugu discovery uses the connected TMDB catalog, as English does, instead of stopping at the bundled Telugu films. Browse results require posters, at least 50 votes and an average of 6/10, ranked by popularity. Search can find less popular titles. Provider failures fall back to bundled films with an explanation. No claim of thousands of bundled films is made: broad coverage requires `TMDB_READ_TOKEN`.
- Public provider data has a bounded 15-minute cache, Next data-cache revalidation and request deduplication. Signed-in browsing permits 120 requests/minute; social writes permit 90/minute; alert edits permit 30/minute. Existing authentication, upload, chat, ticket and billing limits still apply. Limits are atomic in shared SQL, include `Retry-After`, and expire with bounded cleanup. These application limits do not replace an edge firewall or guarantee a production capacity number.
- Password hashing uses asynchronous scrypt with the existing parameters and format. Inbox-list polling is reduced to 30 seconds; active chats poll at 10 seconds and pause when hidden.

Validation: `npm test` includes review/resubmission ownership, stale issuer callbacks, concurrency, unrequested-rating prevention, member privacy and provider pagination tests. The local burst test sends 110 simultaneous writes and expects 90 successes and 20 HTTP 429s; provider tests use mocked responses and collapse 20 simultaneous requests into one. This is an in-memory functional concurrency check, not a Vercel or Turso load benchmark. `npm run build` validates the production bundle. Browser visual QA and live paid checkout are not verified in this environment.

Architecture: the existing deployed app is Next.js/React with TypeScript API handlers, Turso SQL and private Supabase image storage. Java/Python recommendation services in `services/` are optional and are not automatically deployed to Vercel. Keeping the current UI does not require a Python or Java backend rewrite, but a backend migration is a separate project and has not been claimed here.

Cost boundaries: [Vercel Hobby](https://vercel.com/docs/plans/hobby) is for non-commercial personal use and usually pauses capped features rather than billing overages. Paid alert sales require suitable commercial hosting. Database, storage, email, payment and movie-data services have their own plans and quotas; repository code cannot verify the owner's billing account. [TMDB's free API](https://developer.themoviedb.org/docs/faq) is for attributed non-commercial use; check commercial licensing before monetization. No paid plan or service was purchased by this change.


## Original-theme and people-search update

The original first-commit palette is restored: charcoal `#11171b` and green `#c2f38b`, with the light/dark preference retained. The header has a name/username search field and a permanent Messages button next to profile controls. Search results prioritize display names and pictures; underscores in usernames are matched literally. The drawer's Explore group contains Home, My List, Ticket Exchange, Booking Alerts and Unblocked Seats. Tonight's Pick, Members and the Your Pages group are absent from the drawer. Film tabs on the home surfaces keep Following, For You, Discover Films and My List accessible. Alert plans remain inside Booking Alerts.

All 13 supplied pictures are copied unchanged into `public/profile-pictures/`. Signup, onboarding and Settings offer male/female picture collections, random selection and an explicit thumbnail choice. The chosen image is saved per account; gender is never guessed from a name or email. Existing generated avatars display initials until the member chooses a picture; uploaded profile photos remain. The browser tab references a new versioned FrameFinder mark and both legacy SVG icon paths are updated.

Admin → Manage members supports searching accounts and explicitly confirmed removal/restoration. Removal is reversible deactivation, not permanent data deletion: it revokes sessions, disables future sign-in, hides the profile/listings and keeps records. Self/admin removal is prohibited. Verified/reserved exchanges must be resolved first. Removed participants' chats become read-only. Restore does not republish hidden tickets. No production member was removed by implementing this control. Migration `0008_member_removal.sql` adds the account-removal table.


### Appearance and picture interests update

- Appearance is in the profile menu and Settings, with System / Light / Dark previews. System responds to operating-system theme changes, and the browser preference persists across reloads and tabs. The header theme button is removed.
- Ticket dividers retain their dashed line without circular ornaments. The profile menu shows both the display name and @username.
- Twenty additional supplied pictures bring the collection to 33. Anime, superheroes, cartoons and Telugu cinema can be browsed directly; recommendations rank exact film-title matches ahead of saved languages and favorite genres. Suggestions never overwrite a saved picture, and users can choose any collection.
- Admin review returns a viewer-specific can_review flag and disables self-review controls. Existing server self-review denial and atomic protection against a second review remain unchanged. No reviewer roles or permissions were changed pending clarification of the requested admin policy.
- Tests cover supplied assets, film/language picture ranking, saved choices and viewer-specific review controls. Browser visual QA was not run.


### Activity navigation, membership and admin workspace

- My Home now shows the signed-in member's recent film ratings. Booking Alerts and Ticket Exchange are visible beside My List, with Upcoming Alerts and Unblocked Seats in a shared secondary navigation. The hamburger is borderless and icon-only.
- Public listing and new-chat access require publication plus approval of the current proof (or issuer verification). Pending/rejected submissions remain available to the seller in My Tickets. Public cards omit review labels and countdowns and align consistently; all decorative ticket circles are removed. Checkout still requires issuer verification.
- Administrator accounts are recognized on every signed-in request. The workspace uses separate Reviews, Members, Notifications, Support and Subscriptions pages. Notification recipients are searchable; selected members, all active members or opted-in community subscribers are supported. Bulk delivery inserts in-app notifications atomically and deduplicates retries. No production broadcasts were sent during development.
- FrameFinder Club is a saved, free subscription with join/cancel and ticket/community update preferences. Approved published ticket updates match saved languages; community updates can be sent to opted-in subscribers. Show preferences and existing credits remain separate. New payment orders are disabled; existing payment reconciliation remains intact.
- Public four/five-star feedback is an explicitly labelled selected set. Each rating requires the author's opt-in and admin publication; authors can revoke public visibility. Existing private ratings/support messages remain private.
- Twelve new portrait files are included unchanged; the duplicate Luffy upload reuses its existing file. All 45 unique pictures remain accessible, including visible Cartoons, Anime, Animation and Hero categories. Signup remembers the first selected favourite and offers a matching random portrait with an explicit use-this-picture choice. Unlabelled portraits stay generic; exact hero matches use filename-supplied identities, not face identification. Film associations checked against [Hi Nanna](https://www.netflix.com/title/81682028), [Chatrapathi](https://www.hotstar.com/in/movies/chatrapathi/1000055396/watch) and [Netflix's Salaar trailer](https://www.youtube.com/watch?v=9Im1q4gvk1M).
- Migration 0009 adds subscriptions, publication consent, broadcast retry records and first-favourite preferences. Ten automated suites cover new access/privacy/retry behavior as well as existing flows. Browser visual QA was not run.

### Member experience update

Manage Subscription saves Free / Plus / Unlimited / Pro Max plan preferences and monthly / quarterly / half-yearly / yearly periods. Only the provided quarterly reference prices are displayed; other paid-period prices remain unannounced. Paid selection is explicitly a preview: no charge, checkout, paid entitlement, or automatic renewal is created. Free update preferences remain functional. The subscription page separates the member's private ratings from consented, published community highlights.

Notification permissions are offered after initial onboarding, once per account, with enable/skip choices; ongoing controls live in Settings. Header unread indicators are dots. Notification sender images derive from authorized conversations/profile links, with a dedicated supplied image for team notices.

Settings supports credential-confirmed temporary deactivation and permanent deletion. Passwordless accounts confirm using a ten-minute email code. Temporary deactivation revokes sessions and hides listings; authenticated sign-in restores the profile without republishing listings. Permanent deletion erases profile data, diary, feedback, alerts and authored messages, retaining anonymized transaction records and a non-restorable tombstone. Active ticket exchanges block both actions. Asset records are removed immediately and storage keys enter a durable erasure queue, drained on deletion and subsequent session checks; failed storage removals retry. The client describes this queued file removal explicitly. Administrator member restoration cannot reverse a member's privacy choice.

Migration `0010_member_preferences.sql` runs through the existing deploy-time migration script. Account lifecycle, privacy, subscription persistence, sender metadata, notification setup and storage request shape are covered by automated tests; email/storage calls are mocked in tests.
