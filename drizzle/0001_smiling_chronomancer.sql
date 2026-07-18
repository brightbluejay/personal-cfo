ALTER TABLE `accounts` ADD `ownership` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `role` text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `purpose` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `envelope_categories_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `flexibility` text DEFAULT 'limited' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_plans` ADD `as_of_date` text NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `movement_type` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `spending_context` text DEFAULT 'routine' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `counterparty_account_id` text REFERENCES accounts(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `external_reference` text;