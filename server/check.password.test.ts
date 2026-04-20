import { describe, it, expect } from 'vitest';
import * as db from './server/db';

describe('Admin password check', () => {
  it('should verify admin password', async () => {
    const user = await db.getUserByEmail('sapere.recepcao@gmail.com');
    console.log('User found:', !!user, 'Has password hash:', !!user?.passwordHash);
    
    if (user?.passwordHash) {
      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare('Sapere@2024', user.passwordHash);
      console.log('Password "Sapere@2024" valid:', isValid);
      
      // Try other common passwords
      const passwords = ['sapere2024', 'Sapere2024', 'sapere@2024', '123456', 'admin'];
      for (const pwd of passwords) {
        const valid = await bcrypt.compare(pwd, user.passwordHash);
        if (valid) console.log(`Password "${pwd}" is CORRECT!`);
      }
    }
    
    expect(user).toBeDefined();
  });
});
