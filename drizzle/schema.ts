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
  role: mysqlEnum("role", ["family", "therapist", "admin"]).default("family").notNull(),
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
  therapyType: mysqlEnum("therapyType", ["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "outro"]).notNull(),
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
 * Anamnesis table - stores detailed patient intake forms
 */
export const anamnesis = mysqlTable("anamnesis", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().unique(), // One anamnesis per patient
  therapistUserId: int("therapistUserId").notNull(),
  // Patient Information
  mainComplaint: text("mainComplaint"),
  medicalHistory: text("medicalHistory"),
  familyHistory: text("familyHistory"),
  developmentHistory: text("developmentHistory"),
  // Current Status
  currentMedications: text("currentMedications"),
  allergies: text("allergies"),
  previousTherapies: text("previousTherapies"),
  // Goals and Observations
  therapyGoals: text("therapyGoals"),
  additionalNotes: text("additionalNotes"),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Anamnesis = typeof anamnesis.$inferSelect;
export type InsertAnamnesis = typeof anamnesis.$inferInsert;

/**
 * Session Records table - stores evolution notes for each therapy session
 */
export const sessionRecords = mysqlTable("sessionRecords", {
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
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SessionRecord = typeof sessionRecords.$inferSelect;
export type InsertSessionRecord = typeof sessionRecords.$inferInsert;

/**
 * Notifications table - stores user notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["new_document", "schedule_change", "new_session_record", "general"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedId: int("relatedId"), // ID of related entity (document, appointment, etc.)
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
