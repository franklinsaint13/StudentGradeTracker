# Student Grade Tracker: React + Node.js + Supabase

```
Browser (React)  ──login──────────────▶  Supabase Auth
     │
     │  fetch /api/students  + access token
     ▼
Node/Express API ──queries as that user─▶  Supabase Postgres (Row Level Security)
```

```
grade-tracker-supabase/
├── supabase/schema.sql   Table + security policies (run once in Supabase)
├── backend/              Node.js + Express API
└── frontend/             React app (Vite) with login screen
```

Each user only sees and edits the students they added. The database enforces this
(Row Level Security), not just the app.

## 1. Set up Supabase (about 5 minutes)

1. Create a free project at https://supabase.com.
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, click **Run**.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. (Optional, easier for testing) **Authentication → Providers → Email**: turn off
   "Confirm email" so new accounts can sign in immediately.

## 2. Run the API

```bash
cd backend
cp .env.example .env      # then paste your URL and anon key into .env
npm install
npm run dev               # http://localhost:5000
```

## 3. Run the React app

```bash
cd frontend
cp .env.example .env      # same URL and anon key, with the VITE_ prefix
npm install
npm run dev               # http://localhost:5173
```

Open http://localhost:5173, create an account, and start adding students.
Vite forwards `/api` requests to the Node server on port 5000.

Needs Node.js 18 or newer.

## API

All routes need the header `Authorization: Bearer <supabase access token>`.

| Method | URL                  | Purpose                                      |
| ------ | -------------------- | -------------------------------------------- |
| GET    | `/api/students`      | List students (`?search=`) and class average |
| POST   | `/api/students`      | Add a student `{ name, grade }`              |
| PUT    | `/api/students/:id`  | Update a grade `{ grade }`                   |
| DELETE | `/api/students/:id`  | Delete a student                             |

## Notes

- Never put the **service_role** key in this project. Only the anon key is used here.
- Free Supabase projects pause after a period of inactivity; resume from the dashboard.
- Before deploying, set `CLIENT_ORIGIN` in `backend/.env` to your real site URL.
