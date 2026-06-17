import { describe, it, expect } from 'vitest';
import { appRouter } from './server/routers';
import { createCallerFactory } from './server/_core/trpc';
import * as db from './server/db';

const createCaller = createCallerFactory(appRouter);

describe('Create appointment via tRPC caller with replication', () => {
  it('should create appointment with replication as admin via tRPC caller', async () => {
    // Get admin user
    const allUsers = await db.getAllUsers();
    const adminUser = allUsers.find(u => u.role === 'admin');
    if (!adminUser) throw new Error('No admin user found');
    
    // Get a patient
    const patients = await db.getAllPatients();
    if (patients.length === 0) throw new Error('No patients found');
    const patient = patients[0];
    
    // Get a therapist
    const therapists = allUsers.filter(u => u.role === 'therapist');
    if (therapists.length === 0) throw new Error('No therapists found');
    const therapist = therapists[0];
    
    console.log(`Admin: ${adminUser.id}, Patient: ${patient.id}, Therapist: ${therapist.id}`);
    
    // Create caller with admin context
    const caller = createCaller({ user: adminUser });
    
    const startTime = new Date('2031-03-03T14:00:00.000Z');
    const endTime = new Date('2031-03-03T14:50:00.000Z');
    
    const start = Date.now();
    const result = await caller.appointments.create({
      patientId: patient.id,
      therapistUserId: therapist.id,
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
    
    // Cleanup - delete the created series
    const allApts = await db.getAppointmentsByPatient(patient.id);
    const testApts = allApts.filter(a => {
      const aptTime = new Date(a.startTime).getTime();
      const startTimeMs = startTime.getTime();
      return aptTime >= startTimeMs && aptTime <= startTimeMs + (4 * 7 * 24 * 60 * 60 * 1000);
    });
    console.log(`Cleaning up ${testApts.length} appointments...`);
    for (const apt of testApts) {
      await db.deleteAppointment(apt.id);
    }
    console.log('Cleanup done');
  });
});
