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

## Marketplace (Buyer role)

- Buyers sign up themselves at `/register` by choosing **Buyer** (or via the landing page's **Buy Fresh Fish** button). Buyers can only reach the marketplace, their orders, notifications and their profile; every fishpond / monitoring API answers them with 403.
- Owners post fish under **Product Management** (species + product type, price per kg, kilos available, photo), linked to the production cycle the fish came from.
- Buyers browse **Shop Fish** (filter by species, type, barangay; sort by price) and order for pickup or delivery, paying cash on hand-over.
- Owners handle **Orders**: accept (kilos are reserved), decline with a reason, cancel (kilos return), or complete — a completed order is saved automatically to the cycle's Sales Records.

## Decision support

- **Harvest Estimation** shows average daily gain, specific growth rate, feed conversion ratio (FCR), a feeding guide (fish weight × rate for their size) and a harvest projection (straight line through the weighings, minus the current death rate).
- **Batch Details** shows a cycle report: days of culture, survival, harvest, feed used, FCR and sales.
- **Water Quality** records temperature, pH, dissolved oxygen, salinity and ammonia; out-of-range readings are flagged and notify the owner.
- The owner dashboard lists **Needs Your Attention** items (high recent mortality, water problems, behind-schedule growth, overdue weighing/feeding, harvest dates, low stock, new orders); the Agriculture Office dashboard lists **Fishponds to Follow Up**.

## More tools

- **Expenses & Profit** (owner): record each cycle's costs (fingerlings, feeds, labor, electricity, …) and see sales minus expenses, cost per kilo and ROI per cycle.
- **Fishpond map**: the pin is placed automatically from the address the owner types (OpenStreetMap geocoding, limited to Noveleta; falls back to the barangay center when the exact address is not on the map), and the owner can click the map to fine-tune it. **Set Location** on the fishpond page does the same for older fishponds; staff switch **Registered List** to **Map** to see all pinned fishponds colored by barangay. Uses OpenStreetMap tiles (internet needed).
- **QR verification**: approved FishR registrations and fishponds get a QR code (on screen and on the printed FishR PDF). Scanning it opens the public `/verify/<code>` page, which confirms the record without logging in and shows no contact details. QR links use the first address in `CLIENT_URL`, so set it to the deployed site.
- **Installable app (PWA)**: on a phone, use "Add to Home Screen". Screens open offline; records still need internet to save.
- **Filipino language**: the **EN / FIL** switch in the top bar translates the menus, page titles, buttons, form labels and tables (messages that come from the server stay in English).
- **Audit trail**: Activity Logs show, for each edit, which fields changed and their old → new values.

## Tests and security

- `cd server && npm test` runs the unit tests for the growth, FCR, feeding-guide, projection and insight formulas.
- Login, registration and OTP routes are rate-limited (20 tries per 15 minutes) and the API sends security headers (helmet). When the API runs behind a hosting proxy, set `TRUST_PROXY=1` in `server/.env` so the limit sees real visitor IPs.

## Notes

- The database starts empty by design — there is no seed/demo data. Species, users beyond the first admin, and all production data are entered through the UI as described above.
- Harvest estimates use a deterministic formula (`remaining fish × latest average weight`) compared against each species' recommended harvest weight — no AI/ML, per the system's documented scope.
- File uploads (fishpond photos) are stored on local disk under `server/uploads/` and served at `/uploads/...`.
- "Data Export / Backup" (Admin) is a manual JSON download of core collections — there is no automated backup infrastructure, matching the system's documented limitations.
