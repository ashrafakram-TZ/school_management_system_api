import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';

const DESCRIPTION = `
One API and one database for the Admin web and the Flutter app (Staff, Parent and Driver roles).

**Base URL**: \`/api/v1\`. A \`v2\` route is added only for a breaking change; v1 keeps working next to it.

**Sign in**: \`POST /auth/otp/request\` → \`POST /auth/otp/verify\` → send \`Authorization: Bearer <access_token>\` on every call.
When a call returns 401 with \`TOKEN_EXPIRED\`, call \`POST /auth/refresh\` once and retry. Store the new refresh token every time.

**Success**: \`{ "status": 200, "message": "OK", "data": ... }\`

**List**: \`data = { items, total, page, limit, total_pages, has_next }\`. Query: \`page\`, \`limit\` (max 100), \`search\`, \`sort\`, \`order\` (asc|desc) and filters.

**Error**: \`{ "status": 400, "error": "VALIDATION_FAILED", "message": "...", "errors": [{ "field": "mobile", "message": "..." }] }\`. Switch on \`error\`, show \`message\`.

**Fields**: snake_case. IDs are integers. Dates are ISO 8601 with the +05:30 offset. Mobile numbers are 10 digits.

**Families**: \`/auth\`, \`/me\`, \`/files\` (every app), \`/admin/*\` (Admin web, read-only bus status under \`/admin/fleet\`), \`/mobile/parent|teacher|driver/*\` (Flutter role screens).

Every response has an \`X-Request-Id\` header. Quote it when reporting a problem.
`;

const TAGS: [string, string][] = [
  ['Auth', 'OTP sign-in, token refresh and sign-out'],
  ['Me', 'Signed-in user profile and push device registration'],
  ['Me · Notifications', 'In-app notification centre'],
  ['Files', 'Uploads and signed download links'],
  ['Mobile · Parent', 'Parent app screens'],
  ['Mobile · Teacher', 'Staff app screens for teachers'],
  ['Admin · Students', 'Students, class placement, guardians, roll numbers, Excel import'],
  ['Admin · Student records', 'Documents with verification, health and vaccinations, behaviour notes'],
  [
    'Admin · ID cards, TC and promotion',
    'ID card PDFs with signed QR, transfer and withdrawal with TC, year-end promotion',
  ],
  ['Admin · Staff', 'Staff profiles, qualifications, documents, encrypted bank details, teacher assignments'],
  ['Admin · Attendance', 'Student attendance board, marking, monthly reports and parent leave requests'],
  ['Admin · Staff attendance', 'Staff check-in board, monthly view and manual correction'],
  ['Admin · Staff leave', 'Leave types, balances and the HOD then principal approval flow'],
  ['Admin · Timetable', 'Bell schedule, section timetable builder with clash checks, workload report'],
  ['Admin · Substitutes', 'Teachers away today, free teachers per period, assign and notify substitutes'],
  ['Admin · Payroll', 'Salary structures, monthly payroll runs, payslip PDFs'],
  ['Admin · Fees', 'Fee heads, class fee plans, invoices with transport, payments, receipts and dues'],
  ['Admin · Exams', 'Exams, papers, marks entry, ranked results, rank holders and publishing'],
  ['Admin · Transport', 'Buses, trackers, drivers, document expiry, routes and stops, students by stop'],
  [
    'Admin · Trips',
    'Live bus trips: start and end, stop timeline with ETA, riders and not-boarded list. Live updates over the /live socket.',
  ],
  ['Mobile · Driver', 'Driver and attendant app: my bus, route, stops and students'],
  ['Integrations', 'Machine-to-machine webhooks such as biometric punches (X-Device-Key)'],
  ['Admin · Admissions', 'Applications: applied, approved, rejected, enrolled'],
  ['Admin · Parents and guardians', 'Parents with their children'],
  ['Admin · School setup', 'School profile, academic years, terms, classes, sections, subjects, holidays'],
  ['Platform · Schools', 'Super admin: every school on the platform'],
  ['Admin · Users', 'Users, roles assignment and insights'],
  ['Admin · Roles', 'Roles and permissions'],
  ['Admin · Notifications', 'Outbox, delivery insights, templates and test sends'],
  ['Admin · Fleet', 'Live bus status and positions, read from the Telematics service'],
  ['Health', 'Service status'],
];

