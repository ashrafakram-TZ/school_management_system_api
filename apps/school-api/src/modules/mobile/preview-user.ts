import { AuthUser } from '@app/common';
import { ROLES } from '../access/access.catalog';

export type PreviewRole = typeof ROLES.PARENT | typeof ROLES.TEACHER;

export function viewAs(userId: number, name: string, schoolId: number, role: PreviewRole): AuthUser {
  return { id: userId, session_id: 0, school_id: schoolId, name, mobile: '', roles: [role], permissions: [] };
}
