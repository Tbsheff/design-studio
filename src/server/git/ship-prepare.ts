import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, readlink, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Direction, Project, RunSummary } from '../../shared/contracts.js';
import { PRIVATE_KEY_PATTERN, refusedPath, renderBranchName, renderShipTemplate, type ShipBaseOption, type ShipFile, type ShipFileStatus, type ShipPrepare, type ShipRecord, type ShipRepoInfo, type ShipSettings, type ShipTemplateVars } from '../../shared/ship.js';
import { runGit, runGitBuffer, type GitScope } from '../store/versions.js';
import { readShipState } from './ship-store.js';
import { findOnPath, userGit } from './user-git.js';

const DIFF_FILE_MAX = 40 * 1024;
const DIFF_TOTAL_MAX = 400 * 1024;
const SCAN_MAX = 2 * 1024 * 1024;
const FILES_MAX = 500;
const BASES_MAX = 40;
const SUMMARY_MAX = 600;
const RUNS_SCANNED = 60;

export interface ShipContext {
  projectDir: string;
  project: Project;
}

export interface TreeEntry {
  mode: string;
  sha: string;
}

interface ShadowVersion {
  id: string;
  parentId: string | null;
  title: string;
  at: number;
}

export const literal = (file: string) => `:(literal)${file}`;

const scopeOf = (ctx: ShipContext): GitScope => ({ gitDir: path.join(ctx.projectDir, 'git') });

export function mainOf(project: Project): Direction | null {
  return project.directions.find((d) => d.id === 'main') ?? project.directions[0] ?? null;
}

function splitNul(text: string): string[] {
  return text.split('\0').filter((entry) => entry !== '');
}

export function parseTree(stdout: string): Map<string, TreeEntry> {
  const entries = new Map<string, TreeEntry>();
  for (const record of splitNul(stdout)) {
    const tab = record.indexOf('\t');
    const [mode = '', , sha = ''] = record.slice(0, tab).split(' ');
    entries.set(record.slice(tab + 1), { mode, sha });
  }
  return entries;
}

function parseIndex(stdout: string): Map<string, TreeEntry> {
  const entries = new Map<string, TreeEntry>();
  for (const record of splitNul(stdout)) {
    const tab = record.indexOf('\t');
    const [mode = '', sha = '', stage = '0'] = record.slice(0, tab).split(' ');
    const file = record.slice(tab + 1);
    entries.set(file, stage === '0' && !entries.has(file) ? { mode, sha } : { mode, sha: 'conflicted' });
  }
  return entries;
}

export function blobSha(bytes: Uint8Array): string {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

async function diskSha(file: string): Promise<string | null> {
  const info = await lstat(file).catch(() => null);
  if (!info) return null;
  if (info.isSymbolicLink()) return blobSha(Buffer.from(await readlink(file)));
  if (!info.isFile()) return 'not-a-file';
  return blobSha(await readFile(file));
}

export async function shadowTree(ctx: ShipContext, commit: string, files: string[]): Promise<Map<string, TreeEntry>> {
  if (files.length === 0) return new Map();
  const { stdout } = await runGit(scopeOf(ctx), ['ls-tree', '-z', '--full-tree', commit, '--', ...files.map(literal)]);
  return parseTree(stdout);
}

export async function shadowBlob(ctx: ShipContext, sha: string): Promise<Uint8Array> {
  return runGitBuffer(scopeOf(ctx), ['cat-file', 'blob', sha]);
}

async function shadowVersions(ctx: ShipContext, head: string): Promise<ShadowVersion[]> {
  const { stdout } = await runGit(scopeOf(ctx), ['log', '--first-parent', '--format=%H%x1f%P%x1f%ct%x1f%s%x1e', head]);
  const names = await readFile(path.join(ctx.projectDir, 'version-names.json'), 'utf8')
    .then((text) => JSON.parse(text) as Record<string, string>)
    .catch(() => ({}) as Record<string, string>);
  return stdout
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [id = '', parents = '', at = '0', title = ''] = record.split('\x1f');
      const named = names[id];
      return { id, parentId: parents.split(' ').filter(Boolean)[0] ?? null, title: typeof named === 'string' ? named : title, at: Number(at) * 1000 };
    });
}

