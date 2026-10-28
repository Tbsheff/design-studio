import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CompiledTokenEntry, ComponentInfo, DesignComment, Version } from '../../shared/contracts.js';
import { TOKENS_CSS_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import { exportFileStem, type ExportFrame, type HandoffResult } from '../../shared/export.js';
import { listComponents } from '../components/inventory.js';
import { DESIGN_MD_FILE } from '../design-system/packs.js';
import { readDesignSystemFiles } from '../design-system/sync.js';
import { findTokenFile } from '../design-system/app-tokens/detect.js';
import { readAppTokensAt, usesAppTokens, type LoadedAppTokens } from '../design-system/app-tokens/source.js';
import { APP_VAR_EXTENSION } from '../design-system/extract/map.js';
import { zipFiles, type ZipEntry } from '../design-system/zip.js';
import type { CommentStore } from '../store/comments.js';
import { CANVAS_FILE, parseCanvasText, type CanvasFile } from '../../shared/canvas-file.js';
import { captureFrame } from './capture.js';
import { inlineHtml } from './inline-html.js';
import type { ExportDeps, ExportSource } from './source.js';

export interface HandoffDeps extends ExportDeps {
  comments: CommentStore;
  secrets: string[];
}

const SKIP_SOURCE = new Set(['node_modules', '.git', '.studio', 'dist', '.vite', '.DS_Store']);
const MAX_SOURCE_BYTES = 200 * 1024 * 1024;
const MAX_DECISIONS = 20;

export function handoffRoot(deps: ExportDeps, projectId: string): string {
  return path.join(deps.projects.projectDir(projectId), 'handoff');
}

function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

const FIXED_ROLES: Record<string, string> = {
  [TOKENS_FILE]: 'Design tokens (source of truth)',
  [TOKENS_CSS_FILE]: 'Design tokens as CSS variables (generated)',
  [CANVAS_FILE]: 'Canvas layout (frames, pages, labels)',
  'design-system/pack.json': 'Design system manifest',
};

function role(file: string, entry: string): string {
  const base = path.posix.basename(file).toLowerCase();
  const ext = path.posix.extname(base);
  if (file === entry) return 'Entry page';
  const fixed = FIXED_ROLES[file];
  if (fixed) return fixed;
  if (base === 'design.md') return 'Design rules in prose';
  if (base === 'package.json') return 'Dependencies and scripts';
  if (base.startsWith('vite.config')) return 'Vite config';
  if (ext === '.html') return 'Page';
  if (ext === '.css') return 'Styles';
  if (ext === '.tsx' || ext === '.jsx') return /^[A-Z]/.test(path.posix.basename(file)) ? 'Component' : 'Script';
  if (ext === '.ts' || ext === '.js' || ext === '.mjs') return 'Script';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.ico'].includes(ext)) return 'Image';
  if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) return 'Font';
  if (ext === '.json') return 'Data';
  if (ext === '.md') return 'Notes';
  return 'File';
}

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface TokenNames {
  appVars: Map<string, string>;
  appFile: string | null;
}

function appVarsOf(tokensJson: string | null): Map<string, string> {
  const out = new Map<string, string>();
  let parsed: unknown;
  try {
    parsed = tokensJson ? JSON.parse(tokensJson) : null;
  } catch {
    return out;
  }
  const visit = (node: unknown, trail: string[]) => {
    if (typeof node !== 'object' || node === null) return;
    const record = node as Record<string, unknown>;
    const ext = record.$extensions as Record<string, { cssVar?: unknown }> | undefined;
    const cssVar = ext?.[APP_VAR_EXTENSION]?.cssVar;
    if (typeof cssVar === 'string' && /^--[A-Za-z0-9_-]+$/.test(cssVar)) out.set(trail.join('.'), cssVar);
    for (const [key, child] of Object.entries(record)) if (!key.startsWith('$')) visit(child, [...trail, key]);
  };
  visit(parsed, []);
  return out;
}

