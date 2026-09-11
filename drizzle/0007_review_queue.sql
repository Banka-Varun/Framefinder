ALTER TABLE tickets ADD COLUMN review_pending INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE admin_reviews ADD COLUMN proof_id TEXT;
--> statement-breakpoint
UPDATE admin_reviews SET proof_id=(SELECT proof_id FROM tickets WHERE tickets.id=admin_reviews.ticket_id);
--> statement-breakpoint
UPDATE tickets SET review_pending=0 WHERE EXISTS(SELECT 1 FROM admin_reviews WHERE ticket_id=tickets.id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ticket_review_queue ON tickets(created_at DESC) WHERE status='pending_verification' AND review_pending=1;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_limits_expires ON limits(expires);