const CENTRAL_SIGN_IN = `**Sign-in uses the Tamilzorous Auth Service.** The OTP SMS is sent and checked by the central Auth Service. Apps call only the \`/auth/*\` endpoints of this API; this API talks to the Auth Service and returns the school session (school and roles). Do not call the Auth Service directly from the web or mobile app. Refresh and sign-out stay in this API until the Auth Service provides them.`;

const LOCAL_SIGN_IN = `**Sign-in uses this API's own OTP** (\`AUTH_PROVIDER=local\`, for local testing; the test code is 123456 when \`OTP_MODE=test\`).`;

const SIGN_IN_FLOW = `### Mobile app: sign-in and role switch (read first)

One Flutter app for Parent, Staff (teacher) and Driver. One sign-in per person; one token works for every role they have.

1. **Mobile number screen**: \`POST /auth/otp/request\` with \`{ "mobile": "9791543989", "app": "mobile" }\`. A number with no Parent, Teacher, HOD, Driver or Attendant role gets **403 APP_NOT_ALLOWED** and no SMS is sent. Admin-only users (super admin, principal, AO) cannot use the mobile app.
2. **OTP screen**: \`POST /auth/otp/verify\` with \`{ "mobile", "otp", "client": { "app": "mobile", "platform": "android" } }\`. Save \`access_token\` and \`refresh_token\`; read \`data.user.mobile_apps\` and \`data.user.sections\`.
3. **Where to go next** (decide from \`mobile_apps\`):

| \`mobile_apps\` | Open |
|---|---|
| \`["parent"]\` | Parent home directly, no chooser |
| \`["staff"]\` | Staff home directly |
| \`["driver"]\` | Driver home directly |
| two or more, e.g. \`["staff", "parent"]\` | Chooser screen: one button per item in \`sections\` (use \`label\`), then open that home |

4. **Switch role** later from the profile menu ("Switch to Parent / Staff"): no new OTP and no new token. The same \`access_token\` calls \`/mobile/parent/*\`, \`/mobile/teacher/*\` or \`/mobile/driver/*\`; each endpoint checks the role. Remember the last choice on the phone and call \`GET /me\` on app start to rebuild the chooser.
5. **Keep signed in** with \`POST /auth/refresh\` (store the new refresh token every time); **sign out** with \`POST /auth/logout\`.

### Live bus (parent and driver)

- **Parent**: \`GET /mobile/parent/children/{id}/bus\` gives status, headline, ETA to the child's stop and the bus position. **Driver**: \`GET /mobile/driver/trips/today\`, start with \`POST /mobile/driver/trips\`, phone GPS fallback \`POST /mobile/driver/trips/{id}/positions\`.
- **Live updates**: socket.io namespace \`/live\` with \`{ auth: { token } }\`; \`emit('trip.subscribe', { trip_id })\`, then receive \`trip.position\` and \`trip.event\`. A parent can follow only their own child's trip.

Sample number with both roles in the demo school: **9791543989** (Teacher of 6 - A Computer Science, and Parent of Aadhavan Senthil). It gets \`"mobile_apps": ["staff", "parent"]\`.

Second sample: **9566331808** (Venkatesh). Teacher of 7 - A Mathematics and 3 - A English (class teacher of 3 - A), and Parent of Nila Narayanan (3 - A, rides Bus 2). It gets \`"mobile_apps": ["parent", "staff"]\`.

A person cannot be both teaching staff (Teacher, HOD) and bus crew (Driver, Attendant); the admin gets \`400 VALIDATION_FAILED\` on \`role_codes\`. Parent can go with either.`;

const AFTER_VERIFY =
  'After sign-in, read data.user.mobile_apps: one item → open that home directly; two or more → show a chooser from data.user.sections (label) and open the chosen home. Switching later needs no new OTP or token.';

const ME_HELP =
  'Call on app start: mobile_apps and sections rebuild the role chooser ("Switch to Parent / Staff"). The same token works for every section listed.';

