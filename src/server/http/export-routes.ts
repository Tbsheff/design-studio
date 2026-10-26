import path from 'node:path';
import type { Context, Hono } from 'hono';
import type { ProjectKind } from '../../shared/contracts.js';
import { EXPORT_NOTE_HEADER, exportFileStem, type CopyCodeFormat, type CopyCodeResult, type ExportFormat, type ExportFrame, type ExportScale, type ExportScope } from '../../shared/export.js';
import { zipFiles, type ZipEntry } from '../design-system/zip.js';
import { captureFrame, type Shot } from '../export/capture.js';
import { copyAsCode } from '../export/copy-code.js';
import { listEditors, openInEditor, revealInFinder } from '../export/editors.js';
import { buildHandoff, handoffRoot, zipHandoff } from '../export/handoff.js';
import { inlineHtml } from '../export/inline-html.js';
import { imagesToPdf } from '../export/pdf.js';
import { parseFrame, parseFrames, parseScale, resolveSource, type ExportDeps } from '../export/source.js';
import { createMcpService } from '../mcp/server.js';
import type { CommentStore } from '../store/comments.js';
import { BadRequestError, NotFoundError, assertSafeId } from '../store/errors.js';

export interface ExportRouteDeps extends ExportDeps {
  comments: CommentStore;
  studioToken: string;
  dataDir: string;
}

const FORMATS: readonly Exclude<ExportFormat, 'handoff'>[] = ['png', 'pdf', 'html', 'zip'];
const MAX_SELECTOR = 2000;

async function body(c: Context): Promise<Record<string, unknown>> {
  const parsed: unknown = await c.req.json().catch(() => null);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new BadRequestError('body must be a JSON object');
  return parsed as Record<string, unknown>;
}

function text(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value === '') throw new BadRequestError(`${key} is required`);
  return value;
}

function selectorOf(record: Record<string, unknown>): string | undefined {
  const value = record.selector;
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > MAX_SELECTOR) throw new BadRequestError('selector is not valid');
  return value;
}

function file(bytes: Uint8Array, type: string, name: string, note?: string): Response {
  const headers: Record<string, string> = {
    'content-type': type,
    'content-disposition': `attachment; filename="${name.replace(/"/g, '')}"`,
    'content-length': String(bytes.byteLength),
  };
  if (note) headers[EXPORT_NOTE_HEADER] = note;
  return new Response(new Uint8Array(bytes), { headers });
}

function shotName(shot: Shot, index: number, scale: number): string {
  const page = shot.frame.path ? `-${exportFileStem(shot.frame.path)}` : '';
  return `${index + 1}-${exportFileStem(shot.frame.name).toLowerCase()}${page}${scale > 1 ? `@${scale}x` : ''}.png`;
}

interface ImageJob {
  deps: ExportRouteDeps;
  url: string;
  stem: string;
  name: string;
  frames: ExportFrame[];
  scale: ExportScale;
  scope: ExportScope;
  selector: string | undefined;
}

async function exportHtml(job: ImageJob, kind: ProjectKind, secrets: string[]): Promise<Response> {
  const pages = [...new Map(job.frames.map((f) => [f.path ?? '', f])).values()];
  const results = [];
  for (const frame of pages) results.push({ frame, ...(await inlineHtml(job.deps.preview, job.url, frame, kind, secrets)) });
  const missing = new Set(results.flatMap((r) => r.missing));
  const note = missing.size > 0 ? `${missing.size} file${missing.size === 1 ? '' : 's'} could not be inlined` : undefined;
  const [only] = results;
  if (results.length === 1 && only) return file(Buffer.from(only.html), 'text/html; charset=utf-8', `${job.stem}${only.frame.path ? `-${exportFileStem(only.frame.path)}` : ''}.html`, note);
  const entries: ZipEntry[] = results.map((r) => ({ name: `${r.frame.path ? exportFileStem(r.frame.path) : 'index'}.html`, data: Buffer.from(r.html) }));
  return file(zipFiles(entries), 'application/zip', `${job.stem}-html.zip`, note);
}

async function exportImages(job: ImageJob, format: 'png' | 'pdf'): Promise<Response> {
  const shots: Shot[] = [];
  const scale = format === 'pdf' ? 2 : job.scale;
  for (const frame of job.frames) shots.push(await captureFrame(job.deps.preview, job.url, frame, scale, job.scope, job.selector));
  const note = shots.some((s) => s.cropped) ? 'Very tall pages were cut at the bottom' : undefined;
  if (format === 'pdf') return file(imagesToPdf(shots.map((s) => ({ png: s.png, cssWidth: s.cssWidth, cssHeight: s.cssHeight })), job.name), 'application/pdf', `${job.stem}.pdf`, note);
  const [first] = shots;
  if (shots.length === 1 && first) return file(first.png, 'image/png', `${job.stem}${scale > 1 ? `@${scale}x` : ''}.png`, note);
  return file(zipFiles(shots.map((shot, index) => ({ name: shotName(shot, index, scale), data: shot.png }))), 'application/zip', `${job.stem}-png.zip`, note);
}

