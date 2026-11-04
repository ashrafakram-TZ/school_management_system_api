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

A person cannot be both teaching staff (Teacher, HOD) and bus crew (Driver, Attendant): assigning both returns `400 VALIDATION_FAILED` on `role_codes`. Parent can be combined with either.

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
| `NOT_ON_THIS_ROUTE`, `NOT_ON_THIS_TRIP` | 409 | Boarding: the student is not on this bus route, or does not ride this pickup/drop |
| `NOT_BOARDED`, `TRIP_ENDED`, `STUDENT_NOT_ACTIVE` | 409 | Boarding: got off before boarding, the trip is over, or the student has left the school |
| `ALERT_RESOLVED`, `ALERT_ALREADY_RESOLVED` | 409 | Alerts centre: the alert is already resolved |
| `TICKET_CLOSED` | 409 | Fleet maintenance: the ticket is already done |
| `TICKET_NOT_FOUND`, `FUEL_LOG_NOT_FOUND`, `TRACK_NOT_FOUND` | 404 | Fleet maintenance and trip replay: no such ticket or fuel entry, or the trip never reached the tracker |
| `MEETING_NOT_FOUND` | 404 | Not your meeting, or it does not exist |
| `MEETING_CLASH` | 409 | The teacher or the parent already has a meeting at that time |
| `NO_PARENT_ACCOUNT` | 409 | Staff app: no parent of this student has the app yet |
| `MEETING_NOT_OPEN`, `MEETING_ENDED`, `MEETING_CANCELLED` | 409 | Join: opens 10 minutes before the start; closed 30 minutes after the end, or cancelled |
| `MEETING_NOT_LIVE`, `MEETING_NOT_CANCELLABLE` | 409 | End needs a live call; cancel only before it starts |
| `VIDEO_NOT_CONFIGURED` | 503 | The server has no Agora keys yet |
| `PAYMENT_EXCEEDS_BALANCE`, `DISCOUNT_TOO_HIGH`, `NO_PLAN_FOR_INSTALLMENT` | 400 | Fees: the amount is more than the invoice balance, the discount goes below what is paid, or no plan has that installment |
| `INVOICE_PAID`, `INVOICE_CANCELLED`, `INVOICE_HAS_PAYMENTS` | 409 | Fees: nothing left to pay, the invoice is cancelled, or it has payments and cannot be cancelled |
| `FEE_HEAD_EXISTS`, `TRANSPORT_HEAD_EXISTS`, `FEE_HEAD_IN_USE` | 409 | Fees: head code taken, a transport head already exists, or the head is on plans or invoices |
| `INVOICE_NOT_FOUND`, `RECEIPT_NOT_FOUND`, `FEE_HEAD_NOT_FOUND` | 404 | Fees: not found or in another school (or another child for parents) |
| `EXAM_NOT_FOUND`, `SECTION_NOT_IN_EXAM`, `SUBJECT_NOT_IN_EXAM`, `CLASS_NOT_IN_EXAM` | 404 | Exams: the exam, or this section or subject in it, does not exist |
| `NOT_YOUR_SUBJECT` | 403 | Staff app: the teacher neither teaches this subject in the section nor is its class teacher |
| `EXAM_PUBLISHED` | 409 | Results are out: teachers can no longer change marks and the exam cannot be deleted |
| `EXAM_EXISTS`, `CLASS_HAS_MARKS`, `SUBJECT_HAS_MARKS`, `MARKS_ABOVE_MAX` | 409 | Exam name taken this year, or the change would lose or invalidate marks already entered |
| `CLASS_HAS_NO_SUBJECTS`, `NO_MARKS` | 400 | Pick class subjects in School setup first, or enter marks before publishing |

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

### School logo

`GET /me` returns `school: { id, name, code, logo_url }`. Show `logo_url` on the app header and splash; it is `null` when the school has no logo. The link is signed and expires after `FILE_URL_TTL_SECONDS` (1 hour), so take it from a fresh `/me` instead of caching it.

