import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type { ShareFrame, ShareLink } from '../../shared/share.js';
import { createKeyedMutex } from '../store/mutex.js';

export interface ShareRecord {
  id: string;
  tokenHash: string;
  projectId: string;
  directionId: string;
  versionId: string;
  title: string;
  frames: ShareFrame[];
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
  commentIds: string[];
}

export interface NewShare {
  projectId: string;
  directionId: string;
  versionId: string;
  title: string;
  frames: ShareFrame[];
  expiresAt: number;
}

export interface ShareStore {
  dir: string;
  framesDir(id: string): string;
  newId(): string;
  add(id: string, input: NewShare): Promise<{ record: ShareRecord; token: string }>;
  list(projectId?: string): Promise<ShareRecord[]>;
  byToken(token: string): Promise<ShareRecord | null>;
  endedByToken(token: string): Promise<'revoked' | 'expired' | null>;
  revoke(id: string): Promise<ShareRecord | null>;
  addComment(id: string, commentId: string): Promise<void>;
  activeCount(): Promise<number>;
  nextExpiry(): Promise<number | null>;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const KEEP_REVOKED_MS = 7 * 24 * 3600_000;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isLive(record: ShareRecord, now = Date.now()): boolean {
  return record.revokedAt === null && record.expiresAt > now;
}

export function toLink(record: ShareRecord, now = Date.now()): ShareLink {
  return {
    id: record.id,
    projectId: record.projectId,
    directionId: record.directionId,
    versionId: record.versionId,
    title: record.title,
    frames: record.frames,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    comments: record.commentIds.length,
    active: isLive(record, now),
  };
}

export function createShareStore(dataDir: string): ShareStore {
  const dir = path.join(dataDir, 'shares');
  const file = path.join(dir, 'shares.json');
  const lock = createKeyedMutex();

  const read = async (): Promise<ShareRecord[]> => {
    const text = await readFile(file, 'utf8').catch(() => null);
    if (!text) return [];
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as ShareRecord[]) : [];
  };

  const write = async (records: ShareRecord[]): Promise<void> => {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(temp, JSON.stringify(records, null, 2), { mode: 0o600 });
    await rename(temp, file);
  };

  const mutate = <T>(task: (records: ShareRecord[]) => T): Promise<T> =>
    lock('shares', async () => {
      const records = await read();
      const result = task(records);
      const now = Date.now();
      const kept = records.filter((r) => isLive(r, now) || now - (r.revokedAt ?? r.expiresAt) < KEEP_REVOKED_MS);
      for (const gone of records.filter((r) => !kept.includes(r))) await rm(path.join(dir, gone.id), { recursive: true, force: true });
      await write(kept);
      return result;
    });

  return {
    dir,
    framesDir: (id) => path.join(dir, id),
    newId: () => nanoid(12),
    async add(id, input) {
      const token = randomBytes(32).toString('base64url');
      const record: ShareRecord = { id, tokenHash: hashToken(token), ...input, createdAt: Date.now(), revokedAt: null, commentIds: [] };
      await mutate((records) => records.push(record));
      return { record, token };
    },
    async list(projectId) {
      const records = await read();
      return projectId ? records.filter((r) => r.projectId === projectId) : records;
    },
    async byToken(token) {
      if (!TOKEN_RE.test(token)) return null;
      const hash = hashToken(token);
      const found = (await read()).find((r) => r.tokenHash === hash);
      return found && isLive(found) ? found : null;
    },
    async endedByToken(token) {
      if (!TOKEN_RE.test(token)) return null;
      const hash = hashToken(token);
      const found = (await read()).find((r) => r.tokenHash === hash);
      if (!found || isLive(found)) return null;
      return found.revokedAt !== null ? 'revoked' : 'expired';
    },
    revoke(id) {
      return mutate((records) => {
        const found = records.find((r) => r.id === id);
        if (!found) return null;
        if (found.revokedAt === null) found.revokedAt = Date.now();
        return found;
      }).then(async (found) => {
        if (found) await rm(path.join(dir, found.id), { recursive: true, force: true });
        return found;
      });
    },
    async addComment(id, commentId) {
      await mutate((records) => {
        const found = records.find((r) => r.id === id);
        if (found) found.commentIds.push(commentId);
      });
    },
    async activeCount() {
      const now = Date.now();
      return (await read()).filter((r) => isLive(r, now)).length;
    },
    async nextExpiry() {
      const now = Date.now();
      const live = (await read()).filter((r) => isLive(r, now)).map((r) => r.expiresAt);
      return live.length > 0 ? Math.min(...live) : null;
    },
  };
}
