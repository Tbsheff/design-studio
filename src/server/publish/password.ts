import { pbkdf2Sync, randomBytes } from 'node:crypto';

const PBKDF2_ITER = 10_000;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITER, 32, 'sha256');
  return `pbkdf2-sha256$${PBKDF2_ITER}$${salt.toString('hex')}$${hash.toString('hex')}`;
}
