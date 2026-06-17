// Test the FULL create flow including notifications and email
import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './server/routers';
import type { TrpcContext } from './server/_core/context';
import * as db from './server/db';

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(userId: number): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "admin-test",
    email: "sapererecepcao@gmail.com",
    name: "Recepção Sapere",
    loginMethod: "password",
    role: "admin",
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

describe('Full create flow with replication and notifications', () => {
  let adminUserId: number;
  let patientId: number;
  let therapistId: number;

  beforeAll(async () => {
    const allUsers = await db.getAllUsers();
    const admin = allUsers.find(u => u.role === 'admin');
    if (!admin) throw new Error('No admin user found');
    adminUserId = admin.id;

    const allPatients = await db.getAllPatients();
    if (allPatients.length === 0) throw new Error('No patients found');
    patientId = allPatients[0].id;

    const therapists = allUsers.filter(u => u.role === 'therapist');
    if (therapists.length === 0) throw new Error('No therapists found');
    therapistId = therapists[0].id;
    
    console.log('Setup: adminUserId:', adminUserId, 'patientId:', patientId, 'therapistId:', therapistId);
  });

  it('should handle full create flow with replication (including email errors)', async () => {
    const { ctx } = createAdminContext(adminUserId);
    const caller = appRouter.createCaller(ctx);
    
    const startTime = new Date('2030-08-04T14:00:00Z');
    const endTime = new Date('2030-08-04T14:50:00Z');
    
    console.log('Creating appointment WITH replication + notifications...');
    const start = Date.now();
    
    const result = await caller.appointments.create({
      patientId,
      therapistUserId: therapistId,
      therapyType: 'fonoaudiologia',
      startTime,
      endTime,
      replicateWeekly: true,
    });
    
    const elapsed = Date.now() - start;
    console.log(`Result (${elapsed}ms):`, result);
    
    expect(result.success).toBe(true);
    expect(result.replicatedCount).toBe(8);
    expect(result.totalCreated).toBe(9);
    
    // Should complete in reasonable time (under 10 seconds)
    expect(elapsed).toBeLessThan(10000);
  });
});
