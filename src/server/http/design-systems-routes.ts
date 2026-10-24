import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Context, Hono } from 'hono';
import type { Attachment, DesignSystemCoverage, DesignSystemDraftInfo, DesignSystemDraftResult, Direction, OpenPackEditorResult, Project } from '../../shared/contracts.js';
import { checkDesignSystem } from '../design-system/check.js';
import { readCoverage } from '../design-system/draft-project.js';
import { KIT_PAGE_FILE, renderKitPage } from '../design-system/extract/kit-page.js';
import { COVERAGE_FILE, MAX_TOKENS_FILE_BYTES, META_FILE, buildDraft, createFetcher, parseDraftRequest } from '../design-system/extract/draft.js';
import type { Draft, DraftFile } from '../design-system/extract/draft.js';
import { libraryCoverage } from '../design-system/extract/map.js';
import type { Fetcher } from '../design-system/extract/url.js';
import type { PackLibrary } from '../design-system/library.js';
import type { LoadedPack } from '../design-system/packs.js';
import { BadRequestError, NotFoundError, isNodeError } from '../store/errors.js';
import { createKeyedMutex } from '../store/mutex.js';
import type { StudioProjectStore } from '../store/projects.js';
import type { VersionStore } from '../types.js';

export const MAX_DRAFT_IMAGES = 8;
export const MAX_DRAFT_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export interface DesignSystemRouteDeps {
  library: PackLibrary;
  projects: StudioProjectStore;
  versions: VersionStore;
  projectsFolder: () => Promise<string>;
  finishCreate: (project: Project, pack: LoadedPack) => Promise<Project>;
  watch: (project: Project, direction: Direction) => void;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
  allowLoopback: boolean;
  fetcher?: Fetcher;
}

interface ImageInput {
  name: string;
  mime: string;
  bytes: Uint8Array;
}

interface DraftBody {
  raw: unknown;
  tokensFile: { name: string; text: string } | null;
  images: ImageInput[];
}

function asFiles(value: unknown): File[] {
  const list = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return list.filter((item): item is File => item instanceof File);
}

async function readImages(files: File[]): Promise<ImageInput[]> {
  if (files.length > MAX_DRAFT_IMAGES) throw new BadRequestError(`Add at most ${MAX_DRAFT_IMAGES} images`);
  return Promise.all(
    files.map(async (file) => {
      if (!IMAGE_TYPES.has(file.type)) throw new BadRequestError(`${file.name}: use PNG, JPEG, GIF or WebP images`);
      if (file.size > MAX_DRAFT_IMAGE_BYTES) throw new BadRequestError(`${file.name} is larger than ${MAX_DRAFT_IMAGE_BYTES / 1024 / 1024} MB`);
      return { name: file.name, mime: file.type, bytes: new Uint8Array(await file.arrayBuffer()) };
    }),
  );
}

async function readTokensUpload(value: unknown): Promise<{ name: string; text: string } | null> {
  const [file] = asFiles(value);
  if (!file) return null;
  if (file.size > MAX_TOKENS_FILE_BYTES) throw new BadRequestError(`${file.name} is larger than 2 MB`);
  return { name: file.name || 'tokens.json', text: await file.text() };
}

async function readDraftBody(c: Context, readBody: DesignSystemRouteDeps['readBody']): Promise<DraftBody> {
  if (!(c.req.header('content-type') ?? '').toLowerCase().startsWith('multipart/form-data')) return { raw: await readBody(c), tokensFile: null, images: [] };
  const form = await c.req.parseBody({ all: true });
  const text = typeof form.request === 'string' ? form.request : '{}';
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BadRequestError('request must be JSON');
  }
  return { raw, tokensFile: await readTokensUpload(form.tokensFile), images: await readImages(asFiles(form.images)) };
}

