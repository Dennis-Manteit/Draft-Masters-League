import { initializeApp } from 'firebase/app';
import { initializeAuth, browserSessionPersistence, browserLocalPersistence, setPersistence, sendPasswordResetEmail, onAuthStateChanged, signInWithEmailAndPassword, signOut, reload, getIdTokenResult, createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';

const registrationForm = document.getElementById('registration-form');
const checkVerification = document.getElementById('check-verification');
const resendVerification = document.getElementById('resend-verification');
let registering = false;
const loginForm = document.getElementById('login-form');
const resetForm = document.getElementById('password-reset-form');
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

  const verificationSettings = { url: new URL('verification.html', window.location.origin).href };
  function registrationError(error) {
    const errors = {
      'auth/email-already-in-use': 'An account already uses this email. Sign in to verify it or use another email.',
      'auth/invalid-email': 'Enter a valid email address.',
      'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
      'auth/password-does-not-meet-requirements': 'Choose a stronger password that meets the account password policy.',
      'auth/operation-not-allowed': 'Registration is unavailable. Please contact DML support.',
      'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
      'auth/network-request-failed': 'Check your internet connection and try again.'
    };
    message(errors[error.code] || 'Account creation could not be completed. Please try again.');
  }
  if (registrationForm) registrationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.getElementById('password');
    const confirmation = document.getElementById('confirm-password');
    confirmation.setCustomValidity(password.value === confirmation.value ? '' : 'Passwords must match.');
    if (!registrationForm.reportValidity() || registering) return;
    registering = true;
    registrationForm.querySelector('button').disabled = true;
    message('Creating your account…');
    let created = false;
    try {
      const { user } = await createUserWithEmailAndPassword(auth, document.getElementById('email').value.trim(), password.value);
      created = true;
      await updateProfile(user, { displayName: [document.getElementById('first-name').value.trim(), document.getElementById('last-name').value.trim()].join(' ') });
      await sendEmailVerification(user, verificationSettings);
      window.location.replace('verification.html');
    } catch (error) {
      if (created) window.location.replace('verification.html?send=failed');
      else registrationError(error);
    } finally {
      registering = false;
      registrationForm.querySelector('button').disabled = false;
    }
  });
  if (registrationForm) document.getElementById('confirm-password').addEventListener('input', (event) => event.target.setCustomValidity(''));
  if (checkVerification) checkVerification.addEventListener('click', async () => {
    checkVerification.disabled = true;
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) window.location.replace('account.html');
      else message('Your email is not verified yet. Open the link in your email, then try again.');
    } catch { message('Verification could not be checked. Please try again.'); }
    finally { checkVerification.disabled = false; }
  });
  if (resendVerification) resendVerification.addEventListener('click', async () => {
    resendVerification.disabled = true;
    try {
      await sendEmailVerification(auth.currentUser, verificationSettings);
      message('Verification email sent. Check your inbox and spam folder.');
    } catch { message('The verification email could not be sent. Wait a moment and try again.'); }
    finally { resendVerification.disabled = false; }
  });
  let pendingMessage = null;
  if (resetForm) resetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!resetForm.reportValidity()) return;
    const button = resetForm.querySelector('button');
    button.disabled = true;
    try {
      await sendPasswordResetEmail(auth, document.getElementById('email').value.trim());
      message('If an account uses this email, a reset link will arrive shortly. Check your inbox and spam folder.');
    } catch (error) {
      message(error.code === 'auth/too-many-requests' ? 'Please wait before requesting another link.' : error.code === 'auth/network-request-failed' ? 'Check your internet connection and try again.' : 'If an account uses this email, a reset link will arrive shortly. Check your inbox and spam folder.');
    } finally { button.disabled = false; }
  });
  if (loginForm) loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const button = loginForm.querySelector('button');
    button.disabled = true;
    message('Signing in…');
    try {
      await setPersistence(auth, document.getElementById('remember-me').checked ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, document.getElementById('email').value.trim(), document.getElementById('password').value);
    } catch {
      showLoginError();
      button.disabled = false;
    }
  });
  onAuthStateChanged(auth, async (user) => {
    if (registering) return;
    if (!user) {
      if (resetForm) {
        document.getElementById('email').disabled = false;
        resetForm.querySelector('button').disabled = false;
        message('Enter your email to request a password reset link.');
        return;
      }
      if (registrationForm) {
        registrationForm.querySelectorAll('input, button').forEach((element) => { element.disabled = false; });
        message('Create an account to receive an email verification link.');
        return;
      }
      if (checkVerification) { window.location.replace('index.html'); return; }
      if (accountEmail) window.location.replace('index.html');
      else {
        document.getElementById('email').disabled = false;
        document.getElementById('password').disabled = false;
        document.getElementById('remember-me').disabled = false;
        loginForm.querySelector('button').disabled = false;
        message(pendingMessage || 'Sign in with an existing verified account.');
        pendingMessage = null;
      }
      return;
    }
    try {
      await reload(user);
      if (!user.emailVerified) {
        if (checkVerification) {
          checkVerification.disabled = false;
          resendVerification.disabled = false;
          message(new URLSearchParams(window.location.search).get('send') === 'failed'
            ? 'Your account was created, but the verification email could not be sent. Use Resend verification email to try again.'
            : 'Check your email for a verification link. You can request another email below.');
        } else window.location.replace('verification.html');
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
      } else if (resetForm) {
        message('You are signed in. Return to your account.');
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
  message('Account services are temporarily unavailable. Please try again later.');
  if (accountEmail) accountEmail.textContent = 'Account unavailable';
}
