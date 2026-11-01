import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ExportFrame } from "../../shared/export.js";
import type { Publication, PublishBackendMode } from "../../shared/publish.js";
import { createKeyedMutex } from "../store/mutex.js";

export interface PublicationRecord extends Publication {
  frames: ExportFrame[] | null;
  frameIds: string[] | null;
  withComments: boolean;
  hashes?: string[];
}

export interface BackendSettings {
  mode: PublishBackendMode;
  url: string;
  accountId: string | null;
  databaseId: string;
  setUpAt: number;
}

export interface PublishSettings {
  accountId: string | null;
  keyring: boolean;
  subdomains: Record<string, string>;
  backend: BackendSettings | null;
}

export interface PublishStore {
  dir: string;
  list(projectId?: string): Promise<PublicationRecord[]>;
  get(id: string): Promise<PublicationRecord | null>;
  put(record: PublicationRecord): Promise<PublicationRecord>;
  settings(): Promise<PublishSettings>;
  saveSettings(patch: Partial<PublishSettings>): Promise<PublishSettings>;
}

const DEFAULT_SETTINGS: PublishSettings = {
  accountId: null,
  keyring: true,
  subdomains: {},
  backend: null,
};

export function toPublication(r: PublicationRecord): Publication {
  return {
    id: r.id,
    projectId: r.projectId,
    directionId: r.directionId,
    versionId: r.versionId,
    kind: r.kind,
    title: r.title,
    backend: r.backend ?? "legacy-worker",
    workerName: r.workerName ?? null,
    accountId: r.accountId ?? null,
    url: r.url,
    commentsUrl: r.commentsUrl ?? null,
    pages: r.pages ?? [],
    fileCount: r.fileCount,
    bytes: r.bytes,
    password: r.password,
    expiresAt: r.expiresAt,
    noindex: r.noindex ?? true,
    viewerComments: r.viewerComments ?? false,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    status: r.status,
    error: r.error,
    log: r.log ?? "",
    versions: r.versions ?? [],
    views: r.views ?? null,
    commentCount: r.commentCount ?? 0,
    lastUpload: r.lastUpload ?? null,
  };
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  const text = await readFile(file, "utf8").catch(() => null);
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function createPublishStore(dataDir: string): PublishStore {
  const dir = path.join(dataDir, "publish");
  const listFile = path.join(dir, "publications.json");
  const settingsFile = path.join(dir, "settings.json");
  const lock = createKeyedMutex();

  const write = async (file: string, value: unknown): Promise<void> => {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const temp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
    await writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
    await rename(temp, file);
  };

  const read = async (): Promise<PublicationRecord[]> => {
    const parsed = await readJson<unknown>(listFile, []);
    return Array.isArray(parsed) ? (parsed as PublicationRecord[]) : [];
  };

  return {
    dir,
    async list(projectId) {
      const all = await read();
      return (
        projectId ? all.filter((r) => r.projectId === projectId) : all
      ).sort((a, b) => b.createdAt - a.createdAt);
    },
    async get(id) {
      return (await read()).find((r) => r.id === id) ?? null;
    },
    put(record) {
      return lock("publications", async () => {
        const all = await read();
        const at = all.findIndex((r) => r.id === record.id);
        if (at >= 0) all[at] = record;
        else all.push(record);
        await write(listFile, all);
        return record;
      });
    },
    async settings() {
      return {
        ...DEFAULT_SETTINGS,
        ...(await readJson<Partial<PublishSettings>>(settingsFile, {})),
      };
    },
    saveSettings(patch) {
      return lock("settings", async () => {
        const next = {
          ...DEFAULT_SETTINGS,
          ...(await readJson<Partial<PublishSettings>>(settingsFile, {})),
          ...patch,
        };
        await write(settingsFile, next);
        return next;
      });
    },
  };
}
