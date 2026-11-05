import { createPdf, displayDate, initials, Pdf, renderPdf } from './pdf-kit';

export interface IdCardData {
  school_name: string;
  school_code: string;
  school_city: string | null;
  school_phone: string | null;
  school_address?: string | null;
  school_email?: string | null;
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
  father_name?: string | null;
  mother_name?: string | null;
  address?: string | null;
}

const MM = 72 / 25.4;
export const CARD_WIDTH = 54 * MM; // Portrait CR80 width (~153.07 pt)
export const CARD_HEIGHT = 85.6 * MM; // Portrait CR80 height (~242.65 pt)

const THEME = {
  teal: '#00897B',
  tealDark: '#00695C',
  tealLight: '#E0F2F1',
  orange: '#FA7222',
  orangeDark: '#E65100',
  peach: '#FEECE5',
  peachLight: '#FFF5F0',
  white: '#FFFFFF',
  border: '#CBD5E1',
  textDark: '#1F2937',
  textMuted: '#4B5563',
  textLight: '#6B7280',
};

function drawCardBackground(doc: Pdf, x: number, y: number, w: number, h: number): void {
  doc.save();
  // Outer card rounded rectangle with clipping
  doc.roundedRect(x, y, w, h, 8).lineWidth(0.6).fillAndStroke(THEME.white, THEME.border);
  doc.roundedRect(x, y, w, h, 8).clip();

  // 1. Soft peach patches in corners
  // Top right peach
  doc
    .moveTo(x + w * 0.45, y)
    .bezierCurveTo(x + w * 0.6, y + 14, x + w * 0.85, y + 28, x + w, y + 38)
    .lineTo(x + w, y)
    .closePath()
    .fill(THEME.peach);

  // Bottom left peach
  doc
    .moveTo(x, y + h - 55)
    .bezierCurveTo(x + 18, y + h - 40, x + 24, y + h - 16, x + 35, y + h)
    .lineTo(x, y + h)
    .closePath()
    .fill(THEME.peach);

  // Bottom right peach
  doc
    .moveTo(x + w - 40, y + h)
    .bezierCurveTo(x + w - 24, y + h - 20, x + w - 10, y + h - 35, x + w, y + h - 45)
    .lineTo(x + w, y + h)
    .closePath()
    .fill(THEME.peachLight);

  // 2. Teal organic blobs
  // Top-right teal blob
  doc
    .moveTo(x + w * 0.68, y)
    .bezierCurveTo(x + w * 0.78, y + 16, x + w * 0.92, y + 14, x + w, y + 8)
    .lineTo(x + w, y)
    .closePath()
    .fill(THEME.teal);

  // Bottom-left teal blob
  doc
    .moveTo(x + 10, y + h)
    .bezierCurveTo(x + 16, y + h - 18, x + 34, y + h - 18, x + 42, y + h)
    .lineTo(x, y + h)
    .closePath()
    .fill(THEME.teal);

  // 3. Orange organic blobs
  // Top-left orange blob
  doc
    .moveTo(x, y + 6)
    .bezierCurveTo(x + 12, y + 14, x + 15, y + 32, x, y + 42)
    .closePath()
    .fill(THEME.orange);

  // Right edge orange blob
  doc
    .moveTo(x + w, y + 68)
    .bezierCurveTo(x + w - 12, y + 82, x + w - 12, y + 96, x + w, y + 108)
    .closePath()
    .fill(THEME.orange);

  // Bottom-right orange blob
  doc
    .moveTo(x + w, y + h - 40)
    .bezierCurveTo(x + w - 16, y + h - 26, x + w - 10, y + h - 8, x + w, y + h)
    .closePath()
    .fill(THEME.orange);

  // Side thumb notches
  doc.circle(x, y + h * 0.48, 4.5).fill('#F1F5F9');
  doc.circle(x + w, y + h * 0.48, 4.5).fill('#F1F5F9');

  doc.restore();
}

function drawSchoolLogoEmblem(doc: Pdf, cx: number, cy: number, radius: number, code: string): void {
  doc.save();
  doc.circle(cx, cy, radius).lineWidth(1.2).strokeColor(THEME.orange).fillColor(THEME.white).fillAndStroke();
  doc.circle(cx, cy, radius - 2).lineWidth(0.5).strokeColor(THEME.orange);

  const bx = cx;
  const by = cy;
  doc
    .moveTo(bx, by - 1)
    .bezierCurveTo(bx - 3, by - 3, bx - 5, by - 2.5, bx - 6, by - 2)
    .lineTo(bx - 6, by + 3)
    .bezierCurveTo(bx - 5, by + 2.5, bx - 3, by + 2, bx, by + 3)
    .closePath()
    .fill(THEME.teal);

  doc
    .moveTo(bx, by - 1)
    .bezierCurveTo(bx + 3, by - 3, bx + 5, by - 2.5, bx + 6, by - 2)
    .lineTo(bx + 6, by + 3)
    .bezierCurveTo(bx + 5, by + 2.5, bx + 3, by + 2, bx, by + 3)
    .closePath()
    .fill(THEME.teal);

  doc.restore();
}

