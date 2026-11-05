import { BRAND, createPdf, displayDate, Pdf, renderPdf } from '../student-lifecycle/pdf/pdf-kit';
import { ReportCardDto } from './dto/report-card.dto';
import { CardCell, cellText, formatMarks } from './report-card.logic';

export interface ReportCardPdfData {
  card: ReportCardDto;
  logo: Buffer | null;
  photo: Buffer | null;
  generated_on: string;
}

interface Layout {
  landscape: boolean;
  pageWidth: number;
  pageHeight: number;
  left: number;
  width: number;
  bottom: number;
  row: number;
  font: number;
}

const PORTRAIT_MAX_COLUMNS = 5;
const RED = '#c0392b';
const STRIPE = '#f5f8f6';
const RESULT_LABEL = { pass: 'Passed', fail: 'Not passed', incomplete: 'Incomplete' } as const;

export function reportCardsPdf(pages: ReportCardPdfData[]): Promise<Buffer> {
  const firstLandscape = pages[0]!.card.columns.length > PORTRAIT_MAX_COLUMNS;
  const doc = createPdf({
    size: 'A4',
    layout: firstLandscape ? 'landscape' : 'portrait',
    margin: 0,
    autoFirstPage: false,
    info: { Title: pages.length === 1 ? reportTitle(pages[0]!.card) : 'Report cards' },
  });
  for (const page of pages) drawReportCard(doc, page);
  return renderPdf(doc);
}

function reportTitle(card: ReportCardDto): string {
  return `${card.scope.title} ${card.student.full_name} ${card.scope.academic_year.name}`;
}

function layoutFor(card: ReportCardDto): Layout {
  const landscape = card.columns.length > PORTRAIT_MAX_COLUMNS;
  const pageWidth = landscape ? 841.89 : 595.28;
  const pageHeight = landscape ? 595.28 : 841.89;
  const margin = landscape ? 30 : 36;
  const compact = landscape || card.subjects.length > 12;
  return {
    landscape,
    pageWidth,
    pageHeight,
    left: margin,
    width: pageWidth - margin * 2,
    bottom: pageHeight - margin,
    row: compact ? 16 : 19,
    font: compact ? 8.5 : 9.5,
  };
}

export function drawReportCard(doc: Pdf, data: ReportCardPdfData): void {
  const { card } = data;
  const layout = layoutFor(card);
  doc.addPage({ size: 'A4', layout: layout.landscape ? 'landscape' : 'portrait', margin: 0 });
  let y = header(doc, data, layout);
  y = studentFacts(doc, data, layout, y);
  y = marksTable(doc, card, layout, y);
  y = summary(doc, card, layout, y);
  y = remarksAndScale(doc, card, layout, y);
  signatures(doc, data, layout, y);
}

function header(doc: Pdf, data: ReportCardPdfData, layout: Layout): number {
  const { card } = data;
  const { left, width } = layout;
  doc.rect(0, 0, layout.pageWidth, 7).fill(BRAND.green);
  const top = 20;
  if (data.logo) doc.image(data.logo, left, top, { fit: [52, 52] });
  const textX = data.logo ? left + 62 : left;
  const textWidth = width - (textX - left) - 170;
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor(BRAND.dark)
    .text(card.school.name, textX, top + 2, {
      width: textWidth,
    });
  const contact = [card.school.phone, card.school.email].filter(Boolean).join('  ·  ');
  doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.muted);
  if (card.school.address) doc.text(card.school.address, textX, doc.y + 2, { width: textWidth });
  if (contact) doc.text(contact, textX, doc.y + 1, { width: textWidth });
  if (card.school.board) doc.text(`Affiliated to ${card.school.board}`, textX, doc.y + 1, { width: textWidth });
  const badgeX = left + width - 160;
  doc.roundedRect(badgeX, top, 160, 46, 6).fill(BRAND.wash);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(BRAND.deep)
    .text('PROGRESS REPORT', badgeX, top + 9, {
      width: 160,
      align: 'center',
    });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(BRAND.deep)
    .text(`Academic year ${card.scope.academic_year.name}`, badgeX, top + 26, {
      width: 160,
      align: 'center',
    });
  const titleY = Math.max(doc.y, top + 56) + 8;
  doc.rect(left, titleY, width, 24).fill(BRAND.deep);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#ffffff')
    .text(card.scope.title, left + 12, titleY + 7, {
      width: width - 24,
      align: 'center',
    });
  return titleY + 32;
}