The admin web sets it in School setup → School profile: `POST /files` (purpose `school_logo`, PNG/JPG/WEBP), then `PATCH /admin/school { "logo_file_id": <id> }`, or `null` to remove it. A file that is not an image returns `400 VALIDATION_FAILED` on `logo_file_id`. ID cards, fee receipts, payslips and TCs print the same logo.

### Admin web roles

| Role | Sees in the admin web |
|---|---|
| School admin | Everything in the school, except assigning substitutes |
| Principal | Every module read-only, staff leave approval, announcements |
| AO (Administrative officer) | Admissions, students, staff records, attendance, fee collection, exams (view), timetable (view), announcements, bus status; **the only role that assigns substitutes**. No payroll, users and roles, staff bank details or school setup changes |
| Transport in-charge | Buses, routes and stops, students (view) |

Substitutes: `POST /admin/substitutes`, `POST /admin/substitutes/auto` and `DELETE /admin/substitutes/{id}` need `substitutes.manage` (AO only; others get `403 FORBIDDEN` and can still view the board). A substitute is set for one date and one period, only for a teacher who is on approved leave or absent that day, and only from the teachers who are free in that period (`GET /admin/substitutes/free`); anyone else returns `409 SUBSTITUTE_BUSY`.

### Combine class (instead of a proxy)

When no teacher should take the period, the AO can send the students to other sections of the same class that have a period running at that time with a teacher in:

1. `GET /admin/substitutes/combine-options?date=&slot_id=` returns `students: { total, boys, girls }` and `targets`: each running section with its subject, teacher (its own, or its proxy), `students` and `joining` (students already sent there). Empty `targets` means no other section is running, so assign a proxy.
2. `POST /admin/substitutes/combine` with `mode: "whole"` and `section_id`, or `mode: "split"` with `boys_section_id` and `girls_section_id` (students marked other go with the girls). The teachers of those sections get `CLASS_COMBINED` (English and Tamil).

The board then shows the period with `kind: "combine"` and `combined_into: [{ section, group, students, teacher }]`; a proxy has `kind: "proxy"` and `substitute`. Either one counts as covered. Setting a proxy replaces a combine and the other way round; `DELETE /admin/substitutes/{id}` removes either. Errors: `409 SECTION_NOT_AVAILABLE` (that section has no class with a teacher then), `400` on `girls_section_id` when boys and girls are sent to the same section. AO and super admin only.

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

| `GET /mobile/parent/children/{id}/achievements` | Achievements the school shares, newest first |
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

| `GET /mobile/teacher/timetable/today` | Home: today's periods in bell order with `kind` (class, substitute, free, break), section, subject, room, `students`, `present` (after the morning attendance) and `is_now`. Tap a section to open its student list |
| `GET /mobile/teacher/students/{id}/history` | Student full history: profile and parents (with mobile numbers), attendance this year and this month, leave, remarks and discipline (`behaviour`), `achievements`, health, documents and ID card |
| `GET` / `POST /mobile/teacher/students/{id}/achievements` | List or add an achievement: `{ "title": "Inter-school football", "category": "sports", "level": "district", "result": "winner", "event_scope": "inter_school", "venue_type": "outdoor", "participation": "team", "team_name": "U-14 team", "prize_received": "Trophy", "school_reward": "Medal", "achieved_on": "2026-10-24" }`. Sports needs `venue_type`. Parents are told |
| `GET /mobile/teacher/sections/{id}/activity-ranking` | My section ranked by sports and activity points (default all non-academic; `?category=sports` for sports only) |
| `GET /mobile/teacher/banner` | Home alert banner: `{ date, banners: [{ code, severity, title, message, count?, action: { screen, params? } }] }`, most important first. Codes: `HOLIDAY_TODAY`, `ON_LEAVE_TODAY`, `CHECK_IN_PENDING`, `ATTENDANCE_NOT_MARKED` (`params.section_id`), `PROXY_TODAY`, `COMBINED_CLASS_TODAY`, `LEAVE_REQUESTS_PENDING`, `UNREAD_ALERTS`. Empty list = nothing to show |
| `GET /mobile/teacher/substitutions` | Classes I cover for absent teachers, today and the next 7 days: date, period and time, section, subject, room, who is away, note |

