CREATE TABLE `anamnesis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`therapistUserId` int NOT NULL,
	`mainComplaint` text,
	`medicalHistory` text,
	`familyHistory` text,
	`developmentHistory` text,
	`currentMedications` text,
	`allergies` text,
	`previousTherapies` text,
	`therapyGoals` text,
	`additionalNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `anamnesis_id` PRIMARY KEY(`id`),
	CONSTRAINT `anamnesis_patientId_unique` UNIQUE(`patientId`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`therapistUserId` int NOT NULL,
	`therapyType` enum('fonoaudiologia','psicologia','terapia_ocupacional','psicopedagogia','outro') NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`status` enum('scheduled','completed','cancelled','rescheduled') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`documentType` enum('relatorio_evolucao','laudo','anamnese','outros') NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(1024) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('new_document','schedule_change','new_session_record','general') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`relatedId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`dateOfBirth` timestamp,
	`familyUserId` int NOT NULL,
	`therapistUserId` int,
	`diagnosis` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessionRecords` (
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessionRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('family','therapist','admin') NOT NULL DEFAULT 'family';