export function drawIdCardFront(doc: Pdf, x: number, y: number, card: IdCardData): void {
  const w = CARD_WIDTH;
  const h = CARD_HEIGHT;

  doc.save();
  drawCardBackground(doc, x, y, w, h);

  // 1. School Logo on LEFT side
  const logoRadius = 13;
  const logoCx = x + 18;
  const logoCy = y + 23;

  if (card.school_logo) {
    doc.save();
    doc
      .circle(logoCx, logoCy, logoRadius)
      .lineWidth(1.2)
      .strokeColor(THEME.orange)
      .fillColor(THEME.white)
      .fillAndStroke();
    doc.image(card.school_logo, logoCx - 10, logoCy - 10, { fit: [20, 20], align: 'center', valign: 'center' });
    doc.restore();
  } else {
    drawSchoolLogoEmblem(doc, logoCx, logoCy, logoRadius, card.school_code);
  }

  // 2. School Name on RIGHT of Logo
  const textX = x + 35;
  const textW = w - 42;
  const schoolName = (card.school_name || 'TAMILZOROUS MODEL SCHOOL').toUpperCase();

  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(THEME.teal)
    .text(schoolName, textX, y + 14, {
      width: textW,
      height: 18,
      ellipsis: true,
    });

  // 3. Student ID below School Name
  doc
    .font('Helvetica-Bold')
    .fontSize(6.5)
    .fillColor(THEME.orange)
    .text(`Student ID : ${card.admission_no}`, textX, y + 32, {
      width: textW,
      height: 9,
      ellipsis: true,
      lineBreak: false,
    });

  // 4. Student Photo with solid orange border
  const photoW = 54;
  const photoH = 58;
  const photoX = x + (w - photoW) / 2;
  const photoY = y + 48;

  if (card.photo) {
    doc.save();
    doc.rect(photoX, photoY, photoW, photoH).clip();
    doc.image(card.photo, photoX, photoY, { cover: [photoW, photoH], align: 'center', valign: 'center' });
    doc.restore();
  } else {
    doc.save();
    doc.rect(photoX, photoY, photoW, photoH).fill('#EDF2F7');
    doc
      .fillColor(THEME.teal)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(initials(card.name), photoX, photoY + 19, { width: photoW, align: 'center' });
    doc.restore();
  }
  // Solid orange frame around photo
  doc.rect(photoX, photoY, photoW, photoH).lineWidth(2.2).stroke(THEME.orange);

  // 5. Details Table (Includes Father's Name and Contact Number)
  const detailsY = photoY + photoH + 8;
  const labelX = x + 14;
  const colonX = x + 55;
  const valX = x + 60;
  const valW = w - 74;

  const rows: { label: string; value: string; isTeal?: boolean }[] = [
    { label: 'Name', value: card.name.toUpperCase(), isTeal: true },
    { label: "Father's Name", value: card.father_name || card.guardian_name || '—' },
    { label: 'Contact', value: card.guardian_mobile || '—' },
    { label: 'Class Name', value: card.class_section || '—' },
    { label: 'Class Roll', value: card.roll_no ? String(card.roll_no).padStart(2, '0') : '—' },
    { label: 'Date of Birth', value: displayDate(card.dob) },
    { label: 'Blood Group', value: card.blood_group || '—' },
  ];

  let curY = detailsY;
  const rowGap = 8.2;
  for (const row of rows) {
    doc
      .font('Helvetica-Bold')
      .fontSize(5.1)
      .fillColor(THEME.textMuted)
      .text(row.label, labelX, curY, { width: colonX - labelX - 1, ellipsis: true, lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(5.1).fillColor(THEME.textMuted).text(':', colonX, curY, { lineBreak: false });

    doc
      .font('Helvetica-Bold')
      .fontSize(5.1)
      .fillColor(row.isTeal ? THEME.teal : THEME.textDark)
      .text(row.value, valX, curY, { width: valW, height: 8, ellipsis: true, lineBreak: false });

    curY += rowGap;
  }

  // 6. Principal Signature Line (bottom right)
  const sigW = 42;
  const sigX = x + w - sigW - 14;
  const sigY = y + h - 18;

  doc.moveTo(sigX, sigY).lineTo(sigX + sigW, sigY).lineWidth(0.8).stroke(THEME.orange);
  doc
    .font('Helvetica')
    .fontSize(4.6)
    .fillColor(THEME.textLight)
    .text('Principal Signature', sigX, sigY + 2.5, { width: sigW, align: 'center', lineBreak: false });

  doc.restore();
}

export function drawIdCardBack(doc: Pdf, x: number, y: number, card: IdCardData): void {
  const w = CARD_WIDTH;
  const h = CARD_HEIGHT;

  doc.save();
  drawCardBackground(doc, x, y, w, h);

  // 1. Top Orange Line & Instructions
  const topLineW = 50;
  const topLineX = x + (w - topLineW) / 2;
  const topLineY = y + 22;

  doc.moveTo(topLineX, topLineY).lineTo(topLineX + topLineW, topLineY).lineWidth(1.2).stroke(THEME.orange);

  doc
    .font('Helvetica-Bold')
    .fontSize(6.5)
    .fillColor(THEME.textDark)
    .text('For More Information', x + 10, topLineY + 6, { width: w - 20, align: 'center', lineBreak: false });

  doc
    .font('Helvetica')
    .fontSize(6)
    .fillColor(THEME.textMuted)
    .text('Pls Scan This', x + 10, topLineY + 15, { width: w - 20, align: 'center', lineBreak: false });

  // 2. Large QR Code (centered)
  const qrSize = 54;
  const qrX = x + (w - qrSize) / 2;
  const qrY = topLineY + 27;

  // Outer border box around QR
  doc.rect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6).lineWidth(0.6).stroke(THEME.border);
  doc.image(card.qr, qrX, qrY, { width: qrSize, height: qrSize });

  // 3. School Address Heading
  const headY = qrY + qrSize + 16;
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor(THEME.textDark)
    .text('S C H O O L   A D D R E S S', x + 10, headY, {
      width: w - 20,
      align: 'center',
      lineBreak: false,
    });

  // 4. Campus Address & School Office Phone
  const campusAddr =
    card.school_address ||
    [card.school_city, card.school_phone ? 'Ph: ' + card.school_phone : null].filter(Boolean).join(', ') ||
    'School Campus Office';

  const officePhone = card.school_phone ? `Office : ${card.school_phone}` : '';
  const emailLine = card.school_email ? `Email : ${card.school_email}` : '';

  const lines = [campusAddr, officePhone, emailLine].filter(Boolean);

  doc
    .font('Helvetica')
    .fontSize(5.3)
    .fillColor(THEME.textMuted)
    .text(lines.join('\n'), x + 14, headY + 11, {
      width: w - 28,
      align: 'center',
      lineGap: 2.2,
    });

  // Return Notice
  doc
    .font('Helvetica-Oblique')
    .fontSize(4.6)
    .fillColor(THEME.textLight)
    .text('If found, please return to the school office.', x + 10, y + h - 18, {
      width: w - 20,
      align: 'center',
      lineBreak: false,
    });

  doc.restore();
}

export function drawIdCard(doc: Pdf, x: number, y: number, card: IdCardData): void {
  drawIdCardFront(doc, x, y, card);
}

/**
 * Individual Student ID Card PDF:
 * FRONT and BACK are placed SIDE-BY-SIDE (pakkathula pakkam) on a single page!
 */
export async function idCardPdf(card: IdCardData): Promise<Buffer> {
  const gap = 8;
  const padding = 6;
  const pageWidth = padding * 2 + CARD_WIDTH * 2 + gap;
  const pageHeight = padding * 2 + CARD_HEIGHT;

  const doc = createPdf({
    size: [pageWidth, pageHeight],
    margin: 0,
    info: { Title: `ID card - ${card.name}` },
  });

  // Front on left
  drawIdCardFront(doc, padding, padding, card);

  // Subtle dotted fold line between them
  doc.save();
  doc.dash(3, { space: 3 }).lineWidth(0.5).strokeColor(THEME.border);
  doc
    .moveTo(padding + CARD_WIDTH + gap / 2, padding)
    .lineTo(padding + CARD_WIDTH + gap / 2, padding + CARD_HEIGHT)
    .stroke();
  doc.restore();

  // Back on right (pakkathula pakkam)
  drawIdCardBack(doc, padding + CARD_WIDTH + gap, padding, card);

  return renderPdf(doc);
}

/**
 * A4 Printable Batch Sheet of ID Cards:
 * Each row places FRONT and BACK SIDE-BY-SIDE (pakkathula pakkam) for each student!
 * 3 student pairs (Front + Back) per A4 page.
 */
export async function idCardSheetPdf(cards: IdCardData[], title: string): Promise<Buffer> {
  const doc = createPdf({ size: 'A4', margin: 0, autoFirstPage: false, info: { Title: title } });
  const rowsPerPage = 3;
  const gapX = 8;
  const gapY = 16;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const pairWidth = CARD_WIDTH * 2 + gapX;
  const startX = (pageWidth - pairWidth) / 2;
  const startY = (pageHeight - (rowsPerPage * CARD_HEIGHT + (rowsPerPage - 1) * gapY)) / 2;

  cards.forEach((card, index) => {
    const slot = index % rowsPerPage;
    if (slot === 0) doc.addPage();
    const y = startY + slot * (CARD_HEIGHT + gapY);

    // Front on left
    drawIdCardFront(doc, startX, y, card);

    // Subtle dotted cut / fold guide line in between
    doc.save();
    doc.dash(3, { space: 3 }).lineWidth(0.5).strokeColor(THEME.border);
    doc
      .moveTo(startX + CARD_WIDTH + gapX / 2, y)
      .lineTo(startX + CARD_WIDTH + gapX / 2, y + CARD_HEIGHT)
      .stroke();
    doc.restore();

    // Back on right (side-by-side / pakkathula pakkam)
    drawIdCardBack(doc, startX + CARD_WIDTH + gapX, y, card);
  });

  if (!cards.length) doc.addPage();
  return renderPdf(doc);
}
