import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a temporary password for new users
 * Format: Sapere + 4 random chars + 2 numbers
 */
export function generateTemporaryPassword(): string {
  const randomChars = nanoid(4).replace(/[^a-zA-Z0-9]/g, 'x');
  const randomNumbers = Math.floor(10 + Math.random() * 90); // 2 digits
  return `Sapere${randomChars}${randomNumbers}`;
}
