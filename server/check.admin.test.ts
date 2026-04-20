import { describe, it, expect } from 'vitest';
import * as db from './server/db';

describe('Admin user check', () => {
  it('should find admin user and check password hash', async () => {
    const allUsers = await db.getAllUsers();
    const admins = allUsers.filter(u => u.role === 'admin');
    console.log('Admin users:', admins.map(u => ({ id: u.id, email: u.email, hasPassword: !!u.passwordHash })));
    expect(admins.length).toBeGreaterThan(0);
  });
});
