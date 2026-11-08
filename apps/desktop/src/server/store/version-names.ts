import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Version } from "@design-studio/contracts";
import { Result, Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";
import { BadRequestError, assertSafeId } from "../platform/errors/index.js";
import { createKeyedMutex } from "../platform/mutex/index.js";

export const VERSION_NAME_MAX = 80;
const FILE = "version-names.json";

const NamesFile = Schema.Record(
  Schema.String.check(Schema.isMinLength(1)),
  Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(VERSION_NAME_MAX)
  )
);

const decodeNames = toDecoder(Schema.fromJsonString(NamesFile), "ignore");

type Names = Record<string, string>;

export interface VersionNames {
  all(projectId: string): Promise<Names>;
  set(
    projectId: string,
    versionId: string,
    name: string | null
  ): Promise<string | null>;
  apply(projectId: string, versions: Version[]): Promise<Version[]>;
}

export function parseVersionName(raw: unknown): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw !== "string") {
    throw new BadRequestError("name must be a string or null");
  }

  const name = raw.trim().replaceAll(/\s+/g, " ");

  if (name.length > VERSION_NAME_MAX) {
    throw new BadRequestError(
      `name must be ${VERSION_NAME_MAX} characters or fewer`
    );
  }

  return name === "" ? null : name;
}

export function createVersionNames(
  projectDir: (projectId: string) => string
): VersionNames {
  const lock = createKeyedMutex();
  const cache = new Map<string, Names>();

  const fileOf = (projectId: string): string =>
    path.join(projectDir(assertSafeId(projectId, "projectId")), FILE);

  const load = async (projectId: string): Promise<Names> => {
    try {
      const parsed = decodeNames(await readFile(fileOf(projectId), "utf-8"));

      if (Result.isSuccess(parsed)) {
        return { ...parsed.success };
      }
    } catch {
      return {};
    }

    return {};
  };

  const read = async (projectId: string): Promise<Names> => {
    const cached = cache.get(projectId);

    if (cached) {
      return cached;
    }

    const names = await load(projectId);
    cache.set(projectId, names);

    return names;
  };

  return {
    all: read,
    async apply(projectId, versions) {
      const names = await read(projectId);

      if (Object.keys(names).length === 0) {
        return versions;
      }

      return versions.map((version) => {
        const name = names[version.id];

        return name ? { ...version, name } : version;
      });
    },
    set(projectId, versionId, name) {
      assertSafeId(versionId, "versionId");

      return lock(projectId, async () => {
        const next = { ...(await read(projectId)) };

        if (name === null) {
          delete next[versionId];
        } else {
          next[versionId] = name;
        }

        const file = fileOf(projectId);
        await mkdir(path.dirname(file), { recursive: true });
        const temp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
        await writeFile(temp, JSON.stringify(next, null, 2));
        await rename(temp, file);
        cache.set(projectId, next);

        return name;
      });
    },
  };
}

const LISTED_FILES_MAX = 200;

export function trimListedFiles(versions: Version[]): Version[] {
  return versions.map((version) =>
    version.changedFiles.length > LISTED_FILES_MAX
      ? {
          ...version,
          changedFiles: version.changedFiles.slice(0, LISTED_FILES_MAX),
          changedFilesTotal: version.changedFiles.length,
        }
      : version
  );
}
