# iMovies — cinema ticket booking platform

A full-stack React + Express + MongoDB application foundation for discovering films, selecting cinema seats, placing temporary holds, managing bookings, and processing development payments. The interface is responsive and cinematic; the API is modular and uses cookie-based JWT authentication, role checks, Mongoose models, request validation, rate limits, and structured state records.

> **Important status note:** this repository is a working project foundation, not a claim of production readiness. Demo payment is simulated and clearly separated from Razorpay. The Razorpay order and signature-verification adapter is scaffolded, but provider capture/reconciliation, fully transactional seat allocation, email-based password reset, full CRUD admin screens, and end-to-end tests require further implementation before a public launch. Never use demo mode to collect real money.

## Stack

- Frontend: React 18, Vite, React Router, Axios, Socket.IO client, Lucide icons, react-hot-toast.
- Backend: Node.js 22+, Express, Mongoose, MongoDB, JWT in HTTP-only cookies, bcrypt, Zod, Helmet, CORS, rate limiting, Socket.IO.
- Payments: explicitly simulated demo adapter by default; Razorpay order creation and signature validation scaffolding.
- Digital tickets: QR code generation and opaque ticket-token verification endpoint.

## Requirements

- Node.js 20+ and npm 10+
- MongoDB replica set recommended (transactions are needed for a robust production booking flow); MongoDB Atlas is suitable.

## Quick start

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit server/.env: set a random JWT_ACCESS_SECRET (32+ chars) and MONGODB_URI.
npm install
npm run seed
npm run dev
```

Frontend: `http://localhost:5173`  
API health: `http://localhost:4000/api/v1/health`

If your local MongoDB is standalone, use a replica-set URI such as `mongodb://127.0.0.1:27017/imovies?replicaSet=rs0` and initialize a local replica set. Example `mongod --replSet rs0 --dbpath ./data` then in `mongosh`, run `rs.initiate()`. For production, use MongoDB Atlas and verify transactions are supported by the selected cluster tier.

## Environment variables

Server (`server/.env`):

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | API port, default 4000 |
| `MONGODB_URI` | MongoDB connection string |
| `CLIENT_URL` | Explicit comma-separated allowed frontend origins |
| `JWT_ACCESS_SECRET` | Random secret, at least 32 characters |
| `COOKIE_SECURE` | `true` behind HTTPS in production |
| `PAYMENT_MODE` | `demo` or `razorpay` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Server-side Razorpay test/live credentials |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signing secret |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Reserved for email provider configuration |
| `ADMIN_BOOTSTRAP_SECRET` | Reserved for future bootstrap tooling; no public promotion endpoint exists |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` | Optional one-time private seed-time admin bootstrap. Keep out of source control and remove after use. Password must be 14+ characters. |

Client (`client/.env`):

- `VITE_API_BASE_URL` — defaults to `http://localhost:4000/api/v1`.
- `VITE_PAYMENT_MODE` — UI label only; the server's `PAYMENT_MODE` is authoritative.
- `VITE_RAZORPAY_KEY_ID` — public key ID only if a Razorpay checkout UI is wired in. Never place a secret in a `VITE_` variable.

## Demo data and admin bootstrap

