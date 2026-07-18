CREATE TABLE `debt_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`debt_id` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`balance_minor` integer NOT NULL,
	`payments_minor` integer DEFAULT 0 NOT NULL,
	`interest_charged_minor` integer DEFAULT 0 NOT NULL,
	`new_borrowing_minor` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'fixture' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `debt_snapshots_date_idx` ON `debt_snapshots` (`snapshot_date`);--> statement-breakpoint
ALTER TABLE `debts` ADD `post_promotional_apr_basis_points` integer;--> statement-breakpoint
ALTER TABLE `income` ADD `kind` text DEFAULT 'other' NOT NULL;