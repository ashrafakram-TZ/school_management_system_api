# School Management API guide

For the Flutter team and anyone calling the API. Swagger has every endpoint with examples. Flutter team: `http://<server>:3000/api/docs/mobile` (JSON at `/api/docs/mobile-json` for code generators). Web team: `http://<server>:3000/api/docs/admin`.

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
| `/admin/fleet/*` | Admin web: live bus status (read from the Telematics service) |
| `/files` | Uploads and signed downloads |

## Sign-in flow

Sign-in uses the central **Tamilzorous Auth Service** for the OTP (`AUTH_PROVIDER=central`). The app still calls only this API; nothing changes in the app:

- `POST /auth/otp/request`: we check the number is an active user here, then the Auth Service sends the SMS (valid **15 minutes**, resend after 30 seconds). A user the Auth Service does not know yet is registered there automatically on this first request (name, mobile, email; staff and parents without an email get `firstname.lastname.1234@school.tamilzorous.com`).
- `POST /auth/otp/verify`: the Auth Service checks the code; this API then issues the school session (`access_token`, `refresh_token`) with school and roles.
- `POST /auth/refresh` and `POST /auth/logout` stay in this API until the Auth Service adds refresh and logout.
- Deactivating a user here blocks OTP and ends every session at once.

### Which app can sign in

Send the app on both calls: `"app": "mobile"` in `/auth/otp/request` and `"client": { "app": "mobile", ... }` in `/auth/otp/verify` (the admin web sends `"admin"`). `client.app` is required.

| `app` | Who can sign in |
|---|---|
| `mobile` (Flutter) | Users with a Parent, Teacher, HOD, Driver or Attendant role |
| `admin` (web) | Users with Super admin, Admin, Principal, AO or Transport in-charge |

Anyone else gets `403 APP_NOT_ALLOWED` at the OTP request, so no SMS is sent.

### One app, switch roles inside it

One person, one sign-in. A number that is both a parent and a teacher signs in once; the profile (`data.user` in the sign-in response, or `GET /me`) says which sections they can open:

```json
"mobile_apps": ["staff", "parent"],
"sections": [
  { "app": "staff",  "label": "Staff",  "mobile": true, "roles": [{ "code": "TEACHER", "name": "Teacher", "app": "staff" }] },
  { "app": "parent", "label": "Parent", "mobile": true, "roles": [{ "code": "PARENT",  "name": "Parent",  "app": "parent" }] }
]
```

- One entry in `mobile_apps`: open that home directly.
- Two or more: show a chooser once, remember it on the phone, and offer "Switch to Parent / Staff" in the profile menu.
- Switching needs no new OTP and no new token: the same `access_token` works for `/mobile/parent/*` and `/mobile/teacher/*`.


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
| 9000000401 to 9000000406 | Teachers: Tamil, English, Social Science, PE, Computer Science, Hindi |

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
| `SCHOOL_REQUIRED` | 400 | Super admin only: send `X-School-Id` |
| `CHILD_NOT_FOUND` | 404 | Parent app: this child is not linked to the signed-in mobile |
| `NOT_YOUR_SECTION` | 403 | Staff app: the teacher does not teach this section |
| `QR_INVALID`, `QR_REPLACED` | 400/409 | Scanned card is not a school card, or it was replaced |
| `FUTURE_DATE`, `OUTSIDE_YEAR`, `NOT_A_SCHOOL_DAY`, `HOLIDAY` | 400 | Attendance date is not allowed; show the message |
| `ATTENDANCE_INCOMPLETE`, `DUPLICATE_STUDENT`, `STUDENT_NOT_IN_SECTION` | 400 | Send every student of the section exactly once |
| `OUTSIDE_SCHOOL` | 400 | Check-in: the phone is outside the school radius; the message says how far |
| `GEOFENCE_NOT_SET` | 400 | Check-in: the school has no location yet; ask the office |
| `ALREADY_CHECKED_IN` | 409 | Already checked in today |
| `NOT_CHECKED_IN` | 400 | Check-out before check-in |
| `LEAVE_OVERLAP` | 409 | Another request already covers these days |
| `LEAVE_BALANCE_LOW`, `NO_WORKING_DAYS` | 400 | Not enough balance, or the dates are all holidays and Sundays |
| `LEAVE_NOT_PENDING` | 409 | The request was already decided or cancelled |
| `NOT_CLASS_TEACHER`, `NOT_APPROVER`, `OWN_LEAVE` | 403 | This person cannot decide this leave |
| `TEACHER_CLASH`, `ROOM_CLASH` | 409 | Timetable: the teacher or room is busy in that period |
| `BELL_INVALID`, `PERIOD_IN_USE` | 400/409 | Bell schedule overlaps, or removes a period the timetable uses |
| `TEACHER_NOT_ABSENT`, `SUBSTITUTE_BUSY` | 409 | Substitutes: the period's teacher is in, or the chosen teacher is not free |
| `RUN_FINALIZED`, `RUN_EMPTY` | 409/400 | Payroll month is already final, or has no payslips |
| `PAYSLIP_NOT_FOUND` | 404 | Not your payslip, or the month is not final yet |
| `VEHICLE_EXISTS`, `DEVICE_IN_USE` | 409 | Bus registration already added, or the tracker is on another bus |
| `ROUTE_EXISTS`, `ROUTE_IN_USE`, `STOP_IN_USE` | 409 | Route code taken, or students still use the route or stop |
| `BUS_FULL` | 409 | More students than the bus has seats |
| `TELEMATICS_UNAVAILABLE` | 503 | Bus tracking service is down; try again in a minute |

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

