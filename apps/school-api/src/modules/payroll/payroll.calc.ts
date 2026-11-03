export const PF_RATE = 0.12;
export const PF_WAGE_CEILING = 15000;
export const ESI_RATE = 0.0075;
export const ESI_GROSS_LIMIT = 21000;

export interface StructureInput {
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  special_allowance: number;
  other_allowance: number;
  pf_enabled: boolean;
  esi_enabled: boolean;
  professional_tax: number;
  tds: number;
  other_deduction: number;
}

export interface PayResult {
  paid_days: number;
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  special_allowance: number;
  other_allowance: number;
  gross: number;
  pf: number;
  esi: number;
  professional_tax: number;
  tds: number;
  other_deduction: number;
  total_deductions: number;
  net: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export const EARNINGS = ['basic', 'da', 'hra', 'conveyance', 'special_allowance', 'other_allowance'] as const;

export function monthlyGross(structure: StructureInput): number {
  return round2(EARNINGS.reduce((sum, key) => sum + Number(structure[key]), 0));
}

export function computePay(structure: StructureInput, workingDays: number, lopDays: number): PayResult {
  const lop = Math.min(Math.max(lopDays, 0), workingDays);
  const paidDays = workingDays - lop;
  const factor = workingDays ? paidDays / workingDays : 0;
  const earned = Object.fromEntries(EARNINGS.map((key) => [key, round2(Number(structure[key]) * factor)])) as Record<
    (typeof EARNINGS)[number],
    number
  >;
  const gross = round2(EARNINGS.reduce((sum, key) => sum + earned[key], 0));
  const pf = structure.pf_enabled ? Math.round(Math.min(earned.basic + earned.da, PF_WAGE_CEILING) * PF_RATE) : 0;
  const esi = structure.esi_enabled && monthlyGross(structure) <= ESI_GROSS_LIMIT ? Math.ceil(gross * ESI_RATE) : 0;
  const professionalTax = paidDays > 0 ? Number(structure.professional_tax) : 0;
  const tds = Number(structure.tds);
  const other = Number(structure.other_deduction);
  const totalDeductions = round2(Math.min(pf + esi + professionalTax + tds + other, gross));
  return {
    paid_days: paidDays,
    ...earned,
    gross,
    pf,
    esi,
    professional_tax: professionalTax,
    tds,
    other_deduction: other,
    total_deductions: totalDeductions,
    net: round2(gross - totalDeductions),
  };
}

export function rupees(value: number): string {
  return `Rs. ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function monthLabel(month: string): string {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value - 1, 1)).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
