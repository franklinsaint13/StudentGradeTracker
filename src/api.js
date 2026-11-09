// Calls the Node API, attaching the logged-in user's Supabase token.
import { supabase } from "./supabase.js";

async function request(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Something went wrong.");
  return body;
}

// Students, subjects, every grade, and the averages, in one call.
export const getOverview = (search = "") =>
  request(`/api/students?search=${encodeURIComponent(search)}`);

// parts = { last_name, first_name, middle_initial, suffix }
export const addStudent = (parts) =>
  request("/api/students", { method: "POST", body: JSON.stringify(parts) });

export const deleteStudent = (id) =>
  request(`/api/students/${id}`, { method: "DELETE" });

// An empty grade clears that cell.
export const saveGrade = (studentId, subjectId, grade) =>
  request("/api/grades", {
    method: "PUT",
    body: JSON.stringify({ student_id: studentId, subject_id: subjectId, grade }),
  });
