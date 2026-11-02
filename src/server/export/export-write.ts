import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { downloadsFolder, isInside, safeFolder } from "../mcp/folders.js";
import type { ExportRuntime } from "./export-core.js";

interface ExportTarget {
  readonly folder: string;
  readonly trusted: boolean;
}

const NAME_TRIES = 1000;

const toCandidate = (folder: string, name: string, attempt: number): string => {
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length) || "export";

  if (attempt === 1) {
    return path.join(folder, `${stem}${ext}`);
  }

  return path.join(folder, `${stem}-${attempt}${ext}`);
};

const tryWrite = async (
  target: string,
  bytes: Uint8Array
): Promise<boolean> => {
  try {
    await writeFile(target, bytes, { flag: "wx" });

    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      return false;
    }

    throw error;
  }
};

interface WriteJob {
  readonly bytes: Uint8Array;
  readonly folder: string;
  readonly name: string;
}

const writeFrom = async (job: WriteJob, attempt: number): Promise<string> => {
  if (attempt >= NAME_TRIES) {
    throw new Error(`no free file name for ${job.name}`);
  }

  const target = toCandidate(job.folder, job.name, attempt);

  if (await tryWrite(target, job.bytes)) {
    return target;
  }

  return writeFrom(job, attempt + 1);
};

const writeUnique = async (
  folder: string,
  name: string,
  bytes: Uint8Array
): Promise<string> => {
  await mkdir(folder, { recursive: true });

  return writeFrom({ bytes, folder, name }, 1);
};

const toExportsFolder = (runtime: ExportRuntime, projectId: string): string =>
  path.join(runtime.dataDir, "exports", projectId);

const readProjectsFolder = async (
  runtime: ExportRuntime
): Promise<string | null> => {
  if (runtime.projectsFolder === null) {
    return null;
  }

  try {
    return await safeFolder(await runtime.projectsFolder(), runtime.dataDir);
  } catch {
    return null;
  }
};

const resolveExportTarget = async (
  runtime: ExportRuntime,
  projectId: string,
  raw: string | null
): Promise<ExportTarget> => {
  if (raw === null) {
    return { folder: toExportsFolder(runtime, projectId), trusted: true };
  }

  const [folder, projects, downloads] = await Promise.all([
    safeFolder(raw, runtime.dataDir),
    readProjectsFolder(runtime),
    downloadsFolder(),
  ]);

  const trusted =
    isInside(folder, downloads) ||
    (projects !== null && isInside(folder, projects));

  return { folder, trusted };
};

export { resolveExportTarget, toExportsFolder, writeUnique };

export type { ExportTarget };
