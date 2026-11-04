import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

import type { Direction, SessionResetReason } from "../../shared/actions/_core/contracts.js";
import type { LoadedPack, PackRegistry } from "../design-system/packs.js";
import {
  BadRequestError,
  NotFoundError,
  isNodeError,
} from "../platform/errors/index.js";

function freshSessionPatch(reason: SessionResetReason): Partial<Direction> {
  return { sessionCostUsd: 0, sessionId: null, sessionResetReason: reason };
}

async function resolvePack(
  registry: PackRegistry,
  raw: unknown
): Promise<LoadedPack | null> {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new BadRequestError("packId must be a string or null");
  }
  const pack = await registry.get(raw);

  if (!pack) {
    throw new BadRequestError(`unknown packId: ${raw}`);
  }
  return pack;
}

function parseJsonLines<T>(text: string): T[] {
  const items: T[] = [];

  for (const line of text.split("\n")) {
    if (line.trim() === "") {
      continue;
    }
    try {
      items.push(JSON.parse(line) as T);
    } catch {
      continue;
    }
  }

  return items;
}

const PROJECT_FILE_DIRS = ["checks", "runs"];

async function resolveProjectFile(
  projectDir: string,
  requested: string
): Promise<string> {
  if (requested.includes("\0")) {
    throw new BadRequestError("invalid path");
  }
  const realProject = await realpath(projectDir);
  const candidate = path.resolve(projectDir, requested);

  const real = await realpath(candidate).catch(() => {
    throw new NotFoundError("file not found");
  });

  if (path.extname(real).toLowerCase() !== ".png") {
    throw new NotFoundError("file not found");
  }
  const allowed = PROJECT_FILE_DIRS.some((dir) =>
    real.startsWith(path.join(realProject, dir) + path.sep)
  );

  if (!allowed) {
    throw new NotFoundError("file not found");
  }
  return real;
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf-8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export {
  freshSessionPatch,
  parseJsonLines,
  readOptional,
  resolvePack,
  resolveProjectFile,
};
