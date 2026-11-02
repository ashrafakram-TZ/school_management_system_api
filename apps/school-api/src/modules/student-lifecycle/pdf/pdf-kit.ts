import PDFDocument from 'pdfkit';

export type Pdf = PDFKit.PDFDocument;

export const BRAND = {
  green: '#159053',
  deep: '#0d5c35',
  dark: '#0f1a15',
  muted: '#5a6a62',
  line: '#dbe3df',
  wash: '#e4f2ea',
};

export function createPdf(options: PDFKit.PDFDocumentOptions): Pdf {
  return new PDFDocument({ ...options, info: { Producer: 'Tamilzorous School', ...(options.info ?? {}) } });
}

export function renderPdf(doc: Pdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function displayDate(value: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}
