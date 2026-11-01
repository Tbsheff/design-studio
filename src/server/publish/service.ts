import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type { Direction, Project } from '../../shared/contracts.js';
import { PUBLISH_EXPIRY_DAYS, PUBLISH_MAX_FRAMES, PUBLISH_PASSWORD_MAX, PUBLISH_PASSWORD_MIN, type Publication, type PublishExpiryDays, type PublishKind, type PublishPlan, type PublishPlanInput } from '../../shared/publish.js';
import type { ShareFrame } from '../../shared/share.js';
import { resolveSource, type ExportDeps, type ExportSource } from '../export/source.js';
import { framesOf } from '../http/share-routes.js';
import { captureShare } from '../share/snapshot.js';
import type { CommentStore } from '../store/comments.js';
import { BadRequestError, ConflictError, NotFoundError, assertSafeId } from '../store/errors.js';
import { createKeyedMutex } from '../store/mutex.js';
import { buildSiteBundle, BundleError } from './bundle.js';
import { cliFailure, deployedUrl, runCf } from './cli.js';
import { createCliSession, type CliSession } from './session.js';
import { scrubCliText, tailLines } from './scrub.js';
import { createPublishStore, toPublication, type PublicationRecord, type PublishStore } from './store.js';
import { viewerComments, writeViewer } from './viewer.js';
import { hashPassword, workerScript, type PasswordHash } from './worker-script.js';

export interface PublishDeps extends ExportDeps {
  dataDir: string;
  comments: CommentStore;
  secrets: string[];
}

interface HeldPlan {
  plan: PublishPlan;
  stage: string;
  pass: PasswordHash | null;
  frames: PublicationRecord['frames'];
  frameIds: string[] | null;
  withComments: boolean;
}

interface Built {
  kind: PublishKind;
  pages: string[];
  files: string[];
  bytes: number;
  comments: number;
  frames: PublicationRecord['frames'];
  frameIds: string[] | null;
}

export interface PublishService {
  cli: CliSession;
  list(projectId: string): Promise<Publication[]>;
  plan(projectId: string, input: PublishPlanInput): Promise<PublishPlan>;
  publish(projectId: string, planId: string): Promise<Publication>;
  unpublish(projectId: string, id: string): Promise<Publication>;
}

const PLAN_TTL_MS = 30 * 60_000;
const MAX_PLANS = 6;
const COMPATIBILITY_DATE = '2026-10-23';

export function workerNameFor(projectName: string): string {
  const slug = projectName.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24).replace(/-+$/, '') || 'design';
  const rand = randomBytes(6).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').padEnd(6, '0').slice(0, 6);
  return `${/^[a-z]/.test(slug) ? '' : 'd-'}${slug}-${rand}`;
}

export function kindOf(project: Project): PublishKind {
  return project.kind === 'html' && !project.app ? 'site' : 'viewer';
}

function expiryOf(input: PublishPlanInput, prior: PublicationRecord | null): number | null {
  if (input.expiresInDays === undefined) return prior ? prior.expiresAt : Date.now() + 7 * 86_400_000;
  if (!PUBLISH_EXPIRY_DAYS.includes(input.expiresInDays)) throw new BadRequestError(`expiresInDays must be one of ${PUBLISH_EXPIRY_DAYS.join(', ')}`);
  const days: PublishExpiryDays = input.expiresInDays;
  return days === 0 ? null : Date.now() + days * 86_400_000;
}

function passwordOf(input: PublishPlanInput, prior: PublicationRecord | null): PasswordHash | null {
  if (typeof input.password === 'string' && input.password !== '') {
    if (input.password.length < PUBLISH_PASSWORD_MIN || input.password.length > PUBLISH_PASSWORD_MAX) throw new BadRequestError(`The password must be ${PUBLISH_PASSWORD_MIN} to ${PUBLISH_PASSWORD_MAX} characters.`);
    return hashPassword(input.password);
  }
  return prior && input.keepPassword !== false ? prior.pass : null;
}

function titleOf(raw: unknown, fallback: string): string {
  const text = typeof raw === 'string' ? raw.replace(/[\p{Cc}\s]+/gu, ' ').trim().slice(0, 120) : '';
  return text || fallback;
}

