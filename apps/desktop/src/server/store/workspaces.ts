import { randomBytes } from "node:crypto";
import {
  mkdir,
  readFile,
  realpath,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  WorkspaceFolder,
  WorkspaceList,
} from "@design-studio/contracts/folders";
import { Result, Schema } from "effect";
import { customAlphabet } from "nanoid";

import { toDecoder } from "../platform/decode/index.js";
import {
  BadRequestError,
  NotFoundError,
  assertSafeId,
  isNodeError,
} from "../platform/errors/index.js";
import { createKeyedMutex } from "../platform/mutex/index.js";
import { DEFAULT_FOLDER_NAME } from "./default-folder.js";
import type { DefaultFolderStore } from "./default-folder.js";
import { bindWorkspaceRuntime } from "./workspace-runtime.js";

export const WORKSPACES_FILE = "workspaces.json";
export const DEFAULT_WORKSPACE_ID = "default";
const MAX_WORKSPACES = 200;
const MAX_LABEL_LENGTH = 80;
const MAX_PATH_LENGTH = 4096;

const workspaceId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);

const StoredFolderSchema = Schema.Struct({
  addedAt: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  id: Schema.String.check(Schema.isPattern(/^[a-z0-9]{1,64}$/u)),
  label: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_LABEL_LENGTH)
  ),
  path: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_PATH_LENGTH),
    Schema.makeFilter((value: string) => path.isAbsolute(value))
  ),
});

const WorkspacesFileSchema = Schema.Struct({
  folders: Schema.Array(StoredFolderSchema).check(
    Schema.isMaxLength(MAX_WORKSPACES)
  ),
  version: Schema.Literal(1),
});

const FolderEntriesSchema = Schema.Struct({
  folders: Schema.Array(Schema.Unknown),
});

interface StoredFolder {
  addedAt: number;
  id: string;
  label: string;
  path: string;
}

interface WorkspacesFile {
  folders: StoredFolder[];
  version: 1;
}

const toStoredFolder = toDecoder(StoredFolderSchema, "error");

const toWorkspacesFile = toDecoder(WorkspacesFileSchema, "error");

const toFolderEntries = toDecoder(FolderEntriesSchema, "ignore");

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
  const label = raw.trim();

  if (label.length === 0) {
    throw new BadRequestError("label is required");
  }

  if (label.length > MAX_LABEL_LENGTH) {
    throw new BadRequestError(
      `label must be ${MAX_LABEL_LENGTH} characters or fewer`
    );
  }

  return label;
}

