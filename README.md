# Student Grade Tracker: React + Node.js + Supabase (Vercel-ready)

```
Browser (React)  ──login──────────────▶  Supabase Auth
     │
     │  fetch /api/...  + access token
     ▼
Node/Express API ──queries as that user─▶  Supabase Postgres (Row Level Security)
```

One project, one repo, one deployment: the React app is served from the root and the
Node API runs as a Vercel serverless function at `/api`.

```
StudentGradeTracker/
├── src/                React app (App, Login, Students, api, name/grade input checks)
├── index.html          Vite entry
├── api/index.js        Vercel serverless function: runs the Express app for /api/...
├── server/
│   ├── app.js          The Express API (routes, login check, Supabase calls)
│   ├── dev.js          Starts the API on your computer (http://localhost:5000)
│   ├── stats.js        Grade parsing and average maths
│   └── names.js        Student name checks and formatting
├── supabase/           SQL: schema.sql (new project) and migration_*.sql (upgrades)
├── vercel.json         Sends /api/... to api/index.js
├── vite.config.js      Dev proxy: /api -> localhost:5000
├── package.json        One set of dependencies and scripts
└── .env                Your Supabase URL and key (never uploaded to GitHub)
```

## Features

- Sign up / sign in. Each account has its own private data.
- **Four fixed subjects**: Math, English, Science and Arts.
- **Students**: add, search, delete. A name is entered as Last name, First name, Middle initial and an optional Suffix (Jr., Sr., II, III, IV, V) and is saved like `Baylon, Daniel Vincent D. Jr.`. Numbers and unnecessary symbols are refused with an error.
- **Grades**: one per student per subject, two decimal places, numbers only. Type it into the table; it saves when you click away or press Enter. Clear the box to remove a grade.
- **Automatic student average** from the grades entered.

## 1. Set up Supabase

1. Create a free project at https://supabase.com.
2. **SQL Editor → New query**, paste `supabase/schema.sql`, click **Run**. (Upgrading an older database? Use the `migration_*.sql` files instead; see the comments at the top of each.)
3. **Project Settings → API**: copy the **Project URL** and the **anon / publishable** key.
4. (Optional, easier for testing) **Authentication → Sign In / Providers → User Signups**: turn off **Confirm email**.

## 2. Run it on your computer

```bash
cp .env.example .env      # then fill in the four values
npm install
npm run dev               # API on :5000 and the website on http://localhost:5173
```

On Windows without `cp`, just copy `.env.example` and rename the copy to `.env`.

## 3. Deploy to Vercel

1. Push the project to GitHub.
2. On vercel.com choose **Add New → Project** and import the repository.
3. Leave **Root Directory** as `./`. The framework should show as **Vite** (build `npm run build`, output `dist`). If it offers "Services" or "Multiple applications", choose the single Vite project.
4. Open **Environment Variables** and add the same four values as in `.env`:
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
5. Click **Deploy**.
6. In Supabase, **Authentication → URL Configuration**: set **Site URL** to your Vercel address (for example `https://studentgradetracker.vercel.app`).

After that, every `git push` to GitHub redeploys automatically. If you change an environment variable in Vercel, redeploy for it to take effect (the `VITE_` ones are baked in at build time).

## API

All routes need the header `Authorization: Bearer <supabase access token>`.

| Method | URL                   | Purpose                                                     |
| ------ | --------------------- | ----------------------------------------------------------- |
| GET    | `/api/students`       | Students (`?search=`) with their grades, the 4 subjects and each student's average |
| POST   | `/api/students`       | Add a student `{ last_name, first_name, middle_initial, suffix? }` |
| DELETE | `/api/students/:id`   | Delete a student and their grades                           |
| PUT    | `/api/grades`         | Set a grade `{ student_id, subject_id, grade }`; empty grade clears it |

## Notes

- Never put the **service_role** key anywhere in this project. Only the anon/publishable key is used.
- Free Supabase projects pause after a period of inactivity; click **Restore** in the dashboard.
