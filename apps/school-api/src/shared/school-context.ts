import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { AppException, AuthenticatedRequest } from '@app/common';
import { ROLES } from '../modules/access/access.catalog';

export const SCHOOL_HEADER = 'x-school-id';

export function resolveSchoolId(request: AuthenticatedRequest): number {
  const user = request.user;
  if (user?.school_id) return user.school_id;
  if (user?.roles.includes(ROLES.SUPER_ADMIN)) {
    const id = Number(request.header(SCHOOL_HEADER));
    if (Number.isInteger(id) && id > 0) return id;
  }
  throw AppException.badRequest('Choose a school first', 'SCHOOL_REQUIRED');
}

export const SchoolId = createParamDecorator((_data: unknown, ctx: ExecutionContext): number =>
  resolveSchoolId(ctx.switchToHttp().getRequest<AuthenticatedRequest>()),
);

export const ApiSchoolHeader = () =>
  ApiHeader({
    name: 'X-School-Id',
    required: false,
    description: 'Super admin only: the school to work on. School users always work on their own school.',
  });
