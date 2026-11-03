import { chmod, copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { writeAtomic } from "../platform/atomic-write/index.js";
import { loadConfig } from "../platform/config/index.js";
import { readJsonFile } from "../platform/json-file/index.js";
import { createKeyedMutex } from "../platform/mutex/index.js";
import { readBinding, setBinding } from "../store/bindings.js";
import type { ProjectBinding } from "../store/bindings.js";

interface MigrationAccount {
  readonly deviceId: string;
  readonly personalOrgId: string;
  readonly userId: string;
}

interface ProjectProgress {
  readonly backedUp: boolean;
  readonly bound: boolean;
}

interface LegacyMcpRecord {
  readonly bannerPending: boolean;
  readonly orgId: string;
  readonly readOnly: true;
  readonly tokenFile: string;
}

interface MigrationState {
  readonly bindingsDone: boolean;
  readonly legacyMcp: LegacyMcpRecord | null;
  readonly projects: Readonly<Record<string, ProjectProgress>>;
  readonly version: 1;
}

const CLOUD_DIR = "cloud";
const ACCOUNT_FILE = "account.json";
const MIGRATION_FILE = "migration.json";
const PROJECTS_DIR = "projects";
const PROJECT_FILE = "project.json";
const BACKUP_SUFFIX = ".pre-org";
const MCP_FILE = "mcp.json";
const MAIN_DIRECTION_ID = "main";
const PRIVATE_MODE = 0o600;
const MUTEX_KEY = "cloud-migration";

const runExclusive = createKeyedMutex();

const ProgressSchema = z.object({
  backedUp: z.boolean().default(false),
  bound: z.boolean().default(false),
});

const LegacyMcpSchema = z.object({
  bannerPending: z.boolean(),
  orgId: z.string(),
  readOnly: z.literal(true),
  tokenFile: z.string(),
});

const MigrationStateSchema = z.object({
  bindingsDone: z.boolean().default(false),
  legacyMcp: LegacyMcpSchema.nullable().default(null),
  projects: z.record(z.string(), ProgressSchema).default({}),
  version: z.literal(1).default(1),
});

const AccountSchema = z.object({
  deviceId: z.string(),
  personalOrgId: z.string(),
  userId: z.string(),
});

const toEmptyState = (): MigrationState => ({
  bindingsDone: false,
  legacyMcp: null,
  projects: {},
  version: 1,
});

const toCloudFile = (dataDir: string, name: string): string =>
  path.join(dataDir, CLOUD_DIR, name);

const toDataDir = (dataDir: string | null): string => {
  if (dataDir !== null) {
    return dataDir;
  }

  return loadConfig().dataDir;
};

const writePrivate = async (file: string, text: string): Promise<void> => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeAtomic(file, text, { cleanup: "always", createDir: true });
  await chmod(file, PRIVATE_MODE);
};

const writeJson = (
  file: string,
  value: MigrationState | MigrationAccount | ProjectRecord
): Promise<void> => writePrivate(file, `${JSON.stringify(value, null, 2)}\n`);

const readState = async (dataDir: string): Promise<MigrationState> => {
  const parsed = await readJsonFile(
    toCloudFile(dataDir, MIGRATION_FILE),
    MigrationStateSchema
  );

  if (parsed === null) {
    return toEmptyState();
  }

  return parsed;
};

const saveState = (dataDir: string, state: MigrationState): Promise<void> =>
  writeJson(toCloudFile(dataDir, MIGRATION_FILE), state);

const withProgress = (
  state: MigrationState,
  pid: string,
  patch: Partial<ProjectProgress>
): MigrationState => ({
  ...state,
  projects: {
    ...state.projects,
    [pid]: {
      backedUp: false,
      bound: false,
      ...state.projects[pid],
      ...patch,
    },
  },
});

const readAccount = async (file: string): Promise<MigrationAccount | null> => {
  try {
    return await readJsonFile(file, AccountSchema);
  } catch {
    return null;
  }
};

const writeAccount = async (
  dataDir: string,
  account: MigrationAccount
): Promise<void> => {
  const file = toCloudFile(dataDir, ACCOUNT_FILE);
  const existing = await readAccount(file);

  if (
    existing !== null &&
    existing.userId === account.userId &&
    existing.personalOrgId === account.personalOrgId &&
    existing.deviceId === account.deviceId
  ) {
    return;
  }

  await writeJson(file, {
    deviceId: account.deviceId,
    personalOrgId: account.personalOrgId,
    userId: account.userId,
  });
};

const fileExists = async (file: string): Promise<boolean> => {
  try {
    await stat(file);

    return true;
  } catch {
    return false;
  }
};

