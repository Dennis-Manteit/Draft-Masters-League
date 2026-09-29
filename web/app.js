import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence,
  browserSessionPersistence, signInWithEmailAndPassword, signInWithPopup,
  GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail, reload, signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const form = document.querySelector("#login-form");
const signup = document.querySelector("#signup-form");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const signupEmail = document.querySelector("#signup-email");
const signupPassword = document.querySelector("#signup-password");
const signupConfirm = document.querySelector("#signup-confirm");
const remember = document.querySelector("#remember");
const status = document.querySelector("#status");
const google = document.querySelector("#google");
const reset = document.querySelector("#reset");
const submit = document.querySelector("#submit");
const signupSubmit = document.querySelector("#signup-submit");
const switchMode = document.querySelector("#switch-mode");
const divider = document.querySelector(".divider");
const signedIn = document.querySelector("#signed-in");
const verifyEmail = document.querySelector("#verify-email");
const accountEmail = document.querySelector("#account-email");
const signOutButton = document.querySelector("#sign-out");
const verifySignOut = document.querySelector("#verify-sign-out");
const checkVerification = document.querySelector("#check-verification");
const heading = document.querySelector("#login-title");
let mode = "login";
const goalAnimation = document.querySelector("#goal-animation");
let goalTimer;

function playGoal(result) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  clearTimeout(goalTimer);
  goalAnimation.hidden = true;
  void goalAnimation.offsetWidth;
  goalAnimation.dataset.result = result;
  goalAnimation.hidden = false;
  goalTimer = setTimeout(() => { goalAnimation.hidden = true; }, 1500);
}

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle("error", error);
  status.hidden = !text;
}

function busy(value) {
  for (const button of [submit, signupSubmit, google, reset, switchMode, signOutButton, verifySignOut, checkVerification]) {
    button.disabled = value;
  }
}

function render(user) {
  const verified = !!user?.emailVerified;
  form.hidden = !!user || mode !== "login";
  signup.hidden = !!user || mode !== "signup";
  google.hidden = !!user || mode !== "login";
  divider.hidden = !!user || mode !== "login";
  switchMode.hidden = !!user;
  signedIn.hidden = !verified;
  verifyEmail.hidden = !user || verified;
  heading.textContent = user ? (verified ? "Welcome to DML" : "Verify your email") : (mode === "signup" ? "Create DML account" : "Sign in to DML");
  accountEmail.textContent = user?.email || "your account";
}

const ready = !Object.values(firebaseConfig).some(value => String(value).startsWith("REPLACE_WITH_"));
if (!ready) {
  busy(true);
  message("DML sign-in is being set up. Please try again later.", true);
} else {
  const auth = getAuth(initializeApp(firebaseConfig));
  const provider = new GoogleAuthProvider();
  const persistence = () => setPersistence(auth, remember.checked ? browserLocalPersistence : browserSessionPersistence);

  onAuthStateChanged(auth, user => render(user), () => message("Could not check your sign-in. Please reload and try again.", true));

  switchMode.addEventListener("click", () => {
    mode = mode === "login" ? "signup" : "login";
    switchMode.textContent = mode === "signup" ? "Already have an account? Sign in" : "Create a DML account";
    message("");
    render(auth.currentUser);
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    busy(true); message("");
    try {
      await persistence();
      await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
      password.value = "";
      playGoal("success");
    } catch (error) {
      playGoal("failure");
      message(error.code === "auth/unauthorized-domain" ? "This website address must be approved in Firebase Authentication." : "Sign-in failed. Check your details and try again.", true);
    } finally { busy(false); }
  });

  signup.addEventListener("submit", async event => {
    event.preventDefault();
    if (!signup.reportValidity()) return;
    if (signupPassword.value !== signupConfirm.value) {
      message("The passwords do not match.", true);
      signupConfirm.focus();
      return;
    }
    busy(true); message("");
    try {
      await persistence();
      const credential = await createUserWithEmailAndPassword(auth, signupEmail.value.trim(), signupPassword.value);
      signupPassword.value = "";
      signupConfirm.value = "";
      try {
        await sendEmailVerification(credential.user);
        message("Verification email sent. Please check your inbox.");
      } catch {
        message("Account created, but the verification email could not be sent. Please try again later.", true);
      }
    } catch (error) {
      const known = {
        "auth/email-already-in-use": "An account with this email already exists. Please sign in or reset your password.",
        "auth/weak-password": "Choose a stronger password.",
        "auth/invalid-email": "Enter a valid email address."
      };
      message(known[error.code] || "Could not create your account. Please try again.", true);
    } finally { busy(false); }
  });

  google.addEventListener("click", async () => {
    busy(true); message("");
    try {
      await persistence();
      await signInWithPopup(auth, provider);
      playGoal("success");
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user") {
        playGoal("failure");
        message("Google sign-in could not finish. Please try again.", true);
      }
    } finally { busy(false); }
  });

  reset.addEventListener("click", async () => {
    if (!email.value.trim() || !email.checkValidity()) {
      message("Enter your email address above, then tap Forgot password.", true);
      email.focus(); return;
    }
    busy(true); message("");
    try {
      await sendPasswordResetEmail(auth, email.value.trim());
      message("If this address has a DML account, check your inbox for a reset email.");
    } catch {
      message("Could not send a reset email right now. Please try again later.", true);
    } finally { busy(false); }
  });

  checkVerification.addEventListener("click", async () => {
    if (!auth.currentUser) return;
    busy(true); message("");
    try {
      await reload(auth.currentUser);
      render(auth.currentUser);
      if (!auth.currentUser.emailVerified) message("Email not verified yet. Check your inbox and try again.");
    } catch { message("Could not check verification right now. Please try again.", true); }
    finally { busy(false); }
  });

  async function leave() {
    busy(true);
    try { await signOut(auth); password.value = ""; mode = "login"; switchMode.textContent = "Create a DML account"; render(null); message("You have signed out."); }
    catch { message("Could not sign out. Please try again.", true); }
    finally { busy(false); }
  }
  signOutButton.addEventListener("click", leave);
  verifySignOut.addEventListener("click", leave);
}
