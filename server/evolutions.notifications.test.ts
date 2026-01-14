import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('Evolution Collaboration Notifications', () => {
  let familyUserId: number;
  let therapistUserId: number;
  let patientId: number;

  beforeAll(async () => {
    // Get existing users from database
    const allUsers = await db.getAllUsers();
    const familyUser = allUsers.find(u => u.role === 'family');
    const therapistUser = allUsers.find(u => u.role === 'therapist');

    if (!familyUser || !therapistUser) {
      throw new Error('Need at least one family user and one therapist in database for testing.');
    }

    familyUserId = familyUser.id;
    therapistUserId = therapistUser.id;

    // Create a test patient
    const patientResult = await db.createPatient({
      name: 'Paciente Teste Notificação',
      dateOfBirth: new Date('2020-01-01'),
      familyUserId,
      therapyType: 'psicologia',
      notes: 'Paciente para testar notificações de colaboração',
    });
    patientId = patientResult[0].insertId;
  });

  it('should send notification when evolution is created with full collaboration', async () => {
    const caller = appRouter.createCaller({
      user: { id: therapistUserId, role: 'therapist' } as any,
      req: {} as any,
      res: {} as any,
    });

    // Create evolution with full collaboration
    const result = await caller.evolutions.create({
      appointmentId: 0,
      patientId,
      sessionDate: new Date(),
      sessionSummary: 'Sessão produtiva com colaboração total',
      collaborationLevel: 'full',
      patientMood: 'bem',
    });

    expect(result.success).toBe(true);

    // Check if notification was created
    const notifications = await db.getUnreadNotificationsByUser(familyUserId);
    const latestNotification = notifications[0];

    expect(latestNotification).toBeDefined();
    expect(latestNotification.type).toBe('attendance');
    expect(latestNotification.title).toBe('Atualização da Sessão');
    expect(latestNotification.message).toContain('colaborou durante toda a sessão');
    expect(latestNotification.message).toContain('🎉');
    
    // Mark as read for next test
    await db.markNotificationAsRead(latestNotification.id);
  });

  it('should send notification when evolution is created with partial collaboration', async () => {
    const caller = appRouter.createCaller({
      user: { id: therapistUserId, role: 'therapist' } as any,
      req: {} as any,
      res: {} as any,
    });

    // Create evolution with partial collaboration
    const result = await caller.evolutions.create({
      appointmentId: 0,
      patientId,
      sessionDate: new Date(),
      sessionSummary: 'Sessão com colaboração parcial',
      collaborationLevel: 'partial',
      patientMood: 'neutro',
    });

    expect(result.success).toBe(true);

    // Check if notification was created
    const notifications = await db.getUnreadNotificationsByUser(familyUserId);
    const latestNotification = notifications[0];

    expect(latestNotification).toBeDefined();
    expect(latestNotification.type).toBe('attendance');
    expect(latestNotification.title).toBe('Atualização da Sessão');
    expect(latestNotification.message).toContain('colaborou durante parte da sessão');
    
    // Mark as read for next test
    await db.markNotificationAsRead(latestNotification.id);
  });

  it('should send special notification when evolution is created with no collaboration', async () => {
    const caller = appRouter.createCaller({
      user: { id: therapistUserId, role: 'therapist' } as any,
      req: {} as any,
      res: {} as any,
    });

    // Create evolution with no collaboration
    const result = await caller.evolutions.create({
      appointmentId: 0,
      patientId,
      sessionDate: new Date(),
      sessionSummary: 'Sessão sem colaboração',
      collaborationLevel: 'none',
      patientMood: 'irritado',
    });

    expect(result.success).toBe(true);

    // Check if notification was created
    const notifications = await db.getUnreadNotificationsByUser(familyUserId);
    const latestNotification = notifications[0];

    expect(latestNotification).toBeDefined();
    expect(latestNotification.type).toBe('attendance');
    expect(latestNotification.title).toBe('Atualização da Sessão');
    expect(latestNotification.message).toContain('não colaborou');
    expect(latestNotification.message).toContain('terapeuta está disponível para conversar');
    
    // Mark as read for cleanup
    await db.markNotificationAsRead(latestNotification.id);
  });
});
