CREATE TABLE IF NOT EXISTS push_subscriptions (
 endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS push_user ON push_subscriptions(user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS admin_reviews (
 id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, admin_id TEXT NOT NULL,
 decision TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS reviews_ticket ON admin_reviews(ticket_id,created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notification_unread ON notifications(user_id,read,link);
