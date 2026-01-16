CREATE TABLE `evolutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`patientId` int NOT NULL,
	`therapistUserId` int NOT NULL,
	`sessionDate` timestamp NOT NULL,
	`sessionSummary` text NOT NULL,
	`patientMood` enum('muito_bem','bem','neutro','ansioso','irritado','triste'),
	`patientBehavior` text,
	`goalsAchieved` text,
	`nextSessionPlan` text,
	`collaborationLevel` enum('full','partial','none') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evolutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`therapistUserId` int NOT NULL,
	`mainComplaints` text,
	`allergies` text,
	`currentMedications` text,
	`therapyGoals` text,
	`additionalNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patient_data_id` PRIMARY KEY(`id`),
	CONSTRAINT `patient_data_patientId_unique` UNIQUE(`patientId`)
);
--> statement-breakpoint
CREATE TABLE `patient_therapist_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`therapistUserId` int NOT NULL,
	`therapyType` enum('fonoaudiologia','psicologia','terapia_ocupacional','psicopedagogia','musicoterapia','fisioterapia','neuropsicopedagogia','nutricao','outro') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patient_therapist_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `anamnesis`;--> statement-breakpoint
DROP TABLE `sessionRecords`;--> statement-breakpoint
ALTER TABLE `users` ADD `specialties` text;