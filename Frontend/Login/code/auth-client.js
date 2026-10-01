import { initializeApp } from 'firebase/app';
import { initializeAuth, browserSessionPersistence, onAuthStateChanged, signInWithEmailAndPassword, signOut, reload, getIdTokenResult } from 'firebase/auth';

const loginForm = document.getElementById('login-form');
const status = document.getElementById('auth-status');
const accountEmail = document.getElementById('account-email');
const logoutButton = document.getElementById('sign-out');

function message(text) { if (status) status.textContent = text; }
function showLoginError() { message('Sign in could not be completed. Check your details or try again later.'); }

try {
  const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Firebase configuration unavailable');
  const config = await response.json();
  const auth = initializeAuth(initializeApp(config), { persistence: browserSessionPersistence });

  let pendingMessage = null;
  if (loginForm) loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const button = loginForm.querySelector('button');
    button.disabled = true;
    message('Signing in…');
    try {
      await signInWithEmailAndPassword(auth, document.getElementById('email').value.trim(), document.getElementById('password').value);
    } catch {
      showLoginError();
      button.disabled = false;
    }
  });
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (accountEmail) window.location.replace('index.html');
      else {
        document.getElementById('email').disabled = false;
        document.getElementById('password').disabled = false;
        loginForm.querySelector('button').disabled = false;
        message(pendingMessage || 'Sign in with an existing verified account.');
        pendingMessage = null;
      }
      return;
    }
    try {
      await reload(user);
      if (!user.emailVerified) {
        pendingMessage = 'Verify your email before signing in.';
        await signOut(auth);
        return;
      }
      const token = await getIdTokenResult(user);
      if (token.claims.commissioner === true) {
        pendingMessage = 'Commissioner sign in will use its own portal.';
        await signOut(auth);
        return;
      }
      if (accountEmail) {
        accountEmail.textContent = user.email || 'Signed in';
        logoutButton.disabled = false;
      } else window.location.replace('account.html');
    } catch {
      pendingMessage = 'Sign in could not be completed. Try again later.';
      await signOut(auth);
    }
  });
  if (logoutButton) logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    await signOut(auth);
    window.location.replace('index.html');
  });
} catch {
  message('Sign in is temporarily unavailable. Please try again later.');
  if (accountEmail) accountEmail.textContent = 'Account unavailable';
}