export async function repoInfo(workTree: string): Promise<{ repo: ShipRepoInfo | null; blocked: string | null }> {
  const top = await userGit(workTree, ['rev-parse', '--show-toplevel', '--show-prefix'], { allowFail: true }).catch(() => null);
  if (!top || top.code !== 0) return { repo: null, blocked: 'This app folder is not in a git repository, so there is nothing to ship to.' };
  const [root = '', prefix = ''] = top.stdout.split('\n');
  const headOut = await userGit(root, ['rev-parse', '--verify', '-q', 'HEAD^{commit}'], { allowFail: true });
  const head = headOut.stdout.trim();
  if (headOut.code !== 0 || !/^[0-9a-f]{40,64}$/.test(head)) return { repo: null, blocked: 'The repository has no commits yet. Make a first commit, then ship.' };
  const branchOut = await userGit(root, ['symbolic-ref', '--short', '-q', 'HEAD'], { allowFail: true });
  const branch = branchOut.code === 0 ? branchOut.stdout.trim() || null : null;
  const remotes = (await userGit(root, ['remote'], { allowFail: true })).stdout.split('\n').map((r) => r.trim()).filter(Boolean);
  const tracked = branch ? (await userGit(root, ['config', '--get', `branch.${branch}.remote`], { allowFail: true })).stdout.trim() : '';
  const remote = remotes.includes(tracked) ? tracked : remotes.includes('origin') ? 'origin' : (remotes[0] ?? null);
  const remoteUrl = remote ? (await userGit(root, ['config', '--get', `remote.${remote}.url`], { allowFail: true })).stdout.trim() || null : null;
  const github = remoteUrl !== null && /(^|[@/.])github\.com[:/]/i.test(remoteUrl);
  return { repo: { root, prefix: prefix.trim(), branch, head, remote, remoteUrl, github, gh: (await findOnPath('gh')) !== null }, blocked: null };
}

async function defaultUser(root: string): Promise<string> {
  const email = (await userGit(root, ['config', '--get', 'user.email'], { allowFail: true }).catch(() => null))?.stdout.trim() ?? '';
  const raw = email.split('@')[0] || os.userInfo().username;
  return raw.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(0, 40);
}

async function chatSummary(ctx: ShipContext, versionIds: Set<string>): Promise<string> {
  const dir = path.join(ctx.projectDir, 'runs');
  const names = (await readdir(dir).catch(() => [] as string[])).filter((name) => name.endsWith('.json'));
  const dated = await Promise.all(names.map(async (name) => ({ name, at: (await stat(path.join(dir, name)).catch(() => null))?.mtimeMs ?? 0 })));
  for (const { name } of dated.sort((a, b) => b.at - a.at).slice(0, RUNS_SCANNED)) {
    const run = await readFile(path.join(dir, name), 'utf8')
      .then((text) => JSON.parse(text) as Partial<RunSummary>)
      .catch(() => null);
    if (!run?.versionId || !versionIds.has(run.versionId) || typeof run.finalText !== 'string') continue;
    const text = run.finalText.split(/\n\s*\n/).map((part) => part.trim()).find((part) => part && !part.startsWith('#')) ?? '';
    if (text) return text.length > SUMMARY_MAX ? `${text.slice(0, SUMMARY_MAX - 1)}…` : text;
  }
  return '';
}

function statusOf(letter: string): ShipFileStatus {
  if (letter === 'A') return 'added';
  if (letter === 'D') return 'deleted';
  return 'modified';
}

export interface FileCheckInput {
  ctx: ShipContext;
  repo: ShipRepoInfo;
  workTree: string;
  base: string;
  head: string;
  files: string[];
}

export interface FileCheck {
  refused: Map<string, string>;
  conflicts: Map<string, string>;
  headTree: Map<string, TreeEntry>;
}

async function refusal(ctx: ShipContext, file: string, repoPath: string, studio: TreeEntry | null): Promise<string | null> {
  if (file.startsWith('.studio/')) return 'Studio canvas data. It stays out of your repo.';
  const rule = refusedPath(repoPath);
  if (rule) return rule;
  if (studio?.mode === '160000') return 'Submodules are not shipped.';
  if (!studio) return null;
  const bytes = await shadowBlob(ctx, studio.sha);
  return bytes.length <= SCAN_MAX && PRIVATE_KEY_PATTERN.test(Buffer.from(bytes).toString('latin1')) ? 'The file has a private key in it.' : null;
}

