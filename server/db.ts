import { eq, and, gte, lte, desc, asc, ne, or, lt, gt, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  patients, InsertPatient,
  appointments, InsertAppointment,
  documents, InsertDocument,
  patientData, InsertPatientData,
  evolutions, InsertEvolution,
  notifications, InsertNotification,
  attendance, InsertAttendance,
  patientTherapistAssignments, InsertPatientTherapistAssignment,
  appointmentCoTherapists, InsertAppointmentCoTherapist
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
  
  // Buscar IDs dos pacientes vinculados ao terapeuta
  const assignments = await db
    .select({ patientId: patientTherapistAssignments.patientId })
    .from(patientTherapistAssignments)
    .where(eq(patientTherapistAssignments.therapistUserId, therapistUserId));
  
  if (assignments.length === 0) return [];
  
  const patientIds = assignments.map(a => a.patientId);
  
  // Buscar os pacientes
  return await db.select().from(patients).where(inArray(patients.id, patientIds));
}

export async function getAllPatients() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(patients);
}

export async function updatePatient(id: number, data: Partial<InsertPatient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(patients).set(data).where(eq(patients.id, id));
}

export async function deletePatient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(patients).where(eq(patients.id, id));
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
    return await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      therapistUserId: appointments.therapistUserId,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      therapyType: appointments.therapyType,
      status: appointments.status,
      notes: appointments.notes,
      seriesId: appointments.seriesId,
      isJointSession: appointments.isJointSession,
      createdAt: appointments.createdAt,
      patientName: patients.name,
    })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(
        and(
          eq(appointments.therapistUserId, userId),
          gte(appointments.startTime, startDate),
          lte(appointments.startTime, endDate)
        )
      )
      .orderBy(asc(patients.name));
  }
  
  return await db.select({
    id: appointments.id,
    patientId: appointments.patientId,
    therapistUserId: appointments.therapistUserId,
    startTime: appointments.startTime,
    endTime: appointments.endTime,
    therapyType: appointments.therapyType,
    status: appointments.status,
    notes: appointments.notes,
    seriesId: appointments.seriesId,
    isJointSession: appointments.isJointSession,
    createdAt: appointments.createdAt,
    patientName: patients.name,
  })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        gte(appointments.startTime, startDate),
        lte(appointments.startTime, endDate)
      )
    )
    .orderBy(asc(patients.name));
}

export async function getAppointmentsBySeries(seriesId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(appointments)
    .where(eq(appointments.seriesId, seriesId))
    .orderBy(appointments.startTime);
}

export async function updateAppointment(id: number, data: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(appointments).set(data).where(eq(appointments.id, id));
}

export async function updateAppointmentStatus(id: number, status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(appointments).set({ status }).where(eq(appointments.id, id));
}

export async function deleteAppointment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(appointments).where(eq(appointments.id, id));
}

// ============ CO-THERAPIST OPERATIONS ============

export async function addCoTherapist(appointmentId: number, therapistUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Avoid duplicates
  const existing = await db.select().from(appointmentCoTherapists)
    .where(and(eq(appointmentCoTherapists.appointmentId, appointmentId), eq(appointmentCoTherapists.therapistUserId, therapistUserId)));
  if (existing.length > 0) return existing[0];
  return await db.insert(appointmentCoTherapists).values({ appointmentId, therapistUserId });
}

export async function removeCoTherapist(appointmentId: number, therapistUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(appointmentCoTherapists)
    .where(and(eq(appointmentCoTherapists.appointmentId, appointmentId), eq(appointmentCoTherapists.therapistUserId, therapistUserId)));
}

export async function getCoTherapistsByAppointment(appointmentId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: appointmentCoTherapists.id,
    appointmentId: appointmentCoTherapists.appointmentId,
    therapistUserId: appointmentCoTherapists.therapistUserId,
    therapistName: users.name,
  }).from(appointmentCoTherapists)
    .leftJoin(users, eq(appointmentCoTherapists.therapistUserId, users.id))
    .where(eq(appointmentCoTherapists.appointmentId, appointmentId));
  return rows;
}

