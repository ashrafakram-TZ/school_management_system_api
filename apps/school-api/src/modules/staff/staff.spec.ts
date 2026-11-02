import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BankDetailsInputDto, CreateStaffDto } from './dto/staff-input.dto';
import { attentionReasons, averageLoad, experienceYears } from './staff-metrics';

const errors = async <T extends object>(type: new () => T, plain: object) =>
  (await validate(plainToInstance(type, plain), { whitelist: true, forbidNonWhitelisted: true })).map(
    (error) => error.property,
  );

const clean = { load: 24, sections: 4, documents: 2, pending: 0, rejected: 0 };
const teacher = { staff_type: 'teaching' as const, bank_account_last4: '6789', max_periods_per_week: 30 };

describe('teacher attention', () => {
  it('is empty for a teacher with verified documents, bank details and classes', () => {
    expect(attentionReasons(teacher, clean)).toEqual([]);
  });

  it('lists every reason', () => {
    expect(attentionReasons(teacher, { ...clean, pending: 1 })).toEqual(['documents_pending']);
    expect(attentionReasons(teacher, { ...clean, rejected: 1 })).toEqual(['document_rejected']);
    expect(attentionReasons(teacher, { ...clean, documents: 0 })).toEqual(['no_documents']);
    expect(attentionReasons({ ...teacher, bank_account_last4: null }, clean)).toEqual(['bank_missing']);
    expect(attentionReasons(teacher, { ...clean, sections: 0, load: 0 })).toEqual(['no_classes']);
    expect(attentionReasons(teacher, { ...clean, load: 36 })).toEqual(['overloaded']);
  });

  it('does not expect classes from non-teaching staff', () => {
    expect(
      attentionReasons(
        { ...teacher, staff_type: 'non_teaching', max_periods_per_week: 0 },
        { ...clean, sections: 0, load: 0 },
      ),
    ).toEqual([]);
  });
});

describe('teacher numbers', () => {
  it('adds prior experience to full years at the school', () => {
    expect(experienceYears('2019-06-03', 2, '2026-06-02')).toBe(8);
    expect(experienceYears('2019-06-03', 2, '2026-06-03')).toBe(9);
    expect(experienceYears('2026-11-02', 0, '2026-11-02')).toBe(0);
  });

  it('averages load to one decimal', () => {
    expect(averageLoad([24, 30, 7])).toBe(20.3);
    expect(averageLoad([])).toBe(0);
  });
});

describe('staff input rules', () => {
  const base = {
    name: 'Priya Venkatesh',
    mobile: '9000000004',
    role_codes: ['TEACHER'],
    staff_type: 'teaching',
    designation: 'PG Assistant',
  };

  it('accepts a teacher and rejects unknown roles and the super admin role', async () => {
    expect(await errors(CreateStaffDto, base)).toEqual([]);
    expect(await errors(CreateStaffDto, { ...base, role_codes: ['PARENT'] })).toEqual(['role_codes']);
    expect(await errors(CreateStaffDto, { ...base, role_codes: ['SUPER_ADMIN'] })).toEqual(['role_codes']);
    expect(await errors(CreateStaffDto, { ...base, role_codes: [] })).toEqual(['role_codes']);
  });

  it('checks IFSC, account number and PAN formats', async () => {
    const bank = { account_holder: 'Priya', bank_name: 'Indian Bank', ifsc: 'idib000t012', account_no: '6123 4567 89' };
    expect(await errors(BankDetailsInputDto, bank)).toEqual([]);
    expect(plainToInstance(BankDetailsInputDto, bank).ifsc).toBe('IDIB000T012');
    expect(await errors(BankDetailsInputDto, { ...bank, ifsc: 'IDIB1234567' })).toEqual(['ifsc']);
    expect(await errors(BankDetailsInputDto, { ...bank, account_no: '12AB' })).toEqual(['account_no']);
    expect(await errors(BankDetailsInputDto, { ...bank, pan: 'abcpv1234k' })).toEqual([]);
    expect(await errors(BankDetailsInputDto, { ...bank, pan: 'ABC1234' })).toEqual(['pan']);
  });
});
