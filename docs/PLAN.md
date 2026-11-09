# Build Plan — Appointment Booking System

**How to use this file:** work through the phases in order. Each phase ends with a **"Done when"** check. Claude Code ticks tasks off (`- [x]`) as they're finished and stops at the end of every phase for review.

To start a session, open Claude Code in the project root and say:

> Read CLAUDE.md and docs/PLAN.md, then start the first unchecked task.

---

## Overview

### Data models

**User**
| Field | Type | Notes |
|---|---|---|
| name | String | required, trimmed |
| email | String | required, unique, lowercase |
| phone | String | optional |
| passwordHash | String | required, `select: false` |
| role | String | `"customer"` \| `"admin"`, default `"customer"` |
| timestamps | | `createdAt`, `updatedAt` |

**Service**
| Field | Type | Notes |
|---|---|---|
| name | String | required |
| description | String | optional |
| durationMinutes | Number | required, 5–480 |
| price | Number | integer, kobo |
| isActive | Boolean | default `true` (we never hard-delete services) |
| timestamps | | |

**Settings** (one document only)
| Field | Type | Notes |
|---|---|---|
| businessName | String | |
| phone, address | String | shown on the site and in emails |
| timezone | String | default `"Africa/Lagos"` |
| currency | String | default `"NGN"` |
| workingHours | Array | 7 items: `{ dayOfWeek: 1–7 (Mon=1, Luxon style), isOpen, open: "09:00", close: "17:00" }` |
| slotIntervalMinutes | Number | default 30 — how often a slot can start |
| minNoticeHours | Number | default 2 — can't book closer to now than this |
| bookingWindowDays | Number | default 30 — how far ahead customers can book |
| cancellationNoticeHours | Number | default 12 — customers can't cancel/reschedule later than this |

**BlockedTime** (holidays, lunch, personal time)
| Field | Type | Notes |
|---|---|---|
| start | Date | UTC |
| end | Date | UTC, must be after `start` |
| reason | String | optional |

**Booking**
| Field | Type | Notes |
|---|---|---|
| customer | ObjectId → User | required |
| service | ObjectId → Service | required |
| startTime | Date | UTC |
| endTime | Date | UTC, = start + service duration |
| status | String | `"confirmed"` \| `"cancelled"` \| `"completed"` \| `"no_show"`, default `"confirmed"` |
| priceAtBooking | Number | kobo, copied from service |
| notes | String | optional, from customer, max 500 chars |
| cancelledAt | Date | optional |
| cancelledBy | String | `"customer"` \| `"admin"` |
| timestamps | | |

Indexes: `{ startTime: 1, status: 1 }` and `{ customer: 1, startTime: -1 }`.

### API routes

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | public | health check |
| POST | `/api/auth/register` | public | create customer account, set cookie |
| POST | `/api/auth/login` | public | log in, set cookie |
| POST | `/api/auth/logout` | public | clear cookie |
| GET | `/api/auth/me` | logged in | current user |
| GET | `/api/settings` | public | public business info + hours |
| GET | `/api/services` | public | active services |
| GET | `/api/services/:id` | public | one service |
| GET | `/api/availability?serviceId=&date=YYYY-MM-DD` | public | free slots for a day |
| POST | `/api/bookings` | customer | create booking `{ serviceId, startTime, notes }` |
| GET | `/api/bookings/mine?scope=upcoming\|past` | customer | own bookings |
| PATCH | `/api/bookings/:id/cancel` | owner | cancel (respects notice rule) |
| PATCH | `/api/bookings/:id/reschedule` | owner | move to new `startTime` |
| GET | `/api/admin/bookings?date=&status=&page=` | admin | all bookings, filterable |
| PATCH | `/api/admin/bookings/:id/status` | admin | set confirmed/cancelled/completed/no_show |
| GET | `/api/admin/services` | admin | all services incl. inactive |
| POST | `/api/admin/services` | admin | create service |
| PATCH | `/api/admin/services/:id` | admin | edit / deactivate service |
| PUT | `/api/admin/settings` | admin | update settings |
| GET | `/api/admin/blocked-times?from=&to=` | admin | list blocked times |
| POST | `/api/admin/blocked-times` | admin | add blocked time |
| DELETE | `/api/admin/blocked-times/:id` | admin | remove blocked time |
| GET | `/api/admin/stats` | admin | today's bookings, this week's count + revenue, upcoming count |

