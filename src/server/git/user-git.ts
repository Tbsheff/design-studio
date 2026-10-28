import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';

export const READ_TIMEOUT_MS = 15_000;
export const WRITE_TIMEOUT_MS = 60_000;
export const NETWORK_TIMEOUT_MS = 120_000;

export class UserGitError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
    readonly stderr: string,
  ) {
    super(message);
  }
}

export interface ExecOptions {
  cwd: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  input?: string;
  allowFail?: boolean;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export function userEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('GIT_') && !key.startsWith('STUDIO_') && !key.startsWith('ANTHROPIC_')) env[key] = value;
  }
  return { ...env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', GIT_SSH_COMMAND: 'ssh -o BatchMode=yes', GCM_INTERACTIVE: 'never', GH_PROMPT_DISABLED: '1', ...extra };
}

export function execTool(binary: string, args: string[], options: ExecOptions): Promise<ExecResult> {
  const timeoutMs = options.timeoutMs ?? READ_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd: options.cwd, env: userEnv(options.env), stdio: ['pipe', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let size = 0;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= 64 * 1024 * 1024) out.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk));
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(new UserGitError(`${path.basename(binary)} could not start: ${error.message}`, null, ''));
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(out).toString('utf8');
      const stderr = Buffer.concat(err).toString('utf8').trim();
      const name = `${path.basename(binary)} ${args.find((arg) => !arg.startsWith('-') && !arg.includes('=')) ?? ''}`.trim();
      if (timedOut) return reject(new UserGitError(`${name} took longer than ${Math.round(timeoutMs / 1000)} s and was stopped. If git asks for a password or a signing passphrase, it cannot ask from here.`, null, stderr));
      if (code !== 0 && !options.allowFail) return reject(new UserGitError(`${name} failed: ${stderr.split('\n').slice(-3).join(' ') || `exit ${code}`}`, code, stderr));
      resolve({ stdout, stderr, code });
    });
    child.stdin.on('error', () => undefined);
    child.stdin.end(options.input ?? '');
  });
}

export function userGit(cwd: string, args: string[], options: Omit<ExecOptions, 'cwd'> = {}): Promise<ExecResult> {
  return execTool('git', args, { ...options, cwd });
}

export async function findOnPath(name: string): Promise<string | null> {
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, name);
    const found = await access(candidate, constants.X_OK).then(
      () => true,
      () => false,
    );
    if (found) return candidate;
  }
  return null;
}
