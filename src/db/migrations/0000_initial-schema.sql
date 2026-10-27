CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`retailer_name` text NOT NULL,
	`item_name` text NOT NULL,
	`order_reference` text,
	`purchase_date` text,
	`purchase_amount_cents` integer NOT NULL,
	`currency_code` text DEFAULT 'USD' NOT NULL,
	`expected_refund_cents` integer,
	`expected_refund_date` text,
	`expected_refund_source` text,
	`expected_refund_source_note` text,
	`payment_type` text,
	`return_method` text,
	`return_initiated_date` text,
	`handoff_date` text,
	`carrier_name` text,
	`tracking_reference` text,
	`notes` text,
	`status` text NOT NULL,
	`dismissed_next_step` text,
	`is_sample` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE INDEX `cases_archived_at_idx` ON `cases` (`archived_at`);--> statement-breakpoint
CREATE INDEX `cases_updated_at_idx` ON `cases` (`updated_at`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`stored_file_name` text NOT NULL,
	`original_file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`evidence_type` text NOT NULL,
	`evidence_date` text,
	`note` text,
	`include_in_export` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `evidence_case_id_idx` ON `evidence` (`case_id`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refund_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`received_date` text NOT NULL,
	`confirmation_source` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `refund_entries_case_id_idx` ON `refund_entries` (`case_id`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`type` text NOT NULL,
	`scheduled_at` integer NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminders_scheduled_at_idx` ON `reminders` (`scheduled_at`);--> statement-breakpoint
CREATE TABLE `timeline_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`type` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`source` text NOT NULL,
	`description` text,
	`amount_cents` integer,
	`created_at` integer NOT NULL,
	`edited_at` integer,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `timeline_events_case_id_idx` ON `timeline_events` (`case_id`,`occurred_at`);