import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('../auth-client.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
async function setup(page, options = {}) {
  const elements = {};
  const ids = ['auth-status', ...(page === 'registration' ? ['registration-form', 'first-name', 'last-name', 'email', 'password', 'confirm-password', 'legal-consent'] : page === 'verification' ? ['check-verification', 'resend-verification'] : ['login-form', 'email', 'password'])];
  for (const id of ids) elements[id] = { disabled: true, value: '', listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; }, setCustomValidity(text) { this.invalid = text; } };
  const button = { disabled: true };
  const form = elements['registration-form'] || elements['login-form'];
  if (form) {
    form.querySelector = () => button;
    form.querySelectorAll = () => [...Object.values(elements), button];
    form.reportValidity = () => !elements['confirm-password']?.invalid;
  }
  const calls = [], redirects = [];
  const auth = { currentUser: options.user || null };
  let state;
  const context = {
    document: { getElementById: id => elements[id] || null },
    window: { location: { origin: 'https://draft-masters-league.web.app', search: options.search || '', replace: url => redirects.push(url) } },
    URL, URLSearchParams,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    initializeApp: () => ({}), initializeAuth: () => auth, browserSessionPersistence: {},
    onAuthStateChanged: (_, fn) => { state = fn; },
    createUserWithEmailAndPassword: async (_, email, password) => {
      calls.push(['create', email, password]);
      if (options.createError) throw { code: options.createError };
      auth.currentUser = { email, emailVerified: false };
      await state(auth.currentUser);
      return { user: auth.currentUser };
    },
    updateProfile: async (_, profile) => calls.push(['profile', profile]),
    sendEmailVerification: async (_, settings) => {
      calls.push(['send', settings]);
      if (options.sendError) throw new Error('delivery failed');
    },
    reload: async () => {}, getIdTokenResult: async () => ({ claims: {} }),
    signInWithEmailAndPassword: async () => {}, signOut: async () => { auth.currentUser = null; await state(null); }
  };
  await vm.runInNewContext(`(async () => { ${source} })()`, context);
  await state(auth.currentUser);
  if (page === 'registration') {
    elements.email.value = ' member@example.com ';
    elements.password.value = elements['confirm-password'].value = 'long-password';
    elements['first-name'].value = 'Test'; elements['last-name'].value = 'Member';
  }
  return { elements, button, calls, redirects, auth, state, submit: () => form.listeners.submit({ preventDefault() {} }) };
}
test('registration creates a profile, sends a link and retains the session for verification', async () => {
  const s = await setup('registration');
  assert.equal(s.button.disabled, false);
  await s.submit();
  assert.deepEqual(s.calls.map(x => x[0]), ['create', 'profile', 'send']);
  assert.equal(s.calls[0][1], 'member@example.com');
  assert.equal(s.calls[1][1].displayName, 'Test Member');
  assert.equal(s.calls[2][1].url, 'https://draft-masters-league.web.app/verification.html');
  assert.deepEqual(s.redirects, ['verification.html']);
});
test('mismatched passwords prevent account creation', async () => {
  const s = await setup('registration'); s.elements['confirm-password'].value = 'different';
  await s.submit(); assert.equal(s.calls.length, 0);
});
test('duplicate emails show a recovery message and allow retry', async () => {
  const s = await setup('registration', { createError: 'auth/email-already-in-use' });
  await s.submit(); assert.match(s.elements['auth-status'].textContent, /Sign in to verify/);
  assert.equal(s.button.disabled, false); assert.equal(s.redirects.length, 0);
});
test('email delivery failure routes to resend instead of recreating the account', async () => {
  const s = await setup('registration', { sendError: true }); await s.submit();
  assert.deepEqual(s.redirects, ['verification.html?send=failed']);
});
test('verification can resend, blocks unverified access, and continues after verification', async () => {
  const s = await setup('verification', { user: { emailVerified: false } });
  assert.equal(s.elements['resend-verification'].disabled, false);
  await s.elements['resend-verification'].listeners.click(); assert.equal(s.calls[0][0], 'send');
  await s.elements['check-verification'].listeners.click(); assert.equal(s.redirects.length, 0);
  s.auth.currentUser.emailVerified = true;
  await s.elements['check-verification'].listeners.click(); assert.deepEqual(s.redirects, ['account.html']);
});
test('signing in with an unverified account routes to verification', async () => {
  const s = await setup('login', { user: { emailVerified: false } });
  assert.deepEqual(s.redirects, ['verification.html']); assert.ok(s.auth.currentUser);
});
test('verification without a session routes to sign in', async () => {
  const s = await setup('verification'); assert.deepEqual(s.redirects, ['index.html']);
});
