import { UserAccess } from '../access/access.service';
import { RoleSummaryDto, UserListItemDto, UserProfileDto } from './dto/user-response.dto';

export function toRoleSummaries(access: UserAccess): RoleSummaryDto[] {
  return access.roles.map((role) => ({ code: role.code, name: role.name, app: role.app }));
}

export function toUserListItem(access: UserAccess): UserListItemDto {
  const { user } = access;
  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    status: user.status,
    language: user.language,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
    roles: toRoleSummaries(access),
  };
}

export function toUserProfile(access: UserAccess): UserProfileDto {
  const { user } = access;
  return {
    ...toUserListItem(access),
    school: user.school ? { id: user.school.id, name: user.school.name, code: user.school.code } : null,
    apps: access.apps,
    permissions: access.permissions,
    photo_file_id: user.photo_file_id,
  };
}
