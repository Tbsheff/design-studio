import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { SOURCE_LOC_ATTR, type Project } from '../../shared/contracts.js';
import { cleanExportPath, type ExportFrame } from '../../shared/export.js';
import { DESIGN_MD_FILE } from '../design-system/packs.js';
import { readDesignSystemFiles } from '../design-system/sync.js';
import { captureFrame, waitForPage } from '../export/capture.js';
import { resolveSource, withPagePath, type ExportDeps, type ExportSource } from '../export/source.js';

export interface ToolContent {
  type: 'text' | 'image';
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint: boolean };
}

type Args = Record<string, unknown>;

const MAX_TEXT = 256 * 1024;
const MAX_FILES = 2000;
const MAX_SHOT_HEIGHT = 6000;
const SKIP = new Set(['node_modules', '.git', '.studio', 'dist', '.vite', '.DS_Store']);
const TEXT_EXT = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.md', '.txt', '.svg', '.xml', '.yml', '.yaml', '.toml']);

const PROJECT = { type: 'string', description: 'Project id from list_projects' };
const VERSION = { type: 'string', description: 'Version id. Leave out for the newest saved version of the main direction.' };
const DIRECTION = { type: 'string', description: 'Direction id. Leave out for the main direction.' };
const PAGE = { type: 'string', description: 'Page path inside the project, for example "about.html". Leave out for the entry page.' };

function def(name: string, title: string, description: string, properties: Record<string, unknown>, required: string[] = []): ToolDef {
  return { name, title, description, inputSchema: { type: 'object', properties, required, additionalProperties: false }, annotations: { readOnlyHint: true, openWorldHint: false } };
}

export const TOOLS: ToolDef[] = [
  def('list_projects', 'List projects', 'List the design projects in Design Studio with their directions and newest version ids.', {}),
  def('list_versions', 'List versions', 'List the saved versions of one direction, newest first.', { projectId: PROJECT, directionId: DIRECTION }, ['projectId']),
  def('get_frame_html', 'Get page HTML', 'Get the HTML of one page. Static HTML projects return the source file. React projects return the rendered DOM.', { projectId: PROJECT, versionId: VERSION, directionId: DIRECTION, path: PAGE }, ['projectId']),
  def('get_tokens', 'Get design tokens', 'Get the design tokens of the active design system: tokens.css and a list of tokens with their CSS variables and values.', { projectId: PROJECT, versionId: VERSION, directionId: DIRECTION }, ['projectId']),
  def('get_design_md', 'Get DESIGN.md', 'Get the DESIGN.md rules of the project.', { projectId: PROJECT, versionId: VERSION, directionId: DIRECTION }, ['projectId']),
  def('get_screenshot', 'Get screenshot', 'Get a PNG screenshot of a page at a viewport size.', {
    projectId: PROJECT, versionId: VERSION, directionId: DIRECTION, path: PAGE,
    width: { type: 'integer', minimum: 320, maximum: 2560, description: 'Viewport width in px. Default 1440.' },
    height: { type: 'integer', minimum: 320, maximum: 2000, description: 'Viewport height in px. Default 900.' },
    fullPage: { type: 'boolean', description: 'Capture the full page height, up to 6000 px. Default false.' },
  }, ['projectId']),
  def('list_files', 'List files', 'List the source files of a version.', { projectId: PROJECT, versionId: VERSION, directionId: DIRECTION }, ['projectId']),
  def('read_file', 'Read file', 'Read one text source file of a version.', { projectId: PROJECT, versionId: VERSION, directionId: DIRECTION, path: { type: 'string', description: 'File path from list_files' } }, ['projectId', 'path']),
];

export class ToolError extends Error {}

function str(args: Args, key: string, required = false): string | undefined {
  const value = args[key];
  if (value === undefined || value === null || value === '') {
    if (required) throw new ToolError(`${key} is required`);
    return undefined;
  }
  if (typeof value !== 'string' || value.length > 300) throw new ToolError(`${key} must be a short string`);
  return value;
}

function int(args: Args, key: string, min: number, max: number, fallback: number): number {
  const value = args[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new ToolError(`${key} must be an integer from ${min} to ${max}`);
  return value;
}

function text(value: string): ToolResult {
  return { content: [{ type: 'text', text: value.length > MAX_TEXT ? `${value.slice(0, MAX_TEXT)}\n[cut at ${MAX_TEXT} characters]` : value }] };
}

function json(value: unknown): ToolResult {
  return text(JSON.stringify(value, null, 2));
}

async function source(deps: ExportDeps, args: Args): Promise<ExportSource> {
  const projectId = str(args, 'projectId', true) as string;
  const project = await deps.projects.get(projectId);
  let versionId = str(args, 'versionId');
  if (!versionId) {
    const directionId = str(args, 'directionId');
    const direction = directionId ? project.directions.find((d) => d.id === directionId) : project.directions[0];
    if (!direction) throw new ToolError('direction not found');
    if (!direction.headVersionId) throw new ToolError('this direction has no saved version yet');
    versionId = direction.headVersionId;
  }
  return resolveSource(deps, project.id, versionId);
}

function pagePath(args: Args): string | undefined {
  const raw = str(args, 'path');
  if (raw === undefined) return undefined;
  const cleaned = cleanExportPath(raw);
  if (cleaned === null) throw new ToolError('path is not a page in this project');
  return cleaned || undefined;
}

async function insideRoot(root: string, relative: string): Promise<string> {
  const cleaned = cleanExportPath(relative);
  if (!cleaned) throw new ToolError('path is not valid');
  if (cleaned.split('/').some((part) => SKIP.has(part))) throw new ToolError('that file is not part of the source');
  const realRoot = await realpath(root);
  const full = await realpath(path.join(realRoot, ...cleaned.split('/'))).catch(() => null);
  if (!full || !full.startsWith(realRoot + path.sep)) throw new ToolError('file not found');
  return full;
}

async function listFiles(root: string, prefix = '', out: { path: string; bytes: number }[] = []): Promise<{ path: string; bytes: number }[]> {
  for (const item of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    if (SKIP.has(item.name) || out.length >= MAX_FILES) continue;
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) await listFiles(root, relative, out);
    else if (item.isFile()) out.push({ path: relative, bytes: (await stat(path.join(root, relative))).size });
  }
  return out;
}

