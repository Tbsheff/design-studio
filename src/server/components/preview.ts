import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BRIDGE_CHANGES_PATH, type Direction, type Project } from '../../shared/contracts.js';
import type { PropValue } from '../../shared/props.js';
import type { PreviewService } from '../types.js';
import type { RenderPage } from '../preview/render-backend.js';
import { humanize, propsFor } from './insert.js';
import { loadLibrary, type LibraryEntry } from './insert-list.js';
import { componentSchema } from './props-schema.js';
import { bundlePreview, BundleError, type SampleNode } from './preview-bundle.js';

export const PREVIEW_VIEWPORT = { width: 960, height: 720, scale: 2 };
const RENDER_VERSION = '3';
const JOBS_PER_PAGE = 24;
const LINGER_MS = 400;
const LIBRARY_TTL_MS = 4000;
const HEAD_TTL_MS = 120_000;
const SETTLE_MS = 120;
const BLOCK_STYLE = 'width:max-content;min-width:200px;max-width:320px';

export interface PreviewTarget {
  id?: string | undefined;
  name?: string | undefined;
  file?: string | undefined;
}

export interface PreviewComponent {
  id: string;
  name: string;
  file: string;
}

type Outcome = { png: Buffer } | { reason: string; transient?: boolean };

export type PreviewResult = { ok: true; png: Buffer; cached: boolean; component: PreviewComponent; props: Record<string, PropValue>; text: string | null } | { ok: false; reason: string; component: PreviewComponent | null };

interface Job {
  hash: string;
  entry: LibraryEntry;
  tree: SampleNode;
  root: string;
  appDir: string;
  done: (outcome: Outcome) => void;
}

interface Head {
  html: string;
  htmlClass: string;
  htmlStyle: string;
  bodyClass: string;
}

interface Session {
  key: string;
  url: string;
  pagePath: string;
  jobs: Job[];
  running: boolean;
  head: { value: Head; at: number } | null;
}

export interface ComponentPreviews {
  render(project: Project, direction: Direction, target: PreviewTarget): Promise<PreviewResult>;
}

export class PreviewTargetError extends Error {}

function pickEntry(entries: LibraryEntry[], target: PreviewTarget): LibraryEntry {
  if (target.id) {
    const byId = entries.find((entry) => entry.id === target.id);
    if (!byId) throw new PreviewTargetError(`No component has the id ${target.id}. List the components to see the ids.`);
    return byId;
  }
  const matches = entries.filter((entry) => entry.name === target.name && (!target.file || entry.file === target.file));
  if (matches.length === 1) return matches[0] as LibraryEntry;
  if (matches.length === 0) throw new PreviewTargetError(`The project has no exported component named ${target.name ?? ''}${target.file ? ` in ${target.file}` : ''}.`);
  throw new PreviewTargetError(`More than one component is named ${target.name ?? ''} (${matches.map((entry) => entry.file).join(', ')}). Pass its file too.`);
}

const PREVIEW_STYLE = '<style>html,body{margin:0;min-height:0!important;height:auto!important}#studio-preview{display:inline-block;padding:16px;max-width:640px;box-sizing:content-box}</style>';

function setupExpression(pagePath: string, head: Head | null): string {
  return `(async () => {
    window.addEventListener('error', (event) => { window.__studioPreviewError = window.__studioPreviewError || event.message; });
    window.addEventListener('unhandledrejection', (event) => { window.__studioPreviewError = window.__studioPreviewError || String(event.reason && event.reason.message || event.reason); });
    let head = ${JSON.stringify(head)};
    if (!head) {
      let doc = null;
      try {
        const res = await fetch(${JSON.stringify(pagePath)}, { credentials: 'include', headers: { accept: 'text/html' } });
        doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      } catch (error) {}
      const nodes = doc ? [...doc.querySelectorAll('link[rel="stylesheet"], head style')] : [];
      head = { html: nodes.map((node) => node.outerHTML).join(''), htmlClass: doc ? doc.documentElement.className : '', htmlStyle: doc ? doc.documentElement.getAttribute('style') || '' : '', bodyClass: doc ? doc.body.className : '' };
    }
    document.documentElement.className = head.htmlClass;
    document.documentElement.setAttribute('style', head.htmlStyle);
    document.head.innerHTML = '<meta charset="utf-8">' + head.html + ${JSON.stringify(PREVIEW_STYLE)};
    document.body.className = head.bodyClass;
    document.body.innerHTML = '';
    await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.sheet ? true : new Promise((resolve) => { link.onload = link.onerror = resolve; setTimeout(resolve, 8000); })));
    return head;
  })()`;
}

