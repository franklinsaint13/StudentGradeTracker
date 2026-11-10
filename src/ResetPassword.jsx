import { useState } from "react";
import { supabase } from "./supabase.js";
import PasswordInput from "./PasswordInput.jsx";

// Shown after someone clicks the reset link in their email.
export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(null); // { type: "error" | "ok", text }
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (password !== confirm) {
      setMessage({ type: "error", text: "The two passwords don't match." });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMessage({ type: "error", text: error.message });
    else onDone(); // password changed; carry on into the tracker
  }

  return (
    <main className="container">
      <h1>Student Grade Tracker</h1>
      {message && <div className={`banner ${message.type}`}>{message.text}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0 }}>Choose a new password</h2>
        <div className="row" style={{ flexDirection: "column" }}>
          <PasswordInput
            placeholder="New password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <PasswordInput
            placeholder="Type it again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button type="submit" disabled={busy}>
            {busy ? "Please wait…" : "Save new password"}
          </button>
        </div>
      </form>
    </main>
  );
}
