import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { getOverview, addStudent, deleteStudent, saveGrade } from "./api.js";
import { gradeProblem } from "./gradeInput.js";
import { namePartProblem, middleInitialProblem, previewName, SUFFIXES } from "./nameInput.js";

// ---------- dashboard helpers ----------

const QUOTES = [
  { text: "Education is the most powerful weapon which you can use to change the world.", by: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that nobody can take it away from you.", by: "B. B. King" },
  { text: "It does not matter how slowly you go as long as you do not stop.", by: "Confucius" },
  { text: "The expert in anything was once a beginner.", by: "Helen Hayes" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", by: "Robert Collier" },
  { text: "Teaching is the one profession that creates all other professions.", by: "Unknown" },
  { text: "A good teacher can inspire hope, ignite the imagination, and instill a love of learning.", by: "Brad Henry" },
  { text: "Every student can learn, just not on the same day, or in the same way.", by: "George Evans" },
];

// A random quote, never the same one twice in a row.
function randomQuote(previous) {
  const others = QUOTES.filter((q) => q !== previous);
  return others[Math.floor(Math.random() * others.length)];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// "yaobaylon132226@gmail.com" -> "Yaobaylon"
function firstNameFromEmail(email = "") {
  const name = email.split("@")[0].replace(/[^a-zA-Z]+/g, " ").trim().split(" ")[0];
  return name ? name[0].toUpperCase() + name.slice(1).toLowerCase() : "there";
}

const EMPTY_PARTS = { last_name: "", first_name: "", middle_initial: "", suffix: "" };

const show = (n) => (n === null || n === undefined ? "–" : Number(n).toFixed(2));

// What a grade box shows for a saved value: 2 decimals, or empty.
const asText = (v) => (v === null || v === undefined ? "" : Number(v).toFixed(2));

// One editable grade box. Saves when you click away or press Enter.
// Only numbers are accepted: anything else is refused and an error is shown.
function GradeCell({ value, onSave, onInvalid }) {
  const [text, setText] = useState(asText(value));
  const [invalid, setInvalid] = useState(false);

  // Follow the saved value whenever it changes (after a reload).
  useEffect(() => {
    setText(asText(value));
  }, [value]);

  function handleChange(e) {
    const next = e.target.value;
    const problem = gradeProblem(next);
    if (problem) {
      // Refuse the keystroke or paste, keep what was there, and say why.
      setInvalid(true);
      onInvalid(problem);
      return;
    }
    setInvalid(false);
    setText(next);
  }

  async function commit() {
    setInvalid(false);
    if (text !== "" && !Number.isFinite(Number(text))) {
      onInvalid("That isn't a valid grade. Enter a number from 0 to 100.");
      setText(asText(value));
      return;
    }
    // Nothing to save if the number did not change.
    const unchanged = text === "" ? value == null : value != null && Number(text) === Number(value);
    if (unchanged) {
      setText(asText(value)); // tidy up, e.g. "98." -> "98.00"
      return;
    }
    const ok = await onSave(text);
    if (!ok) setText(asText(value)); // put the old value back if saving failed
  }

  return (
    <input
      className={`cell${invalid ? " invalid" : ""}`}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-invalid={invalid}
      value={text}
      placeholder="–"
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

// A labelled text box that refuses bad characters and says why.
function PartInput({ label, value, onValue, check, onInvalid, className = "", ...rest }) {
  const [invalid, setInvalid] = useState(false);

  function handleChange(e) {
    const next = e.target.value;
    const problem = check(next);
    if (problem) {
      setInvalid(true);
      onInvalid(problem);
      return; // keep what was there
    }
    setInvalid(false);
    onValue(next);
  }

  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      <input
        className={invalid ? "invalid" : ""}
        value={value}
        onChange={handleChange}
        onBlur={() => setInvalid(false)}
        aria-invalid={invalid}
        autoComplete="off"
        {...rest}
      />
    </label>
  );
}

export default function Students({ email }) {
  // subjects = the four fixed ones: Math, English, Science, Arts.
  const [data, setData] = useState({ students: [], subjects: [] });
  // Picked once per page load (not on every keystroke); the shuffle button picks another.
  const [quote, setQuote] = useState(() => randomQuote());
  const [loading, setLoading] = useState(true); // true until the first load finishes
  const [all, setAll] = useState(null); // the full, unfiltered list (for the summary tiles)
  const [search, setSearch] = useState("");
  const [parts, setParts] = useState(EMPTY_PARTS); // the new student being typed
  const setPart = (key, value) => setParts((p) => ({ ...p, [key]: value }));
  const showError = (text) => setMessage({ type: "error", text });
  const preview = previewName(parts);
  const [message, setMessage] = useState(null); // { type: "error" | "ok", text }

  async function load(keyword = search) {
    try {
      const result = await getOverview(keyword);
      setData(result);
      if (!keyword) setAll(result);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  // Reload whenever the search box changes.
  useEffect(() => {
    load(search);
  }, [search]);

  // Runs an API call, shows a message, reloads. Returns true if it worked.
  async function run(action, okText) {
    try {
      await action();
      if (okText) setMessage({ type: "ok", text: okText });
      await load();
      return true;
    } catch (err) {
      setMessage({ type: "error", text: err.message });
      return false;
    }
  }

  async function handleAddStudent(e) {
    e.preventDefault();
    if (await run(() => addStudent(parts), `Added ${preview}.`)) setParts(EMPTY_PARTS);
  }

  function handleDeleteStudent(student) {
    if (!window.confirm(`Delete ${student.name} and all their grades?`)) return;
    run(() => deleteStudent(student.id), `Deleted ${student.name}.`);
  }

  const { students, subjects } = data;
  const firstLoad = loading && !all; // show the loading screens only the first time

  // Summary tiles use the full list, not the search results.
  const everyone = all ?? data;
  const totalStudents = everyone.students.length;
  const fullyGraded = everyone.students.filter(
    (st) => everyone.subjects.length > 0 && Object.keys(st.grades).length === everyone.subjects.length
  ).length;
  const pendingGrades = everyone.students.reduce(
    (sum, st) => sum + (everyone.subjects.length - Object.keys(st.grades).length),
    0
  );

  return (
    <main className="container wide">
      <header className="hero">
        <div className="hero-top">
          <span className="brand">🎓 Grade Tracker</span>
          <div className="user">
            <span className="avatar" aria-hidden="true">{firstNameFromEmail(email)[0]}</span>
            <span className="user-email">{email}</span>
            <button className="secondary" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        </div>
        <h1>
          {greeting()}, {firstNameFromEmail(email)}! 👋
        </h1>
        <p className="date">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <blockquote className="quote">
          “{quote.text}”
          <cite>
            — {quote.by}
            <button
              type="button"
              className="link shuffle"
              onClick={() => setQuote((q) => randomQuote(q))}
              aria-label="Show another quote"
              title="Show another quote"
            >
              🔀
            </button>
          </cite>
        </blockquote>
      </header>

      <section className="stats" aria-label="Summary">
        <div className="stat">
          <span className={`stat-num${firstLoad ? " skeleton" : ""}`}>{firstLoad ? "00" : totalStudents}</span>
          <span className="stat-label">Students</span>
        </div>
        <div className="stat">
          <span className={`stat-num${firstLoad ? " skeleton" : ""}`}>{firstLoad ? "00" : fullyGraded}</span>
          <span className="stat-label">Fully graded</span>
        </div>
        <div className="stat">
          <span className={`stat-num${firstLoad ? " skeleton" : ""}`}>{firstLoad ? "00" : pendingGrades}</span>
          <span className="stat-label">Grades to enter</span>
        </div>
      </section>

      {message && (
        <div className={`banner ${message.type}`} role="status">
          {message.text}
          <button className="link" onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* ---------- add student ---------- */}
      <form className="card" onSubmit={handleAddStudent}>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <PartInput
            label="Last name"
            value={parts.last_name}
            onValue={(v) => setPart("last_name", v)}
            check={(t) => namePartProblem(t, "Last name")}
            onInvalid={showError}
            required
          />
          <PartInput
            label="First name"
            value={parts.first_name}
            onValue={(v) => setPart("first_name", v)}
            check={(t) => namePartProblem(t, "First name")}
            onInvalid={showError}
            required
          />
          <PartInput
            className="narrow"
            label="Middle initial"
            value={parts.middle_initial}
            onValue={(v) => setPart("middle_initial", v)}
            check={middleInitialProblem}
            onInvalid={showError}
            maxLength={2}
            required
          />
          <label className="field suffix">
            <span>Suffix (optional)</span>
            <select value={parts.suffix} onChange={(e) => setPart("suffix", e.target.value)}>
              <option value="">None</option>
              {SUFFIXES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Add student</button>
        </div>
        {preview && (
          <p className="empty" style={{ margin: "10px 0 0" }}>
            Will be saved as: <strong style={{ color: "var(--text)" }}>{preview}</strong>
          </p>
        )}
      </form>

      {/* ---------- grades table ---------- */}
      <div className="card">
        <input
          className="search"
          placeholder="Search by student name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {!firstLoad && subjects.length === 0 && (
          <div className="banner error">
            The subjects are missing from the database. Run the SQL update
            (migration_fixed_subjects.sql) in Supabase, then refresh.
          </div>
        )}

        {firstLoad ? (
          <div className="loading" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span>Loading your students…</span>
            <div className="skeleton-rows" aria-hidden="true">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          </div>
        ) : students.length === 0 ? (
          <p className="empty">No students found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  {subjects.map((s) => (
                    <th key={s.id}>{s.name}</th>
                  ))}
                  <th>Average</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => {
                  const graded = Object.keys(st.grades).length;
                  return (
                    <tr key={st.id}>
                      <td>{st.name}</td>
                      {subjects.map((sub) => (
                        <td key={sub.id}>
                          <GradeCell
                            value={st.grades[sub.id]}
                            onSave={(grade) => run(() => saveGrade(st.id, sub.id, grade))}
                            onInvalid={(text) => setMessage({ type: "error", text })}
                          />
                        </td>
                      ))}
                      <td>
                        <strong>{show(st.average)}</strong>
                        {graded > 0 && graded < subjects.length && (
                          <span className="hint">
                            {graded}/{subjects.length} graded
                          </span>
                        )}
                      </td>
                      <td className="actions">
                        <button className="danger" onClick={() => handleDeleteStudent(st)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="empty">
          A student's average is worked out automatically from the grades entered for
          Math, English, Science and Arts.
        </p>
      </div>
    </main>
  );
}
