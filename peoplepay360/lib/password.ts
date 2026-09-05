import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const PREFIX = 'scrypt';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  if (!stored.startsWith(`${PREFIX}$`)) {
    const supplied = Buffer.from(password);
    const legacy = Buffer.from(stored);
    return supplied.length === legacy.length && timingSafeEqual(supplied, legacy);
  }

  const [, salt, encodedHash] = stored.split('$');
  if (!salt || !encodedHash) return false;
  const expected = Buffer.from(encodedHash, 'hex');
  const supplied = scryptSync(password, salt, expected.length);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function passwordNeedsUpgrade(stored: string | null | undefined) {
  return !!stored && !stored.startsWith(`${PREFIX}$`);
}
