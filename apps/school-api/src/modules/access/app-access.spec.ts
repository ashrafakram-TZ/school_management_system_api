import { canOpen } from './entities/role.entity';

describe('canOpen', () => {
  it('lets the mobile app open for parents, staff and drivers only', () => {
    expect(canOpen('mobile', ['parent'])).toBe(true);
    expect(canOpen('mobile', ['staff', 'parent'])).toBe(true);
    expect(canOpen('mobile', ['driver'])).toBe(true);
    expect(canOpen('mobile', ['admin'])).toBe(false);
    expect(canOpen('mobile', [])).toBe(false);
  });

  it('lets the admin web open only for admin roles', () => {
    expect(canOpen('admin', ['admin'])).toBe(true);
    expect(canOpen('admin', ['admin', 'parent'])).toBe(true);
    expect(canOpen('admin', ['parent', 'staff'])).toBe(false);
  });

  it('checks the exact section for older app builds', () => {
    expect(canOpen('parent', ['admin'])).toBe(false);
    expect(canOpen('parent', ['parent'])).toBe(true);
    expect(canOpen('staff', ['parent'])).toBe(false);
  });
});
