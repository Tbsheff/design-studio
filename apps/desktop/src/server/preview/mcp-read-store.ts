import type {
  DoctorViewText,
  PortPlanView,
} from "@design-studio/actions/workspace/schema";
import type { ElementVariantInfo } from "@design-studio/contracts/element-variants";
import type { ComponentUsage } from "@design-studio/contracts/usage-scope";
import { Context, Effect, Layer } from "effect";

import type { FoundApps } from "../../shared/found-apps.js";
import type { ProjectSearchResult } from "../../shared/project-search.js";
import type { RepoContextState } from "../../shared/repo-context.js";
import {
  LocalOrgScope,
  isProjectVisible,
  readProjectOrgs,
} from "../store/index.js";
import { readDoctor, toDoctorText } from "./doctor-read.js";
import { readFileList, readFileText } from "./file-read.js";
import type {
  FileList,
  FileReadQuery,
  FileSourceQuery,
  FileText,
} from "./file-read.js";
import { readFoundApps } from "./found-apps-read.js";
import { readFrameHtml } from "./frame-html-read.js";
import { readScreenshot } from "./frame-shot-read.js";
import type {
  FrameHtml,
  FrameHtmlQuery,
  FrameSourceQuery,
  ScreenshotView,
  ShotQuery,
} from "./frame-source.js";
import { attemptMcpRead } from "./mcp-read-core.js";
import type { McpReadError, PortPlanQuery } from "./mcp-read-core.js";
import { readProjectList } from "./project-list-read.js";
import type { ProjectSummary } from "./project-list-read.js";
import { readProjectSearch } from "./project-search-read.js";
import type { ProjectSearchQuery } from "./project-search-read.js";
import { readRouteList } from "./route-read.js";
import type { RouteList, RouteListQuery } from "./route-read.js";
import { readRunContext } from "./run-context-read.js";
import type { RunContextQuery } from "./run-context-read.js";
import { readDesignMd, readTokens } from "./token-read.js";
import type { DesignMd, TokensView } from "./token-read.js";
import { readUsage } from "./usage-read.js";
import type { UsageQuery } from "./usage-read.js";
import { readVariantList } from "./variant-read.js";
import type { VariantListQuery } from "./variant-read.js";
import { readVersionList } from "./version-list-read.js";
import type {
  VersionListEntry,
  VersionListQuery,
} from "./version-list-read.js";

interface McpReadStoreApi {
  readonly designMd: (
    query: FrameSourceQuery
  ) => Effect.Effect<DesignMd, McpReadError>;
  readonly doctor: (
    projectId: string,
    isFresh: boolean
  ) => Effect.Effect<DoctorViewText, McpReadError>;
  readonly fileList: (
    query: FileSourceQuery
  ) => Effect.Effect<FileList, McpReadError>;
  readonly fileText: (
    query: FileReadQuery
  ) => Effect.Effect<FileText, McpReadError>;
  readonly foundApps: (
    isFresh: boolean
  ) => Effect.Effect<FoundApps, McpReadError>;
  readonly frameHtml: (
    query: FrameHtmlQuery
  ) => Effect.Effect<FrameHtml, McpReadError>;
  readonly portPlan: (
    query: PortPlanQuery
  ) => Effect.Effect<PortPlanView, McpReadError>;
  readonly projectList: () => Effect.Effect<
    readonly ProjectSummary[],
    McpReadError,
    LocalOrgScope
  >;
  readonly projectSearch: (
    query: ProjectSearchQuery
  ) => Effect.Effect<ProjectSearchResult, McpReadError, LocalOrgScope>;
  readonly routeList: (
    query: RouteListQuery
  ) => Effect.Effect<RouteList, McpReadError>;
  readonly runContext: (
    query: RunContextQuery
  ) => Effect.Effect<RepoContextState, McpReadError>;
  readonly screenshot: (
    query: ShotQuery
  ) => Effect.Effect<ScreenshotView, McpReadError>;
  readonly tokens: (
    query: FrameSourceQuery
  ) => Effect.Effect<TokensView, McpReadError>;
  readonly usage: (
    query: UsageQuery
  ) => Effect.Effect<ComponentUsage, McpReadError>;
  readonly variantList: (
    query: VariantListQuery
  ) => Effect.Effect<readonly ElementVariantInfo[], McpReadError>;
  readonly versionList: (
    query: VersionListQuery
  ) => Effect.Effect<readonly VersionListEntry[], McpReadError>;
}

