import path from 'node:path';
import { z } from 'zod';
import type { DesignSystemDraftInfo, DesignSystemDraftResult, PackSummary, Project, SavePackResult } from '../../shared/contracts.js';
import { IMPROVE_IN_APP } from '../design-system/draft-live.js';
import { approve, EditError, loadTarget, oneLine, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
import { base, defineTool, ok, packId, projectId, versionActivity, type Done } from './edit-kit.js';
import { isInside, safeFolder } from './folders.js';
import { readTokensFileInput } from './tokens-file-input.js';
import { sameFolderOrRoot, workspaceFields, workspaceOf } from './workspace-tools.js';

const MAX_URLS = 3;

async function trustedFolder(deps: EditDeps, raw: string, client: string, ask: { tool: string; action: string; title: string; detail: string; projectId?: string }): Promise<string> {
  const folder = await safeFolder(raw, deps.dataDir);
  const projects = await safeFolder(await deps.projectsFolder(), deps.dataDir).catch(() => null);
  if (projects !== null && isInside(folder, projects)) return folder;
  await approve(deps, { tool: ask.tool, action: ask.action, projectId: ask.projectId ?? null, client, title: ask.title.replace('{folder}', oneLine(folder, 160)), detail: ask.detail });
  return folder;
}

function mainOf(project: Project): Project['directions'][number] | null {
  return project.directions.find((direction) => direction.id === 'main') ?? project.directions[0] ?? null;
}

const openFolder = defineTool(
  'open_folder',
  z.object({ path: z.string().trim().min(1).max(4096).describe('Absolute path (or ~/...) of a folder with an index.html, a Vite app, or an app with a token CSS file.') }).strict(),
  {
    title: 'Open folder as project',
    description: 'Open an existing folder as a Design Studio project, the same as Open folder on the studio Home. The studio then edits the files in that folder in place. The same folder rules as the studio apply, and system folders, the home folder itself and the studio data dir are refused. A folder outside the projects folder waits for the user to approve it in Design Studio. A folder that is already a project returns that project. A Next.js app folder inside a monorepo (pnpm-workspace.yaml, turbo.json or package.json workspaces) opens at the workspace root with that folder as appDir, so the shared kit, Tailwind CSS and root DESIGN.md are found; the result has workspaceRoot and appDir (workspaceRoot is null outside a monorepo).',
  },
  async (deps, input, client): Promise<Done> => {
    const workspace = await workspaceOf(await safeFolder(input.path, deps.dataDir));
    const scope = workspace ? `the ${workspace.name} monorepo at ${workspace.root}` : 'this folder';
    const folder = await trustedFolder(deps, input.path, client, { tool: 'open_folder', action: 'Open a folder as a project', title: `${client} wants to open {folder} as a project`, detail: `Design Studio and outside agents with Allow edits on can then change the files in ${scope}.` });
    const existing = (await deps.projects.list()).find((project) => !project.designSystemDeleted && sameFolderOrRoot(project, folder, workspace));
    if (existing) return { result: ok({ projectId: existing.id, directionId: mainOf(existing)?.id ?? null, name: existing.name, kind: existing.kind, folder, ...workspaceFields(existing, folder), alreadyOpen: true }) };
    const { project } = await studioCall<{ project: Project }>(deps, 'POST', '/api/projects/import', { path: folder });
    const main = mainOf(project);
    const result = ok({ projectId: project.id, directionId: main?.id ?? null, name: project.name, kind: project.kind, folder, ...workspaceFields(project, folder), alreadyOpen: false });
    return { result, activity: { projectId: project.id, directionId: main?.id ?? null, summary: `Opened folder ${oneLine(path.basename(folder), 60)}` } };
  },
);

const createSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional().describe('Name of the design system. Leave out to take it from the first source.'),
    mode: z.enum(['light', 'dark', 'auto']).default('auto'),
    basePackId: packId.optional().describe('Design system to fill gaps from. Leave out for the default.'),
    urls: z.array(z.string().trim().url().max(2000)).max(MAX_URLS).optional().describe('Up to 3 public website URLs to read colors, fonts and spacing from.'),
    brief: z.string().max(4000).optional().describe('A short text brief: brand, mood, audience.'),
    designMd: z.string().max(512 * 1024).optional().describe('DESIGN.md text to start from.'),
    folderPath: z.string().trim().min(1).max(4096).optional().describe('Absolute path of a code folder to read tokens from (CSS variables, Tailwind theme, next/font). A folder outside the projects folder waits for the user to approve it.'),
    tokensFile: z
      .string()
      .trim()
      .min(1)
      .max(4096)
      .optional()
      .describe('Absolute path of a tokens file (.json or .css, at most 2 MB): Figma variables JSON (REST /variables/local answer or a plugin export, Light and Dark modes), W3C DTCG, Tokens Studio, or CSS custom properties. Aliases stay token references. The studio does not connect to Figma and needs no Figma token. A file outside the projects folder waits for the user to approve it.'),
  })
  .strict()
  .refine((input) => (input.urls?.length ?? 0) > 0 || Boolean(input.brief?.trim()) || Boolean(input.designMd?.trim()) || Boolean(input.folderPath) || Boolean(input.tokensFile), 'pass at least one source: urls, brief, designMd, folderPath or tokensFile');

