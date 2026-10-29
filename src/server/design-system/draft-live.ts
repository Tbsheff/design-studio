import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Attachment, CoverageEntry, Direction, DraftImproveStart, DraftSourceStatus, DraftSourcesState, Project } from '../../shared/contracts.js';
import { isNodeError } from '../store/errors.js';
import { harvestDesignText } from './extract/design-md.js';
import { SOURCE_DIR, assembleDraft, emptyHarvested, META_FILE } from './extract/draft.js';
import type { Draft, DraftFile, DraftRequest, Harvested } from './extract/draft.js';
import { FolderScanError, scanFolder } from './extract/folder.js';
import type { FolderScan } from './extract/folder.js';
import { KIT_GROUPS, KIT_PAGE_FILE } from './extract/kit-page.js';
import type { KitGroup } from './extract/kit-page.js';
import { FetchBlockedError } from './extract/safe-fetch.js';
import { TokensFileError, harvestTokensFile } from './extract/tokens-file.js';
import type { Harvest, SourceReport } from './extract/types.js';
import { harvestUrl } from './extract/url.js';
import type { Fetcher, UrlHarvest } from './extract/url.js';
import type { PackLibrary } from './library.js';
import { applyPack } from './packs.js';
import type { LoadedPack } from './packs.js';

const STATE_FILE = 'design-system-sources.json';
const THIN_VALUES = 3;
const URL_CONCURRENCY = 2;
const FINAL_STATES = new Set(['read', 'thin', 'blocked', 'failed']);
const PASTE_HINT = 'Paste its CSS or a DESIGN.md instead.';
const MAX_SHOT_BYTES = Math.floor(3.75 * 1024 * 1024);
const LOGO_FILE = 'logo.png';

