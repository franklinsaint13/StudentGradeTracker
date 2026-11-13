// "Log in with Google" must only work for people who SIGNED UP first.
// Supabase creates an account the first time any Google account is used, so before
// we send the person to Google we remember what they meant to do (log in or sign up).
// When they come back, a brand-new account that was only meant to log in is removed
// again (supabase/migration_google_login_only.sql) and they are told to sign up first.
import { supabase } from "./supabase.js";

const INTENT_KEY = "gt_auth_intent";
const ERROR_KEY = "gt_login_error";
const MAX_AGE_MS = 10 * 60 * 1000; // ignore a leftover note older than 10 minutes

export const NOT_SIGNED_UP =
  "No account was found for that Google account. Please sign up first, then you can log in.";

// Called just before leaving for Google. mode = "signin" | "signup"
export function rememberIntent(mode) {
  try {
    localStorage.setItem(INTENT_KEY, JSON.stringify({ mode, t: Date.now() }));
  } catch {
    /* storage blocked: nothing to remember */
  }
}

// An error that was saved for the login page to show (and forget).
export function takeLoginError() {
  try {
    const text = sessionStorage.getItem(ERROR_KEY);
    sessionStorage.removeItem(ERROR_KEY);
    return text;
  } catch {
    return null;
  }
}

function readIntent() {
  try {
    const raw = localStorage.getItem(INTENT_KEY);
    localStorage.removeItem(INTENT_KEY);
    const intent = raw ? JSON.parse(raw) : null;
    return intent && Date.now() - intent.t < MAX_AGE_MS ? intent : null;
  } catch {
    return null;
  }
}

let checked = null; // { token, promise }: make sure each session is checked only once

// Returns true if this session belonged to a brand-new Google account that only tried
// to LOG IN. That account is deleted and the person is signed out.
export function rejectUnregistered(session) {
  if (checked?.token === session.access_token) return checked.promise;

  const promise = (async () => {
    const intent = readIntent();
    if (!intent || intent.mode !== "signin") return false; // signing up, or not from Google

    const { data, error } = await supabase.rpc("discard_new_google_account");
    if (error || data !== true) return false; // an existing account: let them in

    try {
      sessionStorage.setItem(ERROR_KEY, NOT_SIGNED_UP);
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut();
    return true;
  })();

  checked = { token: session.access_token, promise };
  return promise;
}
