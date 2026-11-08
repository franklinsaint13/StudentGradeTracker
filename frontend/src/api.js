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

export const getStudents = (search = "") =>
  request(`/api/students?search=${encodeURIComponent(search)}`);

export const addStudent = (name, grade) =>
  request("/api/students", {
    method: "POST",
    body: JSON.stringify({ name, grade }),
  });

export const updateStudent = (id, grade) =>
  request(`/api/students/${id}`, {
    method: "PUT",
    body: JSON.stringify({ grade }),
  });

export const deleteStudent = (id) =>
  request(`/api/students/${id}`, { method: "DELETE" });
