import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { appendFile, link, mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

export const TREE_MODE = '40000';
export const GITLINK_MODE = '160000';
export const SYMLINK_MODE = '120000';
const ZERO_SHA = '0'.repeat(40);
const MAX_CACHED = 20000;

export interface TreeEntry {
  mode: string;
  name: string;
  sha: string;
}

export interface CommitInfo {
  tree: string;
  parents: string[];
  message: string;
}

interface RawObject {
  type: string;
  body: Buffer;
}

interface Pending {
  sha: string;
  resolve: (value: RawObject | null) => void;
  reject: (error: Error) => void;
}

export class RefConflictError extends Error {}

function gitHash(type: string, body: Buffer): string {
  return createHash('sha1').update(`${type} ${body.length}\0`).update(body).digest('hex');
}

function nameKey(entry: TreeEntry): Buffer {
  return Buffer.from(entry.mode === TREE_MODE ? `${entry.name}/` : entry.name);
}

export function sortTree(entries: TreeEntry[]): TreeEntry[] {
  return [...entries].sort((a, b) => Buffer.compare(nameKey(a), nameKey(b)));
}

export function comparePaths(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a), Buffer.from(b));
}

function parseTree(body: Buffer): TreeEntry[] {
  const entries: TreeEntry[] = [];
  let at = 0;
  while (at < body.length) {
    const space = body.indexOf(0x20, at);
    const nul = body.indexOf(0, space);
    entries.push({ mode: body.toString('utf8', at, space), name: body.toString('utf8', space + 1, nul), sha: body.toString('hex', nul + 1, nul + 21) });
    at = nul + 21;
  }
  return entries;
}

function serializeTree(entries: TreeEntry[]): Buffer {
  return Buffer.concat(sortTree(entries).flatMap((entry) => [Buffer.from(`${entry.mode} ${entry.name}\0`), Buffer.from(entry.sha, 'hex')]));
}

function parseCommit(body: Buffer): CommitInfo {
  const text = body.toString('utf8');
  const split = text.indexOf('\n\n');
  const header = split === -1 ? text : text.slice(0, split);
  const parents: string[] = [];
  let tree = '';
  for (const line of header.split('\n')) {
    if (line.startsWith('tree ')) tree = line.slice(5);
    if (line.startsWith('parent ')) parents.push(line.slice(7));
  }
  return { tree, parents, message: split === -1 ? '' : text.slice(split + 2) };
}

function timezone(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const abs = Math.abs(offset);
  return `${offset < 0 ? '-' : '+'}${String(Math.floor(abs / 60)).padStart(2, '0')}${String(abs % 60).padStart(2, '0')}`;
}

export function gitIdent(name: string, email: string, at: Date = new Date()): string {
  return `${name} <${email}> ${Math.floor(at.getTime() / 1000)} ${timezone(at)}`;
}

class BatchReader {
  private child: ChildProcessWithoutNullStreams | null = null;
  private queue: Pending[] = [];
  private buffer: Buffer = Buffer.alloc(0);

  constructor(
    private readonly binary: () => Promise<string>,
    private readonly env: NodeJS.ProcessEnv,
    private readonly cwd: string,
  ) {}

  async read(sha: string): Promise<RawObject | null> {
    const child = await this.start();
    return new Promise((resolve, reject) => {
      this.queue.push({ sha, resolve, reject });
      child.stdin.write(`${sha}\n`);
    });
  }

  close(): void {
    this.child?.stdin.end();
    this.child = null;
  }

  private async start(): Promise<ChildProcessWithoutNullStreams> {
    if (this.child) return this.child;
    const child = spawn(await this.binary(), ['cat-file', '--batch'], { env: this.env, cwd: this.cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;
    child.stdout.on('data', (chunk: Buffer) => this.consume(chunk));
    child.stdin.on('error', () => undefined);
    child.once('exit', () => this.fail(child, new Error('git cat-file stopped')));
    child.once('error', (error) => this.fail(child, error));
    return child;
  }

  private fail(child: ChildProcessWithoutNullStreams, error: Error): void {
    if (this.child === child) this.child = null;
    this.buffer = Buffer.alloc(0);
    for (const pending of this.queue.splice(0)) pending.reject(error);
  }

  private consume(chunk: Buffer): void {
    this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const pending = this.queue[0];
      const eol = this.buffer.indexOf(0x0a);
      if (!pending || eol === -1) return;
      const header = this.buffer.toString('utf8', 0, eol).split(' ');
      if (header[1] === 'missing') {
        this.buffer = this.buffer.subarray(eol + 1);
        this.queue.shift();
        pending.resolve(null);
        continue;
      }
      const size = Number(header[2]);
      if (this.buffer.length < eol + 1 + size + 1) return;
      const body = Buffer.from(this.buffer.subarray(eol + 1, eol + 1 + size));
      this.buffer = this.buffer.subarray(eol + 1 + size + 1);
      this.queue.shift();
      pending.resolve({ type: header[1] ?? '', body });
    }
  }
}

export class ObjectStore {
  private readonly reader: BatchReader;
  private readonly trees = new Map<string, TreeEntry[]>();
  private readonly commits = new Map<string, CommitInfo>();

