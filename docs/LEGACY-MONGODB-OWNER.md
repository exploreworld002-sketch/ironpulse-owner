> ARCHIVED OWNER-ONLY WEB EDITION NOTES. This is not the licensed desktop product and must not be sent to clients. Desktop setup: OWNER-SETUP.md.

# Ironpulse Gym Management — local edition

React + Tailwind CSS + Recharts frontend, Node.js/Express API, MongoDB database with GridFS photo storage, JWT login and server-enforced Admin/Staff roles.

**No sample data is inserted.** A new installation has zero membership plans, members, payments and attendance. You choose the initial administrator credentials during setup. Only that requested admin account and an empty workspace are created on first launch. Existing databases are never wiped or reseeded.

## 1. Download and extract

Click `ironpulse-gym-management.zip` in the ChatGPT response and save it. On Windows, right-click the ZIP → **Extract All**. Open the extracted `ironpulse-gym-management` folder in VS Code, then open **Terminal → New Terminal**. Run every command below from this folder, which contains `package.json`.

Do not run the application from inside the ZIP viewer.

## 2. Requirements

- Node.js **24.x**, including npm.
- pnpm **11.25.0**: `npm install --global pnpm@11.25.0`
- Either a running **MongoDB Community** service / MongoDB Atlas connection, or **Docker Desktop** for the alternative below.
- Internet access for the initial dependency/image downloads. Dependencies and the database engine are not bundled in this source ZIP.

Confirm Node with `node --version`. If commands are not recognized after installing Node, close and reopen your terminal.

## 3. Native local setup (Windows, macOS or Linux)

```sh
pnpm install --frozen-lockfile
pnpm run setup
```

Setup asks for your name, admin email, a password of at least 12 characters, and your MongoDB URI. It generates a random JWT secret and creates `server/.env`. Password input is hidden. There are **no predefined login credentials**.

The default URI is:

```text
mongodb://127.0.0.1:27017/ironpulse_local
```

For local MongoDB, start the MongoDB service first. For Atlas, enter your connection URI and configure Atlas network access for your machine. Keep your database password in `server/.env`, never in source control.

```sh
pnpm build
pnpm start
```

Open **http://localhost:3000** and log in using the admin credentials you entered during setup. Keep the terminal running. Stop it with Ctrl+C.

Setup will not overwrite an existing `.env`. Edit that file manually to change connection settings. Changing `ADMIN_PASSWORD` after the account exists does not reset the existing database password.

### Manual setup instead of the prompt

Copy `server/.env.example` to `server/.env`. Fill in `MONGODB_URI`, `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Generate a unique JWT secret:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the result into `JWT_SECRET`. Keep `APP_ORIGIN=http://localhost:3000`, `PORT=3000`, and `NODE_ENV=development` for local use. Then build and start as above.

## 4. Docker alternative (app and database together)

Install Node 24 and Docker Desktop; ensure Docker is running. From the extracted folder:

```sh
node server/setup.mjs
docker compose up --build
```

Use **http://localhost:3000**. Compose supplies the internal MongoDB URI automatically, so no separate MongoDB installation is required. Only the application port is exposed, on your local machine. This configuration is intended for local use.

Stop with Ctrl+C, then `docker compose down`. Restart with `docker compose up`. Records and uploaded photos survive restarts in the `gym_database` volume. **Do not use `docker compose down -v` unless you intend to delete your database.**

## 5. First use

1. Open **Settings** and enter your gym name, contact information, address and renewal notice period.
2. Open **Memberships → Create plan**. Enter your own monthly, quarterly, annual or custom plans and prices.
3. Use **Edit** on a plan to change its name, duration, price or description. Existing member fees/dates and payment history are preserved; the edited price applies to subsequent enrolments and renewals.
4. Add members with contact details, emergency contact, membership dates, total fees and a due date. Photos are optional.
5. Record payments in **Payments**. Full and partial payments are supported; overpayment and future-dated payments are rejected.
6. Open a member profile to see payment/attendance history or **Renew membership**. Renewal adds the selected plan’s price to total fees and retains previous payments and outstanding dues. Active memberships renew immediately after their current end date and stay active.
7. Use **Attendance** for daily check-in. Duplicate daily check-ins and check-ins for expired/future memberships are rejected.
8. Use **Reports** for revenue, current membership term counts, attendance and payment dues. Excel export uses SpreadsheetML `.xls`; PDF uses your browser’s Print → Save as PDF.
9. Administrators can create Staff or Admin accounts in **Settings**. Staff cannot delete members, modify plans/settings, restore data, or create users. These checks are enforced by the API.

## 6. Database and backups