function tokenIntro(names: TokenNames): string {
  if (names.appFile) return `These are the app's own tokens, read from \`${names.appFile}\`. Use these exact names (as Tailwind utilities, for example \`bg-primary\`, or as \`var(--name)\`). Do not rename them and do not add a parallel token set. "Value" is the declared value; "Dark" is the \`.dark\` value.\n`;
  if (names.appVars.size > 0) return 'Use these tokens. Do not copy raw values. The "App token" column names the variable in the target app that each token was read from: in that codebase, use the app token, not the studio name. `tokens.css` defines the studio names; `tokens.json` is the source.\n';
  return 'Use these CSS variables. Do not copy raw values. `tokens.css` defines them; `tokens.json` is the source.\n';
}

function tokenRow(entry: CompiledTokenEntry, appVar: string | null | undefined): string {
  const app = appVar === undefined ? '' : ` ${appVar ? `\`${appVar}\`` : ''} |`;
  const value = entry.source?.value ?? entry.value;
  const dark = entry.source ? entry.source.darkValue : entry.darkValue;
  const where = entry.source ? ` (line ${entry.source.line})` : '';
  return `| ${cell(entry.path)}${where} | \`${entry.cssVar}\` |${app} \`${cell(value)}\` | ${dark ? `\`${cell(dark)}\`` : ''} |`;
}

function tokenTable(entries: CompiledTokenEntry[], names: TokenNames): string {
  if (entries.length === 0) return 'This version has no design tokens. Read the styles in `source/` for the values.\n';
  const groups = new Map<string, CompiledTokenEntry[]>();
  for (const entry of entries) groups.set(entry.type, [...(groups.get(entry.type) ?? []), entry]);
  const withApp = !names.appFile && names.appVars.size > 0;
  const head = withApp ? ['| Token | CSS variable | App token | Value | Dark |', '| --- | --- | --- | --- | --- |'] : ['| Token | CSS variable | Value | Dark |', '| --- | --- | --- | --- |'];
  const out: string[] = [tokenIntro(names)];
  for (const [type, list] of groups) {
    out.push(`### ${type}\n`, ...head);
    for (const entry of list) out.push(tokenRow(entry, withApp ? (names.appVars.get(entry.path) ?? null) : undefined));
    out.push('');
  }
  return out.join('\n');
}

function componentList(components: ComponentInfo[]): string {
  if (components.length === 0) return 'No reused components were found.\n';
  return ['| Component | Defined in | Uses |', '| --- | --- | --- |', ...components.map((c) => `| ${cell(c.name)} | ${c.file ? `\`source/${c.file}${c.line ? `:${c.line}` : ''}\`` : (c.selector ? `\`${cell(c.selector)}\`` : '')} | ${c.uses} |`), ''].join('\n');
}

function commentList(comments: DesignComment[]): string {
  const open = comments.filter((c) => c.status === 'draft' || c.status === 'queued' || c.status === 'orphaned');
  if (open.length === 0) return 'No open comments.\n';
  return open
    .map((c) => {
      const where = c.target.sourceLoc ? `\`source/${c.target.sourceLoc.file}:${c.target.sourceLoc.line}\`` : `\`${c.target.selector}\``;
      const replies = (c.replies ?? []).map((r) => `\n  - Reply: ${cell(r.text)}`).join('');
      return `- #${c.n} on \`<${c.target.tag}>\` at ${where}: ${cell(c.text)}${replies}`;
    })
    .join('\n')
    .concat('\n');
}

function intent(versions: Version[]): { brief: string; changes: string[] } {
  const prompts = versions.filter((v) => v.meta.prompt && v.meta.prompt.trim() !== '').sort((a, b) => a.createdAt - b.createdAt);
  const first = prompts[0]?.meta.prompt?.trim() ?? '';
  const changes = prompts.slice(1).map((v) => v.meta.prompt?.trim() ?? '').filter((p) => p !== '' && p !== first);
  return { brief: first, changes: [...new Set(changes)].slice(-MAX_DECISIONS) };
}

