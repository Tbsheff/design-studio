import { Context, Effect, Layer } from "effect";

import type {
  DoctorViewText,
  PortPlanView,
} from "../../shared/actions/mcp-read/schema.js";
import type { FoundApps } from "../../shared/found-apps.js";
import type { ProjectSearchResult } from "../../shared/project-search.js";
import type { ComponentUsage } from "../../shared/usage-scope.js";
import { readDoctor, toDoctorText } from "./doctor-read.js";
import { readFoundApps } from "./found-apps-read.js";
import { attemptMcpRead } from "./mcp-read-core.js";
import type { McpReadError, PortPlanQuery } from "./mcp-read-core.js";
import { readProjectList } from "./project-list-read.js";
import type { ProjectSummary } from "./project-list-read.js";
import { readProjectSearch } from "./project-search-read.js";
import type { ProjectSearchQuery } from "./project-search-read.js";
import { readUsage } from "./usage-read.js";
import type { UsageQuery } from "./usage-read.js";
import { readVersionList } from "./version-list-read.js";
import type {
  VersionListEntry,
  VersionListQuery,
} from "./version-list-read.js";

interface McpReadStoreApi {
  readonly doctor: (
    projectId: string,
    isFresh: boolean
  ) => Effect.Effect<DoctorViewText, McpReadError>;
  readonly foundApps: (
    isFresh: boolean
  ) => Effect.Effect<FoundApps, McpReadError>;
  readonly portPlan: (
    query: PortPlanQuery
  ) => Effect.Effect<PortPlanView, McpReadError>;
  readonly projectList: () => Effect.Effect<
    readonly ProjectSummary[],
    McpReadError
  >;
  readonly projectSearch: (
    query: ProjectSearchQuery
  ) => Effect.Effect<ProjectSearchResult, McpReadError>;
  readonly usage: (
    query: UsageQuery
  ) => Effect.Effect<ComponentUsage, McpReadError>;
  readonly versionList: (
    query: VersionListQuery
  ) => Effect.Effect<readonly VersionListEntry[], McpReadError>;
}

class McpReadStore extends Context.Service<McpReadStore, McpReadStoreApi>()(
  "design-studio/preview/McpReadStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    McpReadStore,
    McpReadStore.of({
      doctor: Effect.fn("McpReadStore.doctor")(function* run(
        projectId: string,
        isFresh: boolean
      ) {
        return yield* attemptMcpRead(async (runtime) =>
          toDoctorText(
            await readDoctor(
              runtime.projects,
              runtime.preview,
              projectId,
              isFresh
            )
          )
        );
      }),
      foundApps: Effect.fn("McpReadStore.foundApps")(function* run(
        isFresh: boolean
      ) {
        return yield* attemptMcpRead((runtime) =>
          readFoundApps(runtime.projects, isFresh)
        );
      }),
      portPlan: Effect.fn("McpReadStore.portPlan")(function* run(
        query: PortPlanQuery
      ) {
        return yield* attemptMcpRead((runtime) => runtime.planPort(query));
      }),
      projectList: Effect.fn("McpReadStore.projectList")(function* run() {
        return yield* attemptMcpRead((runtime) =>
          readProjectList(runtime.projects)
        );
      }),
      projectSearch: Effect.fn("McpReadStore.projectSearch")(function* run(
        query: ProjectSearchQuery
      ) {
        return yield* attemptMcpRead((runtime) =>
          readProjectSearch(
            runtime.projects,
            runtime.preview,
            runtime.runsDir,
            query
          )
        );
      }),
      usage: Effect.fn("McpReadStore.usage")(function* run(query: UsageQuery) {
        return yield* attemptMcpRead((runtime) =>
          readUsage(runtime.projects, runtime.preview, query)
        );
      }),
      versionList: Effect.fn("McpReadStore.versionList")(function* run(
        query: VersionListQuery
      ) {
        return yield* attemptMcpRead((runtime) =>
          readVersionList(runtime.projects, runtime.versions, query)
        );
      }),
    })
  );
}

export { McpReadStore };

export type { McpReadStoreApi };
