import { randomBytes } from 'node:crypto';
import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';
import type { WorkspaceFolder, WorkspaceList } from '../../shared/folders.js';
import { DEFAULT_FOLDER_NAME, type DefaultFolderStore } from './default-folder.js';
import { BadRequestError, NotFoundError, assertSafeId, isNodeError } from './errors.js';
import { createKeyedMutex } from './mutex.js';

export const WORKSPACES_FILE = 'workspaces.json';
export const DEFAULT_WORKSPACE_ID = 'default';
const MAX_WORKSPACES = 200;
const MAX_LABEL_LENGTH = 80;
const MAX_PATH_LENGTH = 4096;

const workspaceId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

const storedFolderSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]{1,64}$/),
    path: z.string().min(1).max(MAX_PATH_LENGTH).refine((value) => path.isAbsolute(value), 'must be absolute'),
    label: z.string().trim().min(1).max(MAX_LABEL_LENGTH),
    addedAt: z.number().int().nonnegative(),
  })
  .strict();

const workspacesFileSchema = z
  .object({
    version: z.literal(1),
    folders: z.array(storedFolderSchema).max(MAX_WORKSPACES),
  })
  .strict();

type StoredFolder = z.infer<typeof storedFolderSchema>;
type WorkspacesFile = z.infer<typeof workspacesFileSchema>;

const labelSchema = z.string().trim().min(1, 'label is required').max(MAX_LABEL_LENGTH, `label must be ${MAX_LABEL_LENGTH} characters or fewer`);

export interface WorkspaceStore {
  list(): Promise<WorkspaceList>;
  add(input: { path: string; label?: string }): Promise<WorkspaceFolder>;
  rename(id: string, label: string): Promise<WorkspaceFolder>;
  remove(id: string): Promise<void>;
}

interface WorkspaceStoreOptions {
  homeDir?: string;
  defaultFolder?: DefaultFolderStore;
}

async function isFolder(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

function parseLabel(raw: string): string {
  const parsed = labelSchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? 'invalid label');
  return parsed.data;
}

export function createWorkspaceStore(dataDir: string, options: WorkspaceStoreOptions = {}): WorkspaceStore {
  const file = path.join(dataDir, WORKSPACES_FILE);
  const lock = createKeyedMutex();
  const homeDir = options.homeDir ?? os.homedir();

  const read = async (): Promise<WorkspacesFile> => {
    let raw: string;
    try {
      raw = await readFile(file, 'utf8');
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') return { version: 1, folders: [] };
      throw error;
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      console.error(`[workspaces] ${file} is not JSON; starting with no saved folders`);
      return { version: 1, folders: [] };
    }
    const parsed = workspacesFileSchema.safeParse(json);
    if (parsed.success) return parsed.data;
    console.error(`[workspaces] ${file} failed validation; keeping only valid entries`);
    const folders = Array.isArray((json as { folders?: unknown })?.folders) ? ((json as { folders: unknown[] }).folders) : [];
    return { version: 1, folders: folders.flatMap((entry) => {
      const result = storedFolderSchema.safeParse(entry);
      return result.success ? [result.data] : [];
    }).slice(0, MAX_WORKSPACES) };
  };

  const write = async (data: WorkspacesFile): Promise<void> => {
    await mkdir(dataDir, { recursive: true });
    const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(temp, `${JSON.stringify(workspacesFileSchema.parse(data), null, 2)}\n`);
    await rename(temp, file);
  };

  const present = async (folder: StoredFolder): Promise<WorkspaceFolder> => ({ ...folder, missing: !(await isFolder(folder.path)) });

  const defaultRow = async (): Promise<WorkspaceFolder | null> => {
    if (!options.defaultFolder) return null;
    const folderPath = await options.defaultFolder.current();
    return { id: DEFAULT_WORKSPACE_ID, path: folderPath, label: DEFAULT_FOLDER_NAME, addedAt: 0, missing: false, default: true };
  };

  const refuseDefault = (id: string): void => {
    if (options.defaultFolder && id === DEFAULT_WORKSPACE_ID) throw new BadRequestError('the default folder always stays in the list');
  };

  const resolveFolder = async (raw: string): Promise<string> => {
    if (typeof raw !== 'string' || raw.trim() === '') throw new BadRequestError('path is required');
    if (raw.includes('\0') || raw.length > MAX_PATH_LENGTH) throw new BadRequestError('invalid path');
    if (!path.isAbsolute(raw)) throw new BadRequestError('path must be absolute');
    let real: string;
    try {
      real = await realpath(path.resolve(raw));
    } catch {
      throw new BadRequestError(`folder not found: ${raw}`);
    }
    if (!(await isFolder(real))) throw new BadRequestError(`not a folder: ${real}`);
    const dataRoot = path.resolve(dataDir);
    if (real === dataRoot || real.startsWith(dataRoot + path.sep)) throw new BadRequestError('cannot save a folder inside the studio data dir');
    return real;
  };

  return {
    async list(): Promise<WorkspaceList> {
      const data = await read();
      const fallback = await defaultRow();
      const saved = await Promise.all(data.folders.filter((folder) => folder.path !== fallback?.path).map(present));
      return { homeDir, folders: fallback ? [fallback, ...saved] : saved };
    },

    async add(input: { path: string; label?: string }): Promise<WorkspaceFolder> {
      const real = await resolveFolder(input.path);
      const label = input.label === undefined ? path.basename(real) || real : parseLabel(input.label);
      return lock('file', async () => {
        const data = await read();
        const existing = data.folders.find((folder) => folder.path === real);
        if (existing) return present(existing);
        if (data.folders.length >= MAX_WORKSPACES) throw new BadRequestError(`at most ${MAX_WORKSPACES} saved folders`);
        const folder: StoredFolder = { id: workspaceId(), path: real, label: parseLabel(label), addedAt: Date.now() };
        data.folders.push(folder);
        await write(data);
        return present(folder);
      });
    },

    async rename(id: string, label: string): Promise<WorkspaceFolder> {
      assertSafeId(id, 'workspaceId');
      refuseDefault(id);
      const clean = parseLabel(label);
      return lock('file', async () => {
        const data = await read();
        const folder = data.folders.find((candidate) => candidate.id === id);
        if (!folder) throw new NotFoundError(`folder ${id} not found`);
        folder.label = clean;
        await write(data);
        return present(folder);
      });
    },

    async remove(id: string): Promise<void> {
      assertSafeId(id, 'workspaceId');
      refuseDefault(id);
      return lock('file', async () => {
        const data = await read();
        const next = data.folders.filter((candidate) => candidate.id !== id);
        if (next.length === data.folders.length) throw new NotFoundError(`folder ${id} not found`);
        await write({ ...data, folders: next });
      });
    },
  };
}
