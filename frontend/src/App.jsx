import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import Login from "./Login.jsx";
import Students from "./Students.jsx";

// Shows the login screen or the tracker depending on whether someone is signed in.
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) =>
      setSession(newSession)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  return session ? <Students email={session.user.email} /> : <Login />;
}