export async function syncCoTherapists(appointmentId: number, therapistUserIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all existing co-therapists for this appointment
  await db.delete(appointmentCoTherapists).where(eq(appointmentCoTherapists.appointmentId, appointmentId));
  // Insert new ones
  if (therapistUserIds.length > 0) {
    await db.insert(appointmentCoTherapists).values(
      therapistUserIds.map(tid => ({ appointmentId, therapistUserId: tid }))
    );
  }
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

// ============ PATIENT DATA OPERATIONS ============

export async function createPatientData(data: InsertPatientData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(patientData).values(data);
}

// Legacy alias
export const createAnamnesis = createPatientData;

export async function getPatientDataForPatient(patientId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(patientData).where(eq(patientData.patientId, patientId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Legacy alias
export const getAnamnesisForPatient = getPatientDataForPatient;
export async function updatePatientData(patientId: number, data: Partial<InsertPatientData>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(patientData).set(data).where(eq(patientData.patientId, patientId));
}

// Legacy alias
export const updateAnamnesis = updatePatientData;

// ============ SESSION RECORD OPERATIONS ============

export async function createSessionRecord(record: InsertEvolution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(evolutions).values(record);
}

export async function getSessionRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(evolutions).where(eq(evolutions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSessionRecordsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Join with users table to get therapist name
  const result = await db.select({
    id: evolutions.id,
    patientId: evolutions.patientId,
    therapistUserId: evolutions.therapistUserId,
    appointmentId: evolutions.appointmentId,
    sessionDate: evolutions.sessionDate,
    sessionSummary: evolutions.sessionSummary,
    patientMood: evolutions.patientMood,
    patientBehavior: evolutions.patientBehavior,
    goalsAchieved: evolutions.goalsAchieved,
    nextSessionPlan: evolutions.nextSessionPlan,
    collaborationLevel: evolutions.collaborationLevel,
    createdAt: evolutions.createdAt,
    therapistName: users.name,
  })
    .from(evolutions)
    .leftJoin(users, eq(evolutions.therapistUserId, users.id))
    .where(eq(evolutions.patientId, patientId))
    .orderBy(desc(evolutions.sessionDate));
  
  return result;
}

export async function getSessionRecordsByAppointment(appointmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(evolutions)
    .where(eq(evolutions.appointmentId, appointmentId))
    .orderBy(desc(evolutions.sessionDate));
}

export async function updateSessionRecord(id: number, data: Partial<InsertEvolution>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(evolutions).set(data).where(eq(evolutions.id, id));
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

// ============ EVOLUTION COMPLETENESS CHECKS ============

export function isEvolutionComplete(evolution: any): boolean {
  return !!(
    evolution.sessionSummary?.trim() &&
    evolution.patientMood?.trim() &&
    evolution.patientBehavior?.trim() &&
    evolution.goalsAchieved?.trim() &&
    evolution.nextSessionPlan?.trim() &&
    evolution.collaborationLevel
  );
}

export async function getIncompleteEvolutions() {
  const db = await getDb();
  if (!db) return [];
  
  // Get evolutions created more than 24 hours ago
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);
  
  const allEvolutions = await db.select()
    .from(evolutions)
    .where(lt(evolutions.createdAt, yesterday));
  
  // Filter incomplete ones
  return allEvolutions.filter(evo => !isEvolutionComplete(evo));
}

export async function getIncompleteEvolutionsByTherapist(therapistUserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const allEvolutions = await db.select()
    .from(evolutions)
    .where(eq(evolutions.therapistUserId, therapistUserId));
  
  return allEvolutions.filter(evo => !isEvolutionComplete(evo));
}

export async function hasUnreadNotificationForEvolution(userId: number, evolutionId: number) {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.evolutionId, evolutionId),
        eq(notifications.isRead, false),
        eq(notifications.type, 'incomplete_evolution')
      )
    )
    .limit(1);
  
  return result.length > 0;
}

export async function markEvolutionNotificationsAsRead(evolutionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.evolutionId, evolutionId),
        eq(notifications.type, 'incomplete_evolution')
      )
    );
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

// ============ ATTENDANCE OPERATIONS ============

