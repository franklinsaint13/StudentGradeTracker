import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { navigate } from "./router.js";
import Login from "./Login.jsx";
import ResetPassword from "./ResetPassword.jsx";
import Students from "./Students.jsx";

// Moves to another page as soon as it is shown.
function Redirect({ to }) {
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to]);
  return null;
}

// Pages:  /login           sign in, sign up, Google, forgot password
//         /reset-password  choose a new password (from the email link)
//         /dashboard       the grade tracker (signed-in users only)
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [path, setPath] = useState(window.location.pathname);
  // True when the person arrived from a "reset password" email link.
  const [recovering, setRecovering] = useState(() =>
    window.location.hash.includes("type=recovery")
  );

  useEffect(() => {
    const onNavigate = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onNavigate);

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") setRecovering(false);
      setSession(newSession);
    });

    return () => {
      window.removeEventListener("popstate", onNavigate);
      sub.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined)
    return (
      <main className="splash" role="status" aria-live="polite">
        <span className="spinner big" aria-hidden="true" />
        <p>Loading…</p>
      </main>
    );

  // Came from a reset-password email: choose a new password first.
  if (session && recovering) {
    if (path !== "/reset-password") return <Redirect to="/reset-password" />;
    return (
      <ResetPassword
        onDone={() => {
          setRecovering(false);
          navigate("/dashboard", { replace: true });
        }}
      />
    );
  }

  // Not signed in: the only page is /login.
  if (!session) return path === "/login" ? <Login /> : <Redirect to="/login" />;

  // Signed in: the only page is /dashboard.
  return path === "/dashboard" ? (
    <Students email={session.user.email} />
  ) : (
    <Redirect to="/dashboard" />
  );
}
