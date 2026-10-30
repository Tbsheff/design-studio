import { mkdir, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project, Version } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import { THUMB_KEEP, createThumbnailService, type ThumbnailService } from '../thumbnails.js';
import type { TileRequest } from '../preview/browser.js';
import type { AgentRunner, PreviewService, ServerConfig, VersionStore } from '../types.js';
import { createApp } from './app.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let versions: VersionStore;
let thumbnails: ThumbnailService;
let app: ReturnType<typeof createApp>;
let shots: { url: string; request: TileRequest }[];
let gate: Promise<void> | null;

const BUTTON = { x: 100, y: 120, width: 160, height: 48 };

function pagePng(width: number, height: number, buttonShade: number): Buffer {
  const png = new PNG({ width, height });
  png.data.fill(255);
  for (let y = BUTTON.y; y < BUTTON.y + BUTTON.height; y += 1) {
    for (let x = BUTTON.x; x < BUTTON.x + BUTTON.width; x += 1) {
      const at = (y * width + x) * 4;
      png.data[at] = buttonShade;
      png.data[at + 1] = 40;
      png.data[at + 2] = 40;
    }
  }
  return PNG.sync.write(png);
}

function fakePreview(): PreviewService {
  return {
    ...createFakePreview(),
    snapshotUrl: async (_project, versionId) => `http://127.0.0.1:0/s/${versionId}/`,
    async screenshotTiles(url, request) {
      shots.push({ url, request });
      if (gate) await gate;
      const file = `${request.outPrefix}-1.png`;
      await mkdir(path.dirname(file), { recursive: true });
      const shade = url.includes(changedVersion) ? 200 : 20;
      await writeFile(file, pagePng(request.viewport.width, request.viewport.height, shade));
      return { paths: [file], pageHeight: request.viewport.height, from: 0, to: request.viewport.height };
    },
  };
}

let changedVersion = '-none-';

const runner: AgentRunner = { start: () => { throw new Error('no runs'); }, get: () => undefined, isRunning: () => false };

async function request(method: string, url: string, body?: unknown, token: string | null = config.studioToken): Promise<Response> {
  const headers: Record<string, string> = token ? { 'x-studio-token': token } : {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  return app.request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function makeProject(pages: string[]): Promise<{ project: Project; list: Version[] }> {
  let project = await projects.create({ name: 'Diff', kind: 'html' });
  await versions.ensureRepo(project);
  for (const [index, html] of pages.entries()) {
    project = await projects.get(project.id);
    const main = projects.mainDirection(project);
    await writeFile(path.join(main.workTree, 'index.html'), html);
    const version = await versions.commit(project, main, `Step ${index + 1}`, { kind: 'manual' });
    if (!version) throw new Error('no version');
    await projects.updateDirection(project.id, main.id, { headVersionId: version.id });
  }
  project = await projects.get(project.id);
  return { project, list: await versions.list(project, projects.mainDirection(project)) };
}

const thumbsDir = (pid: string) => path.join(projects.projectDir(pid), 'thumbs');

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  versions = createVersionStore(config);
  projects = createProjectStore(config, versions);
  shots = [];
  gate = null;
  changedVersion = '-none-';
  const preview = fakePreview();
  thumbnails = createThumbnailService({ projects, preview, versions });
  app = createApp({ config, bus: createEventBus(config.dataDir), projects, versions, runner, preview, thumbnails });
});

afterEach(async () => {
  await thumbnails.idle();
  await cleanup();
});

