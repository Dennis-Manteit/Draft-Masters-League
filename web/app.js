import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence,
  browserSessionPersistence, signInWithEmailAndPassword, signInWithPopup,
  GoogleAuthProvider, sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const form = document.querySelector("#login-form");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const remember = document.querySelector("#remember");
const status = document.querySelector("#status");
const google = document.querySelector("#google");
const reset = document.querySelector("#reset");
const submit = document.querySelector("#submit");
const signedIn = document.querySelector("#signed-in");
const accountEmail = document.querySelector("#account-email");
const signOutButton = document.querySelector("#sign-out");

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle("error", error);
  status.hidden = !text;
}

function busy(value) {
  for (const button of [submit, google, reset, signOutButton]) button.disabled = value;
}

const ready = !Object.values(firebaseConfig).some(value => String(value).startsWith("REPLACE_WITH_"));
if (!ready) {
  busy(true);
  message("DML sign-in is being set up. Please try again later.", true);
} else {
  const auth = getAuth(initializeApp(firebaseConfig));
  const provider = new GoogleAuthProvider();
  const persistence = () => setPersistence(auth, remember.checked ? browserLocalPersistence : browserSessionPersistence);

  onAuthStateChanged(auth, user => {
    form.hidden = !!user;
    google.hidden = !!user;
    document.querySelector(".divider").hidden = !!user;
    signedIn.hidden = !user;
    accountEmail.textContent = user?.email || "your account";
    if (user) message("");
  }, () => message("Could not check your sign-in. Please reload and try again.", true));

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    busy(true); message("");
    try {
      await persistence();
      await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
      password.value = "";
    } catch (error) {
      message(error.code === "auth/unauthorized-domain" ? "This website address must be approved in Firebase Authentication." : "Sign-in failed. Check your details and try again.", true);
    } finally { busy(false); }
  });

  google.addEventListener("click", async () => {
    busy(true); message("");
    try {
      await persistence();
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user") message("Google sign-in could not finish. Please try again.", true);
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

  signOutButton.addEventListener("click", async () => {
    busy(true);
    try { await signOut(auth); password.value = ""; message("You have signed out."); }
    catch { message("Could not sign out. Please try again.", true); }
    finally { busy(false); }
  });
}