const createDesignSystem = defineTool(
  'create_design_system',
  createSchema,
  {
    title: 'Create design system draft',
    description: `Start a new design system draft from sources (websites, a brief, a DESIGN.md, a code folder, a tokens file such as a Figma variables export), the same as New design system in the studio. It answers at once with the draft project; the sources are read in the background. Poll design_system_status until sources.done is true, then fix problems with set_token and write_file in that project and save it with save_design_system. The AI step (Improve with AI) is a studio run, so it does not start from here: ${IMPROVE_IN_APP}`,
  },
  async (deps, input, client): Promise<Done> => {
    const folderPath = input.folderPath ? await trustedFolder(deps, input.folderPath, client, { tool: 'create_design_system', action: 'Read a code folder for a design system', title: `${client} wants to read {folder} for a design system`, detail: 'The studio copies token files from this folder into the draft project, where outside agents can read them.' }) : undefined;
    const tokensFile = input.tokensFile ? await readTokensFileInput(deps, input.tokensFile, client) : undefined;
    const body = { ...(tokensFile ? { tokensFile } : {}), mode: input.mode, ...(input.name ? { name: input.name } : {}), ...(input.basePackId ? { basePackId: input.basePackId } : {}), urls: input.urls ?? [], ...(input.brief ? { brief: input.brief } : {}), ...(input.designMd ? { designMd: input.designMd } : {}), ...(folderPath ? { folderPath } : {}) };
    const draft = await studioCall<DesignSystemDraftResult>(deps, 'POST', '/api/design-systems/draft?improve=off', body);
    const main = mainOf(draft.project);
    const result = ok({ projectId: draft.project.id, directionId: main?.id ?? null, packId: draft.pack.id, name: draft.pack.name, grade: draft.coverage.grade, next: 'Call design_system_status with this projectId until sources.done is true.', improve: IMPROVE_IN_APP });
    return { result, activity: { projectId: draft.project.id, directionId: main?.id ?? null, summary: `Started design system ${oneLine(draft.pack.name, 60)}` } };
  },
);

async function draftInfo(deps: EditDeps, project: Project): Promise<DesignSystemDraftInfo> {
  if (!project.designSystemFor) throw new EditError('This project is not a design system draft. Use create_design_system, or list_design_systems for saved ones.');
  return studioCall<DesignSystemDraftInfo>(deps, 'GET', `/api/projects/${encodeURIComponent(project.id)}/design-system-draft`);
}

