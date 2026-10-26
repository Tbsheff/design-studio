import { userInfo } from 'node:os';
import type { Context, Hono } from 'hono';
import type { Project } from '../../shared/contracts.js';
import { askQuestions } from '../agent/clarify.js';
import { buildEnv } from '../agent/sdk-driver.js';
import type { ProjectLibrary } from '../store/project-library.js';
import type { StudioProjectStore } from '../store/projects.js';
import type { DefaultFolderStore } from '../store/default-folder.js';
import { BadRequestError } from '../store/errors.js';
import { SAMPLE_NAME, SAMPLE_STARTER_ID, STARTERS, applySampleEdit, copyStarter, findStarter } from '../starters.js';
import type { ThumbnailService } from '../thumbnails.js';
import type { ServerConfig, VersionStore } from '../types.js';

interface HomeRouteDeps {
  config: ServerConfig;
  projects: StudioProjectStore;
  versions: VersionStore;
  library: ProjectLibrary;
  thumbnails: ThumbnailService;
  defaultFolder: DefaultFolderStore;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
  commitInit: (project: Project, title?: string, kind?: 'init' | 'manual') => Promise<Project>;
  watch: (project: Project) => void;
  addParentFolder: (parentPath: string | undefined, created: Project) => Promise<void>;
}

function optionalPath(body: Record<string, unknown>): string | undefined {
  const value = body.parentPath;
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new BadRequestError('parentPath must be a string');
  return value;
}

export function registerHomeRoutes(app: Hono, deps: HomeRouteDeps): void {
  const { config, projects, versions, library, thumbnails, defaultFolder, readBody } = deps;

  const createFromStarter = async (starterId: unknown, parentPath: string | undefined, name?: string): Promise<Project> => {
    const starter = findStarter(starterId);
    const created = await projects.createInFolder({ parentPath: parentPath ?? (await defaultFolder.ensure()), name: name ?? starter.name, kind: 'html' });
    try {
      await copyStarter(starter, projects.mainDirection(created).workTree);
      await versions.ensureRepo(created);
    } catch (error) {
      await projects.discardCreated(created.id);
      throw error;
    }
    await deps.addParentFolder(parentPath, created);
    return deps.commitInit(created, `Starter: ${starter.name}`);
  };

  app.get('/api/starters', (c) => c.json(STARTERS));

  app.post('/api/projects/from-starter', async (c) => {
    const body = await readBody(c);
    const project = await createFromStarter(body.starterId, optionalPath(body));
    deps.watch(project);
    return c.json({ project, runId: null });
  });

  app.post('/api/projects/sample', async (c) => {
    const body = await readBody(c);
    const first = await createFromStarter(SAMPLE_STARTER_ID, optionalPath(body), SAMPLE_NAME);
    const main = projects.mainDirection(first);
    await applySampleEdit(main.workTree);
    const project = await deps.commitInit(first, 'Sample edit: new headline', 'manual');
    deps.watch(project);
    return c.json({ project, runId: null });
  });

  app.patch('/api/projects/:pid', async (c) => {
    const body = await readBody(c);
    if (typeof body.name !== 'string') throw new BadRequestError('name is required');
    return c.json(await projects.rename(c.req.param('pid'), body.name));
  });

  app.post('/api/projects/:pid/duplicate', async (c) => c.json({ project: await library.duplicate(c.req.param('pid')) }));

  app.delete('/api/projects/:pid', async (c) => c.json(await library.trash(c.req.param('pid'))));

  app.get('/api/trash', async (c) => c.json(await library.listTrash()));

  app.get('/api/trash/:trashId/thumbnail', async (c) => {
    const bytes = await library.trashThumbnail(c.req.param('trashId'));
    return new Response(new Uint8Array(bytes), { headers: { 'content-type': 'image/png', 'cache-control': 'private, no-store' } });
  });

  app.delete('/api/trash/:trashId', async (c) => {
    await library.deleteForever(c.req.param('trashId'));
    return c.json({ deleted: 1 });
  });

  app.delete('/api/trash', async (c) => c.json({ deleted: await library.emptyTrash() }));

  app.post('/api/trash/:trashId/restore', async (c) => c.json({ project: await library.restore(c.req.param('trashId')) }));

  app.get('/api/projects/:pid/thumbnail/:vid', async (c) => {
    const bytes = await thumbnails.file(c.req.param('pid'), c.req.param('vid'));
    return new Response(new Uint8Array(bytes), { headers: { 'content-type': 'image/png', 'cache-control': 'private, max-age=31536000, immutable' } });
  });

  app.post('/api/clarify', async (c) => {
    const body = await readBody(c);
    if (typeof body.prompt !== 'string') throw new BadRequestError('prompt is required');
    const claudeExecutable = process.env.STUDIO_CLAUDE_PATH;
    return c.json(await askQuestions(body.prompt, { mode: config.agentMode === 'mock' ? 'mock' : 'sdk', env: buildEnv(process.env, false), ...(claudeExecutable ? { claudeExecutable } : {}) }));
  });

  app.get('/api/profile', (c) => c.json({ name: osUserName() }));

  app.get('/api/onboarding', async (c) => c.json({ dismissed: await defaultFolder.onboardingDismissed() }));

  app.post('/api/onboarding/dismiss', async (c) => {
    await defaultFolder.dismissOnboarding();
    return c.json({ dismissed: true });
  });
}

function osUserName(): string | null {
  try {
    const name = userInfo().username.trim();
    return name === '' ? null : name;
  } catch {
    return null;
  }
}