function quote(text: string): string {
  return text.split('\n').map((line) => `> ${line}`).join('\n');
}

interface Written {
  name: string;
  bytes: number;
}

export interface HandoffInput {
  source: ExportSource;
  frames: ExportFrame[];
  history: Version[];
}

function versionAncestors(history: Version[], head: Version): Version[] {
  const byId = new Map(history.map((v) => [v.id, v]));
  const out: Version[] = [];
  let at: Version | undefined = head;
  const seen = new Set<string>();
  while (at && !seen.has(at.id)) {
    seen.add(at.id);
    out.push(at);
    at = at.parentId ? byId.get(at.parentId) : undefined;
  }
  return out.length > 1 ? out : history.filter((v) => v.createdAt <= head.createdAt);
}

type Put = (name: string, data: Buffer | string) => Promise<void>;

interface ScreenShot {
  file: string;
  frame: ExportFrame;
  width: number;
  height: number;
  cropped: boolean;
}

async function captureScreens(deps: HandoffDeps, source: ExportSource, frames: ExportFrame[], put: Put): Promise<{ shots: ScreenShot[]; designHtml: boolean }> {
  const shots: ScreenShot[] = [];
  let designHtml = false;
  const opened = await source.open();
  try {
    for (const [index, frame] of frames.entries()) {
      try {
        const shot = await captureFrame(deps.preview, opened.url, frame, 1, 'page');
        const file = `screens/${index + 1}-${exportFileStem(frame.name).toLowerCase()}${frame.path ? `-${exportFileStem(frame.path)}` : ''}.png`;
        await put(file, shot.png);
        shots.push({ file, frame, width: shot.width, height: shot.height, cropped: shot.cropped });
      } catch (error) {
        console.error('[handoff] screenshot failed', error);
      }
    }
    const first = frames[0];
    if (first) {
      try {
        const inlined = await inlineHtml(deps.preview, opened.url, first, source.project.kind, deps.secrets);
        await put('design.html', inlined.html);
        designHtml = true;
      } catch (error) {
        console.error('[handoff] single-file HTML failed', error);
      }
    }
  } finally {
    await opened.release().catch(() => undefined);
  }

  return { shots, designHtml };
}

interface MarkdownInput {
  source: ExportSource;
  history: Version[];
  shots: ScreenShot[];
  designHtml: boolean;
  sourceMap: { name: string; bytes: number }[];
  fonts: { display: string; body: string; mono: string; googleFontsUrl?: string } | undefined;
  entries: CompiledTokenEntry[];
  names: TokenNames;
  filesRoot: string;
  canvas: CanvasFile | null;
}

