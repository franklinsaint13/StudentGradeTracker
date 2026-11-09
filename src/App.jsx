import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import Login from "./Login.jsx";
import ResetPassword from "./ResetPassword.jsx";
import Students from "./Students.jsx";

// Shows the login screen, the new-password screen or the tracker.
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [recovering, setRecovering] = useState(false); // arrived from a reset-password email

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined)
    return (
      <main className="splash" role="status" aria-live="polite">
        <span className="spinner big" aria-hidden="true" />
        <p>Loading…</p>
      </main>
    );
  if (session && recovering) return <ResetPassword onDone={() => setRecovering(false)} />;
  return session ? <Students email={session.user.email} /> : <Login />;
}
