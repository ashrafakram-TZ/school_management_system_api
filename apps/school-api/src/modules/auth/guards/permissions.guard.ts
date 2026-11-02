import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException, AuthenticatedRequest, IS_PUBLIC, REQUIRED_PERMISSIONS, REQUIRED_ROLES } from '@app/common';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const permissions = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, targets) ?? [];
    const roles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES, targets) ?? [];
    if (!permissions.length && !roles.length) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw AppException.unauthorized('Sign in to continue', 'TOKEN_MISSING');

    const hasPermissions = permissions.every((permission) => user.permissions.includes(permission));
    const hasRole = !roles.length || roles.some((role) => user.roles.includes(role));
    if (!hasPermissions || !hasRole) throw AppException.forbidden();
    return true;
  }
}