const designSystemStatus = defineTool(
  'design_system_status',
  z.object({ projectId: projectId.describe('Design system draft project id from create_design_system.') }).strict(),
  { title: 'Design system draft status', description: 'Read a design system draft: each source (queued, reading, read, thin, blocked, failed, with a plain sentence), whether all sources are done, the coverage grade, and the design system check (passed or the problems). The save gate uses the same check.', readOnly: true, idempotent: true },
  async (deps, input): Promise<Done> => {
    const { project } = await loadTarget(deps, input.projectId);
    const info = await draftInfo(deps, project);
    const coverage = info.coverage ? { score: info.coverage.score, grade: info.coverage.grade, fallbacks: info.coverage.fallbacks } : null;
    const sources = info.sources ? { done: info.sources.done, items: info.sources.sources.map((source) => ({ label: source.label, kind: source.kind, state: source.state, detail: source.detail, ...(source.note ? { note: source.note } : {}) })), improve: info.sources.improve } : null;
    return { result: ok({ packId: info.packId, sources, coverage, check: info.check, running: deps.runner.isRunning(project.id, mainOf(project)?.id ?? 'main') }) };
  },
);

const saveDesignSystem = defineTool(
  'save_design_system',
  z
    .object({
      projectId: projectId.describe('Design system draft project id.'),
      name: z.string().trim().min(1).max(80).optional().describe('Library name. Leave out to keep the draft name.'),
      force: z.boolean().default(false).describe('Save even when the design system check fails. Needs reason.'),
      reason: z.string().trim().min(3).max(300).optional().describe('Why you save while the check fails. Shown to the user in the studio feed.'),
    })
    .strict()
    .refine((input) => !input.force || input.reason !== undefined, 'force needs a reason'),
  {
    title: 'Save design system to library',
    description: 'Save a design system draft to the studio library, the same as Save in the draft bar. Refused while the sources are read or a studio run is active. The design system check must pass, unless force is true with a reason; call design_system_status to see the problems first.',
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId);
    refuseWhileRunning(deps, project, direction);
    const info = await draftInfo(deps, project);
    if (info.sources && !info.sources.done) throw new EditError('The studio is still reading the sources of this draft. Call design_system_status until sources.done is true.');
    if (!info.check.passed && !input.force) throw new EditError(`The design system check found ${info.check.problems.length} problem(s). Fix them (design_system_status lists them), or pass force: true with a reason.`);
    const pack = (await studioCall<PackSummary[]>(deps, 'GET', '/api/packs')).find((item) => item.id === project.designSystemFor);
    const name = input.name ?? pack?.name ?? project.name;
    const saved = await studioCall<SavePackResult>(deps, 'POST', `${base(project, direction.id)}/design-system/save`, { name, packId: project.designSystemFor, ...(input.force ? { force: true } : {}) });
    const forced = input.force && !info.check.passed ? ` anyway (${oneLine(input.reason ?? '', 60)})` : '';
    const result = ok({ packId: saved.pack.id, name: saved.pack.name, created: saved.created, versionId: saved.version?.id ?? null, checkPassed: info.check.passed });
    return { result, activity: versionActivity(project, direction, `Saved ${oneLine(saved.pack.name, 50)} to the library${forced}`, saved.version) };
  },
);

const listDesignSystems = defineTool(
  'list_design_systems',
  z.object({ drafts: z.boolean().default(false).describe('Also list drafts that are not saved to the library yet.') }).strict(),
  { title: 'List design systems', description: 'List the design systems (packs) in the studio library: id, name, mode, fonts, built-in or user, and a few swatches. Use an id with create_project or apply_design_system.', readOnly: true, idempotent: true },
  async (deps, input): Promise<Done> => {
    const packs = await studioCall<PackSummary[]>(deps, 'GET', '/api/packs');
    const projects = await deps.projects.list();
    const shown = packs.filter((pack) => input.drafts || !pack.draft);
    return {
      result: ok(
        shown.map((pack) => {
          const backing = projects.find((project) => project.designSystemFor === pack.id && !project.designSystemDeleted);
          return { id: pack.id, name: pack.name, mode: pack.mode, source: pack.source, draft: pack.draft === true, fonts: pack.fonts, swatches: pack.swatches.slice(0, 6), ...(backing ? { projectId: backing.id } : {}) };
        }),
      ),
    };
  },
);

export const LIBRARY_TOOLS = [openFolder, createDesignSystem, designSystemStatus, saveDesignSystem, listDesignSystems];