async function openForCopy(deps: ExportRouteDeps, pid: string, input: Record<string, unknown>): Promise<{ url: string; release: () => Promise<void> }> {
  if (typeof input.directionId === 'string') {
    const project = await deps.projects.get(assertSafeId(pid, 'projectId'));
    const did = assertSafeId(input.directionId, 'directionId');
    const direction = project.directions.find((d) => d.id === did);
    if (!direction) throw new NotFoundError('direction not found');
    return { url: await deps.preview.directionUrl(project, direction), release: async () => undefined };
  }
  return (await resolveSource(deps, pid, text(input, 'versionId'))).open();
}

export function registerExportRoutes(app: Hono, deps: ExportRouteDeps): void {
  const secrets = [deps.studioToken];

  app.post('/api/projects/:pid/export', async (c) => {
    const input = await body(c);
    const format = input.format as Exclude<ExportFormat, 'handoff'>;
    if (!FORMATS.includes(format)) throw new BadRequestError('format must be png, pdf, html or zip');
    const source = await resolveSource(deps, c.req.param('pid'), text(input, 'versionId'));
    const stem = `${exportFileStem(source.project.name)}-${source.version.id.slice(0, 7)}`;
    if (format === 'zip') return file(await deps.versions.exportZip(source.project, source.version.id), 'application/zip', `${stem}.zip`);
    const frames = parseFrames(input.frames);
    const scale = parseScale(input.scale);
    const scope: ExportScope = input.scope === 'frame' ? 'frame' : 'page';
    const selector = selectorOf(input);
    const opened = await source.open();
    try {
      const job: ImageJob = { deps, url: opened.url, stem, name: source.project.name, frames, scale, scope, selector };
      if (format === 'html') return await exportHtml(job, source.project.kind, secrets);
      return await exportImages(job, format);
    } finally {
      await opened.release().catch(() => undefined);
    }
  });

  app.post('/api/projects/:pid/handoff', async (c) => {
    const input = await body(c);
    const source = await resolveSource(deps, c.req.param('pid'), text(input, 'versionId'));
    const frames = Array.isArray(input.frames) && input.frames.length > 0 ? parseFrames(input.frames) : [{ name: 'Desktop', width: 1440, height: 900 }, { name: 'Mobile', width: 390, height: 844 }];
    const history = await deps.versions.list(source.project, source.direction);
    return c.json(await buildHandoff({ ...deps, secrets }, { source, frames, history }));
  });

  app.get('/api/projects/:pid/handoff/:folder/zip', async (c) => {
    const pid = assertSafeId(c.req.param('pid'), 'projectId');
    const zip = await zipHandoff(deps, pid, path.basename(c.req.param('folder')));
    return file(zip.bytes, 'application/zip', zip.name);
  });

  app.post('/api/projects/:pid/handoff/:folder/reveal', async (c) => {
    const pid = assertSafeId(c.req.param('pid'), 'projectId');
    const target = path.join(handoffRoot(deps, pid), path.basename(c.req.param('folder')), 'HANDOFF.md');
    await revealInFinder(target);
    return c.json({ ok: true });
  });

  app.post('/api/projects/:pid/copy-code', async (c) => {
    const input = await body(c);
    const format: CopyCodeFormat = input.format === 'tailwind' ? 'tailwind' : 'html';
    const selector = selectorOf(input);
    if (!selector) throw new BadRequestError('selector is required');
    const frame = parseFrame(input.frame);
    const opened = await openForCopy(deps, c.req.param('pid'), input);
    try {
      const result: CopyCodeResult = { code: await copyAsCode(deps.preview, opened.url, frame, selector, format), format };
      return c.json(result);
    } finally {
      await opened.release().catch(() => undefined);
    }
  });

  app.get('/api/editors', (c) => c.json(listEditors()));

  const mcp = createMcpService(deps.dataDir, deps);
  void mcp.boot();
  app.get('/api/mcp', async (c) => c.json(await mcp.status()));
  app.post('/api/mcp', async (c) => {
    const input = await body(c);
    if (input.rotate === true) await mcp.rotate();
    if (typeof input.enabled === 'boolean') return c.json(await mcp.setEnabled(input.enabled));
    return c.json(await mcp.status());
  });

  app.post('/api/projects/:pid/d/:did/open-in-editor', async (c) => {
    const input = await body(c);
    const project = await deps.projects.get(assertSafeId(c.req.param('pid'), 'projectId'));
    const did = assertSafeId(c.req.param('did'), 'directionId');
    const direction = project.directions.find((d) => d.id === did);
    if (!direction) throw new NotFoundError('direction not found');
    const file = typeof input.file === 'string' && input.file !== '' ? path.resolve(direction.workTree, input.file) : undefined;
    if (file !== undefined && !file.startsWith(path.resolve(direction.workTree) + path.sep)) throw new BadRequestError('file must be inside the design folder');
    await openInEditor(input.editor, direction.workTree, file);
    return c.json({ ok: true });
  });
}
