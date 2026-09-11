CREATE TABLE IF NOT EXISTS member_subscriptions (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id),
 active INTEGER NOT NULL DEFAULT 1,
 ticket_updates INTEGER NOT NULL DEFAULT 1,
 community_updates INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS feedback_publication (
 feedback_id TEXT PRIMARY KEY NOT NULL REFERENCES member_feedback(id),
 consent INTEGER NOT NULL DEFAULT 0,
 published INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS admin_broadcasts (
 id TEXT PRIMARY KEY NOT NULL,
 actor_id TEXT NOT NULL,
 payload_hash TEXT NOT NULL,
 dispatch_token TEXT NOT NULL,
 sent_count INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS taste_profiles (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id),
 first_movie_id INTEGER NOT NULL
);
