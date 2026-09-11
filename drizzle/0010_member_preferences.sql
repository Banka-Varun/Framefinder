CREATE TABLE IF NOT EXISTS member_preferences (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id),
 selected_plan TEXT NOT NULL DEFAULT 'free',
 billing_period TEXT NOT NULL DEFAULT 'quarterly',
 notification_prompted INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS account_lifecycle (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id),
 state TEXT NOT NULL CHECK(state IN ('deactivated','deleted')),
 updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS asset_erasure_queue (
 asset_id TEXT PRIMARY KEY NOT NULL,
 created_at TEXT NOT NULL
);
