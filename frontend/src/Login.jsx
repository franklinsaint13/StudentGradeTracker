import { useState } from "react";
import { supabase } from "./supabase.js";

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null); // { type: "error" | "ok", text }
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ type: "error", text: error.message });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else if (!data.session) {
        // Email confirmation is turned on in Supabase.
        setMessage({
          type: "ok",
          text: "Account created. Check your email to confirm, then sign in.",
        });
      }
      // If a session came back, App.jsx notices it and shows the tracker.
    }
    setBusy(false);
  }

  return (
    <main className="container">
      <h1>Student Grade Tracker</h1>

      {message && <div className={`banner ${message.type}`}>{message.text}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0 }}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </h2>
        <div className="row" style={{ flexDirection: "column" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={6}
            required
          />
          <button type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </div>
        <p className="empty">
          {mode === "signin" ? "No account yet? " : "Already have an account? "}
          <button
            type="button"
            className="link"
            style={{ color: "var(--primary)", fontSize: "inherit" }}
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMessage(null);
            }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </form>
    </main>
  );
}
