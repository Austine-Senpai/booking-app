# Appointment Booking System

A full-stack booking app for a small service business — a barber, salon, clinic or tutor. Customers see the real free times, book in under a minute and manage their own bookings. The owner runs everything from an admin dashboard: services, opening hours, time off and every booking.

**Live demo:** _add your Render URL here after deploying_ — the login page shows one-tap demo accounts. The free server sleeps when idle, so the first visit can take up to a minute.

| Customer (phone) | Booking (phone) | My bookings (phone) |
|---|---|---|
| ![Home page](docs/screenshots/home-mobile.png) | ![Picking a time](docs/screenshots/booking-mobile.png) | ![My bookings](docs/screenshots/my-bookings-mobile.png) |

| Admin dashboard | All bookings |
|---|---|
| ![Admin dashboard](docs/screenshots/admin-dashboard.png) | ![Admin bookings](docs/screenshots/admin-bookings.png) |

## Features

**Customers**
- Browse services with prices and durations
- Pick a day (closed days greyed out) and a free time — only genuinely available slots are shown
- Log in or sign up mid-booking and come straight back to the same step
- Confirmation page with **Add to calendar** (`.ics` for Google, Apple and Outlook calendars)
- My bookings: upcoming and past, **reschedule** or **cancel** online up to a set notice period
- Email confirmations for new, moved and cancelled bookings

**Owner (admin)**
- Dashboard: today's schedule, upcoming bookings, this week's bookings and revenue
- All bookings, filtered by day and status — mark completed / no-show, cancel, or reopen
- Add, edit and hide services (prices entered in naira)
- Opening hours for each day and booking rules (slot interval, minimum notice, booking window, cancellation notice)
- Block time off — a lunch break, a whole day or a multi-day holiday
- Every change affects the free times customers see immediately

