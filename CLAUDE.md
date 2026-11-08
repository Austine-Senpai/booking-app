# CLAUDE.md — Appointment Booking System

## About the developer (read this first)

I am a **junior MERN stack developer**. Write code I can read, understand and maintain:

- Prefer simple, readable code over clever code. No unnecessary abstractions or patterns.
- Explain anything non-obvious with a short comment (the *why*, not the *what*).
- After finishing a task, give me a short summary: what you changed, which files, and anything I should learn or check.
- When there are several ways to do something, pick the most common/standard one and tell me in one line why.
- Plain **JavaScript** (no TypeScript), using modern ES modules (`import`/`export`).
- **Ask me before adding any npm package that isn't listed in the Tech stack below.**

## Project overview

A web app for a small service business (barber, salon, clinic, tutor) where:

- **Customers** browse services, pick a date and an available time slot, book, and manage (cancel/reschedule) their bookings.
- **The business owner (admin)** manages services, working hours, blocked-off time, and sees/updates all bookings on a dashboard.

Single business, single provider (one booking at a time). Multi-staff is a future stretch goal — don't build for it yet.

The full step-by-step build plan lives in **`docs/PLAN.md`**. Always check it before starting work.

## Tech stack

**Backend (`/server`)**
- Node.js 20.19+ / Express 5 (async errors in route handlers reach the error middleware automatically — no `asyncHandler` wrapper needed)
- MongoDB + Mongoose
- Auth: JWT stored in an **httpOnly cookie**, passwords hashed with `bcryptjs`
- Validation: `zod`
- Dates/timezones: `luxon`
- Security: `helmet`, `cors`, `cookie-parser`, `express-rate-limit`
- Email: `nodemailer`
- Dev: `nodemon`, `dotenv`
- Tests: `vitest`, `supertest`, `mongodb-memory-server`

**Frontend (`/client`)**
- React + Vite
- React Router
- Tailwind CSS
- `axios` (one shared instance, `withCredentials: true`)
- `luxon` for displaying dates/times
- State: React Context for auth only; local component state for everything else (no Redux)

Use the latest stable versions. If the Context7 MCP is available, check current docs before using a library API you're unsure about.

## Folder structure

```
booking-app/
├── CLAUDE.md
├── README.md
├── package.json            # root: "dev" script runs client + server together (concurrently)
├── docs/PLAN.md
├── server/
│   ├── src/
│   │   ├── app.js          # express app (exported for tests)
│   │   ├── server.js       # connects DB + app.listen
│   │   ├── config/         # db.js, env.js (reads + validates env vars)
│   │   ├── models/         # Mongoose models, one per file
│   │   ├── routes/         # express routers, one per resource
│   │   ├── controllers/    # request/response handling
│   │   ├── services/       # business logic (availability, email) — no req/res here
│   │   ├── middleware/     # auth, requireAdmin, validate, errorHandler
│   │   ├── validators/     # zod schemas
│   │   └── utils/          # AppError, money helpers, etc.
│   ├── scripts/seed.js
│   ├── tests/
│   └── .env.example
└── client/
    ├── src/
    │   ├── api/            # axios instance + one file per resource (services.js, bookings.js…)
    │   ├── context/        # AuthContext.jsx
    │   ├── components/     # reusable UI (Button, Input, Spinner, ProtectedRoute…)
    │   ├── pages/          # one file per route; admin pages in pages/admin/
    │   ├── layouts/        # PublicLayout, AdminLayout
    │   └── utils/          # formatMoney, formatDateTime
    └── .env.example
```

## Commands

```bash
npm run dev                 # (root) client + server together
cd server && npm run dev    # API only, http://localhost:5000
cd server && npm test       # backend tests
cd server && npm run seed   # reset DB with demo data
cd client && npm run dev    # React app, http://localhost:5173
cd client && npm run build
```

In development, Vite proxies `/api` to `http://localhost:5000`, so the client always calls relative URLs like `/api/services`.

## Coding conventions