interface Copies {
  disk: string | null;
  studio: string | null;
  staged: string | null;
  committed: string | null;
  base: string | null;
}

function conflictOf(copies: Copies): string | null {
  if (copies.disk !== copies.studio) return 'The file on disk changed after the newest studio version. Save it as a version (Keep) or undo that change first.';
  if (copies.staged !== copies.committed) return 'The file has staged changes in your repo. Commit or unstage them first.';
  if (copies.committed !== copies.base) return "Your checked-out commit has a different copy of this file than the studio base, so the branch would hold changes that are not the studio's (edits made before the base, or a commit after it). Pick a newer base or commit those changes first.";
  return null;
}

async function userCopies(repo: ShipRepoInfo, repoPaths: string[]): Promise<[Map<string, TreeEntry>, Map<string, TreeEntry>]> {
  if (repoPaths.length === 0) return [new Map(), new Map()];
  return Promise.all([
    userGit(repo.root, ['ls-tree', '-z', '--full-tree', repo.head, '--', ...repoPaths.map(literal)]).then((r) => parseTree(r.stdout)),
    userGit(repo.root, ['ls-files', '-s', '-z', '--', ...repoPaths.map(literal)]).then((r) => parseIndex(r.stdout)),
  ]);
}

export async function checkFiles(input: FileCheckInput): Promise<FileCheck> {
  const { ctx, repo, workTree, base, head, files } = input;
  const refused = new Map<string, string>();
  const conflicts = new Map<string, string>();
  const [baseTree, headTree] = await Promise.all([shadowTree(ctx, base, files), shadowTree(ctx, head, files)]);
  const [userHead, userIndex] = await userCopies(repo, files.map((file) => `${repo.prefix}${file}`));
  for (const file of files) {
    const repoPath = `${repo.prefix}${file}`;
    const studio = headTree.get(file) ?? null;
    const refusedWhy = await refusal(ctx, file, repoPath, studio);
    if (refusedWhy) refused.set(file, refusedWhy);
    const conflict = conflictOf({ disk: await diskSha(path.join(workTree, file)), studio: studio?.sha ?? null, staged: userIndex.get(repoPath)?.sha ?? null, committed: userHead.get(repoPath)?.sha ?? null, base: baseTree.get(file)?.sha ?? null });
    if (conflict) conflicts.set(file, conflict);
  }
  return { refused, conflicts, headTree };
}

async function changedFiles(ctx: ShipContext, base: string, head: string): Promise<{ file: string; status: ShipFileStatus; additions: number | null; deletions: number | null }[]> {
  const scope = scopeOf(ctx);
  const [names, counts] = await Promise.all([runGit(scope, ['diff', '--no-renames', '--name-status', '-z', base, head]), runGit(scope, ['diff', '--no-renames', '--numstat', '-z', base, head])]);
  const stats = new Map<string, { additions: number | null; deletions: number | null }>();
  for (const record of splitNul(counts.stdout)) {
    const [add = '-', del = '-', file = ''] = record.split('\t');
    stats.set(file, { additions: add === '-' ? null : Number(add), deletions: del === '-' ? null : Number(del) });
  }
  const parts = splitNul(names.stdout);
  const result: { file: string; status: ShipFileStatus; additions: number | null; deletions: number | null }[] = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const file = parts[i + 1] ?? '';
    result.push({ file, status: statusOf((parts[i] ?? 'M').charAt(0)), ...(stats.get(file) ?? { additions: null, deletions: null }) });
  }
  return result.slice(0, FILES_MAX);
}

async function fileDiff(ctx: ShipContext, base: string, head: string, file: string): Promise<string> {
  const { stdout } = await runGit(scopeOf(ctx), ['diff', '--no-color', '--no-renames', '--no-ext-diff', '-U3', base, head, '--', literal(file)]);
  return stdout;
}

