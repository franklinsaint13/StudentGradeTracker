// server.js
// Express API for the Student Grade Tracker. Data lives in Supabase (Postgres).
//
// Every request must carry the logged-in user's Supabase access token:
//   Authorization: Bearer <token>
// We build a Supabase client that acts AS that user, so the Row Level Security
// policies in supabase/schema.sql decide what rows they can see or change.

import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  PORT = 5000,
  CLIENT_ORIGIN = "http://localhost:5173",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in."
  );
  process.exit(1);
}

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// ---------- helpers ----------

// Express 4 doesn't catch errors from async handlers, so wrap them.
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  });

function parseGrade(value) {
  if (value === "" || value === null || value === undefined) return null;
  const grade = Number(value);
  return Number.isFinite(grade) && grade >= 0 && grade <= 100 ? grade : null;
}

// ---------- auth middleware ----------

async function requireUser(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Please sign in." });

  // A client that sends the user's token with every database call.
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Ask Supabase to verify the token is real and not expired.
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: "Session expired. Please sign in again." });
  }

  req.db = db;
  req.user = data.user;
  next();
}

app.use("/api", requireUser);

// ---------- routes ----------

// List students (optional ?search=) plus the class average.
app.get(
  "/api/students",
  wrap(async (req, res) => {
    const search = String(req.query.search || "").trim();

    let query = req.db
      .from("students")
      .select("id, name, grade")
      .order("name", { ascending: true });
    if (search) query = query.ilike("name", `%${search}%`);

    const { data: students, error } = await query;
    if (error) throw error;

    // Average is over ALL of this user's students, not just the search results.
    const { data: allGrades, error: avgError } = await req.db
      .from("students")
      .select("grade");
    if (avgError) throw avgError;

    const average = allGrades.length
      ? Math.round(
          (allGrades.reduce((sum, r) => sum + Number(r.grade), 0) /
            allGrades.length) *
            10
        ) / 10
      : null;

    res.json({
      students: students.map((s) => ({ ...s, grade: Number(s.grade) })),
      average,
    });
  })
);

// Add a student.
app.post(
  "/api/students",
  wrap(async (req, res) => {
    const name = String(req.body?.name ?? "").trim();
    const grade = parseGrade(req.body?.grade);
    if (!name) return res.status(400).json({ error: "Name cannot be empty." });
    if (grade === null)
      return res.status(400).json({ error: "Grade must be a number between 0 and 100." });

    // user_id is filled in by the database from the user's token.
    const { data, error } = await req.db
      .from("students")
      .insert({ name, grade })
      .select("id, name, grade")
      .single();

    if (error?.code === "23505")
      return res.status(409).json({ error: "Student already exists." });
    if (error) throw error;

    res.status(201).json({ ...data, grade: Number(data.grade) });
  })
);

// Update a student's grade.
app.put(
  "/api/students/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const grade = parseGrade(req.body?.grade);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
    if (grade === null)
      return res.status(400).json({ error: "Grade must be a number between 0 and 100." });

    const { data, error } = await req.db
      .from("students")
      .update({ grade })
      .eq("id", id)
      .select("id, name, grade")
      .maybeSingle();

    if (error) throw error;
    // RLS hides other users' rows, so "not yours" and "doesn't exist" look the same.
    if (!data) return res.status(404).json({ error: "Student not found." });

    res.json({ ...data, grade: Number(data.grade) });
  })
);

// Delete a student.
app.delete(
  "/api/students/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

    const { data, error } = await req.db
      .from("students")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) throw error;
    if (!data.length) return res.status(404).json({ error: "Student not found." });

    res.status(204).end();
  })
);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
