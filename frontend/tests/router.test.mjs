import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute } from '../js/router.js';
test('one route supports historical and future seasons for both competitions', () => {
  for (const year of [2020, 2025, 2027]) {
    for (const competitionType of ['draft_premiership', 'fantasy_cup']) {
      assert.deepEqual(resolveRoute(`#competition/${year}/${competitionType}`), { view: 'competition', year, competitionType });
      assert.deepEqual(resolveRoute(`#competition/${year}/${competitionType}/awards`), { view: 'awards', year, competitionType });
    }
  }
});
test('invalid parameters and surplus route segments are rejected', () => {
  for (const path of ['2019/draft_premiership', '2027/other', '2027/draft_premiership/admin', '2027/draft_premiership/awards/extra', '../draft_premiership']) {
    assert.equal(resolveRoute(`#competition/${path}`).view, 'missing');
  }
});
