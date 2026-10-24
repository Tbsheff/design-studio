import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type { Direction, Project, TrashedProject } from '../../shared/contracts.js';
import type { AgentRunner, PreviewService, ServerConfig, VersionStore } from '../types.js';
import type { StudioProjectStore } from './projects.js';
import { ConflictError, NotFoundError, assertSafeId } from './errors.js';

const COPIED_PROJECT_PARTS = ['git', 'attachments'];
const TRASH_RECORD = 'trashed.json';

interface LibraryDeps {
  config: ServerConfig;
  projects: StudioProjectStore;
  versions: VersionStore;
  preview: PreviewService;
  runner: AgentRunner;
  defaultFolder: () => Promise<string>;
}

export interface ProjectLibrary {
  duplicate(projectId: string): Promise<Project>;
  trash(projectId: string): Promise<TrashedProject>;
  restore(trashId: string): Promise<Project>;
}

export function copyName(name: string): string {
  return /\bcopy( \d+)?$/i.test(name) ? name.replace(/\bcopy( (\d+))?$/i, (_whole, _group, n: string | undefined) => `copy ${Number(n ?? 1) + 1}`) : `${name} copy`;
}

export function createProjectLibrary(deps: LibraryDeps): ProjectLibrary {
  const { config, projects, versions, preview, runner } = deps;
  const trashRoot = path.join(config.dataDir, 'trash', 'projects');
  const trashDir = (trashId: string): string => path.join(trashRoot, assertSafeId(trashId, 'trashId'));

  const assertIdle = (project: Project): void => {
    if (project.directions.some((direction) => runner.isRunning(project.id, direction.id))) throw new ConflictError('a run is going in this project; stop it first');
  };

  const watchAll = (project: Project): void => {
    for (const direction of project.directions) {
      try {
        preview.watch(project, direction);
      } catch (error) {
        console.error(`[library] cannot watch ${project.id}/${direction.id}`, error);
      }
    }
  };

  const targetParent = async (project: Project): Promise<string> => {
    const main = projects.mainDirection(project);
    if (project.imported?.created) {
      const parent = path.dirname(main.workTree);
      if (existsSync(parent)) return parent;
    }
    return deps.defaultFolder();
  };

  const linkSourceModules = async (source: Direction, folder: string): Promise<void> => {
    const modules = path.join(source.workTree, 'node_modules');
    if (existsSync(modules)) await projects.linkModules(folder, await realpath(modules));
  };

  return {
    async duplicate(projectId: string): Promise<Project> {
      const source = await projects.get(projectId);
      const main = projects.mainDirection(source);
      const name = copyName(source.name);
      const folder = await projects.reserveFolder(await targetParent(source), name);
      const id = nanoid(10);
      const fromDir = projects.projectDir(source.id);
      const toDir = projects.projectDir(id);
      try {
        await mkdir(toDir, { recursive: true });
        for (const part of COPIED_PROJECT_PARTS) {
          const from = path.join(fromDir, part);
          if (existsSync(from)) await cp(from, path.join(toDir, part), { recursive: true, verbatimSymlinks: true });
        }
        const thumb = source.thumbnail ? path.join(fromDir, 'thumbs', `${assertSafeId(source.thumbnail.versionId, 'versionId')}.png`) : null;
        if (thumb && existsSync(thumb)) {
          await mkdir(path.join(toDir, 'thumbs'), { recursive: true });
          await cp(thumb, path.join(toDir, 'thumbs', path.basename(thumb)));
        }
        const now = Date.now();
        const direction: Direction = { ...main, workTree: folder, sessionId: null, sessionCostUsd: 0, createdAt: now };
        delete direction.sessionResetReason;
        delete direction.variation;
        const project: Project = {
          ...source,
          id,
          name,
          createdAt: now,
          updatedAt: now,
          imported: { sourcePath: folder, created: true },
          directions: [direction],
          thumbnail: thumb && existsSync(thumb) ? source.thumbnail : null,
        };
        if (main.headVersionId) await versions.checkoutInto(project, main.headVersionId, folder);
        await linkSourceModules(main, folder);
        await projects.writeRaw(project);
        await versions.ensureRepo(project);
        watchAll(project);
        return project;
      } catch (error) {
        await rm(toDir, { recursive: true, force: true });
        await rm(folder, { recursive: true, force: true });
        throw error;
      }
    },

    async trash(projectId: string): Promise<TrashedProject> {
      const project = await projects.get(projectId);
      assertIdle(project);
      for (const direction of project.directions) {
        await preview.release(project, direction).catch((error: unknown) => console.error(`[library] release failed for ${project.id}/${direction.id}`, error));
      }
      const trashId = `${project.id}-${Date.now().toString(36)}`;
      await projects.withLock(project.id, async () => {
        await mkdir(trashRoot, { recursive: true });
        await rename(projects.projectDir(project.id), trashDir(trashId));
        await writeFile(path.join(trashDir(trashId), TRASH_RECORD), `${JSON.stringify({ projectId: project.id, name: project.name, trashedAt: Date.now() })}\n`);
      });
      return { trashId, projectId: project.id, name: project.name };
    },

    async restore(trashId: string): Promise<Project> {
      const from = trashDir(trashId);
      if (!existsSync(path.join(from, 'project.json'))) throw new NotFoundError(`trash item ${trashId} not found`);
      const record = JSON.parse(await readFile(path.join(from, TRASH_RECORD), 'utf8')) as { projectId: string };
      const projectId = assertSafeId(record.projectId, 'projectId');
      const target = projects.projectDir(projectId);
      await projects.withLock(projectId, async () => {
        if (existsSync(path.join(target, 'project.json'))) throw new ConflictError(`project ${projectId} already exists`);
        if (existsSync(target)) await mergeGhost(target, from);
        await rm(path.join(from, TRASH_RECORD), { force: true });
        await rename(from, target);
      });
      const project = await projects.get(projectId);
      await versions.ensureRepo(project);
      watchAll(project);
      return project;
    },
  };
}

async function mergeGhost(ghost: string, trashed: string): Promise<void> {
  const events = path.join(ghost, 'events.jsonl');
  if (existsSync(events)) {
    const late = await readFile(events, 'utf8');
    const kept = path.join(trashed, 'events.jsonl');
    await writeFile(kept, `${existsSync(kept) ? await readFile(kept, 'utf8') : ''}${late}`);
  }
  for (const entry of await readdir(ghost)) {
    if (entry === 'events.jsonl') continue;
    const into = path.join(trashed, entry);
    if (!existsSync(into)) await cp(path.join(ghost, entry), into, { recursive: true, verbatimSymlinks: true });
  }
  await rm(ghost, { recursive: true, force: true });
}
