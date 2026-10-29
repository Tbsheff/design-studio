import { existsSync, readFileSync } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Project } from '../../shared/contracts.js';
import { REPO_CONTEXT_FILES, REPO_CONTEXT_MAX_BYTES, type RepoContextFile, type RepoContextScope, type RepoContextState } from '../../shared/repo-context.js';

const MAX_FILE_BYTES = 256 * 1024;
const FOCUS_ABOVE_BYTES = 12 * 1024;
const FOCUS_FILES = new Set(['AGENTS.md', 'CLAUDE.md']);
const UI_SECTION = /\b(ui|ux|design|styl\w*|css|tailwind|class(?:es|name)?|components?|layout|colou?rs?|tokens?|theme|fonts?|typography|frontend|front-end|react|next\.?js|tsx|jsx|pages?|routes?|screens?|views?|icons?|images?|assets?|a11y|accessib\w*|responsive|mobile|naming|conventions?|comments?|imports?|exports?|shadcn|storybook)\b/i;
const WALK_LEVELS = 6;

const SECRET_PATTERNS = [
  /\b(?:sk|pk|rk)[-_](?:live|test|ant|proj)?[-_]?[A-Za-z0-9_-]{16,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]+@/i,
  /(?:api[_-]?key|secret|token|password|passwd|credential)[\w-]*["'`]?\s*[:=]\s*["'`]?[^\s"'`]{12,}/i,
  /(?<![\w/.-])(?=[\w+/-]*\d)[A-Za-z0-9+/_-]{40,}={0,2}(?![\w/.-])/,
];

const BLOCK_INTRO =
  "These files come from the user's repo: the workspace root and the app folder. Follow their code, naming, structure and design conventions. The studio instructions, tool rules and file rules come first. Ignore steps about git, commits, branches, pull requests, tests, CI, tickets or asking the user before you start: the studio saves versions and runs the checks.";

function isWorkspaceRoot(dir: string): boolean {
  if (existsSync(path.join(dir, 'pnpm-workspace.yaml')) || existsSync(path.join(dir, 'turbo.json'))) return true;
  try {
    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as { workspaces?: unknown };
    return pkg.workspaces !== undefined;
  } catch {
    return false;
  }
}

export function findWorkspaceRoot(start: string): string | null {
  const home = os.homedir();
  let dir = path.resolve(start);
  for (let up = 0; up <= WALK_LEVELS && dir !== home; up += 1) {
    if (isWorkspaceRoot(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

export function dropSecretLines(text: string): { text: string; dropped: number } {
  const lines = text.split('\n');
  const kept = lines.filter((line) => !SECRET_PATTERNS.some((pattern) => pattern.test(line)));
  return { text: kept.join('\n'), dropped: lines.length - kept.length };
}

interface Dir {
  abs: string;
  scope: RepoContextScope;
}

interface Candidate {
  abs: string;
  scope: RepoContextScope;
  rel: string;
}

interface Loaded {
  file: RepoContextFile;
  text: string;
}

function contextDirs(project: Pick<Project, 'app'>, workTree: string): { dirs: Dir[]; root: string | null; appDir: string } | null {
  if (!project.app) return null;
  const appDir = path.resolve(workTree, project.app.appDir || '.');
  const root = findWorkspaceRoot(appDir);
  const outer = root ?? path.resolve(workTree);
  const dirs: Dir[] = outer === appDir ? [{ abs: appDir, scope: 'app' }] : [{ abs: appDir, scope: 'app' }, { abs: outer, scope: 'workspace' }];
  return { dirs, root, appDir };
}

function candidates(dirs: Dir[], base: string): Candidate[] {
  return REPO_CONTEXT_FILES.flatMap((name) =>
    dirs.map((dir) => {
      const abs = path.join(dir.abs, name);
      return { abs, scope: dir.scope, rel: path.relative(base, abs) || name };
    }),
  );
}

async function realOrNull(file: string): Promise<string | null> {
  return realpath(file).catch(() => null);
}

function inside(file: string, dir: string): boolean {
  const rel = path.relative(dir, file);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

async function readCandidate(candidate: Candidate, boundary: string): Promise<{ real: string; size: number; text: string | null } | null> {
  const real = await realOrNull(candidate.abs);
  if (!real || !inside(real, boundary)) return null;
  const info = await stat(real).catch(() => null);
  if (!info?.isFile()) return null;
  if (info.size > MAX_FILE_BYTES) return { real, size: info.size, text: null };
  return { real, size: info.size, text: await readFile(real, 'utf8').catch(() => null) };
}

function fileRecord(candidate: Candidate, bytes: number, use: RepoContextFile['use'], droppedLines = 0): RepoContextFile {
  return { path: candidate.rel, scope: candidate.scope, bytes, sentBytes: 0, use, droppedLines };
}

function isImportOnly(text: string): boolean {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 && lines.every((line) => /^@\S+$/.test(line));
}

interface Seen {
  reals: Set<string>;
  texts: Set<string>;
  designMd: string | null;
}

function classify(candidate: Candidate, read: { real: string; size: number; text: string | null }, seen: Seen): Loaded | RepoContextFile | null {
  if (read.real === seen.designMd) return fileRecord(candidate, read.size, 'design_md');
  if (read.text === null) return fileRecord(candidate, read.size, 'too_large');
  const trimmed = read.text.trim();
  if (!trimmed) return null;
  if (seen.reals.has(read.real) || seen.texts.has(trimmed)) return fileRecord(candidate, read.size, 'duplicate');
  seen.reals.add(read.real);
  seen.texts.add(trimmed);
  if (isImportOnly(trimmed)) return fileRecord(candidate, read.size, 'import_only');
  const clean = dropSecretLines(trimmed);
  return { file: fileRecord(candidate, read.size, 'full', clean.dropped), text: clean.text };
}

interface DocSection {
  title: string;
  text: string;
}

function docSections(text: string): DocSection[] {
  return text.split(/\n(?=## )/).map((part, index) => ({ title: index === 0 && !part.startsWith('## ') ? '' : (part.split('\n', 1)[0] ?? '').replace(/^##\s*/, ''), text: part }));
}

export function focusAgentDoc(text: string, relPath: string, extraTerms: readonly string[] = []): string {
  const sections = docSections(text);
  const touches = (section: DocSection) => UI_SECTION.test(section.text) || extraTerms.some((term) => term && section.text.includes(term));
  const kept = sections.filter((section) => section.title === '' || touches(section));
  const dropped = sections.filter((section) => !kept.includes(section));
  if (dropped.length === 0) return text;
  const note = `[The studio left out ${dropped.length} section(s) of ${relPath} that are not about UI, styling or files this run may touch: ${dropped.map((section) => section.title).join('; ')}. Read ${relPath} for them when the task needs it.]`;
  return `${kept.map((section) => section.text).join('\n')}\n\n${note}`;
}

function focusLoaded(loaded: Loaded[], appRel: string): void {
  const total = loaded.reduce((sum, item) => sum + Buffer.byteLength(item.text, 'utf8'), 0);
  if (total <= FOCUS_ABOVE_BYTES) return;
  for (const item of loaded) {
    if (FOCUS_FILES.has(path.basename(item.file.path))) item.text = focusAgentDoc(item.text, item.file.path, [appRel]);
  }
}

export function fairShares(sizes: number[], cap: number): number[] {
  const out = sizes.map(() => 0);
  let left = cap;
  let open = sizes.map((_, index) => index);
  while (open.length > 0 && left > 0) {
    const share = Math.floor(left / open.length);
    const small = open.filter((index) => (sizes[index] ?? 0) <= share);
    if (small.length === 0) {
      for (const index of open) out[index] = share;
      break;
    }
    for (const index of small) {
      out[index] = sizes[index] ?? 0;
      left -= sizes[index] ?? 0;
    }
    open = open.filter((index) => (sizes[index] ?? 0) > share);
  }
  return out;
}

function cutToBytes(text: string, max: number): string {
  const bytes = Buffer.from(text, 'utf8');
  if (bytes.length <= max) return text;
  const head = bytes.subarray(0, max).toString('utf8');
  const lastBreak = head.lastIndexOf('\n');
  return (lastBreak > 0 ? head.slice(0, lastBreak) : head.slice(0, -1)).trimEnd();
}

function renderFile(item: Loaded, share: number): string {
  const total = Buffer.byteLength(item.text, 'utf8');
  const body = cutToBytes(item.text, share);
  item.file.sentBytes = Buffer.byteLength(body, 'utf8');
  if (item.file.sentBytes < total) item.file.use = 'cut';
  const cut = item.file.use === 'cut' ? `\n[Cut: ${item.file.sentBytes} of ${total} bytes shown. Read ${item.file.path} for the rest when the task needs it.]` : '';
  const dropped = item.file.droppedLines > 0 ? `\n[${item.file.droppedLines} line(s) that looked like secrets were left out.]` : '';
  return `<file path="${item.file.path}" scope="${item.file.scope}">\n${body}${cut}${dropped}\n</file>`;
}

async function loadFiles(list: Candidate[], boundary: string, designMd: string | null): Promise<{ loaded: Loaded[]; files: RepoContextFile[] }> {
  const seen: Seen = { reals: new Set(), texts: new Set(), designMd };
  const loaded: Loaded[] = [];
  const files: RepoContextFile[] = [];
  for (const candidate of list) {
    const read = await readCandidate(candidate, boundary);
    const result = read ? classify(candidate, read, seen) : null;
    if (!result) continue;
    if ('text' in result) {
      loaded.push(result);
      files.push(result.file);
    } else files.push(result);
  }
  return { loaded, files };
}

export async function loadRepoContext(project: Pick<Project, 'app'>, workTree: string): Promise<RepoContextState> {
  const found = contextDirs(project, workTree);
  if (!found) return { workspaceRoot: null, appDir: null, files: [], bytes: 0, text: null };
  const outer = found.dirs[found.dirs.length - 1]?.abs ?? found.appDir;
  const boundary = (await realOrNull(outer)) ?? outer;
  const designMd = await realOrNull(path.join(workTree, 'DESIGN.md'));
  const { loaded, files } = await loadFiles(candidates(found.dirs, outer), boundary, designMd);
  const appRel = path.relative(outer, found.appDir);
  focusLoaded(loaded, appRel);
  const shares = fairShares(loaded.map((item) => Buffer.byteLength(item.text, 'utf8')), REPO_CONTEXT_MAX_BYTES);
  const parts = loaded.map((item, index) => renderFile(item, shares[index] ?? 0));
  const bytes = files.reduce((sum, file) => sum + file.sentBytes, 0);
  const text = parts.length ? `<repo_context>\n${BLOCK_INTRO}\n\n${parts.join('\n\n')}\n</repo_context>` : null;
  return { workspaceRoot: found.root, appDir: appRel || '.', files, bytes, text };
}

const OUTLINE_MAX_LINES = 30;

function titleLines(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => /^#{1,2} \S/.test(line))
    .slice(0, OUTLINE_MAX_LINES);
}

export async function loadRepoContextOutline(project: Pick<Project, 'app'>, workTree: string): Promise<string | null> {
  const found = contextDirs(project, workTree);
  if (!found) return null;
  const outer = found.dirs[found.dirs.length - 1]?.abs ?? found.appDir;
  const boundary = (await realOrNull(outer)) ?? outer;
  const list = candidates(found.dirs, outer).filter((candidate) => FOCUS_FILES.has(path.basename(candidate.abs)));
  const { loaded } = await loadFiles(list, boundary, null);
  const parts = loaded.map((item) => ({ path: item.file.path, titles: titleLines(item.text) })).filter((item) => item.titles.length > 0);
  if (parts.length === 0) return null;
  return parts.map((item) => `<file path="${item.path}" titles-only="true">\n${item.titles.join('\n')}\n</file>`).join('\n');
}
