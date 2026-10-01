# Remember Me

`Frontend/Login/index.html` exposes an unchecked Remember Me option. `Frontend/Login/auth-client.js` selects Firebase Auth local persistence only when checked; otherwise it uses browser session persistence. It does not store passwords or custom login tokens. On a shared device, users should leave it unchecked and sign out after use.