function describeSignIn(document: OpenAPIObject): OpenAPIObject {
  const central = process.env.AUTH_PROVIDER === 'central';
  const summaries: Record<string, string> = central
    ? {
        'otp/request': 'Step 1: send OTP (sent by the Tamilzorous Auth Service)',
        'otp/verify': 'Step 2: verify OTP with the Tamilzorous Auth Service and get the school session',
        refresh: 'Refresh the school session (this API, until the Auth Service adds refresh)',
        logout: 'Sign out (this API, until the Auth Service adds sign-out)',
      }
    : {};
  const paths = Object.fromEntries(
    Object.entries(document.paths).map(([path, item]) => {
      const key = Object.keys(summaries).find((name) => path.endsWith(`/auth/${name}`));
      const isVerify = path.endsWith('/auth/otp/verify');
      const isMe = /\/v\d+\/me$/.test(path);
      if (!key && !isVerify && !isMe) return [path, item];
      const operations = Object.fromEntries(
        Object.entries(item).map(([method, operation]) => {
          if (typeof operation !== 'object' || !operation || !('responses' in operation)) return [method, operation];
          const current = operation as { summary?: string; description?: string };
          const extra = isVerify ? AFTER_VERIFY : isMe && method === 'get' ? ME_HELP : '';
          return [
            method,
            {
              ...operation,
              ...(key ? { summary: summaries[key] } : {}),
              ...(extra ? { description: [extra, current.description].filter(Boolean).join(' ') } : {}),
            },
          ];
        }),
      );
      return [path, operations];
    }),
  );
  return {
    ...document,
    info: {
      ...document.info,
      description: `${central ? CENTRAL_SIGN_IN : LOCAL_SIGN_IN}

${SIGN_IN_FLOW}

${document.info.description ?? ''}`,
    },
    paths,
    tags: (document.tags ?? []).map((tag) =>
      tag.name === 'Auth'
        ? {
            ...tag,
            description: central
              ? 'Sign-in through the Tamilzorous Auth Service (OTP sent and checked there), school session, refresh and sign-out'
              : 'OTP sign-in (this API, local mode), token refresh and sign-out',
          }
        : tag,
    ),
  };
}

const SHARED = /^\/api\/(v\d+\/)?(auth|me|files|health)(\/|$)/;

const AUDIENCES = [
  {
    slug: 'admin',
    title: 'Tamilzorous School Management API · Admin web',
    intro: 'Routes for the School Admin web: \`/admin/*\` and \`/integrations/*\`, plus sign-in, \`/me\` and files.',
    owns: /^\/api\/v\d+\/(admin|integrations)\//,
  },
  {
    slug: 'mobile',
    title: 'Tamilzorous School Management API · Mobile app',
    intro:
      'Routes for the Flutter app (Parent, Staff and Driver): \`/mobile/parent|teacher|driver/*\`, plus sign-in, \`/me\` and files.',
    owns: /^\/api\/v\d+\/mobile\//,
  },
] as const;

const UI_OPTIONS: SwaggerCustomOptions['swaggerOptions'] = {
  persistAuthorization: true,
  defaultModelsExpandDepth: -1,
  docExpansion: 'none',
  filter: true,
  displayRequestDuration: true,
};

function slice(document: OpenAPIObject, owns: RegExp, title: string, intro: string): OpenAPIObject {
  const paths = Object.fromEntries(
    Object.entries(document.paths).filter(([path]) => owns.test(path) || SHARED.test(path)),
  );
  const used = new Set(
    Object.values(paths).flatMap((item) =>
      Object.values(item as Record<string, { tags?: string[] }>).flatMap((operation) => operation?.tags ?? []),
    ),
  );
  return {
    ...document,
    info: {
      ...document.info,
      title,
      description: `${intro}

${document.info.description ?? DESCRIPTION}`,
    },
    paths,
    tags: (document.tags ?? []).filter((tag) => used.has(tag.name)),
  };
}

export function setupSwagger(app: INestApplication): void {
  const builder = new DocumentBuilder()
    .setTitle('Tamilzorous School Management API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
  TAGS.forEach(([name, description]) => builder.addTag(name, description));
  const document = describeSignIn(SwaggerModule.createDocument(app, builder.build()));

  for (const audience of AUDIENCES) {
    SwaggerModule.setup(
      `api/docs/${audience.slug}`,
      app,
      slice(document, audience.owns, audience.title, audience.intro),
      {
        jsonDocumentUrl: `api/docs/${audience.slug}-json`,
        customSiteTitle: audience.title,
        swaggerOptions: UI_OPTIONS,
      },
    );
  }

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'School Management API',
    explorer: true,
    swaggerOptions: {
      ...UI_OPTIONS,
      urls: AUDIENCES.map((audience) => ({
        name: audience.slug === 'admin' ? 'Admin web' : 'Mobile app',
        url: `/api/docs/${audience.slug}-json`,
      })),
    },
  });
}
