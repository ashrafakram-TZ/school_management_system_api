# School Management API

NestJS backend for the Tamilzorous School Management System: one API and one PostgreSQL database for the Admin web and the Flutter app (Staff, Parent and Driver roles). Bus tracking is a separate project, the **Telematics service** (`C:/Users/DELL/telematics-service`, port 3001). This API only reads bus status from it over HTTP.

Stack: NestJS 10, TypeORM, PostgreSQL.

For the Flutter team: [docs/api-guide.md](docs/api-guide.md) covers sign-in, payloads, errors, push and files.

## Setup

```bash
npm install
cp .env.example .env
npm run migration:run
npm run seed:demo        # local only: demo school, super admin and one user per role
npm run start:dev
```

For a real installation run `npm run seed` (roles, permissions and message templates only) and then
`npm run seed:super-admin -- --mobile 9xxxxxxxxx --name "Full Name"`. Schools and their users are created
from the admin web by the super admin, never from `.env`, so one installation can serve many schools.

Requirements: Node 20+, PostgreSQL 14+, and the Telematics service for bus tracking (everything else works without it). Every setting comes from `.env`; the app stops at startup with a clear message if a value is missing or invalid. Generate `JWT_ACCESS_SECRET` and `FILE_SIGNING_SECRET` with 48 random bytes each.

All seed commands are safe to run again. Demo data lives in `apps/school-api/src/database/seeds/demo.data.ts` and is refused in production.

`PUBLIC_BASE_URL` can stay empty: it defaults to `http://localhost:PORT`. Set it only when phones must open file links, for example `http://192.168.1.71:3000` on your Wi-Fi or the real domain on a server.

In development `OTP_MODE=test`: the OTP is `OTP_TEST_CODE` (default `123456`) and no SMS is sent. Production refuses test mode.

Swagger is split in two outside production: `/api/docs/admin` for the web and `/api/docs/mobile` for the Flutter app (JSON at `/api/docs/admin-json` and `/api/docs/mobile-json`). `/api/docs` has a dropdown for both.

Times are stored in UTC and returned in `APP_TIMEZONE` (default `Asia/Kolkata`), e.g. `2026-10-29T13:00:06.000+05:30`.

## Switches

Services that need extra infrastructure sit behind `.env` switches. This phase runs without Docker; turning a service on later needs no code change.

| Setting | Now | Later |
|---|---|---|
| `STORAGE_DRIVER` | `local` (folder `STORAGE_LOCAL_DIR`) | `s3` |
| `QUEUE_DRIVER` | `memory` (in-process, retries with backoff) | `redis` |
| `VIRUS_SCAN` | `off` (files marked `not_scanned`) | `clamav` |
| `SMS_DRIVER` | `log` (written to the outbox, not sent), `ping4sms` or `kafka` | |
| `OTP_SMS_DRIVER` | Optional, local sign-in only: `kafka` (default, `otp` template) or `ping4sms` (needs `PING_*`) | |
| `PUSH_DRIVER` | `off` or `fcm` (needs `FIREBASE_CREDENTIALS_FILE`) | |
| `OTP_MODE` | `test` or `sms` | |

## SMS through Kafka

The same setup SoftSilk uses: the API publishes a message to the Kafka topic `notifications` (`NOTIFY_KAFKA_TOPIC`) and the central Tamilzorous notification service renders the template and sends it.

```json
{ "type": "sms", "tenantId": "<NOTIFY_TENANT_ID>", "to": "919876543210",
  "templateId": "school_student_absent", "variables": { "name": "Lakshmi", "student": "Kavin", "class": "6-A", "date": "02 Nov 2026" } }
```