function studentFacts(doc: Pdf, data: ReportCardPdfData, layout: Layout, y: number): number {
  const { card } = data;
  const { left, width } = layout;
  const student = card.student;
  const photoWidth = data.photo ? 62 : 0;
  const area = width - photoWidth - (data.photo ? 10 : 0);
  const facts: [string, string][] = [
    ['Student name', student.full_name],
    ['Admission no.', student.admission_no],
    ['Class & section', [student.class_name, student.section_name].filter(Boolean).join(' - ')],
    ['Roll no.', student.roll_no === null ? '—' : String(student.roll_no)],
    ['Date of birth', displayDate(student.dob)],
    ['Parent / guardian', student.parent_name ?? '—'],
    ['Class teacher', student.class_teacher ?? '—'],
    ['Period', `${displayDate(card.scope.from)} to ${displayDate(card.scope.to)}`],
  ];
  const columns = layout.landscape ? 4 : 2;
  const column = area / columns;
  const labelWidth = layout.landscape ? 78 : 92;
  const lineHeight = 15;
  facts.forEach(([label, value], index) => {
    const x = left + (index % columns) * column;
    const rowY = y + Math.floor(index / columns) * lineHeight;
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(BRAND.muted)
      .text(label, x, rowY, { width: labelWidth, lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(BRAND.dark)
      .text(value, x + labelWidth, rowY, { width: column - labelWidth - 6, lineBreak: false, ellipsis: true });
  });
  const factsHeight = Math.ceil(facts.length / columns) * lineHeight;
  if (data.photo) {
    const photoX = left + width - photoWidth;
    doc.image(data.photo, photoX, y - 2, { fit: [photoWidth, Math.max(factsHeight, 64)], align: 'center' });
    doc
      .rect(photoX, y - 2, photoWidth, Math.max(factsHeight, 64))
      .lineWidth(0.6)
      .strokeColor(BRAND.line)
      .stroke();
  }
  return y + Math.max(factsHeight, data.photo ? 66 : 0) + 10;
}

function marksTable(doc: Pdf, card: ReportCardDto, layout: Layout, top: number): number {
  const { left, width, row, font } = layout;
  const subjectWidth = layout.landscape ? 150 : 132;
  const overallWidths = [62, 44, 40];
  const overallWidth = overallWidths.reduce((sum, value) => sum + value, 0);
  const examCount = Math.max(card.columns.length, 1);
  const examWidth = (width - subjectWidth - overallWidth) / examCount;
  const examX = (index: number) => left + subjectWidth + index * examWidth;
  const overallX = left + subjectWidth + examCount * examWidth;
  const showTerms = card.terms.length > 1 || (card.terms[0]?.term_id ?? null) !== null;
  const termHeight = showTerms ? 16 : 0;
  const headHeight = 30;

  doc.rect(left, top, width, termHeight + headHeight).fill(BRAND.green);
  doc.font('Helvetica-Bold').fontSize(font).fillColor('#ffffff');
  doc.text('Subject', left + 8, top + termHeight + (headHeight - font) / 2, { width: subjectWidth - 12 });
  if (showTerms) {
    let index = 0;
    for (const term of card.terms) {
      const span = term.exam_ids.length;
      const x = examX(index);
      doc.rect(x, top, span * examWidth, termHeight).fill(BRAND.deep);
      doc.fillColor('#ffffff').text(term.name, x + 2, top + 4, {
        width: span * examWidth - 4,
        align: 'center',
        lineBreak: false,
        ellipsis: true,
      });
      index += span;
    }
    doc.rect(overallX, top, overallWidth, termHeight).fill(BRAND.deep);
    doc.fillColor('#ffffff').text('Overall', overallX, top + 4, { width: overallWidth, align: 'center' });
  }
  const headY = top + termHeight;
  card.columns.forEach((column, index) => {
    const label = column.common_max ? `${column.name} (${column.common_max})` : column.name;
    doc
      .font('Helvetica-Bold')
      .fontSize(font - 0.5)
      .fillColor('#ffffff')
      .text(label, examX(index) + 2, headY + 4, { width: examWidth - 4, height: headHeight - 6, align: 'center' });
  });
  const overallLabels = ['Marks', '%', 'Grade'];
  let x = overallX;
  overallLabels.forEach((label, index) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(font)
      .fillColor('#ffffff')
      .text(label, x, headY + (headHeight - font) / 2, { width: overallWidths[index]!, align: 'center' });
    x += overallWidths[index]!;
  });

  let y = headY + headHeight;
  card.subjects.forEach((subject, rowIndex) => {
    if (rowIndex % 2 === 1) doc.rect(left, y, width, row).fill(STRIPE);
    const textY = y + (row - font) / 2;
    doc
      .font('Helvetica')
      .fontSize(font)
      .fillColor(BRAND.dark)
      .text(subject.name, left + 8, textY, {
        width: subjectWidth - 12,
        lineBreak: false,
        ellipsis: true,
      });
    subject.cells.forEach((cell, index) => {
      const column = card.columns[index]!;
      doc
        .font('Helvetica')
        .fontSize(font)
        .fillColor(cell?.passed === false ? RED : BRAND.dark)
        .text(cellLabel(cell, column.common_max), examX(index), textY, {
          width: examWidth,
          align: 'center',
          lineBreak: false,
        });
    });
    const overall = [
      subject.max_total ? `${formatMarks(subject.total)}/${subject.max_total}` : '—',
      subject.percent === null ? '—' : formatMarks(subject.percent),
      subject.grade ?? '—',
    ];
    let cellX = overallX;
    overall.forEach((value, index) => {
      doc
        .font(index === 2 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(font)
        .fillColor(subject.passed === false ? RED : BRAND.dark)
        .text(value, cellX, textY, { width: overallWidths[index]!, align: 'center', lineBreak: false });
      cellX += overallWidths[index]!;
    });
    y += row;
  });

  const footer: [string, (index: number) => string, string[]][] = [
    [
      'Total',
      (index) => `${formatMarks(card.columns[index]!.total)}/${card.columns[index]!.max_total}`,
      [card.overall.max_total ? `${formatMarks(card.overall.total)}/${card.overall.max_total}` : '—', '', ''],
    ],
    [
      'Percentage',
      (index) => (card.columns[index]!.percent === null ? '—' : `${formatMarks(card.columns[index]!.percent!)}%`),
      ['', card.overall.percent === null ? '—' : `${formatMarks(card.overall.percent)}%`, ''],
    ],
    ['Grade', (index) => card.columns[index]!.grade ?? '—', ['', '', card.overall.grade ?? '—']],
    [
      'Rank in class',
      (index) => {
        const column = card.columns[index]!;
        return column.class_rank === null ? '—' : `${column.class_rank} / ${column.class_size}`;
      },
      ['', '', ''],
    ],
    ['Result', (index) => RESULT_LABEL[card.columns[index]!.result], [RESULT_LABEL[card.overall.result], '', '']],
  ];
  footer.forEach(([label, value, overall], rowIndex) => {
    doc.rect(left, y, width, row).fill(rowIndex % 2 === 0 ? BRAND.wash : '#eef6f1');
    const textY = y + (row - font) / 2;
    doc
      .font('Helvetica-Bold')
      .fontSize(font)
      .fillColor(BRAND.deep)
      .text(label, left + 8, textY, { width: subjectWidth - 12 });
    card.columns.forEach((column, index) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(font - 0.5)
        .fillColor(label === 'Result' && column.result === 'fail' ? RED : BRAND.deep)
        .text(value(index), examX(index), textY, {
          width: examWidth,
          align: 'center',
          lineBreak: false,
          ellipsis: true,
        });
    });
    if (label === 'Result') {
      doc
        .font('Helvetica-Bold')
        .fontSize(font - 0.5)
        .fillColor(card.overall.result === 'fail' ? RED : BRAND.deep)
        .text(overall[0]!, overallX, textY, { width: overallWidth, align: 'center', lineBreak: false, ellipsis: true });
    } else {
      let cellX = overallX;
      overall.forEach((text, index) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(font)
          .fillColor(BRAND.deep)
          .text(text, cellX, textY, { width: overallWidths[index]!, align: 'center', lineBreak: false });
        cellX += overallWidths[index]!;
      });
    }
    y += row;
  });

  doc.lineWidth(0.6).strokeColor(BRAND.line);
  doc.rect(left, top, width, y - top).stroke();
  for (let index = 0; index <= examCount; index += 1) {
    const lineX = examX(index);
    doc
      .moveTo(lineX, top + (index === 0 || index === examCount ? 0 : termHeight))
      .lineTo(lineX, y)
      .stroke();
  }
  let lineX = overallX;
  for (const value of overallWidths.slice(0, -1)) {
    lineX += value;
    doc
      .moveTo(lineX, top + termHeight)
      .lineTo(lineX, y - row * 5)
      .stroke();
  }
  doc
    .moveTo(left, y - row * 5)
    .lineTo(left + width, y - row * 5)
    .stroke();
  return y + 10;
}

