import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import PasswordInput from "./PasswordInput.jsx";
import { gmailProblem } from "./emailRules.js";
import { navigate } from "./router.js";

const GMAIL_ONLY =
  "That account can't be used. Only real Gmail accounts that haven't been used before are allowed.";

// Turns Supabase's technical messages into something a person can act on.
function friendly(text) {
  if (/database error|not allowed|gmail/i.test(text)) return GMAIL_ONLY;
  if (/not confirmed/i.test(text))
    return "Please confirm your email first. Open the link we sent to your Gmail, then sign in.";
  return text;
}

const FEATURES = [
  {
    icon: "👤",
    title: "Tidy student records",
    text: "Add each student by last name, first name, middle initial and suffix. Names are saved neatly, like “Baylon, Daniel Vincent D.”",
  },
  {
    icon: "📚",
    title: "Four core subjects",
    text: "Math, English, Science and Arts are ready for every student, so there is nothing to set up.",
  },
  {
    icon: "🧮",
    title: "Automatic averages",
    text: "Type the grades and each student's average is worked out for you, instantly.",
  },
  {
    icon: "✅",
    title: "Accurate grades",
    text: "Grades are numbers from 0 to 100 with two decimals. Letters and mistakes are caught right away with a clear message.",
  },
  {
    icon: "🔎",
    title: "Find anyone fast",
    text: "Search by name, see who is fully graded, and spot the grades still to enter.",
  },
  {
    icon: "🔒",
    title: "Private and secure",
    text: "Every account sees only its own students. Sign in with a verified Gmail or Google, no fake accounts.",
  },
];

// Made-up students, only to show what the dashboard looks like.
const SAMPLE = [
  { name: "Santos, Maria L.", grades: [95.5, 92, 89.75, 98] },
  { name: "Reyes, Miguel A.", grades: [88, 84.5, 90.25, 79] },
  { name: "Dela Cruz, Ana B.", grades: [91, 87.25, 93.5, 96] },
];
const SUBJECT_NAMES = ["Math", "English", "Science", "Arts"];
const averageOf = (grades) => (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2);