### Pages

| Route | Page | Access |
|---|---|---|
| `/` | Home — hero, business info, featured services, "Book now" | public |
| `/services` | Services list (name, duration, price, Book button) | public |
| `/book/:serviceId` | Booking flow: pick date → pick slot → notes → confirm | public to view; login required to confirm |
| `/bookings/:id/confirmed` | Confirmation page | customer |
| `/login`, `/register` | Auth forms | public |
| `/my-bookings` | Upcoming + past bookings, cancel/reschedule | customer |
| `/admin` | Dashboard — stats + today's schedule | admin |
| `/admin/bookings` | All bookings, filter by date/status, change status | admin |
| `/admin/services` | Create/edit/deactivate services | admin |
| `/admin/settings` | Business info, working hours, booking rules | admin |
| `/admin/blocked-times` | Add/remove blocked time | admin |
| `*` | 404 page | public |

---

## Phase 0 — Project setup

- [x] Create root `package.json` with a `dev` script using `concurrently` to run client + server; add root `.gitignore` (node_modules, .env, dist, coverage)
- [x] Scaffold `server/` (`"type": "module"`), install backend packages from CLAUDE.md, add `dev`, `start`, `test`, `seed` scripts
- [x] `server/src/config/env.js`: load `.env`, check required vars exist (`MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`), exit with a clear message if missing
- [x] `server/src/config/db.js`: connect with Mongoose, log success/failure
- [x] `server/src/app.js`: helmet, cors (CLIENT_URL + credentials), `express.json()`, cookie-parser, `GET /api/health`, 404 handler, `errorHandler` middleware, `AppError` util
- [x] `server/src/server.js`: connect DB then listen on `PORT`
- [x] `server/.env.example` with every variable and a comment for each
- [x] Scaffold `client/` with Vite + React, install React Router, axios, luxon, Tailwind; set up Vite proxy `/api` → `http://localhost:5000`
- [x] `client/src/api/client.js`: shared axios instance (`baseURL: import.meta.env.VITE_API_URL || "/api"`, `withCredentials: true`)
- [x] Temporary home page that calls `/api/health` and shows "API connected ✅"
- [x] Basic `README.md` with setup steps

**Done when:** `npm run dev` from the root starts both apps and the home page shows "API connected ✅".

---

## Phase 1 — Authentication (backend)

