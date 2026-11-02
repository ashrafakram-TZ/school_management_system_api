import { applyDecorators, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiProduces } from '@nestjs/swagger';

export function ApiPdf(description: string) {
  return applyDecorators(
    ApiProduces('application/pdf'),
    ApiOkResponse({ description, content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } }),
  );
}

export function pdfFile(file: { name: string; pdf: Buffer }, download = false): StreamableFile {
  return new StreamableFile(file.pdf, {
    type: 'application/pdf',
    length: file.pdf.length,
    disposition: `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(file.name)}.pdf"`,
  });
}

export function ApiFile(mime: string, description: string) {
  return applyDecorators(
    ApiProduces(mime),
    ApiOkResponse({ description, content: { [mime]: { schema: { type: 'string', format: 'binary' } } } }),
  );
}
