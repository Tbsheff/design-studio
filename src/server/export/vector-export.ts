import { exportFileStem, type ExportFrame, type ExportScope } from '../../shared/export.js';
import { zipFiles } from '../design-system/zip.js';
import type { PreviewService } from '../types.js';
import { buildPptx } from './pptx.js';
import { buildSvg } from './svg.js';
import { captureVector } from './vector.js';

export interface VectorRequest {
  format: 'svg' | 'pptx';
  frames: ExportFrame[];
  scope: ExportScope;
  selector?: string | undefined;
  name: string;
  stem: string;
}

export interface VectorFile {
  bytes: Uint8Array;
  type: string;
  name: string;
  note: string | null;
  count: number;
}

const PPTX_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

function noteOf(notes: string[]): string | null {
  const unique = [...new Set(notes)];
  if (unique.length === 0) return null;
  const text = unique.join('; ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

export async function exportVector(preview: PreviewService, url: string, request: VectorRequest): Promise<VectorFile> {
  const slides = request.format === 'pptx' && !request.selector;
  const regions = await captureVector(preview, url, { frames: request.frames, scope: request.format === 'pptx' ? 'frame' : request.scope, selector: request.selector, slides });
  const notes = regions.flatMap((region) => region.scan.notes);
  if (request.format === 'pptx') {
    const deck = await buildPptx(regions, request.name);
    if (deck.textBoxes === 0) notes.push('no text was found, so slides are pictures only');
    return { bytes: deck.bytes, type: PPTX_TYPE, name: `${request.stem}.pptx`, note: noteOf(notes), count: deck.slides };
  }
  const files = regions.map((region, index) => ({
    name: `${index + 1}-${exportFileStem(region.frame.name).toLowerCase()}${region.frame.path ? `-${exportFileStem(region.frame.path)}` : ''}.svg`,
    data: Buffer.from(buildSvg(region, { background: !request.selector, title: `${request.name} – ${region.frame.name}` })),
  }));
  const [only] = files;
  if (files.length === 1 && only) return { bytes: only.data, type: 'image/svg+xml', name: `${request.stem}${request.selector ? '-selection' : ''}.svg`, note: noteOf(notes), count: 1 };
  return { bytes: zipFiles(files), type: 'application/zip', name: `${request.stem}-svg.zip`, note: noteOf(notes), count: files.length };
}
