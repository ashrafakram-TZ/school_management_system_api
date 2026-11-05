# Multi-tenancy — School Management API (backend)

The build spec for turning the School API into a multi-tenant SaaS product sold by Tamilzorous to many school groups, each with many branches. Follow it top to bottom. Every rule here is a hard rule unless it says "optional".

Reference implementation that already works in production: `C:\Users\DELL\NOOL360\softsilk_api` (`src/middlewares/tenancy/*`, `src/modules/admin/provisioning/*`, `src/app.migration.service.ts`, `migrations/public` + `migrations/tenanted`). This spec keeps its proven parts (database per tenant, master registry, provisioning job, per-tenant migration on boot, subscription gate) and fixes its weak points (raw-SQL base schema that drifts from migrations, UUID keys, double header, race on first connection, cron/socket leaks).

Telematics (`C:\Users\DELL\telematics-service`) is **out of scope**. It stays single-tenant for now.

---

## 1. Words used in this document

| Word | Meaning | Example |
|---|---|---|
| **Platform** | Tamilzorous itself: the company that sells the product | — |
| **Platform admin** | A Tamilzorous employee who creates and bills tenants | `admin.tamilzorous.com` |
| **Tenant** | One customer = one school group / trust | Sri Vidya Educational Trust |
| **Tenant code** | Short unique id of a tenant, used in the URL and the header | `srividya` |
| **Branch** | One school inside a tenant. This is today's `schools` row (`school_id`) | Sri Vidya – Coimbatore |
| **Group admin** | The tenant's top user. Today's `SUPER_ADMIN` role, now limited to its own tenant | Trust correspondent |
| **Master DB** | One Postgres database for the platform: tenants, plans, subscriptions, invoices, platform admins | `tamilzorous_platform` |
| **Tenant DB** | One Postgres database per tenant with every school table we have today | `tzs_srividya` |

Nothing inside a tenant changes: branches, `school_id` scoping, roles, permissions, `X-School-Id` for the group admin all work exactly as now.

---

## 2. Architecture

```
                    ┌────────────────────────────── Master DB (tamilzorous_platform) ─┐
                    │ tenants · plans · plan_features · tenant_subscriptions          │
                    │ subscription_history · tenant_invoices · tenant_invoice_lines   │
                    │ tenant_payments · invoice_counters · provisioning_jobs          │
                    │ platform_admins · platform_sessions · platform_audit_logs       │
                    └──────────────────────────────▲──────────────────────────────────┘
                                                   │ lookup tenant by code (cached 60 s)
 Web  srividya.tamilzorous.com ─┐                  │
 App  header x-tenant-id ───────┼─► TenantMiddleware ─► AsyncLocalStorage { tenant, dataSource }
                                │                                   │
                                │          ┌────────────────────────┼─────────────────────┐
                                │          ▼                        ▼                     ▼
                                │   tzs_srividya (DB)        tzs_greenvalley (DB)   telematics (DB = tenant "demo")
                                │   all current tables       all current tables     all current tables
 Platform console admin.tamilzorous.com ─► /api/v1/platform/* (master DB only, no tenant)
```

Rules:

1. **Database per tenant.** Never put two tenants' rows in one tenant DB. No `tenant_id` column is added to school tables.
2. **The master DB never stores school data** (students, staff, fees…). Only platform data.
3. **One codebase, one deployment, one migration folder for tenant DBs** (`apps/school-api/src/database/migrations`, the folder we already have). A new tenant DB is built by running **the same TypeORM migrations** that every other tenant ran. There is no separate "base SQL" snapshot (that is the softsilk weakness: the snapshot drifts from the migrations).
4. Master DB has its own migration folder: `apps/school-api/src/database/platform-migrations`.
5. Integer primary keys everywhere, including the master DB (our rule, not UUIDs like softsilk).

---

## 3. URLs and environments

A tenant's web URL is `<protocol>://<tenant code>.<APP_BASE_DOMAIN><port>`. The backend builds it from `.env`; nothing is hardcoded.

| Environment | `.env` | Tenant URL | Platform console |
|---|---|---|---|
| **Local** | `APP_BASE_DOMAIN=localhost` `APP_WEB_PORT=5173` | `http://srividya.localhost:5173` | `http://admin.localhost:5173` |
| **Dev / testing** | `APP_BASE_DOMAIN=dev.tamilzorous.com` | `https://srividya.dev.tamilzorous.com` | `https://admin.dev.tamilzorous.com` |
| **Live** | `APP_BASE_DOMAIN=tamilzorous.com` | `https://srividya.tamilzorous.com` | `https://admin.tamilzorous.com` |

