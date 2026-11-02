# School Management API guide

For the Flutter team and anyone calling the API. Swagger has every endpoint with examples: `http://<server>:3000/api/docs` (JSON at `/api/docs-json` for code generators).

## One API, one database

The Admin web and the Flutter app (Staff, Parent and Driver roles) call the same API and read the same tables. There is no separate mobile database. A mobile endpoint is a role-specific view over the same records the admin web edits.

## Base URL and versions

- Base: `http://<server>:3000/api/v1`
- `v1` is the current version. A `v2` route is added only for a breaking change, and `v1` keeps working next to it. Call `v1` unless a document tells you otherwise.
- Health without a version: `GET /api/health`

## Route families

| Prefix | Used by |
|---|---|
| `/auth` | Every app: OTP sign-in, refresh, sign-out |
| `/me` | Every app: profile, language, push device, notification centre |
| `/mobile/parent/*`, `/mobile/teacher/*`, `/mobile/driver/*` | Flutter role screens (added module by module) |
| `/admin/*` | Admin web |
| `/fleet/*` | Telematics plug-in |
| `/files` | Uploads and signed downloads |

## Sign-in flow

1. `POST /auth/otp/request` with `{ "mobile": "9876543210" }`. Returns `expires_in` and `resend_in` (seconds) for the countdown.
2. `POST /auth/otp/verify` with `{ "mobile": "...", "otp": "123456", "client": { "app": "parent", "platform": "android", "device_name": "Pixel 7", "app_version": "1.0.0", "fcm_token": "..." } }`.
3. Store `access_token` and `refresh_token` securely. Send `Authorization: Bearer <access_token>` on every call.
4. Read `user.apps`. If it has more than one value (for example `["staff", "parent"]`), show a role picker. Otherwise open that app directly.
5. When any call returns `401` with `error: "TOKEN_EXPIRED"`, call `POST /auth/refresh` with the refresh token, store **both** new tokens, and retry once. Any other 401 (`SESSION_REVOKED`, `SESSION_INVALID`, `ACCOUNT_INACTIVE`, `TOKEN_INVALID`) means: go to the login screen.
6. On sign-out call `POST /auth/logout`. It ends the session and stops push to the device.

In development the OTP is always `123456` and no SMS is sent. Demo users (all school 1):

| Mobile | Roles |
|---|---|
| 9999999999 | Super admin (platform, every school) |
| 9876543210 | School admin |
| 9000000001 | Principal |
| 9000000002 | Administrative officer |
| 9000000003 | Transport in-charge |
| 9000000004 | Teacher, HOD |
| 9000000005 | Parent (Tamil) |
| 9000000006 | Teacher and Parent (role picker) |
| 9000000007 | Driver (Tamil) |
| 9000000008 | Bus attendant (Tamil) |

## Response format

Success:

```json
{ "status": 200, "message": "OK", "data": { } }
```

List (`data`):

```json
{ "items": [], "total": 42, "page": 1, "limit": 20, "total_pages": 3, "has_next": true }
```

List query parameters: `page` (from 1), `limit` (1 to 100, default 20), `search`, `sort`, `order` (`asc` or `desc`) plus the filters each list documents. Unknown parameters are rejected, so send only documented ones.

Error:

```json
{
  "status": 400,
  "error": "VALIDATION_FAILED",
  "message": "mobile must be a valid 10-digit Indian mobile number",
  "errors": [{ "field": "mobile", "message": "mobile must be a valid 10-digit Indian mobile number" }]
}
```

Show `message` to the user. Use `error` to decide what to do. Use `errors[].field` to highlight form fields.

## Error codes

| Code | HTTP | Meaning / what the app does |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Highlight `errors[].field` |
| `MOBILE_NOT_REGISTERED` | 404 | Number is not in the school records |
| `ACCOUNT_INACTIVE` | 401/403 | Account switched off by the school; go to login |
| `OTP_INVALID` | 401 | Wrong code; message says attempts left |
| `OTP_EXPIRED` | 401 | Ask for a new OTP |
| `OTP_ATTEMPTS_EXCEEDED` | 429 | Ask for a new OTP |
| `OTP_RESEND_TOO_SOON`, `OTP_RATE_LIMITED` | 429 | Show message; keep the countdown |
| `SMS_FAILED` | 503 | Ask the user to try again |
| `TOKEN_MISSING`, `TOKEN_INVALID` | 401 | Go to login |
| `TOKEN_EXPIRED` | 401 | Refresh and retry once |
| `SESSION_REVOKED`, `SESSION_INVALID` | 401 | Go to login |
| `FORBIDDEN` | 403 | The role cannot do this |
| `NOT_FOUND` | 404 | Record does not exist or is in another school |
| `DUPLICATE`, `MOBILE_TAKEN` | 409 | Value already used |
| `INVALID_SORT` | 400 | `sort` value is not allowed for this list |
| `FILE_MISSING`, `FILE_TYPE_NOT_ALLOWED`, `IMAGE_INVALID` | 400 | Upload problem |
| `PAYLOAD_TOO_LARGE` | 413 | File over the size limit |
| `LINK_EXPIRED` | 403 | Fetch the file again to get a fresh link |

## Field conventions

- Field names are `snake_case`.
- IDs are integers.
- Dates are ISO 8601 with the India offset, for example `2026-11-02T09:15:00.000+05:30`.
- Mobile numbers are 10 digits. The API accepts `+91 98765 43210` and stores `9876543210`.
- `language` is `en` or `ta`. Notifications arrive in the user's language.
- Every response carries an `X-Request-Id` header. Include it when you report a bug.

## Push notifications

- Register the device after sign-in (or pass `client.fcm_token` in verify): `POST /me/devices` with `fcm_token`, `platform`, `app`. Call it again whenever Firebase gives a new token.
- Remove on sign-out: handled by `POST /auth/logout`. To remove a token alone: `DELETE /me/devices?fcm_token=...`.
- Push `data` always has `notification_id`, `category` and `template`, plus the values used in the message (for example `bus`, `stop`, `minutes`). Use `category` to open the right screen.
- The notification centre is `GET /me/notifications` (in-app copy of every message), `GET /me/notifications/unread-count`, `PATCH /me/notifications/{id}/read` and `POST /me/notifications/read-all`.

## Files

- Upload: `POST /files` as `multipart/form-data` with field `file` and optional `purpose` (snake_case). Images, PDF, Word, Excel and CSV; 10 MB by default.
- The response has `url` and, for images, `thumbnail_url`. Both are signed links that work without a token until `url_expires_at` (1 hour). After that, call `GET /files/{id}` for fresh links.
- Other records store the file `id`, never the URL.
