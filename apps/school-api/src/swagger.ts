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
  ['Admin · Transport', 'Buses, trackers, drivers, document expiry, routes and stops, students by stop'],
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
${DESCRIPTION}`,
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
  const document = SwaggerModule.createDocument(app, builder.build());

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
