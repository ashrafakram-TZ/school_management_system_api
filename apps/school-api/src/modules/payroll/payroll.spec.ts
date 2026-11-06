import { computePay, monthLabel, monthlyGross, rupees, StructureInput } from './payroll.calc';
import { lopDays } from './payroll.service';
import { amountInWords, payslipPdf } from './payslip.pdf';

const structure = (overrides: Partial<StructureInput> = {}): StructureInput => ({
  basic: 30000,
  da: 3000,
  hra: 12000,
  conveyance: 1600,
  special_allowance: 3000,
  other_allowance: 0,
  pf_enabled: true,
  esi_enabled: false,
  professional_tax: 208,
  tds: 0,
  other_deduction: 0,
  ...overrides,
});

describe('computePay', () => {
  it('pays the full month with no loss of pay', () => {
    const pay = computePay(structure(), 26, 0);
    expect(pay.gross).toBe(49600);
    expect(pay.pf).toBe(1800);
    expect(pay.total_deductions).toBe(2008);
    expect(pay.net).toBe(47592);
    expect(pay.paid_days).toBe(26);
  });

  it('cuts every earning by the unpaid days', () => {
    const pay = computePay(structure(), 26, 2);
    expect(pay.paid_days).toBe(24);
    expect(pay.basic).toBeCloseTo(27692.31, 2);
    expect(pay.gross).toBeCloseTo(45784.61, 2);
  });

  it('takes PF on basic and DA up to the 15,000 wage ceiling', () => {
    expect(computePay(structure({ basic: 10000, da: 1000 }), 26, 0).pf).toBe(1320);
    expect(computePay(structure(), 26, 0).pf).toBe(1800);
    expect(computePay(structure({ pf_enabled: false }), 26, 0).pf).toBe(0);
  });

  it('takes ESI only when the monthly gross is 21,000 or less', () => {
    const small = structure({
      basic: 12000,
      da: 1200,
      hra: 4800,
      conveyance: 1600,
      special_allowance: 0,
      esi_enabled: true,
    });
    expect(monthlyGross(small)).toBe(19600);
    expect(computePay(small, 26, 0).esi).toBe(147);
    expect(computePay(structure({ esi_enabled: true }), 26, 0).esi).toBe(0);
  });

  it('never deducts more than the gross', () => {
    const pay = computePay(structure({ other_deduction: 999999 }), 26, 25);
    expect(pay.net).toBe(0);
    expect(pay.total_deductions).toBe(pay.gross);
  });

  it('pays nothing and skips professional tax for a month of loss of pay', () => {
    const pay = computePay(structure(), 26, 30);
    expect(pay.paid_days).toBe(0);
    expect(pay.gross).toBe(0);
    expect(pay.professional_tax).toBe(0);
  });
});

describe('lopDays', () => {
  const dates = ['2026-10-01', '2026-10-03', '2026-10-05', '2026-10-06'];

  it('counts days before joining', () => {
    expect(lopDays(dates, '2026-10-05', [], [], new Set())).toBe(2);
  });

  it('counts unpaid leave, half days as half', () => {
    expect(
      lopDays(
        dates,
        '2026-06-01',
        [
          { user_id: 1, date: '2026-10-03', weight: 1 },
          { user_id: 1, date: '2026-10-05', weight: 0.5 },
        ],
        [],
        new Set(),
      ),
    ).toBe(1.5);
  });

  it('counts absence only when no leave covers the day', () => {
    expect(
      lopDays(
        dates,
        '2026-06-01',
        [],
        [
          { user_id: 1, date: '2026-10-01', weight: 1 },
          { user_id: 1, date: '2026-10-06', weight: 1 },
        ],
        new Set(['2026-10-06']),
      ),
    ).toBe(1);
  });

  it('ignores marks outside the working days', () => {
    expect(lopDays(dates, '2026-06-01', [{ user_id: 1, date: '2026-10-04', weight: 1 }], [], new Set())).toBe(0);
  });
});

describe('money and words', () => {
  it('formats rupees the Indian way', () => {
    expect(rupees(123456.5)).toBe('Rs. 1,23,456.50');
  });

  it('writes the amount in words', () => {
    expect(amountInWords(47592)).toBe('Rupees Forty Seven Thousand Five Hundred Ninety Two Only');
    expect(amountInWords(125000.25)).toBe('Rupees One Lakh Twenty Five Thousand and Twenty Five Paise Only');
    expect(amountInWords(0)).toBe('Rupees Zero Only');
  });

  it('names the month', () => {
    expect(monthLabel('2026-10')).toBe('October 2026');
  });
});

describe('payslipPdf', () => {
  it('renders a single-page payslip PDF matching invoice design', async () => {
    const pdf = await payslipPdf({
      school_name: 'Tamilzorous Model School',
      school_code: 'TZMS',
      school_address: '123, Anna Nagar, Chennai',
      school_phone: '044 26201234',
      school_email: 'office@tamilzorous.edu',
      school_logo: null,
      school_signature: null,
      month_label: 'October 2026',
      employee_no: 'EMP-0012',
      name: 'Rajesh Sharma',
      designation: 'Senior Teacher',
      department: 'Science',
      bank: 'State Bank of India ····4321',
      pan_last4: '9876',
      working_days: 26,
      lop_days: 1,
      paid_days: 25,
      earnings: [
        ['Basic', 25000],
        ['House rent allowance', 8000],
      ],
      deductions: [
        ['Provident fund', 1800],
        ['Professional tax', 200],
      ],
      gross: 33000,
      total_deductions: 2000,
      net: 31000,
      draft: false,
    });
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
    expect(pages).toBe(1);
  });
});
