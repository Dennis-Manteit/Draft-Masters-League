# Server route handlers

Frontend login and account pages live in `frontend/`; Firebase Authentication continues to handle the existing email/password flow. No API server is deployed.

The dashboard expects a same-origin GET `/api/v1/competition/:year/:competitionType/dashboard` returning roster, standings and fixtures arrays, an optional round and a news object. Before implementation, verify the Firebase ID token server-side, validate year and competition type, and verify the authenticated user's explicitly assigned league. A browser route or Commissioner label is not authorization. Do not expose recovered archives as public API responses.

NRL sync, private league data, Commissioner provisioning and messaging remain pending. They require approved integrations and tested data permissions before activation.
