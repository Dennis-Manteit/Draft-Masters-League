export function message(text) {
  const status = document.getElementById('auth-status');
  if (status) status.textContent = text;
}
export function showLoginError() {
  message('Sign in could not be completed. Check your details or try again later.');
}