export async function createAttendance(attendanceData: InsertAttendance) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(attendance).values(attendanceData);
}

export async function getAttendanceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAttendanceByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(attendance)
    .where(eq(attendance.patientId, patientId))
    .orderBy(desc(attendance.scheduledDate));
}

export async function getAttendanceByFamily(familyUserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(attendance)
    .where(eq(attendance.familyUserId, familyUserId))
    .orderBy(desc(attendance.scheduledDate));
}

export async function getAttendanceByAppointment(appointmentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(attendance)
    .where(eq(attendance.appointmentId, appointmentId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAttendance(id: number, data: Partial<InsertAttendance>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(attendance).set(data).where(eq(attendance.id, id));
}

export async function getAttendanceByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(attendance)
    .where(
      and(
        gte(attendance.scheduledDate, startDate),
        lte(attendance.scheduledDate, endDate)
      )
    )
    .orderBy(desc(attendance.scheduledDate));
}

export async function getMonthAppointmentsForAttendance(month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  
  // First day of the month
  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);
  
  // First day of next month
  const endDate = new Date(year, month, 1);
  endDate.setHours(0, 0, 0, 0);
  
  return await db.select().from(appointments)
    .where(
      and(
        gte(appointments.startTime, startDate),
        lt(appointments.startTime, endDate)
      )
    )
    .orderBy(asc(appointments.startTime));
}

export async function checkScheduleConflicts(
  startTime: Date,
  endTime: Date,
  therapistUserId: number,
  patientId: number,
  excludeAppointmentId?: number
) {
  const db = await getDb();
  if (!db) return { therapistConflict: false, patientConflict: false };

  // Check therapist conflicts
  const therapistConditions = [
    eq(appointments.therapistUserId, therapistUserId),
    ne(appointments.status, 'cancelled'),
    or(
      // New appointment starts during existing appointment
      and(
        gte(appointments.startTime, startTime),
        lt(appointments.startTime, endTime)
      ),
      // New appointment ends during existing appointment
      and(
        gt(appointments.endTime, startTime),
        lte(appointments.endTime, endTime)
      ),
      // New appointment completely overlaps existing appointment
      and(
        lte(appointments.startTime, startTime),
        gte(appointments.endTime, endTime)
      )
    )
  ];
  
  if (excludeAppointmentId) {
    therapistConditions.push(ne(appointments.id, excludeAppointmentId));
  }
  
  const therapistConflicts = await db.select().from(appointments)
    .where(and(...therapistConditions));

  // Check patient conflicts
  const patientConditions = [
    eq(appointments.patientId, patientId),
    ne(appointments.status, 'cancelled'),
    or(
      // New appointment starts during existing appointment
      and(
        gte(appointments.startTime, startTime),
        lt(appointments.startTime, endTime)
      ),
      // New appointment ends during existing appointment
      and(
        gt(appointments.endTime, startTime),
        lte(appointments.endTime, endTime)
      ),
      // New appointment completely overlaps existing appointment
      and(
        lte(appointments.startTime, startTime),
        gte(appointments.endTime, endTime)
      )
    )
  ];
  
  if (excludeAppointmentId) {
    patientConditions.push(ne(appointments.id, excludeAppointmentId));
  }
  
  const patientConflicts = await db.select().from(appointments)
    .where(and(...patientConditions));

  return {
    therapistConflict: therapistConflicts.length > 0,
    patientConflict: patientConflicts.length > 0,
  };
}


// ===== Collaboration History =====
export async function getCollaborationHistory(familyUserId: number, days: number = 30, patientId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // Get all patients for this family
  const familyPatients = await db.select().from(patients)
    .where(eq(patients.familyUserId, familyUserId));
  
  const patientIds = familyPatients.map((p: any) => p.id);
  
  if (patientIds.length === 0) {
    return [];
  }
  
  // Filter by specific patient if provided
  const targetPatientIds = patientId ? [patientId] : patientIds;
  
  // Get evolutions for these patients
  const evolutionsData = await db.select({
    id: evolutions.id,
    patientId: evolutions.patientId,
    patientName: patients.name,
    sessionDate: evolutions.sessionDate,
    collaborationLevel: evolutions.collaborationLevel,
  })
  .from(evolutions)
  .innerJoin(patients, eq(evolutions.patientId, patients.id))
  .where(
    and(
      inArray(evolutions.patientId, targetPatientIds),
      gte(evolutions.sessionDate, cutoffDate)
    )
  )
  .orderBy(desc(evolutions.sessionDate));
  
  return evolutionsData;
}

export async function getCollaborationHistoryByPatient(patientId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // Get evolutions for this patient
  const evolutionsData = await db.select({
    id: evolutions.id,
    patientId: evolutions.patientId,
    patientName: patients.name,
    sessionDate: evolutions.sessionDate,
    collaborationLevel: evolutions.collaborationLevel,
  })
  .from(evolutions)
  .innerJoin(patients, eq(evolutions.patientId, patients.id))
  .where(
    and(
      eq(evolutions.patientId, patientId),
      gte(evolutions.sessionDate, cutoffDate)
    )
  )
  .orderBy(desc(evolutions.sessionDate));
  
  return evolutionsData;
}

// FUNÇÃO REMOVIDA: Evoluções clínicas NUNCA podem ser deletadas (requisito legal)
// export async function deleteSessionRecord(id: number) {
//   const db = await getDb();
//   if (!db) return;
//   await db.delete(evolutions).where(eq(evolutions.id, id));
// }


// ─────────────────────────────────────────────────────────────────────────────
// Patient-Therapist Assignments
// ─────────────────────────────────────────────────────────────────────────────

export async function createPatientTherapistAssignment(data: InsertPatientTherapistAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(patientTherapistAssignments).values(data);
  return result;
}

export async function getPatientTherapistAssignments(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(patientTherapistAssignments)
    .where(and(
      eq(patientTherapistAssignments.patientId, patientId),
      eq(patientTherapistAssignments.isActive, true)
    ));
}

export async function getTherapistPatients(therapistUserId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get all active assignments for this therapist
  const assignments = await db
    .select()
    .from(patientTherapistAssignments)
    .where(and(
      eq(patientTherapistAssignments.therapistUserId, therapistUserId),
      eq(patientTherapistAssignments.isActive, true)
    ));
  
  if (assignments.length === 0) return [];
  
  // Get unique patient IDs
  const patientIds = Array.from(new Set(assignments.map(a => a.patientId)));
  
  // Get patient details
  const patientsResult = await db
    .select()
    .from(patients)
    .where(inArray(patients.id, patientIds));
  
  return patientsResult;
}

export async function deletePatientTherapistAssignment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(patientTherapistAssignments)
    .set({ isActive: false })
    .where(eq(patientTherapistAssignments.id, id));
}

