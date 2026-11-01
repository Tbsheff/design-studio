import { spawn, type ChildProcess } from 'node:child_process';
import { findOnPath } from '../git/user-git.js';
import { scrubCliText } from './scrub.js';
import type { PublishAccount } from '../../shared/publish.js';

export interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface CliRunOptions {
  cwd?: string;
  accountId?: string | null;
  timeoutMs?: number;
  onSpawn?: (child: ChildProcess) => void;
}

export interface WhoAmI {
  signedIn: boolean;
  email: string | null;
  accounts: PublishAccount[];
}

const DEFAULT_TIMEOUT_MS = 170_000;
const OUTPUT_MAX = 400_000;
export const LOGIN_SCOPES = ['account:read', 'user:read', 'workers:write', 'workers_scripts:write', 'offline_access'];

export async function resolveCf(): Promise<string | null> {
  const override = process.env.STUDIO_CF_BIN;
  if (override) return override;
  return findOnPath('cf');
}

function cliEnv(accountId: string | null | undefined): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', CF_NO_OSC_PROGRESS: '1', DO_NOT_TRACK: '1' };
  for (const key of Object.keys(env)) if (key.startsWith('STUDIO_') || key === 'ANTHROPIC_API_KEY') delete env[key];
  if (accountId) env.CLOUDFLARE_ACCOUNT_ID = accountId;
  return env;
}

export function runCf(bin: string, args: string[], options: CliRunOptions = {}): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { cwd: options.cwd, env: cliEnv(options.accountId), stdio: ['ignore', 'pipe', 'pipe'] });
    options.onSpawn?.(child);
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdout.length < OUTPUT_MAX) stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < OUTPUT_MAX) stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: `${stderr}\n${error.message}`, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

export async function cfVersion(bin: string): Promise<string | null> {
  const out = await runCf(bin, ['--version'], { timeoutMs: 30_000 });
  const match = /(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)/.exec(`${out.stdout}\n${out.stderr}`);
  return out.code === 0 && match?.[1] ? match[1] : null;
}

function firstJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function accountsOf(raw: unknown): PublishAccount[] {
  if (!Array.isArray(raw)) return [];
  const out: PublishAccount[] = [];
  for (const item of raw) {
    const rec = (item ?? {}) as Record<string, unknown>;
    const id = typeof rec.id === 'string' ? rec.id : null;
    if (id && /^[A-Za-z0-9]{8,64}$/.test(id)) out.push({ id, name: typeof rec.name === 'string' ? rec.name.slice(0, 120) : id });
  }
  return out;
}

export async function cfWhoAmI(bin: string): Promise<WhoAmI> {
  const out = await runCf(bin, ['auth', 'whoami'], { timeoutMs: 60_000 });
  const parsed = firstJson(out.stdout) as Record<string, unknown> | null;
  if (!parsed || parsed.authenticated !== true) return { signedIn: false, email: null, accounts: [] };
  return { signedIn: true, email: typeof parsed.email === 'string' ? parsed.email : null, accounts: accountsOf(parsed.accounts) };
}

export function loginArgs(keyring: boolean): string[] {
  return ['auth', 'login', '--no-device', '--force', keyring ? '--use-keyring' : '--no-use-keyring', '--scopes', ...LOGIN_SCOPES];
}

const WORKERS_DEV = /https:\/\/([a-z0-9-]+)\.([a-z0-9-]+)\.workers\.dev\b/i;

export function deployedUrl(text: string, workerName: string): { url: string; subdomain: string } | null {
  for (const match of text.matchAll(new RegExp(WORKERS_DEV.source, 'gi'))) {
    if (match[1]?.toLowerCase() === workerName && match[2]) return { url: `https://${workerName}.${match[2].toLowerCase()}.workers.dev`, subdomain: match[2].toLowerCase() };
  }
  return null;
}

export function cliFailure(result: CliResult, fallback: string): string {
  if (result.timedOut) return `${fallback} The cf command did not finish in time.`;
  const text = scrubCliText(`${result.stderr}\n${result.stdout}`);
  if (/register a workers\.dev subdomain/i.test(text)) return 'This Cloudflare account has no workers.dev subdomain yet. Open Workers & Pages in the Cloudflare dashboard once to pick one, then publish again.';
  if (/not logged in|authenticat|unauthori[sz]ed|code: ?10000/i.test(text)) return 'Cloudflare refused the sign-in. Sign in again in Settings → Publishing.';
  const line = text.split(/\r?\n/).map((l) => l.replace(/^[\s│┌└├◆●✖→]+/, '').trim()).filter((l) => l && !/^error$/i.test(l)).find((l) => /error|fail|invalid|denied|not /i.test(l));
  return line ? `${fallback} ${line.slice(0, 300)}` : fallback;
}
