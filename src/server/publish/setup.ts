import { createHash, randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { WORKER_NAME } from '../../../cloud/publish-worker/src/protocol.js';
import type { PublishBackendMode, PublishBackendState, SetupStep, SetupStepId } from '../../shared/publish.js';
import { BadRequestError } from '../store/errors.js';
import { cfVersion, cliFailure, deployedUrl, resolveCf, runCf, type CliResult } from './cli.js';
import { createLocalRuntime, LOCAL_D1_ID, type LocalRuntime } from './local-runtime.js';
import { remoteClient, type Endpoint } from './remote.js';
import { scrubCliText, tailLines } from './scrub.js';
import type { CliSession } from './session.js';
import type { BackendSettings, PublishStore } from './store.js';
import type { KeyVault } from './vault.js';
import { findWorkerSource, PUBLISH_BUCKET, PUBLISH_DATABASE, writeBuildOutput, type WorkerSource } from './worker-build.js';

export interface PublishBackend {
  state(check?: boolean): Promise<PublishBackendState>;
  start(mode: PublishBackendMode): Promise<PublishBackendState>;
  endpoint(): Promise<Endpoint & { mode: PublishBackendMode }>;
  localAllowed: boolean;
}

interface Run {
  mode: PublishBackendMode;
  bin: string;
  accountId: string | null;
  source: WorkerSource;
  databaseId: string | null;
  key: string | null;
  url: string | null;
}

interface StepResult {
  status: 'done' | 'skipped';
  detail: string;
  command?: string;
}

type StepFn = (run: Run) => Promise<StepResult>;

const LABELS: Record<SetupStepId, string> = {
  cli: 'Check the Cloudflare CLI',
  bucket: 'R2 bucket for design files',
  database: 'D1 database for publications',
  migrations: 'Database tables',
  key: 'Publish key',
  deploy: 'Deploy the publish Worker',
  health: 'Check the Worker answers',
};

const ORDER: SetupStepId[] = ['cli', 'bucket', 'database', 'migrations', 'key', 'deploy', 'health'];
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

function jsonValues(text: string): unknown[] {
  const out: unknown[] = [];
  for (const [open, close] of [['[', ']'], ['{', '}']] as const) {
    const start = text.indexOf(open);
    const end = text.lastIndexOf(close);
    if (start < 0 || end <= start) continue;
    try {
      out.push(JSON.parse(text.slice(start, end + 1)));
    } catch {
      continue;
    }
  }
  return out;
}

function findNamed(value: unknown, name: string, depth = 0): Record<string, unknown> | null {
  if (depth > 6 || value === null || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findNamed(item, name, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  const rec = value as Record<string, unknown>;
  if (rec.name === name) return rec;
  for (const child of Object.values(rec)) {
    const hit = findNamed(child, name, depth + 1);
    if (hit) return hit;
  }
  return null;
}

export function namedResource(text: string, name: string): Record<string, unknown> | null {
  for (const value of jsonValues(text)) {
    const hit = findNamed(value, name);
    if (hit) return hit;
  }
  return null;
}

function show(args: string[]): string {
  return ['cf', ...args.map((a) => (/^[\w./:@=-]+$/.test(a) ? a : JSON.stringify(a)))].join(' ');
}

function lastLines(out: CliResult): string {
  return scrubCliText(tailLines(`${out.stdout}\n${out.stderr}`, 3)).slice(0, 400);
}

export function createPublishBackend(store: PublishStore, cli: CliSession, vault: KeyVault): PublishBackend {
  const localAllowed = process.env.STUDIO_PUBLISH_LOCAL === '1';
  const localDir = path.join(store.dir, 'local');
  const runtime: LocalRuntime = createLocalRuntime(localDir);
  let steps: SetupStep[] = [];
  let running = false;
  let lastError: string | null = null;

  const cf = async (run: Run, args: string[], cwd = store.dir): Promise<CliResult> => {
    if (run.mode === 'local' && !args.includes('--local')) throw new BadRequestError(`Local setup refused to run ${show(args)} because it would reach Cloudflare.`);
    return runCf(run.bin, args, { cwd, accountId: run.accountId });
  };

  const mark = (id: SetupStepId, patch: Partial<SetupStep>) => {
    steps = steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
  };

  const cliStep: StepFn = async (run) => {
    if (run.mode === 'local') {
      const version = await cfVersion(run.bin, store.dir);
      return { status: 'done', detail: `cf ${version ?? 'found'}. Local mode needs no sign-in.`, command: 'cf --version' };
    }
    const ready = await cli.ready();
    run.accountId = ready.accountId;
    return { status: 'done', detail: `Signed in. Account ${ready.accountId.slice(0, 8)}…`, command: 'cf auth whoami' };
  };

  const bucketStep: StepFn = async (run) => {
    if (run.mode === 'local') return { status: 'skipped', detail: 'Local R2 needs no bucket. Files go to the local state folder.' };
    const list = await cf(run, ['r2', 'buckets', 'list']);
    if (list.code === 0 && namedResource(list.stdout, PUBLISH_BUCKET)) return { status: 'done', detail: `Bucket ${PUBLISH_BUCKET} is already there.`, command: show(['r2', 'buckets', 'list']) };
    const args = ['r2', 'buckets', 'create', '--name', PUBLISH_BUCKET];
    const made = await cf(run, args);
    if (made.code !== 0 && !/already exists|10004/i.test(`${made.stdout}${made.stderr}`)) throw new BadRequestError(cliFailure(made, 'The R2 bucket was not made.'));
    return { status: 'done', detail: `Made bucket ${PUBLISH_BUCKET}.`, command: show(args) };
  };

  const databaseStep: StepFn = async (run) => {
    if (run.mode === 'local') {
      run.databaseId = LOCAL_D1_ID;
      return { status: 'done', detail: `Local database ${LOCAL_D1_ID.slice(0, 8)}…` };
    }
    const list = await cf(run, ['d1', 'list', '--name', PUBLISH_DATABASE]);
    const found = list.code === 0 ? namedResource(list.stdout, PUBLISH_DATABASE) : null;
    const knownId = found ? String(found.uuid ?? found.id ?? '') : '';
    if (UUID.test(knownId)) {
      run.databaseId = knownId;
      return { status: 'done', detail: `Database ${PUBLISH_DATABASE} is already there (${knownId.slice(0, 8)}…).`, command: show(['d1', 'list', '--name', PUBLISH_DATABASE]) };
    }
    const args = ['d1', 'create', '--name', PUBLISH_DATABASE];
    const made = await cf(run, args);
    const id = UUID.exec(made.stdout)?.[0];
    if (made.code !== 0 || !id) throw new BadRequestError(cliFailure(made, 'The D1 database was not made.'));
    run.databaseId = id;
    return { status: 'done', detail: `Made database ${PUBLISH_DATABASE} (${id.slice(0, 8)}…).`, command: show(args) };
  };

  const migrationsStep: StepFn = async (run) => {
    const id = run.databaseId as string;
    const args = ['d1', 'migrations', 'apply', id, '--dir', run.source.migrations, ...(run.mode === 'local' ? ['--local', '--persist-to', runtime.stateDir] : [])];
    if (run.mode === 'local') await mkdir(runtime.stateDir, { recursive: true, mode: 0o700 });
    const out = await cf(run, args);
    if (out.code !== 0) throw new BadRequestError(cliFailure(out, 'The database tables were not made.'));
    const applied = (out.stdout.match(/"status":\s*"[^"]*"/g) ?? []).length;
    return { status: 'done', detail: applied > 0 ? `Applied ${applied} migration${applied === 1 ? '' : 's'}.` : 'Tables are up to date.', command: show(args.map((a) => (a === run.source.migrations ? 'migrations' : a === runtime.stateDir ? '<local state>' : a))) };
  };

  const keyStep: StepFn = async (run) => {
    const where = (await vault.kind()) === 'keychain' ? 'macOS Keychain' : 'a private file (the Keychain needs the desktop app)';
    const existing = await vault.get().catch(() => null);
    if (existing) {
      run.key = existing;
      return { status: 'done', detail: `Kept the key in ${where}.` };
    }
    run.key = randomBytes(32).toString('base64url');
    await vault.set(run.key);
    return { status: 'done', detail: `Made a new key and stored it in ${where}. Only its SHA-256 goes to Cloudflare.` };
  };

  const writeSecrets = async (dir: string, key: string): Promise<string> => {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, 'secrets.json');
    await writeFile(file, JSON.stringify({ PUBLISH_KEY_HASH: createHash('sha256').update(key).digest('hex') }), { mode: 0o600 });
    return file;
  };

  const deployLocal = async (run: Run): Promise<StepResult> => {
    const bundle = await writeBuildOutput(run.source, path.join(localDir, 'build'), { databaseId: run.databaseId as string });
    const secrets = await writeSecrets(localDir, run.key as string);
    run.url = await runtime.start({ bundle, secrets, runner: run.source.localRunner, databaseId: run.databaseId as string });
    return { status: 'done', detail: `Local Worker runs at ${run.url}`, command: `node cloud/publish-worker/scripts/local.mjs --port ${runtime.port}` };
  };

  const deployStep: StepFn = async (run) => {
    if (run.mode === 'local') return deployLocal(run);
    const stage = path.join(store.dir, 'deploy');
    await rm(stage, { recursive: true, force: true });
    await writeBuildOutput(run.source, stage, { databaseId: run.databaseId as string });
    const secrets = await writeSecrets(path.join(stage, '.secrets'), run.key as string);
    const args = ['deploy', '--prebuilt', '--secrets-file', secrets, '--message', 'Design Studio publish backend'];
    try {
      const out = await cf(run, args, stage);
      if (out.code !== 0) throw new BadRequestError(cliFailure(out, 'The Worker deploy failed.'));
      const found = deployedUrl(`${out.stdout}\n${out.stderr}`, WORKER_NAME);
      const known = (await store.settings()).subdomains[run.accountId ?? ''];
      run.url = found?.url ?? (known ? `https://${WORKER_NAME}.${known}.workers.dev` : null);
      if (!run.url) throw new BadRequestError(`The Worker deployed, but cf did not print its workers.dev address. ${lastLines(out)}`);
      if (found && run.accountId) await cli.learnSubdomain(run.accountId, found.subdomain);
      return { status: 'done', detail: `Deployed to ${run.url}`, command: show(args.map((a) => (a === secrets ? '<0600 secrets file>' : a))) };
    } finally {
      await rm(path.dirname(secrets), { recursive: true, force: true });
    }
  };

  const healthStep: StepFn = async (run) => {
    const reply = await remoteClient({ url: run.url as string, key: run.key as string }).health();
    await store.saveSettings({ backend: { mode: run.mode, url: run.url as string, accountId: run.accountId, databaseId: run.databaseId as string, setUpAt: Date.now() } });
    return { status: 'done', detail: `The Worker answers: schema ${reply.schema}, ${reply.publications} publication${reply.publications === 1 ? '' : 's'}.`, command: 'GET /api/health' };
  };

  const FNS: Record<SetupStepId, StepFn> = { cli: cliStep, bucket: bucketStep, database: databaseStep, migrations: migrationsStep, key: keyStep, deploy: deployStep, health: healthStep };

  const execute = async (run: Run): Promise<void> => {
    for (const id of ORDER) {
      mark(id, { status: 'running' });
      try {
        const result = await FNS[id](run);
        mark(id, { status: result.status, detail: result.detail, command: result.command ?? null });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        mark(id, { status: 'failed', detail: message });
        lastError = message;
        return;
      }
    }
  };

  const backendState = async (settings: BackendSettings | null, check: boolean): Promise<PublishBackendState> => {
    const kind = await vault.kind();
    const base: PublishBackendState = { mode: settings?.mode ?? null, ready: false, url: settings?.url ?? null, accountId: settings?.accountId ?? null, databaseId: settings?.databaseId ?? null, keyStore: kind, localAllowed, running, steps, setUpAt: settings?.setUpAt ?? null, error: lastError };
    if (!settings || running) return base;
    if (settings.mode === 'local' && !localAllowed) return { ...base, error: 'This backend is a local test server. Set it up for a Cloudflare account.' };
    if (!check) return { ...base, ready: true };
    try {
      await remoteClient(await endpoint()).health();
      return { ...base, ready: true, error: null };
    } catch (error) {
      return { ...base, error: error instanceof Error ? error.message : String(error) };
    }
  };

  const state = async (check = false) => backendState((await store.settings()).backend, check);

  const start = async (mode: PublishBackendMode): Promise<PublishBackendState> => {
    if (running) return state();
    if (mode === 'local' && !localAllowed) throw new BadRequestError('Local publishing is for development only (STUDIO_PUBLISH_LOCAL=1).');
    const source = findWorkerSource();
    if (!source) throw new BadRequestError('The publish Worker files are missing from this copy of Design Studio.');
    if (mode === 'local' && !source.localRunner) throw new BadRequestError('Local mode needs cloud/publish-worker with its packages installed (npm install in that folder).');
    const bin = await resolveCf();
    if (!bin) throw new BadRequestError('Install the Cloudflare CLI first (npm i -g cf).');
    running = true;
    lastError = null;
    steps = ORDER.map((id) => ({ id, label: LABELS[id], status: 'pending', command: null, detail: null }));
    const run: Run = { mode, bin, accountId: null, source, databaseId: null, key: null, url: null };
    void execute(run).finally(() => {
      running = false;
    });
    return state();
  };

  const endpoint = async (): Promise<Endpoint & { mode: PublishBackendMode }> => {
    const settings = (await store.settings()).backend;
    if (!settings) throw new BadRequestError('Set up publishing first in Settings → Publishing.');
    const key = await vault.get();
    if (!key) throw new BadRequestError('The publish key is missing on this Mac. Run Set up publishing again in Settings → Publishing.');
    if (settings.mode === 'local') {
      if (!localAllowed) throw new BadRequestError('This backend is a local test server. Set up publishing for a Cloudflare account.');
      const source = findWorkerSource();
      const url = await runtime.ensure({ bundle: path.join(localDir, 'build', '.cloudflare', 'output', 'v0', 'workers', 'default', 'bundle', 'worker.js'), secrets: path.join(localDir, 'secrets.json'), runner: source?.localRunner ?? null, databaseId: settings.databaseId });
      return { url, key, mode: 'local' };
    }
    return { url: settings.url, key, mode: 'cloudflare' };
  };

  return { state, start, endpoint, localAllowed };
}
