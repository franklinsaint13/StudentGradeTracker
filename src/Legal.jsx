import { navigate } from "./router.js";

// >>> EDIT THIS: the email address people can write to about their data.
const CONTACT_EMAIL = "yaobaylon132226@gmail.com";
const UPDATED = "November 12, 2026";

function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: {UPDATED}</p>

      <p>
        Student Grade Tracker ("the app") is a small web app that lets you record students' grades
        and see their averages. This page explains what information the app handles and why.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account.</strong> Your Gmail address. If you sign up with a password, the
          password is stored only as a secure hash by our sign-in provider, never as plain text. If
          you use "Continue with Google", Google shares your email address with the app. We use
          nothing else from your Google account.
        </li>
        <li>
          <strong>What you enter.</strong> The student names and grades that you type into the app.
        </li>
        <li>
          <strong>Basic technical data.</strong> Our hosting providers may keep standard server logs,
          such as IP address and browser type, to keep the service running and secure.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To sign you in and keep your account secure.</li>
        <li>To save your students and grades and work out each student's average.</li>
        <li>To send you account emails, such as the confirmation link and password reset link.</li>
      </ul>
      <p>We do not sell your information, and we do not show ads.</p>

      <h2>Who can see your records</h2>
      <p>
        Your students and grades are visible only when you are signed in to your own account. Other
        users of the app cannot see them.
      </p>

      <h2>Where it is stored</h2>
      <p>
        Your data is stored with Supabase (database and sign-in) and the app is hosted on Vercel.
        If you choose Google sign-in, Google handles that part of the sign-in. These providers
        process data on our behalf under their own privacy policies.
      </p>

      <h2>Student information</h2>
      <p>
        Only enter information you are allowed to keep, and keep it to what you need: names and
        grades. You are responsible for having permission from your school or institution to record
        this information.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can delete any student, and their grades, from the dashboard at any time.</li>
        <li>
          You can ask us to delete your account and all of its data by emailing{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>If this policy changes, the date at the top of this page will be updated.</p>

      <h2>Contact</h2>
      <p>
        Questions about your data? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: {UPDATED}</p>

      <p>By creating an account or using Student Grade Tracker ("the app"), you agree to these terms.</p>

      <h2>Using the app</h2>
      <ul>
        <li>The app is for recording students' grades and viewing their averages.</li>
        <li>You need a real Gmail account to sign up. Keep your sign-in details to yourself.</li>
        <li>You are responsible for everything that happens under your account.</li>
      </ul>

      <h2>What you must not do</h2>
      <ul>
        <li>Use the app to break the law or to harm others.</li>
        <li>Enter information you are not allowed to keep or share.</li>
        <li>Try to access other people's accounts or data, or disrupt the service.</li>
        <li>Create accounts with addresses that do not belong to you.</li>
      </ul>

      <h2>Your data</h2>
      <p>
        The students and grades you enter remain yours. We store them only to provide the app. See
        the Privacy Policy for details.
      </p>

      <h2>Grades are a convenience</h2>
      <p>
        The app works out averages and grade categories for you, but it is a helper tool. Please
        check important results against your official records before relying on them.
      </p>

      <h2>No warranty</h2>
      <p>
        The app is provided "as is", without promises that it will always be available or free of
        errors. To the fullest extent allowed by law, we are not liable for losses that result from
        using it.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using the app at any time. We may suspend accounts that break these terms.
        To delete your account, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top of this page shows the latest version.</p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}

// Public pages (no sign-in needed): /privacy and /terms
export default function Legal({ page }) {
  const go = (to) => (e) => {
    e.preventDefault();
    navigate(to);
  };

  return (
    <main className="legal">
      <nav className="legal-nav">
        <a href="/login" onClick={go("/login")} className="legal-back">
          ← Grade Tracker
        </a>
        <span className="legal-links">
          <a href="/privacy" onClick={go("/privacy")}>Privacy</a>
          <a href="/terms" onClick={go("/terms")}>Terms</a>
        </span>
      </nav>
      <article className="legal-card">{page === "terms" ? <Terms /> : <Privacy />}</article>
    </main>
  );
}