MongoDB collections and unique indexes are created automatically on first start. There is no SQL import or demo-seed step.

- `users`: your admin/staff accounts, bcrypt password hashes and session version.
- `gymstates`: members, membership plans, payments, attendance, settings and activity records in one versioned workspace document.
- `photos.files` / `photos.chunks`: uploaded member photos in GridFS.

The schema definitions are in `server/index.mjs`, with business-data validation in `lib/gym.ts`. The `db/` and `drizzle/` directories belong to the optional original hosted adapter and are **not used by the local MongoDB application**.

**Settings → Download backup** exports business records as JSON. Restore validates references, duplicate records and payment totals, then replaces the current workspace after confirmation. This JSON backup does **not** include login accounts or photo bytes. Photo references work only while the original GridFS files still exist.

For a complete portable database backup (accounts, records and photos), install MongoDB Database Tools and run:

```sh
mongodump --uri="mongodb://127.0.0.1:27017/ironpulse_local" --archive=ironpulse-full.archive --gzip
```

Restore to a fresh local database:

```sh
mongorestore --uri="mongodb://127.0.0.1:27017/ironpulse_local" --archive=ironpulse-full.archive --gzip
```

For Docker, run the tools inside the MongoDB container, then copy the archive out:

```sh
docker compose exec mongo mongodump --db=ironpulse_local --archive=/tmp/ironpulse-full.archive --gzip
docker compose cp mongo:/tmp/ironpulse-full.archive ./ironpulse-full.archive
```

Back up `server/.env` separately in a secure location. No live records, passwords, `.env` secrets, or database dump are shipped with this source ZIP.

## 7. Development and verification

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

After editing frontend files, rerun `pnpm build` and refresh the browser. `pnpm dev` restarts the backend on source changes; it serves the last built frontend and is not a frontend hot-reload server.

The source includes domain regression tests and an API integration test runner (`server/integration.test.mjs`). Integration tests require the separately documented isolated test server and create disposable test records only. Normal startup never runs tests or inserts their fixtures.

## 8. Troubleshooting

- **MongoDB connection refused:** start your MongoDB service or Docker Desktop. Verify `MONGODB_URI`.
- **Missing JWT secret/admin configuration:** run `pnpm run setup`, or fill in the manual environment file.
- **Invalid request origin:** open exactly `http://localhost:3000`. If changing the port or hostname, update `APP_ORIGIN` and restart.
- **No plans yet:** create your first plan before adding a member. The app intentionally starts empty.
- **Port 3000 in use:** stop the other process or change both `PORT` and `APP_ORIGIN`. For Docker, adjust the Compose port mapping as well.
- **Another edit was saved:** another tab updated the workspace. Reload before retrying to avoid overwriting its changes.
- **Session expired:** sign in again; sessions expire after eight hours.
- **Admin details in `.env` do not change the existing login:** initial provisioning happens once. Use a fresh database for a new installation; never delete a database containing records you need.

## 9. Scope and important behaviour

SMS/WhatsApp/email reminders are deliberately **preview-only**. No messages are sent, and no provider credentials are included. QR check-in, automated password recovery and payment-provider processing are not implemented. Membership renewals preserve payment history and log the new period, but this is not a full invoice-per-term accounting system. Growth charts count current membership start dates; they are not a historical acquisition ledger.

All dates and check-in times use UTC. Monetary comparisons and balance sums use integer paise; amounts are stored/displayed as rupees with up to two decimal places. Deleting a member removes associated payments and attendance after explicit confirmation.

The database uses one versioned workspace document, capped at 12 MB. This is suitable for a small local gym; a larger deployment should split high-volume records into separate indexed collections. The request limiter assumes one server instance. Test deployment configuration and backup recovery before using real member data. Docker/container execution and visual browser behaviour may need verification on your machine; see `VERIFICATION.md` for checks actually completed here.

For a public production deployment use HTTPS, `NODE_ENV=production`, the exact HTTPS `APP_ORIGIN`, your own strong credentials, secure database access, and a correctly configured reverse proxy. Do not expose the local Docker configuration directly to the internet.

## Source layout

- `standalone/`: local React entrypoint and frontend build configuration.
- `app/gym-app.tsx`, `app/globals.css`: gym interface and styling.
- `components/`, `hooks/`: reusable UI primitives and helpers.
- `lib/gym.ts`, `lib/gym-operations.ts`: shared validation, date and money helpers, business operations.
- `server/`: Express API, MongoDB schemas, login, setup utility and tests.
- `compose.yaml`, `Dockerfile`: optional local app/database containers.
- Original hosted adapter files are retained for source completeness; local startup does not contact ChatGPT or require a ChatGPT account.
