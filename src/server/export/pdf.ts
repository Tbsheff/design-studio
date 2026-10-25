import { deflateSync } from 'node:zlib';
import { PNG } from 'pngjs';

export interface PdfPage {
  png: Buffer;
  cssWidth: number;
  cssHeight: number;
}

const PT_PER_PX = 0.75;
const MAX_PAGE_PT = 14_400;

function rgbOnWhite(png: Buffer): { width: number; height: number; data: Buffer } {
  const image = PNG.sync.read(png);
  const rgb = Buffer.alloc(image.width * image.height * 3);
  for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
    const alpha = (image.data[i + 3] ?? 255) / 255;
    rgb[j] = Math.round((image.data[i] ?? 0) * alpha + 255 * (1 - alpha));
    rgb[j + 1] = Math.round((image.data[i + 1] ?? 0) * alpha + 255 * (1 - alpha));
    rgb[j + 2] = Math.round((image.data[i + 2] ?? 0) * alpha + 255 * (1 - alpha));
  }
  return { width: image.width, height: image.height, data: rgb };
}

function pageSize(page: PdfPage): { width: number; height: number } {
  const width = page.cssWidth * PT_PER_PX;
  const height = page.cssHeight * PT_PER_PX;
  const fit = Math.min(1, MAX_PAGE_PT / Math.max(width, height));
  return { width: Math.round(width * fit * 100) / 100, height: Math.round(height * fit * 100) / 100 };
}

export function imagesToPdf(pages: PdfPage[], title: string): Buffer {
  const chunks: Buffer[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Buffer): void => {
    const bytes = typeof part === 'string' ? Buffer.from(part, 'latin1') : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: string | Buffer[], dict?: string): void => {
    offsets[id] = length;
    if (typeof body === 'string') {
      push(`${id} 0 obj\n${body}\nendobj\n`);
      return;
    }
    push(`${id} 0 obj\n${dict ?? ''}\nstream\n`);
    for (const part of body) push(part);
    push('\nendstream\nendobj\n');
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const pageIds = pages.map((_, index) => 4 + index * 3);
  const safeTitle = title.replace(/[^\x20-\x7E]/g, '').replace(/[\\()]/g, (char) => `\\${char}`);
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  object(3, `<< /Title (${safeTitle}) /Producer (Design Studio) >>`);
  pages.forEach((page, index) => {
    const pageId = pageIds[index] as number;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const size = pageSize(page);
    const image = rgbOnWhite(page.png);
    const content = `q ${size.width} 0 0 ${size.height} 0 0 cm /Im0 Do Q`;
    object(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${size.width} ${size.height}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    const compressed = deflateSync(image.data);
    object(imageId, [compressed], `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressed.length} >>`);
    object(contentId, [Buffer.from(content, 'latin1')], `<< /Length ${content.length} >>`);
  });
  const count = 4 + pages.length * 3;
  const xrefAt = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id += 1) push(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
  return Buffer.concat(chunks);
}
