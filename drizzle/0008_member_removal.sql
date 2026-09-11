CREATE TABLE IF NOT EXISTS removed_accounts (
 user_id TEXT PRIMARY KEY NOT NULL,
 removed_by TEXT NOT NULL,
 removed_at TEXT NOT NULL
);