function cellLabel(cell: CardCell | null, commonMaxMarks: number | null): string {
  const text = cellText(cell);
  if (!cell || cell.is_absent || cell.passed === null || commonMaxMarks) return text;
  return `${text}/${cell.max_marks}`;
}

function summary(doc: Pdf, card: ReportCardDto, layout: Layout, y: number): number {
  const { left, width } = layout;
  const boxes: [string, string, string | null][] = [
    ['Overall percentage', card.overall.percent === null ? '—' : `${formatMarks(card.overall.percent)}%`, null],
    ['Overall grade', card.overall.grade ?? '—', null],
    ['Result', RESULT_LABEL[card.overall.result], card.overall.result === 'fail' ? RED : null],
    ['Attendance', card.attendance.percent === null ? '—' : `${formatMarks(card.attendance.percent)}%`, null],
  ];
  const gap = 8;
  const boxWidth = (width - gap * (boxes.length - 1)) / boxes.length;
  const height = 40;
  boxes.forEach(([label, value, color], index) => {
    const x = left + index * (boxWidth + gap);
    doc.roundedRect(x, y, boxWidth, height, 5).lineWidth(0.8).strokeColor(BRAND.line).stroke();
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text(label, x + 10, y + 7, { width: boxWidth - 20 });
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(color ?? BRAND.deep)
      .text(value, x + 10, y + 19, { width: boxWidth - 20, lineBreak: false, ellipsis: true });
  });
  const attendance = card.attendance.working_days
    ? `Present ${formatMarks(card.attendance.present_days)} of ${card.attendance.working_days} working days`
    : 'No attendance recorded in this period';
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(BRAND.muted)
    .text(attendance, left, y + height + 3, {
      width,
      align: 'right',
    });
  return y + height + 16;
}