export async function updateUserSpecialties(userId: number, specialties: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ specialties: JSON.stringify(specialties) })
    .where(eq(users.id, userId));
}

// ============ BACKUP OPERATIONS ============

export async function exportFullBackup() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [
    allUsers,
    allPatients,
    allAppointments,
    allDocuments,
    allPatientData,
    allEvolutions,
    allAttendance,
    allAssignments,
  ] = await Promise.all([
    db.select().from(users),
    db.select().from(patients),
    db.select().from(appointments),
    db.select().from(documents),
    db.select().from(patientData),
    db.select().from(evolutions),
    db.select().from(attendance),
    db.select().from(patientTherapistAssignments),
  ]);

  // Remove sensitive fields from users
  const sanitizedUsers = allUsers.map(({ passwordHash, openId, ...rest }) => rest);

  return {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    tables: {
      users: sanitizedUsers,
      patients: allPatients,
      appointments: allAppointments,
      documents: allDocuments,
      patientData: allPatientData,
      evolutions: allEvolutions,
      attendance: allAttendance,
      patientTherapistAssignments: allAssignments,
    },
    summary: {
      totalUsers: allUsers.length,
      totalPatients: allPatients.length,
      totalAppointments: allAppointments.length,
      totalDocuments: allDocuments.length,
      totalEvolutions: allEvolutions.length,
      totalAttendance: allAttendance.length,
    },
  };
}