function canvasSection(canvas: CanvasFile | null): string[] {
  if (!canvas || canvas.frames.length === 0) return ['No saved canvas layout.', ''];
  return [
    `\`source/${CANVAS_FILE}\` is the canvas layout: the frames the designer placed, in order.`,
    '',
    '| Frame | Label | Page | Size | Position |',
    '| --- | --- | --- | --- | --- |',
    ...canvas.frames.map((f) => `| ${f.id} | ${cell(f.label ?? '')} | ${f.path ? `\`${cell(f.path)}\`` : 'entry page'} | ${f.width} × ${f.height} | ${f.x}, ${f.y}${f.hidden ? ' (hidden)' : ''} |`),
    '',
  ];
}

async function handoffMarkdown(deps: HandoffDeps, input: MarkdownInput): Promise<string> {
  const { shots, designHtml, sourceMap, fonts } = input;
  const { project, direction, version } = input.source;
  const components = await listComponents(input.filesRoot, project.kind).catch(() => [] as ComponentInfo[]);
  const comments = await deps.comments.list(project.id, direction.id).catch(() => [] as DesignComment[]);
  const lineage = versionAncestors(input.history, version);
  const { brief, changes } = intent(lineage);
  const decisions = lineage.slice(0, MAX_DECISIONS).map((v) => `- ${new Date(v.createdAt).toISOString().slice(0, 10)} · ${cell(v.name ?? v.title)}${v.meta.kind !== 'run' ? ` (${v.meta.kind})` : ''}`);
  const entry = project.entry || 'index.html';
  const run = project.kind === 'react' ? 'cd source\nnpm install\nnpm run dev' : `open source/${entry}`;

  return [
    `# ${project.name}: design handoff`,
    '',
    `Version \`${version.id}\` of direction "${direction.name}", saved ${new Date(version.createdAt).toISOString()}. Kind: ${project.kind === 'react' ? 'React (Vite)' : 'static HTML'}.`,
    '',
    'This folder is the full spec for a coding agent. Build the design in the target codebase so it matches `screens/` and uses the tokens below.',
    '',
    '## Intent',
    '',
    brief ? quote(brief) : 'No brief was saved with this version.',
    '',
    ...(changes.length > 0 ? ['Changes asked for after the first version:', '', ...changes.map((c) => `- ${cell(c)}`), ''] : []),
    '## Decisions',
    '',
    'Newest first. Each line is a saved version.',
    '',
    ...decisions,
    '',
    '## Design tokens',
    '',
    ...(fonts ? [`Fonts: display ${fonts.display}, body ${fonts.body}, mono ${fonts.mono}.${fonts.googleFontsUrl ? ` Google Fonts: ${fonts.googleFontsUrl}` : ''}`, ''] : []),
    tokenTable(input.entries, input.names),
    '## Components',
    '',
    componentList(components),
    '## Screens',
    '',
    ...(shots.length > 0 ? shots.map((s) => `- \`${s.file}\`: ${s.frame.name}${s.frame.path ? ` (/${s.frame.path})` : ''}, ${s.frame.width} px viewport, ${s.width} × ${s.height} px${s.cropped ? ', cut at the bottom' : ''}`) : ['No screenshots.']),
    ...(designHtml ? ['', '`design.html` is the first screen as one self-contained file. Open it in a browser to inspect styles.'] : []),
    '',
    '## Canvas',
    '',
    ...canvasSection(input.canvas),
    '## Open comments',
    '',
    commentList(comments),
    '## File map',
    '',
    '| File | Role | Size |',
    '| --- | --- | --- |',
    ...sourceMap.map((f) => `| \`source/${f.name}\` | ${role(f.name, entry)} | ${size(f.bytes)} |`),
    '',
    '## Run the design',
    '',
    '```sh',
    run,
    '```',
    '',
    '## Rules for the build',
    '',
    '- Match the screens at each viewport width. Check desktop and mobile.',
    '- Use the token variables for color, type, space and radius. Add a token before you add a raw value.',
    '- Keep the semantic HTML and the text content as they are.',
    '- Resolve the open comments, or say why not.',
    '',
  ].join('\n');
}

async function appTokensForHandoff(source: ExportSource, root: string): Promise<LoadedAppTokens | null> {
  if (!usesAppTokens(source.project)) return null;
  const file = await findTokenFile(source.direction.workTree).catch(() => null);
  return file ? readAppTokensAt(root, file).catch(() => null) : null;
}

async function handoffTokens(source: ExportSource, root: string, ds: Awaited<ReturnType<typeof readDesignSystemFiles>> | null, tokensJson: ZipEntry | undefined): Promise<{ entries: CompiledTokenEntry[]; names: TokenNames }> {
  const app = ds ? null : await appTokensForHandoff(source, root);
  const names: TokenNames = { appVars: appVarsOf(tokensJson ? tokensJson.data.toString('utf8') : null), appFile: app?.file ?? null };
  return { entries: ds?.entries ?? app?.entries ?? [], names };
}

