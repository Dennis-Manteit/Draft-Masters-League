import test from 'node:test';
import assert from 'node:assert/strict';
import { saveRoundAwards } from './awards.js';
import { handleSaveRoundAwards } from '../api/awards.js';
import { handleStandings } from '../api/standings.js';
const input = { leagueId: 'league-1', season: 2027, competitionType: 'draft_premiership', round: 1, revision: 1 };
const root = 'leagues/league-1/seasons/2027/competitions/draft_premiership';
const identity = { uid: 'commissioner-1', email_verified: true, commissioner: true, dmlPermissions: ['awards:write'], dmlLeagueIds: ['league-1'] };
function store({ failCommit = false } = {}) {
  const records = new Map();
  records.set(`${root}/verified_round_results/1`, { ...input, status: 'verified', playerAwards: [{ award: 'Player of the Round', winnerId: 'player-1', winnerName: 'Test Player' }], coachAwards: [{ award: 'Coach of the Round', winnerId: 'coach-1', winnerName: 'Test Coach' }] });
  const snapshot = ref => ({ exists: records.has(ref.path), data: () => structuredClone(records.get(ref.path)) });
  let transactions = 0, tail = Promise.resolve();
  return { records, get transactions() { return transactions; },
    doc: path => ({ path, get: async () => snapshot({ path }) }),
    runTransaction(callback) {
      const work = tail.then(async () => {
        transactions++;
        const writes = [];
        const result = await callback({ get: async ref => snapshot(ref), set: (ref, value) => writes.push([ref.path, structuredClone(value)]) });
        if (failCommit) throw new Error('Simulated storage failure with private details');
        for (const [key, value] of writes) records.set(key, value);
        return result;
      });
      tail = work.catch(() => {}); return work;
    },
  };
}
test('saving verified player and coach awards creates one draft and retries preserve review status', async () => {
  const db = store();
  const results = await Promise.all([saveRoundAwards(input, { identity, db }), saveRoundAwards(input, { identity, db })]);
  assert.deepEqual(results.map(result => result.saved), [true, false]);
  const draftPath = `${root}/newsroom_drafts/round-1-awards-v1`;
  const draft = db.records.get(draftPath);
  assert.equal(draft.status, 'draft'); assert.equal(draft.approvalRequired, true);
  assert.match(draft.body, /Test Player/); assert.match(draft.body, /Test Coach/);
  db.records.set(draftPath, { ...draft, status: 'approved', body: 'Commissioner edited text' });
  await saveRoundAwards(input, { identity, db });
  assert.equal(db.records.get(draftPath).body, 'Commissioner edited text');
});
test('failed transaction leaves neither saved awards nor a newsroom draft', async () => {
  const db = store({ failCommit: true });
  await assert.rejects(saveRoundAwards(input, { identity, db }));
  assert.equal(db.records.size, 1);
});
test('regular users, other leagues and ungranted Commissioner powers cannot save awards', async () => {
  for (const changes of [{ commissioner: false }, { dmlLeagueIds: ['other'] }, { dmlPermissions: [] }, { email_verified: false }]) {
    const db = store();
    await assert.rejects(saveRoundAwards(input, { identity: { ...identity, ...changes }, db }), error => error.status === 403);
    assert.equal(db.transactions, 0);
  }
});
test('unverified results and wrong competition scope or revision cannot create announcements', async () => {
  for (const changes of [{ status: 'pending' }, { leagueId: 'other' }, { competitionType: 'fantasy_cup' }, { revision: 2 }, { playerAwards: [] , coachAwards: [] }]) {
    const db = store(); const path = `${root}/verified_round_results/1`;
    db.records.set(path, { ...db.records.get(path), ...changes });
    await assert.rejects(saveRoundAwards(input, { identity, db }), error => error.status === 409);
    assert.equal(db.records.size, 1);
  }
});
test('HTTP awards handler verifies revocation and rejects caller-supplied winners', async () => {
  const db = store(); const calls = [];
  const auth = { verifyIdToken: async (...args) => { calls.push(args); return identity; } };
  const request = body => new Request('https://dml.example/api/v1/awards/round', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await handleSaveRoundAwards(request({ ...input, verifiedData: { winner: 'fake' } }), { auth, db })).status, 400);
  assert.equal(db.transactions, 0);
  assert.equal((await handleSaveRoundAwards(request(input), { auth, db })).status, 200);
  assert.deepEqual(calls[0], ['test-token', true]);
  const rejected = await handleSaveRoundAwards(request(input), { auth: { verifyIdToken: async () => { throw Error('revoked'); } }, db });
  assert.equal(rejected.status, 401);
});
test('standings reads require explicit league assignment and expose only approved table fields', async () => {
  const db = store();
  db.records.set(`${root}/leaderboards/coach-awards`, { leagueId: input.leagueId, season: 2027, competitionType: input.competitionType, rows: [{ coachName: 'Test Coach', franchiseName: 'Test Club', totalPoints: 8, privateEmail: 'private@example.invalid' }] });
  const request = new Request('https://dml.example/api/v1/competition/2027/draft_premiership/standings/coach-awards?leagueId=league-1', { headers: { Authorization: 'Bearer test-token' } });
  const parameters = { season: '2027', competitionType: input.competitionType, view: 'coach-awards' };
  const response = await handleStandings(request, parameters, { db, auth: { verifyIdToken: async () => identity } });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).rows, [{ coachName: 'Test Coach', franchiseName: 'Test Club', totalPoints: 8 }]);
  assert.equal((await handleStandings(request, parameters, { db, auth: { verifyIdToken: async () => ({ ...identity, dmlLeagueIds: [] }) } })).status, 403);
  assert.equal((await handleStandings(request, { ...parameters, season: '2026' }, { db, auth: { verifyIdToken: async () => identity } })).status, 404);
});
