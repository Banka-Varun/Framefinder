CREATE TABLE IF NOT EXISTS ticket_receipts (
 listing_id TEXT PRIMARY KEY,
 buyer_id TEXT NOT NULL,
 amount INTEGER NOT NULL,
 reserved_at TEXT NOT NULL,
 purchased_at TEXT,
 confirmed_at TEXT,
 updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS receipts_buyer ON ticket_receipts(buyer_id,reserved_at);
