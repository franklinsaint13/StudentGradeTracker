// server/app.js
// Express API for the Student Grade Tracker. Data lives in Supabase (Postgres).
//
// This file only BUILDS the app and exports it:
//   - on Vercel, api/index.js uses it as the serverless function for /api/...
//   - on your computer, server/dev.js starts it on http://localhost:5000
//
// Every request must carry the logged-in user's Supabase access token:
//   Authorization: Bearer <token>
// We build a Supabase client that acts AS that user, so the Row Level Security
// policies in supabase/schema.sql decide what rows they can see or change.

import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { buildOverview, parseGrade } from "./stats.js";
import { validateStudentName } from "./names.js";

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  CLIENT_ORIGIN = "http://localhost:5173",
} = process.env;

const configError =
  !SUPABASE_URL || !SUPABASE_ANON_KEY
    ? "Server is missing SUPABASE_URL or SUPABASE_ANON_KEY. Add them to your .env file (or to the Environment Variables in Vercel)."
    : null;
if (configError) console.error(configError);

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


function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const cleanName = (value) => String(value ?? "").trim();

// Postgres error codes we turn into friendly messages.
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const RLS_VIOLATION = "42501";

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

  // Only real, verified Gmail accounts may use the API (defence in depth: the
  // database also refuses to create any other kind of account).
  const email = String(data.user.email || "").toLowerCase();
  if (!/@(gmail|googlemail)\.com$/.test(email)) {
    return res.status(403).json({ error: "Only Gmail accounts can use this system." });
  }
  if (!data.user.email_confirmed_at) {
    return res
      .status(403)
      .json({ error: "Please confirm your email first. Open the link we sent to your Gmail." });
  }

  req.db = db;
  req.user = data.user;
  next();
}

// If the settings are missing, say so clearly instead of failing in a confusing way.
app.use("/api", (req, res, next) =>
  configError ? res.status(500).json({ error: configError }) : next()
);

app.use("/api", requireUser);

// ---------- overview (students + the 4 fixed subjects + grades + averages) ----------

app.get(
  "/api/students",
  wrap(async (req, res) => {
    const search = String(req.query.search || "").trim();

    let studentQuery = req.db
      .from("students")
      .select("id, name")
      .order("name", { ascending: true });
    if (search) studentQuery = studentQuery.ilike("name", `%${search}%`);

    const [students, subjects, grades] = await Promise.all([
      studentQuery,
      // Fixed shared list (Math, English, Science, Arts), kept in the order they were created.
      req.db.from("subjects").select("id, name").order("id", { ascending: true }),
      req.db.from("grades").select("student_id, subject_id, grade"),
    ]);
    for (const result of [students, subjects, grades]) {
      if (result.error) throw result.error;
    }

    res.json(buildOverview(students.data, subjects.data, grades.data));
  })
);

// ---------- students ----------

app.post(
  "/api/students",
  wrap(async (req, res) => {
    // Last name, first name, middle initial and optional suffix; checked and tidied here.
    const student = validateStudentName(req.body);
    if (student.error) return res.status(400).json({ error: student.error });

    // user_id is filled in by the database from the user's token.
    const { data, error } = await req.db
      .from("students")
      .insert({
        name: student.name,
        last_name: student.last_name,
        first_name: student.first_name,
        middle_initial: student.middle_initial,
        suffix: student.suffix,
      })
      .select("id, name")
      .single();

    if (error?.code === UNIQUE_VIOLATION)
      return res.status(409).json({ error: "Student already exists." });
    if (error) throw error;

    res.status(201).json(data);
  })
);

app.delete(
  "/api/students/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id." });

    // Their grades are removed automatically (on delete cascade).
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

// ---------- grades ----------

// Set one student's grade for one subject. An empty grade clears it.
// Body: { student_id, subject_id, grade }
app.put(
  "/api/grades",
  wrap(async (req, res) => {
    const studentId = parseId(req.body?.student_id);
    const subjectId = parseId(req.body?.subject_id);
    if (!studentId || !subjectId)
      return res.status(400).json({ error: "Invalid student or subject." });

    const raw = req.body?.grade;
    const clearing = raw === "" || raw === null || raw === undefined;

    if (clearing) {
      const { error } = await req.db
        .from("grades")
        .delete()
        .eq("student_id", studentId)
        .eq("subject_id", subjectId);
      if (error) throw error;
      return res.json({ student_id: studentId, subject_id: subjectId, grade: null });
    }

    const grade = parseGrade(raw);
    if (grade === null)
      return res.status(400).json({ error: "Grade must be a number between 0 and 100." });

    const { data, error } = await req.db
      .from("grades")
      .upsert(
        {
          student_id: studentId,
          subject_id: subjectId,
          grade,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,subject_id" }
      )
      .select("student_id, subject_id, grade")
      .single();

    // Student/subject missing, or belongs to someone else (blocked by the RLS policy).
    if (error?.code === FOREIGN_KEY_VIOLATION || error?.code === RLS_VIOLATION)
      return res.status(404).json({ error: "Student or subject not found." });
    if (error) throw error;

    res.json({ ...data, grade: Number(data.grade) });
  })
);

export default app;