export interface LiveDraftDeps {
  library: PackLibrary;
  projectDir: (projectId: string) => string;
  getProject: (projectId: string) => Promise<Project>;
  mainDirection: (project: Project) => Direction;
  fetcher: Fetcher;
  emit: (project: Project, state: DraftSourcesState) => void;
  withMain: <T>(projectId: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
  commit: (project: Project, title: string) => Promise<void>;
  startImprove: (projectId: string) => Promise<DraftImproveStart>;
  saveAttachment: (projectId: string, file: { name: string; mime: string; bytes: Uint8Array }) => Promise<Attachment>;
}

export interface LiveDraftStart {
  project: Project;
  packId: string;
  request: DraftRequest;
  base: LoadedPack;
  imageCount: number;
  autoImprove?: boolean;
}

export const IMPROVE_IN_APP = 'Started from an outside agent, so the AI step did not start. Use Improve with AI in Design Studio.';

export interface LiveDrafts {
  plan(request: DraftRequest, imageCount: number): DraftSourcesState;
  start(input: LiveDraftStart): void;
  read(projectId: string): Promise<DraftSourcesState | null>;
  isReading(projectId: string): boolean;
}

type Planned = DraftSourceStatus & { order: number };

interface SourceResult {
  state: DraftSourceStatus['state'];
  detail: string;
  harvest?: Harvest;
  report: SourceReport;
  url?: UrlHarvest;
  folder?: FolderScan;
  note?: string;
  method?: 'browser' | 'static';
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

function hostLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`.slice(0, 80);
  } catch {
    return url.slice(0, 80);
  }
}

export function planSources(request: DraftRequest, imageCount: number): DraftSourceStatus[] {
  const list: DraftSourceStatus[] = [];
  const add = (id: string, kind: DraftSourceStatus['kind'], label: string) => list.push({ id, kind, label, state: 'queued', detail: 'Waiting' });
  if (request.designMd?.trim()) add('design-md', 'design-md', 'DESIGN.md');
  if (request.brief?.trim()) add('brief', 'brief', 'Brief');
  if (request.tokensFile) add('tokens-file', 'tokens-file', path.basename(request.tokensFile.name));
  if (request.folderPath?.trim()) add('folder', 'folder', path.basename(request.folderPath.trim()) || request.folderPath.trim());
  request.urls.forEach((url, index) => add(`url-${index + 1}`, 'url', hostLabel(url)));
  if (imageCount > 0) list.push({ id: 'images', kind: 'images', label: 'Images', state: 'read', detail: `${plural(imageCount, 'image')}: used by the AI step` });
  return list;
}

function countDetail(harvest: Harvest): { detail: string; total: number } {
  const groups = new Map<string, number>();
  for (const candidate of harvest.candidates) {
    const group = candidate.token.split('.')[0] ?? '';
    groups.set(group, (groups.get(group) ?? 0) + 1);
  }
  const parts: string[] = [];
  const at = (group: string) => groups.get(group) ?? 0;
  if (at('color')) parts.push(plural(at('color'), 'color'));
  if (at('font')) parts.push(plural(at('font'), 'font'));
  if (at('text')) parts.push(plural(at('text'), 'type size'));
  if (at('space')) parts.push(plural(at('space'), 'space step'));
  if (at('radius')) parts.push(plural(at('radius'), 'radius', 'radii'));
  if (at('shadow')) parts.push(plural(at('shadow'), 'shadow'));
  const extras = harvest.extras?.length ?? 0;
  if (extras) parts.push(plural(extras, 'extra token'));
  if (harvest.googleFontsUrl) parts.push('Google Fonts link');
  return { detail: parts.join(', '), total: harvest.candidates.length + extras };
}

const UNMAPPED_SHOWN = 8;

function unmappedNote(unmapped: string[] | undefined): string | undefined {
  if (!unmapped || unmapped.length === 0) return undefined;
  const shown = unmapped.slice(0, UNMAPPED_SHOWN).join(', ');
  const more = unmapped.length > UNMAPPED_SHOWN ? `, and ${unmapped.length - UNMAPPED_SHOWN} more` : '';
  return `Not mapped (${unmapped.length}): ${shown}${more}.`;
}

function harvested(harvest: Harvest, kind: DraftSourceStatus['kind'], label: string, thinText: string): SourceResult {
  const result = harvestedState(harvest, kind, label, thinText);
  const note = unmappedNote(harvest.unmapped);
  return note ? { ...result, note } : result;
}

function harvestedState(harvest: Harvest, kind: DraftSourceStatus['kind'], label: string, thinText: string): SourceResult {
  const { detail, total } = countDetail(harvest);
  const report: SourceReport = { kind: harvest.source, label, ok: true, found: total };
  if (total >= THIN_VALUES) return { state: 'read', detail, harvest, report };
  if (kind === 'brief') return { state: 'read', detail: total > 0 ? `${detail}. The AI step reads the rest.` : 'Kept for the AI step', harvest, report };
  if (kind === 'design-md') return { state: 'read', detail: total > 0 ? `Used as DESIGN.md. ${detail}` : 'Used as DESIGN.md', harvest, report };
  return { state: 'thin', detail: total > 0 ? `Found only ${detail}. ${thinText}` : `Found no design values. ${thinText}`, harvest, report };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function urlProblem(error: unknown): { state: 'blocked' | 'failed'; detail: string } {
  const message = errorText(error);
  if (error instanceof FetchBlockedError) return { state: 'blocked', detail: `This address is on a private or local network, so the studio does not read it. ${PASTE_HINT}` };
  if (/\b(401|403|407|429|451)\b|forbidden|captcha|challenge|access denied|bot/i.test(message)) return { state: 'blocked', detail: `This site blocks automated reading. ${PASTE_HINT}` };
  if (/\b404\b|\b410\b/.test(message)) return { state: 'failed', detail: 'The site answered "page not found". Check the address and make a new draft.' };
  if (/time limit|timed? ?out|ETIMEDOUT|SiteTimeLimit/i.test(message) || (error instanceof Error && error.name === 'SiteTimeLimitError')) return { state: 'failed', detail: `The site did not answer in time. ${PASTE_HINT}` };
  if (/ENOTFOUND|EAI_AGAIN|has no address/i.test(message)) return { state: 'failed', detail: 'The studio could not find this site. Check the address.' };
  if (/ECONNREFUSED/i.test(message)) return { state: 'failed', detail: 'Nothing answered at this address. Check that the site is up and the address is right.' };
  if (/ECONNRESET|socket hang up/i.test(message)) return { state: 'failed', detail: `The site closed the connection. ${PASTE_HINT}` };
  return { state: 'failed', detail: `The studio could not read this site. ${PASTE_HINT}` };
}

function urlNote(result: UrlHarvest): string | undefined {
  const notes = (result.notes ?? []).filter((note) => !result.blocked || !note.includes(result.blocked));
  if (result.screenshot) notes.push(result.screenshot.length <= MAX_SHOT_BYTES ? 'The page screenshot goes to the AI step.' : 'The page screenshot was too large for the AI step.');
  return notes.length > 0 ? notes.join(' ') : undefined;
}

function urlResult(result: UrlHarvest): SourceResult {
  const thinText = result.method === 'browser' ? PASTE_HINT : `The site may set its styles with JavaScript. ${PASTE_HINT}`;
  const base = harvested(result.harvest, 'url', result.snapshot.url, thinText);
  const extra = { url: result, report: { kind: 'url' as const, label: result.snapshot.url, ok: true, found: base.report.found }, ...(result.method ? { method: result.method } : {}) };
  const note = urlNote(result);
  const withNote = note ? { note } : {};
  if (result.blocked) return { ...base, ...extra, ...withNote, state: 'blocked', detail: `This site blocks automated reading (${result.blocked}). The studio kept what a plain read found${base.detail && base.state === 'read' ? `: ${base.detail}` : ''}. ${PASTE_HINT}` };
  return { ...base, ...extra, ...withNote };
}

async function readSource(source: Planned, request: DraftRequest, fetcher: Fetcher): Promise<SourceResult> {
  const failed = (detail: string, error: unknown, kind: SourceReport['kind']): SourceResult => ({ state: 'failed', detail, report: { kind, label: source.label, ok: false, found: 0, error: errorText(error) } });
  if (source.kind === 'design-md') return harvested(harvestDesignText(request.designMd ?? '', 'design-md', 'DESIGN.md'), 'design-md', 'DESIGN.md', '');
  if (source.kind === 'brief') return harvested(harvestDesignText(request.brief ?? '', 'brief', 'brief'), 'brief', 'brief', '');
  if (source.kind === 'tokens-file' && request.tokensFile) {
    try {
      return harvested(harvestTokensFile(request.tokensFile.text, source.label), 'tokens-file', source.label, 'The base pack fills the rest.');
    } catch (error) {
      if (error instanceof TokensFileError) return failed(`The studio could not read this tokens file: ${error.message}. Export it again from Figma (Variables JSON), Tokens Studio or as DTCG JSON or CSS.`, error, 'tokens-file');
      throw error;
    }
  }
  if (source.kind === 'folder' && request.folderPath) {
    try {
      const folder = await scanFolder(request.folderPath.trim());
      return { ...harvested(folder.harvest, 'folder', folder.harvest.label, 'The folder has few CSS, SCSS or Tailwind values. The base pack fills the rest.'), folder };
    } catch (error) {
      if (error instanceof FolderScanError) return failed(`${error.message.replace(/\.$/, '')}. Choose another folder.`, error, 'folder');
      throw error;
    }
  }
  const index = Number(source.id.replace('url-', '')) - 1;
  const url = request.urls[index] ?? '';
  try {
    const result = await harvestUrl(url, fetcher);
    return urlResult(result);
  } catch (error) {
    const problem = urlProblem(error);
    return { state: problem.state, detail: problem.detail, report: { kind: 'url', label: url, ok: false, found: 0, error: errorText(error) } };
  }
}

function pendingGroups(entries: CoverageEntry[], done: boolean): KitGroup[] {
  if (done) return [];
  const filled = (prefixes: string[]) => entries.some((entry) => entry.confidence !== 'fallback' && entry.source !== 'derived' && prefixes.some((prefix) => entry.token.startsWith(prefix)));
  const groups: Record<KitGroup, boolean> = {
    colors: filled(['color.']),
    type: filled(['font.', 'text.']),
    spacing: filled(['space.']),
    radius: filled(['radius.', 'shadow.']),
    components: filled(['color.']),
  };
  return KIT_GROUPS.filter((group) => !groups[group]);
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null;
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

async function writeFiles(workTree: string, files: DraftFile[]): Promise<void> {
  for (const file of files) {
    const target = path.join(workTree, file.path);
    if (!target.startsWith(workTree + path.sep)) throw new Error(`draft file outside the work tree: ${file.path}`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
}

async function updateMeta(workTree: string, draft: Draft, job: Job): Promise<void> {
  const file = path.join(workTree, META_FILE);
  const meta = (await readJson<Record<string, unknown>>(file)) ?? {};
  const listed = Array.isArray(meta.attachments) ? (meta.attachments as unknown[]) : [];
  const shots = job.shots.map((item) => ({ id: item.id, name: item.name, mime: item.mime, from: 'website screenshot' }));
  const extra = job.logo ? [job.logo] : [];
  const next = { ...meta, inputs: draft.inputs, attachments: [...listed, ...shots], files: [KIT_PAGE_FILE, ...extra, ...draft.files.map((item) => item.path)] };
  await writeFile(file, `${JSON.stringify(next, null, 2)}\n`);
}

interface Job {
  state: DraftSourcesState;
  planned: Planned[];
  results: Map<string, SourceResult>;
  chain: Promise<void>;
  shots: Attachment[];
  logo: string | null;
}

function staleState(state: DraftSourcesState): DraftSourcesState {
  if (state.done) return state;
  const sources = state.sources.map((source) => (FINAL_STATES.has(source.state) ? source : { ...source, state: 'failed' as const, detail: 'The studio stopped before it read this source. Make a new draft to try again.' }));
  return { ...state, sources, done: true, improve: state.improve.state === 'waiting' ? { state: 'skipped', reason: 'The studio stopped while it read the sources.' } : state.improve };
}

function merge(job: Job): Harvested {
  const out = emptyHarvested();
  const ordered = ['tokens-file', 'folder', 'url', 'design-md', 'brief'];
  const done = job.planned
    .map((source) => ({ source, result: job.results.get(source.id) }))
    .filter((item): item is { source: Planned; result: SourceResult } => item.result !== undefined)
    .sort((a, b) => ordered.indexOf(a.source.kind) - ordered.indexOf(b.source.kind) || a.source.order - b.source.order);
  for (const { result } of done) {
    if (result.harvest) out.harvests.push(result.harvest);
    if (result.url) out.urlHarvests.push(result.url);
    if (result.folder) out.folder = result.folder;
    out.reports.push(result.report);
  }
  const images = job.state.sources.find((source) => source.kind === 'images');
  if (images) out.reports.push({ kind: 'images', label: images.detail.split(':')[0] ?? 'images', ok: true, found: 0 });
  return out;
}

export function createLiveDrafts(deps: LiveDraftDeps): LiveDrafts {
  const jobs = new Map<string, Job>();
  const stateFile = (projectId: string) => path.join(deps.projectDir(projectId), STATE_FILE);

  const save = async (projectId: string, job: Job): Promise<void> => {
    await writeFile(stateFile(projectId), `${JSON.stringify(job.state, null, 2)}\n`);
    deps.emit(await deps.getProject(projectId), job.state);
  };

  const setSource = (job: Job, id: string, patch: Partial<DraftSourceStatus>) => {
    job.state = { ...job.state, sources: job.state.sources.map((source) => (source.id === id ? { ...source, ...patch } : source)) };
  };

  const rebuild = async (projectId: string, input: LiveDraftStart, job: Job, done: boolean): Promise<void> => {
    await deps.withMain(projectId, async (project, direction) => {
      const merged = merge(job);
      const logo = job.logo ?? undefined;
      const first = assembleDraft(input.request, input.base, merged, [], logo);
      const draft = done ? first : assembleDraft(input.request, input.base, merged, pendingGroups(first.coverage.tokens, done), logo);
      const pack = await deps.library.updateUserPack(input.packId, { ...draft.pack, draft: true });
      await applyPack(project, direction.workTree, pack);
      const files = done ? draft.files : draft.files.filter((file) => file.path.endsWith('coverage.json'));
      await writeFiles(direction.workTree, [{ path: KIT_PAGE_FILE, content: draft.kitHtml }, ...files]);
      if (done) await updateMeta(direction.workTree, draft, job);
    });
  };

  const finish = async (projectId: string, input: LiveDraftStart, job: Job): Promise<void> => {
    await rebuild(projectId, input, job, true);
    job.state = { ...job.state, done: true, finishedAt: Date.now() };
    const read = [...job.results.values()].some((result) => result.report.ok) || job.state.sources.some((source) => source.kind === 'images');
    await deps.commit(await deps.getProject(projectId), 'Read sources');
    if (job.state.improve.state !== 'waiting') return;
    if (!read) {
      job.state = { ...job.state, improve: { state: 'skipped', reason: 'No source could be read. Fix the sources above, or use Improve with AI.' } };
      return;
    }
    job.state = { ...job.state, improve: { state: 'started' } };
    await save(projectId, job);
    try {
      job.state = { ...job.state, improve: await deps.startImprove(projectId) };
    } catch (error) {
      job.state = { ...job.state, improve: { state: 'skipped', reason: `The AI step did not start: ${errorText(error)}` } };
    }
  };

  const keepPageImages = async (projectId: string, job: Job, source: Planned, result: SourceResult): Promise<void> => {
    const shot = result.url?.screenshot;
    if (shot && shot.length <= MAX_SHOT_BYTES) job.shots.push(await deps.saveAttachment(projectId, { name: `${source.id}-screenshot.png`, mime: 'image/png', bytes: new Uint8Array(shot) }));
    const logo = result.url?.logo;
    if (!logo || job.logo) return;
    const relative = `${SOURCE_DIR}/${source.id}/${LOGO_FILE}`;
    await deps.withMain(projectId, async (_project, direction) => {
      await mkdir(path.join(direction.workTree, SOURCE_DIR, source.id), { recursive: true });
      await writeFile(path.join(direction.workTree, relative), logo);
    });
    job.logo = relative;
  };

  const runSource = async (projectId: string, input: LiveDraftStart, job: Job, source: Planned): Promise<void> => {
    const startedAt = Date.now();
    job.chain = job.chain.then(async () => {
      setSource(job, source.id, { state: 'reading', detail: 'Reading…' });
      await save(projectId, job);
    });
    await job.chain;
    let result: SourceResult;
    try {
      result = await readSource(source, input.request, deps.fetcher);
    } catch (error) {
      result = { state: 'failed', detail: `The studio could not read this source: ${errorText(error)}`, report: { kind: source.kind === 'images' ? 'images' : source.kind, label: source.label, ok: false, found: 0, error: errorText(error) } };
    }
    job.chain = job.chain.then(async () => {
      job.results.set(source.id, result);
      await keepPageImages(projectId, job, source, result).catch((error: unknown) => console.error('[design-systems] could not keep the page screenshot or logo', error));
      setSource(job, source.id, { state: result.state, detail: result.detail, ms: Date.now() - startedAt, ...(result.note ? { note: result.note } : {}), ...(result.method ? { method: result.method } : {}) });
      await rebuild(projectId, input, job, false).catch((error: unknown) => console.error('[design-systems] could not update the draft after a source', error));
      await save(projectId, job);
    });
    await job.chain;
  };

  const run = async (input: LiveDraftStart, job: Job): Promise<void> => {
    const projectId = input.project.id;
    const local = job.planned.filter((source) => source.kind !== 'url');
    const urls = job.planned.filter((source) => source.kind === 'url');
    for (const source of local) await runSource(projectId, input, job, source);
    const queue = [...urls];
    await Promise.all(
      Array.from({ length: Math.min(URL_CONCURRENCY, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) await runSource(projectId, input, job, next);
      }),
    );
    await job.chain;
    await finish(projectId, input, job);
    await save(projectId, job);
  };

  return {
    plan(request, imageCount) {
      return { sources: planSources(request, imageCount), done: false, startedAt: Date.now(), improve: { state: 'waiting' } };
    },
    start(input) {
      const projectId = input.project.id;
      const fresh = this.plan(input.request, input.imageCount);
      const state: DraftSourcesState = input.autoImprove === false ? { ...fresh, improve: { state: 'skipped', reason: IMPROVE_IN_APP } } : fresh;
      const planned = state.sources.map((source, order) => ({ ...source, order })).filter((source) => source.kind !== 'images');
      const job: Job = { state, planned, results: new Map(), chain: Promise.resolve(), shots: [], logo: null };
      jobs.set(projectId, job);
      void save(projectId, job)
        .then(() => run(input, job))
        .catch(async (error: unknown) => {
          console.error('[design-systems] reading the sources failed', error);
          job.state = staleState({ ...job.state, improve: { state: 'skipped', reason: `Reading the sources failed: ${errorText(error)}` } });
          await save(projectId, job).catch(() => undefined);
        })
        .finally(() => jobs.delete(projectId));
    },
    async read(projectId) {
      const live = jobs.get(projectId);
      if (live) return live.state;
      const stored = await readJson<DraftSourcesState>(stateFile(projectId));
      return stored ? staleState(stored) : null;
    },
    isReading(projectId) {
      const job = jobs.get(projectId);
      return job !== undefined && !job.state.done;
    },
  };
}
