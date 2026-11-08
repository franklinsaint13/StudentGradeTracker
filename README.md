# Student Grade Tracker: React + Node.js + Supabase

```
Browser (React)  ──login──────────────▶  Supabase Auth
     │
     │  fetch /api/...  + access token
     ▼
Node/Express API ──queries as that user─▶  Supabase Postgres (Row Level Security)
```

```
grade-tracker-supabase/
├── supabase/
│   ├── schema.sql                     FRESH install: students, 4 fixed subjects, grades + security
│   ├── migration_names.sql            Adds the name-parts columns (run after the others)
│   ├── migration_from_original.sql    UPGRADE from the first version (one grade per student)
│   ├── migration_subjects.sql         (older step) one grade per student -> per-user subjects
│   └── migration_fixed_subjects.sql   UPGRADE from per-user subjects -> the 4 fixed subjects
├── backend/                     Node.js + Express API (server.js, stats.js, names.js)
└── frontend/                    React app (Vite) with login screen
```

## Features

- Sign up / sign in. Each account has its own private data.
- **Four fixed subjects**: Math, English, Science and Arts. They are the same for everyone and can't be added or deleted from the app.
- **Students**: add, search, delete. A name is entered as Last name, First name, Middle initial and an optional Suffix (Jr., Sr., II, III, IV, V), and is saved like `Baylon, Daniel Vincent D. Jr.`. Numbers and unnecessary symbols are refused with an error.
- **Grades**: one grade per student per subject. Type it straight into the table; it saves when you click away or press Enter. Clear the box to remove a grade.
- **Automatic student average**: each student's average is worked out from their entered grades in the four subjects. A student with only some grades entered shows "2/4 graded" under the average. There are no subject or class averages.

## 1. Set up Supabase

1. Create a free project at https://supabase.com.
2. Open **SQL Editor → New query**, then:
   - **New project:** paste `supabase/schema.sql` and click **Run**. That's all.
   - **Existing database from the first version** (a `students` table with a `grade` column, no `grades` table): paste `supabase/migration_from_original.sql` and click **Run**. The old single grade is dropped (re-enter grades per subject); students are kept.
   - **Already ran `migration_subjects.sql`** (per-user subjects): paste `supabase/migration_fixed_subjects.sql` and click **Run**. It keeps grades under Math, English, Science and Arts and removes grades under any other subject (such as "General").
   Run only one of these, and only once.
   - **Student names in parts** (last name, first name, middle initial, suffix): if your database was set up before this feature, also run `supabase/migration_names.sql` once. Existing students are kept as they are. A brand-new project needs only `schema.sql`.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon / publishable** key.
4. (Optional, easier for testing) **Authentication → Sign In / Providers → User Signups**: turn off **Confirm email**.

## 2. Run the API

```bash
cd backend
cp .env.example .env      # then paste your URL and key into .env
npm install
npm run dev               # http://localhost:5000
```

## 3. Run the React app

```bash
cd frontend
cp .env.example .env      # same URL and key, with the VITE_ prefix
npm install
npm run dev               # http://localhost:5173
```

Open http://localhost:5173. Vite forwards `/api` requests to the Node server on port 5000.
Needs Node.js 18 or newer.

## API

All routes need the header `Authorization: Bearer <supabase access token>`.

| Method | URL                   | Purpose                                                     |
| ------ | --------------------- | ----------------------------------------------------------- |
| GET    | `/api/students`       | Students (`?search=`) with their grades, the 4 subjects and each student's average |
| POST   | `/api/students`       | Add a student `{ last_name, first_name, middle_initial, suffix? }` |
| DELETE | `/api/students/:id`   | Delete a student and their grades                           |
| PUT    | `/api/grades`         | Set a grade `{ student_id, subject_id, grade }`; empty grade clears it |

## Notes

- Never put the **service_role** key in this project. Only the anon/publishable key is used.
- Free Supabase projects pause after a period of inactivity; resume from the dashboard.
- Before deploying, set `CLIENT_ORIGIN` in `backend/.env` to your real site URL.
