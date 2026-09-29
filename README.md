# Draft Masters League

The modern way to play Fantasy Rugby League.

## DML login setup

The mobile-friendly login in `web/` uses Firebase Authentication only for DML. It does not sign users in to NRL Fantasy or read/write league data. The Realtime Database rules currently deny all access.

1. The registered Firebase Web app's public configuration is in `web/firebase-config.js`. Do not put service-account credentials or member passwords in this file.
2. In Firebase Authentication, enable **Email/Password** and **Google** providers. Review the authorized domains for the address you intend to host. The preview offers email/password registration with an email verification step. Google sign-in can also create a Firebase account. Authentication alone does not assign league membership or a role; database rules remain deny-all.
3. To update the temporary login preview from a fresh checkout, run `bash Backend/Database/Firebase/preview-login.sh` from the repository root. The script stages the `web/` files with the Firebase config in a temporary directory, deploys only Hosting to the `dml-login` preview channel, then removes the staging directory. Firebase CLI does not permit `hosting.public` outside its project directory. Do not run a production deploy until the login and access flow have been reviewed. This command does not deploy database rules.

The signup form links to the current Terms & Conditions in the repository. A Privacy Policy, a durable record of terms acceptance, and the member approval flow are pending before public launch. Add approved policy pages and contact details before public launch. The login uses the Commissioner's transparent shield from `Backend/Images/Website Page/DML_Shield_Green_Colourway_Transparent.png`, copied to `web/dml-shield.png` so Firebase Hosting can serve it.

## Roles for the next stage

DML has exactly two roles: **Commissioner** and **user**. Firebase Authentication verifies identity but does not assign a DML role. The Commissioner role must be explicitly granted to a verified Firebase UID through a trusted administrative process, and the server/data-layer rules must check it for every Commissioner action. A user may access only their own account and league records explicitly assigned to their UID. Do not infer a role from an email address, the screen shown, or a value the client can edit. The current database deny-all rules remain until the role and data structure is implemented and tested.
