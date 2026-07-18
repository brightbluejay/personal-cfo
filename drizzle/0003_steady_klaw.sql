CREATE TABLE `narrative_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`fact_package_hash` text NOT NULL,
	`narrative_type` text NOT NULL,
	`scenario_hash` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`schema_version` text NOT NULL,
	`response_json` text NOT NULL,
	`generated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `forecast_baseline_eligible` integer DEFAULT true NOT NULL;