`npm run seed` creates/updates 12 movie records, theaters in Mumbai, Delhi, and Bengaluru, seat layouts, and upcoming shows. It does not create an administrator unless `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are set in the server environment. Set those temporarily in a private local environment, run the seed command, then remove the variables. Never expose bootstrap credentials in a deployed build or commit them to Git.

## Booking flow

1. Browse movies and open a movie detail page.
2. Choose a showtime (requires seeded MongoDB data).
3. Select seats and request a server-side temporary hold (5 minutes).
4. Create a pending booking. Subtotal, fees, taxes, and total are calculated by the server.
5. In demo mode, use the explicit simulated payment endpoint; the booking becomes confirmed only after the server processes that request.
6. View the booking in My Bookings. Confirmed tickets have an opaque token and a QR verification endpoint.

The API checks active holds, expires holds periodically, validates seat membership and ownership, and rejects confirmed-seat conflicts. **Production caveat:** to guarantee correctness under heavy concurrent load, replace the remaining read-then-write hold flow with a MongoDB transaction plus a unique per-show/per-seat reservation ledger or atomic conditional reservation documents. Socket.IO rooms are set up by show ID, but the current client UI does not yet subscribe to events. For multiple API instances, configure a shared Socket.IO adapter such as Redis.

## Razorpay test mode

Set `PAYMENT_MODE=razorpay` and configure test credentials on the server. The API creates Razorpay orders and verifies HMAC signatures. The UI currently reports that the checkout adapter needs configuration; wire the official Razorpay Checkout script to the order response before attempting an actual test checkout. Real payment confirmation is intentionally not finalized by the current verify handler: implement server-side provider status fetch, captured-payment validation, transactionally safe booking confirmation, webhook reconciliation, duplicate-event processing, and refund recovery before enabling live payments. Configure the webhook endpoint at `/api/v1/payments/webhook`; its raw request body is retained for signature verification.

## API overview

All routes use `/api/v1`.

- `GET /health`
- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`
- Movies: `GET /movies`, `GET /movies/:id`, admin `POST /movies`, `PATCH /movies/:id`, `DELETE /movies/:id` (archives)
- Theaters: `GET /theaters`, `GET /theaters/:id`
- Shows: `GET /shows`, `GET /shows/:id`, `GET /shows/:id/seats`, admin CRUD is still to be completed
- Holds/bookings: `POST /shows/:id/holds`, `DELETE /holds/:id`, `POST /bookings`, `GET /bookings/my`, `GET /bookings/:id`, `POST /bookings/:id/cancel`
- Payments: `POST /payments/orders`, `POST /payments/verify`, `POST /payments/webhook`
- Profile/watchlist: `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/password`, `GET /users/me/watchlist`, `POST|DELETE /users/me/watchlist/:movieId`
- Admin: `GET /admin/overview`, `GET /admin/users`, `GET /admin/bookings`
- Ticket verification: `GET /tickets/verify/:token`

Responses use JSON; errors return `{ "message": "..." }`. Collection endpoints include pagination where implemented. Admin writes require server-side `admin` role. The current password-reset request endpoint returns a generic response, but token issuance/email delivery and token redemption are not implemented yet.

## Folder structure

```text
client/
  src/App.jsx                 Pages, navigation, movie discovery, booking UI
  src/context/AuthContext.jsx Cookie-auth context
  src/lib/api.js              Axios API client
  src/styles.css              Responsive cinematic design system
server/
  src/app.js                  Express middleware and routes
  src/server.js               HTTP + Socket.IO startup/shutdown
  src/config/db.js            MongoDB connection
  src/models/index.js          Mongoose models and indexes
  src/middleware/auth.js       Authentication and RBAC
  src/middleware/errors.js     Central error handling
  src/routes/index.js          REST endpoints
  src/services/booking.js      Hold, booking, payment-demo state transitions
  src/seed.js                  Demo data seed and optional private admin bootstrap
```

## Build and tests

```bash
npm run build
npm test
```

The server test command uses Node's built-in test runner; the client test command uses Vitest. In this build environment, `node --check` passed for all server JavaScript and TypeScript transpilation parsing passed for client JS/JSX. `npm install` could not complete because the npm registry was unreachable (`EAI_AGAIN`), so dependency-based tests and a production build could not be executed here. The included smoke tests are present but remain unexecuted in this environment. At the current foundation stage, automated behavioral tests are still to be added. Validate auth, concurrent seat holds, expiry, payment signatures/webhooks, cancellation/refund paths, and role checks before production.

## Deployment checklist

1. Deploy MongoDB Atlas with backups and transaction support.
2. Set strong secrets and provider credentials only in hosting environment settings.
3. Deploy `server` to a Node host; set `NODE_ENV=production`, `COOKIE_SECURE=true`, `CLIENT_URL` to the exact HTTPS frontend origin.
4. Build/deploy `client` to Vercel or Netlify with `VITE_API_BASE_URL` set to the API URL.
5. Configure HTTPS, trusted proxy behavior, logs without PII, alerting, backups, and provider webhooks.
6. Finish production payment reconciliation and concurrency-safe reservation ledger before collecting real payments.
7. Add full admin management screens, reset-password token delivery, email notifications, account deletion/data retention, cancellation policy configuration, accessibility audit, and end-to-end tests.

## Known limitations

- Demo fallback movie cards are included so the interface renders without a database, but real search/showtimes/bookings require MongoDB and seeded data.
- The app uses sample movie metadata/poster URLs; replace with verified licensed artwork before commercial use.
- The UI includes route placeholders for some secondary pages; profile editing and complete admin CRUD screens are not yet complete.
- Live Socket.IO seat updates are not wired into the seat-map client yet.
- The real Razorpay checkout and verified captured-payment reconciliation must be completed before use.
- Email notifications and password-reset delivery are not enabled.
- This code has not been externally security-audited. Perform threat modeling, dependency scans, concurrency testing, and legal/privacy review before production.