const toVisibility = Effect.fn("McpReadStore.toVisibility")(function* run() {
  const scope = yield* LocalOrgScope;
  const orgs = yield* readProjectOrgs();

  return (projectId: string): boolean =>
    isProjectVisible(scope, orgs, projectId);
});

class McpReadStore extends Context.Service<McpReadStore, McpReadStoreApi>()(
  "design-studio/preview/McpReadStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    McpReadStore,
    McpReadStore.of({
      designMd: Effect.fn("McpReadStore.designMd")(function* run(
        query: FrameSourceQuery
      ) {
        return yield* attemptMcpRead((runtime) => readDesignMd(runtime, query));
      }),
      doctor: Effect.fn("McpReadStore.doctor")(function* run(
        projectId: string,
        isFresh: boolean
      ) {
        const view = yield* attemptMcpRead((runtime) =>
          readDoctor(runtime.projects, runtime.preview, projectId, isFresh)
        );

        return toDoctorText(view);
      }),
      fileList: Effect.fn("McpReadStore.fileList")(function* run(
        query: FileSourceQuery
      ) {
        return yield* attemptMcpRead((runtime) =>
          readFileList(
            runtime.projects,
            runtime.versions,
            runtime.preview,
            query
          )
        );
      }),
      fileText: Effect.fn("McpReadStore.fileText")(function* run(
        query: FileReadQuery
      ) {
        return yield* attemptMcpRead((runtime) =>
          readFileText(
            runtime.projects,
            runtime.versions,
            runtime.preview,
            query
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
      frameHtml: Effect.fn("McpReadStore.frameHtml")(function* run(
        query: FrameHtmlQuery
      ) {
        return yield* attemptMcpRead((runtime) =>
          readFrameHtml(runtime, query)
        );
      }),
      portPlan: Effect.fn("McpReadStore.portPlan")(function* run(
        query: PortPlanQuery
      ) {
        return yield* attemptMcpRead((runtime) => runtime.planPort(query));
      }),
      projectList: Effect.fn("McpReadStore.projectList")(function* run() {
        const isVisible = yield* toVisibility();

        return yield* attemptMcpRead((runtime) =>
          readProjectList(runtime.projects, isVisible)
        );
      }),
      projectSearch: Effect.fn("McpReadStore.projectSearch")(function* run(
        query: ProjectSearchQuery
      ) {
        const isVisible = yield* toVisibility();

        return yield* attemptMcpRead((runtime) =>
          readProjectSearch(
            runtime.projects,
            runtime.preview,
            runtime.runsDir,
            {
              ...query,
              isVisible,
            }
          )
        );
      }),
      routeList: Effect.fn("McpReadStore.routeList")(function* run(
        query: RouteListQuery
      ) {
        return yield* attemptMcpRead((runtime) =>
          readRouteList(runtime.projects, query)
        );
      }),
      runContext: Effect.fn("McpReadStore.runContext")(function* run(
        query: RunContextQuery
      ) {
        return yield* attemptMcpRead((runtime) =>
          readRunContext(runtime.projects, query)
        );
      }),
      screenshot: Effect.fn("McpReadStore.screenshot")(function* run(
        query: ShotQuery
      ) {
        return yield* attemptMcpRead((runtime) =>
          readScreenshot(runtime, query)
        );
      }),
      tokens: Effect.fn("McpReadStore.tokens")(function* run(
        query: FrameSourceQuery
      ) {
        return yield* attemptMcpRead((runtime) => readTokens(runtime, query));
      }),
      usage: Effect.fn("McpReadStore.usage")(function* run(query: UsageQuery) {
        return yield* attemptMcpRead((runtime) =>
          readUsage(runtime.projects, runtime.preview, query)
        );
      }),
      variantList: Effect.fn("McpReadStore.variantList")(function* run(
        query: VariantListQuery
      ) {
        return yield* attemptMcpRead((runtime) =>
          readVariantList(runtime.projects, runtime.runner, query)
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