function baseOptions(versions: ShadowVersion[], history: ShipRecord[]): ShipBaseOption[] {
  const known = new Set(versions.map((v) => v.id));
  const root = versions.find((v) => v.parentId === null) ?? versions[versions.length - 1];
  const lastShip = [...history].reverse().find((record) => known.has(record.versionId));
  const options: ShipBaseOption[] = [];
  if (lastShip) {
    const version = versions.find((v) => v.id === lastShip.versionId);
    options.push({ versionId: lastShip.versionId, title: `Last ship: ${lastShip.branch}`, at: version?.at ?? lastShip.at, kind: 'last-ship' });
  }
  if (root && root.id !== lastShip?.versionId) options.push({ versionId: root.id, title: `When attached: ${root.title}`, at: root.at, kind: 'attached' });
  for (const version of versions.slice(1, BASES_MAX)) {
    if (!options.some((option) => option.versionId === version.id)) options.push({ versionId: version.id, title: version.title, at: version.at, kind: 'version' });
  }
  return options;
}

function emptyPrepare(project: Project, settings: ShipSettings, history: ShipRecord[], blocked: string, repo: ShipRepoInfo | null = null): ShipPrepare {
  return { projectId: project.id, repo, blocked, base: null, bases: [], headVersionId: null, files: [], versions: [], summary: '', settings, defaults: { branch: '', title: '', commitMessage: '', body: '' }, vars: { user: settings.user, issue: settings.issueId, title: '', summary: '', versions: [], files: [] }, history };
}

export async function prepareShip(ctx: ShipContext, baseVersionId?: string): Promise<ShipPrepare> {
  const { project } = ctx;
  const { settings, history } = await readShipState(ctx.projectDir);
  if (!project.app) return emptyPrepare(project, settings, history, 'Ship works for attached app projects only.');
  const main = mainOf(project);
  if (!main?.headVersionId) return emptyPrepare(project, settings, history, 'The project has no versions yet.');
  const { repo, blocked } = await repoInfo(main.workTree);
  if (!repo) return emptyPrepare(project, settings, history, blocked ?? 'No git repository.');
  const head = main.headVersionId;
  const versions = await shadowVersions(ctx, head);
  const bases = baseOptions(versions, history);
  const base = (baseVersionId ? bases.find((option) => option.versionId === baseVersionId) : bases[0]) ?? null;
  if (!base) return { ...emptyPrepare(project, settings, history, baseVersionId ? 'That base version is not in the history of this project.' : 'There is no older version to compare with.', repo), bases, headVersionId: head };
  const span = versions.slice(0, versions.findIndex((v) => v.id === base.versionId));
  const files = await shipFiles(ctx, repo, main.workTree, base.versionId, head);
  const titles = [...new Set(span.map((v) => v.title).reverse())];
  const summary = await chatSummary(ctx, new Set(span.map((v) => v.id)));
  const title = span[0]?.title ?? project.name;
  const vars: ShipTemplateVars = { user: settings.user || (await defaultUser(repo.root)), issue: settings.issueId, title, summary, versions: titles, files: files.filter((f) => !f.refused).map((f) => f.path) };
  const commitMessage = titles.length > 1 ? `${title}\n\n${titles.map((t) => `- ${t}`).join('\n')}` : title;
  return {
    projectId: project.id,
    repo,
    blocked: files.length === 0 ? 'There are no studio changes since this base.' : null,
    base,
    bases,
    headVersionId: head,
    files,
    versions: span.map((v) => ({ id: v.id, title: v.title })),
    summary,
    settings,
    defaults: { branch: renderBranchName(settings.branchTemplate, vars), title, commitMessage, body: renderShipTemplate(settings.bodyTemplate, vars) },
    vars,
    history,
  };
}

async function shipFiles(ctx: ShipContext, repo: ShipRepoInfo, workTree: string, base: string, head: string): Promise<ShipFile[]> {
  const changed = base === head ? [] : await changedFiles(ctx, base, head);
  const check = await checkFiles({ ctx, repo, workTree, base, head, files: changed.map((c) => c.file) });
  let budget = DIFF_TOTAL_MAX;
  const files: ShipFile[] = [];
  for (const item of changed) {
    const full = budget > 0 ? await fileDiff(ctx, base, head, item.file) : '';
    const diff = full.slice(0, DIFF_FILE_MAX);
    budget -= diff.length;
    files.push({ path: `${repo.prefix}${item.file}`, status: item.status, additions: item.additions, deletions: item.deletions, diff, diffCut: budget <= 0 || full.length > DIFF_FILE_MAX, refused: check.refused.get(item.file) ?? null, conflict: check.conflicts.get(item.file) ?? null });
  }
  return files;
}