function summary(project: Project): unknown {
  return {
    id: project.id,
    name: project.name,
    kind: project.kind,
    entry: project.entry || 'index.html',
    updatedAt: new Date(project.updatedAt).toISOString(),
    folder: project.imported?.sourcePath ?? project.directions[0]?.workTree ?? null,
    directions: project.directions.map((d) => ({ id: d.id, name: d.name, headVersionId: d.headVersionId })),
  };
}

const RENDERED_DOM = `(() => { const doc = document.documentElement.cloneNode(true); for (const node of doc.querySelectorAll('script, link[rel="modulepreload"], style[id^="studio-"]')) node.remove(); for (const node of doc.querySelectorAll('[${SOURCE_LOC_ATTR}]')) node.removeAttribute('${SOURCE_LOC_ATTR}'); return '<!doctype html>\\n' + doc.outerHTML; })()`;

async function frameHtml(deps: ExportDeps, args: Args): Promise<ToolResult> {
  const src = await source(deps, args);
  const page = pagePath(args);
  if (src.project.kind === 'html') {
    const file = await insideRoot(await src.files(), page ?? (src.project.entry || 'index.html'));
    return text(await readFile(file, 'utf8'));
  }
  const opened = await src.open();
  try {
    if (!deps.preview.withPage) throw new ToolError('rendering is not available');
    const html = await deps.preview.withPage(withPagePath(opened.url, page), { width: 1440, height: 900 }, async (p) => {
      await waitForPage(p);
      return p.evaluate<string>(RENDERED_DOM);
    });
    return text(html);
  } finally {
    await opened.release().catch(() => undefined);
  }
}

async function tokens(deps: ExportDeps, args: Args): Promise<ToolResult> {
  const src = await source(deps, args);
  const files = await readDesignSystemFiles(await src.files());
  if (!files) return text('This version has no design system.');
  return json({
    pack: files.manifest ? { id: files.manifest.id, name: files.manifest.name, mode: files.manifest.mode, fonts: files.manifest.fonts } : null,
    tokens: files.entries.map((e) => ({ token: e.path, cssVar: e.cssVar, type: e.type, value: e.value, dark: e.darkValue, ...(e.description ? { description: e.description } : {}) })),
    tokensCss: files.css,
    errors: files.errors,
  });
}

async function screenshot(deps: ExportDeps, args: Args): Promise<ToolResult> {
  const src = await source(deps, args);
  const page = pagePath(args);
  const frame: ExportFrame = { name: 'Screenshot', width: int(args, 'width', 320, 2560, 1440), height: int(args, 'height', 320, 2000, 900), ...(page ? { path: page } : {}) };
  const opened = await src.open();
  try {
    const shot = await captureFrame(deps.preview, opened.url, frame, 1, args.fullPage === true ? 'page' : 'frame', undefined, MAX_SHOT_HEIGHT);
    const note = shot.cropped ? ` The page is taller; the shot stops at ${MAX_SHOT_HEIGHT} px.` : '';
    return { content: [{ type: 'image', data: shot.png.toString('base64'), mimeType: 'image/png' }, { type: 'text', text: `${shot.width} × ${shot.height} px of version ${src.version.id}.${note}` }] };
  } finally {
    await opened.release().catch(() => undefined);
  }
}

export async function callTool(deps: ExportDeps, name: string, args: Args): Promise<ToolResult> {
  switch (name) {
    case 'list_projects':
      return json((await deps.projects.list()).filter((p) => !p.designSystemFor).map(summary));
    case 'list_versions': {
      const project = await deps.projects.get(str(args, 'projectId', true) as string);
      const directionId = str(args, 'directionId');
      const direction = directionId ? project.directions.find((d) => d.id === directionId) : project.directions[0];
      if (!direction) throw new ToolError('direction not found');
      const versions = (await deps.versions.list(project, direction)).slice(0, 50);
      return json(versions.map((v) => ({ id: v.id, name: v.name ?? v.title, kind: v.meta.kind, createdAt: new Date(v.createdAt).toISOString(), changedFiles: v.changedFiles.slice(0, 20) })));
    }
    case 'get_frame_html':
      return frameHtml(deps, args);
    case 'get_tokens':
      return tokens(deps, args);
    case 'get_design_md': {
      const src = await source(deps, args);
      const md = await readFile(path.join(await src.files(), DESIGN_MD_FILE), 'utf8').catch(() => null);
      return text(md ?? 'This project has no DESIGN.md.');
    }
    case 'get_screenshot':
      return screenshot(deps, args);
    case 'list_files': {
      const src = await source(deps, args);
      return json({ versionId: src.version.id, files: await listFiles(await src.files()) });
    }
    case 'read_file': {
      const src = await source(deps, args);
      const file = await insideRoot(await src.files(), str(args, 'path', true) as string);
      if (!TEXT_EXT.has(path.extname(file).toLowerCase())) throw new ToolError('only text files can be read');
      if ((await stat(file)).size > MAX_TEXT) throw new ToolError('the file is too large');
      return text(await readFile(file, 'utf8'));
    }
    default:
      throw new ToolError(`unknown tool ${name}`);
  }
}
