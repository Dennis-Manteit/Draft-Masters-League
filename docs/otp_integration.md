# Six-digit email verification: pending integration

`otp.mjs` contains the code generation and validation primitives. It does not send emails, create accounts, or grant access. Nothing here is deployed. The test secret is deliberately invalid for deployment.

Before activation, an authenticated server operation must atomically store each challenge under the Firebase Auth UID in a database path denied to all clients. It must enforce per-account and per-address daily request limits, the resend delay, expiry, attempt limit, and single use within database transactions. It must take the email from the authenticated Firebase account, never a caller-supplied target address. It must record the accepted Terms and Privacy versions and timestamp server-side. Only after a valid code should it mark the Firebase Auth email verified and create an approved profile. Commissioner claims require a separate administrator operation.

An approved email sender and a server-side HMAC secret are required. Do not put either in the repository or client bundle. Cloud Functions require Blaze and may incur charges; an SMTP provider can also charge. Do not deploy or enable registration until billing and the sender are approved, the access rules and failure cases are tested, and the Commissioner reviews the result.
