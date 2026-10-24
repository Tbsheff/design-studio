import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { PACK_FILE, TOKENS_CSS_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import type { ApplyPackResult, Direction, PackManifest, Project, SavePackResult, Version, VersionMeta } from '../../shared/contracts.js';
import { DirectEditError, publishVersion } from '../direct-edit/index.js';
import type { DirectEditDeps } from '../direct-edit/index.js';
import { BadRequestError, NotFoundError, isNodeError } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';
import { readSnapshot, restoreSnapshots } from './create-token.js';
import { splitDesignMd } from './design-md.js';
import type { PackLibrary } from './library.js';
import { DESIGN_MD_FILE, WIRED_FILES, applyPack, formatIssues, manifestSchema, wiresReact, writeFileAtomic } from './packs.js';
import type { LoadedPack } from './packs.js';
import { readDesignSystemState } from './state.js';
import { hasTokensFile, readManifest } from './sync.js';
import { invalidateTokenSource } from './token-preview.js';

export type ProjectPackDeps = Omit<DirectEditDeps, 'projects'> & {
  projects: Pick<StudioProjectStore, 'updateDirection' | 'get' | 'directionOf' | 'mainDirection' | 'setPackId'>;
};

export const NOT_WIRED_NOTICE = 'Design system files added. This imported project does not load design-system/tokens.css yet; import it in your entry file.';

const APPLY_FILES = [TOKENS_FILE, PACK_FILE, TOKENS_CSS_FILE, DESIGN_MD_FILE];

const applySchema = z.object({ packId: z.string().trim().min(1).max(64) }).strict();
const saveSchema = z.object({ name: z.string().trim().min(1).max(80), packId: z.string().trim().min(1).max(64).optional() }).strict();

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null;
    throw error;
  }
}

export function parseApplyRequest(raw: unknown): { packId: string } {
  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestError('packId is required');
  return parsed.data;
}

export function parseSaveRequest(raw: unknown): { name: string; packId?: string } {
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestError(`invalid request: ${formatIssues('', parsed.error).map((line) => line.trim()).join('; ')}`);
  return parsed.data;
}

async function currentNotes(workTree: string): Promise<{ notes: string; previous: PackManifest | null }> {
  const designMd = await readOptional(path.join(workTree, DESIGN_MD_FILE));
  if (!(await hasTokensFile(workTree))) return { notes: designMd?.trim() ?? '', previous: null };
  return { notes: designMd === null ? '' : splitDesignMd(designMd).notes, previous: await readManifest(workTree) };
}

function applyTitle(previous: PackManifest | null, pack: LoadedPack): string {
  const switching = previous !== null && previous.id !== pack.manifest.id;
  return `${switching ? 'Switch to' : 'Apply'} ${pack.manifest.name} design system`;
}

export async function applyPackToDirection(deps: ProjectPackDeps, project: Project, direction: Direction, pack: LoadedPack): Promise<ApplyPackResult> {
  if (deps.runner.isRunning(project.id, direction.id)) {
    throw new DirectEditError('run_in_progress', 'The agent is editing this direction; wait for the run to finish');
  }
  const workTree = direction.workTree;
  const { notes, previous } = await currentNotes(workTree);
  const tracked = wiresReact(project) ? [...APPLY_FILES, ...WIRED_FILES] : APPLY_FILES;
  const snapshots = await Promise.all(tracked.map((relative) => readSnapshot(workTree, relative)));
  const title = applyTitle(previous, pack);
  const meta: VersionMeta = { kind: 'manual', prompt: `${title} (${pack.manifest.id})` };
  let written: string[];
  let version: Version | null;
  try {
    written = await applyPack(project, workTree, pack, { userDesignMd: notes });
    version = await deps.versions.commitFile(project, direction, written, title, meta);
    if (version === null) throw new DirectEditError('no_change', `${pack.manifest.name} is already applied`);
  } catch (error) {
    await restoreSnapshots(workTree, snapshots);
    throw error;
  } finally {
    invalidateTokenSource(workTree);
  }
  if (deps.projects.mainDirection(project).id === direction.id) await deps.projects.setPackId(project.id, pack.manifest.id);
  await publishVersion(deps, project, direction, version);
  const updated = await deps.projects.get(project.id);
  const wired = project.kind !== 'react' || wiresReact(project);
  return {
    project: updated,
    state: await readDesignSystemState(updated, deps.projects.directionOf(updated, direction.id)),
    version,
    written,
    wired,
    notice: wired ? null : NOT_WIRED_NOTICE,
  };
}

function parseManifestText(text: string): PackManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BadRequestError('design-system/pack.json is not valid JSON');
  }
  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestError(`design-system/pack.json is invalid: ${formatIssues('pack.json', parsed.error).join('; ')}`);
  return parsed.data as PackManifest;
}

async function saveTarget(library: PackLibrary, requested: string | undefined, onDisk: PackManifest): Promise<string | undefined> {
  if (requested !== undefined) return requested;
  const named = await library.registry.get(onDisk.id);
  return named?.source === 'user' ? named.manifest.id : undefined;
}

async function pointAtSavedPack(deps: ProjectPackDeps, project: Project, direction: Direction, saved: LoadedPack): Promise<Version | null> {
  const workTree = direction.workTree;
  const snapshot = await readSnapshot(workTree, PACK_FILE);
  let version: Version | null;
  try {
    await writeFileAtomic(path.join(workTree, PACK_FILE), `${JSON.stringify(saved.manifest, null, 2)}\n`);
    version = await deps.versions.commitFile(project, direction, [PACK_FILE], `Save ${saved.manifest.name} to library`, { kind: 'manual', prompt: `Save ${saved.manifest.name} to library (${saved.manifest.id})` });
  } catch (error) {
    await restoreSnapshots(workTree, [snapshot]);
    throw error;
  }
  if (deps.projects.mainDirection(project).id === direction.id && project.packId !== saved.manifest.id) await deps.projects.setPackId(project.id, saved.manifest.id);
  if (version) await publishVersion(deps, project, direction, version);
  return version;
}

export async function saveDirectionPack(deps: ProjectPackDeps, library: PackLibrary, project: Project, direction: Direction, raw: unknown): Promise<SavePackResult> {
  const request = parseSaveRequest(raw);
  if (deps.runner.isRunning(project.id, direction.id)) {
    throw new DirectEditError('run_in_progress', 'The agent is editing this direction; wait for the run to finish');
  }
  const workTree = direction.workTree;
  const tokensText = await readOptional(path.join(workTree, TOKENS_FILE));
  const manifestText = await readOptional(path.join(workTree, PACK_FILE));
  if (tokensText === null || manifestText === null) throw new NotFoundError('This direction has no design system');
  const manifest = parseManifestText(manifestText);
  const designMd = await readOptional(path.join(workTree, DESIGN_MD_FILE));
  const prose = designMd === null ? '' : splitDesignMd(designMd).prose.trim();
  const input = {
    name: request.name,
    description: manifest.description,
    mode: manifest.mode,
    fonts: manifest.fonts,
    tokensJson: tokensText,
    designMd: prose === '' ? `# ${request.name}\n` : prose,
    provenance: manifest.provenance === 'imported' ? ('imported' as const) : ('extracted' as const),
    tags: manifest.tags,
    license: manifest.license,
  };
  const target = await saveTarget(library, request.packId, manifest);
  const saved = target === undefined ? await library.createUserPack(input) : await library.updateUserPack(target, input);
  const version = await pointAtSavedPack(deps, project, direction, saved);
  return { pack: saved.summary, created: target === undefined, project: await deps.projects.get(project.id), version };
}
