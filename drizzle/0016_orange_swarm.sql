CREATE TABLE `appointment_status_audit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`previousStatus` varchar(24) NOT NULL,
	`nextStatus` varchar(24) NOT NULL,
	`changedByUserId` int NOT NULL,
	`source` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointment_status_audit_id` PRIMARY KEY(`id`)
);
