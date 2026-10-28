import { z } from 'zod';
import { SHIP_TEXT_MAX, type ShipPrepare, type ShipResult } from '../../shared/ship.js';
import { approve, EditError, loadTarget, oneLine, short, studioCall, type EditDeps } from './edit-deps.js';
import { defineTool, ok, projectId } from './edit-kit.js';

const SHIP_NOTE = 'Ship works on an attached app project whose folder is in a git repository. The studio makes a new branch from the repo HEAD in a separate git worktree, so the checked-out branch, the working tree and the index of the user stay as they are. It never force pushes, and it never commits .env files, secrets or node_modules.';

const versionId = z.string().regex(/^[0-9a-f]{40,64}$/, 'must be a version id from prepare_ship').optional();

const prepareInput = z.object({ projectId, baseVersionId: versionId.describe('Base version id. Leave out for the last ship, or the version made when the app was attached.') }).strict();

const shipInput = z
  .object({
    projectId,
    baseVersionId: versionId.describe('Base version id from prepare_ship. Leave out for the default base.'),
    files: z.array(z.string().max(1000)).max(500).optional().describe('Repo-relative paths from prepare_ship. Leave out for every file that is not refused and has no conflict.'),
    branch: z.string().max(SHIP_TEXT_MAX.branch).optional().describe('Branch name. Leave out for the name from the project branch template.'),
    commitMessage: z.string().max(SHIP_TEXT_MAX.commitMessage).optional(),
    title: z.string().max(SHIP_TEXT_MAX.title).optional().describe('Pull request title.'),
    body: z.string().max(SHIP_TEXT_MAX.body).optional().describe('Pull request body. Leave out for the project body template.'),
    mode: z.enum(['branch', 'push', 'pr']).default('branch').describe('branch: commit on a new local branch only. push: also push it to the remote. pr: push and open a pull request with gh.'),
  })
  .strict();

async function prepared(deps: EditDeps, pid: string, base: string | undefined): Promise<ShipPrepare> {
  const { project } = await loadTarget(deps, pid);
  return studioCall<ShipPrepare>(deps, 'GET', `/api/projects/${encodeURIComponent(project.id)}/ship${base ? `?base=${base}` : ''}`);
}

function describe(plan: ShipPrepare): unknown {
  return {
    blocked: plan.blocked,
    repo: plan.repo ? { root: plan.repo.root, checkedOut: plan.repo.branch, head: plan.repo.head, remote: plan.repo.remote, github: plan.repo.github, gh: plan.repo.gh } : null,
    base: plan.base,
    otherBases: plan.bases.slice(0, 10).map((b) => ({ versionId: b.versionId, title: b.title })),
    headVersionId: plan.headVersionId,
    versions: plan.versions.map((v) => v.title),
    defaults: plan.defaults,
    files: plan.files.map((f) => ({ path: f.path, status: f.status, additions: f.additions, deletions: f.deletions, refused: f.refused, conflict: f.conflict, diff: short(f.diff, 6000) + (f.diffCut ? '\n[diff cut]' : '') })),
    note: SHIP_NOTE,
  };
}

const prepareShip = defineTool(
  'prepare_ship',
  prepareInput,
  { title: 'Prepare ship', description: `List the files the studio changed since a base version, with diffs, refused files, conflicts with the user's own changes, and the default branch name, commit message and pull request text. Read only. ${SHIP_NOTE}`, readOnly: true, idempotent: true },
  async (deps, input) => ({ result: ok(describe(await prepared(deps, input.projectId, input.baseVersionId))) }),
);

const ship = defineTool(
  'ship',
  shipInput,
  { title: 'Ship as branch or PR', description: `Commit studio changes to a new branch in the user's repo and, if asked, push it and open a pull request. The user must click Allow in Design Studio first; without the window open it is refused. Call prepare_ship first. ${SHIP_NOTE}` },
  async (deps, input, client) => {
    const plan = await prepared(deps, input.projectId, input.baseVersionId);
    if (plan.blocked || !plan.base || !plan.headVersionId || !plan.repo) throw new EditError(plan.blocked ?? 'Nothing to ship.');
    const files = input.files ?? plan.files.filter((f) => !f.refused && !f.conflict).map((f) => f.path);
    if (files.length === 0) throw new EditError('No file can be shipped. Call prepare_ship to see the refused files and conflicts.');
    const branch = input.branch ?? plan.defaults.branch;
    const title = input.title ?? plan.defaults.title;
    const doing = input.mode === 'pr' ? `push it to ${plan.repo.remote ?? 'the remote'} and open a pull request “${oneLine(title, 80)}”` : input.mode === 'push' ? `push it to ${plan.repo.remote ?? 'the remote'}` : 'keep it local (no push)';
    if (!deps.approvals.windowOpen()) throw new EditError('Design Studio is not open, so nobody can approve this ship. Ask the user to open the project in Design Studio, or to click Ship there.');
    await approve(deps, {
      tool: 'ship',
      action: 'Commit studio changes to a new branch in your repo',
      projectId: plan.projectId,
      client,
      title: `${client} wants to ship ${files.length} file${files.length === 1 ? '' : 's'} as branch ${oneLine(branch, 80)}`,
      detail: `Commit on a new branch from ${plan.repo.branch ?? plan.repo.head.slice(0, 7)} and ${doing}. Your checked-out branch and files do not change. Files: ${oneLine(files.join(', '), 300)}`,
    });
    const result = await studioCall<ShipResult>(deps, 'POST', `/api/projects/${encodeURIComponent(plan.projectId)}/ship`, {
      baseVersionId: plan.base.versionId,
      headVersionId: plan.headVersionId,
      files,
      branch,
      commitMessage: input.commitMessage ?? plan.defaults.commitMessage,
      title,
      body: input.body ?? plan.defaults.body,
      mode: input.mode,
      client,
    });
    return { result: ok(result) };
  },
);

export const SHIP_TOOLS = [prepareShip, ship];
