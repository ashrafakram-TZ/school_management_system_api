import { AppException } from '@app/common';
import { authEmail, centralMessage, centralRole, mapCentralError } from './central-auth.client';

const codeOf = (error: AppException) => (error.getResponse() as { code: string }).code;

describe('centralRole', () => {
  it('sends school admins and the super admin as TENANT', () => {
    expect(centralRole(['ADMIN'])).toBe('TENANT');
    expect(centralRole(['SUPER_ADMIN'])).toBe('TENANT');
  });

  it('sends parents, teachers and other staff as TECHNICIAN', () => {
    expect(centralRole(['PARENT'])).toBe('TECHNICIAN');
    expect(centralRole(['TEACHER', 'HOD'])).toBe('TECHNICIAN');
    expect(centralRole([])).toBe('TECHNICIAN');
  });
});

describe('authEmail', () => {
  it('builds an address from the name and the last 4 digits', () => {
    expect(authEmail('Kavin Narayanan', '9876543210', 'school.tamilzorous.com')).toBe(
      'kavin.narayanan.3210@school.tamilzorous.com',
    );
  });

  it('uses the full mobile for the second try', () => {
    expect(authEmail('Kavin Narayanan', '9876543210', 'school.tamilzorous.com', true)).toBe(
      'kavin.narayanan.9876543210@school.tamilzorous.com',
    );
  });

  it('keeps only letters and digits, even for Tamil names', () => {
    expect(authEmail('S. Ravi Kumar (Father)', '9000000001', 'x.com')).toBe('s.ravi.kumar.father.0001@x.com');
    expect(authEmail('முருகன்', '9000000002', 'x.com')).toBe('user.0002@x.com');
  });
});

describe('mapCentralError', () => {
  it.each([
    [400, 'Please wait 25 seconds before requesting a new OTP', 'OTP_RESEND_TOO_SOON'],
    [400, 'Maximum OTP attempts exceeded', 'OTP_ATTEMPTS_EXCEEDED'],
    [400, 'OTP has expired. Please request a new OTP', 'OTP_EXPIRED'],
    [400, 'OTP not found. Please request a new OTP', 'OTP_EXPIRED'],
    [400, 'Invalid OTP', 'OTP_INVALID'],
    [429, 'ThrottlerException: Too Many Requests', 'OTP_RATE_LIMITED'],
    [500, 'Internal server error', 'AUTH_SERVICE_UNAVAILABLE'],
  ])('%s "%s" → %s', (status, message, code) => {
    expect(codeOf(mapCentralError(status, message))).toBe(code);
  });

  it('reads string and list messages', () => {
    expect(centralMessage({ message: ['email must be an email', 'name should not be empty'] })).toBe(
      'email must be an email; name should not be empty',
    );
    expect(centralMessage(null)).toBe('');
  });
});