function remarksAndScale(doc: Pdf, card: ReportCardDto, layout: Layout, y: number): number {
  const { left, width } = layout;
  const scaleWidth = Math.min(300, width * 0.5);
  const remarksWidth = width - scaleWidth - 10;
  const height = 46;
  doc.roundedRect(left, y, remarksWidth, height, 5).fill('#fbfcfb');
  doc.roundedRect(left, y, remarksWidth, height, 5).lineWidth(0.6).strokeColor(BRAND.line).stroke();
  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(BRAND.deep)
    .text("Class teacher's remarks", left + 10, y + 7);
  doc
    .font('Helvetica-Oblique')
    .fontSize(9)
    .fillColor(BRAND.dark)
    .text(card.remarks, left + 10, y + 20, {
      width: remarksWidth - 20,
      height: height - 24,
    });
  const scaleX = left + remarksWidth + 10;
  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(BRAND.deep)
    .text('Grading scale (%)', scaleX, y + 2);
  const steps = card.grade_scale;
  const perRow = 4;
  const cellWidth = scaleWidth / perRow;
  steps.forEach((step, index) => {
    const x = scaleX + (index % perRow) * cellWidth;
    const rowY = y + 16 + Math.floor(index / perRow) * 15;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND.dark).text(step.grade, x, rowY, { continued: true });
    doc.font('Helvetica').fillColor(BRAND.muted).text(`  ${step.min}–${step.max}`);
  });
  return y + height + 12;
}

function signatures(doc: Pdf, data: ReportCardPdfData, layout: Layout, y: number): void {
  const { left, width } = layout;
  const lineY = Math.max(y + 34, layout.bottom - 40);
  const labels = ['Class teacher', 'Principal', 'Parent / guardian'];
  const slot = width / labels.length;
  labels.forEach((label, index) => {
    const x = left + index * slot + 16;
    doc
      .moveTo(x, lineY)
      .lineTo(x + slot - 32, lineY)
      .lineWidth(0.6)
      .strokeColor(BRAND.muted)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(BRAND.muted)
      .text(label, x, lineY + 5, {
        width: slot - 32,
        align: 'center',
      });
  });
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(BRAND.muted)
    .text(
      `Generated on ${displayDate(data.generated_on)} · This is a computer-generated report card.`,
      left,
      lineY + 22,
      { width, align: 'center', lineBreak: false },
    );
}
