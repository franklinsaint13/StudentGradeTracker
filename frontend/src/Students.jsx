import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import {
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
} from "./api.js";

export default function Students({ email }) {
  const [students, setStudents] = useState([]);
  const [average, setAverage] = useState(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editGrade, setEditGrade] = useState("");
  const [message, setMessage] = useState(null); // { type: "error" | "ok", text }

  async function load(keyword = search) {
    try {
      const data = await getStudents(keyword);
      setStudents(data.students);
      setAverage(data.average);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  // Reload the list whenever the search box changes.
  useEffect(() => {
    load(search);
  }, [search]);

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await addStudent(name, grade);
      setMessage({ type: "ok", text: `Added ${name.trim()}.` });
      setName("");
      setGrade("");
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleSave(id) {
    try {
      await updateStudent(id, editGrade);
      setMessage({ type: "ok", text: "Grade updated." });
      setEditingId(null);
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleDelete(student) {
    if (!window.confirm(`Delete ${student.name}?`)) return;
    try {
      await deleteStudent(student.id);
      setMessage({ type: "ok", text: `Deleted ${student.name}.` });
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  return (
    <main className="container">
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
          <button className="link" onClick={() => setMessage(null)}>
            ×
          </button>
        </div>
      )}

      <form className="card row" onSubmit={handleAdd}>
        <input
          placeholder="Student name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Grade (0-100)"
          min="0"
          max="100"
          step="0.1"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>

      <div className="card">
        <input
          className="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {students.length === 0 ? (
          <p className="empty">No students found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Grade</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.name}</td>
                  <td>
                    {editingId === s.id ? (
                      <input
                        className="small"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={editGrade}
                        onChange={(e) => setEditGrade(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      s.grade.toFixed(1)
                    )}
                  </td>
                  <td className="actions">
                    {editingId === s.id ? (
                      <>
                        <button onClick={() => handleSave(s.id)}>Save</button>
                        <button
                          className="secondary"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="secondary"
                          onClick={() => {
                            setEditingId(s.id);
                            setEditGrade(s.grade);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="danger"
                          onClick={() => handleDelete(s)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {average !== null && (
          <p className="average">
            Class average: <strong>{average.toFixed(1)}</strong>
          </p>
        )}
      </div>
    </main>
  );
}
