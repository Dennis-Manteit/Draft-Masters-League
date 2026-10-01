import test from 'node:test';
import assert from 'node:assert/strict';
import { transitionDraft } from './newsroom_review.js';
import { createApiHandler } from '../api/router.js';
const scope = { leagueId: 'league-1', season: 2027, competitionType: 'draft_premiership' };
const root = 'leagues/league-1/seasons/2027/competitions/draft_premiership';
const draftId = 'round-1-awards-v1';
const identity = { uid: 'commissioner-1', email_verified: true, commissioner: true, dmlLeagueIds: ['league-1'], dmlPermissions: ['newsroom:review', 'newsroom:approve', 'newsroom:publish'] };
function store() {
  const records = new Map([
    [`${root}/newsroom_drafts/${draftId}`, { title: 'Round 1 Official Awards', body: 'Verified winner', status: 'draft', source: { ...scope, round: 1, revision: 1 }, createdAt: '2026-01-01' }],
    [`${root}/round_awards/1`, { revision: 1 }],
    [`${root}/verified_round_results/1`, { revision: 1, status: 'verified' }],
  ]);
  const snapshot = path => ({ exists: records.has(path), data: () => structuredClone(records.get(path)) });
  return { records, doc: path => ({ path, get: async () => snapshot(path) }), runTransaction: async callback => {
    const writes = [];
    const result = await callback({ get: async ref => snapshot(ref.path), set: (ref, value) => writes.push([ref.path, structuredClone(value)]) });
    for (const [path, value] of writes) records.set(path, value);
    return result;
  } };
}
test('Commissioner review, approval and DML publication require ordered transitions and version checks', async () => {
  const db = store();
  await transitionDraft({ ...scope, draftId, version: 0, status: 'review' }, { identity, db });
  await transitionDraft({ ...scope, draftId, version: 1, status: 'approved' }, { identity, db });
  assert.equal(db.records.has(`${root}/newsroom_posts/${draftId}`), false);
  await transitionDraft({ ...scope, draftId, version: 2, status: 'published' }, { identity, db });
  assert.equal(db.records.get(`${root}/newsroom_posts/${draftId}`).body, 'Verified winner');
  assert.equal(db.records.get(`${root}/newsroom_drafts/${draftId}`).status, 'published');
  await assert.rejects(transitionDraft({ ...scope, draftId, version: 2, status: 'published' }, { identity, db }), error => error.status === 409);
});
test('regular users and users without publication powers cannot publish', async () => {
  for (const change of [{ commissioner: false }, { dmlPermissions: ['newsroom:review'] }, { dmlLeagueIds: ['another-league'] }]) {
    const db = store();
    await assert.rejects(transitionDraft({ ...scope, draftId, version: 0, status: 'published' }, { identity: { ...identity, ...change }, db }), error => error.status === 403);
    assert.equal(db.records.has(`${root}/newsroom_posts/${draftId}`), false);
  }
});
test('skipping review, stale award revisions and tampered draft paths are rejected', async () => {
  const db = store();
  await assert.rejects(transitionDraft({ ...scope, draftId, version: 0, status: 'approved' }, { identity, db }), error => error.status === 409);
  db.records.set(`${root}/verified_round_results/1`, { status: 'verified', revision: 2 });
  await assert.rejects(transitionDraft({ ...scope, draftId, version: 0, status: 'review' }, { identity, db }), error => error.status === 409);
  await assert.rejects(transitionDraft({ ...scope, draftId: '../private', version: 0, status: 'review' }, { identity, db }), error => error.status === 400);
});
test('API router connects newsroom transitions while verifying Firebase tokens', async () => {
  const db = store(); let checked;
  const handle = createApiHandler({ db, auth: { verifyIdToken: async (token, revoked) => { checked = [token, revoked]; return identity; } } });
  const response = await handle(new Request('https://dml.example/api/newsroom', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...scope, draftId, version: 0, status: 'review' }) }));
  assert.equal(response.status, 200); assert.deepEqual(checked, ['test-token', true]);
  assert.equal((await handle(new Request('https://dml.example/api/unknown'))).status, 404);
});