## Which school

Every school user belongs to one school, and the API reads it from the token. The super admin belongs to none: on `/admin/*` school pages they send `X-School-Id: <id>`, or the API answers `400 SCHOOL_REQUIRED`. The Flutter apps never send this header.

## Parent app: my children

`GET /mobile/parent/children` (Parent role) lists every active child linked to the signed-in parent, across schools, with this year's class:

```json
[
  {
    "id": 12,
    "full_name": "Kavin Narayanan",
    "admission_no": "TZMS-2026-0012",
    "gender": "male",
    "dob": "2015-04-12",
    "photo_file_id": null,
    "class_name": "6",
    "section_name": "A",
    "roll_no": 12,
    "class_teacher": "Priya Venkatesh",
    "relation": "father",
    "school": { "id": 1, "name": "Tamilzorous Model School" }
  }
]
```

Brothers and sisters show up together because the school links them to the same parent mobile. An empty list means the school has not linked a child yet. Sign in as 9000000005 (Tamil) to try it.

Child screens (all read-only, `{id}` comes from the list above; a child that is not linked to the parent returns `404 CHILD_NOT_FOUND`):

| Call | Screen |
|---|---|
| `GET /mobile/parent/children/{id}` | Child card: class, section, class teacher, photo, blood group, house and `counts` for the tile badges |
| `GET /mobile/parent/children/{id}/id-card` | Digital ID card. Draw `qr_token` as a QR code; the bus attendant scans it |
| `GET /mobile/parent/children/{id}/documents` | Documents the school shares, with `status` pending, verified or rejected |
| `GET /mobile/parent/children/{id}/health` | Health summary, BMI and the vaccination log (`overdue` flag) |
| `GET /mobile/parent/children/{id}/behaviour` | Behaviour notes shared with parents (appreciation, concern, incident) |

If the school replaces a lost card, the old `qr_token` stops working. Fetch the ID card again instead of caching it for long.

### Attendance and leave (parent)

| Call | Screen |
|---|---|
| `GET /mobile/parent/children/{id}/attendance/today` | Home badge: `{ "date": "2026-11-02", "status": "absent" }`; `status` is `null` until the class teacher marks |
| `GET /mobile/parent/children/{id}/attendance?month=2026-11` | Calendar: `days[]` with `date` and `status` (present, absent, late, half_day, leave, holiday), plus `summary.percent` |
| `GET /mobile/parent/children/{id}/leaves` | Leave requests, newest first, with `status` pending, approved, rejected or cancelled |
| `POST /mobile/parent/children/{id}/leaves` | `{ "from_date": "2026-11-10", "to_date": "2026-11-11", "reason": "Fever", "file_id": null }`. Up to 7 days back, 30 days long |
| `POST /mobile/parent/children/{id}/leaves/{leaveId}/cancel` | Cancel while it is still pending |

