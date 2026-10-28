import { randomBytes } from 'node:crypto';
import { chmod, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SHIP_TEXT_MAX, cleanBranchName, type ShipFormatResult, type ShipPrepare, type ShipRepoInfo, type ShipRequest, type ShipResult } from '../../shared/ship.js';
import { BadRequestError, ConflictError } from '../store/errors.js';
import { createKeyedMutex } from '../store/mutex.js';
import { literal, mainOf, prepareShip, repoInfo, shadowBlob, shadowTree, type ShipContext, type TreeEntry } from './ship-prepare.js';
import { detectShipFormat, emptyFormatResult, formatText, type ShipFormatter } from './ship-format.js';
import { addShipRecord } from './ship-store.js';
import { NETWORK_TIMEOUT_MS, WRITE_TIMEOUT_MS, execTool, findOnPath, userGit } from './user-git.js';

const shipLock = createKeyedMutex();
const PR_URL = /https?:\/\/\S+/g;

export interface ShipDeps extends ShipContext {
  dataDir: string;
  running: boolean;
}

function checkText(value: string, max: number, label: string): string {
  if (value.length > max) throw new BadRequestError(`${label} must be ${max} characters or fewer`);
  return value;
}

async function validBranch(root: string, raw: string): Promise<string> {
  const cleaned = cleanBranchName(checkText(raw.trim(), SHIP_TEXT_MAX.branch, 'branch'));
  if (!cleaned || cleaned !== raw.trim()) throw new BadRequestError(`Branch name "${raw.trim()}" is not valid. Try "${cleaned || 'studio/change'}".`);
  const format = await userGit(root, ['check-ref-format', '--branch', cleaned], { allowFail: true });
  if (format.code !== 0) throw new BadRequestError(`Branch name "${cleaned}" is not valid in git.`);
  const exists = await userGit(root, ['show-ref', '--verify', '--quiet', `refs/heads/${cleaned}`], { allowFail: true });
  if (exists.code === 0) throw new ConflictError(`A branch named ${cleaned} already exists in your repo. Pick another name.`);
  return cleaned;
}

async function writeEntry(target: string, mode: string, bytes: Uint8Array): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  if (mode === '120000') {
    await symlink(Buffer.from(bytes).toString('utf8'), target);
    return;
  }
  await writeFile(target, bytes);
  if (mode === '100755') await chmod(target, 0o755);
}

async function openPullRequest(root: string, request: ShipRequest, branch: string, baseBranch: string | null, scratch: string): Promise<{ prUrl: string | null; prError: string | null }> {
  const gh = await findOnPath('gh');
  if (!gh) return { prUrl: null, prError: 'gh is not installed, so no pull request was opened. The branch is pushed.' };
  const bodyFile = path.join(scratch, `pr-body-${randomBytes(4).toString('hex')}.md`);
  await writeFile(bodyFile, request.body);
  try {
    const args = ['pr', 'create', '--head', branch, '--title', request.title, '--body-file', bodyFile, ...(baseBranch ? ['--base', baseBranch] : [])];
    const out = await execTool(gh, args, { cwd: root, timeoutMs: NETWORK_TIMEOUT_MS, allowFail: true });
    const url = [...`${out.stdout}\n${out.stderr}`.matchAll(PR_URL)].map((m) => m[0]).pop() ?? null;
    if (out.code !== 0) return { prUrl: url, prError: `gh pr create failed: ${out.stderr.split('\n').slice(-2).join(' ') || `exit ${out.code}`}` };
    return { prUrl: url, prError: url ? null : 'gh did not print a pull request URL.' };
  } finally {
    await rm(bodyFile, { force: true });
  }
}

interface Commit {
  repo: ShipRepoInfo;
  branch: string;
  files: string[];
  headTree: Map<string, TreeEntry>;
  message: string;
  scratch: string;
  hooksOff: string[];
  formatter: ShipFormatter;
  format: ShipFormatResult;
}

const FORMAT_DIFF_MAX = 6000;

