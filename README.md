# IVYNEX WIFI LIMITED

A complete prepaid WiFi hotspot billing platform: customers pay for time
packages (KSh 10–30) via M-Pesa on a captive portal, and get put online
through FreeRADIUS + MikroTik automatically for exactly as long as they paid
for. Built as a MERN stack (MongoDB, Express, React, Node) with a
TypeScript frontend.

## Architecture

```
                     ┌──────────────────────────────┐
  Phone connects --> │  MikroTik hotspot (RouterOS)  │
  to WiFi            │  intercepts all traffic       │
                     └───────────────┬───────────────┘
                                     │ redirects to
                                     ▼
                     ┌──────────────────────────────┐
                     │  React + TS Captive Portal    │  (frontend/)
                     │  select package, pay w/ M-Pesa│
                     └───────────────┬───────────────┘
                                     │ REST API
                                     ▼
                     ┌──────────────────────────────┐
                     │  Node/Express + MongoDB API   │  (backend/)
                     │  packages, transactions,      │
                     │  sessions, M-Pesa Daraja       │
                     └───────────────┬───────────────┘
                                     │ rlm_rest (HTTP)
                                     ▼
                     ┌──────────────────────────────┐
                     │  FreeRADIUS                   │  (radius/)
                     │  authorize + accounting       │
                     └───────────────┬───────────────┘
                                     │ RADIUS protocol
                                     ▼
                     ┌──────────────────────────────┐
                     │  MikroTik hotspot RADIUS auth │  (mikrotik/)
                     │  grants/revokes access        │
                     └──────────────────────────────┘
```

## Folder guide

```
ivynex-wifi/
├── backend/     Node.js + Express + MongoDB API, real M-Pesa Daraja integration
├── frontend/    React + TypeScript (Vite) — captive portal + admin dashboard
├── radius/      FreeRADIUS config: clients.conf, rest module, virtual server
└── mikrotik/    RouterOS script: hotspot, RADIUS client, walled garden
```

## How a purchase actually works, end to end

1. A phone joins the WiFi and tries to load any page. MikroTik's hotspot
   intercepts it and redirects to the React captive portal, appending
   `mac`, `ip`, `link-login-only`, `link-orig` as query params.
2. The portal shows packages (seeded: 1hr/KSh10, 3hr/15, 6hr/20, 12hr/25,
   24hr/30 — edit anytime from `/admin`). Customer picks one, enters their
   M-Pesa number.
3. Frontend calls `POST /api/payments/initiate` → backend calls Safaricom's
   Daraja STK Push API → customer gets a PIN prompt on their phone.
4. Safaricom calls back `POST /api/payments/mpesa/callback` with the
   result. On success, the backend creates a `Session` document with a
   RADIUS username (the phone number) and a randomly generated one-time
   password — but the countdown **hasn't started yet**.
5. The frontend polls `GET /api/payments/:id/status`, sees `SUCCESS`, and
   auto-submits MikroTik's hotspot login form (via the `link-login-only`
   URL it captured in step 1) with that username/password.
6. MikroTik sends a RADIUS Access-Request to FreeRADIUS. FreeRADIUS's
   `rest` module calls `POST /api/radius/authorize` on the backend. *This*
   is the moment the backend actually starts the clock — `expiresAt` is
   set to now + package duration — and returns `Session-Timeout` (seconds
   remaining) in the Access-Accept.
7. MikroTik grants internet access for exactly `Session-Timeout` seconds,
   sends RADIUS Accounting-Start immediately and Interim-Updates every
   minute, both hitting `POST /api/radius/accounting` so the admin
   dashboard can show live data usage and "users online now".
8. When time runs out, MikroTik disconnects the client itself (that's what
   `Session-Timeout` does) and sends Accounting-Stop; a backend cron job
   also sweeps every minute as a safety net in case that packet is lost.

## Setup

