import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const RESEND_DELAY_MS = 60 * 1000;

function digest(secret, uid, email, code) {
  return createHmac('sha256', secret).update(`${uid}\0${email.toLowerCase()}\0${code}`).digest('hex');
}

export function createChallenge({ secret, uid, email, now = Date.now(), previous = null }) {
  if (!secret || !uid || !email) throw new Error('Missing challenge inputs');
  if (previous && now - previous.createdAt < RESEND_DELAY_MS) return { status: 'rate_limited' };
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  return {
    status: 'created',
    code,
    record: { digest: digest(secret, uid, email, code), createdAt: now, expiresAt: now + CODE_TTL_MS, attempts: 0, consumed: false }
  };
}

export function verifyChallenge({ secret, uid, email, code, record, now = Date.now() }) {
  if (!record || record.consumed || now >= record.expiresAt || record.attempts >= MAX_ATTEMPTS) return { valid: false, record };
  if (!/^[0-9]{6}$/.test(code || '')) return { valid: false, record: { ...record, attempts: record.attempts + 1 } };
  const actual = Buffer.from(digest(secret, uid, email, code), 'hex');
  const expected = Buffer.from(record.digest, 'hex');
  const valid = actual.length === expected.length && timingSafeEqual(actual, expected);
  return { valid, record: { ...record, attempts: record.attempts + 1, consumed: valid } };
}