- `templateId` is `NOTIFY_TEMPLATE_PREFIX` + the template code in lowercase (`STUDENT_ABSENT` → `school_student_absent`). Each one must exist in the central service with these variable names; the codes and variables are in `apps/school-api/src/modules/notifications/notification-templates.catalog.ts`.
- With `OTP_SMS_DRIVER=kafka` the OTP uses the shared `otp` template with `otp`, `expiry`, `name` and `mobile`.
- Broker, user, password and tenant id come only from `.env`. If Kafka is down the app still starts; SMS are retried and then show as failed in the outbox.

## API conventions

- Base path `/api/v1`. A `v2` route is added only for a breaking change; `v1` keeps working.
- Families: `/auth` and `/me` (every app), `/admin/*` (web), `/mobile/parent|teacher|driver/*` (Flutter), `/admin/fleet/*` (bus status read from the Telematics service), `/files`.
- Every route needs a Bearer token unless marked `@Public()`. `@RequirePermissions()` and `@RequireRoles()` restrict it further.
- Lists accept `page`, `limit`, `search`, `sort`, `order` and documented filters. Unknown query parameters are rejected.

```json
{ "status": 200, "message": "OK", "data": {} }
{ "status": 200, "message": "OK", "data": { "items": [], "total": 0, "page": 1, "limit": 20, "total_pages": 0, "has_next": false } }
{ "status": 400, "error": "VALIDATION_FAILED", "message": "...", "errors": [{ "field": "mobile", "message": "..." }] }
```

Errors are produced in one place, `libs/common/src/filters/all-exceptions.filter.ts`. Services throw `AppException` with an optional code (for example `AppException.unauthorized('...', 'OTP_INVALID')`). Postgres constraint errors are mapped automatically. Unknown errors return 500 with a generic message; the stack goes to the log with the request id.

## Bus tracking (Telematics service)

Trackers, MQTT and GPS storage live in the separate Telematics service, with its own database and Swagger (`http://<server>:3001/api/docs`). This API calls it server to server:

| Setting | Example | Purpose |
|---|---|---|
| `TELEMATICS_API_URL` | `http://localhost:3001/api/v1` | Base URL of the Telematics service (LAN IP or domain on a server) |
| `TELEMATICS_API_KEY` | 48 random characters | One of the keys in the service's `API_KEYS` |
| `TELEMATICS_TIMEOUT_MS` | `5000` | Give up after this long |

Read-only routes for the web and apps: `GET /admin/fleet/live`, `GET /admin/fleet/vehicles/{id}`, `GET /admin/fleet/vehicles/{id}/positions`. If the service is down they return `503 TELEMATICS_UNAVAILABLE` and everything else keeps working. `GET /api/health` reports `db` and `telematics`.

## Scripts

| Script | Purpose |
|---|---|
| `start:dev` / `build` / `start:prod` | Watch mode, compile, run the build |
| `lint` / `format` | ESLint and Prettier |
| `test` / `test:cov` | Unit tests (no database needed) |
| `test:e2e` | Smoke tests against a migrated database |
| `migration:generate -- apps/school-api/src/database/migrations/Name` | Generate a migration from entity changes |
| `migration:run` / `migration:revert` | Apply or roll back migrations |
| `seed` | Roles, permissions and templates (safe for production) |
| `seed:demo` | Above plus the demo school, super admin `9999999999` and one user per role (local only) |
| `seed:super-admin -- --mobile <m> --name "<n>"` | Create or update a platform super admin |

## Structure

```
apps/school-api/src/
  main.ts, app.module.ts, app.setup.ts, swagger.ts
  config/                 env validation and typed config
  database/               TypeORM module, CLI data source, migrations, seeds
  shared/                 mobile number and crypto helpers
  modules/
    auth/                 OTP, tokens, guards
    access/               roles, permissions catalog
    users/                users, /me, push devices
    notifications/        templates, dispatch, push, SMS fallback, outbox, queue
    files/                uploads, signed links, local storage
    fleet/                read-only bus status from the Telematics service
    schools/ sms/ health/ jobs/
libs/common/src/          AppException, error filter, response interceptor, list/search helpers,
                          base entities, request context, auth decorators, Swagger helpers
```