Staff leave status moves `pending_hod` → `pending_principal` → `approved` (or `rejected` at any step). With no HOD in the department it starts at `pending_principal`.

Biometric machines push punches to `POST /integrations/biometric/punches` with header `X-Device-Key` (`BIOMETRIC_WEBHOOK_KEY`); the first punch of the day is the check-in and the last is the check-out.

## Live bus

### Driver app (Driver and Attendant)
| Call | Screen |
|---|---|
| `GET /mobile/driver/trips/today` | Home: my bus, `active_trip` (the trip running now) and each route with today's trips. Show "Start morning pickup" / "Start evening drop" when `active_trip` is null |
| `POST /mobile/driver/trips` | `{ "route_id": 1, "kind": "pickup" }` starts the trip. Parents of the route get "Bus has started". 409 `TRIP_ALREADY_ACTIVE`, 400 `NO_TRACKER` |
| `GET /mobile/driver/trips/{id}` | Trip screen: `stop_list` in travel order with `status` and `eta_seconds`, `school` (end of a pickup), `riders` (with `boarded`, `alighted`), `not_boarded` and `boardings` (newest first) |
| `POST /mobile/driver/trips/{id}/positions` | Phone GPS fallback every 5–10 s: `{ "lat", "lng", "speed", "heading" }`. Used only when the bus tracker is silent for 60 s |
| `POST /mobile/driver/trips/{id}/end` | End by hand. A pickup also ends by itself inside the school gate; a drop after the last stop |
| `POST /mobile/driver/trips/{id}/boardings` | Scan or tap: `{ "action": "boarded", "qr_token": "TZS1.12.1.…" }` after scanning the ID card, or `{ "action": "alighted", "student_id": 12 }` from the `riders` list. Returns the row with `method` (`qr`/`manual`), `stop` (null at the school gate), `occurred_at` and `already_recorded` (a double scan is safe and sends nothing). Parents get **{child} boarded the bus** / **got off the bus**. 409 `NOT_ON_THIS_ROUTE`, `NOT_ON_THIS_TRIP`, `NOT_BOARDED`, `QR_REPLACED` (old card), `TRIP_ENDED`; 400 `QR_INVALID` |
| `POST /mobile/driver/sos` | SOS button: `{ "trip_id"?, "lat"?, "lng"?, "note"? }` (all optional; the running trip and the bus position are used). School admins and the transport in-charge get a push and an SMS with the name and number to call. Pressing again within 2 minutes returns the same alert with `already_raised: true` |