async function writeWorker(stage: string, name: string, kind: PublishKind, title: string, expiresAt: number | null, pass: PasswordHash | null): Promise<string> {
  const root = path.join(stage, '.cloudflare', 'output', 'v0');
  const worker = path.join(root, 'workers', 'default');
  await mkdir(path.join(worker, 'bundle'), { recursive: true });
  await writeFile(path.join(root, 'config.json'), JSON.stringify({ buildContext: { isPreview: false } }));
  await writeFile(path.join(worker, 'bundle', 'worker.js'), workerScript({ kind, title, expiresAt, password: pass }));
  const config = {
    name,
    compatibilityDate: COMPATIBILITY_DATE,
    workersDev: true,
    previewUrls: false,
    assets: { htmlHandling: 'auto-trailing-slash', notFoundHandling: 'none', runWorkerFirst: true },
    env: { ASSETS: { type: 'assets' } },
    manifest: { type: 'complete', mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm' } } },
  };
  await writeFile(path.join(worker, 'worker.config.json'), JSON.stringify(config, null, 2));
  return path.join(worker, 'assets');
}

export function assetsDirOf(stage: string): string {
  return path.join(stage, '.cloudflare', 'output', 'v0', 'workers', 'default', 'assets');
}

function directionOf(project: Project, raw: unknown): Direction {
  const did = typeof raw === 'string' ? assertSafeId(raw, 'directionId') : (project.directions.find((d) => d.id === 'main') ?? project.directions[0])?.id;
  const direction = project.directions.find((d) => d.id === did);
  if (!direction) throw new NotFoundError('direction not found');
  return direction;
}

export function createPublishService(deps: PublishDeps): PublishService {
  const store: PublishStore = createPublishStore(deps.dataDir);
  const cli = createCliSession(store);
  const plans = new Map<string, HeldPlan>();
  const deployLock = createKeyedMutex();
  const stagingRoot = path.join(store.dir, 'staging');
  void rm(stagingRoot, { recursive: true, force: true });

  const sweep = async (): Promise<void> => {
    const now = Date.now();
    const old = [...plans.values()].filter((p) => p.plan.planExpiresAt < now).concat([...plans.values()].slice(0, Math.max(0, plans.size - MAX_PLANS + 1)));
    for (const held of old) {
      plans.delete(held.plan.id);
      await rm(held.stage, { recursive: true, force: true });
    }
  };

  const buildViewer = async (source: ExportSource, direction: Direction, input: PublishPlanInput, prior: PublicationRecord | null, assets: string, stage: string): Promise<Built> => {
    const given = input.frames ?? prior?.frames ?? undefined;
    const ids = input.frameIds ?? prior?.frameIds ?? undefined;
    const { frames, ids: frameIds } = await framesOf(deps, source.project, direction, given, ids);
    if (frames.length > PUBLISH_MAX_FRAMES) throw new BadRequestError(`publish at most ${PUBLISH_MAX_FRAMES} frames`);
    const shotsDir = path.join(stage, 'shots');
    const shots: ShareFrame[] = await captureShare(deps.preview, source, frames, shotsDir, frameIds);
    const withComments = input.comments ?? prior?.withComments ?? false;
    const comments = withComments ? viewerComments(await deps.comments.list(source.project.id, direction.id), shots) : [];
    const out = await writeViewer(assets, shotsDir, { title: titleOf(input.title, prior?.title ?? source.project.name), versionLabel: source.version.title?.slice(0, 60) || `Version ${source.version.id.slice(0, 7)}`, publishedAt: Date.now(), frames: shots, comments });
    await rm(shotsDir, { recursive: true, force: true });
    const pages = shots.map((s) => `${s.name}${s.path ? ` (${s.path})` : ''}`);
    return { kind: 'viewer', pages, files: out.files, bytes: out.bytes, comments: comments.length, frames, frameIds: frameIds.map((id) => id ?? '').filter(Boolean) };
  };

  const buildSite = async (source: ExportSource, assets: string): Promise<Built> => {
    const root = await deps.versions.snapshot(source.project, source.version.id);
    const out = await buildSiteBundle(root, assets, deps.secrets).catch((error: unknown) => {
      throw error instanceof BundleError ? new BadRequestError(error.message) : error;
    });
    return { kind: 'site', pages: out.pages, files: out.files, bytes: out.bytes, comments: 0, frames: null, frameIds: null };
  };

  const priorOf = async (projectId: string, raw: unknown): Promise<PublicationRecord | null> => {
    if (raw === undefined || raw === null) return null;
    const found = await store.get(assertSafeId(String(raw), 'publicationId'));
    if (!found || found.projectId !== projectId) throw new NotFoundError('publication not found');
    if (found.status === 'removed') throw new BadRequestError('This publication was unpublished. Publish it as a new link.');
    return found;
  };

  const plan = async (projectId: string, input: PublishPlanInput): Promise<PublishPlan> => {
    const ready = await cli.ready();
    const project = await deps.projects.get(assertSafeId(projectId, 'projectId'));
    const prior = await priorOf(project.id, input.publicationId);
    const direction = directionOf(project, input.directionId ?? prior?.directionId);
    const versionId = typeof input.versionId === 'string' ? input.versionId : direction.headVersionId;
    if (!versionId) throw new BadRequestError('Save a version before you publish it.');
    const source = await resolveSource(deps, project.id, versionId);
    await sweep();
    const id = nanoid(12);
    const stage = path.join(stagingRoot, id);
    try {
      const workerName = prior?.workerName ?? workerNameFor(project.name);
      const pass = passwordOf(input, prior);
      const expiresAt = expiryOf(input, prior);
      const title = titleOf(input.title, prior?.title ?? project.name);
      const assets = await writeWorker(stage, workerName, kindOf(project), title, expiresAt, pass);
      await mkdir(assets, { recursive: true });
      const built = kindOf(project) === 'site' ? await buildSite(source, assets) : await buildViewer(source, direction, input, prior, assets, stage);
      const dry = await runCf(ready.bin, ['deploy', '--prebuilt', '--dry-run'], { cwd: stage, accountId: ready.accountId });
      if (dry.code !== 0) throw new BadRequestError(cliFailure(dry, 'The cf dry run failed.'));
      const now = Date.now();
      const subdomain = ready.subdomain;
      const result: PublishPlan = {
        id,
        projectId: project.id,
        directionId: direction.id,
        versionId: source.version.id,
        kind: built.kind,
        title,
        workerName,
        url: subdomain ? `https://${workerName}.${subdomain}.workers.dev` : (prior?.url ?? null),
        urlPattern: `https://${workerName}.<your-subdomain>.workers.dev`,
        pages: built.pages,
        fileCount: built.files.length,
        bytes: built.bytes,
        password: pass !== null,
        expiresAt,
        comments: built.comments,
        createdAt: now,
        planExpiresAt: now + PLAN_TTL_MS,
        check: scrubCliText(tailLines(dry.stderr + dry.stdout, 8)),
        republishOf: prior?.id ?? null,
        accountId: ready.accountId,
      };
      plans.set(id, { plan: result, stage, pass, frames: built.frames, frameIds: built.frameIds, withComments: built.comments > 0 || input.comments === true });
      return result;
    } catch (error) {
      await rm(stage, { recursive: true, force: true });
      throw error;
    }
  };

  const recordFor = async (held: HeldPlan): Promise<PublicationRecord> => {
    const p = held.plan;
    const prior = p.republishOf ? await store.get(p.republishOf) : null;
    const now = Date.now();
    return {
      id: prior?.id ?? nanoid(12),
      projectId: p.projectId,
      directionId: p.directionId,
      versionId: p.versionId,
      kind: p.kind,
      title: p.title,
      workerName: p.workerName,
      accountId: p.accountId,
      url: prior?.url ?? p.url,
      pages: p.pages,
      fileCount: p.fileCount,
      bytes: p.bytes,
      password: p.password,
      expiresAt: p.expiresAt,
      createdAt: prior?.createdAt ?? now,
      updatedAt: now,
      status: 'publishing',
      error: null,
      log: '',
      pass: held.pass,
      frames: held.frames,
      frameIds: held.frameIds,
      withComments: held.withComments,
    };
  };

  const deploy = async (held: HeldPlan, record: PublicationRecord): Promise<PublicationRecord> => {
    const ready = await cli.ready();
    if (ready.accountId !== held.plan.accountId) throw new ConflictError('The Cloudflare account changed after this check. Check it again.');
    const out = await runCf(ready.bin, ['deploy', '--prebuilt', '--message', `Design Studio ${held.plan.versionId.slice(0, 7)}`], { cwd: held.stage, accountId: ready.accountId });
    const text = `${out.stderr}\n${out.stdout}`;
    const log = scrubCliText(tailLines(text), deps.secrets);
    if (out.code !== 0) return { ...record, status: 'failed', error: cliFailure(out, 'Publish failed.'), log, updatedAt: Date.now() };
    const found = deployedUrl(text, held.plan.workerName);
    if (found) await cli.learnSubdomain(ready.accountId, found.subdomain);
    return { ...record, status: 'live', error: null, url: found?.url ?? record.url, log, updatedAt: Date.now() };
  };

  const publish = async (projectId: string, planId: string): Promise<Publication> => {
    const held = plans.get(assertSafeId(planId, 'planId'));
    if (!held || held.plan.projectId !== projectId) throw new NotFoundError('This publish check ended. Check it again.');
    if (held.plan.planExpiresAt < Date.now()) throw new BadRequestError('This publish check is older than 30 minutes. Check it again.');
    plans.delete(planId);
    try {
      const record = await store.put(await recordFor(held));
      const done = await deployLock('deploy', () => deploy(held, record));
      return toPublication(await store.put(done));
    } finally {
      await rm(held.stage, { recursive: true, force: true });
    }
  };

  const unpublish = async (projectId: string, id: string): Promise<Publication> => {
    const found = await store.get(assertSafeId(id, 'publicationId'));
    if (!found || found.projectId !== projectId) throw new NotFoundError('publication not found');
    if (found.status === 'removed') return toPublication(found);
    const ready = await cli.ready(found.accountId);
    const out = await deployLock('deploy', () => runCf(ready.bin, ['workers', 'delete', found.workerName, '--force'], { cwd: store.dir, accountId: found.accountId }));
    const text = scrubCliText(`${out.stderr}\n${out.stdout}`, deps.secrets);
    const gone = out.code === 0 || /not found|does not exist|10007/i.test(text);
    if (!gone) throw new BadRequestError(cliFailure(out, 'Unpublish failed.'));
    return toPublication(await store.put({ ...found, status: 'removed', error: null, log: tailLines(text, 20), updatedAt: Date.now() }));
  };

  return {
    cli,
    list: async (projectId) => (await store.list(projectId)).map(toPublication),
    plan,
    publish,
    unpublish,
  };
}
