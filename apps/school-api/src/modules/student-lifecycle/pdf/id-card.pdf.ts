import { BRAND, createPdf, displayDate, initials, Pdf, renderPdf } from './pdf-kit';

export interface IdCardData {
  school_name: string;
  school_code: string;
  school_city: string | null;
  school_phone: string | null;
  school_logo: Buffer | null;
  academic_year: string | null;
  name: string;
  admission_no: string;
  class_section: string | null;
  roll_no: number | null;
  dob: string;
  blood_group: string | null;
  guardian_name: string | null;
  guardian_mobile: string | null;
  photo: Buffer | null;
  qr: Buffer;
}

const MM = 72 / 25.4;
export const CARD_WIDTH = 85.6 * MM;
export const CARD_HEIGHT = 54 * MM;

export function drawIdCard(doc: Pdf, x: number, y: number, card: IdCardData): void {
  const w = CARD_WIDTH;
  const h = CARD_HEIGHT;
  doc.save();
  doc.roundedRect(x, y, w, h, 7).lineWidth(0.6).fillAndStroke('#ffffff', BRAND.line);
  doc.roundedRect(x, y, w, h, 7).clip();

  doc.rect(x, y, w, 34).fill(BRAND.green);
  doc.rect(x, y + 30, w, 4).fill(BRAND.deep);
  if (card.school_logo) {
    doc.circle(x + 18, y + 16, 11).fill('#ffffff');
    doc.image(card.school_logo, x + 9, y + 7, { fit: [18, 18], align: 'center', valign: 'center' });
  } else {
    doc.circle(x + 18, y + 16, 11).fill('#ffffff');
    doc
      .fillColor(BRAND.green)
      .font('Helvetica-Bold')
      .fontSize(7)
      .text(card.school_code.slice(0, 4), x + 7, y + 13, { width: 22, align: 'center' });
  }
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .text(card.school_name, x + 34, y + 7, { width: w - 40, height: 11, ellipsis: true, lineBreak: false });
  doc
    .font('Helvetica')
    .fontSize(5.5)
    .fillColor('#e4f2ea')
    .text(`STUDENT ID CARD${card.academic_year ? `  ·  ${card.academic_year}` : ''}`, x + 34, y + 19, {
      width: w - 40,
      characterSpacing: 0.6,
      lineBreak: false,
    });

  const photoX = x + 9;
  const photoY = y + 42;
  doc.roundedRect(photoX, photoY, 54, 76, 4).fill(BRAND.wash);
  if (card.photo) {
    doc.save();
    doc.roundedRect(photoX, photoY, 54, 76, 4).clip();
    doc.image(card.photo, photoX, photoY, { cover: [54, 76], align: 'center', valign: 'center' });
    doc.restore();
  } else {
    doc
      .fillColor(BRAND.deep)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(initials(card.name), photoX, photoY + 29, { width: 54, align: 'center' });
  }

  const textX = x + 71;
  const textWidth = w - 71 - 74;
  doc
    .fillColor(BRAND.dark)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(card.name, textX, y + 43, { width: textWidth, height: 22, ellipsis: true });
  const rows: [string, string][] = [
    ['Adm. No', card.admission_no],
    ['Class', [card.class_section, card.roll_no ? `Roll ${card.roll_no}` : null].filter(Boolean).join(' · ') || '—'],
    ['DOB', displayDate(card.dob)],
    ['Blood', card.blood_group ?? '—'],
    ['Parent', card.guardian_mobile ?? '—'],
  ];
  let rowY = y + 60;
  for (const [label, value] of rows) {
    doc
      .font('Helvetica')
      .fontSize(5.5)
      .fillColor(BRAND.muted)
      .text(label.toUpperCase(), textX, rowY, { lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .fontSize(6.5)
      .fillColor(BRAND.dark)
      .text(value, textX + 30, rowY - 0.6, { width: textWidth - 30, height: 8, ellipsis: true, lineBreak: false });
    rowY += 11.2;
  }

  const qrSize = 64;
  const qrX = x + w - qrSize - 8;
  doc.image(card.qr, qrX, y + 41, { width: qrSize, height: qrSize });
  doc
    .font('Helvetica')
    .fontSize(4.8)
    .fillColor(BRAND.muted)
    .text('Scan on the school bus', qrX - 4, y + 41 + qrSize + 2, { width: qrSize + 8, align: 'center' });

  doc.rect(x, y + h - 13, w, 13).fill(BRAND.wash);
  const footer = [card.school_city, card.school_phone ? `Ph ${card.school_phone}` : null].filter(Boolean).join('  ·  ');
  doc
    .font('Helvetica')
    .fontSize(5.5)
    .fillColor(BRAND.deep)
    .text(footer || 'If found, please return to the school office', x + 9, y + h - 9, {
      width: w - 18,
      align: 'center',
      lineBreak: false,
    });
  doc.restore();
}

export async function idCardPdf(card: IdCardData): Promise<Buffer> {
  const doc = createPdf({ size: [CARD_WIDTH, CARD_HEIGHT], margin: 0, info: { Title: `ID card - ${card.name}` } });
  drawIdCard(doc, 0, 0, card);
  return renderPdf(doc);
}

export async function idCardSheetPdf(cards: IdCardData[], title: string): Promise<Buffer> {
  const doc = createPdf({ size: 'A4', margin: 0, autoFirstPage: false, info: { Title: title } });
  const columns = 2;
  const rows = 5;
  const gapX = 14;
  const gapY = 12;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const startX = (pageWidth - (columns * CARD_WIDTH + (columns - 1) * gapX)) / 2;
  const startY = (pageHeight - (rows * CARD_HEIGHT + (rows - 1) * gapY)) / 2;
  cards.forEach((card, index) => {
    const slot = index % (columns * rows);
    if (slot === 0) doc.addPage();
    const x = startX + (slot % columns) * (CARD_WIDTH + gapX);
    const y = startY + Math.floor(slot / columns) * (CARD_HEIGHT + gapY);
    drawIdCard(doc, x, y, card);
  });
  if (!cards.length) doc.addPage();
  return renderPdf(doc);
}
