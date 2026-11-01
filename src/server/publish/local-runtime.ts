import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { BadRequestError } from '../store/errors.js';

export const LOCAL_D1_ID = '5e7f0d1a-0000-4000-8000-00000000d1d1';
const READY = /publish worker local ready at (http:\/\/127\.0\.0\.1:\d+\/)/;
const START_TIMEOUT_MS = 60_000;

export interface LocalStart {
  bundle: string;
  secrets: string;
  runner: string | null;
  databaseId: string;
}

export interface LocalRuntime {
  stateDir: string;
  port: number;
  start(input: LocalStart): Promise<string>;
  ensure(input: LocalStart): Promise<string>;
  stop(): void;
}

export function createLocalRuntime(dir: string): LocalRuntime {
  const stateDir = path.join(dir, 'state');
  const port = Number(process.env.STUDIO_PUBLISH_LOCAL_PORT ?? '13770');
  let child: ChildProcess | null = null;
  let url: string | null = null;

  const stop = () => {
    child?.kill('SIGTERM');
    child = null;
    url = null;
  };
  process.once('exit', stop);

  const start = (input: LocalStart): Promise<string> => {
    stop();
    if (!input.runner) return Promise.reject(new BadRequestError('Local mode needs cloud/publish-worker with its packages installed.'));
    if (!existsSync(input.bundle) || !existsSync(input.secrets)) return Promise.reject(new BadRequestError('The local Worker build is missing. Run Set up publishing again.'));
    const args = [input.runner, '--script', input.bundle, '--persist', stateDir, '--d1', input.databaseId, '--secrets', input.secrets, '--port', String(port)];
    const spawned = spawn(process.execPath, args, { cwd: path.dirname(path.dirname(input.runner)), stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '' } });
    child = spawned;
    return new Promise((resolve, reject) => {
      let seen = '';
      const timer = setTimeout(() => reject(new BadRequestError('The local Worker did not start in time.')), START_TIMEOUT_MS);
      const watch = (chunk: Buffer) => {
        seen = (seen + chunk.toString('utf8')).slice(-8000);
        const match = READY.exec(seen);
        if (!match?.[1]) return;
        clearTimeout(timer);
        url = match[1];
        resolve(match[1]);
      };
      spawned.stdout?.on('data', watch);
      spawned.stderr?.on('data', watch);
      spawned.once('exit', (code) => {
        clearTimeout(timer);
        if (child === spawned) {
          child = null;
          url = null;
        }
        reject(new BadRequestError(`The local Worker stopped (code ${code}). ${seen.split('\n').filter((l) => /error/i.test(l)).slice(-1)[0]?.slice(0, 200) ?? ''}`));
      });
    });
  };

  let starting: Promise<string> | null = null;
  const startOnce = (input: LocalStart): Promise<string> => {
    starting ??= start(input).finally(() => {
      starting = null;
    });
    return starting;
  };
  const ensure = async (input: LocalStart): Promise<string> => (child && url ? url : startOnce(input));

  return { stateDir, port, start: startOnce, ensure, stop };
}
