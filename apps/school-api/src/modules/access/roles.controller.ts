import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, RequirePermissions } from '@app/common';
import { PERMISSIONS } from './access.catalog';
import { AccessService } from './access.service';
import { PermissionDto, RoleDto } from './dto/role-response.dto';

@ApiTags('Admin · Roles')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@RequirePermissions(PERMISSIONS.ROLES_VIEW)
@Controller('admin')
export class RolesController {
  constructor(private readonly access: AccessService) {}

  @Get('roles')
  @ApiOperation({ summary: 'List roles with their permissions and user counts' })
  @ApiEnvelope(RoleDto, { isArray: true })
  async roles(): Promise<RoleDto[]> {
    const roles = await this.access.listRoles();
    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      app: role.app,
      user_count: role.user_count,
      permissions: (role.permissions ?? []).map((permission) => permission.code).sort(),
    }));
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List every permission, grouped by area' })
  @ApiEnvelope(PermissionDto, { isArray: true })
  async permissions(): Promise<PermissionDto[]> {
    const permissions = await this.access.listPermissions();
    return permissions.map(({ code, name, group_name }) => ({ code, name, group_name }));
  }
}
