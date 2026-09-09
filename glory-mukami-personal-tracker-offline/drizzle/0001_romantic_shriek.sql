CREATE TABLE `journal_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scope` varchar(64) NOT NULL,
	`kind` varchar(64) NOT NULL,
	`summary` varchar(240) NOT NULL,
	`metadata` json,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `journal_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scope` varchar(64) NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journal_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `journal_states_user_scope_unique` UNIQUE(`userId`,`scope`)
);
--> statement-breakpoint
ALTER TABLE `journal_events` ADD CONSTRAINT `journal_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_states` ADD CONSTRAINT `journal_states_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `journal_events_user_occurred_index` ON `journal_events` (`userId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `journal_events_user_scope_index` ON `journal_events` (`userId`,`scope`);--> statement-breakpoint
CREATE INDEX `journal_states_user_index` ON `journal_states` (`userId`);