- **Protocol is automatic:** `http` when the base domain is `localhost` (or ends with `.localhost`), `https` for everything else. `APP_PROTOCOL` (optional) overrides it.
- **Port** is added only when `APP_WEB_PORT` is set (local). Leave it empty on dev and live.
- If the product domain changes (for example `myschool.tamilzorous.com`), only `APP_BASE_DOMAIN` changes. Nothing else does.
- `*.localhost` resolves to `127.0.0.1` in Chrome, Edge and Firefox without editing the hosts file. Nothing to install locally.
- Dev and live need **wildcard DNS** (`*.tamilzorous.com` and `*.dev.tamilzorous.com` → server IP), a **wildcard TLS certificate** (Let's Encrypt DNS-01) and nginx `server_name *.tamilzorous.com;` serving the same web build. The API stays on its own host (`api.tamilzorous.com`, `api.dev.tamilzorous.com`) or under `/api` on the same host.

```ts
export function workspaceUrl(code: string, app: AppConfig): string {
  const base = app.base_domain.toLowerCase();
  const local = base === 'localhost' || base.endsWith('.localhost');
  const protocol = app.protocol ?? (local ? 'http' : 'https');
  const port = app.web_port ? `:${app.web_port}` : '';
  return `${protocol}://${code}.${base}${port}`;
}
```

### Tenant code rules

- Regex `^[a-z][a-z0-9-]{1,28}[a-z0-9]$` (3–30 characters, lowercase, starts with a letter, no trailing hyphen, no double hyphen).
- Reserved, never allowed: `admin www api app dev staging test demo-admin mail smtp static assets cdn files tenant tenants signup login help support status docs platform tamilzorous`.
- Unique in `tenants.code`, case-insensitive. **Never changes after creation** (it is in URLs, QR codes, the DB name and the mobile app's stored workspace).
- DB name = `TENANT_DB_PREFIX` + code with `-` → `_` (`tzs_sri_vidya`), max 63 characters. Validate the code with the regex **before** building `CREATE DATABASE "<name>"`, because a database name cannot be a bound parameter.

---

## 4. Environment settings

Add to `env.validation.ts` (fail fast) and to `.env.example` with placeholders. Never commit `.env`.

| Key | Local | Dev | Live | Notes |
|---|---|---|---|---|
| `PLATFORM_DB_NAME` | `tamilzorous_platform` | same | same | Master DB, same server and user as `DB_*` |
| `DB_NAME` | `telematics` | — | — | Kept only as the database of the first tenant `demo` (section 13) |
| `TENANT_DB_PREFIX` | `tzs_` | `tzs_` | `tzs_` | |
| `TENANT_DB_POOL_SIZE` | `5` | `5` | `10` | Pool per tenant connection |
| `TENANT_DB_MAX_OPEN` | `20` | `50` | `200` | Max open tenant connections; least recently used is closed |
| `TENANT_DB_IDLE_MINUTES` | `15` | `15` | `30` | Close a tenant pool after this idle time |
| `TENANT_MIGRATIONS_ON_BOOT` | `true` | `true` | `true` | Run pending tenant migrations for every active tenant at start |
| `APP_BASE_DOMAIN` | `localhost` | `dev.tamilzorous.com` | `tamilzorous.com` | |
| `APP_WEB_PORT` | `5173` | *(empty)* | *(empty)* | |
| `APP_PROTOCOL` | *(empty)* | *(empty)* | *(empty)* | Optional override `http`/`https` |
| `PLATFORM_SUBDOMAIN` | `admin` | `admin` | `admin` | Host of the platform console |
| `TENANT_HEADER_REQUIRED` | `false` | `false` | `true` | `false` = requests without `x-tenant-id` go to `DEFAULT_TENANT_CODE` (transition for the mobile app) |
| `DEFAULT_TENANT_CODE` | `demo` | `demo` | *(empty)* | Must be empty when the header is required |
| `PLATFORM_JWT_SECRET` | random 64 | random 64 | random 64 | Separate from `JWT_ACCESS_SECRET` |
| `BILLING_TRIAL_DAYS` | `30` | `30` | `30` | |
| `BILLING_GRACE_DAYS` | `7` | `7` | `7` | Days after an invoice due date before suspension |
| `BILLING_INVOICE_DUE_DAYS` | `10` | `10` | `10` | Due date = issue date + this |
| `BILLING_GST_PERCENT` | `18` | `18` | `18` | |
| `BILLING_SELLER_NAME` `BILLING_SELLER_GSTIN` `BILLING_SELLER_ADDRESS` `BILLING_SELLER_STATE_CODE` `BILLING_SELLER_EMAIL` `BILLING_SELLER_PHONE` | placeholders | real | real | Printed on invoice PDFs. State code `33` = Tamil Nadu |
| `BILLING_INVOICE_PREFIX` | `TZ/INV` | `TZ/DEV` | `TZ/INV` | Number `TZ/INV/2026-27/00001` |
| `BILLING_PAYMENT_DRIVER` | `manual` | `manual` | `manual` | `razorpay` later behind the same switch |

`CORS_ORIGINS` stays for extra origins. On top of it the API allows the origin pattern `^https?://([a-z0-9-]+\.)?<escaped APP_BASE_DOMAIN>(:\d+)?$`.

The Postgres user in `DB_USER` needs `CREATEDB`: `ALTER ROLE <user> CREATEDB;` (one time, by the DBA).

---

## 5. Master DB schema

All tables extend the same `BaseEntity` (integer `id`, `created_at`, `updated_at`, `timestamptz`). snake_case. The entities live in `apps/school-api/src/platform/**/entities` and are **only** registered on the platform connection.

### `tenants`
| Column | Type | Notes |
|---|---|---|
| `code` | varchar(30) unique | lowercase, immutable |
| `name` | varchar(150) | Trust / group name |
| `legal_name` | varchar(200) null | For invoices |
| `gstin` | varchar(15) null | For invoices (B2B GST) |
| `billing_address` `billing_state_code` | text / varchar(2) | IGST vs CGST+SGST |
| `contact_name` `contact_mobile` `contact_email` | | Billing contact, gets invoices and reminders |
| `database_name` | varchar(63) unique | `tzs_srividya` |
| `status` | varchar(20) | `draft` → `provisioning` → `active` / `suspended` / `failed` / `archived` |
| `suspended_reason` | text null | |
| `logo_file_key` | varchar null | Shown on the workspace screen |
| `settings` | jsonb default `{}` | Feature overrides, notes |
| `provisioned_at` `suspended_at` `archived_at` | timestamptz null | |
| `created_by` | int null | `platform_admins.id` |

### `plans`
`code` (unique, `starter` `standard` `premium`), `name`, `description`, `price_monthly` numeric(12,2), `price_yearly` numeric(12,2), `max_branches` int, `max_students` int, `max_staff` int (null = unlimited), `is_trial` bool, `is_public` bool, `status` (`active`/`retired`), `sort_order`.

### `plan_features`
`plan_id`, `feature` varchar(40). Feature keys (one per sellable module): `transport` `fees` `payroll` `exams` `meetings` `chat` `diary` `announcements` `achievements` `id_cards` `staff_attendance` `parent_app` `teacher_app` `driver_app`. Core (students, attendance, timetable, users) is always on.

### `tenant_subscriptions`
`tenant_id`, `plan_id`, `billing_cycle` (`monthly`/`yearly`/`trial`), `status` (`trialing` `active` `past_due` `suspended` `cancelled`), `current_period_start` date, `current_period_end` date, `trial_ends_on` date null, `cancel_at_period_end` bool, `cancelled_at`, `cancel_reason`, `price` numeric(12,2) (locked price for this tenant), `discount_percent` numeric(5,2) default 0. **One row with status not `cancelled` per tenant** (partial unique index).

