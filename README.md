# Draft Masters League

The modern way to play Fantasy Rugby League.

## DML login setup

The mobile-friendly login in `web/` uses Firebase Authentication only for DML. It does not sign users in to NRL Fantasy or read/write league data. The Realtime Database rules currently deny all access.

1. The registered Firebase Web app's public configuration is in `web/firebase-config.js`. Do not put service-account credentials or member passwords in this file.
2. In Firebase Authentication, enable **Email/Password** and **Google** providers. Review the authorized domains for the address you intend to host. Members must have DML accounts before using email/password sign-in; this screen does not offer public registration.
3. Review and deploy Hosting only after the providers are ready: `cd Backend/Database/Firebase && firebase deploy --only hosting --project draft-masters-league`. The Firebase project directory is this folder, and `hosting.public` points back to `web/`. For a temporary preview, run `firebase hosting:channel:deploy dml-login --expires 1d --project draft-masters-league` from this folder. This command does not deploy database rules.

The Terms & Conditions and Privacy Policy are pending; the screen labels them accordingly. Add approved policy pages and contact details before public launch. The login uses the Commissioner's transparent shield from `Backend/Images/Website Page/DML_Shield_Green_Colourway_Transparent.png`, copied to `web/dml-shield.png` so Firebase Hosting can serve it.

## Roles for the next stage

DML has exactly two roles: **Commissioner** and **user**. Firebase Authentication verifies identity but does not assign a DML role. The Commissioner role must be explicitly granted to a verified Firebase UID through a trusted administrative process, and the server/data-layer rules must check it for every Commissioner action. A user may access only their own account and league records explicitly assigned to their UID. Do not infer a role from an email address, the screen shown, or a value the client can edit. The current database deny-all rules remain until the role and data structure is implemented and tested.
