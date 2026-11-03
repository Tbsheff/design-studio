import { randomBytes } from "node:crypto";
import { chmod } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { writeAtomic } from "../platform/atomic-write/index.js";
import { loadConfig } from "../platform/config/index.js";
import { readJsonFile } from "../platform/json-file/index.js";
import { createKeyedMutex } from "../platform/mutex/index.js";

interface CloudRef {
  readonly orgId: string;
  readonly pid: string;
  readonly sig: string;
}

interface ProjectBinding {
  readonly appDir: string | null;
  readonly attachmentPaths: readonly string[];
  readonly cloudRef: CloudRef | null;
  readonly env: Readonly<Record<string, string>>;
  readonly orgId: string;
  readonly sourcePath: string | null;
  readonly workTree: string | null;
}

interface BindingsFile {
  readonly bindings: Readonly<Record<string, ProjectBinding>>;
  readonly pidMap: Readonly<Record<string, string>>;
  readonly version: 1;
}

const BINDINGS_FILE = "bindings.json";
const BINDINGS_MODE = 0o600;
const LOCAL_ORG_ID = "local";
const MUTEX_KEY = "bindings";
const SUFFIX_BYTES = 4;
const MAX_PID_LENGTH = 64;
const BASE_PID_LENGTH = 40;

const runExclusive = createKeyedMutex();

const toEmptyFile = (): BindingsFile => ({
  bindings: {},
  pidMap: {},
  version: 1,
});

const toBindingKey = (orgId: string, pid: string): string => `${orgId}:${pid}`;

const toBindingsPath = (dataDir: string): string =>
  path.join(dataDir, BINDINGS_FILE);

const CloudRefSchema = z.object({
  orgId: z.string(),
  pid: z.string(),
  sig: z.string(),
});

const ProjectBindingSchema = z.object({
  appDir: z.string().nullable().default(null),
  attachmentPaths: z.array(z.string()).default([]),
  cloudRef: CloudRefSchema.nullable().default(null),
  env: z.record(z.string(), z.string()).default({}),
  orgId: z.string(),
  sourcePath: z.string().nullable().default(null),
  workTree: z.string().nullable().default(null),
});

const BindingsFileSchema = z.object({
  bindings: z.record(z.string(), ProjectBindingSchema).default({}),
  pidMap: z.record(z.string(), z.string()).default({}),
  version: z.literal(1).default(1),
});

const readBindingsFile = async (dataDir: string): Promise<BindingsFile> => {
  const parsed = await readJsonFile(
    toBindingsPath(dataDir),
    BindingsFileSchema
  );

  if (parsed === null) {
    return toEmptyFile();
  }

  return parsed;
};

const writeBindingsFile = async (
  dataDir: string,
  file: BindingsFile
): Promise<void> => {
  const target = toBindingsPath(dataDir);

  await writeAtomic(target, `${JSON.stringify(file, null, 2)}\n`, {
    cleanup: "always",
    createDir: true,
  });
  await chmod(target, BINDINGS_MODE);
};

const toDataDir = (dataDir: string | null): string => {
  if (dataDir !== null) {
    return dataDir;
  }

  return loadConfig().dataDir;
};

const changeBindings = (
  dataDir: string | null,
  change: (file: BindingsFile) => BindingsFile
): Promise<BindingsFile> => {
  const dir = toDataDir(dataDir);

  return runExclusive(MUTEX_KEY, async () => {
    const current = await readBindingsFile(dir);
    const next = change(current);

    if (next !== current) {
      await writeBindingsFile(dir, next);
    }

    return next;
  });
};

const readBinding = async (
  orgId: string,
  pid: string,
  dataDir: string | null = null
): Promise<ProjectBinding | null> => {
  const file = await readBindingsFile(toDataDir(dataDir));

  return file.bindings[toBindingKey(orgId, pid)] ?? null;
};

const readOrgOfProject = async (
  pid: string,
  dataDir: string | null = null
): Promise<string | null> => {
  const file = await readBindingsFile(toDataDir(dataDir));
  const suffix = `:${pid}`;

  for (const [key, binding] of Object.entries(file.bindings)) {
    if (key.endsWith(suffix) && key === toBindingKey(binding.orgId, pid)) {
      return binding.orgId;
    }
  }

  return null;
};

const setBinding = async (
  pid: string,
  binding: ProjectBinding,
  dataDir: string | null = null
): Promise<void> => {
  await changeBindings(dataDir, (file) => ({
    ...file,
    bindings: {
      ...file.bindings,
      [toBindingKey(binding.orgId, pid)]: binding,
    },
  }));
};

const setCloudRef = async (
  orgId: string,
  pid: string,
  cloudRef: CloudRef,
  dataDir: string | null = null
): Promise<void> => {
  await changeBindings(dataDir, (file) => {
    const key = toBindingKey(orgId, pid);
    const existing = file.bindings[key] ?? null;

    if (existing === null) {
      return file;
    }

    return {
      ...file,
      bindings: { ...file.bindings, [key]: { ...existing, cloudRef } },
    };
  });
};

const removeBinding = async (
  orgId: string,
  pid: string,
  dataDir: string | null = null
): Promise<void> => {
  await changeBindings(dataDir, (file) => {
    const key = toBindingKey(orgId, pid);

    if (!(key in file.bindings)) {
      return file;
    }

    const rest = Object.fromEntries(
      Object.entries(file.bindings).filter(([entryKey]) => entryKey !== key)
    );

    return { ...file, bindings: rest };
  });
};

const hasOtherOrgBinding = (
  file: BindingsFile,
  orgId: string,
  pid: string
): boolean =>
  Object.entries(file.bindings).some(
    ([key, binding]) =>
      binding.orgId !== orgId && key === toBindingKey(binding.orgId, pid)
  );

const toRekeyedPid = (cloudPid: string): string => {
  const suffix = randomBytes(SUFFIX_BYTES).toString("hex");
  const base = cloudPid.slice(0, BASE_PID_LENGTH);

  return `${base}-${suffix}`.slice(0, MAX_PID_LENGTH);
};

const allocateLocalPid = async (
  orgId: string,
  cloudPid: string,
  dataDir: string | null = null
): Promise<string> => {
  const mapKey = toBindingKey(orgId, cloudPid);
  let localPid = cloudPid;

  await changeBindings(dataDir, (file) => {
    const mapped = file.pidMap[mapKey] ?? null;

    if (mapped !== null) {
      localPid = mapped;

      return file;
    }

    if (!hasOtherOrgBinding(file, orgId, cloudPid)) {
      return file;
    }

    localPid = toRekeyedPid(cloudPid);

    return { ...file, pidMap: { ...file.pidMap, [mapKey]: localPid } };
  });

  return localPid;
};

export {
  allocateLocalPid,
  LOCAL_ORG_ID,
  readBinding,
  readBindingsFile,
  readOrgOfProject,
  removeBinding,
  setBinding,
  setCloudRef,
  toBindingsPath,
};

export type { BindingsFile, CloudRef, ProjectBinding };