### `subscription_history`
`tenant_id`, `subscription_id`, `action` (`CREATED` `TRIAL_STARTED` `PLAN_CHANGED` `RENEWED` `PAST_DUE` `SUSPENDED` `REACTIVATED` `CANCELLED` `TRIAL_EXTENDED`), `from_plan_id`, `to_plan_id`, `note`, `actor_id`, `created_at`.

### `tenant_invoices`
`tenant_id`, `subscription_id`, `number` (unique), `financial_year` (`2026-27`), `issue_date`, `due_date`, `period_start`, `period_end`, `subtotal`, `discount`, `taxable`, `cgst`, `sgst`, `igst`, `total`, `amount_paid`, `status` (`draft` `issued` `paid` `partially_paid` `overdue` `void`), `pdf_file_key`, `void_reason`, `voided_at`, `seller_snapshot` jsonb, `buyer_snapshot` jsonb.

### `tenant_invoice_lines`
`invoice_id`, `description`, `sac_code` (`998314`), `quantity`, `unit_price`, `amount`.

### `tenant_payments`
`tenant_id`, `invoice_id`, `amount`, `paid_on` date, `method` (`bank_transfer` `upi` `cheque` `cash` `razorpay`), `reference`, `receipt_number` (unique), `receipt_file_key`, `recorded_by`.

### `invoice_counters`
`series` (`TZ/INV/2026-27`) unique, `last_number`. Incremented with `UPDATE … SET last_number = last_number + 1 … RETURNING last_number` inside the invoice transaction. No gaps, no duplicates.

### `provisioning_jobs`
`tenant_id`, `status` (`queued` `running` `completed` `failed`), `steps` jsonb (`[{ key, label, status, started_at, finished_at, error }]`), `progress` int, `error` text, `attempt` int, `payload` jsonb (first branch and admin details, no secrets).

### `platform_admins` / `platform_sessions` / `platform_audit_logs`
- `platform_admins`: `name`, `mobile` unique, `email`, `role` (`owner`, `sales`, `support`, `accounts`), `is_active`.
- `platform_sessions`: the same shape and rotation rules as `user_sessions` (hashed refresh, reuse → revoke).
- `platform_audit_logs`: `actor_id`, `action`, `tenant_id`, `before` jsonb, `after` jsonb, `ip`, `created_at`. Every platform write is logged.

Platform roles:
| Action | owner | sales | support | accounts |
|---|---|---|---|---|
| Create, provision, suspend, archive tenant | ✓ | create only | | |
| Plans | ✓ | | | |
| Change plan, extend trial | ✓ | ✓ | | |
| Invoices, payments, void | ✓ | | | ✓ |
| View everything | ✓ | ✓ | ✓ | ✓ |
| Platform admins | ✓ | | | |

---

## 6. Tenant DB

- **Exactly the tables we have today**, built by the current migrations in `apps/school-api/src/database/migrations`, plus the `migrations` table TypeORM keeps.
- Seed per tenant = today's `run-seed.ts` logic (roles, permissions, notification templates). Refactor it into an exported function `seedTenant(dataSource)` that is **idempotent** (upsert by code). `npm run seed` calls it for every active tenant; provisioning calls it for the new tenant.
- Demo seeds (`seed:demo`) only ever run against a tenant chosen with `--tenant demo`. They refuse to run when `NODE_ENV=production`.

---

## 7. Request flow

```
request
  → TenantMiddleware          resolve tenant, open/reuse its DataSource, AsyncLocalStorage.run(...)
  → JwtAuthGuard (global)     verify token, check token.tid === tenant.code  → else 401 TENANT_MISMATCH
  → SubscriptionGuard (global) check status/plan → 403 codes below
  → FeatureGuard              @RequireFeature('transport') → 403 FEATURE_NOT_IN_PLAN
  → PermissionsGuard (global) unchanged
  → controller → service      repositories resolve to the tenant DB automatically
```

### 7.1 Where the tenant code comes from (in this order)

1. Header **`x-tenant-id: srividya`** (web and mobile, every request).
2. Socket.IO handshake `auth.tenant` (sockets, section 10.3).
3. Query `t=` on signed file download links only (section 10.5).
4. Path param `:tenant` on inbound webhooks only (section 10.6).
5. If none and `TENANT_HEADER_REQUIRED=false` → `DEFAULT_TENANT_CODE`. Otherwise → `400 TENANT_REQUIRED`.

Only one header, `x-tenant-id`. Do not add `x-tenant-subdomain` (softsilk has both; it caused confusion). The web reads its subdomain and sends it in `x-tenant-id`.

**Paths that never need a tenant:** `/api/v1/health`, `/api/v1/tenants/resolve`, `/api/v1/platform/**`, `/api/docs/**`.

### 7.2 Tenant lookup

```sql
SELECT id, code, name, status, database_name FROM tenants WHERE code = $1
```

- Cached in memory 60 s per code. Platform writes to a tenant call `TenantRegistry.invalidate(code)`.
- Not found → `404 TENANT_NOT_FOUND`. `draft`/`provisioning`/`failed` → `403 TENANT_NOT_READY`. `archived` → `404 TENANT_NOT_FOUND`.

### 7.3 Connection manager (`TenantConnections`)

```ts
@Injectable()
export class TenantConnections implements OnApplicationShutdown {
  private readonly open = new Map<string, { source: Promise<DataSource>; used_at: number }>();

  get(tenant: TenantRecord): Promise<DataSource> {
    const current = this.open.get(tenant.code);
    if (current) {
      current.used_at = Date.now();
      return current.source;
    }
    const source = this.connect(tenant.database_name).catch((error) => {
      this.open.delete(tenant.code);
      throw error;
    });
    this.open.set(tenant.code, { source, used_at: Date.now() });
    this.evictOverflow();
    return source;
  }
}
```