- [x] `User` model (see table). Add a method `comparePassword(plain)`.
- [x] zod schemas: register (name, email, password min 8, optional phone), login
- [x] `validate(schema)` middleware → 400 with field details on failure
- [x] `POST /api/auth/register`: reject duplicate email (409), hash password, create user, set JWT cookie, return user (no hash)
- [x] `POST /api/auth/login`: generic "Invalid email or password" on any failure (don't reveal which), set cookie
- [x] `POST /api/auth/logout`: clear cookie
- [x] `requireAuth` middleware (reads cookie, verifies JWT, loads user to `req.user`, 401 if invalid) and `requireAdmin` (403 if not admin)
- [x] `GET /api/auth/me`
- [x] Rate-limit register + login (e.g. 10 requests / 15 min per IP)
- [x] Tests (vitest + supertest + mongodb-memory-server): register, duplicate email, login success/fail, `/me` with and without cookie

**Done when:** all auth tests pass and passwords never appear in any response.

---

## Phase 2 — Services, settings & blocked times (backend)

- [x] `Service` model + zod schemas (price must be a non-negative integer)
- [x] Public: `GET /api/services` (active only, sorted by name), `GET /api/services/:id` (404 if missing or inactive)
- [x] Admin: `GET/POST/PATCH /api/admin/services` (deactivate via `isActive: false`)
- [x] `Settings` model + helper `getSettings()` that returns the single document, creating it with defaults if none exists
- [x] `GET /api/settings` (public fields only) and `PUT /api/admin/settings` (validate times are `"HH:mm"` and `close > open`)
- [x] `BlockedTime` model + admin list/create/delete routes (validate `end > start`)
- [x] `scripts/seed.js`: wipe collections; create settings, admin (from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env), a demo customer (`demo@example.com` / `demo1234`), 5 realistic services (e.g. Haircut 30 min ₦5,000; Beard trim 15 min ₦2,500; Haircut + Beard 45 min ₦7,000; Kids cut 30 min ₦3,500; Dreadlocks retwist 90 min ₦15,000)
- [x] Tests: public vs admin access on service routes, settings validation

**Done when:** `npm run seed` works, services are visible at `/api/services`, and admin routes return 401/403 for the wrong users.

---

## Phase 3 — Availability engine (the core logic)

This is the most important part of the app. Keep it pure and well tested.

- [x] `services/availability.js` → **pure** function:
  ```js
  generateSlots({ date, service, settings, bookings, blockedTimes, now })
  // returns [{ start: ISOString(UTC), end: ISOString(UTC), label: "09:30" }]
  ```
  Steps:
  1. Read `date` (`"YYYY-MM-DD"`) in `settings.timezone` using Luxon.
  2. Return `[]` if the day is closed, in the past, or more than `bookingWindowDays` ahead.
  3. Build the open window from that day's `open`/`close`.
  4. Create candidate starts every `slotIntervalMinutes` from `open`, keeping only those where `start + durationMinutes <= close`.
  5. Drop candidates earlier than `now + minNoticeHours`.
  6. Drop candidates that overlap any confirmed booking or blocked time (`aStart < bEnd && bStart < aEnd`).
- [x] `getAvailableSlots(serviceId, date)` wrapper: loads service, settings, that day's confirmed bookings + blocked times from the DB, calls `generateSlots`
- [x] `GET /api/availability?serviceId=&date=` with zod validation of the query
- [x] **Unit tests for `generateSlots`** (no DB needed), at least:
  - [x] closed day → `[]`
  - [x] past date → `[]`; beyond booking window → `[]`
  - [x] 30-min service, 09:00–17:00, 30-min interval → 16 slots, first `09:00`, last `16:30`
  - [x] 90-min service doesn't get a slot that runs past closing
  - [x] existing 10:00–10:30 booking removes 10:00 for a 30-min service AND 09:30 for a 60-min service
  - [x] cancelled bookings do NOT block slots
  - [x] blocked time 13:00–14:00 removes overlapping slots
  - [x] min-notice rule removes slots too close to `now`
  - [x] times are correct in `Africa/Lagos` (09:00 local = 08:00 UTC)

**Done when:** all availability tests pass and the endpoint returns sensible slots for seeded services.

---

## Phase 4 — Bookings (backend)

- [x] `Booking` model with indexes
- [x] `POST /api/bookings` (customer):
  - service must exist and be active
  - `startTime` must be one of the slots returned by the availability logic for that day → otherwise **409** "Sorry, that time was just taken. Please pick another slot."
  - compute `endTime`, copy `priceAtBooking`, save
  - right before saving, run one more overlap query against confirmed bookings (protects against two people booking at the same moment); 409 if found
- [x] `GET /api/bookings/mine?scope=upcoming|past` (populate service name/duration)
- [x] `PATCH /api/bookings/:id/cancel`: only the owner; only `confirmed`; must be at least `cancellationNoticeHours` before start (else 400 with a clear message); set `cancelledAt`, `cancelledBy: "customer"`
- [x] `PATCH /api/bookings/:id/reschedule`: same ownership/notice rules; new slot must be available (ignore the booking's own current time when checking)
- [x] Admin: `GET /api/admin/bookings` (filter by `date` in business timezone and `status`, paginate 20/page, populate customer + service)
- [x] Admin: `PATCH /api/admin/bookings/:id/status`
- [x] Admin: `GET /api/admin/stats`
- [x] Seed: add ~8 demo bookings across past and next few days
- [x] Integration tests: create booking, double-booking same slot → 409, customer can't see/cancel someone else's booking (404), late cancellation → 400, reschedule happy path, admin status change

**Done when:** all tests pass; booking the same slot twice is impossible.

---

## Phase 5 — Email notifications

- [x] `services/email.js` with nodemailer; in development use an Ethereal test account (log the preview URL) when no SMTP vars are set
- [x] Simple HTML + plain-text templates: booking confirmed, booking cancelled, booking rescheduled (business name, service, date/time in business timezone, price, address)
- [x] Send after create/cancel/reschedule. **Email failures must not fail the request** — catch and log them.
- [x] Optional: email the admin when a new booking is made

**Done when:** creating a booking logs an Ethereal preview link showing a correct, readable email.

---

## Phase 6 — Frontend foundation

- [x] React Router setup with all routes from the Pages table (placeholder pages are fine)
- [x] `PublicLayout` (navbar with logo/business name, Services, My bookings / Login, Logout; footer) and `AdminLayout` (sidebar on desktop, top menu on mobile)
- [x] `AuthContext`: `user`, `loading`, `login`, `register`, `logout`; calls `/api/auth/me` on app load
- [x] `ProtectedRoute` (redirects to `/login?redirect=...`) and `AdminRoute`
- [x] Reusable components: `Button`, `Input`, `Select`, `Spinner`, `ErrorMessage`, `EmptyState`, `Modal` (for confirmations)
- [x] `utils/formatMoney.js` (kobo → "₦5,000") and `utils/formatDateTime.js` (Luxon, business timezone)
- [x] Login and Register pages with validation messages from the API; after login go to `redirect` param or home
- [x] `NotFound` page

**Done when:** you can register, log in, refresh the page and stay logged in, log out, and admin pages redirect non-admins.

---

## Phase 7 — Customer pages

- [x] Home page: hero with business name + "Book an appointment" button, short about section, services preview, opening hours, contact info
- [x] Services page: cards with name, description, duration, price, "Book" button
- [x] Booking flow `/book/:serviceId`:
  - [x] service summary at top
  - [x] date picker: next 14 days as tappable buttons (closed days disabled)
  - [x] slot grid for chosen date (loading + "No slots available, try another day")
  - [x] notes field + summary + "Confirm booking"
  - [x] if not logged in, send to login and come back to the same step afterwards
  - [x] on 409, show the message and refresh the slots
- [x] Confirmation page: details + "View my bookings" + "Add to calendar" (optional: download `.ics`)
- [x] My Bookings: Upcoming / Past tabs; status badges; Cancel (confirm modal) and Reschedule (reuse the slot picker); hide the buttons when inside the cancellation notice window, with an explanation
- [x] Verify the whole flow on a phone-sized screen (Playwright MCP if available)

**Done when:** a new customer can register, book, see, reschedule and cancel a booking on mobile without errors.

---

## Phase 8 — Admin pages

- [x] Dashboard: stat cards (today's bookings, upcoming, this week's revenue from `completed` bookings) + today's schedule list
- [x] Bookings page: date filter (default today), status filter, list/table with customer name + phone, service, time, status; buttons to mark Completed / No-show / Cancel; pagination
- [x] Services page: list incl. inactive; create/edit form (price entered in naira, converted to kobo before sending); activate/deactivate toggle
- [x] Settings page: business info, 7-day working hours editor (open toggle + time inputs), booking rules (interval, notice, window, cancellation notice)
- [x] Blocked times page: add (date + start/end time or "whole day") and delete; list upcoming
- [x] Verify each admin page in the browser (Playwright MCP if available)

**Done when:** the owner can run the business entirely from the admin pages — changes to hours, services and blocked times immediately affect the slots customers see.

---

## Phase 9 — Polish, demo-readiness & deploy

- [x] Consistent design pass: spacing, colors, typography, buttons; business name/branding from settings
- [x] Every page: loading, error and empty states; disable buttons while submitting
- [x] Friendly toast/inline messages for success and errors
- [x] Page titles per route; favicon
- [x] Basic accessibility: labels on inputs, keyboard-usable buttons, good color contrast
- [x] Seed script ready for demos; show demo logins on the login page **only when** `VITE_DEMO_MODE=true`
- [x] README: screenshots, features list, tech stack, setup, env vars, demo logins, live links
- [ ] Deploy: MongoDB Atlas (DB), Render or Railway (API), Vercel or Netlify (client); set production env vars; check cookies work cross-domain (`secure`, `sameSite: "none"`) and CORS allows the client URL
- [ ] Final click-through of every flow on the live site, desktop and mobile

**Done when:** there's a live link you can send to someone, with demo logins that work.

---

## Stretch goals (after v1)

- Paystack or Flutterwave deposit/payment at booking time
- SMS/WhatsApp reminders 24h before (e.g. Termii or Twilio) via a scheduled job
- Multiple staff members, each with their own hours and bookings
- Breaks inside working hours (e.g. daily lunch) without adding blocked time manually
- Customer "forgot password" via email
- Calendar (week) view in admin
- Multi-business (SaaS) version: each business gets its own URL and data