describe('version thumbnails', () => {
  it('renders a version on the first request only, from its snapshot, and needs the token', async () => {
    const { project, list } = await makeProject(['<h1>One</h1>', '<h1>Two</h1>']);
    const older = list[list.length - 1] as Version;
    expect((await request('GET', `/api/projects/${project.id}/versions/${older.id}/thumb`, undefined, null)).status).toBe(403);
    expect(shots).toHaveLength(0);
    const [a, b] = await Promise.all([1, 2].map(() => request('GET', `/api/projects/${project.id}/versions/${older.id}/thumb`)));
    expect([a?.status, b?.status]).toEqual([200, 200]);
    expect(shots).toHaveLength(1);
    expect(shots[0]?.url).toContain(`/s/${older.id}/`);
    expect(shots[0]?.request.still).toBe(true);
    const png = PNG.sync.read(Buffer.from(await (a as Response).arrayBuffer()));
    expect([png.width, png.height]).toEqual([640, 400]);
    expect((await request('GET', `/api/projects/${project.id}/versions/${older.id}/thumb`)).status).toBe(200);
    expect(shots).toHaveLength(1);
    expect(await readdir(thumbsDir(project.id))).toEqual([`vp-${older.id}.png`]);
  });

  it('does no browser work for an unknown version or a version with no page', async () => {
    const { project } = await makeProject(['<h1>One</h1>']);
    expect((await request('GET', `/api/projects/${project.id}/versions/${'a'.repeat(40)}/thumb`)).status).toBe(404);
    const main = projects.mainDirection(project);
    await rm(path.join(main.workTree, 'index.html'));
    await writeFile(path.join(main.workTree, 'notes.md'), 'no page');
    const empty = await versions.commit(project, main, 'No page', { kind: 'manual' });
    if (!empty) throw new Error('no version');
    expect((await request('GET', `/api/projects/${project.id}/versions/${empty.id}/thumb`)).status).toBe(404);
    expect(shots).toHaveLength(0);
  });

  it('runs one shot at a time and skips a queued shot whose request went away', async () => {
    const { project, list } = await makeProject(['<h1>One</h1>', '<h1>Two</h1>', '<h1>Three</h1>']);
    let open!: () => void;
    gate = new Promise((resolve) => {
      open = resolve;
    });
    const first = thumbnails.version(project.id, (list[0] as Version).id);
    for (let n = 0; n < 200 && shots.length === 0; n += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    const controller = new AbortController();
    const second = thumbnails.version(project.id, (list[1] as Version).id, controller.signal).catch((error: unknown) => error);
    expect(shots).toHaveLength(1);
    controller.abort();
    open();
    await first;
    expect(await second).toMatchObject({ name: 'AbortError' });
    expect(shots).toHaveLength(1);
  });

  it('keeps the Home card file and caps the cache at the newest files', async () => {
    const { project, list } = await makeProject(['<h1>One</h1>', '<h1>Two</h1>']);
    const headId = (list[0] as Version).id;
    await projects.setThumbnail(project.id, { versionId: headId, at: Date.now() });
    const dir = thumbsDir(project.id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${headId}.png`), pagePng(4, 4, 1));
    await utimes(path.join(dir, `${headId}.png`), new Date(1000), new Date(1000));
    for (let n = 0; n < THUMB_KEEP + 5; n += 1) {
      const file = path.join(dir, `v-old${String(n).padStart(4, '0')}.png`);
      await writeFile(file, 'x');
      await utimes(file, new Date(2000 + n * 1000), new Date(2000 + n * 1000));
    }
    await writeFile(path.join(dir, '.raw-stale-1.png'), 'x');
    await writeFile(path.join(dir, 'stale-head.png'), 'x');
    const older = (list[1] as Version).id;
    expect((await request('GET', `/api/projects/${project.id}/versions/${older}/thumb`)).status).toBe(200);
    const files = await readdir(dir);
    expect(files).toHaveLength(THUMB_KEEP + 1);
    expect(files).toContain(`${headId}.png`);
    expect(files).toContain(`vp-${older}.png`);
    expect(files).not.toContain('v-old0000.png');
    expect(files).not.toContain('stale-head.png');
    expect(files).not.toContain('.raw-stale-1.png');
  });
});

describe('version diff mask', () => {
  it('marks only the changed button and caches the mask', async () => {
    const { project, list } = await makeProject(['<button>Go</button>', '<button style="background:red">Go</button>']);
    const [after, before] = list as [Version, Version];
    changedVersion = after.id;
    const response = await request('GET', `/api/projects/${project.id}/versions/${before.id}/diff/${after.id}?w=640&h=400`);
    expect(response.status).toBe(200);
    expect(shots.map((shot) => shot.request.viewport)).toEqual([{ width: 640, height: 400 }, { width: 640, height: 400 }]);
    const mask = PNG.sync.read(Buffer.from(await response.arrayBuffer()));
    expect([mask.width, mask.height]).toEqual([640, 400]);
    let inside = 0;
    let outside = 0;
    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        if ((mask.data[(y * mask.width + x) * 4 + 3] ?? 0) === 0) continue;
        const within = x >= BUTTON.x && x < BUTTON.x + BUTTON.width && y >= BUTTON.y && y < BUTTON.y + BUTTON.height;
        if (within) inside += 1;
        else outside += 1;
      }
    }
    expect(inside).toBe(BUTTON.width * BUTTON.height);
    expect(outside).toBe(0);
    expect(Number(response.headers.get('x-changed-pct'))).toBeCloseTo(3, 0);
    expect((await request('GET', `/api/projects/${project.id}/versions/${before.id}/diff/${after.id}?w=640&h=400`)).status).toBe(200);
    expect(shots).toHaveLength(2);
  });
});

describe('version names', () => {
  it('saves a trimmed name in a sidecar, lists it, and removes it when empty', async () => {
    const { project, list } = await makeProject(['<h1>One</h1>']);
    const id = (list[0] as Version).id;
    const listUrl = `/api/projects/${project.id}/d/main/versions`;
    const rename = (name: unknown) => request('PATCH', `/api/projects/${project.id}/versions/${id}`, { name });
    expect(await (await rename('  Hero   with photo ')).json()).toEqual({ id, name: 'Hero with photo' });
    const listed = (await (await request('GET', listUrl)).json()) as Version[];
    expect(listed[0]?.name).toBe('Hero with photo');
    expect((await rename('x'.repeat(81))).status).toBe(400);
    expect((await rename(42)).status).toBe(400);
    expect((await request('PATCH', `/api/projects/${project.id}/versions/${'b'.repeat(40)}`, { name: 'Nope' })).status).toBe(404);
    const status = (await (await request('GET', `/api/projects/${project.id}/d/main/status`)).json()) as { changed: string[] };
    expect(status.changed).toEqual([]);
    expect(await (await rename('   ')).json()).toEqual({ id, name: null });
    expect(((await (await request('GET', listUrl)).json()) as Version[])[0]?.name).toBeUndefined();
  });

  it('ignores a bad names file', async () => {
    const { project } = await makeProject(['<h1>One</h1>']);
    await writeFile(path.join(projects.projectDir(project.id), 'version-names.json'), '{"abc": 12');
    const listed = (await (await request('GET', `/api/projects/${project.id}/d/main/versions`)).json()) as Version[];
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBeUndefined();
  });
});