| `GET /mobile/parent/children/{id}/transport` | Bus card: route, stop with `pickup_time` and `drop_time`, bus registration, driver and attendant with mobile, `monthly_fee`. `null` when the child does not use the bus |

When the class teacher marks the child absent for today's morning attendance, the parent gets a `STUDENT_ABSENT` push (once per day) and an in-app notification. The parent is told again when a leave request is approved or rejected (`LEAVE_STATUS`).

## Staff app: teachers

Teacher, HOD and Principal roles. Everything is limited to the teacher's own sections this year; other sections return `403 NOT_YOUR_SECTION`.

| Call | Screen |
|---|---|
| `GET /mobile/teacher/classes` | My classes: class-teacher sections first, then sections I teach, with my subjects and student count |
| `GET /mobile/teacher/sections/{id}/students` | Class roster in roll-number order |
| `GET /mobile/teacher/students/{id}` | Student detail (read-only) |
| `GET /mobile/teacher/students/{id}/behaviour` | Behaviour notes |
| `POST /mobile/teacher/students/{id}/behaviour` | Add a note: `{ "category": "appreciation", "title": "Neat notebook all week", "visible_to_parent": true }` |

Sign in as 9000000004 (Priya, class teacher of 6-A) to try it.

### Attendance, check-in, leave and timetable (staff)

| Call | Screen |
|---|---|
| `GET /mobile/teacher/check-in` | Today's card: `check_in_at`, `check_out_at`, `status` (present, late, not_checked_in), distance from school |
| `POST /mobile/teacher/check-in` | `{ "lat": 13.0879, "lng": 80.2102, "accuracy_m": 12 }`. Refused with `OUTSIDE_SCHOOL` outside the school radius. Late is after the school reporting time plus 10 minutes |
| `POST /mobile/teacher/check-out` | Same body |
| `GET /mobile/teacher/my-attendance?month=2026-11` | My month |
| `GET /mobile/teacher/sections/{id}/attendance?date=2026-11-02&period=0` | Roster with saved or default statuses. Period 0 is the morning attendance; students on approved leave default to `leave` |
| `PUT /mobile/teacher/sections/{id}/attendance` | `{ "date": "2026-11-02", "period": 0, "items": [{ "student_id": 12, "status": "absent", "remarks": null }] }`. Send every student once. Saving today's period 0 alerts parents of absent students |
| `GET /mobile/teacher/timetable` | My week: `periods` (bell schedule) and `slots` with `day_of_week` 1 Monday … 6 Saturday |
| `GET /mobile/teacher/leave-balances` | Per leave type: allowed, used, pending, balance |
| `GET /mobile/teacher/leaves` | My requests |
| `POST /mobile/teacher/leaves` | `{ "leave_type_id": 1, "from_date": "2026-11-20", "to_date": "2026-11-21", "half_day": false, "reason": "Family function" }`. Goes to the HOD of my department, then the principal |
| `POST /mobile/teacher/leaves/{id}/cancel` | Cancel while waiting |
| `GET /mobile/teacher/leave-approvals` | HOD / principal: staff requests waiting for me |
| `POST /mobile/teacher/leave-approvals/{id}/decision` | `{ "status": "approved", "note": null }` |
| `GET /mobile/teacher/student-leaves?status=pending` | Class teacher: parent leave requests for my sections (paginated) |
| `POST /mobile/teacher/student-leaves/{id}/decision` | `{ "status": "rejected", "note": "Please bring the medical note" }` |

| `GET /mobile/teacher/substitutions` | Classes I cover for absent teachers, today and the next 7 days: date, period and time, section, subject, room, who is away, note |

