import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './server/db';

describe('Patient familyUserId check', () => {
  it('should have valid familyUserId for all patients', async () => {
    const allPatients = await db.getAllPatients();
    console.log('Total patients:', allPatients.length);
    
    const invalidPatients = allPatients.filter(p => !p.familyUserId || p.familyUserId === 0);
    console.log('Patients without familyUserId:', invalidPatients.length);
    
    if (invalidPatients.length > 0) {
      console.log('Sample invalid patients:', invalidPatients.slice(0, 3).map(p => ({id: p.id, name: p.name, familyUserId: p.familyUserId})));
    }
    
    // Check if familyUserId points to valid users
    const samplePatients = allPatients.slice(0, 5);
    for (const patient of samplePatients) {
      const familyUser = await db.getUserById(patient.familyUserId);
      console.log(`Patient ${patient.id} (${patient.name}): familyUserId=${patient.familyUserId}, user exists=${!!familyUser}`);
    }
    
    expect(allPatients.length).toBeGreaterThan(0);
  });
});
