import path from "node:path";

import { Context, Effect, Layer, Schema, Semaphore } from "effect";

import {
  AccountFileSchema,
  MigrationStateSchema,
} from "../../shared/cloud-contracts.js";
import type {
  AccountFile,
  MigrationState,
  ProjectBinding,
  ProjectProgress,
} from "../../shared/cloud-contracts.js";
import {
  PRIVATE_MODE,
  setPrivateJson,
} from "../platform/atomic-write/index.js";
import { loadConfig } from "../platform/config/index.js";
import {
  duplicateFileOnce,
  hasFile,
  listFileNames,
  listFolderNames,
  toJsonFileReader,
} from "../platform/local-file/index.js";
import { DeviceBindings } from "../store/index.js";
import type { DeviceBindingsApi } from "../store/index.js";
import {
  LegacyPublicationRowSchema,
  toLegacyRecord,
} from "./legacy-publications.js";
import type { LegacyCloudflareRecord } from "./legacy-publications.js";

interface CloudMigrationRunnerApi {
  readonly isBound: (projectId: string) => Effect.Effect<boolean>;
  readonly listLegacyPublications: () => Effect.Effect<
    readonly LegacyCloudflareRecord[]
  >;
  readonly run: (account: AccountFile) => Effect.Effect<MigrationState>;
}

interface MigrationTarget {
  readonly bindings: DeviceBindingsApi;
  readonly dataDir: string;
  readonly stateFile: string;
}

const CLOUD_DIR = "cloud";
const ACCOUNT_FILE = "account.json";
const MIGRATION_FILE = "migration.json";
const PROJECTS_DIR = "projects";
const PROJECT_FILE = "project.json";
const ATTACHMENTS_DIR = "attachments";
const BACKUP_SUFFIX = ".pre-org";
const MCP_FILE = "mcp.json";
const PUBLICATIONS_FILE = path.join("publish", "publications.json");

const StringMapSchema = Schema.Record(Schema.String, Schema.String);

const DirectionRecordSchema = Schema.Struct({
  id: Schema.String,
  workTree: Schema.optionalKey(Schema.String),
});

const AppRecordSchema = Schema.Struct({
  appDir: Schema.optionalKey(Schema.String),
  env: Schema.optionalKey(StringMapSchema),
});

const ImportedRecordSchema = Schema.Struct({
  sourcePath: Schema.optionalKey(Schema.String),
});

const ProjectRecordSchema = Schema.Struct({
  app: Schema.optionalKey(Schema.NullOr(AppRecordSchema)),
  directions: Schema.optionalKey(Schema.Array(DirectionRecordSchema)),
  imported: Schema.optionalKey(Schema.NullOr(ImportedRecordSchema)),
});

const AttachmentRecordSchema = Schema.Struct({
  id: Schema.String,
  path: Schema.String,
});

type ProjectRecord = typeof ProjectRecordSchema.Type;

const readAccountFile = toJsonFileReader(AccountFileSchema);
const readStateFile = toJsonFileReader(MigrationStateSchema);
const readProjectFile = toJsonFileReader(ProjectRecordSchema);
const readAttachmentFile = toJsonFileReader(AttachmentRecordSchema);
const readPublicationsFile = toJsonFileReader(Schema.Array(Schema.Unknown));

const isPublicationRow = Schema.is(LegacyPublicationRowSchema);

const toEmptyState = (): MigrationState => ({
  isBindingsDone: false,
  legacyMcp: null,
  projects: {},
  version: 1,
});

const toTextOrNull = (text: string | null): string | null => {
  if (text === null || text === "") {
    return null;
  }

  return text;
};

const toWorkTrees = (project: ProjectRecord): Record<string, string> =>
  Object.fromEntries(
    (project.directions ?? []).flatMap((direction) => {
      const workTree = toTextOrNull(direction.workTree ?? null);

      if (workTree === null) {
        return [];
      }

      return [[direction.id, workTree]];
    })
  );

const toBinding = (
  orgId: string,
  project: ProjectRecord,
  attachmentPaths: Readonly<Record<string, string>>
): ProjectBinding => {
  const appDir = toTextOrNull(project.app?.appDir ?? null);
  const cloudRef = null;
  const env = project.app?.env ?? {};
  const sourcePath = toTextOrNull(project.imported?.sourcePath ?? null);
  const workTrees = toWorkTrees(project);

  return {
    appDir,
    attachmentPaths,
    cloudRef,
    env,
    orgId,
    sourcePath,
    workTrees,
  };
};

const toProgressState = (
  state: MigrationState,
  projectId: string,
  patch: Partial<ProjectProgress>
): MigrationState => ({
  ...state,
  projects: {
    ...state.projects,
    [projectId]: {
      isBackedUp: false,
      isBound: false,
      ...state.projects[projectId],
      ...patch,
    },
  },
});

const isSameAccount = (left: AccountFile, right: AccountFile): boolean =>
  left.userId === right.userId &&
  left.personalOrgId === right.personalOrgId &&
  left.deviceId === right.deviceId;