**Under the hood**
- **No double bookings**, even if two people click the same slot at the same moment: the server re-checks availability and a database unique index is the final guard (there's a test that fires two requests at once)
- All times stored in UTC and shown in the business's timezone (Africa/Lagos by default) with Luxon
- Money stored as whole kobo — never floating point
- httpOnly JWT cookie, bcrypt password hashing, rate-limited login, helmet security headers, zod validation on every request
- 101 backend tests (Vitest + Supertest + an in-memory MongoDB)
- Mobile-first, keyboard-accessible UI with WCAG AA colour contrast

## Tech stack

| | |
|---|---|
| **Frontend** | React 19, Vite, React Router, Tailwind CSS v4, axios, Luxon |
| **Backend** | Node.js 20+, Express 5, MongoDB + Mongoose, zod, JWT (httpOnly cookie), bcryptjs, nodemailer |
| **Testing** | Vitest, Supertest, mongodb-memory-server |
| **Hosting** | Render (API + website on one service), MongoDB Atlas |

## Run it locally

**You need:** Node.js 20.19+ and MongoDB running locally (`mongodb://127.0.0.1:27017`) — or a MongoDB Atlas connection string.

```bash
# 1. Install everything (root, server and client)
npm run install:all

# 2. Create the server's env file
cp server/.env.example server/.env
#    then set JWT_SECRET to a long random string:
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Fill the database with demo data (wipes it first!)
cd server && npm run seed && cd ..

# 4. Start the API and the website together
npm run dev
```

Open **http://localhost:5173**. Log in as the demo customer `demo@example.com` / `demo1234`, or as the owner with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env` (default `admin@example.com` / `admin1234`).

In development Vite forwards every `/api/...` request to the API on port 5000, so the website and API behave as one site — just like in production.

**Emails in development:** with no SMTP settings, emails go to a free [Ethereal](https://ethereal.email) test inbox and the server log prints a preview link for each one. (If your network blocks outgoing mail ports, sending fails — the booking still works and the error is logged.)

## Scripts

| Where | Command | What it does |
|---|---|---|
| root | `npm run dev` | API + website together, reloading on changes |
| root | `npm run install:all` | install all dependencies |
| root | `npm run build` | production build (used by Render) |
| root | `npm start` | start the production server |
| server | `npm test` | run the backend tests |
| server | `npm run seed` | reset the database to demo data |
| client | `npm run build` | build the website into `client/dist` |

## Environment variables

Every variable has a comment in [`server/.env.example`](server/.env.example) and [`client/.env.example`](client/.env.example).

**Server**

| Variable | Required | Example / default | Purpose |
|---|---|---|---|
| `MONGODB_URI` | ✅ | `mongodb://127.0.0.1:27017/booking-app` | Database connection |
| `JWT_SECRET` | ✅ | long random string | Signs login tokens |
| `CLIENT_URL` | ✅ | `http://localhost:5173` | The website's URL — allowed by CORS, used in email links |
| `NODE_ENV` | | `development` | `production` enables secure cookies and hides error details |
| `PORT` | | `5000` | |
| `JWT_EXPIRES_IN_DAYS` | | `7` | How long a login lasts |
| `COOKIE_SAMESITE` | | `lax` | Only change to `none` if the website is on another domain |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for seeding | `admin@example.com` | Owner account created by `npm run seed` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | | empty | Real email; empty = Ethereal in dev, off in production |
| `EMAIL_FROM` | | `no-reply@example.com` | Sender address (the sender *name* is the business name) |

**Client** (read when the website is *built*; visible to everyone, so never secrets)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_DEMO_MODE` | `false` | `true` shows demo logins on the login page |
| `VITE_DEMO_ADMIN_EMAIL`, `VITE_DEMO_ADMIN_PASSWORD` | | The admin login shown in demo mode |
| `VITE_API_URL` | `/api` | Only if the website is hosted on a different domain from the API |

## Deploy (free: Render + MongoDB Atlas)

The Express server also serves the built website, so the whole app is **one Render web service with one URL**. That keeps the login cookie first-party, which matters: Safari blocks cross-site cookies, so a website on one domain talking to an API on another would leave iPhone and Mac users unable to stay logged in.

### 1. Database — MongoDB Atlas
1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas) and a free **M0** cluster.
2. **Database Access** → add a database user with a password.
3. **Network Access** → add `0.0.0.0/0` (Render's free tier has no fixed IP address, so the database must accept any IP; the username and password still protect it).
4. **Connect → Drivers** → copy the connection string, put in your password, and add the database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/booking-app?retryWrites=true&w=majority`

### 2. Put the code on GitHub
Push this repository to GitHub (private is fine). `.env` files are git-ignored, so no secrets are uploaded.

### 3. Render
1. Create an account at [render.com](https://render.com) and connect your GitHub.
2. **New → Blueprint** → choose this repository. Render reads [`render.yaml`](render.yaml).
3. Fill in the values it asks for:
   - `MONGODB_URI` — the Atlas string from step 1
   - `CLIENT_URL` — the service's own URL, e.g. `https://booking-app.onrender.com` (if you don't know it yet, put that guess; you can fix it under **Environment** once the service exists — saving redeploys)
   - SMTP values — leave empty to keep emails off
   - `VITE_DEMO_ADMIN_EMAIL` / `VITE_DEMO_ADMIN_PASSWORD` — only for a public demo (see below); otherwise leave empty
4. Deploy. The first build takes a few minutes. `JWT_SECRET` is generated for you.
5. Open the URL.

**Public demo (portfolio) only:** under **Environment**, set `VITE_DEMO_MODE` to `true` and fill in `VITE_DEMO_ADMIN_EMAIL` / `VITE_DEMO_ADMIN_PASSWORD` with a **throwaway** login (e.g. `admin@example.com` / `admin1234`) — saving rebuilds the site and the login page then shows one-tap demo accounts. These values become public in the website, so never use this for a real business: there, keep demo mode `false` and use a strong admin password.

### 4. Fill the live database with demo data
Run the seed **from your own computer**, pointed at Atlas (the free Render plan has no shell). It wipes that database, which is why it insists on `--force` in production. In PowerShell, from the `server` folder:

```powershell
$env:NODE_ENV = "production"
$env:MONGODB_URI = "mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/booking-app?retryWrites=true&w=majority"
$env:ADMIN_EMAIL = "admin@example.com"   # must match VITE_DEMO_ADMIN_EMAIL in render.yaml
$env:ADMIN_PASSWORD = "admin1234"        # must match VITE_DEMO_ADMIN_PASSWORD
npm run seed -- --force
```

(macOS/Linux: `NODE_ENV=production MONGODB_URI="…" ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed -- --force`.)

Re-run it whenever you want to reset the demo. **For a real business,** use your own admin email and a strong password, and set `VITE_DEMO_MODE=false`.

### 5. Optional: real emails
Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` and `EMAIL_FROM` from an email provider (e.g. Brevo or Mailgun). Some hosts block outgoing SMTP on free plans — if so, the Render logs show the error, and bookings keep working without email.

## Project structure

```
booking-app/
├── render.yaml            # Render deployment blueprint
├── server/
│   ├── src/
│   │   ├── app.js         # Express app (+ serves the website in production)
│   │   ├── config/        # env vars, database connection
│   │   ├── models/        # User, Service, Settings, BlockedTime, Booking
│   │   ├── routes/        # one router per resource; adminRoutes guards all admin endpoints
│   │   ├── controllers/   # request/response handling
│   │   ├── services/      # business logic: availability engine, bookings, email
│   │   ├── middleware/    # auth, validation, rate limiting, errors
│   │   └── validators/    # zod schemas
│   ├── scripts/seed.js    # demo data
│   └── tests/
└── client/
    └── src/
        ├── api/           # one file per resource; all HTTP calls live here
        ├── components/    # Button, Input, Modal, SlotPicker…
        ├── context/       # AuthContext
        ├── hooks/         # useFetch, useSettings, usePageTitle, useNow
        ├── layouts/       # PublicLayout, AdminLayout
        ├── pages/         # one file per route; admin pages in pages/admin/
        └── utils/         # formatting, timezone and booking helpers
```

The build plan this was built from is in [`docs/PLAN.md`](docs/PLAN.md).
