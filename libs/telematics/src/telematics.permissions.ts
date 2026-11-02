export const FLEET_PERMISSIONS = {
  VIEW: 'fleet.view',
  MANAGE: 'fleet.manage',
} as const;

export const FLEET_PERMISSION_CATALOG = [
  { code: FLEET_PERMISSIONS.VIEW, name: 'View fleet, devices and live tracking', group: 'Fleet' },
  { code: FLEET_PERMISSIONS.MANAGE, name: 'Add, edit and remove fleet devices', group: 'Fleet' },
];
