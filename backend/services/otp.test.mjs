import test from 'node:test';
import assert from 'node:assert/strict';
import { createChallenge, verifyChallenge, CODE_TTL_MS, MAX_ATTEMPTS } from './otp.mjs';
const args = { secret: 'test-only-not-a-deployment-secret', uid: 'member-1', email: 'member@example.invalid', now: 1000 };
test('accepts one matching code, not another member or a replay', () => {
  const { code, record } = createChallenge(args);
  assert.match(code, /^[0-9]{6}$/);
  assert.equal(verifyChallenge({ ...args, code, record, uid: 'member-2' }).valid, false);
  const accepted = verifyChallenge({ ...args, code, record });
  assert.equal(accepted.valid, true);
  assert.equal(verifyChallenge({ ...args, code, record: accepted.record }).valid, false);
});
test('expires and counts incorrect attempts', () => {
  const { code, record } = createChallenge(args);
  assert.equal(verifyChallenge({ ...args, code, record, now: args.now + CODE_TTL_MS }).valid, false);
  let current = record;
  for (let i = 0; i < MAX_ATTEMPTS; i++) current = verifyChallenge({ ...args, code: 'not-a-code', record: current }).record;
  assert.equal(verifyChallenge({ ...args, code, record: current }).valid, false);
});
test('limits immediate resend', () => {
  const { record } = createChallenge(args);
  assert.equal(createChallenge({ ...args, previous: record, now: 2000 }).status, 'rate_limited');
});