const STEPS = [
  { title: "Sign in", text: "Use Google, or your Gmail with a password." },
  { title: "Add students", text: "Enter each student's name once." },
  { title: "Enter grades", text: "Averages appear automatically." },
];

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(""); // "retype password" box (sign up only)
  const [message, setMessage] = useState(null); // { type: "error" | "ok", text }
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false); // is the sign-in pop-up showing?

  // Opens the pop-up as "signin" or "signup".
  function openAuth(nextMode) {
    setMode(nextMode);
    setMessage(null);
    setConfirm("");
    setOpen(true);
  }

  // Close with the Escape key, and stop the page behind from scrolling while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  // If Google (or an email link) sent us back with an error in the address, show it.
  useEffect(() => {
    const found = [window.location.search, window.location.hash.replace(/^#/, "")]
      .map((part) => new URLSearchParams(part).get("error_description"))
      .find(Boolean);
    if (found) {
      setMessage({ type: "error", text: friendly(found) });
      setOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    const address = email.trim().toLowerCase();

    // Sign up and reset only accept real-looking Gmail addresses.
    if (mode !== "signin") {
      const problem = gmailProblem(address);
      if (problem) return setMessage({ type: "error", text: problem });
    }

    // Sign up: the password has to be typed twice, exactly the same.
    if (mode === "signup" && password !== confirm) {
      return setMessage({ type: "error", text: "The two passwords don't match. Please retype it." });
    }

    setBusy(true);
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setMessage({ type: "error", text: friendly(error.message) });
      else
        setMessage({
          type: "ok",
          text: "If that Gmail has an account, a reset link is on its way. Check your inbox (and spam).",
        });
    } else if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: address, password });
      if (error) setMessage({ type: "error", text: friendly(error.message) });
      // On success, App.jsx notices the session and opens the dashboard.
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: address,
        password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (error) {
        setMessage({ type: "error", text: friendly(error.message) });
      } else if (data.session) {
        // A session right away means Supabase is NOT asking people to confirm their email.
        await supabase.auth.signOut();
        setMessage({
          type: "error",
          text: "Email confirmation is switched off, so this sign-up was not accepted. Turn on \"Confirm email\" in Supabase (Authentication → Sign In / Providers → Email).",
        });
      } else {
        setMessage({
          type: "ok",
          text: "Almost done! We sent a confirmation link to your Gmail. Open it, then sign in.",
        });
      }
    }
    setBusy(false);
  }

  async function handleGoogle() {
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: { prompt: "select_account" }, // let the person choose which Google account
      },
    });
    if (error) setMessage({ type: "error", text: friendly(error.message) });
  }

  const linkStyle = { color: "var(--primary)", fontSize: "inherit", textAlign: "left" };

  return (
    <div className="landing">
      {/* ---------- top bar ---------- */}
      <nav className="topbar">
        <span className="brand">🎓 Grade Tracker</span>
        <div className="topbar-actions">
          <button type="button" className="secondary" onClick={() => openAuth("signin")}>
            Log in
          </button>
          <button type="button" onClick={() => openAuth("signup")}>
            Sign up
          </button>
        </div>
      </nav>

      {/* ---------- introduction + a look at the dashboard ---------- */}
      <section className="intro">
        <div className="intro-text">
          <span className="pill">For teachers and students</span>
          <h1>
            Every grade and average, <em>in one place.</em>
          </h1>
          <p className="lead">
            Student Grade Tracker is a simple web app for recording your students' grades in Math,
            English, Science and Arts. Enter the numbers and it works out each student's average for
            you, so you can spend less time on paperwork and more time teaching.
          </p>
          <div className="cta">
            <button type="button" onClick={() => openAuth("signup")}>
              Get started
            </button>
          </div>
          <ul className="ticks">
            <li>Free to use on any phone or computer</li>
            <li>Your data is saved online and private to you</li>
            <li>No spreadsheets, no formulas</li>
          </ul>
        </div>

        <div className="intro-preview" role="img" aria-label="Example of the grades dashboard">
          <div className="preview-top">
            <strong>Your class at a glance</strong>
            <span className="preview-tag">Sample data</span>
          </div>
          <div className="preview-stats">
            <div>
              <b>{SAMPLE.length}</b>
              <span>Students</span>
            </div>
            <div>
              <b>{SAMPLE.length}</b>
              <span>Fully graded</span>
            </div>
            <div>
              <b>0</b>
              <span>Grades to enter</span>
            </div>
          </div>
          <div className="preview-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Student</th>
                  {SUBJECT_NAMES.map((n) => (
                    <th key={n}>{n}</th>
                  ))}
                  <th>Average</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE.map((st) => (
                  <tr key={st.name}>
                    <td>{st.name}</td>
                    {st.grades.map((g, i) => (
                      <td key={i}>
                        <span className="demo-cell">{g.toFixed(2)}</span>
                      </td>
                    ))}
                    <td>
                      <strong>{averageOf(st.grades)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="preview-note">Type a grade and each average updates by itself.</p>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section className="section">
        <h2 className="section-heading">What you can do</h2>
        <p className="section-sub">Everything you need to keep track of your class, nothing you don't.</p>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <article className="feature" key={f.title}>
              <span className="feature-icon" aria-hidden="true">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="section">
        <h2 className="section-heading">How it works</h2>
        <ol className="steps">
          {STEPS.map((st, i) => (
            <li key={st.title}>
              <span className="step-num">{i + 1}</span>
              <h3>{st.title}</h3>
              <p>{st.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="site-footer">
        Student Grade Tracker · Built with React, Node.js and Supabase ·{" "}
        <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate("/privacy"); }}>Privacy</a>
        {" · "}
        <a href="/terms" onClick={(e) => { e.preventDefault(); navigate("/terms"); }}>Terms</a>
      </footer>

      {/* ---------- sign-in pop-up ---------- */}
      {open && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button
              type="button"
              className="modal-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            {message && <div className={`banner ${message.type}`}>{message.text}</div>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2 id="auth-title" className="auth-title">
              {mode === "signin"
                ? "Welcome back"
                : mode === "signup"
                ? "Create your account"
                : "Reset your password"}
            </h2>

            {mode !== "forgot" && (
              <>
                <button type="button" className="secondary google" onClick={handleGoogle}>
                  Continue with Google
                </button>
                <div className="divider">
                  <span>or use your Gmail and a password</span>
                </div>
              </>
            )}

            <div className="row" style={{ flexDirection: "column" }}>
              <input
                type="email"
                autoFocus
                placeholder="Gmail address (name@gmail.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              {mode !== "forgot" && (
                <PasswordInput
                  placeholder={mode === "signup" ? "Password (min 8 characters)" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={mode === "signup" ? 8 : undefined}
                  required
                />
              )}

              {mode === "signup" && (
                <>
                  <PasswordInput
                    placeholder="Retype password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  {confirm && (
                    <p
                      className={`match-hint ${password === confirm ? "ok" : "bad"}`}
                      role="status"
                    >
                      {password === confirm ? "✓ Passwords match" : "Passwords don't match yet"}
                    </p>
                  )}
                </>
              )}

              <button type="submit" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                  ? "Sign up"
                  : "Send reset link"}
              </button>

              {mode === "signin" && (
                <button
                  type="button"
                  className="link"
                  style={linkStyle}
                  onClick={() => {
                    setMode("forgot");
                    setMessage(null);
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>

            <p className="empty">
              {mode === "signin"
                ? "No account yet? "
                : mode === "signup"
                ? "Already have an account? "
                : "Remembered it? "}
              <button
                type="button"
                className="link"
                style={linkStyle}
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setMessage(null);
                  setConfirm("");
                }}
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
            {mode === "signup" && (
              <p className="empty" style={{ marginTop: 6 }}>
                Only real Gmail accounts are accepted. You'll get a confirmation email to verify it.
              </p>
            )}
          </form>
          </div>
        </div>
      )}
    </div>
  );
}