### 1. MongoDB
Run MongoDB locally (`mongod`) or use a hosted cluster (MongoDB Atlas has a
free tier) and put the connection string in `backend/.env` as `MONGO_URI`.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env     # fill in MONGO_URI, M-Pesa creds, RADIUS_REST_SHARED_SECRET
node src/seed.js         # inserts the 5 default packages
npm start
```
Runs on `http://localhost:4000` by default. Health check: `GET /health`.

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_BASE_URL=http://localhost:4000
npm run dev              # http://localhost:5173 during development
npm run build             # production build -> frontend/dist
```
Deploy `frontend/dist` anywhere static (Nginx, S3+CloudFront, Vercel...) or
serve it from the same box as the backend behind Nginx.

For Vercel, this repo includes `vercel.json` so the frontend builds from the
`frontend` directory. Set a Vercel environment variable:

- `VITE_API_BASE_URL` → your backend URL (for example `https://api.example.com`)

Then deploy the frontend project to get a static site such as
`wifi-mtaani.vercel.app`.

### 4. M-Pesa (Safaricom Daraja)
1. Register at https://developer.safaricom.co.ke, create an app to get your
   Consumer Key/Secret, and a Lipa Na M-Pesa Online shortcode + passkey.
2. Fill in the `MPESA_*` values in `backend/.env`.
3. `MPESA_CALLBACK_URL` must be a **public HTTPS URL** Safaricom can reach
   — use a real domain, or `ngrok http 4000` while testing locally.
4. Start in `MPESA_ENV=sandbox`, move to `production` once Safaricom
   approves your go-live application.

### 5. FreeRADIUS
On your FreeRADIUS server (can be the same box as the backend, or
anywhere that can reach both the backend and your MikroTik router):

```bash
sudo apt install freeradius
```

Then:
1. Append `radius/clients.conf.snippet` into `/etc/freeradius/3.0/clients.conf`,
   filling in your router's IP and a shared secret.
2. Copy `radius/mods-available/rest` over
   `/etc/freeradius/3.0/mods-available/rest`, set `connect_uri` to your
   backend's address, and set the `X-Radius-Secret` header to match
   `RADIUS_REST_SHARED_SECRET` in `backend/.env`.
3. Enable it: `ln -s ../mods-available/rest /etc/freeradius/3.0/mods-enabled/rest`
4. Copy `radius/sites-available/ivynex` into
   `/etc/freeradius/3.0/sites-available/ivynex`, then enable it (see the
   comments at the top of that file for the exact symlink commands).
5. Test config and restart: `freeradius -CX` then `systemctl restart freeradius`.

### 6. MikroTik
Open `mikrotik/ivynex-hotspot-setup.rsc`, replace every `<PLACEHOLDER>`,
and run it via Winbox's New Terminal or `/import`. It wires up:
- a RADIUS client pointing at your FreeRADIUS box
- a hotspot server + profile with `use-radius=yes` and accounting on
- a walled garden allowing traffic to the portal/backend before login
- a one-line `login.html` that redirects to the React captive portal
  instead of RouterOS's built-in login page

## Design notes

Same visual language as the original build, rebranded: deep ink-navy
background, a teal "connectivity" accent, and a gold "value/price" accent.
Package cards use a nested wifi-arc icon (more arcs = better value tier),
and the active-session view is a countdown ring so remaining time reads at
a glance. Space Grotesk for headings, Inter for body copy, JetBrains Mono
reserved for prices, phone numbers, and timers.

## Security notes before going live

- Put real authentication in front of `/admin` and the `/api/admin/*` and
  package-management routes — they're open in this build.
- `RADIUS_REST_SHARED_SECRET` is the only thing stopping someone from
  calling `/api/radius/authorize` directly and granting themselves free
  access — keep it long, random, and out of version control.
- Rate-limit `/api/payments/initiate` so someone can't spam STK prompts to
  a phone number that isn't theirs.
- Validate that M-Pesa callbacks genuinely come from Safaricom (IP
  allow-list) before trusting them in production.
