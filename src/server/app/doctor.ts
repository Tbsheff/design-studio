import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { AppDoctorResult, DoctorCause, DoctorFix } from '../../shared/app-doctor.js';
import { installHint } from './install-hint.js';

export interface DoctorProbe {
  status: number;
  location: string | null;
  body: string;
}

export interface DoctorInput {
  lines: string[];
  message: string | null;
  probe: DoctorProbe | null;
  workTree: string;
  appDir: string;
}

interface Ctx extends DoctorInput {
  appRoot: string;
  all: string[];
}

type Rule = (ctx: Ctx) => DoctorCause | null;

const MAX_EVIDENCE = 3;
const MAX_KEYS = 8;
const MAX_SOURCE_BYTES = 400_000;
const ENV_ERROR = /Invalid environment variables/;
const ENV_FILES = ['.env', '.env.local', '.env.development', '.env.development.local'];
const SCHEMA_CANDIDATES = ['env.ts', 'env.mjs', 'env.js', 'src/env.ts', 'src/env.mjs', 'src/env.js', 'lib/env.ts', 'src/lib/env.ts', 'env/index.ts', 'src/env/index.ts'];
const SECRET_KEY = /SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|API_KEY|_KEY$|DSN$|DATABASE_URL|_URL$/;
const SKIP_FLAG = /skipValidation\s*:[^;]{0,300}?(!!\s*)?process\.env\.([A-Z_][A-Z0-9_]*)(?:\s*===?\s*["'`]([^"'`]{1,20})["'`])?/;
const PORT_BUSY = /EADDRINUSE|address already in use|Port \d+ is (?:already )?in use|Another next dev server is already running/;
const MODULE_MISSING = /Cannot find module '([^']+)'|Module not found: Can't resolve '([^']+)'/;
const AUTH_PATH = /sign-?in|log-?in|auth|sso/i;

const clip = (text: string) => text.trim().slice(0, 200);

function evidence(lines: string[], pattern: RegExp): string[] {
  return lines.filter((line) => pattern.test(line)).slice(0, MAX_EVIDENCE).map(clip);
}

function readSmall(file: string): string | null {
  try {
    if (!statSync(file).isFile() || statSync(file).size > MAX_SOURCE_BYTES) return null;
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function inside(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative) && !relative.split(path.sep).includes('node_modules');
}

export function missingEnvKeys(lines: string[]): string[] {
  const start = lines.findIndex((line) => ENV_ERROR.test(line));
  if (start < 0) return [];
  const keys = new Set<string>();
  for (const line of lines.slice(start, start + 40)) {
    const match = /^\s*["']?([A-Z][A-Z0-9_]*)["']?\s*:\s*\[/.exec(line) ?? /path:\s*\[\s*["']([A-Z][A-Z0-9_]*)["']/.exec(line);
    if (match?.[1]) keys.add(match[1]);
    if (/^\s*}\s*$/.test(line) && keys.size > 0) break;
  }
  return [...keys].slice(0, MAX_KEYS);
}

function stackFiles(ctx: Ctx): string[] {
  const start = ctx.all.findIndex((line) => ENV_ERROR.test(line));
  const near = start < 0 ? [] : ctx.all.slice(start, start + 30);
  const files = near.map((line) => /\(([^()\s]+\.(?:ts|tsx|mjs|cjs|js)):\d+:\d+\)/.exec(line)?.[1]).filter((file): file is string => Boolean(file));
  return files.map((file) => path.resolve(ctx.appRoot, file)).filter((file) => inside(ctx.workTree, file));
}

export interface SkipFlag {
  key: string;
  value: string;
  file: string;
}

function skipFlag(ctx: Ctx): SkipFlag | null {
  const files = [...stackFiles(ctx), ...SCHEMA_CANDIDATES.map((name) => path.join(ctx.appRoot, name))];
  for (const file of new Set(files)) {
    const match = SKIP_FLAG.exec(readSmall(file) ?? '');
    if (match?.[2]) return { key: match[2], value: match[1] ? 'true' : (match[3] ?? 'true'), file: path.relative(ctx.workTree, file).split(path.sep).join('/') };
  }
  return null;
}

function envExample(ctx: Ctx): string | null {
  return [path.join(ctx.appRoot, '.env.example'), path.join(ctx.workTree, '.env.example')].find((file) => existsSync(file)) ?? null;
}

export function exampleValues(file: string, keys: string[]): Record<string, string> {
  const wanted = new Set(keys);
  const env: Record<string, string> = {};
  for (const raw of (readSmall(file) ?? '').split('\n')) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(raw);
    const key = match?.[1];
    const value = (match?.[2] ?? '').replace(/\s+#.*$/, '').replace(/^(['"])(.*)\1$/, '$2').trim();
    if (key && wanted.has(key) && value !== '' && !SECRET_KEY.test(key)) env[key] = value;
  }
  return env;
}

function keyList(keys: string[]): string {
  if (keys.length === 0) return 'some env keys are not set or not valid';
  return `${keys.join(', ')} ${keys.length === 1 ? 'is' : 'are'} not set or not valid`;
}

interface EnvPlan {
  fix: DoctorFix | null;
  title: string;
  note: string;
}

function envFix(ctx: Ctx, keys: string[]): EnvPlan {
  const flag = skipFlag(ctx);
  if (flag) {
    const pair = `${flag.key}=${flag.value}`;
    return { fix: { kind: 'set-env', label: `Add ${pair} and restart`, env: { [flag.key]: flag.value } }, title: `Env validation failed: add ${pair}`, note: ` ${flag.file} skips the check when ${pair}.` };
  }
  const example = envExample(ctx);
  const values = example ? exampleValues(example, keys) : {};
  const names = Object.keys(values);
  if (names.length > 0) return { fix: { kind: 'set-env', label: `Add ${names.join(', ')} from .env.example and restart`, env: values }, title: 'Env validation failed', note: ' .env.example has example values for them.' };
  return { fix: null, title: 'Env validation failed', note: ' Add the values in Settings (Environment for next dev) or in a .env.local file, then restart.' };
}

function envValidation(ctx: Ctx): DoctorCause | null {
  if (!ctx.all.some((line) => ENV_ERROR.test(line))) return null;
  const keys = missingEnvKeys(ctx.all);
  const { fix, title, note } = envFix(ctx, keys);
  return {
    kind: 'env-validation',
    severity: 'error',
    title,
    detail: `The app checks its env when it loads, and ${keyList(keys)}.${note}`,
    evidence: evidence(ctx.all, /Invalid environment variables|^\s*[A-Z][A-Z0-9_]*:\s*\[/),
    fix,
    command: null,
  };
}

function missingEnvFile(ctx: Ctx): DoctorCause | null {
  const example = envExample(ctx);
  const envError = ctx.all.some((line) => ENV_ERROR.test(line) || /ENOENT[^\n]*\.env\b/.test(line));
  if (!example || !envError || ENV_FILES.some((name) => existsSync(path.join(ctx.appRoot, name)))) return null;
  const to = path.join(ctx.appRoot, '.env.local');
  const from = path.relative(ctx.workTree, example).split(path.sep).join('/');
  return {
    kind: 'missing-env-file',
    severity: 'error',
    title: 'No .env file',
    detail: `The app folder has no .env or .env.local, and ${from} lists the keys it needs. Copy it to .env.local, then put real values in it yourself.`,
    evidence: [],
    fix: { kind: 'copy-env-example', label: 'Copy .env.example to .env.local and restart', from: example, to },
    command: null,
  };
}

function portInUse(ctx: Ctx): DoctorCause | null {
  const lines = ctx.message ? [...ctx.all, ctx.message] : ctx.all;
  if (!lines.some((line) => PORT_BUSY.test(line))) return null;
  const other = lines.some((line) => line.includes('Another next dev server is already running'));
  const url = other ? lines.map((line) => /Local:\s+(https?:\/\/\S+)/.exec(line)?.[1]).filter(Boolean).pop() : undefined;
  return {
    kind: 'port-in-use',
    severity: 'error',
    title: other ? 'Another next dev already runs for this app' : 'The port is in use',
    detail: other ? `Next.js runs one dev server per app folder${url ? `, and one answers at ${url}` : ''}. Use it, or stop it and start again.` : 'Another process holds the dev server port. Restart to pick a free port.',
    evidence: evidence(lines, PORT_BUSY),
    fix: url ? { kind: 'use-url', label: `Use ${url}`, url } : { kind: 'restart', label: 'Restart on a free port' },
    command: null,
  };
}

function missingPackage(lines: string[]): string | null {
  for (const line of lines) {
    const match = MODULE_MISSING.exec(line);
    const name = match?.[1] ?? match?.[2];
    if (name && !/^[./~]|^@\//.test(name)) return name;
  }
  return null;
}

function install(ctx: Ctx): DoctorCause | null {
  const noNext = ctx.message?.includes('next is not installed') ?? false;
  const name = noNext ? 'next' : missingPackage(ctx.all);
  if (!name) return null;
  const hint = installHint(ctx.workTree, ctx.appDir);
  return {
    kind: 'install',
    severity: 'error',
    title: noNext ? 'Dependencies are not installed' : `Package ${name} is not installed`,
    detail: `Install the dependencies in a terminal with ${hint.command} in ${hint.dir}, then start again.`,
    evidence: noNext ? [] : evidence(ctx.all, MODULE_MISSING),
    fix: null,
    command: `cd ${JSON.stringify(hint.dir)} && ${hint.command}`,
  };
}

function authRedirect(ctx: Ctx): DoctorCause | null {
  const probe = ctx.probe;
  if (!probe || probe.status < 300 || probe.status >= 400 || !probe.location) return null;
  const target = probe.location.replace(/^https?:\/\/[^/]+/, '').split('?')[0] ?? '';
  if (!AUTH_PATH.test(target)) return null;
  return {
    kind: 'auth-redirect',
    severity: 'info',
    title: `The app sends signed-out visitors to ${target}`,
    detail: 'Frames show the sign-in page until they are signed in. Pick the Signed in frame state in the frame menu, or add a frame for a public route.',
    evidence: [`GET / -> ${probe.status} ${clip(probe.location)}`],
    fix: null,
    command: null,
  };
}

const RULES: Rule[] = [envValidation, missingEnvFile, portInUse, install, authRedirect];

function probeLines(probe: DoctorProbe | null): string[] {
  if (!probe || probe.status < 500) return [];
  const text = probe.body.replace(/\\n/g, '\n').replace(/<[^>]+>/g, '\n');
  return text.split('\n').filter((line) => ENV_ERROR.test(line) || MODULE_MISSING.test(line)).slice(0, 5);
}

function rank(cause: DoctorCause): number {
  return (cause.severity === 'error' ? 0 : 2) + (cause.fix ? 0 : 1);
}

export function diagnose(input: DoctorInput): AppDoctorResult {
  const ctx: Ctx = { ...input, appRoot: path.join(input.workTree, input.appDir), all: [...input.lines, ...probeLines(input.probe)] };
  const causes = RULES.map((rule) => rule(ctx)).filter((cause): cause is DoctorCause => cause !== null);
  return { checkedAt: Date.now(), causes: causes.sort((a, b) => rank(a) - rank(b)) };
}

export function sameDoctor(a: AppDoctorResult | null | undefined, b: AppDoctorResult | null | undefined): boolean {
  return JSON.stringify(a?.causes ?? null) === JSON.stringify(b?.causes ?? null);
}

const PROBE_BODY_MAX = 200_000;
const PROBE_TIMEOUT_MS = 150_000;

export async function probeRoot(upstream: string): Promise<DoctorProbe | null> {
  try {
    const res = await fetch(`${upstream}/`, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS), headers: { accept: 'text/html' } });
    const body = res.status >= 500 ? (await res.text()).slice(0, PROBE_BODY_MAX) : '';
    if (res.status < 500) await res.body?.cancel().catch(() => undefined);
    return { status: res.status, location: res.headers.get('location'), body };
  } catch {
    return null;
  }
}
