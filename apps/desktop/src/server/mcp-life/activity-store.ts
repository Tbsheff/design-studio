import type { StudioActivity } from "@design-studio/actions/studio/schema";
import type { Project } from "@design-studio/contracts";
import { Clock, Context, Effect, Layer } from "effect";

import { DevServerStore } from "../app/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { RunLogStore } from "../run-log/index.js";
import { ProjectStore } from "../store/index.js";
import type { LocalOrgScope } from "../store/index.js";
import { getBranches } from "./activity-git.js";
import {
  toActiveProjects,
  toActivity,
  toAppFolders,
  toAppProjects,
} from "./activity-rows.js";
import type {
  ProjectEdits,
  ProjectRuns,
  ProjectServer,
} from "./activity-rows.js";
import { McpActivityLog } from "./mcp-activity-log.js";
import { McpApprovalStore } from "./mcp-approval-store.js";
import { McpSettingsStore } from "./mcp-settings-store.js";

interface ActivityStoreApi {
  readonly read: (
    limit: number
  ) => Effect.Effect<StudioActivity, KnownFailure, LocalOrgScope>;
}

const RUNS_PER_PROJECT = 6;

const OPTIONS = { concurrency: 4 } as const;

const RUN_QUERY = {
  cursor: null,
  light: true,
  limit: RUNS_PER_PROJECT,
} as const;

class ActivityStore extends Context.Service<ActivityStore, ActivityStoreApi>()(
  "design-studio/mcp-life/ActivityStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    ActivityStore,
    Effect.gen(function* make() {
      const clock = yield* Clock.Clock;
      const projectStore = yield* ProjectStore;
      const runLog = yield* RunLogStore;
      const editLog = yield* McpActivityLog;
      const approvalStore = yield* McpApprovalStore;
      const settingsStore = yield* McpSettingsStore;
      const devServers = yield* DevServerStore;

      const toRuns = (project: Project): Effect.Effect<ProjectRuns> =>
        runLog.list(project.id, RUN_QUERY).pipe(
          Effect.map((page) => ({ project, runs: page.items })),
          Effect.orElseSucceed(() => ({ project, runs: [] }))
        );

      const toEdits = (project: Project): Effect.Effect<ProjectEdits> =>
        editLog.list(project.id).pipe(
          Effect.map((list) => ({
            edits: list.activity.slice(-RUNS_PER_PROJECT),
            project,
          })),
          Effect.orElseSucceed(() => ({ edits: [], project }))
        );

      const toServer = (project: Project): Effect.Effect<ProjectServer> =>
        devServers.status(project.id).pipe(
          Effect.map((status) => ({ project, status })),
          Effect.orElseSucceed(() => ({ project, status: null }))
        );

      const read = Effect.fn("ActivityStore.read")(function* run(
        limit: number
      ) {
        const now = yield* clock.currentTimeMillis;
        const projects = yield* projectStore.list();
        const active = toActiveProjects(projects);
        const apps = toAppProjects(projects);

        const runs = yield* Effect.all(
          active.map((project) => toRuns(project)),
          OPTIONS
        );

        const edits = yield* Effect.all(
          active.map((project) => toEdits(project)),
          OPTIONS
        );

        const servers = yield* Effect.all(
          apps.map((project) => toServer(project)),
          OPTIONS
        );

        const poll = yield* approvalStore.poll("", 0);
        const status = yield* settingsStore.status();

        const branchList = yield* Effect.promise(() =>
          getBranches(toAppFolders(projects))
        );

        return toActivity({
          approvals: poll.pending,
          branches: branchList,
          edits,
          limit,
          now,
          projects,
          runs,
          servers,
          status,
        });
      });

      return ActivityStore.of({ read });
    })
  );
}

export { ActivityStore };

export type { ActivityStoreApi };