Staff leave status moves `pending_hod` → `pending_principal` → `approved` (or `rejected` at any step). With no HOD in the department it starts at `pending_principal`.

Biometric machines push punches to `POST /integrations/biometric/punches` with header `X-Device-Key` (`BIOMETRIC_WEBHOOK_KEY`); the first punch of the day is the check-in and the last is the check-out.

## Live bus

### Driver app (Driver and Attendant)
| Call | Screen |
|---|---|
| `GET /mobile/driver/trips/today` | Home: my bus, `active_trip` (the trip running now) and each route with today's trips. Show "Start morning pickup" / "Start evening drop" when `active_trip` is null |
| `POST /mobile/driver/trips` | `{ "route_id": 1, "kind": "pickup" }` starts the trip. Parents of the route get "Bus has started". 409 `TRIP_ALREADY_ACTIVE`, 400 `NO_TRACKER` |
| `GET /mobile/driver/trips/{id}` | Trip screen: `stop_list` in travel order with `status` and `eta_seconds`, `school` (end of a pickup), `riders` and `not_boarded` |
| `POST /mobile/driver/trips/{id}/positions` | Phone GPS fallback every 5–10 s: `{ "lat", "lng", "speed", "heading" }`. Used only when the bus tracker is silent for 60 s |
| `POST /mobile/driver/trips/{id}/end` | End by hand. A pickup also ends by itself inside the school gate; a drop after the last stop |

### Parent app
`GET /mobile/parent/children/{id}/bus` returns `status` (`no_trip`, `on_the_way`, `approaching`, `at_stop`, `passed`, `trip_ended`), a ready `headline` ("Bus is 4 min away from Thirumangalam metro"), the child's `stop`, `eta_seconds`, `position` (live, or the bus's last known position with `position_stale`) and `trip`. It is `null` when the child does not use the bus.

Parents are told automatically: **Bus has started** (whole route), **Bus is N min away** (only parents of that stop, before the bus arrives; SMS if the push does not reach the phone) and **Bus reached {stop}**.

### Live updates (socket.io)
Connect to the namespace `/live` on the API host with `{ auth: { token: "<access_token>" } }`, then:

- `emit('trip.subscribe', { trip_id })` → ack `{ ok: true }`. A parent can follow only a trip their child rides; a driver only their own bus; admins any trip of their school. Otherwise `{ ok: false, error: "FORBIDDEN" }`.
- Receive `trip.position` `{ trip_id, position: { lat, lng, speed, heading, recorded_at, source } }` every few seconds and `trip.event` `{ trip_id, type, stop, eta_seconds, end_reason }` for `trip.started`, `stop.approaching`, `stop.arrived`, `stop.departed`, `trip.ended`.
- When the access token expires the socket is closed with an `error` event: refresh the token and connect again.

## Payslips (every staff app)

`GET /me/payslips` lists the signed-in staff member's payslips for months the office has finalised (paginated, newest first): `month`, `month_label`, `gross`, `total_deductions`, `net`, `paid_days`, `lop_days` and each earning and deduction. `GET /me/payslips/{id}/pdf` downloads the PDF (`Content-Disposition: attachment`). A `PAYSLIP_READY` push arrives when a month is finalised.

## Driver app

Driver and Attendant roles. `GET /mobile/driver/duty` returns my bus and its routes, each with stops in travel order (`lat`, `lng`, `geofence_radius_m`, pickup and drop times) and the students at each stop (`full_name`, `class_section`, `mode` both/pickup/drop, `passenger_ref`). `passenger_ref` is the opaque id the bus tracking system uses; it is never the student id. Sign in as 9000000007 (driver) or 9000000008 (attendant).

## Files

- Upload: `POST /files` as `multipart/form-data` with field `file` and optional `purpose` (snake_case). Images, PDF, Word, Excel and CSV; 10 MB by default.
- The response has `url` and, for images, `thumbnail_url`. Both are signed links that work without a token until `url_expires_at` (1 hour). After that, call `GET /files/{id}` for fresh links.
- Other records store the file `id`, never the URL.
