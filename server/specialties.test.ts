import { describe, it, expect, beforeEach } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('Therapist Specialties and Patient Assignments', () => {
  let adminContext: any;
  let therapistContext: any;
  let therapistUserId: number;
  let patientId: number;

  beforeEach(async () => {
    // Create admin user
    const adminUser = await db.createUser({
      name: 'Admin Test',
      email: `admin-${Date.now()}@test.com`,
      password: 'password123',
      role: 'admin',
    });
    const adminId = adminUser[0].insertId;

    adminContext = {
      user: { id: adminId, name: 'Admin Test', email: `admin-${Date.now()}@test.com`, role: 'admin' },
    };

    // Create therapist user
    const therapistUser = await db.createUser({
      name: 'Therapist Test',
      email: `therapist-${Date.now()}@test.com`,
      password: 'password123',
      role: 'therapist',
    });
    therapistUserId = therapistUser[0].insertId;

    therapistContext = {
      user: { 
        id: therapistUserId, 
        name: 'Therapist Test', 
        email: `therapist-${Date.now()}@test.com`, 
        role: 'therapist' 
      },
    };

    // Create a test patient
    const patient = await db.createPatient({
      name: 'Test Patient',
      dateOfBirth: new Date('2015-01-01'),
      diagnosis: 'Test diagnosis',
      familyUserId: adminId,
    });
    patientId = patient[0].insertId;
  });

  it('should update therapist specialties', async () => {
    const newSpecialties = ['Terapia Ocupacional', 'Psicopedagogia'];
    
    await db.updateUserSpecialties(therapistUserId, newSpecialties);

    const users = await db.getAllUsers();
    const updatedUser = users.find((u) => u.id === therapistUserId);
    const parsedSpecialties = updatedUser?.specialties ? JSON.parse(updatedUser.specialties as any) : [];
    expect(parsedSpecialties).toEqual(newSpecialties);
  });

  it('should assign patient to therapist with therapy type', async () => {
    const caller = appRouter.createCaller(therapistContext);
    
    await caller.patients.createAssignment({
      patientId,
      therapistUserId,
      therapyType: 'fonoaudiologia',
    });

    const assignments = await db.getPatientTherapistAssignments(patientId);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].therapistUserId).toBe(therapistUserId);
    expect(assignments[0].therapyType).toBe('fonoaudiologia');
  });

  it('should allow multiple therapy assignments for same patient', async () => {
    const caller = appRouter.createCaller(adminContext);
    
    // Create second therapist
    const therapist2 = await db.createUser({
      name: 'Therapist 2',
      email: `therapist2-${Date.now()}@test.com`,
      password: 'password123',
      role: 'therapist',
    });
    const therapist2Id = therapist2[0].insertId;

    // Assign patient to first therapist for Speech Therapy
    await caller.patients.createAssignment({
      patientId,
      therapistUserId,
      therapyType: 'fonoaudiologia',
    });

    // Assign patient to second therapist for Psychology
    await caller.patients.createAssignment({
      patientId,
      therapistUserId: therapist2Id,
      therapyType: 'psicologia',
    });

    const assignments = await db.getPatientTherapistAssignments(patientId);
    expect(assignments).toHaveLength(2);
    expect(assignments.map((a) => a.therapyType)).toContain('fonoaudiologia');
    expect(assignments.map((a) => a.therapyType)).toContain('psicologia');
  });

  it('should get only assigned patients for therapist', async () => {
    const caller = appRouter.createCaller(therapistContext);
    
    // Assign patient to therapist
    await caller.patients.createAssignment({
      patientId,
      therapistUserId,
      therapyType: 'fonoaudiologia',
    });

    // Create another patient not assigned to this therapist
    const otherPatient = await db.createPatient({
      name: 'Other Patient',
      dateOfBirth: new Date('2016-01-01'),
      diagnosis: 'Other diagnosis',
      familyUserId: adminContext.user.id,
    });

    const myPatients = await caller.patients.getMyPatients();
    
    expect(myPatients).toHaveLength(1);
    expect(myPatients[0].id).toBe(patientId);
    expect(myPatients[0].name).toBe('Test Patient');
  });

  it('should remove therapist assignment', async () => {
    const caller = appRouter.createCaller(therapistContext);
    
    // Assign patient to therapist
    await caller.patients.createAssignment({
      patientId,
      therapistUserId,
      therapyType: 'fonoaudiologia',
    });

    let assignments = await db.getPatientTherapistAssignments(patientId);
    expect(assignments).toHaveLength(1);
    const assignmentId = assignments[0].id;

    // Remove assignment
    await caller.patients.deleteAssignment({
      id: assignmentId,
    });

    assignments = await db.getPatientTherapistAssignments(patientId);
    expect(assignments).toHaveLength(0);
  });
});