async function formatStaged(commit: Commit, dir: string, repoPath: string, bytes: Uint8Array): Promise<void> {
  const text = Buffer.from(bytes).toString('utf8');
  const formatted = await formatText(commit.formatter, commit.repo.root, repoPath, text).catch((error: unknown) => {
    commit.format.errors.push({ path: repoPath, message: error instanceof Error ? error.message : String(error) });
    return null;
  });
  if (formatted === null || formatted === text) return;
  await writeFile(path.join(dir, repoPath), formatted);
  const diff = (await userGit(dir, ['diff', '--no-color', '--no-ext-diff', '--', literal(repoPath)], { allowFail: true })).stdout;
  commit.format.formatted.push({ path: repoPath, diff: diff.length > FORMAT_DIFF_MAX ? `${diff.slice(0, FORMAT_DIFF_MAX)}\n[diff cut]` : diff });
}

async function stageFiles(deps: ShipDeps, commit: Commit, dir: string): Promise<void> {
  const { repo, files, headTree } = commit;
  const added: string[] = [];
  const removed: string[] = [];
  for (const file of files) {
    const entry = headTree.get(file);
    const repoPath = `${repo.prefix}${file}`;
    if (entry) {
      await writeEntry(path.join(dir, repoPath), entry.mode, await shadowBlob(deps, entry.sha));
      added.push(repoPath);
    } else removed.push(repoPath);
  }
  if (added.length > 0) await userGit(dir, ['add', '--', ...added.map(literal)], { timeoutMs: WRITE_TIMEOUT_MS });
  for (const repoPath of added) {
    const entry = headTree.get(repoPath.slice(repo.prefix.length));
    if (entry && entry.mode !== '120000') await formatStaged(commit, dir, repoPath, await shadowBlob(deps, entry.sha));
  }
  const reformatted = commit.format.formatted.map((item) => item.path);
  if (reformatted.length > 0) await userGit(dir, ['add', '--', ...reformatted.map(literal)], { timeoutMs: WRITE_TIMEOUT_MS });
  if (removed.length > 0) await userGit(dir, ['rm', '--cached', '--quiet', '--', ...removed.map(literal)], { timeoutMs: WRITE_TIMEOUT_MS });
}

async function commitOnBranch(deps: ShipDeps, commit: Commit): Promise<string> {
  const { repo, branch, hooksOff } = commit;
  const dir = path.join(commit.scratch, `${deps.project.id}-${randomBytes(5).toString('hex')}`);
  let branchMade = false;
  try {
    await userGit(repo.root, [...hooksOff, 'worktree', 'add', '--no-checkout', '-b', branch, dir, repo.head], { timeoutMs: WRITE_TIMEOUT_MS });
    branchMade = true;
    await userGit(dir, ['read-tree', repo.head], { timeoutMs: WRITE_TIMEOUT_MS });
    await stageFiles(deps, commit, dir);
    await userGit(dir, [...hooksOff, 'commit', '--no-verify', '--quiet', '-F', '-'], { timeoutMs: WRITE_TIMEOUT_MS, input: `${commit.message}\n` });
    return (await userGit(dir, ['rev-parse', 'HEAD'])).stdout.trim();
  } catch (error) {
    if (branchMade) await userGit(repo.root, ['update-ref', '-d', `refs/heads/${branch}`, repo.head], { allowFail: true }).catch(() => undefined);
    throw error;
  } finally {
    const removed = await userGit(repo.root, [...hooksOff, 'worktree', 'remove', '--force', dir], { allowFail: true }).catch(() => null);
    if (removed?.code !== 0) {
      await rm(dir, { recursive: true, force: true });
      await userGit(repo.root, ['worktree', 'prune'], { allowFail: true }).catch(() => undefined);
    }
  }
}

async function publish(request: ShipRequest, commit: Commit, sha: string): Promise<{ pushed: boolean; prUrl: string | null; prError: string | null }> {
  const { repo, branch } = commit;
  if (request.mode === 'branch' || !repo.remote) return { pushed: false, prUrl: null, prError: null };
  await userGit(repo.root, [...commit.hooksOff, 'push', '--no-verify', '--porcelain', repo.remote, `refs/heads/${branch}:refs/heads/${branch}`], { timeoutMs: NETWORK_TIMEOUT_MS }).catch((error: unknown) => {
    throw new ConflictError(`The branch ${branch} is committed (${sha.slice(0, 7)}) but the push failed. ${error instanceof Error ? error.message : String(error)}`);
  });
  if (request.mode !== 'pr') return { pushed: true, prUrl: null, prError: null };
  const tracked = repo.branch ? await userGit(repo.root, ['rev-parse', '--verify', '-q', `refs/remotes/${repo.remote}/${repo.branch}`], { allowFail: true }) : null;
  return { pushed: true, ...(await openPullRequest(repo.root, request, branch, tracked?.code === 0 ? repo.branch : null, commit.scratch)) };
}

