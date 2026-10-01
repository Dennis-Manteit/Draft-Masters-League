# Create Account

The current registration form and Firebase Auth call are in `Frontend/Login/create-account.html` and `Frontend/Login/auth-client.js`. It collects name, email, password and agreement to Terms and Privacy. Firebase Auth owns password storage. The Realtime Database is locked, so there is no server-persisted consent record or coach setup profile yet. Do not treat the form checkbox as proof of persisted legal consent. Server-side setup must store accepted document versions and a server timestamp under the authenticated UID before granting private competition access.
