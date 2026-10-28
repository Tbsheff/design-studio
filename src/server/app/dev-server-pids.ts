import { execFile } from 'node:child_process';
import { rmSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PIDS_FILE = 'app-dev-servers.json';
const STOP_WAIT_MS = 4000;

export interface DevServerRecord {
  pid: number;
  port: number;
  appRoot: string;
  startedAt: number;
}

type Records = Record<string, DevServerRecord>;

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function commandOf(pid: number): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('ps', ['-o', 'command=', '-p', String(pid)], { timeout: 3000 }, (error, stdout) => resolve(error ? null : stdout.trim()));
  });
}

async function isOurNext(record: DevServerRecord): Promise<boolean> {
  if (!alive(record.pid)) return false;
  const command = await commandOf(record.pid);
  return command !== null && command.includes('next') && command.includes(`-p ${record.port}`);
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      return;
    }
  }
}

async function waitGone(pid: number, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (!alive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return !alive(pid);
}

export class DevServerPids {
  private readonly file: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.file = path.join(dataDir, PIDS_FILE);
  }

  private async read(): Promise<Records> {
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8')) as Records;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private change(edit: (records: Records) => void): Promise<void> {
    const next = this.queue.then(async () => {
      const records = await this.read();
      edit(records);
      await mkdir(path.dirname(this.file), { recursive: true });
      const temp = `${this.file}.${process.pid}.tmp`;
      await writeFile(temp, `${JSON.stringify(records, null, 2)}\n`);
      await rename(temp, this.file);
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  record(projectId: string, record: DevServerRecord): Promise<void> {
    return this.change((records) => {
      records[projectId] = record;
    }).catch(() => undefined);
  }

  forget(projectId: string, pid: number): Promise<void> {
    return this.change((records) => {
      if (records[projectId]?.pid === pid) delete records[projectId];
    }).catch(() => undefined);
  }

  clearSync(): void {
    rmSync(this.file, { force: true });
  }

  async reap(projectId: string, log: (line: string) => void): Promise<void> {
    const record = (await this.read())[projectId];
    if (!record) return;
    await this.stopStale(record, log);
    await this.forget(projectId, record.pid);
  }

  async reapAll(log: (line: string) => void): Promise<void> {
    const records = await this.read();
    await Promise.all(Object.entries(records).map(async ([projectId, record]) => {
      await this.stopStale(record, log);
      await this.forget(projectId, record.pid);
    }));
  }

  private async stopStale(record: DevServerRecord, log: (line: string) => void): Promise<void> {
    if (!(await isOurNext(record))) return;
    log(`Stopping the next dev (PID ${record.pid}, port ${record.port}) that an earlier Design Studio started in ${record.appRoot}.`);
    signalGroup(record.pid, 'SIGTERM');
    if (await waitGone(record.pid, STOP_WAIT_MS)) return;
    signalGroup(record.pid, 'SIGKILL');
    await waitGone(record.pid, 1000);
  }
}
