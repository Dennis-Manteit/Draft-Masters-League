# Verification

The deployed registration flow uses Firebase's email verification **link** in `Frontend/Login/verification.html` and `Frontend/Login/auth-client.js`; unverified accounts cannot enter the signed-in account screen. The requested six-digit code is not live. Its undeployed primitives and integration requirements are in `../../Login Code/`. A server operation must validate and consume codes before any six-digit UI can be enabled.
