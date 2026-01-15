import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';

describe('Collaboration History', () => {
  let testFamilyUserId: number;
  let testPatient1Id: number;
  let testPatient2Id: number;
  let testTherapistId: number;

  beforeAll(async () => {
    // Use existing users (assume they exist from previous tests)
    testTherapistId = 2; // Lucas Henrique (therapist)
    testFamilyUserId = 1; // Admin user (for testing purposes)

    // Create test patients
    const patient1 = await db.createPatient({
      name: 'Test Patient Collab 1',
      familyUserId: testFamilyUserId,
      therapistUserId: testTherapistId,
      dateOfBirth: new Date('2015-01-01'),
      diagnosis: 'Test',
    });
    testPatient1Id = patient1[0].insertId;

    const patient2 = await db.createPatient({
      name: 'Test Patient Collab 2',
      familyUserId: testFamilyUserId,
      therapistUserId: testTherapistId,
      dateOfBirth: new Date('2016-01-01'),
      diagnosis: 'Test',
    });
    testPatient2Id = patient2[0].insertId;

    // Create evolutions with different dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 35);

    await db.createSessionRecord({
      appointmentId: 1,
      patientId: testPatient1Id,
      therapistUserId: testTherapistId,
      sessionDate: today,
      sessionSummary: 'Today session',
      collaborationLevel: 'full',
    });

    await db.createSessionRecord({
      appointmentId: 2,
      patientId: testPatient1Id,
      therapistUserId: testTherapistId,
      sessionDate: yesterday,
      sessionSummary: 'Yesterday session',
      collaborationLevel: 'partial',
    });

    await db.createSessionRecord({
      appointmentId: 3,
      patientId: testPatient2Id,
      therapistUserId: testTherapistId,
      sessionDate: lastWeek,
      sessionSummary: 'Last week session',
      collaborationLevel: 'none',
    });

    await db.createSessionRecord({
      appointmentId: 4,
      patientId: testPatient1Id,
      therapistUserId: testTherapistId,
      sessionDate: lastMonth,
      sessionSummary: 'Last month session',
      collaborationLevel: 'full',
    });
  });

  it('should return collaboration history for all patients in family', async () => {
    const history = await db.getCollaborationHistory(testFamilyUserId, 30);
    
    expect(history.length).toBeGreaterThanOrEqual(3); // Today, yesterday, last week (last month is outside 30 days)
    expect(history[0].patientName).toBeDefined();
    expect(history[0].collaborationLevel).toMatch(/full|partial|none/);
  });

  it('should filter by specific patient', async () => {
    const history = await db.getCollaborationHistory(testFamilyUserId, 30, testPatient1Id);
    
    expect(history.length).toBeGreaterThanOrEqual(2); // Today and yesterday
    expect(history.every(h => h.patientId === testPatient1Id)).toBe(true);
  });

  it('should filter by days parameter', async () => {
    const history7days = await db.getCollaborationHistory(testFamilyUserId, 7);
    const history70days = await db.getCollaborationHistory(testFamilyUserId, 70);
    
    expect(history70days.length).toBeGreaterThan(history7days.length);
  });

  it('should return empty array for family with no patients', async () => {
    const history = await db.getCollaborationHistory(99999, 30);
    
    expect(history).toEqual([]);
  });

  it('should order results by session date descending', async () => {
    const history = await db.getCollaborationHistory(testFamilyUserId, 30);
    
    if (history.length > 1) {
      const dates = history.map(h => new Date(h.sessionDate).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    }
  });
});
