import test from 'node:test';
import assert from 'node:assert/strict';
import { createStandingsLoader } from '../js/views/standings.js';
const scope = { leagueId: 'league-1', season: 2027, competitionType: 'draft_premiership' };
function setup() {
  const calls = []; let clock = 0;
  const loader = createStandingsLoader({ uid: 'coach-1', getToken: async () => 'test-token', now: () => clock, request: async (url, options) => {
    calls.push([url, options]); return { ...scope, view: url.split('/standings/')[1].split('?')[0], rows: [{ coachName: 'Test Coach' }] };
  } });
  loader.setContext(scope);
  return { loader, calls, advance: time => { clock += time; } };
}
test('standings views deduplicate requests, cache results and expire', async () => {
  const { loader, calls, advance } = setup();
  await Promise.all([loader.load('coach-awards'), loader.load('coach-awards')]);
  await loader.load('coach-awards'); assert.equal(calls.length, 1);
  assert.match(calls[0][0], /2027\/draft_premiership\/standings\/coach-awards\?leagueId=league-1$/);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer test-token');
  advance(30_001); await loader.load('coach-awards'); assert.equal(calls.length, 2);
});
test('dashboard ladder is reused and a competition change cannot reuse cached rows', async () => {
  const { loader, calls } = setup();
  loader.setContext(scope, [{ name: 'Test Club' }]);
  assert.deepEqual(await loader.load('ladder'), [{ name: 'Test Club' }]); assert.equal(calls.length, 0);
  loader.setContext({ ...scope, season: 2026 });
  await assert.rejects(loader.load('ladder'), /do not match/); assert.equal(calls.length, 1);
});
test('logout aborts outstanding requests and prevents their data being cached', async () => {
  let release; let signal;
  const loader = createStandingsLoader({ uid: 'coach-1', getToken: async () => 'test-token', request: (_, options) => { signal = options.signal; return new Promise(resolve => { release = resolve; }); } });
  loader.setContext(scope);
  const request = loader.load('player-awards'); await new Promise(resolve => setImmediate(resolve));
  loader.clear(); assert.equal(signal.aborted, true);
  release({ ...scope, view: 'player-awards', rows: [] });
  await assert.rejects(request, /Selection changed/);
  await assert.rejects(loader.load('ladder'), /No assigned league/);
});
