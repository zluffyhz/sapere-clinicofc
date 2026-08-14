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

function createTherapistContext(userId: number): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "therapist-replication-test",
    email: "terapeuta@sapere.test",
    name: "Terapeuta Sapere",
    loginMethod: "password",
    role: "therapist",
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

  it('should cancel every active appointment in a series and remain idempotent on retry', async () => {
    const { ctx } = createAdminContext(adminUserId);
    const caller = appRouter.createCaller(ctx);
    const startTime = new Date('2037-11-05T10:00:00Z');
    const endTime = new Date('2037-11-05T10:50:00Z');

    const created = await caller.appointments.create({
      patientId,
      therapistUserId: therapistId,
      therapyType: 'fonoaudiologia',
      startTime,
      endTime,
      replicateWeekly: true,
      replicateWeeks: 4,
    });
    const firstAppointment = await db.getAppointmentById(created.id);

    expect(firstAppointment?.seriesId).toBeTruthy();
    const seriesId = firstAppointment!.seriesId!;

    const firstCancellation = await caller.appointments.cancelSeries({ seriesId });
    expect(firstCancellation.success).toBe(true);
    expect(firstCancellation.cancelledCount).toBe(5);
    expect(firstCancellation.alreadyProcessed).toBe(false);

    const allSeriesAppointments = await db.getAllAppointmentsBySeries(seriesId);
    expect(allSeriesAppointments).toHaveLength(5);
    expect(allSeriesAppointments.every(appointment => appointment.status === 'cancelled')).toBe(true);

    const statusAudit = await db.getAppointmentStatusAudit(created.id);
    expect(statusAudit).toHaveLength(1);
    expect(statusAudit[0]).toMatchObject({
      previousStatus: 'scheduled',
      nextStatus: 'cancelled',
      changedByUserId: adminUserId,
      source: 'appointments.cancelSeries',
    });

    const retryCancellation = await caller.appointments.cancelSeries({ seriesId });
    expect(retryCancellation.success).toBe(true);
    expect(retryCancellation.cancelledCount).toBe(0);
    expect(retryCancellation.alreadyProcessed).toBe(true);
  });

  it('should preview and delete only the selected appointment and subsequent sessions in a series', async () => {
    const { ctx } = createAdminContext(adminUserId);
    const caller = appRouter.createCaller(ctx);
    const startTime = new Date('2037-12-01T10:00:00Z');
    const endTime = new Date('2037-12-01T10:50:00Z');

    const created = await caller.appointments.create({
      patientId,
      therapistUserId: therapistId,
      therapyType: 'fonoaudiologia',
      startTime,
      endTime,
      replicateWeekly: true,
      replicateWeeks: 4,
    });
    const firstAppointment = await db.getAppointmentById(created.id);
    const seriesId = firstAppointment!.seriesId!;
    const seriesAppointments = (await db.getAllAppointmentsBySeries(seriesId))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    await caller.appointments.update({ id: seriesAppointments[0].id, status: 'completed' });
    await caller.appointments.update({ id: seriesAppointments[1].id, status: 'absent' });
    const selectedAppointment = seriesAppointments[2];

    const preview = await caller.appointments.seriesPreview({
      seriesId,
      fromAppointmentId: selectedAppointment.id,
    });
    expect(preview).toMatchObject({ therapyType: 'fonoaudiologia' });
    expect(preview.preservedCount).toBe(2);
    expect(preview.appointments).toHaveLength(3);
    expect(preview.appointments.map(appointment => appointment.id)).toEqual(
      seriesAppointments.slice(2).map(appointment => appointment.id)
    );

    const deletion = await caller.appointments.deleteSeries({
      seriesId,
      fromAppointmentId: selectedAppointment.id,
    });
    expect(deletion).toMatchObject({ success: true, deletedCount: 3, preservedCount: 2 });
    const remainingAppointments = await db.getAllAppointmentsBySeries(seriesId);
    expect(remainingAppointments).toHaveLength(2);
    expect(remainingAppointments.map(appointment => appointment.id).sort()).toEqual(
      seriesAppointments.slice(0, 2).map(appointment => appointment.id).sort()
    );
    expect(remainingAppointments.map(appointment => appointment.status).sort()).toEqual(['absent', 'completed']);

    const statusAudit = await db.getAppointmentStatusAudit(selectedAppointment.id);
    expect(statusAudit).toHaveLength(1);
    expect(statusAudit[0]).toMatchObject({
      previousStatus: 'scheduled',
      nextStatus: 'deleted',
      changedByUserId: adminUserId,
      source: 'appointments.deleteSeriesFromSelected',
    });
  });

  it('should block cancellation through generic edit and audit explicit single cancellation', async () => {
    const { ctx } = createAdminContext(adminUserId);
    const caller = appRouter.createCaller(ctx);
    const startTime = new Date('2037-12-10T10:00:00Z');
    const endTime = new Date('2037-12-10T10:50:00Z');

    const created = await caller.appointments.create({
      patientId,
      therapistUserId: therapistId,
      therapyType: 'fonoaudiologia',
      startTime,
      endTime,
      replicateWeekly: false,
    });

    await expect(
      caller.appointments.update({ id: created.id, status: 'cancelled' })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const afterBlockedEdit = await db.getAppointmentById(created.id);
    expect(afterBlockedEdit?.status).toBe('scheduled');

    const therapistCaller = appRouter.createCaller(createTherapistContext(therapistId).ctx);
    await expect(
      therapistCaller.appointments.cancel({ id: created.id })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const cancellation = await caller.appointments.cancel({ id: created.id });
    expect(cancellation).toMatchObject({ success: true, alreadyCancelled: false });

    const statusAudit = await db.getAppointmentStatusAudit(created.id);
    expect(statusAudit).toHaveLength(1);
    expect(statusAudit[0]).toMatchObject({
      previousStatus: 'scheduled',
      nextStatus: 'cancelled',
      changedByUserId: adminUserId,
      source: 'appointments.cancel',
    });
  });
});