function renderExpression(code: string): string {
  return `(async () => {
    const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (window.__studioPreviewUnmount) { try { window.__studioPreviewUnmount(); } catch (error) {} }
    window.__studioPreviewUnmount = null;
    window.__studioPreviewError = null;
    document.body.innerHTML = '<div id="studio-preview"></div>';
    const script = document.createElement('script');
    script.textContent = ${JSON.stringify(code)};
    document.body.appendChild(script);
    await frames();
    await new Promise((resolve) => setTimeout(resolve, ${SETTLE_MS}));
    if (document.fonts) await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1500))]);
    const root = document.getElementById('studio-preview');
    const first = root.firstElementChild;
    if (first && !getComputedStyle(first).display.startsWith('inline')) {
      root.style.cssText = '${BLOCK_STYLE}';
      await frames();
    }
    const box = root.getBoundingClientRect();
    const empty = !first && !root.textContent.trim();
    return { error: window.__studioPreviewError, empty, x: box.left + window.scrollX, y: box.top + window.scrollY, width: box.width, height: box.height };
  })()`;
}

interface Rendered {
  error: string | null;
  empty: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

async function renderJob(page: RenderPage, job: Job, shotPath: string): Promise<Outcome> {
  let code: string;
  try {
    code = await bundlePreview({ file: job.entry.absolute, tree: job.tree, root: job.root, appDir: job.appDir });
  } catch (error) {
    return { reason: `Could not build ${job.entry.name} for a preview: ${error instanceof BundleError ? error.message : String(error)}` };
  }
  const rendered = await page.evaluate<Rendered>(renderExpression(code));
  if (rendered.error) return { reason: `${job.entry.name} threw while it rendered with default props: ${rendered.error}` };
  if (rendered.empty || rendered.width < 2 || rendered.height < 2) return { reason: `${job.entry.name} renders nothing visible with default props (it may need open state, data or a parent).` };
  const clip = { x: Math.round(rendered.x), y: Math.round(rendered.y), width: Math.round(Math.min(rendered.width, PREVIEW_VIEWPORT.width)), height: Math.round(Math.min(rendered.height, PREVIEW_VIEWPORT.height)) };
  await page.screenshot(shotPath, clip);
  return { png: await readFile(shotPath) };
}

const SAMPLE_PARTS: [string, string][] = [
  ['Header', ''],
  ['Title', 'Title'],
  ['Description', 'A short description.'],
  ['Content', 'Content'],
];

function partNames(entry: LibraryEntry, entries: LibraryEntry[]): Set<string> {
  return new Set(entries.filter((item) => item.absolute === entry.absolute && item.kind === 'named' && item.name.startsWith(entry.name) && item.name !== entry.name).map((item) => item.name.slice(entry.name.length)));
}

function sampleChildren(entry: LibraryEntry, entries: LibraryEntry[]): (SampleNode | string)[] | null {
  if (entry.kind !== 'named') return null;
  const parts = partNames(entry, entries);
  const leaf = (suffix: string, text: string): SampleNode => ({ exportName: `${entry.name}${suffix}`, props: {}, children: [text] });
  const inner = SAMPLE_PARTS.filter(([suffix]) => suffix === 'Title' || suffix === 'Description').filter(([suffix]) => parts.has(suffix)).map(([suffix, text]) => leaf(suffix, text));
  const out: SampleNode[] = [];
  if (parts.has('Header') && inner.length > 0) out.push({ exportName: `${entry.name}Header`, props: {}, children: inner });
  else out.push(...inner);
  if (parts.has('Content')) out.push(leaf('Content', 'Content'));
  return out.length > 1 ? out : null;
}

async function sampleTree(workTree: string, entry: LibraryEntry, entries: LibraryEntry[]): Promise<{ tree: SampleNode; props: Record<string, PropValue>; text: string | null }> {
  const schema = await componentSchema(workTree, { file: entry.absolute, name: entry.local }).catch(() => null);
  const props = propsFor(schema, {});
  const exportName = entry.kind === 'default' ? 'default' : entry.name;
  if (!entry.children) return { tree: { exportName, props, children: [] }, props, text: null };
  const parts = sampleChildren(entry, entries);
  if (parts) return { tree: { exportName, props, children: parts }, props, text: null };
  const text = humanize(entry.name);
  return { tree: { exportName, props, children: [text] }, props, text };
}

export function createComponentPreviews(deps: { preview: PreviewService; cacheDir: string }): ComponentPreviews {
  const inflight = new Map<string, Promise<Outcome>>();
  const sessions = new Map<string, Session>();
  const libraries = new Map<string, { at: number; library: ReturnType<typeof loadLibrary> }>();

  const cacheFile = (projectId: string, hash: string, ext: 'png' | 'json') => path.join(deps.cacheDir, projectId.replace(/[^A-Za-z0-9_-]/g, '_'), `${hash}.${ext}`);

  const store = async (projectId: string, hash: string, outcome: Outcome) => {
    await mkdir(path.dirname(cacheFile(projectId, hash, 'png')), { recursive: true });
    if ('transient' in outcome) return;
    if ('png' in outcome) await writeFile(cacheFile(projectId, hash, 'png'), outcome.png);
    else await writeFile(cacheFile(projectId, hash, 'json'), JSON.stringify({ reason: outcome.reason }));
  };

  const cached = async (projectId: string, hash: string): Promise<Outcome | null> => {
    const png = await readFile(cacheFile(projectId, hash, 'png')).catch(() => null);
    if (png) return { png };
    const failed = await readFile(cacheFile(projectId, hash, 'json'), 'utf8').then((raw) => JSON.parse(raw) as { reason?: unknown }, () => null);
    return typeof failed?.reason === 'string' ? { reason: failed.reason } : null;
  };

  const libraryOf = (project: Project, direction: Direction) => {
    const key = `${project.id}/${direction.id}`;
    const known = libraries.get(key);
    if (known && known.at > Date.now() - LIBRARY_TTL_MS) return known.library;
    const library = loadLibrary(project, direction.workTree);
    libraries.set(key, { at: Date.now(), library });
    library.catch(() => libraries.delete(key));
    return library;
  };

  const nextJob = async (session: Session): Promise<Job | undefined> => {
    const deadline = Date.now() + LINGER_MS;
    while (session.jobs.length === 0 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
    return session.jobs.shift();
  };

  const runBatch = async (session: Session, page: RenderPage, scratch: string) => {
    const fresh = session.head && session.head.at > Date.now() - HEAD_TTL_MS ? session.head.value : null;
    const head = await page.evaluate<Head>(setupExpression(session.pagePath, fresh));
    if (!fresh) session.head = { value: head, at: Date.now() };
    for (let count = 0; count < JOBS_PER_PAGE; count += 1) {
      const job = await nextJob(session);
      if (!job) return;
      const outcome = await renderJob(page, job, path.join(scratch, `${job.hash}.png`)).catch((error: unknown) => ({ reason: `Preview failed: ${error instanceof Error ? error.message : String(error)}`, transient: true }));
      job.done(outcome);
    }
  };

  const drain = async (session: Session) => {
    if (session.running || !deps.preview.withPage) return;
    session.running = true;
    const scratch = path.join(os.tmpdir(), `studio-component-preview-${process.pid}`);
    await mkdir(scratch, { recursive: true });
    try {
      while (session.jobs.length > 0) {
        await deps.preview.withPage(session.url, PREVIEW_VIEWPORT, (page) => runBatch(session, page, scratch)).catch((error: unknown) => {
          const reason = `The preview page did not open: ${error instanceof Error ? error.message : String(error)}`;
          for (const job of session.jobs.splice(0)) job.done({ reason, transient: true });
        });
      }
    } finally {
      session.running = false;
      await rm(scratch, { recursive: true, force: true }).catch(() => undefined);
    }
  };

  const sessionFor = async (project: Project, direction: Direction): Promise<Session> => {
    const key = `${project.id}/${direction.id}`;
    const known = sessions.get(key);
    if (known) return known;
    const frame = new URL(await deps.preview.directionUrl(project, direction));
    const session: Session = { key, url: `${frame.origin}${BRIDGE_CHANGES_PATH}`, pagePath: `${frame.pathname}${frame.search}`, jobs: [], running: false, head: null };
    sessions.set(key, session);
    return session;
  };

  const enqueue = async (project: Project, direction: Direction, job: Omit<Job, 'done'>): Promise<Outcome> => {
    const session = await sessionFor(project, direction);
    return new Promise<Outcome>((resolve) => {
      session.jobs.push({ ...job, done: resolve });
      void drain(session);
    });
  };

  const outcomeFor = (project: Project, direction: Direction, hash: string, job: () => Omit<Job, 'done' | 'hash'>): Promise<Outcome> => {
    let pending = inflight.get(hash);
    if (pending) return pending;
    pending = enqueue(project, direction, { hash, ...job() }).then(async (outcome) => {
      await store(project.id, hash, outcome).catch(() => undefined);
      return outcome;
    });
    inflight.set(hash, pending);
    void pending.finally(() => inflight.delete(hash));
    return pending;
  };

  return {
    async render(project, direction, target) {
      if (project.kind !== 'react') return { ok: false, reason: 'This is an HTML project. Component previews need a React project or an attached app.', component: null };
      const library = await libraryOf(project, direction);
      const entry = pickEntry(library.entries, target);
      const component = { id: entry.id, name: entry.name, file: entry.file };
      const source = library.texts.get(entry.absolute) ?? (await readFile(entry.absolute, 'utf8'));
      const sample = await sampleTree(direction.workTree, entry, library.entries);
      const hash = createHash('sha256').update([RENDER_VERSION, entry.name, entry.kind, JSON.stringify(sample.tree), source].join('\0')).digest('hex').slice(0, 32);
      const appDir = project.app?.appDir ? path.join(library.root, project.app.appDir) : library.root;
      const hit = await cached(project.id, hash);
      const outcome = hit ?? (await outcomeFor(project, direction, hash, () => ({ entry, tree: sample.tree, root: library.root, appDir })));
      const meta = { component, props: sample.props, text: sample.text };
      return 'png' in outcome ? { ok: true, png: outcome.png, cached: hit !== null, ...meta } : { ok: false, reason: outcome.reason, component };
    },
  };
}

const registry = new WeakMap<PreviewService, ComponentPreviews>();

export function componentPreviewsFor(preview: PreviewService, cacheDir?: string): ComponentPreviews {
  const known = registry.get(preview);
  if (known) return known;
  const created = createComponentPreviews({ preview, cacheDir: cacheDir ?? path.join(os.tmpdir(), 'studio-component-previews') });
  registry.set(preview, created);
  return created;
}