### Parent app
`GET /mobile/parent/children/{id}/bus` returns `status` (`no_trip`, `on_the_way`, `approaching`, `at_stop`, `passed`, `trip_ended`), a ready `headline` ("Bus is 4 min away from Thirumangalam metro"), the child's `stop`, `eta_seconds`, `position` (live, or the bus's last known position with `position_stale`), `trip` and `boarding` (the child's latest scan on that trip: `action`, `method`, `stop`, `occurred_at`; null before the first scan). It is `null` when the child does not use the bus.

Parents are told automatically: **Bus has started** (whole route), **Bus is N min away** (only parents of that stop, before the bus arrives; SMS if the push does not reach the phone) and **Bus reached {stop}**, plus **{child} boarded the bus** and **{child} got off the bus** when the attendant scans the ID card.

At the end of a pickup, class teachers get the list of expected children who were not scanned on (only when the trip had at least one scan, so a bus without scanning sends no false list).

### Live updates (socket.io)
Connect to the namespace `/live` on the API host with `{ auth: { token: "<access_token>" } }`, then:

- `emit('trip.subscribe', { trip_id })` → ack `{ ok: true }`. A parent can follow only a trip their child rides; a driver only their own bus; admins any trip of their school. Otherwise `{ ok: false, error: "FORBIDDEN" }`.
- Receive `trip.position` `{ trip_id, position: { lat, lng, speed, heading, recorded_at, source } }` every few seconds and `trip.event` `{ trip_id, type, stop, eta_seconds, end_reason }` for `trip.started`, `stop.approaching`, `stop.arrived`, `stop.departed`, `trip.ended`.
- `passenger.boarded` / `passenger.alighted` `{ trip_id, boarding_id, student_id, action, method, stop, occurred_at }` on each scan. The fleet room (admin web) also gets `full_name` and `class_section`; trip followers (parents) get only `student_id`.
- Admin web: `emit('fleet.subscribe', {})` to get every trip of the school plus `alert.raised` and `alert.updated` (same shape as an alerts centre row).
- When the access token expires the socket is closed with an `error` event: refresh the token and connect again.

### Alerts centre (admin web)
`GET /admin/fleet/alerts` lists SOS and safety alerts, newest first: search (message, bus, driver), `kind` (`sos`, `overspeed`, `harsh_braking`, `idle`, `route_deviation`, `vehicle_fault`, `other`), `status` (`open`, `acknowledged`, `resolved`), `severity`, `active=true` (not resolved), `vehicle_id`, `trip_id`, `from`, `to`. Each row has `kind_label`, `message`, `vehicle`, `route`, `trip`, `raised_by` (with `mobile` to call), `position`, `data` and who acknowledged or resolved it. `GET /admin/fleet/alerts/insights` returns `open`, `sos_active`, `high_active`, `acknowledged`, `resolved_today`, `raised_today` and `active_by_kind`. `POST .../{id}/acknowledge` (safe to repeat) and `POST .../{id}/resolve` `{ "resolution_note": "Called the driver, all safe" }` (at least 3 characters) need `fleet.manage`; reading needs `fleet.view`.

Safety alerts come from the Telematics service as `alert.raised` webhook events (overspeed, harsh braking, idling, off route). The bus is found from `device_id` (and the trip, when given). Retries of the same event are stored once. The office gets a push; `high` severity also an SMS when the push does not reach the phone.

### Maintenance, fuel, vehicle health and trip replay (admin web)
Read with `fleet.view`, change with `fleet.manage`. `{id}` of a bus is the school bus (`/admin/transport/vehicles`).

| Call | Use |
|---|---|
| `GET /admin/fleet/buses/{id}/health` | Health card: `bus`, `has_tracker`, `open_tickets` and `health` (null without a tracker): `status` `good`/`warning`/`critical`/`unknown`, `reasons`, `battery_v`, `coolant_c`, `rpm`, `fuel_pct`, `odometer_km`, `engine_load_pct`, `reading_at` and `faults` `[{ code, description, severity, first_seen_at }]` |
| `GET /admin/fleet/buses/{id}/obd?from&to&page&limit` | OBD log, newest first. 400 `NO_TRACKER` |
| `GET /admin/fleet/maintenance` | Tickets: search, `status` (`open`, `in_progress`, `done`), `source` (`obd`, `manual`), `vehicle_id`; sort `opened_at`, `closed_at`, `cost`, `status`. `GET .../insights?vehicle_id=` returns `total`, `open`, `in_progress`, `done`, `obd_open`, `cost_this_month` |
| `POST /admin/fleet/maintenance` | `{ "vehicle_id": 1, "title": "Front tyre worn", "description"?, "fault_code"? ("P0301"), "severity"?, "odometer_km"?, "vendor"?, "cost"?, "notes"? }` |
| `PATCH /admin/fleet/maintenance/{id}` | Any field above (not the bus) and `status`; `done` sets `closed_at`, leaving `done` clears it |
| `POST /admin/fleet/maintenance/{id}/close` | `{ "cost"?, "vendor"?, "odometer_km"?, "notes"? }`. 409 `TICKET_CLOSED` |
| `GET /admin/fleet/fuel` | Fuel log: `vehicle_id`, `from`, `to`, search (station, bus); sort `filled_on`, `amount`, `litres`, `odometer_km`. Each entry has `price_per_litre`, `km_since_last` and `km_per_litre` (distance since the previous fill of that bus ÷ litres of this fill; null for the first). `GET .../insights?vehicle_id=` returns this month's `entries_this_month`, `litres_this_month`, `amount_this_month` and `avg_km_per_litre` (last 90 days) |
| `POST` / `PATCH` / `DELETE /admin/fleet/fuel[/{id}]` | `{ "vehicle_id": 1, "filled_on": "2026-11-03", "litres": 60.5, "amount": 5800, "odometer_km": 48213, "station"?, "bill_file_id"? (from `POST /files`), "filled_by"? (user id) }`. `filled_on` cannot be in the future and `odometer_km` must sit between the fills before and after it (field errors) |
| `GET /admin/transport/trips?date&route_id&vehicle_id&status=ended` | Trip history |
| `GET /admin/fleet/trips/{id}/playback?max_points=1500` | Replay: `trip`, `school`, `path` (planned route), `points` `[{ at, lat, lng, speed, heading }]` oldest first (thinned evenly to `max_points`, `sampled` says so), `distance_km`, `duration_seconds`, `max_speed`, `avg_speed`, `stop_arrivals` and `safety_events`. 404 `TRACK_NOT_FOUND` |

When the Telematics service reports a new engine fault code it sends `vehicle.fault` `{ id, type, at, device_id, fault: { code, description, severity }, odometer_km? }`. The bus with that tracker gets a maintenance ticket (`source: obd`, one open ticket per code; retries are stored once) and admins and the transport in-charge get `VEHICLE_FAULT` (push and in-app; `bus`, `code`, `fault`, `severity`).

## Exams, marks and ranking

Grades (CBSE-like, on the percentage): A1 91+, A2 81+, B1 71+, B2 61+, C1 51+, C2 41+, D 33+, E below. A student fails with any subject below its pass marks or absent. `percent` has one decimal. Ranks use competition ranking on the total (1, 2, 2, 4): equal totals share a rank. A student with any mark not entered is `incomplete`, has `percent`, `grade` and ranks `null`, and is not ranked. `result` is `pass`, `fail` or `incomplete`.

### Staff app (Teacher, HOD, Principal)

| Call | Screen |
|---|---|
| `GET /mobile/teacher/exams` | Exams this year with my sections and the subjects I can enter (class teacher: every subject), each with `entered` / `total` |
| `GET /mobile/teacher/exams/{id}/sections/{sectionId}/marks?subject_id=4` | Marks sheet in roll order: `marks`, `is_absent`, `entered`; `editable` is false once results are published |
| `PUT /mobile/teacher/exams/{id}/sections/{sectionId}/marks?subject_id=4` | `{ "items": [{ "student_id": 12, "marks": 78.5, "is_absent": false }] }`. Marks 0 to max marks; `is_absent: true` saves an absence; `marks: null` with `is_absent: false` clears. Some or all students. `400 VALIDATION_FAILED` with `errors[].field` `items.N.marks`; `403 NOT_YOUR_SUBJECT`; `409 EXAM_PUBLISHED` |
| `GET /mobile/teacher/sections/{id}/ranking?exam_id=1` | Students by rank. Without `exam_id`: the latest published exam of the section's class; `exam` is `null` when there is none |

```json
{
  "exam": { "id": 1, "name": "Quarterly exam", "status": "published", "start_date": "2026-09-14", "end_date": "2026-09-24", "published_at": "2026-10-03T10:30:00.000+05:30" },
  "section": { "id": 8, "name": "6 - A", "class_id": 8, "class_name": "6", "section_name": "A" },
  "rows": [
    { "rank": 1, "student_id": 12, "full_name": "Janani Bala", "roll_no": 7, "total": 629, "max_total": 700, "percent": 89.9, "grade": "A2", "result": "pass", "class_rank": 2 },
    { "rank": 6, "student_id": 8, "full_name": "Bharath Kumar", "roll_no": 2, "total": 465, "max_total": 700, "percent": 66.4, "grade": "B2", "result": "pass", "class_rank": 10 },
    { "rank": 6, "student_id": 9, "full_name": "Dharshini Ravi", "roll_no": 4, "total": 465, "max_total": 700, "percent": 66.4, "grade": "B2", "result": "pass", "class_rank": 10 }
  ]
}
```

### Parent app

`GET /mobile/parent/children/{id}/results` lists the child's published results, newest first: `exam`, `class_name`, `section_name`, `total`, `max_total`, `percent`, `grade`, `result`, `section_rank` of `section_size`, `class_rank` of `class_size`, and `subjects[]` with `name`, `code`, `max_marks`, `pass_marks`, `marks`, `is_absent`, `passed`. When the school publishes results the parent gets `RESULT_PUBLISHED` (push and in-app; `exam`, `student`, `percent`, `grade`, `rank` like `2/15`).

### Admin web

`/admin/exams` (list, create with `class_ids`, `PATCH`, `DELETE` draft only), `/admin/exams/{id}/subjects` (`GET`, `PUT` the full list of papers), `/admin/exams/{id}/sections/{sectionId}/marks?subject_id=` (`GET`, `PUT`), `/admin/exams/{id}/sections/{sectionId}/results`, `/admin/exams/{id}/classes/{classId}/toppers?limit=3`, `/admin/exams/{id}/toppers` (top 3 of every class), `POST /admin/exams/{id}/publish` and `/admin/students/{id}/results`. Permissions `exams.view` (Principal, AO) and `exams.manage` (AO).

## Sports and activities

Students are ranked by activities too, not only by marks. Every achievement has `result` (`winner`, `runner_up`, `third_place`, `participated` = took part, no win), `event_scope` (`sports_day`, `in_school`, `inter_school`, `out_of_school`), `venue_type` (`indoor`/`outdoor`, required for `category: "sports"`), `participation` (`individual`/`team` with `team_name`), `prize_received` (what the event gave), `school_reward` (what the school gave) and `points`.

Points = level (class 1, school 2, zone 3, district 5, state 8, national 12, international 15) × result (winner 4, runner-up 3, third 2, took part 1). A district winner scores 20.

| Call | Use |
|---|---|
| `GET /admin/achievements/leaderboard?category=sports` | Students ranked by points (`non_academic` = every activity except academic). Filters `class_id`, `section_id`, `from`, `to` (default: current academic year). Equal points share a rank |
| `GET /admin/achievements` | Every achievement in the school with filters: `category`, `level`, `result` (or `podium`), `event_scope`, `venue_type`, `participation`, `outside_school`, `district_or_above`, class and section, search |
| `GET /admin/achievements/insights` | Counts: total, sports, wins, outside school, district and above, students |
| `GET /mobile/teacher/sections/{id}/activity-ranking` | Same ranking for one of my sections |

## Fees and payment status

A student's fee `status` is one of:

| `status` | Meaning |
|---|---|
| `paid` | Nothing left to pay (also when nothing is billed yet; `total` is then 0) |
| `partly_paid` | Something is paid, a balance is left, nothing is past its due date |
| `due` | A balance is left, nothing is paid, nothing is past its due date |
| `overdue` | Some balance is past its due date (the due date itself is not overdue) |

Every fee summary also has `total`, `paid`, `balance`, `overdue_amount`, `next_due_date` (the next unpaid due date, or the oldest overdue one) and `last_payment` `{ date, amount }` or `null`. Invoices have `status` `unpaid`, `partly_paid`, `paid` or `cancelled`, plus `is_overdue` and `days_overdue`. Amounts are rupees as numbers with up to 2 decimals.

### Staff app (class teacher, read-only)

| Call | Screen |
|---|---|
| `GET /mobile/teacher/sections/{id}/fees` | Section roster with each student's fee `status`, `balance`, `next_due_date`, `overdue_amount`, `last_payment`, plus `counts` per status. Only the class teacher of the section; others get `403 NOT_CLASS_TEACHER` |
| `GET /mobile/teacher/students/{id}/fees` | One student's summary with invoices and payments (same shape as the parent call) |

```json
{
  "section_id": 8,
  "class_section": "6 - A",
  "counts": { "paid": 2, "partly_paid": 3, "due": 2, "overdue": 2 },
  "overdue_amount": 25440,
  "students": [
    { "student_id": 10, "full_name": "Gowtham Raja", "admission_no": "TZMS-2026-0002", "roll_no": 5, "photo_file_id": null,
      "status": "overdue", "total": 32400, "paid": 0, "balance": 32400, "overdue_amount": 18400,
      "next_due_date": "2026-10-03", "last_payment": null }
  ]
}
```

### Parent app

| Call | Screen |
|---|---|
| `GET /mobile/parent/children/{id}/fees` | Fee card and history: status, totals, `invoices` (each with `lines` such as tuition, books and transport, and its `payments`) and every `payment` newest first |
| `GET /mobile/parent/children/{id}/fees/receipts/{paymentId}` | Receipt PDF (`Content-Disposition: attachment`) |

Parents get `FEE_DUE` (category `fees`) when the school raises an invoice, and `FEE_OVERDUE` at 08:00 for each overdue invoice, at most once every 7 days. SMS is sent only if the push does not reach the phone.

### Admin web

`/admin/fees/heads` (CRUD; one transport head), `/admin/fees/plans` and `/admin/fees/plans/{classId}` (`GET`, `PUT` the lines of a class: head, installment, amount, due date), `/admin/fees/installments`, `POST /admin/fees/invoices/generate` `{ class_id?, installment, due_date? }` (safe to run again), `/admin/fees/invoices` (search, `status`, `class_id`, `section_id`, `installment`, `overdue`), `/admin/fees/invoices/{id}`, `PATCH .../discount`, `POST .../cancel`, `POST .../payments`, `/admin/fees/payments` (+ `/summary`, `from`, `to`, `mode`), `/admin/fees/payments/{id}/receipt`, `/admin/fees/insights` and `/admin/students/{id}/fees`. Transport line on an invoice = stop `monthly_fee` × months since the previous installment's due date (the year start for the first one), at least 1. Permissions `fees.view` (Principal, AO) and `fees.manage` (AO).

## Video meetings (Agora)

A teacher and a parent book a short video call about one child. Either side can book it; both join from the app with the Agora SDK (`agora_rtc_engine` in Flutter). The admin web only lists meetings and their call log; it never joins a call.

Flow: book → `MEETING_SCHEDULED` push to the other person → `MEETING_REMINDER` 10 minutes before (SMS if push fails) → join opens 10 minutes before the start → the first join makes it `live` → `end` makes it `completed`. A meeting nobody joins becomes `missed` 30 minutes after its end; a live one is closed as `completed` then. Status: `scheduled`, `live`, `completed`, `missed`, `cancelled`.

Every meeting has `from` (who booked) and `to` (who it was booked with), plus `teacher`, `parent`, `student`, `can_join`, `join_opens_at`, `join_closes_at` and `call_minutes`.

### Staff app (Teacher, HOD, Principal)

| Call | Screen |
|---|---|
| `GET /mobile/teacher/meetings?scope=upcoming` | My meetings; `scope` is `upcoming` (default, soonest first), `past` or `all` |
| `GET /mobile/teacher/students/{id}/parents` | Parents of the student who have the app, primary first |
| `POST /mobile/teacher/meetings` | `{ "student_id": 12, "parent_user_id": 31, "title": "Maths progress", "agenda": null, "scheduled_at": "2026-11-11T16:30:00+05:30", "duration_minutes": 15 }`. `parent_user_id` is optional (primary parent). 5 to 60 minutes, up to 60 days ahead |
| `GET /mobile/teacher/meetings/{id}` | One meeting with `call_log` |
| `POST /mobile/teacher/meetings/{id}/join` | `{ "platform": "android" }` → `{ provider, app_id, channel_name, uid, token, expires_at, meeting }` |
| `POST /mobile/teacher/meetings/{id}/token` | Fresh token during a call (on `onTokenPrivilegeWillExpire`) |
| `POST /mobile/teacher/meetings/{id}/leave` | I left; the meeting stays open so I can rejoin |
| `POST /mobile/teacher/meetings/{id}/end` | End the call for both |
| `POST /mobile/teacher/meetings/{id}/cancel` | `{ "reason": "..." }` before it starts; the parent is told |

### Parent app

`GET /mobile/parent/meetings` (all children, optional `student_id`), `GET /mobile/parent/children/{id}/teachers` (class teacher first, with subjects), `POST /mobile/parent/children/{id}/meetings` `{ "teacher_user_id": 9, "title": "...", "scheduled_at": "...", "duration_minutes": 15 }`, and the same `GET /mobile/parent/meetings/{id}`, `join`, `token`, `leave`, `end`, `cancel` as the staff app.

Join with the SDK: `engine.initialize(RtcEngineContext(appId: app_id))`, then `engine.joinChannel(token: token, channelId: channel_name, uid: uid, options: ...)`. Call `leave` when the user hangs up and `end` to finish for both.

### Admin web

`GET /admin/meetings` (search topic, teacher, parent or student; `status`, `when` today/upcoming/past, `scheduled_by`, `teacher_user_id`, `guardian_id`, `student_id`, `date_from`, `date_to`; sort `scheduled_at`, `created_at`, `status`, `title`), `GET /admin/meetings/insights` and `GET /admin/meetings/{id}` with the call log. Permission `meetings.view` (Admin, Principal, AO). Server settings: `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` (Agora console → project → primary certificate) and `AGORA_TOKEN_TTL_SECONDS`.

## Payslips (every staff app)

`GET /me/payslips` lists the signed-in staff member's payslips for months the office has finalised (paginated, newest first): `month`, `month_label`, `gross`, `total_deductions`, `net`, `paid_days`, `lop_days` and each earning and deduction. `GET /me/payslips/{id}/pdf` downloads the PDF (`Content-Disposition: attachment`). A `PAYSLIP_READY` push arrives when a month is finalised.

## Driver app

Driver and Attendant roles. `GET /mobile/driver/duty` returns my bus and its routes, each with stops in travel order (`lat`, `lng`, `geofence_radius_m`, pickup and drop times) and the students at each stop (`full_name`, `class_section`, `mode` both/pickup/drop, `passenger_ref`). `passenger_ref` is the opaque id the bus tracking system uses; it is never the student id. Sign in as 9000000007 (driver) or 9000000008 (attendant).

## Files

- Upload: `POST /files` as `multipart/form-data` with field `file` and optional `purpose` (snake_case). Images, PDF, Word, Excel and CSV; 10 MB by default.
- The response has `url` and, for images, `thumbnail_url`. Both are signed links that work without a token until `url_expires_at` (1 hour). After that, call `GET /files/{id}` for fresh links.
- Other records store the file `id`, never the URL.
