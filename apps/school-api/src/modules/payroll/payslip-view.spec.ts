import { groupByYear, monthPattern, payslipLines } from './payslip-view';

const amounts = {
  basic: 25000,
  da: 0,
  hra: 6000,
  conveyance: 1600,
  special_allowance: 0,
  other_allowance: 0,
  pf: 1800,
  esi: 0,
  professional_tax: 208,
  tds: 0,
  other_deduction: 0,
};

describe('payslip preview', () => {
  it('lists only the lines with an amount, Basic always', () => {
    const { earnings, deductions } = payslipLines({ ...amounts, basic: 0 });
    expect(earnings.map((line) => line.code)).toEqual(['basic', 'hra', 'conveyance']);
    expect(deductions).toEqual([
      { code: 'pf', label: 'Provident fund (PF)', amount: 1800 },
      { code: 'professional_tax', label: 'Professional tax', amount: 208 },
    ]);
  });

  it('builds the month filter', () => {
    expect(monthPattern()).toBeNull();
    expect(monthPattern(2026)).toBe('2026-__');
    expect(monthPattern(2026, 9)).toBe('2026-09');
    expect(monthPattern(undefined, 3)).toBe('____-03');
  });

  it('groups months by year, newest first, with the yearly total', () => {
    const years = groupByYear([
      { id: 1, month: '2025-12', month_label: 'December 2025', net: 30000 },
      { id: 3, month: '2026-09', month_label: 'September 2026', net: 31000.5 },
      { id: 2, month: '2026-08', month_label: 'August 2026', net: 31000 },
    ]);
    expect(years.map((year) => year.year)).toEqual([2026, 2025]);
    expect(years[0]).toMatchObject({ total_net: 62000.5 });
    expect(years[0]!.months.map((month) => month.month_no)).toEqual([9, 8]);
  });
});
