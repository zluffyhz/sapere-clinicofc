CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`patientId` int NOT NULL,
	`familyUserId` int NOT NULL,
	`therapistUserId` int NOT NULL,
	`therapyType` enum('fonoaudiologia','psicologia','terapia_ocupacional','psicopedagogia','neuropsicologia','outro') NOT NULL,
	`scheduledDate` timestamp NOT NULL,
	`status` enum('present','absent','late','excused') NOT NULL DEFAULT 'present',
	`markedByUserId` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`)
);
