# Server route handlers

Frontend login and account pages live in `frontend/`; Firebase Authentication continues to handle the existing email/password flow. No API server is deployed.

The dashboard expects a same-origin GET `/api/v1/competition/:year/:competitionType/dashboard` returning roster, standings and fixtures arrays, an optional round and a news object. Before implementation, verify the Firebase ID token server-side, validate year and competition type, and verify the authenticated user's explicitly assigned league. A browser route or Commissioner label is not authorization. Do not expose recovered archives as public API responses.

NRL sync, private league data, Commissioner provisioning and messaging remain pending. They require approved integrations and tested data permissions before activation.

## Awards to newsroom

`handleSaveRoundAwards` in `backend/api/awards.js` is the POST `/api/v1/awards/round` handler. Inject the approved server's initialized Admin Auth and Firestore objects; no SDK credentials or deployment are created here. The handler verifies the bearer ID token with revocation checking. Award saving requires verified email, a server-issued `commissioner: true` claim, `dmlPermissions` containing `awards:write`, and `dmlLeagueIds` containing the requested league. These claims must only be granted by a trusted administrator.

Request fields: `leagueId`, `season`, `competitionType`, `round`, `revision`. Caller-supplied winners, `verifiedData` and role fields are rejected. Official winners must already be in the server-owned `leagues/{leagueId}/seasons/{season}/competitions/{competitionType}/verified_round_results/{round}` document. It must contain the same scope/revision, `status: verified`, `playerAwards` and `coachAwards`. Each winner uses `award`, `winnerId`, `winnerName`. The trusted calculation/review process must use immutable revision numbers when results change; no award weights or winners are calculated by these handlers.

`saveRoundAwards` commits `round_awards/{round}` and `newsroom_drafts/round-{round}-awards-v{revision}` together. Both save or neither saves. It calls the shared deterministic newsroom draft builder inside that transaction, avoiding a second HTTP request, external model, queue or polling worker. Repeating a save returns the same draft and leaves Commissioner edits/approval unchanged. Corrections require a new verified revision. Before approving or publishing, the future Commissioner portal must compare the draft's source revision with current official awards, reject stale revisions, enforce a separate trusted approval/publishing permission and audit the action. No approval or social posting endpoint is enabled here.

## Standings

`handleStandings` in `backend/api/standings.js` is the GET `/api/v1/competition/:season/:competitionType/standings/:view?leagueId=...` handler. Views are `ladder`, `player-awards`, `coach-awards`. It verifies the token and explicit league assignment before reading `leaderboards/{view}` in the scoped competition. Stored documents contain matching `leagueId`, `season`, `competitionType`, plus `rows`. Only approved table fields are returned; unrelated private record fields are omitted. The coach table consumes `coachName`, `franchiseName`, `playOfTheMatch`, `performanceOfTheWeek`, `coachOfTheRound`, `totalPoints` and optional `rank` without calculating weights. Precomputed leaderboard maintenance remains the responsibility of the trusted awards engine.

The dashboard response must include its trusted assigned `leagueId` for these views. The frontend reuses its existing ladder response, caches each table only in memory, deduplicates in-flight reads and clears requests/data on season, competition or account changes. Historical 2020–2023 views cache for ten minutes; newer seasons cache for thirty seconds. Server responses use `no-store` to prevent shared caches retaining member data.

Both handlers use Web Request/Response interfaces and can be mounted in the chosen Node runtime. They are tested with an isolated transactional store and Auth doubles; they are not deployed or tested against live Firestore. Firestore client rules remain deny-all. Hosting alone cannot run these server handlers; an approved runtime, trusted calculation records and claim provisioning are still needed. No service adoption, secrets, billing or account connection is performed by this change.

Implementation references: [Firebase transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [trusted custom claims](https://firebase.google.com/docs/auth/admin/custom-claims).
