import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { EXPORT_MAX_FRAMES, exportFileStem, type ExportFrame } from '../../shared/export.js';
import { findFrame } from '../canvas/tools.js';
import { exportVector } from '../export/vector-export.js';
import { canvasFrames, type DirectToolDeps } from './direct-tools.js';

export const EXPORT_FRAME_AGENT_DESCRIPTION =
  'Export canvas frames of this direction as SVG or PPTX with the same server code as Export > SVG and Export > PPTX in the studio and the MCP export_frame tool. SVG: vector boxes, <text> with font names and embedded pictures; selector exports one element. PPTX: one slide per frame (or per .slide / [data-slide] section) with native text boxes on a picture of the frame without its text. Returns the file path in the Design Studio data folder. It changes no design file; use it only when the user asks for an SVG or a deck file.';

export const exportFrameShape = {
  format: z.enum(['svg', 'pptx']).describe('svg: vector file. pptx: slide deck.'),
  frames: z.array(z.string().trim().min(1).max(60)).min(1).max(EXPORT_MAX_FRAMES).optional().describe('Frame ids or @labels from canvas_list. Leave out for every visible frame.'),
  selector: z.string().trim().min(1).max(2000).optional().describe('SVG only: a CSS selector or layer id of one element of the first frame.'),
  area: z.enum(['frame', 'page']).optional().describe('SVG only: frame (default) or page (full page height).'),
};

const schema = z.object(exportFrameShape).strict();
type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

const text = (message: string, isError = false): ToolText => ({ content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) });

async function framesFor(deps: DirectToolDeps, refs: string[] | undefined): Promise<ExportFrame[] | string> {
  const all = await canvasFrames(deps);
  const toExport = (frame: (typeof all)[number]): ExportFrame => ({ name: frame.label?.trim() || `${frame.width} × ${frame.height}`, width: frame.width, height: frame.height, ...(frame.path ? { path: frame.path } : {}) });
  if (refs) {
    const out: ExportFrame[] = [];
    for (const ref of refs) {
      const found = findFrame(all, ref);
      if (!found) return `No frame ${ref} on the canvas. Call canvas_list for frame ids.`;
      out.push(toExport(found));
    }
    return out;
  }
  const own = all.filter((frame) => !frame.hidden && (!frame.directionId || frame.directionId === deps.ctx.direction.id)).sort((a, b) => a.order - b.order);
  return own.length > 0 ? own.slice(0, EXPORT_MAX_FRAMES).map(toExport) : [{ name: 'Desktop', width: 1440, height: 900 }];
}

async function writeExport(folder: string, name: string, bytes: Uint8Array): Promise<string> {
  await mkdir(folder, { recursive: true });
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let n = 1; n < 1000; n += 1) {
    const target = path.join(folder, n === 1 ? name : `${stem}-${n}${ext}`);
    try {
      await writeFile(target, bytes, { flag: 'wx' });
      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  throw new Error(`no free file name for ${name}`);
}

export async function runExportFrame(deps: DirectToolDeps & { exportsDir?: string | undefined }, args: z.input<typeof schema>): Promise<ToolText> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) return text(`export_frame: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')}`, true);
  const input = parsed.data;
  if (!deps.exportsDir) return text('export_frame is not available in this run.', true);
  if (input.selector && input.format === 'pptx') return text('selector works with format svg only.', true);
  const { project, direction } = deps.ctx;
  try {
    const frames = await framesFor(deps, input.frames);
    if (typeof frames === 'string') return text(frames, true);
    const picked = input.selector ? frames.slice(0, 1) : frames;
    const url = deps.ctx.previewUrl ?? (await deps.preview.directionUrl(project, direction));
    const out = await exportVector(deps.preview, url, { format: input.format, frames: picked, scope: input.area ?? 'frame', selector: input.selector, name: project.name, stem: exportFileStem(project.name) });
    const file = await writeExport(path.join(deps.exportsDir, project.id), out.name, out.bytes);
    return text(JSON.stringify({ file, format: input.format, bytes: out.bytes.byteLength, frames: picked.map((frame) => frame.name), ...(out.note ? { note: out.note } : {}) }));
  } catch (error) {
    return text(`export_frame failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}