const listProjectIds = async (dataDir: string): Promise<string[]> => {
  try {
    const entries = await readdir(path.join(dataDir, PROJECTS_DIR), {
      withFileTypes: true,
    });

    return entries
      .flatMap((entry) => {
        if (entry.isDirectory()) {
          return [entry.name];
        }

        return [];
      })
      .toSorted();
  } catch {
    return [];
  }
};

const DirectionSchema = z.looseObject({
  id: z.string().optional(),
  workTree: z.string().optional(),
});

const ImportedSchema = z.looseObject({ sourcePath: z.string().optional() });

const AppSchema = z.looseObject({
  appDir: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
});

const ProjectSchema = z.looseObject({
  app: AppSchema.nullable().optional(),
  directions: z.array(DirectionSchema).optional(),
  imported: ImportedSchema.nullable().optional(),
  orgId: z.string().optional(),
});

type ProjectRecord = z.infer<typeof ProjectSchema>;

const toText = (text: string | undefined): string | null => {
  if (!text) {
    return null;
  }

  return text;
};

const toMainWorkTree = (project: ProjectRecord): string | null => {
  const directions = project.directions ?? [];
  const main = directions.find((item) => item.id === MAIN_DIRECTION_ID);
  const [first] = directions;
  const picked = main ?? first;

  return toText(picked?.workTree);
};

const toBinding = (org: string, project: ProjectRecord): ProjectBinding => ({
  appDir: toText(project.app?.appDir),
  attachmentPaths: [],
  cloudRef: null,
  env: project.app?.env ?? {},
  orgId: org,
  sourcePath: toText(project.imported?.sourcePath),
  workTree: toMainWorkTree(project),
});

const stripProject = (project: ProjectRecord): ProjectRecord => {
  const next: ProjectRecord = { ...project };

  delete next.orgId;

  if (next.directions) {
    next.directions = next.directions.map((item) => ({
      ...item,
      workTree: "",
    }));
  }

  if (next.imported) {
    next.imported = { ...next.imported, sourcePath: "" };
  }

  if (next.app) {
    next.app = { ...next.app, appDir: "" };
    delete next.app.env;
  }

  return next;
};

const readProjectRecord = async (
  file: string
): Promise<ProjectRecord | null> => {
  try {
    return await readJsonFile(file, ProjectSchema);
  } catch {
    return null;
  }
};

const backupProject = async (file: string): Promise<void> => {
  const backup = `${file}${BACKUP_SUFFIX}`;

  if (await fileExists(backup)) {
    return;
  }

  await copyFile(file, backup);
  await chmod(backup, PRIVATE_MODE);
};

const migrateProject = async (
  dataDir: string,
  account: MigrationAccount,
  pid: string,
  state: MigrationState
): Promise<MigrationState> => {
  const file = path.join(dataDir, PROJECTS_DIR, pid, PROJECT_FILE);
  const project = await readProjectRecord(file);

  if (project === null) {
    return state;
  }

  let next = state;

  await backupProject(file);
  next = withProgress(next, pid, { backedUp: true });

  const existing = await readBinding(account.personalOrgId, pid, dataDir);

  if (existing === null) {
    await setBinding(pid, toBinding(account.personalOrgId, project), dataDir);
  }

  next = withProgress(next, pid, { bound: true });
  await saveState(dataDir, next);

  await writeJson(file, stripProject(project));

  return next;
};

const recordLegacyMcp = async (
  dataDir: string,
  account: MigrationAccount,
  state: MigrationState
): Promise<MigrationState> => {
  if (state.legacyMcp !== null) {
    return state;
  }

  if (!(await fileExists(path.join(dataDir, MCP_FILE)))) {
    return state;
  }

  return {
    ...state,
    legacyMcp: {
      bannerPending: true,
      orgId: account.personalOrgId,
      readOnly: true,
      tokenFile: MCP_FILE,
    },
  };
};

const migrateAll = async (
  dataDir: string,
  account: MigrationAccount
): Promise<MigrationState> => {
  await writeAccount(dataDir, account);

  let state = await readState(dataDir);

  for (const pid of await listProjectIds(dataDir)) {
    state = await migrateProject(dataDir, account, pid, state);
  }

  state = await recordLegacyMcp(dataDir, account, state);
  state = { ...state, bindingsDone: true };
  await saveState(dataDir, state);

  return state;
};

const runMigration = (
  dataDir: string,
  account: MigrationAccount
): Promise<MigrationState> =>
  runExclusive(MUTEX_KEY, () => migrateAll(dataDir, account));

const isBindingMigrated = async (
  pid: string,
  dataDir: string | null = null
): Promise<boolean> => {
  const state = await readState(toDataDir(dataDir));

  return state.projects[pid]?.bound === true;
};

export { isBindingMigrated, runMigration };

export type { LegacyMcpRecord, MigrationAccount, MigrationState };
