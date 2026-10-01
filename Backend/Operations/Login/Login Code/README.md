# Login Code

Firebase Authentication handles email and password sign in for existing verified accounts. The public website only displays a signed-in placeholder; it does not grant access to private league data.

This folder is reserved for secure account creation, email code delivery and verification, versioned legal consent, NRL Fantasy team association, and Commissioner role provisioning. Those operations must validate permissions on the server before database rules can be opened. The Realtime Database remains locked.
