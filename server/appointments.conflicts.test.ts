import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import bcrypt from 'bcrypt';

describe('Appointment Scheduling Conflicts', () => {
  let therapistId: number;
  let patientId: number;
  let therapist2Id: number;

  beforeAll(async () => {
    // Get existing test users and patients
    const allPatients = await db.getAllPatients();
    if (allPatients.length === 0) {
      throw new Error('No patients found in database. Please create at least one patient for testing.');
    }
    patientId = allPatients[0].id;

    const allUsers = await db.getAllUsers();
    const therapists = allUsers.filter(u => u.role === 'therapist');
    if (therapists.length < 2) {
      throw new Error('Need at least 2 therapists in database for conflict testing.');
    }
    therapistId = therapists[0].id;
    therapist2Id = therapists[1].id;
  });

  afterAll(async () => {
    // Note: Test data cleanup would require manual deletion via SQL
    // Tests use far-future dates (2026) to avoid conflicts with real data
  });

  it('should detect therapist conflict when creating overlapping appointment', async () => {
    const startTime = new Date('2030-01-15T10:00:00Z');
    const endTime = new Date('2030-01-15T11:00:00Z');

    // Create first appointment
    await db.createAppointment({
      patientId,
      therapistUserId: therapistId,
      therapyType: 'psicologia',
      startTime,
      endTime,
      status: 'scheduled',
    });

    // Check for conflicts with overlapping time
    const conflictStart = new Date('2030-01-15T10:30:00Z');
    const conflictEnd = new Date('2030-01-15T11:30:00Z');
    
    const conflicts = await db.checkScheduleConflicts(
      conflictStart,
      conflictEnd,
      therapistId,
      patientId + 1 // Different patient
    );

    expect(conflicts.therapistConflict).toBe(true);
    expect(conflicts.patientConflict).toBe(false);
  });

  it('should detect patient conflict when creating overlapping appointment', async () => {
    const startTime = new Date('2030-01-15T14:00:00Z');
    const endTime = new Date('2030-01-15T15:00:00Z');

    // Create first appointment
    await db.createAppointment({
      patientId,
      therapistUserId: therapistId,
      therapyType: 'fonoaudiologia',
      startTime,
      endTime,
      status: 'scheduled',
    });

    // Check for conflicts with overlapping time
    const conflictStart = new Date('2030-01-15T14:30:00Z');
    const conflictEnd = new Date('2030-01-15T15:30:00Z');
    
    const conflicts = await db.checkScheduleConflicts(
      conflictStart,
      conflictEnd,
      therapist2Id, // Different therapist
      patientId
    );

    expect(conflicts.therapistConflict).toBe(false);
    expect(conflicts.patientConflict).toBe(true);
  });

  it('should not detect conflict for non-overlapping appointments', async () => {
    const startTime = new Date('2030-01-15T16:00:00Z');
    const endTime = new Date('2030-01-15T17:00:00Z');

    // Create first appointment
    await db.createAppointment({
      patientId,
      therapistUserId: therapistId,
      therapyType: 'terapia_ocupacional',
      startTime,
      endTime,
      status: 'scheduled',
    });

    // Check for conflicts with non-overlapping time
    const noConflictStart = new Date('2030-01-15T17:00:00Z');
    const noConflictEnd = new Date('2030-01-15T18:00:00Z');
    
    const conflicts = await db.checkScheduleConflicts(
      noConflictStart,
      noConflictEnd,
      therapistId,
      patientId
    );

    expect(conflicts.therapistConflict).toBe(false);
    expect(conflicts.patientConflict).toBe(false);
  });

  it('should exclude current appointment when checking conflicts on update', async () => {
    // Use unique timestamp to avoid conflicts with other tests
    const uniqueTime = new Date();
    uniqueTime.setFullYear(2030);
    uniqueTime.setMonth(0); // January
    uniqueTime.setDate(16);
    uniqueTime.setHours(10 + Math.floor(Math.random() * 5)); // Random hour 10-14
    uniqueTime.setMinutes(Math.floor(Math.random() * 60));
    uniqueTime.setSeconds(0);
    uniqueTime.setMilliseconds(0);
    const startTime = uniqueTime;
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    // Create appointment
    const [result] = await db.createAppointment({
      patientId,
      therapistUserId: therapistId,
      therapyType: 'psicologia',
      startTime,
      endTime,
      status: 'scheduled',
    });
    const appointmentId = result.insertId;

    // Check for conflicts with same time but excluding this appointment
    const conflicts = await db.checkScheduleConflicts(
      startTime,
      endTime,
      therapistId,
      patientId,
      appointmentId // Exclude this appointment
    );

    expect(conflicts.therapistConflict).toBe(false);
    expect(conflicts.patientConflict).toBe(false);
  });

  it('should detect both therapist and patient conflicts', async () => {
    const startTime = new Date('2030-01-17T10:00:00Z');
    const endTime = new Date('2030-01-17T11:00:00Z');

    // Create appointment
    await db.createAppointment({
      patientId,
      therapistUserId: therapistId,
      therapyType: 'psicologia',
      startTime,
      endTime,
      status: 'scheduled',
    });

    // Check for conflicts with same therapist and patient
    const conflictStart = new Date('2030-01-17T10:30:00Z');
    const conflictEnd = new Date('2030-01-17T11:30:00Z');
    
    const conflicts = await db.checkScheduleConflicts(
      conflictStart,
      conflictEnd,
      therapistId,
      patientId
    );

    expect(conflicts.therapistConflict).toBe(true);
    expect(conflicts.patientConflict).toBe(true);
  });
});
