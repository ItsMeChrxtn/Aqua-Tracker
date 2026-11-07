# AquaTrack (MERN Stack)

Web-based aquaculture monitoring and harvest estimation system for small-scale fishpond operations in the Municipality of Noveleta, Cavite — built on MongoDB, Express, React, and Node.js.

## Project structure

```
Aqua Tracker/
  server/   Node.js + Express + Mongoose REST API
  client/   React (Vite) + Tailwind CSS + Recharts SPA
```

## Prerequisites

- Node.js 18+ and npm
- MongoDB Community Server running locally (`mongodb://127.0.0.1:27017`), or a MongoDB Atlas connection string

## 1. Set up the server

```bash
cd server
npm install
```

Copy `.env.example` to `.env` (already provided with sensible local defaults) and adjust if needed:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/aquatrack
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Start the API:

```bash
npm run dev      # nodemon, auto-restarts on changes
# or
npm start
```

The API runs at `http://localhost:5000`. Health check: `GET /api/health`.

### Create the first Administrator account

Public registration only creates **Fishpond Owner** accounts. To get into the Admin panel (and from there create Agriculture Office Staff accounts and manage species), bootstrap one Administrator:

```bash
npm run create-admin -- --name "Your Name" --email admin@aquatrack.local --password changeme123
```

Log in with these credentials at the client's `/login` page.

## 2. Set up the client

```bash
cd client
npm install
npm run dev
```

The app runs at `http://localhost:5173` and proxies `/api` and `/uploads` requests to the server (see `vite.config.js`).

## 3. First-run walkthrough

1. Log in as the Administrator you bootstrapped above.
2. Go to **Species Management** and add at least one species (name, water type, recommended harvest weight range). Nothing else in the system works until at least one species exists.
3. Go to **User & Role Management** and create an **Agriculture Office Staff** account (used to approve fishpond registrations).
4. Log out, then register a **Fishpond Owner** account from `/register`.
5. As the owner, register a fishpond (**Fishpond List → Register Fishpond**) — it starts `pending`.
6. Log in as the Agriculture Office Staff account and approve it under **Fishponds**.
7. Back as the owner, open the fishpond's detail page and **Start New Cycle** (pick species, stocking date, initial count).
8. Use **Monitoring → Growth/Mortality/Feeding/Stocking Records** to log data over time — the dashboard, Survival Monitoring, and Harvest Estimation pages populate from these records.

## Notes

- The database starts empty by design — there is no seed/demo data. Species, users beyond the first admin, and all production data are entered through the UI as described above.
- Harvest estimates use a deterministic formula (`remaining fish × latest average weight`) compared against each species' recommended harvest weight — no AI/ML, per the system's documented scope.
- File uploads (fishpond photos) are stored on local disk under `server/uploads/` and served at `/uploads/...`.
- "Data Export / Backup" (Admin) is a manual JSON download of core collections — there is no automated backup infrastructure, matching the system's documented limitations.