- The **promise** is stored, not the DataSource. Two requests arriving together for a cold tenant share one `initialize()` (softsilk stores after init and can open two pools).
- Options: same as `DatabaseModule` today (`type`, host, user, `ssl`, `extra.max = TENANT_DB_POOL_SIZE`), `database = tenant.database_name`, `entities` = the tenant entity glob, `subscribers = [CreatedBySubscriber]`, `synchronize: false`, `migrationsRun: false`.
- A timer every minute closes pools idle longer than `TENANT_DB_IDLE_MINUTES` and the least recently used above `TENANT_DB_MAX_OPEN`.
- Connection failure → `503 TENANT_DB_UNAVAILABLE` (not 401 like softsilk).
- `onApplicationShutdown` destroys every pool.

### 7.4 Tenant context (AsyncLocalStorage)

```ts
export interface TenantContextValue {
  tenant: TenantRecord;
  data_source: DataSource;
}

export const tenantStorage = new AsyncLocalStorage<TenantContextValue>();

export const currentTenant = (): TenantContextValue => {
  const value = tenantStorage.getStore();
  if (!value) throw AppException.internal('No tenant for this operation', 'TENANT_CONTEXT_MISSING');
  return value;
};

export const runInTenant = <T>(value: TenantContextValue, work: () => Promise<T>) =>
  tenantStorage.run(value, work);
```

`TenantMiddleware` does `tenantStorage.run({ tenant, data_source }, () => next())`. Do **not** use request-scoped or durable providers (softsilk does): they rebuild the provider tree per request, are slow, and fail in crons.

### 7.5 Repositories: zero changes in services

The platform connection is registered as a **named** connection `'platform'`. So the default tokens (`DataSource` and `getRepositoryToken(Entity)`) are free. `TenancyModule` provides them as proxies that forward every call to the current tenant's DataSource:

```ts
const tenantRepository = <T extends ObjectLiteral>(entity: EntityTarget<T>) =>
  new Proxy({} as Repository<T>, {
    get: (_, key) => {
      const repository = currentTenant().data_source.getRepository(entity);
      const value = Reflect.get(repository, key, repository);
      return typeof value === 'function' ? value.bind(repository) : value;
    },
  });

@Module({})
export class TenancyModule {
  static forFeature(entities: EntityClassOrSchema[]): DynamicModule {
    const providers = entities.map((entity) => ({
      provide: getRepositoryToken(entity),
      useValue: tenantRepository(entity),
    }));
    return { module: TenancyModule, providers, exports: providers };
  }
}
```

- `DataSource` is provided globally the same way (`{ provide: DataSource, useValue: tenantDataSourceProxy }`), so `this.dataSource.transaction(...)` and `createQueryRunner()` hit the tenant DB.
- **The only edit in every feature module:** `TypeOrmModule.forFeature([...])` → `TenancyModule.forFeature([...])`. Services keep `@InjectRepository(Student) private readonly students: Repository<Student>` as they are. Do it as one mechanical replace and check it with `grep -rn "TypeOrmModule.forFeature" apps/school-api/src/modules` (must return nothing).
- Platform services inject with `@InjectRepository(Tenant, 'platform')` and `@InjectDataSource('platform')`.
- Never call `getRepository` on a DataSource stored in a field at construction time. Always go through the injected proxy.
- Never `instanceof Repository` a proxy.

### 7.6 Tokens carry the tenant

- Access JWT gets `tid: 'srividya'`. Refresh rotation keeps it. `JwtAuthGuard` rejects a token whose `tid` differs from the request tenant with `401 TENANT_MISMATCH`. This stops a token from tenant A being replayed against tenant B (user ids collide across tenant DBs: user 5 exists in every tenant).
- `user_sessions` stays in the tenant DB.
- Platform tokens are signed with `PLATFORM_JWT_SECRET`, `aud: 'platform'`, and are **only** accepted on `/platform/**`. Tenant tokens are never accepted there and vice versa.

### 7.7 Central Auth Service

- No change to send-otp / verify-otp / refresh / logout calls.
- The same mobile can be a user in two tenants (a parent with children in two groups). The Auth Service identity is the same person, so that is fine. Our user, roles and session live in each tenant DB separately, and the app picks the workspace first.
- Platform admins sign in through the same Auth Service OTP (`/platform/auth/otp/request|verify|refresh|logout`), checked against `platform_admins`, not tenant users.
- `AUTH_PROVIDER=local` (test OTP `123456`) works for platform admins too.

---

## 8. Subscription, limits and the gate

### 8.1 State machine

```
             trial ends, no payment                       invoice unpaid past due + grace
 trialing ─────────────────────────► suspended ◄──────────── past_due ◄── active (invoice overdue)
    │  payment / plan chosen                ▲  payment recorded            │
    └──────────────────────────────────► active ◄──────────────────────────┘
                     cancel (at period end) → cancelled
```

### 8.2 What each state allows (`SubscriptionGuard`)

| State | Tenant web and apps | Error code |
|---|---|---|
| `trialing` (before `trial_ends_on`) | Everything in the plan | — |
| `active` | Everything in the plan | — |
| `past_due` (within grace) | Everything, plus a warning banner from `GET /me/subscription` | — |
| `suspended` / trial ended | Only `auth/*`, `me`, `me/subscription`, `admin/billing/*`. Everything else is blocked | `403 TENANT_SUSPENDED` or `403 TRIAL_ENDED` |
| `cancelled` | Same as suspended | `403 SUBSCRIPTION_CANCELLED` |

Sign-in is **never** blocked by billing (softsilk learned this the hard way): users must be able to log in to see why and to pay.

Checks happen on the cached tenant row plus a cached subscription row (60 s), so the gate costs no query on most requests.

### 8.3 Plan limits and features

- `max_branches` → `SchoolsService.create`. `max_students` → `StudentsService.create` **and** student import (count before commit, reject the whole file if it would exceed). `max_staff` → staff create and import. Error: `403 PLAN_LIMIT_REACHED` with `errors: [{ field: 'plan', message: 'Your plan allows 500 students. Upgrade to add more.' }]`.
- `@RequireFeature('transport')` on controllers of feature modules (class-level). Mobile endpoints of a feature that is off return `403 FEATURE_NOT_IN_PLAN`. `GET /me` gains `features: string[]` so the web and apps hide menus.
- Downgrading a plan never deletes data. Over-limit tenants can read and edit but not add.