export async function buildHandoff(deps: HandoffDeps, input: HandoffInput): Promise<HandoffResult> {
  const { source, frames } = input;
  const { project, version } = source;
  const root = await source.files();
  const folderName = `${exportFileStem(project.name)}-${version.id.slice(0, 8)}`;
  const outDir = path.join(handoffRoot(deps, project.id), folderName);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const written: Written[] = [];
  const put = async (name: string, data: Buffer | string): Promise<void> => {
    const target = path.join(outDir, ...name.split('/'));
    if (!target.startsWith(outDir + path.sep)) return;
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
    written.push({ name, bytes: typeof data === 'string' ? Buffer.byteLength(data) : data.length });
  };

  const sourceEntries: ZipEntry[] = [];
  await walk(root, '', sourceEntries, SKIP_SOURCE);
  if (sourceEntries.reduce((sum, entry) => sum + entry.data.length, 0) > MAX_SOURCE_BYTES) throw new Error('the project is too large for a handoff bundle');
  const canvasText = await readFile(path.join(root, ...CANVAS_FILE.split('/')), 'utf8').catch(() => null);
  const canvas = canvasText === null ? null : parseCanvasText(canvasText);
  if (canvasText !== null && canvas) sourceEntries.push({ name: CANVAS_FILE, data: Buffer.from(canvasText) });
  for (const entry of sourceEntries) await put(`source/${entry.name}`, entry.data);
  const sourceMap = sourceEntries.map((entry) => ({ name: entry.name, bytes: entry.data.length })).sort((a, b) => a.name.localeCompare(b.name));

  const ds = await readDesignSystemFiles(root).catch(() => null);
  const tokensJson = sourceEntries.find((e) => e.name === TOKENS_FILE);
  const tokensCss = ds?.css ?? sourceEntries.find((e) => e.name === TOKENS_CSS_FILE)?.data.toString('utf8') ?? null;
  if (tokensCss) await put('tokens.css', tokensCss);
  if (tokensJson) await put('tokens.json', tokensJson.data);
  const designMd = await readFile(path.join(root, DESIGN_MD_FILE), 'utf8').catch(() => null);
  if (designMd) await put('DESIGN.md', designMd);

  const { shots, designHtml } = await captureScreens(deps, source, frames, put);

  const tokens = await handoffTokens(source, root, ds, tokensJson);
  const md = await handoffMarkdown(deps, { source, history: input.history, shots, designHtml, sourceMap, fonts: ds?.manifest?.fonts, ...tokens, filesRoot: root, canvas });
  await put('HANDOFF.md', md);

  const prompt = `Read ${path.join(outDir, 'HANDOFF.md')} and build this design in this codebase. The source is in ${path.join(outDir, 'source')}, the target screens are in ${path.join(outDir, 'screens')}, and tokens.css has the design tokens. Match the screens and use the tokens.`;
  return { path: outDir, files: written.map((w) => w.name).sort(), prompt, versionId: version.id };
}

async function walk(dir: string, prefix: string, out: ZipEntry[], skip: Set<string> = new Set()): Promise<void> {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (skip.has(item.name)) continue;
    const full = path.join(dir, item.name);
    const name = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) await walk(full, name, out, skip);
    else if (item.isFile()) out.push({ name, data: await readFile(full) });
  }
}

export async function zipHandoff(deps: ExportDeps, projectId: string, folder: string): Promise<{ name: string; bytes: Buffer }> {
  const rootDir = handoffRoot(deps, projectId);
  const target = path.resolve(rootDir, folder);
  if (path.dirname(target) !== rootDir || !(await stat(target).catch(() => null))?.isDirectory()) throw new Error('handoff folder not found');
  const entries: ZipEntry[] = [];
  await walk(target, path.basename(target), entries);
  return { name: `${path.basename(target)}-handoff.zip`, bytes: zipFiles(entries) };
}