export function createWorkspaceStore(
  dataDir: string,
  options: WorkspaceStoreOptions = {}
): WorkspaceStore {
  const file = path.join(dataDir, WORKSPACES_FILE);
  const lock = createKeyedMutex();
  const homeDir = options.homeDir ?? os.homedir();

  const read = async (): Promise<WorkspacesFile> => {
    let raw: string;

    try {
      raw = await readFile(file, "utf-8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { folders: [], version: 1 };
      }

      throw error;
    }

    let json: unknown;

    try {
      json = JSON.parse(raw);
    } catch {
      console.error(
        `[workspaces] ${file} is not JSON; starting with no saved folders`
      );

      return { folders: [], version: 1 };
    }

    const parsed = toWorkspacesFile(json);

    if (Result.isSuccess(parsed)) {
      return { folders: [...parsed.success.folders], version: 1 };
    }

    console.error(
      `[workspaces] ${file} failed validation; keeping only valid entries`
    );

    const entries = toFolderEntries(json);
    const folders = Result.isSuccess(entries) ? entries.success.folders : [];

    return {
      folders: folders
        .flatMap((entry) => {
          const result = toStoredFolder(entry);

          return Result.isSuccess(result) ? [result.success] : [];
        })
        .slice(0, MAX_WORKSPACES),
      version: 1,
    };
  };

  const write = async (data: WorkspacesFile): Promise<void> => {
    await mkdir(dataDir, { recursive: true });
    const temp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
    const checked = toWorkspacesFile(data);

    if (Result.isFailure(checked)) {
      throw new BadRequestError("invalid saved folders");
    }

    await writeFile(temp, `${JSON.stringify(checked.success, null, 2)}\n`);
    await rename(temp, file);
  };

  const present = async (folder: StoredFolder): Promise<WorkspaceFolder> => ({
    ...folder,
    missing: !(await isFolder(folder.path)),
  });

  const defaultRow = async (): Promise<WorkspaceFolder | null> => {
    if (!options.defaultFolder) {
      return null;
    }

    const folderPath = await options.defaultFolder.current();

    return {
      addedAt: 0,
      default: true,
      id: DEFAULT_WORKSPACE_ID,
      label: DEFAULT_FOLDER_NAME,
      missing: false,
      path: folderPath,
    };
  };

  const refuseDefault = (id: string): void => {
    if (options.defaultFolder && id === DEFAULT_WORKSPACE_ID) {
      throw new BadRequestError("the default folder always stays in the list");
    }
  };

  const resolveFolder = async (raw: string): Promise<string> => {
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new BadRequestError("path is required");
    }

    if (raw.includes("\0") || raw.length > MAX_PATH_LENGTH) {
      throw new BadRequestError("invalid path");
    }

    if (!path.isAbsolute(raw)) {
      throw new BadRequestError("path must be absolute");
    }

    let real: string;

    try {
      real = await realpath(path.resolve(raw));
    } catch {
      throw new BadRequestError(`folder not found: ${raw}`);
    }

    if (!(await isFolder(real))) {
      throw new BadRequestError(`not a folder: ${real}`);
    }

    const dataRoot = path.resolve(dataDir);

    if (real === dataRoot || real.startsWith(dataRoot + path.sep)) {
      throw new BadRequestError(
        "cannot save a folder inside the studio data dir"
      );
    }

    return real;
  };

  const store: WorkspaceStore = {
    async add(input: {
      path: string;
      label?: string;
    }): Promise<WorkspaceFolder> {
      const real = await resolveFolder(input.path);

      const label =
        input.label === undefined
          ? path.basename(real) || real
          : parseLabel(input.label);

      return lock("file", async () => {
        const data = await read();
        const existing = data.folders.find((folder) => folder.path === real);

        if (existing) {
          return present(existing);
        }

        if (data.folders.length >= MAX_WORKSPACES) {
          throw new BadRequestError(`at most ${MAX_WORKSPACES} saved folders`);
        }

        const folder: StoredFolder = {
          id: workspaceId(),
          path: real,
          label: parseLabel(label),
          addedAt: Date.now(),
        };

        data.folders.push(folder);
        await write(data);

        return present(folder);
      });
    },

    async list(): Promise<WorkspaceList> {
      const data = await read();
      const fallback = await defaultRow();

      const saved = await Promise.all(
        data.folders
          .filter((folder) => folder.path !== fallback?.path)
          .map(present)
      );

      return { homeDir, folders: fallback ? [fallback, ...saved] : saved };
    },

    async remove(id: string): Promise<void> {
      assertSafeId(id, "workspaceId");
      refuseDefault(id);

      return lock("file", async () => {
        const data = await read();
        const next = data.folders.filter((candidate) => candidate.id !== id);

        if (next.length === data.folders.length) {
          throw new NotFoundError(`folder ${id} not found`);
        }

        await write({ ...data, folders: next });
      });
    },

    async rename(id: string, label: string): Promise<WorkspaceFolder> {
      assertSafeId(id, "workspaceId");
      refuseDefault(id);
      const clean = parseLabel(label);

      return lock("file", async () => {
        const data = await read();
        const folder = data.folders.find((candidate) => candidate.id === id);

        if (!folder) {
          throw new NotFoundError(`folder ${id} not found`);
        }

        folder.label = clean;
        await write(data);

        return present(folder);
      });
    },
  };

  bindWorkspaceRuntime(dataDir, store);

  return store;
}
