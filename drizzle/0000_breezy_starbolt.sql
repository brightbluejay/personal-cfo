CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`currency` text DEFAULT 'GBP' NOT NULL,
	`balance_minor` integer NOT NULL,
	`is_demo` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`monthly_plan_id` text,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`summary` text,
	`actions_json` text DEFAULT '[]' NOT NULL,
	`warning` text,
	`source_facts_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`monthly_plan_id`) REFERENCES `monthly_plans`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`kind` text DEFAULT 'expense' NOT NULL,
	`is_essential` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `category_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`match_type` text NOT NULL,
	`pattern` text NOT NULL,
	`category_id` text NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`source` text DEFAULT 'fixture' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_rules_match_unique` ON `category_rules` (`match_type`,`pattern`);--> statement-breakpoint
CREATE TABLE `debts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balance_minor` integer NOT NULL,
	`apr_basis_points` integer NOT NULL,
	`minimum_payment_minor` integer NOT NULL,
	`promotional_apr_basis_points` integer,
	`promotional_end_date` text,
	`contractual_payment_day` integer,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `income` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text,
	`source` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`expected_date` text,
	`frequency` text,
	`certainty` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `monthly_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`opening_cash_minor` integer NOT NULL,
	`expected_income_minor` integer NOT NULL,
	`committed_costs_minor` integer NOT NULL,
	`debt_minimums_minor` integer NOT NULL,
	`protected_buffer_minor` integer NOT NULL,
	`safe_to_spend_minor` integer NOT NULL,
	`status` text NOT NULL,
	`assumptions_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_plans_month_unique` ON `monthly_plans` (`month`);--> statement-breakpoint
CREATE TABLE `recurring_commitments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category_id` text,
	`amount_minor` integer NOT NULL,
	`frequency` text NOT NULL,
	`next_due_date` text,
	`certainty` text NOT NULL,
	`is_paid` integer DEFAULT false NOT NULL,
	`is_essential` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sinking_funds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target_minor` integer NOT NULL,
	`saved_minor` integer DEFAULT 0 NOT NULL,
	`monthly_contribution_minor` integer NOT NULL,
	`target_date` text,
	`certainty` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`last_synced_at` text,
	`error_message` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text,
	`booked_date` text NOT NULL,
	`description` text NOT NULL,
	`normalized_description` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`category_provenance` text DEFAULT 'fixture' NOT NULL,
	`category_confidence` integer DEFAULT 100 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`booked_date`);--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE TABLE `upcoming_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`due_date` text NOT NULL,
	`event` text NOT NULL,
	`description` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`certainty` text NOT NULL,
	`is_essential` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `upcoming_expenses_date_idx` ON `upcoming_expenses` (`due_date`);