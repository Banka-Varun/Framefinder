CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`password` text,
	`google_id` text,
	`name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`avatar` text DEFAULT '' NOT NULL,
	`languages` text DEFAULT '[]' NOT NULL,
	`onboarded` integer DEFAULT 0 NOT NULL,
	`verified` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_username_unique` ON `accounts` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_google_id_unique` ON `accounts` (`google_id`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`mime` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text NOT NULL,
	`expires` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing` (
	`order_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`credits` integer NOT NULL,
	`payment_id` text,
	`status` text DEFAULT 'created' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_payment_id_unique` ON `billing` (`payment_id`);--> statement-breakpoint
CREATE TABLE `credit_uses` (
	`event_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`key` text PRIMARY KEY NOT NULL,
	`follower` text NOT NULL,
	`following` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`link` text NOT NULL,
	`created_at` text NOT NULL,
	`read` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `social_state` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`movie_id` integer NOT NULL,
	`rating` integer,
	`liked` integer DEFAULT 0 NOT NULL,
	`watched` integer DEFAULT 0 NOT NULL,
	`watchlist` integer DEFAULT 0 NOT NULL,
	`watched_on` text,
	`review` text DEFAULT '' NOT NULL,
	`spoiler` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`movie` text NOT NULL,
	`theater` text NOT NULL,
	`show_at` text NOT NULL,
	`language` text NOT NULL,
	`format` text NOT NULL,
	`quantity` integer NOT NULL,
	`face_value` integer NOT NULL,
	`price` integer NOT NULL,
	`proof_id` text NOT NULL,
	`reference_hash` text NOT NULL,
	`status` text DEFAULT 'pending_verification' NOT NULL,
	`buyer_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_reference_hash_unique` ON `tickets` (`reference_hash`);--> statement-breakpoint
CREATE TABLE `user_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
