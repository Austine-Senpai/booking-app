# Appointment Booking System

A booking web app for a small service business (barber, salon, clinic, tutor). Customers pick a service, a date and a free time slot, then manage their bookings. The owner manages services, working hours, blocked time and all bookings from an admin dashboard.

**Stack:** MongoDB · Express 5 · React (Vite) · Node.js · Tailwind CSS

> 🚧 Work in progress — see [`docs/PLAN.md`](docs/PLAN.md) for the build plan.

## Prerequisites

- Node.js **20.19+**
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas connection string

## Setup

```bash
# 1. Install dependencies for root, server and client
npm run install:all

# 2. Create the server's env file, then edit it
cp server/.env.example server/.env
#    - set JWT_SECRET to a long random string:
#      node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#    - change MONGODB_URI if you're not using local MongoDB

# 3. (Optional) client env — not needed for local development
cp client/.env.example client/.env

# 4. Start the API and the React app together
npm run dev
```

- React app: http://localhost:5173
- API: http://localhost:5000 (health check: http://localhost:5000/api/health)

In development, Vite forwards every `/api/...` request to the API, so the client always uses relative URLs.

## Scripts

| Where | Command | What it does |
|---|---|---|
| root | `npm run dev` | API + React app together |
| root | `npm run install:all` | install all dependencies |
| server | `npm run dev` | API only, restarts on file changes |
| server | `npm test` | backend tests |
| server | `npm run seed` | reset the database with demo data |
| client | `npm run dev` | React app only |
| client | `npm run build` | production build into `client/dist` |

## Environment variables

Every variable is listed with a comment in [`server/.env.example`](server/.env.example) and [`client/.env.example`](client/.env.example).
