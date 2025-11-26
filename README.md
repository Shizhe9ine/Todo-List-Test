# Todo + Calendar + Focus Timer

A Next.js 16 App Router app with a Prisma + SQLite backend. It includes a Todo list (CRUD, filters, colored priority dots, drag-and-drop ordering), a calendar (week/month toggle with colored due-date dots), and a standalone focus (Pomodoro-style) timer, all in a dark theme.

## Features
- Todo CRUD with filters: All / Todo / Done / Due today
- Colored priority dots (low/medium/high) and due dates
- Drag-and-drop ordering persisted via `sortOrder`
- Calendar: week/month views with colored dots for tasks with due dates
- Standalone focus/Pomodoro timer (configurable focus/break, pause/resume/reset)
- Dark theme UI

## Tech Stack
- Next.js 16 (App Router), React, TypeScript
- Prisma ORM + SQLite
- dnd-kit for drag-and-drop

## Getting Started (Local)
```bash
git clone <repo-url>
cd <project-folder>
npm install
```

1) Create `.env` from the example and set your database URL:
```
cp .env.example .env
# in .env
DATABASE_URL="file:./prisma/dev.db"
```

2) Initialize the database (one-time for local dev):
```bash
npx prisma db push
npx prisma generate
```

3) Run dev server:
```bash
npm run dev
```

## Production Build & Run
```bash
npm run build
npm start
```

## Notes on SQLite (Vercel/deployment)
- The app currently uses SQLite; on platforms like Vercel the DB file is ephemeral and not persisted across deployments or scaling.
- For demos/coursework this is acceptable. For production, consider migrating to a managed database (e.g., Postgres).

## Deployment (Vercel)
1. Push this repo to GitHub.
2. Go to https://vercel.com → New Project → import this repo.
3. Framework should auto-detect Next.js.
4. Set environment variable: `DATABASE_URL="file:./prisma/dev.db"` (or a managed DB URL if you switch).
5. Deploy and test the generated URL.
