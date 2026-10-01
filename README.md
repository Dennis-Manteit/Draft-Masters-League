# Draft Masters League

This repository root is `dml_project/` in the agreed layout; there is no second nested project directory. The application stays in HTML, CSS and JavaScript.

- Root: Firebase configuration, locked database rules, indexes and pinned dependencies.
- `docs/rulebook.md`: preserved official rulebook.
- `docs/policies/`: preserved Terms and Conditions and Privacy Policy.
- `data/recovered_data/<year>/Recovered Data/`: original recovered files, unchanged.
- `backend/core/`: shared configuration and archive/document paths.
- `backend/api/`: server operations and implementation guidance.
- `backend/services/`: existing OTP primitives and private recovery processor.
- `frontend/`: mobile competition dashboard plus preserved login, registration, verification, account and policy pages.
- `frontend/assets/`: original DML branding assets, unchanged.
- `frontend/css/main.css`: existing design styles.
- `frontend/js/`: authentication, same-origin API client and parameterized router.
- `frontend/js/views/`: login helpers, dashboard and lazily loaded competition/awards renderers.

Run `npm ci --no-audit --no-fund`, `npm test` and `npm run build` from the root. Firebase Hosting serves only `dist/`. No docs, recovered data, backend code or credentials are copied into it. The existing workflow deploys Hosting from the root when an approved change reaches `main`; this restructure does not deploy Firestore or database rules.

Authentication uses Firebase session persistence. `getState()` returns a frozen in-memory session snapshot, not authorization. Raw tokens are never manually stored in local storage. Private database access remains denied. Commissioner powers require trusted server checks.

`index.html#competition/2027/draft_premiership` and `index.html#competition/2027/fantasy_cup/awards` use the same modules as historical years. The dashboard sends one authenticated same-origin request per selected season/competition and cancels superseded requests. It shows empty states when that API is unavailable. Award views show availability notices until trusted results exist. Routing does not expose archive files or calculate awards.

The proposed Firestore composite index covers `year`, `competition_type`, `round` on a future `competition_rounds` collection. It is a configuration proposal, not a deployed index or a promise of latency. No Firestore database, live NRL integration, AI service, Redis, worker or billable service is activated by this restructure. Existing archives include 2020–2024; no missing 2025 data has been invented.

Service account keys stay in the existing approved GitHub secret or outside the checkout. Do not commit them. The recovery processor still requires an approved private export, `DML_PRIVATE_OUTPUT=1`, and refuses to overwrite existing output. Its outputs now resolve under `data/recovered_data/<year>/recovered.data` and remain ignored by Git.

Recovery path: the restructure is a single commit on a separate branch. The previous paths and complete original content remain in its parent commit. Reverting that commit restores the prior layout.
