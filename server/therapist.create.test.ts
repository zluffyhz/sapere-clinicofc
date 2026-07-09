// Test what happens when a THERAPIST tries to create with replication
import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './server/routers';
import type { TrpcContext } from './server/_core/context';
import * as db from './server/db';

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTherapistContext(userId: number): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "therapist-test",
    email: "therapist@sapere.com",
    name: "Terapeuta Teste",
    loginMethod: "password",
    role: "therapist",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return { ctx };
}

describe('Therapist create with replication', () => {
  let therapistId: number;
  let patientId: number;

  beforeAll(async () => {
    const allUsers = await db.getAllUsers();
    const therapists = allUsers.filter(u => u.role === 'therapist');
    if (therapists.length === 0) throw new Error('No therapists found');
    therapistId = therapists[0].id;

    const allPatients = await db.getAllPatients();
    if (allPatients.length === 0) throw new Error('No patients found');
    patientId = allPatients[0].id;
    
    console.log('therapistId:', therapistId, 'patientId:', patientId);
  });

  it('should create appointment as therapist WITH replication (replicateWeekly allowed for therapist)', async () => {
    const { ctx } = createTherapistContext(therapistId);
    const caller = appRouter.createCaller(ctx);
    
    const startTime = new Date('2030-09-01T14:00:00Z');
    const endTime = new Date('2030-09-01T14:50:00Z');
    
    console.log('Creating appointment as THERAPIST with replicateWeekly=true...');
    const start = Date.now();
    
    const result = await caller.appointments.create({
      patientId,
      therapistUserId: therapistId,
      therapyType: 'psicologia',
      startTime,
      endTime,
      replicateWeekly: true, // Now allowed for therapist role too
      replicateWeeks: 8,
    });
    
    const elapsed = Date.now() - start;
    console.log(`Result (${elapsed}ms):`, result);
    
    expect(result.success).toBe(true);
    // Therapist CAN now replicate (admin and therapist roles both allowed)
    expect(result.replicatedCount).toBe(8);
    expect(result.totalCreated).toBe(9);
  });
});