  constructor(
    readonly gitDir: string,
    binary: () => Promise<string>,
    env: NodeJS.ProcessEnv,
  ) {
    this.reader = new BatchReader(binary, env, gitDir);
  }

  close(): void {
    this.reader.close();
  }

  async readObject(sha: string): Promise<RawObject | null> {
    return this.reader.read(sha);
  }

  async readBlob(sha: string): Promise<Buffer> {
    const object = await this.reader.read(sha);
    if (!object || object.type !== 'blob') throw new Error(`blob ${sha} not found`);
    return object.body;
  }

  async readTree(sha: string): Promise<TreeEntry[]> {
    const known = this.trees.get(sha);
    if (known) return known;
    const object = await this.reader.read(sha);
    if (!object || object.type !== 'tree') throw new Error(`tree ${sha} not found`);
    return this.remember(this.trees, sha, parseTree(object.body));
  }

  async readCommit(sha: string): Promise<CommitInfo | null> {
    const known = this.commits.get(sha);
    if (known) return known;
    const object = await this.reader.read(sha);
    if (!object || object.type !== 'commit') return null;
    return this.remember(this.commits, sha, parseCommit(object.body));
  }

  async writeBlob(body: Buffer): Promise<string> {
    return this.writeLoose('blob', body);
  }

  async writeTree(entries: TreeEntry[]): Promise<string> {
    const sha = await this.writeLoose('tree', serializeTree(entries));
    this.remember(this.trees, sha, sortTree(entries));
    return sha;
  }

  async writeCommit(tree: string, parents: string[], author: string, message: string): Promise<string> {
    const header = [`tree ${tree}`, ...parents.map((parent) => `parent ${parent}`), `author ${author}`, `committer ${author}`].join('\n');
    const body = Buffer.from(`${header}\n\n${message}`);
    const sha = await this.writeLoose('commit', body);
    this.remember(this.commits, sha, { tree, parents, message });
    return sha;
  }

  async readRef(ref: string): Promise<string | null> {
    const loose = await readFile(path.join(this.gitDir, ref), 'utf8').catch(() => null);
    if (loose !== null) {
      const value = loose.trim();
      return /^[0-9a-f]{40}$/.test(value) ? value : null;
    }
    const packed = await readFile(path.join(this.gitDir, 'packed-refs'), 'utf8').catch(() => '');
    const line = packed.split('\n').find((entry) => entry.endsWith(` ${ref}`));
    return line ? line.slice(0, 40) : null;
  }

  async updateRef(ref: string, next: string, expected: string | null, ident: string): Promise<void> {
    const target = path.join(this.gitDir, ref);
    await mkdir(path.dirname(target), { recursive: true });
    const lock = `${target}.lock`;
    const handle = await open(lock, 'wx').catch(() => {
      throw new RefConflictError(`${ref} is locked`);
    });
    try {
      const current = await this.readRef(ref);
      if ((current ?? null) !== expected) throw new RefConflictError(`${ref} moved`);
      await handle.writeFile(`${next}\n`);
      await handle.close();
      await rename(lock, target);
    } catch (error) {
      await handle.close().catch(() => undefined);
      await rm(lock, { force: true });
      throw error;
    }
    const log = path.join(this.gitDir, 'logs', ref);
    if (existsSync(log)) await appendFile(log, `${expected ?? ZERO_SHA} ${next} ${ident}\n`);
  }

  private remember<T>(map: Map<string, T>, sha: string, value: T): T {
    if (map.size > MAX_CACHED) map.clear();
    map.set(sha, value);
    return value;
  }

  private async writeLoose(type: string, body: Buffer): Promise<string> {
    const sha = gitHash(type, body);
    const dir = path.join(this.gitDir, 'objects', sha.slice(0, 2));
    const target = path.join(dir, sha.slice(2));
    if (existsSync(target)) return sha;
    await mkdir(dir, { recursive: true });
    const temp = path.join(dir, `tmp_obj_${randomBytes(6).toString('hex')}`);
    await writeFile(temp, deflateSync(Buffer.concat([Buffer.from(`${type} ${body.length}\0`), body]), { level: 1 }), { mode: 0o444 });
    await link(temp, target).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;
    });
    await rm(temp, { force: true });
    return sha;
  }
}

export function blobShaOf(body: Buffer): string {
  return gitHash('blob', body);
}