function checkPlan(prepared: ShipPrepare, request: ShipRequest, repo: ShipRepoInfo): string[] {
  if (!prepared.base || prepared.base.versionId !== request.baseVersionId) throw new BadRequestError('That base version is not in the history of this project.');
  if (prepared.headVersionId !== request.headVersionId) throw new ConflictError('The design changed since you opened Ship. Review the files again.');
  if (request.mode !== 'branch' && !repo.remote) throw new BadRequestError('The repo has no remote, so the branch cannot be pushed. Use Branch only.');
  if (request.mode === 'pr' && !(repo.github && repo.gh)) throw new BadRequestError(repo.gh ? 'The remote is not on GitHub, so gh cannot open a pull request.' : 'gh is not installed, so the studio cannot open a pull request.');
  const byPath = new Map(prepared.files.map((file) => [file.path, file]));
  const picked = [...new Set(request.files)];
  if (picked.length === 0) throw new BadRequestError('Pick at least one file to ship.');
  for (const file of picked) {
    const info = byPath.get(file);
    if (!info) throw new BadRequestError(`${file} has no studio change since the base.`);
    if (info.refused) throw new BadRequestError(`${file}: ${info.refused}`);
    if (info.conflict) throw new ConflictError(`${file}: ${info.conflict}`);
  }
  return picked;
}

function checkMessage(request: ShipRequest): string {
  const message = checkText(request.commitMessage.trim(), SHIP_TEXT_MAX.commitMessage, 'commit message');
  if (!message) throw new BadRequestError('The commit message is empty.');
  checkText(request.title, SHIP_TEXT_MAX.title, 'title');
  checkText(request.body, SHIP_TEXT_MAX.body, 'body');
  if (request.mode === 'pr' && !request.title.trim()) throw new BadRequestError('The pull request title is empty.');
  return message;
}

export async function ship(deps: ShipDeps, request: ShipRequest): Promise<ShipResult> {
  if (deps.running) throw new ConflictError('A studio run is editing this project. Ship when it finishes.');
  const main = mainOf(deps.project);
  if (!deps.project.app || !main) throw new BadRequestError('Ship works for attached app projects only.');
  const { repo, blocked } = await repoInfo(main.workTree);
  if (!repo) throw new BadRequestError(blocked ?? 'No git repository.');
  return shipLock(repo.root, async () => {
    const picked = checkPlan(await prepareShip(deps, request.baseVersionId), request, repo);
    const message = checkMessage(request);
    const branch = await validBranch(repo.root, request.branch);
    const files = picked.map((file) => file.slice(repo.prefix.length));
    const scratch = path.join(deps.dataDir, 'ship-worktrees');
    const noHooks = path.join(scratch, 'no-hooks');
    await mkdir(noHooks, { recursive: true });
    const formatter = await detectShipFormat(repo.root, repo.prefix);
    const commit: Commit = { repo, branch, files, headTree: await shadowTree(deps, request.headVersionId, files), message, scratch, hooksOff: ['-c', `core.hooksPath=${noHooks}`], formatter, format: emptyFormatResult(formatter) };
    const sha = await commitOnBranch(deps, commit);
    const { pushed, prUrl, prError } = await publish(request, commit, sha);
    await addShipRecord(deps.projectDir, { versionId: request.headVersionId, baseVersionId: request.baseVersionId, branch, sha, mode: request.mode, pushed, prUrl, files: picked.length, at: Date.now() });
    return { branch, sha, mode: request.mode, pushed, remote: pushed ? repo.remote : null, prUrl, prError, files: picked, format: commit.format };
  });
}
