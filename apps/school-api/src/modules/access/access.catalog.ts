import { FLEET_PERMISSION_CATALOG, FLEET_PERMISSIONS } from '@app/telematics';
import { AppSection } from './entities/role.entity';

export const PERMISSIONS = {
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  ROLES_VIEW: 'roles.view',
  SCHOOLS_VIEW: 'schools.view',
  SCHOOLS_MANAGE: 'schools.manage',
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_SEND: 'notifications.send',
  FLEET_VIEW: FLEET_PERMISSIONS.VIEW,
  FLEET_MANAGE: FLEET_PERMISSIONS.MANAGE,
} as const;

export interface PermissionDefinition {
  code: string;
  name: string;
  group: string;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  { code: PERMISSIONS.USERS_VIEW, name: 'View users and their roles', group: 'Users' },
  { code: PERMISSIONS.USERS_MANAGE, name: 'Add, edit, deactivate users and assign roles', group: 'Users' },
  { code: PERMISSIONS.ROLES_VIEW, name: 'View roles and permissions', group: 'Users' },
  { code: PERMISSIONS.SCHOOLS_VIEW, name: 'View school setup', group: 'School' },
  { code: PERMISSIONS.SCHOOLS_MANAGE, name: 'Edit school setup and masters', group: 'School' },
  { code: PERMISSIONS.NOTIFICATIONS_VIEW, name: 'View sent notifications and the SMS outbox', group: 'Communication' },
  { code: PERMISSIONS.NOTIFICATIONS_SEND, name: 'Send notifications and test messages', group: 'Communication' },
  ...FLEET_PERMISSION_CATALOG,
];

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  PRINCIPAL: 'PRINCIPAL',
  AO: 'AO',
  TRANSPORT_INCHARGE: 'TRANSPORT_INCHARGE',
  HOD: 'HOD',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
  DRIVER: 'DRIVER',
  ATTENDANT: 'ATTENDANT',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export interface RoleDefinition {
  code: RoleCode;
  name: string;
  description: string;
  app: AppSection;
  permissions: string[] | 'all';
}

const ALL = PERMISSION_CATALOG.map((permission) => permission.code);

export const ROLE_CATALOG: RoleDefinition[] = [
  {
    code: ROLES.SUPER_ADMIN,
    name: 'Super admin',
    description: 'Tamilzorous platform owner. Full access to every school.',
    app: 'admin',
    permissions: 'all',
  },
  {
    code: ROLES.ADMIN,
    name: 'School admin',
    description: 'Full access to one school in the admin web.',
    app: 'admin',
    permissions: 'all',
  },
  {
    code: ROLES.PRINCIPAL,
    name: 'Principal',
    description: 'Oversees the school; approves leave and views every module.',
    app: 'admin',
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.SCHOOLS_VIEW,
      PERMISSIONS.NOTIFICATIONS_VIEW,
      PERMISSIONS.NOTIFICATIONS_SEND,
      PERMISSIONS.FLEET_VIEW,
    ],
  },
  {
    code: ROLES.AO,
    name: 'Administrative officer',
    description: 'Runs the school office: admissions, records, announcements, leave processing.',
    app: 'admin',
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.SCHOOLS_VIEW,
      PERMISSIONS.NOTIFICATIONS_VIEW,
      PERMISSIONS.NOTIFICATIONS_SEND,
    ],
  },
  {
    code: ROLES.TRANSPORT_INCHARGE,
    name: 'Transport in-charge',
    description: 'Manages buses, routes and transport alerts.',
    app: 'admin',
    permissions: [PERMISSIONS.FLEET_VIEW, PERMISSIONS.FLEET_MANAGE, PERMISSIONS.NOTIFICATIONS_VIEW],
  },
  {
    code: ROLES.HOD,
    name: 'Head of department',
    description: 'Teacher who also approves leave for the department.',
    app: 'staff',
    permissions: [],
  },
  {
    code: ROLES.TEACHER,
    name: 'Teacher',
    description: 'Uses the Staff app for classes, attendance, diary and chat.',
    app: 'staff',
    permissions: [],
  },
  {
    code: ROLES.PARENT,
    name: 'Parent',
    description: 'Uses the Parent app to follow their children.',
    app: 'parent',
    permissions: [],
  },
  {
    code: ROLES.DRIVER,
    name: 'Driver',
    description: 'Uses the Driver app to run bus trips.',
    app: 'driver',
    permissions: [],
  },
  {
    code: ROLES.ATTENDANT,
    name: 'Bus attendant',
    description: 'Uses the Driver app to scan students on and off the bus.',
    app: 'driver',
    permissions: [],
  },
];

export function rolePermissions(role: RoleDefinition): string[] {
  return role.permissions === 'all' ? ALL : role.permissions;
}

export const FULL_ACCESS_ROLES: string[] = [ROLES.SUPER_ADMIN];
