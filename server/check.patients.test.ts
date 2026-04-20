import { describe, it, expect } from 'vitest';
import * as db from './server/db';

describe('Check patients with null familyUserId', () => {
  it('should find patients without familyUserId', async () => {
    const patients = await db.getAllPatients();
    const withoutFamily = patients.filter(p => !p.familyUserId);
    console.log(`Total patients: ${patients.length}`);
    console.log(`Patients without familyUserId: ${withoutFamily.length}`);
    if (withoutFamily.length > 0) {
      console.log('Sample:', withoutFamily.slice(0, 3).map(p => ({ id: p.id, name: p.name, familyUserId: p.familyUserId })));
    }
    
    // Check the specific patient used in the test
    const testPatient = await db.getPatientById(1140003);
    console.log('Test patient (1140003):', testPatient ? { id: testPatient.id, name: testPatient.name, familyUserId: testPatient.familyUserId } : 'Not found');
    
    expect(patients.length).toBeGreaterThan(0);
  });
});
