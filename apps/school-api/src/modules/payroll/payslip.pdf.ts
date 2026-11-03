import { BRAND, createPdf, renderPdf } from '../student-lifecycle/pdf/pdf-kit';
import { rupees } from './payroll.calc';

export interface PayslipPdfData {
  school_name: string;
  school_address: string | null;
  school_logo: Buffer | null;
  month_label: string;
  employee_no: string;
  name: string;
  designation: string;
  department: string | null;
  bank: string | null;
  pan_last4: string | null;
  working_days: number;
  lop_days: number;
  paid_days: number;
  earnings: [string, number][];
  deductions: [string, number][];
  gross: number;
  total_deductions: number;
  net: number;
  draft: boolean;
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(value: number): string {
  if (value < 20) return ONES[value]!;
  return [TENS[Math.floor(value / 10)], ONES[value % 10]].filter(Boolean).join(' ');
}

function belowThousand(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? belowHundred(rest) : ''].filter(Boolean).join(' ');
}

export function amountInWords(value: number): string {
  let rest = Math.floor(value);
  const paise = Math.round((value - rest) * 100);
  if (rest === 0 && paise === 0) return 'Rupees Zero Only';
  const parts: string[] = [];
  for (const [size, name] of [
    [10000000, 'Crore'],
    [100000, 'Lakh'],
    [1000, 'Thousand'],
  ] as const) {
    const count = Math.floor(rest / size);
    if (count) parts.push(`${count >= 100 ? belowThousand(count) : belowHundred(count)} ${name}`);
    rest %= size;
  }
  if (rest) parts.push(belowThousand(rest));
  const rupeesText = parts.length ? `Rupees ${parts.join(' ')}` : 'Rupees Zero';
  return `${rupeesText}${paise ? ` and ${belowHundred(paise)} Paise` : ''} Only`;
}

export async function payslipPdf(data: PayslipPdfData): Promise<Buffer> {
  const doc = createPdf({ size: 'A4', margin: 50, info: { Title: `Payslip ${data.month_label} ${data.employee_no}` } });
  const left = 50;
  const width = 495.28;

  doc.rect(0, 0, 595.28, 8).fill(BRAND.green);
  if (data.school_logo) doc.image(data.school_logo, left, 34, { fit: [50, 50] });
  const headerX = data.school_logo ? left + 62 : left;
  doc
    .fillColor(BRAND.dark)
    .font('Helvetica-Bold')
    .fontSize(17)
    .text(data.school_name, headerX, 38, { width: width - (headerX - left) });
  if (data.school_address) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text(data.school_address, headerX, doc.y + 2, {
        width: width - (headerX - left),
      });
  }
  const titleY = 104;
  doc.rect(left, titleY, width, 30).fill(BRAND.wash);
  doc
    .fillColor(BRAND.deep)
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(`Payslip for ${data.month_label}${data.draft ? ' (draft)' : ''}`, left + 12, titleY + 9, {
      width: width - 24,
    });

  const facts: [string, string][] = [
    ['Employee', data.name],
    ['Employee no.', data.employee_no],
    ['Designation', data.designation],
    ['Department', data.department ?? '—'],
    ['Bank account', data.bank ?? '—'],
    ['PAN', data.pan_last4 ? `XXXXXX${data.pan_last4}` : '—'],
    ['Working days', String(data.working_days)],
    ['Loss of pay days', String(data.lop_days)],
    ['Paid days', String(data.paid_days)],
  ];
  let y = titleY + 44;
  const column = width / 2;
  facts.forEach(([label, value], index) => {
    const x = left + (index % 2) * column;
    if (index % 2 === 0 && index > 0) y += 20;
    doc.font('Helvetica').fontSize(9).fillColor(BRAND.muted).text(label, x, y, { width: 100 });
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor(BRAND.dark)
      .text(value, x + 100, y, { width: column - 110 });
  });
  y += 34;

  const tableTop = y;
  const half = width / 2;
  doc.rect(left, tableTop, width, 24).fill(BRAND.green);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
  doc.text('Earnings', left + 10, tableTop + 7, { width: half - 20 });
  doc.text('Amount', left + 10, tableTop + 7, { width: half - 20, align: 'right' });
  doc.text('Deductions', left + half + 10, tableTop + 7, { width: half - 20 });
  doc.text('Amount', left + half + 10, tableTop + 7, { width: half - 20, align: 'right' });
  const rows = Math.max(data.earnings.length, data.deductions.length);
  let rowY = tableTop + 24;
  for (let index = 0; index < rows; index += 1) {
    if (index % 2 === 1) doc.rect(left, rowY, width, 22).fill('#f5f7f6');
    doc.font('Helvetica').fontSize(9.5).fillColor(BRAND.dark);
    const earning = data.earnings[index];
    const deduction = data.deductions[index];
    if (earning) {
      doc.text(earning[0], left + 10, rowY + 6, { width: half - 20 });
      doc.text(rupees(earning[1]), left + 10, rowY + 6, { width: half - 20, align: 'right' });
    }
    if (deduction) {
      doc.text(deduction[0], left + half + 10, rowY + 6, { width: half - 20 });
      doc.text(rupees(deduction[1]), left + half + 10, rowY + 6, { width: half - 20, align: 'right' });
    }
    rowY += 22;
  }
  doc.rect(left, rowY, width, 24).fill(BRAND.wash);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND.deep);
  doc.text('Gross earnings', left + 10, rowY + 7, { width: half - 20 });
  doc.text(rupees(data.gross), left + 10, rowY + 7, { width: half - 20, align: 'right' });
  doc.text('Total deductions', left + half + 10, rowY + 7, { width: half - 20 });
  doc.text(rupees(data.total_deductions), left + half + 10, rowY + 7, { width: half - 20, align: 'right' });
  rowY += 24;
  doc
    .rect(left, tableTop, width, rowY - tableTop)
    .lineWidth(0.6)
    .strokeColor(BRAND.line)
    .stroke();
  doc
    .moveTo(left + half, tableTop)
    .lineTo(left + half, rowY)
    .stroke();

  const netY = rowY + 18;
  doc.rect(left, netY, width, 46).fill(BRAND.deep);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#cfe8da')
    .text('Net pay', left + 14, netY + 8);
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#ffffff')
    .text(rupees(data.net), left + 14, netY + 21, { width: 200 });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#ffffff')
    .text(amountInWords(data.net), left + 220, netY + 17, { width: width - 234, align: 'right' });

  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor(BRAND.muted)
    .text('This is a computer generated payslip and does not need a signature.', left, netY + 66, {
      width,
      align: 'center',
    });
  return renderPdf(doc);
}
