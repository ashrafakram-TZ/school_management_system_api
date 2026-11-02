import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Request } from 'express';

export interface AuthUser {
  id: number;
  session_id: number;
  school_id: number | null;
  name: string;
  mobile: string;
  roles: string[];
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const IS_PUBLIC = 'is_public';
export const REQUIRED_PERMISSIONS = 'required_permissions';
export const REQUIRED_ROLES = 'required_roles';

export const Public = () => SetMetadata(IS_PUBLIC, true);

export const RequirePermissions = (...permissions: string[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);

export const RequireRoles = (...roles: string[]) => SetMetadata(REQUIRED_ROLES, roles);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
});