### 8.4 Endpoints for the tenant

| Method | Path | Who | Returns |
|---|---|---|---|
| GET | `/me/subscription` | any signed-in user | `{ plan, status, days_left, trial_ends_on, current_period_end, usage: { branches, students, staff }, limits, features, banner }` |
| GET | `/admin/billing/invoices` | group admin, permission `billing.view` | paginated invoices of this tenant |
| GET | `/admin/billing/invoices/:id/pdf` | `billing.view` | PDF |
| GET | `/admin/billing/payments/:id/receipt` | `billing.view` | PDF |

Add `billing.view` to `access.catalog.ts` (SUPER_ADMIN of the tenant only), then `npm run seed`.

---

## 9. Invoices and PDFs

- **Generator:** a daily cron at 06:00 `APP_TIMEZONE` on the platform connection:
  1. For each `active`/`past_due` subscription whose `current_period_end` is within 7 days and has no invoice for the next period → issue an invoice. Send it by SMS + email (Kafka, template `platform_invoice_issued`) to `contact_mobile`/`contact_email`.
  2. Invoices with `due_date` < today and not paid → `overdue`, subscription → `past_due` (history row, reminder).
  3. `past_due` and `due_date + BILLING_GRACE_DAYS` < today → `suspended` (history row, SMS to the contact, `TenantRegistry.invalidate`).
  4. `trialing` with `trial_ends_on` < today → `suspended` with reason `TRIAL_ENDED`. Reminders 7, 3 and 1 day before.
- The cron uses a Postgres advisory lock (`pg_try_advisory_lock(hashtext('billing-daily'))`) so two API instances never run it twice.
- **Amounts:** `numeric` in the DB, `Decimal`-safe math (integer paise in code), rounded per line to 2 decimals. GST: if `tenant.billing_state_code === BILLING_SELLER_STATE_CODE` → CGST 9% + SGST 9%, else IGST 18%. Unit-test the rounding.
- **Numbering:** `${BILLING_INVOICE_PREFIX}/${financial_year}/${counter padded to 5}`. Financial year Apr–Mar. Receipt numbers `TZ/RCT/...` on the same counter table.
- **PDF (pdfkit, already in the project):** `platform/billing/invoice.pdf.ts` and `receipt.pdf.ts`. A4. Contents: Tamilzorous logo and seller block (from `BILLING_SELLER_*`), "Tax Invoice", number, dates, buyer block with GSTIN, period, lines with SAC `998314`, tax split, total in figures **and words (Indian format, lakh/crore)**, amount paid, balance, bank/UPI details, "computer-generated invoice" footer, page numbers. Stored once at issue time under `platform/invoices/<financial_year>/<number>.pdf` through the existing storage driver. `seller_snapshot`/`buyer_snapshot` keep the printed details so a later address change never changes an old invoice. Regenerate only from the snapshots.
- **Void, never delete.** A voided invoice keeps its number and shows "VOID" across the PDF.
- **Payment:** `POST /platform/invoices/:id/payments` (owner/accounts) records a manual payment, issues a receipt PDF, marks the invoice `paid`/`partially_paid`. If the subscription was `past_due`/`suspended` and nothing else is overdue → `active` + `REACTIVATED` history + invalidate. `BILLING_PAYMENT_DRIVER=razorpay` comes later behind the same service method.

---

## 10. Isolation checklist (where mistakes happen)

Every one of these leaks data across tenants if missed, because ids repeat in every tenant DB (`school_id = 1`, `user_id = 5`, `student_id = 10` exist everywhere).

### 10.1 Crons
All current `@Cron` jobs (`announcements-scheduled`, `chat-office-hours`, `fee-overdue`, `cleanup`, `meeting-lifecycle`, `fleet-expiry`) are wrapped:

```ts
@Cron(CronExpression.EVERY_MINUTE, { name: 'meeting-lifecycle' })
tick() {
  return this.tenants.forEachActive('meeting-lifecycle', () => this.closeEndedMeetings());
}
```

`forEachActive` runs tenants **one after another**, inside `runInTenant`, logs and continues when one tenant fails, skips suspended tenants for jobs that send messages, and holds an advisory lock per job name. A cron that touches a repository outside `forEachActive` throws `TENANT_CONTEXT_MISSING` (that is intended: it catches the bug loudly).

### 10.2 Queue jobs
`job-queue.ts` stores `tenant_code` in every job when it is enqueued (read from `currentTenant()`), and the worker restores it with `runInTenant` before running. Retries keep it. Notification dispatch, SMS, push and imports all go through this.

### 10.3 Sockets (`/live`, `/comm`)
- Client connects with `io(url, { auth: { token, tenant: 'srividya' } })`.
- On connect: resolve tenant → verify JWT → check `tid` → keep `socket.data.tenant`. Every handler runs inside `runInTenant`.
- **Every room name is prefixed:** `srividya:user:5`, `srividya:trip:12`, `srividya:fleet:1`, `srividya:chat:44`. Update `userRoom`, `tripRoom`, `fleetRoom` and the chat room helpers to take the tenant code; emits from services read it from `currentTenant()`.

### 10.4 In-memory caches
Any `Map` keyed by `school_id`, `user_id` or similar in services (`announcements`, `attendance`, `chat`, `diary`, `fees`, `teacher-insights`, `job-queue`) gets the tenant code in the key: `${code}:${schoolId}`. Review with `grep -rn "new Map<" apps/school-api/src/modules`.

### 10.5 Signed file links
The signature covers `tenant code + file id + expiry`, and the link carries `t=<code>`. A link from tenant A opened with tenant B → `403 FILE_LINK_INVALID`. Storage keys become `<tenant code>/<existing key>` (local folder `STORAGE_LOCAL_DIR/<code>/...`, S3 prefix later). Move the existing `demo` files once with the migration script (section 13).

### 10.6 Webhooks (`integrations/*`)
Biometric, Agora and Telematics webhooks have no user token. They move to `/api/v1/integrations/:tenant/...` and are verified with their secret **and** the tenant must exist and be active. Keep the old paths working for `demo` only while `TENANT_HEADER_REQUIRED=false`.

