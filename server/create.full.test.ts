import { describe, it, expect } from 'vitest';
import { createCallerFactory, router } from './server/_core/trpc';
import * as db from './server/db';

describe('Create appointment with replication - full flow', () => {
  it('should create appointment with replication as admin', async () => {
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
    
    // Create appointment with replication via direct DB
    const startTime = new Date('2031-02-03T14:00:00.000Z');
    const endTime = new Date('2031-02-03T14:50:00.000Z');
    
    const result = await db.createAppointment({
      patientId: patient.id,
      therapistUserId: therapist.id,
      therapyType: 'fonoaudiologia',
      startTime,
      endTime,
      status: 'scheduled',
      seriesId: `test-series-${Date.now()}`,
    });
    
    console.log('Created appointment:', result[0].insertId);
    
    // Create 4 more for replication
    const createdIds = [result[0].insertId];
    for (let week = 1; week <= 4; week++) {
      const newStart = new Date(startTime);
      newStart.setDate(startTime.getDate() + (week * 7));
      const newEnd = new Date(endTime);
      newEnd.setDate(endTime.getDate() + (week * 7));
      
      const weekResult = await db.createAppointment({
        patientId: patient.id,
        therapistUserId: therapist.id,
        therapyType: 'fonoaudiologia',
        startTime: newStart,
        endTime: newEnd,
        status: 'scheduled',
        seriesId: `test-series-${Date.now()}`,
      });
      createdIds.push(weekResult[0].insertId);
      console.log(`Week ${week} appointment: ${weekResult[0].insertId} at ${newStart.toISOString()}`);
    }
    
    expect(createdIds.length).toBe(5);
    console.log('All 5 appointments created successfully!');
    
    // Cleanup
    for (const id of createdIds) {
      await db.deleteAppointment(id);
    }
    console.log('Cleanup done');
  });
});
