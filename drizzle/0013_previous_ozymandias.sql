CREATE TABLE `appointment_dual_patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId1` int NOT NULL,
	`appointmentId2` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointment_dual_patients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD `isDualSession` boolean DEFAULT false NOT NULL;