### 10.7 ID card QR codes
New format `TZS2.<tenant code>.<student id>.<card version>.<signature>`. The signature covers the tenant code. Scanning a QR from another tenant → `QR_INVALID`. `TZS1` cards are accepted only for the `demo` tenant until they are reprinted.

### 10.8 Agora meeting channels
Channel name `tz-<tenant code>-m-<meeting id>`. Otherwise meeting 3 of two tenants share one video room.

### 10.9 Kafka SMS/email and push
- `tenantId` in the Kafka message stays `NOTIFY_TENANT_ID` (the Notification Service tenant is Tamilzorous). Add `school_group: tenant.name` to `variables` when templates need the sender name.
- FCM tokens live in the tenant DB. Push data payloads gain `tenant: code` so the app opens the right workspace from a notification tap.

### 10.10 Logs and errors
Every log line and `AllExceptionsFilter` output includes `tenant=<code>`. Error responses never include another tenant's data or the database name.

### 10.11 Telematics (out of scope)
`fleet/telematics.client.ts` keeps the single `TELEMATICS_API_KEY`. Only tenants with feature `transport` can call fleet endpoints. Before selling transport to a second tenant, the Telematics service needs its own tenancy (separate task).

---

## 11. Provisioning a tenant

### 11.1 Endpoints (platform console)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/platform/tenants/check-code?code=` | any | `{ available, reason?, workspace_url }` live as the admin types |
| POST | `/platform/tenants` | owner, sales | Create the tenant record (`draft`) with plan, billing details, first branch and group admin |
| POST | `/platform/tenants/:id/provision` | owner | Start the job → `{ job_id }` |
| GET | `/platform/provisioning-jobs/:id` | any | Steps and progress (the console polls every 2 s) |
| POST | `/platform/tenants/:id/provision/retry` | owner | Resume from the failed step |
| GET/PATCH | `/platform/tenants`, `/platform/tenants/:id` | | List with search/filters, details, edit name/billing/contact (never `code`) |
| POST | `/platform/tenants/:id/suspend` · `/reactivate` · `/archive` | owner | Manual control, reason required |
| GET | `/platform/tenants/:id/usage` | any | Branches, students, staff, users, last sign-in, DB size |

`POST /platform/tenants` body:

```json
{
  "code": "srividya",
  "name": "Sri Vidya Educational Trust",
  "legal_name": "Sri Vidya Educational Trust",
  "gstin": "33ABCDE1234F1Z5",
  "billing_address": "12, Avinashi Road, Coimbatore 641018",
  "billing_state_code": "33",
  "contact_name": "R. Kumar",
  "contact_mobile": "9876500001",
  "contact_email": "accounts@srividya.edu.in",
  "plan_code": "standard",
  "billing_cycle": "yearly",
  "start_with_trial": true,
  "first_branch": { "name": "Sri Vidya Matric Hr Sec School", "code": "SVM-CBE", "city": "Coimbatore" },
  "group_admin": { "name": "R. Kumar", "mobile": "9876500001", "email": "kumar@srividya.edu.in" }
}
```

### 11.2 Job steps (each one idempotent, each one recorded in `provisioning_jobs.steps`)

| # | Step | What it does | Safe to repeat because |
|---|---|---|---|
| 1 | `validate` | Code regex, reserved list, uniqueness, plan active, group admin mobile valid | read only |
| 2 | `create_database` | `SELECT 1 FROM pg_database WHERE datname=$1`; if missing `CREATE DATABASE "<name>" TEMPLATE template0 ENCODING 'UTF8'` (outside a transaction, on the platform connection) | checks existence first |
| 3 | `run_migrations` | Open a DataSource on the new DB with **the tenant migrations glob** and `await ds.runMigrations({ transaction: 'each' })` | TypeORM skips migrations already in its `migrations` table |
| 4 | `verify_schema` | Compare `SELECT count(*) FROM migrations` with the number of migration classes, and check that key tables exist (`users`, `schools`, `students`, `user_sessions`, `notifications`). A mismatch fails the job | read only |
| 5 | `seed_defaults` | `seedTenant(ds)`: roles, permissions, notification templates | upsert by code |
| 6 | `create_branch` | Insert the first `schools` row from `first_branch` | skips if a school with that code exists |
| 7 | `create_group_admin` | Insert the user with role `SUPER_ADMIN` (group admin), linked to the branch | skips if the mobile exists |
| 8 | `create_subscription` | `trialing` (`trial_ends_on = today + BILLING_TRIAL_DAYS`) or `active` + first invoice | skips if a non-cancelled subscription exists |
| 9 | `activate` | `tenants.status = 'active'`, `provisioned_at = now()`, invalidate cache | plain update |
| 10 | `notify` | SMS + email to the group admin: workspace URL, workspace code, "sign in with your mobile" | `settings.welcome_sent_at` guard |

- The job runs in the in-process queue (`QUEUE_DRIVER=memory`). Status lives in the DB, so a restart leaves a `running` job that the console shows as "interrupted, Retry". Retry starts at the first step that is not `done`.
- On failure: `tenants.status = 'failed'`, the error is saved on the step. **The database is never dropped automatically.** The owner can drop a never-activated tenant with `DELETE /platform/tenants/:id` (only when `status in ('draft','failed')`), which runs `DROP DATABASE IF EXISTS` after a typed confirmation.
- Same code, same mobile, called twice in parallel → the unique index on `tenants.code` stops the second one (`409 TENANT_CODE_TAKEN`).

### 11.3 New migrations after go-live

