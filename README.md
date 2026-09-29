# Draft Masters League

The modern way to play Fantasy Rugby League.

## DML login setup

The mobile-friendly login in `web/` uses Firebase Authentication only for DML. It does not sign users in to NRL Fantasy or read/write league data. The Realtime Database rules currently deny all access.

1. In the existing `draft-masters-league` Firebase project, register a Web app and copy its **web app configuration** into `web/firebase-config.js`, replacing the placeholder `apiKey` and `appId` and verifying `authDomain` and `projectId`. The web config identifies the app; do not put service-account credentials or member passwords in this file.
2. In Firebase Authentication, enable **Email/Password** and **Google** providers. Review the authorized domains for the address you intend to host. Members must have DML accounts before using email/password sign-in; this screen does not offer public registration.
3. Review and deploy Hosting only after the web config and providers are ready: `firebase deploy --only hosting --project draft-masters-league`. This command does not deploy database rules.

The Terms & Conditions and Privacy Policy are pending; the screen labels them accordingly. Add approved policy pages and contact details before public launch. The official DML shield asset has not been available in this repository, so the screen uses text branding until the approved asset is supplied.