const setAccount = Effect.fn("CloudMigrationRunner.setAccount")(function* run(
  target: MigrationTarget,
  account: AccountFile
) {
  const file = path.join(target.dataDir, CLOUD_DIR, ACCOUNT_FILE);
  const existing = yield* readAccountFile(file);

  if (existing !== null && isSameAccount(existing, account)) {
    return;
  }

  yield* setPrivateJson(file, account);
});

const listAttachmentPaths = Effect.fn(
  "CloudMigrationRunner.listAttachmentPaths"
)(function* run(projectFolder: string) {
  const folder = path.join(projectFolder, ATTACHMENTS_DIR);
  const names = yield* listFileNames(folder);
  const paths: Record<string, string> = {};

  for (const name of names.filter((entry) => entry.endsWith(".json"))) {
    const record = yield* readAttachmentFile(path.join(folder, name));

    if (record !== null) {
      paths[record.id] = record.path;
    }
  }

  return paths;
});

const getState = Effect.fn("CloudMigrationRunner.getState")(function* run(
  target: MigrationTarget
) {
  return (yield* readStateFile(target.stateFile)) ?? toEmptyState();
});

const migrateProject = Effect.fn("CloudMigrationRunner.migrateProject")(
  function* run(
    target: MigrationTarget,
    account: AccountFile,
    projectId: string
  ) {
    const projectFolder = path.join(target.dataDir, PROJECTS_DIR, projectId);
    const file = path.join(projectFolder, PROJECT_FILE);
    const project = yield* readProjectFile(file);
    const state = yield* getState(target);

    if (project === null) {
      return state;
    }

    yield* duplicateFileOnce(file, `${file}${BACKUP_SUFFIX}`, PRIVATE_MODE);

    const key = { orgId: account.personalOrgId, projectId };
    const existing = yield* target.bindings.get(key);

    if (existing === null) {
      const attachmentPaths = yield* listAttachmentPaths(projectFolder);

      yield* target.bindings.set(
        projectId,
        toBinding(account.personalOrgId, project, attachmentPaths)
      );
    }

    const next = toProgressState(state, projectId, {
      isBackedUp: true,
      isBound: true,
    });

    yield* setPrivateJson(target.stateFile, next);

    return next;
  }
);

const setLegacyMcp = Effect.fn("CloudMigrationRunner.setLegacyMcp")(
  function* run(target: MigrationTarget, account: AccountFile) {
    const state = yield* getState(target);

    const hasToken = yield* hasFile(path.join(target.dataDir, MCP_FILE));

    if (state.legacyMcp !== null || !hasToken) {
      return state;
    }

    return {
      ...state,
      legacyMcp: {
        isBannerPending: true,
        isReadOnly: true as const,
        orgId: account.personalOrgId,
        tokenFile: MCP_FILE,
      },
    };
  }
);

const runMigration = Effect.fn("CloudMigrationRunner.run")(function* run(
  target: MigrationTarget,
  account: AccountFile
) {
  yield* setAccount(target, account);

  const projectIds = yield* listFolderNames(
    path.join(target.dataDir, PROJECTS_DIR)
  );

  for (const projectId of projectIds) {
    yield* migrateProject(target, account, projectId);
  }

  const withMcp = yield* setLegacyMcp(target, account);
  const done = { ...withMcp, isBindingsDone: true };

  yield* setPrivateJson(target.stateFile, done);

  return done;
});

const listLegacyPublications = Effect.fn(
  "CloudMigrationRunner.listLegacyPublications"
)(function* run(target: MigrationTarget) {
  const entries = yield* readPublicationsFile(
    path.join(target.dataDir, PUBLICATIONS_FILE)
  );

  return (entries ?? []).flatMap((entry) => {
    if (isPublicationRow(entry)) {
      return [toLegacyRecord(entry)];
    }

    return [];
  });
});

class CloudMigrationRunner extends Context.Service<
  CloudMigrationRunner,
  CloudMigrationRunnerApi
>()("design-studio/cloud/CloudMigrationRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    CloudMigrationRunner,
    Effect.gen(function* build() {
      const bindings = yield* DeviceBindings;
      const lock = yield* Semaphore.make(1);
      const { dataDir } = loadConfig();

      const target = {
        bindings,
        dataDir,
        stateFile: path.join(dataDir, CLOUD_DIR, MIGRATION_FILE),
      };

      return CloudMigrationRunner.of({
        isBound: Effect.fn("CloudMigrationRunner.isBound")(
          function* run(projectId) {
            const state = yield* getState(target);

            return state.projects[projectId]?.isBound === true;
          }
        ),
        listLegacyPublications: () => listLegacyPublications(target),
        run: (account) => lock.withPermits(1)(runMigration(target, account)),
      });
    })
  );
}

export { CloudMigrationRunner };

export type { CloudMigrationRunnerApi };