async function writeDraftFiles(workTree: string, files: DraftFile[]): Promise<void> {
  for (const file of files) {
    const target = path.join(workTree, file.path);
    if (!target.startsWith(workTree + path.sep)) throw new Error(`draft file outside the work tree: ${file.path}`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
}

interface BackingSource {
  name: string;
  kitHtml: string;
  files: DraftFile[];
  inputs: Record<string, unknown>;
}

function metaFile(source: BackingSource, pack: LoadedPack, attachments: Attachment[]): DraftFile {
  const meta = {
    version: 1,
    kind: 'design-system-draft',
    packId: pack.manifest.id,
    name: source.name,
    createdAt: new Date().toISOString(),
    inputs: source.inputs,
    attachments: attachments.map((item) => ({ id: item.id, name: item.name, mime: item.mime })),
    files: [KIT_PAGE_FILE, ...source.files.map((file) => file.path)],
  };
  return { path: META_FILE, content: `${JSON.stringify(meta, null, 2)}\n` };
}

function librarySource(pack: LoadedPack): BackingSource {
  const { name, mode, fonts } = pack.manifest;
  const coverage = { path: COVERAGE_FILE, content: `${JSON.stringify(libraryCoverage(pack), null, 2)}\n` };
  return { name, kitHtml: renderKitPage({ name, mode, googleFontsUrl: fonts.googleFontsUrl }), files: [coverage], inputs: { library: pack.manifest.id } };
}

function packParam(c: Context): string {
  const id = c.req.param('id') ?? '';
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new BadRequestError('invalid pack id');
  return id;
}

export function registerDesignSystemRoutes(app: Hono, deps: DesignSystemRouteDeps): void {
  const { library, projects, versions } = deps;
  const fetcher = deps.fetcher ?? createFetcher(deps.allowLoopback);

  const editorLock = createKeyedMutex();

  const fillBacking = async (created: Project, source: BackingSource, pack: LoadedPack, images: ImageInput[]): Promise<Project> => {
    await versions.ensureRepo(created);
    const attachments = await Promise.all(images.map((image) => projects.saveAttachment(created.id, image)));
    const workTree = projects.mainDirection(created).workTree;
    await writeDraftFiles(workTree, [{ path: KIT_PAGE_FILE, content: source.kitHtml }, ...source.files, metaFile(source, pack, attachments)]);
    return deps.finishCreate(created, pack);
  };

  const createBacking = async (source: BackingSource, pack: LoadedPack, images: ImageInput[]): Promise<Project> => {
    const created = await projects.createInFolder({ parentPath: await deps.projectsFolder(), name: `${source.name} design system`, kind: 'html', designSystemFor: pack.manifest.id });
    let project: Project;
    try {
      project = await fillBacking(created, source, pack, images);
    } catch (error) {
      await projects.discardCreated(created.id).catch((cleanup: unknown) => console.error('[design-systems] could not remove the half-made backing project', cleanup));
      throw error;
    }
    deps.watch(project, projects.mainDirection(project));
    return project;
  };

  app.post('/api/design-systems/draft', async (c) => {
    const started = Date.now();
    const body = await readDraftBody(c, deps.readBody);
    const merged = body.tokensFile && typeof body.raw === 'object' && body.raw !== null ? { ...body.raw, tokensFile: body.tokensFile } : body.raw;
    const request = parseDraftRequest(merged, body.images.length);
    const draft = await buildDraft(request, { registry: library.registry, fetcher }, { allowLoopback: deps.allowLoopback, imageCount: body.images.length });
    const pack = await library.createUserPack(draft.pack);
    let project: Project;
    try {
      project = await createBacking({ name: draft.name, kitHtml: draft.kitHtml, files: draft.files, inputs: draft.inputs }, pack, body.images);
    } catch (error) {
      await library.deletePack(pack.manifest.id).catch((cleanup: unknown) => console.error('[design-systems] could not remove the draft pack', cleanup));
      throw error;
    }
    const result: DesignSystemDraftResult = { project, pack: pack.summary, coverage: draft.coverage, ms: Date.now() - started };
    return c.json(result);
  });

  app.post('/api/packs/:id/editor', async (c) => {
    const id = packParam(c);
    const pack = await library.registry.get(id);
    if (!pack) throw new NotFoundError(`unknown pack: ${id}`);
    if (pack.source !== 'user') throw new BadRequestError(`${pack.manifest.name} is a built-in design system; make a copy to edit it`);
    const result: OpenPackEditorResult = await editorLock(id, async () => {
      const existing = (await projects.list()).find((project) => project.designSystemFor === id && !project.designSystemDeleted);
      if (existing) return { project: existing, created: false };
      return { project: await createBacking(librarySource(pack), pack, []), created: true };
    });
    return c.json(result);
  });

  app.get('/api/projects/:pid/design-system-draft', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    if (!project.designSystemFor) throw new NotFoundError('This project is not a design-system project');
    const workTree = projects.mainDirection(project).workTree;
    const info: DesignSystemDraftInfo = { packId: project.designSystemFor, coverage: await readCoverage(workTree), check: await checkDesignSystem(workTree) };
    return c.json(info);
  });
}
