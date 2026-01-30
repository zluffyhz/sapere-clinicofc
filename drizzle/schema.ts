import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-based access control for families and therapists.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: text("passwordHash"), // For password-based authentication
  role: mysqlEnum("role", ["family", "therapist", "admin"]).default("family").notNull(),
  specialties: text("specialties"), // JSON array of therapy types for therapists
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patients table - stores information about patients receiving therapy
 */
export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  dateOfBirth: timestamp("dateOfBirth"),
  familyUserId: int("familyUserId").notNull(), // Reference to family user
  therapistUserId: int("therapistUserId"), // Primary therapist assigned
  diagnosis: text("diagnosis"),
  notes: text("notes"),
  imageAuthorization: boolean("imageAuthorization").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

/**
 * Appointments table - stores therapy sessions schedule
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  therapistUserId: int("therapistUserId").notNull(),
  therapyType: mysqlEnum("therapyType", ["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "outro"]).notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "rescheduled"]).default("scheduled").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Documents table - stores references to files in S3
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  uploadedByUserId: int("uploadedByUserId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  documentType: mysqlEnum("documentType", ["relatorio_evolucao", "laudo", "anamnese", "outros"]).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(), // S3 key
  fileUrl: varchar("fileUrl", { length: 1024 }).notNull(), // S3 URL
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"), // in bytes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Patient Data table - stores simplified patient information
 * (Anamneses completas são feitas via upload de documentos)
 */
export const patientData = mysqlTable("patient_data", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().unique(), // One record per patient
  therapistUserId: int("therapistUserId").notNull(),
  // Simplified fields
  mainComplaints: text("mainComplaints"), // Queixas principais
  allergies: text("allergies"), // Alergias
  currentMedications: text("currentMedications"), // Medicação atual
  therapyGoals: text("therapyGoals"), // Objetivos terapêuticos
  additionalNotes: text("additionalNotes"), // Observações adicionais
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PatientData = typeof patientData.$inferSelect;
export type InsertPatientData = typeof patientData.$inferInsert;

// Legacy types for backward compatibility during migration
export type Anamnesis = PatientData;
export type InsertAnamnesis = InsertPatientData;

/**
 * Evolutions table - stores private evolution notes for each therapy session (therapists and admins only)
 */
export const evolutions = mysqlTable("evolutions", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId").notNull(),
  patientId: int("patientId").notNull(),
  therapistUserId: int("therapistUserId").notNull(),
  sessionDate: timestamp("sessionDate").notNull(),
  // Session Details
  sessionSummary: text("sessionSummary").notNull(),
  patientMood: mysqlEnum("patientMood", ["muito_bem", "bem", "neutro", "ansioso", "irritado", "triste"]),
  patientBehavior: text("patientBehavior"),
  goalsAchieved: text("goalsAchieved"),
  nextSessionPlan: text("nextSessionPlan"),
  // Collaboration Level (sent to parents via notification)
  collaborationLevel: mysqlEnum("collaborationLevel", ["full", "partial", "none"]).notNull(),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Evolution = typeof evolutions.$inferSelect;
export type InsertEvolution = typeof evolutions.$inferInsert;

// Legacy aliases for backward compatibility
export const sessionRecords = evolutions;
export type SessionRecord = Evolution;
export type InsertSessionRecord = InsertEvolution;

/**
 * Notifications table - stores user notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["new_document", "schedule_change", "new_session_record", "attendance", "general"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedId: int("relatedId"), // ID of related entity (document, appointment, etc.)
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Attendance table - stores patient attendance records for sessions
 * Marked by reception/admin when patient arrives for appointment
 */
export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId").notNull(),
  patientId: int("patientId").notNull(),
  familyUserId: int("familyUserId").notNull(), // For family portal queries
  therapistUserId: int("therapistUserId").notNull(),
  therapyType: mysqlEnum("therapyType", ["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "outro"]).notNull(),
  scheduledDate: timestamp("scheduledDate").notNull(),
  status: mysqlEnum("status", ["present", "absent", "late", "excused"]).default("present").notNull(),
  markedByUserId: int("markedByUserId").notNull(), // Admin/reception who marked
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

/**
 * Patient-Therapist Assignments table - stores which therapists work with which patients on which therapies
 * Allows multiple therapists per patient (one for each therapy type)
 */
export const patientTherapistAssignments = mysqlTable("patient_therapist_assignments", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  therapistUserId: int("therapistUserId").notNull(),
  therapyType: mysqlEnum("therapyType", ["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "outro"]).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PatientTherapistAssignment = typeof patientTherapistAssignments.$inferSelect;
export type InsertPatientTherapistAssignment = typeof patientTherapistAssignments.$inferInsert;
