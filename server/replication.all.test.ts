import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './server/routers';
import type { TrpcContext } from './server/_core/context';
import * as db from './server/db';

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(userId: number): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "admin-replication-test",
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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return { ctx };
}

describe('Replication - All week options (4 to 12)', () => {
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
  });

  // Test each week option from 4 to 12
  const weekOptions = [4, 5, 6, 7, 8, 9, 10, 11, 12];

  weekOptions.forEach((weeks, idx) => {
    it(`should create ${weeks + 1} appointments when replicateWeeks=${weeks}`, async () => {
      const { ctx } = createAdminContext(adminUserId);
      const caller = appRouter.createCaller(ctx);

      // Use different base dates to avoid conflicts between tests
      const baseYear = 2035;
      const baseMonth = idx + 1; // months 1-9
      const startTime = new Date(`${baseYear}-${String(baseMonth).padStart(2, '0')}-01T10:00:00Z`);
      const endTime = new Date(`${baseYear}-${String(baseMonth).padStart(2, '0')}-01T10:50:00Z`);

      const result = await caller.appointments.create({
        patientId,
        therapistUserId: therapistId,
        therapyType: 'fonoaudiologia',
        startTime,
        endTime,
        replicateWeekly: true,
        replicateWeeks: weeks,
      });

      expect(result.success).toBe(true);
      expect(result.replicatedCount).toBe(weeks);
      expect(result.totalCreated).toBe(weeks + 1);
    });
  });

  it('should create correct weekly dates (no date drift)', async () => {
    const { ctx } = createAdminContext(adminUserId);
    const caller = appRouter.createCaller(ctx);

    // Use a fixed Monday as base
    const startTime = new Date('2036-01-05T09:00:00Z'); // Monday
    const endTime = new Date('2036-01-05T09:50:00Z');

    const result = await caller.appointments.create({
      patientId,
      therapistUserId: therapistId,
      therapyType: 'fonoaudiologia',
      startTime,
      endTime,
      replicateWeekly: true,
      replicateWeeks: 4,
    });

    expect(result.success).toBe(true);
    expect(result.totalCreated).toBe(5);

    // Verify the dates are exactly 7 days apart
    const seriesAppointments = await db.getAppointmentsBySeries(
      // Get seriesId from the created appointment
      await (async () => {
        const allApts = await db.getAppointmentsByDateRange(
          new Date('2036-01-01'), new Date('2036-03-01'), adminUserId, 'admin'
        );
        const apt = allApts.find(a => a.id === result.id);
        return apt?.seriesId || '';
      })()
    );

    if (seriesAppointments.length > 0) {
      const sorted = seriesAppointments.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      for (let i = 1; i < sorted.length; i++) {
        const diff = new Date(sorted[i].startTime).getTime() - new Date(sorted[i-1].startTime).getTime();
        const diffDays = diff / (1000 * 60 * 60 * 24);
        expect(diffDays).toBe(7); // Exactly 7 days between each
      }
    }
  });
});
