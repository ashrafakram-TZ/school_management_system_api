export interface PayslipAmounts {
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  special_allowance: number;
  other_allowance: number;
  pf: number;
  esi: number;
  professional_tax: number;
  tds: number;
  other_deduction: number;
}

export interface PayslipLine {
  code: string;
  label: string;
  amount: number;
}

const EARNINGS: [keyof PayslipAmounts, string][] = [
  ['basic', 'Basic'],
  ['da', 'Dearness allowance (DA)'],
  ['hra', 'House rent allowance (HRA)'],
  ['conveyance', 'Conveyance'],
  ['special_allowance', 'Special allowance'],
  ['other_allowance', 'Other allowance'],
];

const DEDUCTIONS: [keyof PayslipAmounts, string][] = [
  ['pf', 'Provident fund (PF)'],
  ['esi', 'ESI'],
  ['professional_tax', 'Professional tax'],
  ['tds', 'Income tax (TDS)'],
  ['other_deduction', 'Other deduction'],
];

const lines = (amounts: PayslipAmounts, labels: [keyof PayslipAmounts, string][]): PayslipLine[] =>
  labels
    .map(([code, label]) => ({ code, label, amount: Number(amounts[code]) }))
    .filter((line) => line.amount > 0 || line.code === 'basic');

export function payslipLines(amounts: PayslipAmounts): { earnings: PayslipLine[]; deductions: PayslipLine[] } {
  return { earnings: lines(amounts, EARNINGS), deductions: lines(amounts, DEDUCTIONS) };
}

export function monthPattern(year?: number, month?: number): string | null {
  if (!year && !month) return null;
  const yearPart = year ? String(year) : '____';
  const monthPart = month ? String(month).padStart(2, '0') : '__';
  return `${yearPart}-${monthPart}`;
}

export interface PeriodSlip {
  id: number;
  month: string;
  month_label: string;
  net: number;
}

export function groupByYear(slips: PeriodSlip[]) {
  const years = new Map<
    number,
    { month: string; month_no: number; label: string; payslip_id: number; net: number }[]
  >();
  for (const slip of [...slips].sort((a, b) => b.month.localeCompare(a.month))) {
    const [year, month] = slip.month.split('-').map(Number) as [number, number];
    const list = years.get(year) ?? [];
    list.push({ month: slip.month, month_no: month, label: slip.month_label, payslip_id: slip.id, net: slip.net });
    years.set(year, list);
  }
  return [...years.entries()].map(([year, months]) => ({
    year,
    total_net: Math.round(months.reduce((sum, item) => sum + item.net, 0) * 100) / 100,
    months,
  }));
}
