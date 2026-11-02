import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException, AuthenticatedRequest, IS_PUBLIC, RequestContext } from '@app/common';
import { AccessService } from '../../access/access.service';
import { TokenService } from '../token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.header('authorization') ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw AppException.unauthorized('Sign in to continue', 'TOKEN_MISSING');
    }

    const payload = await this.tokens.verifyAccess(token);
    await this.tokens.activeSession(payload.sid, payload.sub);
    const access = await this.access.load(payload.sub);
    if (!access || access.user.deleted_at || access.user.status !== 'active') {
      throw AppException.unauthorized('Your account is not active. Contact the school office.', 'ACCOUNT_INACTIVE');
    }

    request.user = {
      id: access.user.id,
      session_id: payload.sid,
      school_id: access.user.school_id,
      name: access.user.name,
      mobile: access.user.mobile,
      roles: access.roles.map((role) => role.code),
      permissions: access.permissions,
    };
    RequestContext.setUser(access.user.id, access.user.school_id);
    return true;
  }
}
