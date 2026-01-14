import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('Collaboration History Chart', () => {
  let familyUserId: number;
  let patientId: number;
  let therapistUserId: number;
  const createdEvolutionIds: number[] = [];

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
      name: 'Paciente Teste Histórico',
      dateOfBirth: new Date('2020-01-01'),
      familyUserId,
      therapyType: 'psicologia',
      notes: 'Paciente para testar histórico de colaboração',
    });
    patientId = patientResult[0].insertId;

    // Create evolutions with different collaboration levels over the last 30 days
    const today = new Date();
    const collaborationLevels: Array<'full' | 'partial' | 'none'> = ['full', 'partial', 'none', 'full', 'full'];

    for (let i = 0; i < 5; i++) {
      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() - (i * 5)); // Every 5 days

      const result = await db.createSessionRecord({
        appointmentId: 0,
        patientId,
        therapistUserId,
        sessionDate,
        sessionSummary: `Teste sessão ${i + 1}`,
        collaborationLevel: collaborationLevels[i],
        patientMood: 'neutro',
      });

      createdEvolutionIds.push(result[0].insertId);
    }
  });

  afterAll(async () => {
    // Clean up created evolutions
    for (const id of createdEvolutionIds) {
      await db.deleteSessionRecord(id);
    }
    // Note: Patient cleanup not needed for tests as it's managed by the system
  });

  it('should return collaboration history for family user with default 30 days', async () => {
    const caller = appRouter.createCaller({
      user: { id: familyUserId, role: 'family' } as any,
      req: {} as any,
      res: {} as any,
    });

    const history = await caller.evolutions.getCollaborationHistory();

    expect(history).toBeDefined();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);

    // Check that history contains our test patient's data
    const testPatientRecords = history.filter(h => h.patientId === patientId);
    expect(testPatientRecords.length).toBe(5);

    // Verify data structure
    const firstRecord = testPatientRecords[0];
    expect(firstRecord).toHaveProperty('id');
    expect(firstRecord).toHaveProperty('patientId');
    expect(firstRecord).toHaveProperty('sessionDate');
    expect(firstRecord).toHaveProperty('collaborationLevel');
    expect(firstRecord).toHaveProperty('patientName');
    expect(firstRecord.patientName).toBe('Paciente Teste Histórico');

    // Verify collaboration levels
    const levels = testPatientRecords.map(r => r.collaborationLevel);
    expect(levels).toContain('full');
    expect(levels).toContain('partial');
    expect(levels).toContain('none');
  });

  it('should filter by specific patient when patientId is provided', async () => {
    const caller = appRouter.createCaller({
      user: { id: familyUserId, role: 'family' } as any,
      req: {} as any,
      res: {} as any,
    });

    const history = await caller.evolutions.getCollaborationHistory({ patientId });

    expect(history).toBeDefined();
    expect(Array.isArray(history)).toBe(true);
    
    // All records should be for the specified patient
    const allMatchPatient = history.every(h => h.patientId === patientId);
    expect(allMatchPatient).toBe(true);
    expect(history.length).toBe(5);
  });

  it('should filter by custom days period', async () => {
    const caller = appRouter.createCaller({
      user: { id: familyUserId, role: 'family' } as any,
      req: {} as any,
      res: {} as any,
    });

    // Test with 7 days - should get fewer records
    const history7Days = await caller.evolutions.getCollaborationHistory({ days: 7 });
    const testRecords7Days = history7Days.filter(h => h.patientId === patientId);
    
    // Should have records from last 7 days (2 records: day 0 and day 5)
    expect(testRecords7Days.length).toBeLessThanOrEqual(2);

    // Test with 60 days - should get all records
    const history60Days = await caller.evolutions.getCollaborationHistory({ days: 60 });
    const testRecords60Days = history60Days.filter(h => h.patientId === patientId);
    
    // Should have all 5 records
    expect(testRecords60Days.length).toBe(5);
  });

  it('should return empty array for family with no patients', async () => {
    // Create a family user with no patients
    const [newFamilyResult] = await db.createUser({
      openId: 'test-family-no-patients',
      name: 'Família Sem Pacientes',
      email: 'familia-sem-pacientes@test.com',
      role: 'family',
    });

    const newFamilyId = newFamilyResult.insertId;

    const caller = appRouter.createCaller({
      user: { id: newFamilyId, role: 'family' } as any,
      req: {} as any,
      res: {} as any,
    });

    const history = await caller.evolutions.getCollaborationHistory();

    expect(history).toBeDefined();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);

    // Clean up
    await db.deleteUser(newFamilyId);
  });

  it('should only return evolutions from specified date range', async () => {
    // Create an old evolution (60 days ago)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);

    const oldEvolutionResult = await db.createSessionRecord({
      appointmentId: 0,
      patientId,
      therapistUserId,
      sessionDate: oldDate,
      sessionSummary: 'Sessão antiga',
      collaborationLevel: 'full',
      patientMood: 'neutro',
    });

    const oldEvolutionId = oldEvolutionResult[0].insertId;

    const caller = appRouter.createCaller({
      user: { id: familyUserId, role: 'family' } as any,
      req: {} as any,
      res: {} as any,
    });

    // Query with default 30 days - old evolution should not be included
    const history30 = await caller.evolutions.getCollaborationHistory();
    const oldRecord30 = history30.find(h => h.id === oldEvolutionId);
    expect(oldRecord30).toBeUndefined();

    // Query with 70 days - old evolution should be included
    const history70 = await caller.evolutions.getCollaborationHistory({ days: 70 });
    const oldRecord70 = history70.find(h => h.id === oldEvolutionId);
    expect(oldRecord70).toBeDefined();

    // Clean up
    await db.deleteSessionRecord(oldEvolutionId);
  });
});
