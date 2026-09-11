CREATE TABLE IF NOT EXISTS member_feedback (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES accounts(id),
  kind TEXT NOT NULL CHECK(kind IN ('contact','report','rating')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS member_feedback_status_created ON member_feedback(status,created_at);
