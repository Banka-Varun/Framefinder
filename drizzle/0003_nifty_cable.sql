CREATE INDEX `chat_conversation_created` ON `chat_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `conversations_buyer_updated` ON `conversations` (`buyer_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `conversations_seller_updated` ON `conversations` (`seller_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `seat_alert_user` ON `seat_alerts` (`user_id`);--> statement-breakpoint
CREATE INDEX `social_user` ON `social_state` (`user_id`);--> statement-breakpoint
CREATE INDEX `social_movie` ON `social_state` (`movie_id`);--> statement-breakpoint
CREATE INDEX `offers_conversation_status` ON `ticket_offers` (`conversation_id`,`status`);