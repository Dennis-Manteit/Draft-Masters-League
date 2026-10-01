# Forgot Password

The login page links to `Frontend/Login/forgot-password.html`. `Frontend/Login/auth-client.js` uses Firebase Auth's password reset email flow. It never emails passwords or stores reset tokens in the DML database. The response does not reveal whether an email is registered. Firebase handles link expiry and one-time reset verification.