**General**
- `camelCase` for variables and functions; `PascalCase` for React components and Mongoose models.
- File names: `camelCase.js` for JS modules (e.g. `bookingController.js`), `PascalCase.jsx` for components (e.g. `BookingCard.jsx`), singular `PascalCase.js` for models (e.g. `Booking.js`).
- `async/await` everywhere, no `.then()` chains.
- Keep functions short. If a controller gets long, move logic into `services/`.

**API**
- All routes are prefixed with `/api`.
- Success response: `{ "data": ... }` with the right status code (200, 201).
- Error response: `{ "error": { "message": "...", "details": [...] } }` with the right status code (400 validation, 401 not logged in, 403 not allowed, 404 not found, 409 conflict e.g. slot taken).
- Throw `new AppError(message, statusCode)` in controllers/services; the central `errorHandler` middleware formats every error. Never send stack traces in production.
- Validate every request body/query with a zod schema via the `validate` middleware.

**React**
- Function components + hooks only.
- Every page that loads data must handle **loading**, **error** and **empty** states.
- All API calls go through `src/api/` — never call axios directly inside components.
- Mobile-first Tailwind: design for phone width, then add `md:` / `lg:` styles.

## Domain rules (important — don't break these)

**Time**
- Store all dates in MongoDB as UTC `Date`s.
- The business has a `timezone` setting (default `Africa/Lagos`). Working hours like `"09:00"` are in that timezone. Convert with Luxon; never use the server's local time.
- A date picked by the user is sent as `"YYYY-MM-DD"` and interpreted in the business timezone.

**Money**
- Store prices as **integers in the smallest unit** (kobo for NGN): ₦5,000 → `500000`. Never store floats.
- Format for display only, on the client (`formatMoney`).
- A booking copies the service price at booking time (`priceAtBooking`), so later price changes don't alter past bookings.

**Availability & double booking**
- `services/availability.js` is the **single source of truth** for which slots are free. The core function `generateSlots(...)` is a **pure function** (no DB calls) so it can be unit tested.
- Two time ranges overlap when `aStart < bEnd && bStart < aEnd`.
- When creating or rescheduling a booking, re-check the slot on the server using the same availability logic. Never trust the client.
- Only bookings with status `confirmed` block a slot.
- If a slot was taken in the meantime, return **409** with a friendly message.

**Roles**
- `customer` can only see and change **their own** bookings.
- `admin` can see and manage everything. Admin routes live under `/api/admin/*` and use `requireAuth` + `requireAdmin`.

## Security checklist (always)

- Never commit `.env`. Keep `.env.example` up to date when you add a variable.
- Never return `passwordHash` in any response (use `select: false` on the field).
- Rate-limit `/api/auth/login` and `/api/auth/register`.
- Cookies: `httpOnly: true`; in production also `secure: true, sameSite: "none"` (client and API are on different domains).
- CORS: only allow `CLIENT_URL`, with `credentials: true`.
- Don't log passwords, tokens or full request bodies.

## How to work on this project

1. Read `docs/PLAN.md`, find the **first unchecked task**, and work only on the current phase.
2. Before writing code for a non-trivial task, give me a short plan (files you'll touch, approach) in a few bullet points.
3. Make small, focused changes. After each task, run the relevant tests / start the app to check it works.
4. Tick the checkbox in `docs/PLAN.md` when a task is done (`- [x]`).
5. **Stop at the end of each phase** and give me a summary plus how to test it myself. Wait for me before starting the next phase.
6. Suggest a commit message at the end of each phase (conventional style, e.g. `feat(bookings): add cancel endpoint`).

**Tools, if connected**
- **Context7**: check up-to-date docs for Express 5, Mongoose, React Router, Tailwind, Luxon before using APIs you're unsure about.
- **MongoDB MCP**: use it to inspect the **local dev database** (e.g. confirm seed data or a created booking). Never point it at production.
- **Playwright MCP**: after building a page or flow, open it in the browser and click through it to verify it works, including on a phone-sized viewport.

## Don't

- Don't add TypeScript, Redux, Next.js, GraphQL, or a UI component library unless I ask.
- Don't rewrite or reformat files unrelated to the current task.
- Don't delete or skip failing tests to make them pass — fix the cause or tell me.
- Don't hardcode secrets, URLs or the business name — use env vars or the settings model.
- Don't move on to the next phase without my go-ahead.
