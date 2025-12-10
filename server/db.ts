import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  patients, InsertPatient,
  appointments, InsertAppointment,
  documents, InsertDocument,
  anamnesis, InsertAnamnesis,
  sessionRecords, InsertSessionRecord,
  notifications, InsertNotification
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER OPERATIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ PATIENT OPERATIONS ============

export async function createPatient(patient: InsertPatient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(patients).values(patient);
  return result;
}

export async function getPatientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPatientsByFamily(familyUserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(patients).where(eq(patients.familyUserId, familyUserId));
}

export async function getPatientsByTherapist(therapistUserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(patients).where(eq(patients.therapistUserId, therapistUserId));
}

export async function updatePatient(id: number, data: Partial<InsertPatient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(patients).set(data).where(eq(patients.id, id));
}

// ============ APPOINTMENT OPERATIONS ============

export async function createAppointment(appointment: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(appointments).values(appointment);
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAppointmentsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(appointments)
    .where(eq(appointments.patientId, patientId))
    .orderBy(desc(appointments.startTime));
}

export async function getAppointmentsByTherapist(therapistUserId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  if (startDate && endDate) {
    return await db.select().from(appointments).where(
      and(
        eq(appointments.therapistUserId, therapistUserId),
        gte(appointments.startTime, startDate),
        lte(appointments.startTime, endDate)
      )
    ).orderBy(appointments.startTime);
  }
  
  return await db.select().from(appointments)
    .where(eq(appointments.therapistUserId, therapistUserId))
    .orderBy(appointments.startTime);
}

export async function getAppointmentsByDateRange(startDate: Date, endDate: Date, userId?: number, role?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (role === 'therapist' && userId) {
    return await db.select().from(appointments)
      .where(
        and(
          eq(appointments.therapistUserId, userId),
          gte(appointments.startTime, startDate),
          lte(appointments.startTime, endDate)
        )
      )
      .orderBy(appointments.startTime);
  }
  
  return await db.select().from(appointments)
    .where(
      and(
        gte(appointments.startTime, startDate),
        lte(appointments.startTime, endDate)
      )
    )
    .orderBy(appointments.startTime);
}

export async function updateAppointment(id: number, data: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(appointments).set(data).where(eq(appointments.id, id));
}

export async function deleteAppointment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(appointments).where(eq(appointments.id, id));
}

// ============ DOCUMENT OPERATIONS ============

export async function createDocument(document: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(documents).values(document);
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDocumentsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documents)
    .where(eq(documents.patientId, patientId))
    .orderBy(desc(documents.createdAt));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(documents).where(eq(documents.id, id));
}

// ============ ANAMNESIS OPERATIONS ============

export async function createAnamnesis(anamnesisData: InsertAnamnesis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(anamnesis).values(anamnesisData);
}

export async function getAnamnesisByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(anamnesis).where(eq(anamnesis.patientId, patientId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAnamnesis(patientId: number, data: Partial<InsertAnamnesis>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(anamnesis).set(data).where(eq(anamnesis.patientId, patientId));
}

// ============ SESSION RECORD OPERATIONS ============

export async function createSessionRecord(record: InsertSessionRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(sessionRecords).values(record);
}

export async function getSessionRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(sessionRecords).where(eq(sessionRecords.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSessionRecordsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sessionRecords)
    .where(eq(sessionRecords.patientId, patientId))
    .orderBy(desc(sessionRecords.sessionDate));
}

export async function getSessionRecordsByAppointment(appointmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sessionRecords)
    .where(eq(sessionRecords.appointmentId, appointmentId))
    .orderBy(desc(sessionRecords.sessionDate));
}

export async function updateSessionRecord(id: number, data: Partial<InsertSessionRecord>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(sessionRecords).set(data).where(eq(sessionRecords.id, id));
}

// ============ NOTIFICATION OPERATIONS ============

export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(notifications).values(notification);
}

export async function getNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function getUnreadNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    )
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// ============ ADMIN USER MANAGEMENT ============

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(users);
  return result;
}

export async function createUser(userData: {
  name: string;
  email: string;
  role: "family" | "therapist" | "admin";
  password?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate a unique openId for manually created users
  const openId = `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // Import hash function here to avoid circular dependency
  const bcrypt = await import('bcrypt');
  const passwordHash = userData.password 
    ? await bcrypt.hash(userData.password, 10)
    : null;
  
  const result = await db.insert(users).values({
    openId,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    loginMethod: "password",
    passwordHash,
  });
  
  return result;
}

export async function updateUserRole(userId: number, role: "family" | "therapist" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(users).where(eq(users.id, userId));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, newPasswordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, userId));
}
