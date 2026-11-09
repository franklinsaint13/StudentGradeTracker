import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { getOverview, addStudent, deleteStudent, saveGrade } from "./api.js";
import { gradeProblem } from "./gradeInput.js";
import { namePartProblem, middleInitialProblem, previewName, SUFFIXES } from "./nameInput.js";

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
  const [search, setSearch] = useState("");
  const [parts, setParts] = useState(EMPTY_PARTS); // the new student being typed
  const setPart = (key, value) => setParts((p) => ({ ...p, [key]: value }));
  const showError = (text) => setMessage({ type: "error", text });
  const preview = previewName(parts);
  const [message, setMessage] = useState(null); // { type: "error" | "ok", text }

  async function load(keyword = search) {
    try {
      setData(await getOverview(keyword));
    } catch (err) {
      setMessage({ type: "error", text: err.message });
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

  return (
    <main className="container wide">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1>Student Grade Tracker</h1>
        <div className="row" style={{ alignItems: "center", flex: "none" }}>
          <span className="empty" style={{ margin: 0 }}>{email}</span>
          <button className="secondary" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>

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

        {subjects.length === 0 && (
          <div className="banner error">
            The subjects are missing from the database. Run the SQL update
            (migration_fixed_subjects.sql) in Supabase, then refresh.
          </div>
        )}

        {students.length === 0 ? (
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
