import { nextStatus } from './staff-leave.service';

describe('nextStatus', () => {
  it('moves an HOD approval on to the principal', () => {
    expect(nextStatus('pending_hod', 'approved', false)).toBe('pending_principal');
  });

  it('approves when the principal decides', () => {
    expect(nextStatus('pending_principal', 'approved', true)).toBe('approved');
  });

  it('approves at once when the principal approves a request still with the HOD', () => {
    expect(nextStatus('pending_hod', 'approved', true)).toBe('approved');
  });

  it('rejects at any stage', () => {
    expect(nextStatus('pending_hod', 'rejected', false)).toBe('rejected');
    expect(nextStatus('pending_principal', 'rejected', true)).toBe('rejected');
  });
});