1. Generate as today, against the `demo` tenant DB: `npm run migration:generate -- apps/school-api/src/database/migrations/Name` (`data-source.ts` points at `DB_NAME`, which is `demo`'s database).
2. On deploy, with `TENANT_MIGRATIONS_ON_BOOT=true`, the API takes the advisory lock `tenant-migrations`, then runs pending migrations on **every** `active`/`suspended` tenant DB one after another, logs `migrated srividya: 2 applied`, and keeps going if one fails (that tenant is marked in `/platform/tenants/:id/usage` as `schema_behind`; requests still work against the old schema until it is fixed).
3. Manual commands:

```bash
npm run platform:migrate                          # master DB migrations
npm run tenants:migrate                           # every tenant
npm run tenants:migrate -- --tenant srividya      # one tenant
npm run tenants:status                            # code, database, applied, pending, last error
npm run seed                                      # seedTenant for every active tenant
npm run seed:platform-admin -- --mobile 9xxxxxxxxx --name "Full Name" --role owner
```

4. Migrations must be backward compatible for one release (add columns nullable or with a default, rename in two releases), because tenants migrate one after another while the new code is already serving.

---

## 12. API conventions added

- Route family **`platform/*`** for the console (master DB). A third Swagger doc **`/api/docs/platform`** (JSON `/api/docs/platform-json`), split by path in `swagger.ts` like the other two. `platform/*` must not appear in the admin or mobile docs.
- Public: `GET /api/v1/tenants/resolve?code=srividya` (`@Public()`, rate-limited 30/min per IP):

```json
{ "status": 200, "message": "OK", "data": {
  "code": "srividya", "name": "Sri Vidya Educational Trust",
  "logo_url": "https://…", "status": "active",
  "workspace_url": "https://srividya.tamilzorous.com" } }
```

  Unknown or archived → `404 TENANT_NOT_FOUND`. Suspended still resolves (with `status: "suspended"`), so the app can show the right screen.
- Every admin and mobile doc shows the `x-tenant-id` header as a global required header parameter (`@ApiHeader`), example `demo`.

### New error codes (keep them stable)

| HTTP | `error` | When |
|---|---|---|
| 400 | `TENANT_REQUIRED` | No `x-tenant-id` and no default |
| 400 | `TENANT_CODE_INVALID` | Code fails the regex or is reserved |
| 404 | `TENANT_NOT_FOUND` | Unknown or archived code |
| 403 | `TENANT_NOT_READY` | Still provisioning or failed |
| 403 | `TENANT_SUSPENDED` | Suspended (manual or unpaid) |
| 403 | `TRIAL_ENDED` | Trial over, no plan |
| 403 | `SUBSCRIPTION_CANCELLED` | Cancelled |
| 401 | `TENANT_MISMATCH` | Token belongs to another tenant |
| 403 | `PLAN_LIMIT_REACHED` | Branch, student or staff limit |
| 403 | `FEATURE_NOT_IN_PLAN` | Module not in the plan |
| 409 | `TENANT_CODE_TAKEN` | Code already used |
| 503 | `TENANT_DB_UNAVAILABLE` | Tenant DB cannot be reached |
| 500 | `TENANT_CONTEXT_MISSING` | Code bug: repository used outside a tenant |
| 403 | `FILE_LINK_INVALID` | Signed link from another tenant |

---

## 13. Moving today's system to tenants (no data copy)

1. Create the master DB: `CREATE DATABASE tamilzorous_platform;`, then `npm run platform:migrate`.
2. Seed plans (`starter`, `standard`, `premium`, `trial`) and the first platform owner: `npm run seed:platform-admin -- --mobile <your mobile> --name "<name>" --role owner`.
3. Register the existing database as tenant **`demo`**: `npm run tenants:adopt -- --code demo --name "Demo School Group" --database telematics --plan premium`. This inserts the `tenants` row (`status: active`), an `active` subscription with no invoices, and **does not touch any school data**. All current users, students, sessions, and the Venkatesh and demo accounts keep working.
4. Move files: `npm run tenants:move-files -- --tenant demo` (moves `STORAGE_LOCAL_DIR/*` into `STORAGE_LOCAL_DIR/demo/` and updates nothing in the DB, because keys get the prefix at read time from the tenant code).
5. Keep `TENANT_HEADER_REQUIRED=false` + `DEFAULT_TENANT_CODE=demo`. The current mobile app and web keep working unchanged.
6. Existing access tokens have no `tid`. Accept a missing `tid` only for `DEFAULT_TENANT_CODE` until `REFRESH_TTL_DAYS` has passed, then require it.
7. Live: when the mobile app release with the workspace screen is out, set `TENANT_HEADER_REQUIRED=true` and clear `DEFAULT_TENANT_CODE`.

---

## 14. Mobile contract (share with the Flutter team)

Only three things change for the app. Every existing endpoint, body and response stays the same.

1. **Workspace screen at first launch:** the user types the workspace code (`srividya`), the app calls `GET /api/v1/tenants/resolve?code=srividya`, shows the group name and logo, and stores the code. The app shows "Change workspace" on the sign-in screen.
2. **Header on every request:** `x-tenant-id: srividya` (one line in the Dio interceptor), including `/auth/otp/request`, `/auth/otp/verify` and `/auth/refresh`.
3. **Sockets:** `auth: { token, tenant: 'srividya' }`.

New errors to handle: `TENANT_REQUIRED`, `TENANT_NOT_FOUND` → back to the workspace screen; `TENANT_SUSPENDED`, `TRIAL_ENDED`, `SUBSCRIPTION_CANCELLED` → a full-screen "Your school's subscription is inactive, contact the school office"; `TENANT_MISMATCH` → sign out; `FEATURE_NOT_IN_PLAN` → hide the module. `GET /me` gains `features`. Push payloads gain `tenant`.

Until they ship it, nothing breaks: requests without the header go to `demo`.

---

## 15. Code layout

```
apps/school-api/src/
  tenancy/
    tenancy.module.ts            TenancyModule.forFeature, DataSource proxy, global providers
    tenant.middleware.ts         header → tenant → connection → AsyncLocalStorage
    tenant-context.ts            tenantStorage, currentTenant, runInTenant
    tenant-connections.ts        pools, single-flight init, idle and LRU eviction
    tenant-registry.ts           cached lookup by code, invalidate
    tenant-runner.ts             forEachActive (crons), advisory locks
    tenant-migrator.ts           run tenant migrations (boot, CLI, provisioning)
    tenant-code.ts               regex, reserved list, database name, workspaceUrl
    subscription.guard.ts        state gate
    feature.guard.ts             @RequireFeature
    *.spec.ts
  platform/
    platform-db.module.ts        TypeOrmModule.forRootAsync({ name: 'platform', ... })
    auth/                        platform OTP sign-in, sessions, guard (aud platform)
    tenants/                     CRUD, check-code, suspend, usage
    provisioning/                job service, steps, retry
    plans/  subscriptions/  billing/ (invoices, payments, pdf, cron)
    audit/                       platform_audit_logs interceptor
    entities/
  database/
    migrations/                  tenant migrations (unchanged folder)
    platform-migrations/         master DB migrations
    platform-data-source.ts      CLI data source for the master DB
    seeds/seed-tenant.ts         exported seedTenant(ds), used by run-seed.ts and provisioning
    seeds/platform-seed.ts       plans + platform admin
    scripts/tenants-cli.ts       migrate, status, adopt, move-files
  modules/                       unchanged, except TypeOrmModule.forFeature → TenancyModule.forFeature
```

`package.json` scripts: `platform:migrate`, `platform:migration:generate`, `tenants:migrate`, `tenants:status`, `tenants:adopt`, `tenants:move-files`, `seed:platform-admin`. All run through `ts-node -r tsconfig-paths/register` like the existing ones.

Update `CLAUDE.md` when this lands: the "One database" rule becomes "one master DB for the platform and one DB per tenant; inside a tenant, web and mobile still share the same tables". Add the `platform/*` route family, the third Swagger doc, the `x-tenant-id` header and the isolation checklist (section 10). Update `docs/api-guide.md` with sections 3, 12 and 14.

---

## 16. Tests (all must pass before merge)

### Unit (`npm test`, no DB)
- `tenant-code.spec.ts`: valid/invalid codes, reserved words, DB name mapping, `workspaceUrl` for localhost (http + port), dev and live (https, no port), `APP_PROTOCOL` override.
- `subscription.guard.spec.ts`: every state × allowed/blocked path, auth never blocked, billing paths always open.
- `billing.spec.ts`: CGST/SGST vs IGST, rounding to paise, discount, amount in words (lakh/crore), financial-year numbering across 31 Mar → 1 Apr, partial payments, void.
- `tenant-connections.spec.ts`: two concurrent `get()` calls → one `initialize`, failed init is not cached, idle and LRU eviction.
- `provisioning.spec.ts`: each step skips when already done, retry resumes at the failed step, failure marks the tenant `failed` and never drops the DB.
- `tenant-runner.spec.ts`: one failing tenant does not stop the others; work runs inside the right context.
- `tenant-context.spec.ts`: a repository proxy outside a context throws `TENANT_CONTEXT_MISSING`.

### E2E (`npm run test:e2e`, real Postgres)
Provision **two** tenants `alpha` and `beta` through the platform API, then:
1. Both DBs have identical `migrations` rows and table lists.
2. The same mobile number is a user in both. Signing in on each gives different data.
3. Create student "Arun" in alpha. Beta's student list, search, insights, dashboard and mobile rosters never show it.
4. Alpha's token on a beta request → `401 TENANT_MISMATCH`.
5. Alpha's signed file link with `t=beta` → `403 FILE_LINK_INVALID`.
6. Alpha's ID card QR scanned in beta → `QR_INVALID`.
7. A socket client of alpha never receives beta's `chat.message` / trip events (same numeric ids on both sides).
8. A cron tick runs in both tenants and writes only to each own DB.
9. Add a dummy migration → boot → both tenants have it.
10. Suspend beta → beta's `/admin/students` gives `403 TENANT_SUSPENDED`, `/auth/otp/request` still works, alpha is unaffected.
11. Plan with `max_students = 2` → third student and an import of 2 rows both give `PLAN_LIMIT_REACHED`.
12. Kill the job after `run_migrations` → retry completes, no duplicate branch or admin.
13. Invoice issue → PDF exists, opens, totals match; record payment → receipt PDF, subscription `active`.
14. No header + `TENANT_HEADER_REQUIRED=false` → `demo`; with `true` → `400 TENANT_REQUIRED`.

Then the full existing suites against `demo`: `npm run lint && npm test && npm run build`, and in `Telamatics_web`, `npm run test:regression` (API, browser, telematics). The existing regression must pass **unchanged** with the default tenant. That proves nothing broke for current users.

---

## 17. Order of work

| Step | Work | Days |
|---|---|---|
| 1 | Master DB, platform entities and migrations, `tenant-code`, registry, connections, context, middleware, repository proxies, module replace | 1.5 |
| 2 | Tokens with `tid`, sockets, crons, queue, caches, files, QR, webhooks, Agora channel | 1.5 |
| 3 | Tenant migrator (boot + CLI), `seedTenant`, provisioning job, adopt `demo` | 1 |
| 4 | Platform auth, tenants/plans/subscriptions APIs, gate, limits, features | 1 |
| 5 | Billing cron, invoices, payments, PDFs | 1 |
| 6 | Swagger platform doc, api-guide, CLAUDE.md, unit + e2e tests, full regression | 1 |
| | **Backend total** | **≈ 7 days** (web console in parallel, see `Telamatics_web/docs/multi-tenancy.md`) |

## 18. Done means

- [ ] A platform admin signs in at `admin.<base>` and creates a tenant; the job finishes all 10 steps; the welcome SMS has a working URL.
- [ ] Opening `<code>.<base>` shows that group's sign-in; the group admin signs in and sees only their first branch.
- [ ] The new tenant DB has every table and every migration row of `demo`; `tenants:status` shows 0 pending everywhere.
- [ ] All 14 e2e isolation checks pass; the existing regression passes unchanged on `demo`.
- [ ] Local (`http://x.localhost:5173`), dev (`https://x.dev.tamilzorous.com`) and live (`https://x.tamilzorous.com`) URLs come from `.env` alone.
- [ ] Trial → suspended → payment → active works end to end, with invoice and receipt PDFs.
- [ ] The current mobile app works with no change while `TENANT_HEADER_REQUIRED=false`.
- [ ] No secrets, hosts or tenant names in code; `.env.example` has every new key; no code comments.
