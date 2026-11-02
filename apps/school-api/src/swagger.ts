import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const DESCRIPTION = `
One API and one database for the Admin web and the Flutter app (Staff, Parent and Driver roles).

**Base URL**: \`/api/v1\`. A \`v2\` route is added only for a breaking change; v1 keeps working next to it.

**Sign in**: \`POST /auth/otp/request\` → \`POST /auth/otp/verify\` → send \`Authorization: Bearer <access_token>\` on every call.
When a call returns 401 with \`TOKEN_EXPIRED\`, call \`POST /auth/refresh\` once and retry. Store the new refresh token every time.

**Success**: \`{ "status": 200, "message": "OK", "data": ... }\`

**List**: \`data = { items, total, page, limit, total_pages, has_next }\`. Query: \`page\`, \`limit\` (max 100), \`search\`, \`sort\`, \`order\` (asc|desc) and filters.

**Error**: \`{ "status": 400, "error": "VALIDATION_FAILED", "message": "...", "errors": [{ "field": "mobile", "message": "..." }] }\`. Switch on \`error\`, show \`message\`.

**Fields**: snake_case. IDs are integers. Dates are ISO 8601 with the +05:30 offset. Mobile numbers are 10 digits.

**Families**: \`/auth\`, \`/me\` (every app), \`/admin/*\` (Admin web), \`/mobile/parent|teacher|driver/*\` (Flutter role screens), \`/fleet/*\` (Telematics plug-in), \`/files\`.

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

export function setupSwagger(app: INestApplication): void {
  const builder = new DocumentBuilder()
    .setTitle('Tamilzorous School Management API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
  TAGS.forEach(([name, description]) => builder.addTag(name, description));

  const document = SwaggerModule.createDocument(app, builder.build());
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'School Management API',
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: -1,
      docExpansion: 'none',
      filter: true,
      displayRequestDuration: true,
    },
  });
}
